import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Single, shared entry point for turning a PENDING DepositRequest into an
 * APPROVED one and crediting the user's wallet. Every deposit-verification
 * path (Sunpays IPN, NOWPayments IPN, the payment-status poll, and manual
 * admin approval) must go through this function so that:
 *  - the deposit status flip, wallet balance increment, and ledger entries
 *    always happen atomically (all-or-nothing) in one DB transaction, and
 *  - the same deposit can never be credited twice, even if two callers
 *    (e.g. a retried webhook and a concurrent admin click) race each other.
 */

const LOG_PREFIX = "[deposit-credit]";

export type DepositCreditSource =
  | "sunpays_ipn"
  | "nowpayments_ipn"
  | "payment_status_poll"
  | "admin_manual";

export interface DepositCreditParams {
  depositId: string;
  /** Bonus amount to add on top of the deposit amount (0 if none). Computed by the caller so business rules stay where they were. */
  bonusAmount: number;
  bonusPercent?: number;
  source: DepositCreditSource;
  /** Extra fields merged into the ledger entry `meta` for traceability. */
  gatewayMeta?: Record<string, unknown>;
  /** Returns the final `note` JSON to persist, given the existing parsed note. */
  buildNote?: (existingNote: Record<string, unknown>) => Record<string, unknown>;
  reviewedById?: string;
  /** Extra columns to set on the DepositRequest row alongside status/reviewedAt/note (e.g. isMock). */
  isMock?: boolean;
}

export type DepositCreditStatus = "APPROVED" | "REJECTED" | "NOT_FOUND";

export interface DepositCreditResult {
  /** true only if THIS call performed the credit (false if another caller already had, or the deposit wasn't found/pending). */
  credited: boolean;
  alreadyProcessed: boolean;
  status: DepositCreditStatus;
  walletBalance?: number;
  depositUserId?: string;
  depositAmount?: number;
}

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;

// Prisma / pg error codes and messages that indicate a transient
// connection/serialization problem rather than a real business-logic error.
// Retrying these is safe because the transaction is idempotent (guarded by
// the row lock + status check below), so a retry can never double-credit.
const TRANSIENT_ERROR_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1008", // Operations timed out
  "P1017", // Server closed the connection
  "P2024", // Timed out fetching a connection from the pool
  "P2028", // Transaction API error
  "40001", // Postgres: serialization_failure
  "40P01", // Postgres: deadlock_detected
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
]);

function isTransientDbError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  if (code && TRANSIENT_ERROR_CODES.has(String(code))) return true;
  const message = String((err as { message?: string } | null)?.message ?? err ?? "");
  return /deadlock detected|could not serialize|connection.*(closed|reset|terminated)|connection pool|timed? ?out/i.test(
    message
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(source: DepositCreditSource, depositId: string, stage: string, extra?: Record<string, unknown>) {
  console.log(`${LOG_PREFIX} [${source}] [${depositId}] ${stage}${extra ? " " + JSON.stringify(extra) : ""}`);
}

function logError(source: DepositCreditSource, depositId: string, stage: string, err: unknown) {
  console.error(`${LOG_PREFIX} [${source}] [${depositId}] ${stage} FAILED:`, err);
}

interface LockedDepositRow {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  userId: string;
  amount: number;
  note: string | null;
}

export async function applyDepositCredit(params: DepositCreditParams): Promise<DepositCreditResult> {
  const { depositId, bonusAmount, source } = params;

  log(source, depositId, "verification:start", { bonusAmount, bonusPercent: params.bonusPercent });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Lock the deposit row for the duration of the transaction so that
        // any other concurrent call (duplicate webhook delivery, a second
        // admin click, the poll route firing at the same moment as the
        // webhook, ...) blocks here until we commit/rollback, then sees the
        // updated status and no-ops instead of crediting a second time.
        const rows = await tx.$queryRaw<LockedDepositRow[]>`
          SELECT "id", "status", "userId", "amount", "note"
          FROM "DepositRequest"
          WHERE "id" = ${depositId}
          FOR UPDATE
        `;
        const current = rows[0];

        if (!current) {
          log(source, depositId, "verification:not_found");
          return { credited: false, alreadyProcessed: false, status: "NOT_FOUND" as const };
        }

        if (current.status !== "PENDING") {
          log(source, depositId, "verification:already_processed", { status: current.status });
          return {
            credited: false,
            alreadyProcessed: true,
            status: current.status as "APPROVED" | "REJECTED",
            depositUserId: current.userId,
            depositAmount: current.amount,
          };
        }

        log(source, depositId, "wallet-credit:start", {
          userId: current.userId,
          amount: current.amount,
          bonusAmount,
        });

        const wallet = await tx.wallet.upsert({
          where: { userId: current.userId },
          update: { balance: { increment: current.amount + bonusAmount } },
          create: { userId: current.userId, balance: current.amount + bonusAmount },
        });

        // Enforce 1x bet requirement for deposits
        await tx.user.update({
          where: { id: current.userId },
          data: { requiredWager: { increment: Math.round(current.amount) } },
        });

        log(source, depositId, "wallet-credit:done", { walletId: wallet.id, newBalance: wallet.balance });

        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            type: "DEPOSIT_APPROVED",
            amount: current.amount,
            balanceAfter: wallet.balance - bonusAmount,
            meta: { depositId, source, ...(params.gatewayMeta || {}) } as Prisma.InputJsonValue,
          },
        });
        log(source, depositId, "ledger:deposit_entry_created");

        if (bonusAmount > 0) {
          await tx.ledgerEntry.create({
            data: {
              walletId: wallet.id,
              type: "DEPOSIT_BONUS",
              amount: bonusAmount,
              balanceAfter: wallet.balance,
              meta: {
                depositId,
                source,
                percent: params.bonusPercent,
                ...(params.gatewayMeta || {}),
              } as Prisma.InputJsonValue,
            },
          });
          log(source, depositId, "ledger:bonus_entry_created", { bonusAmount });
        }

        let existingNote: Record<string, unknown> = {};
        try {
          existingNote = JSON.parse(current.note || "{}");
        } catch {
          existingNote = {};
        }
        const finalNote = params.buildNote ? params.buildNote(existingNote) : existingNote;

        await tx.depositRequest.update({
          where: { id: depositId },
          data: {
            status: "APPROVED",
            reviewedAt: new Date(),
            reviewedById: params.reviewedById,
            isMock: params.isMock,
            note: JSON.stringify(finalNote),
          },
        });
        log(source, depositId, "deposit-status:approved");

        return {
          credited: true,
          alreadyProcessed: false,
          status: "APPROVED" as const,
          walletBalance: wallet.balance,
          depositUserId: current.userId,
          depositAmount: current.amount,
        };
      });

      log(source, depositId, "final-response", { ...result });
      return result;
    } catch (err) {
      if (isTransientDbError(err) && attempt < MAX_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        logError(source, depositId, `transaction attempt ${attempt}/${MAX_ATTEMPTS}`, err);
        log(source, depositId, "retrying", { nextAttempt: attempt + 1, delayMs: delay });
        await sleep(delay);
        continue;
      }
      logError(source, depositId, `transaction attempt ${attempt}/${MAX_ATTEMPTS} (giving up)`, err);
      throw err;
    }
  }

  // Unreachable, but keeps TypeScript happy.
  throw new Error(`applyDepositCredit: exhausted retries for deposit ${depositId}`);
}

/**
 * Marks a still-PENDING deposit as REJECTED. Idempotent: no-ops if the
 * deposit is already in a terminal state.
 */
export async function markDepositRejected(params: {
  depositId: string;
  source: DepositCreditSource;
  reviewedById?: string;
  buildNote?: (existingNote: Record<string, unknown>) => Record<string, unknown>;
}): Promise<{ rejected: boolean; alreadyProcessed: boolean }> {
  const { depositId, source } = params;
  log(source, depositId, "reject:start");

  const deposit = await prisma.depositRequest.findUnique({ where: { id: depositId } });
  if (!deposit) {
    log(source, depositId, "reject:not_found");
    return { rejected: false, alreadyProcessed: false };
  }
  if (deposit.status !== "PENDING") {
    log(source, depositId, "reject:already_processed", { status: deposit.status });
    return { rejected: false, alreadyProcessed: true };
  }

  let existingNote: Record<string, unknown> = {};
  try {
    existingNote = JSON.parse(deposit.note || "{}");
  } catch {
    existingNote = {};
  }
  const finalNote = params.buildNote ? params.buildNote(existingNote) : existingNote;

  await prisma.depositRequest.update({
    where: { id: depositId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: params.reviewedById,
      note: JSON.stringify(finalNote),
    },
  });
  log(source, depositId, "reject:done");

  return { rejected: true, alreadyProcessed: false };
}
