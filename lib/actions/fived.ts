"use server";

import { z } from "zod";
import type { FiveDBetType, FiveDMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/auth";
import { getRoundNumber, getRoundWindow, POSITIONS } from "@/lib/fived/rounds";
import { checkAndAwardReferralReward } from "@/lib/rewards/referral";

const MODE_MAP: Record<string, FiveDMode> = { m1: "M1", m3: "M3", m5: "M5", m10: "M10" };

const BIG_SMALL_SELECTIONS = new Set(["BIG", "SMALL"]);
const ODD_EVEN_SELECTIONS = new Set(["ODD", "EVEN"]);

const placeBetSchema = z.object({
  mode: z.enum(["m1", "m3", "m5", "m10"]),
  betType: z.enum(["POSITION_NUMBER", "SUM_BIG_SMALL", "SUM_ODD_EVEN"]),
  selection: z.string(),
  amount: z.coerce.number().int().min(1).max(100_000),
});

export type PlaceBetResult = { error: string } | { success: true; betId: string };

export async function placeBetAction(input: {
  mode: string;
  betType: FiveDBetType;
  selection: string;
  amount: number;
}): Promise<PlaceBetResult> {
  const user = await requireUser();

  const parsed = placeBetSchema.safeParse({ ...input, mode: input.mode.toLowerCase() });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid bet" };
  }

  const { betType, amount } = parsed.data;
  const selection = parsed.data.selection.toUpperCase();
  const mode = MODE_MAP[parsed.data.mode];

  let validSelection = false;
  if (betType === "POSITION_NUMBER") {
    const [pos, digitStr] = selection.split(":");
    const digit = Number(digitStr);
    validSelection = (POSITIONS as readonly string[]).includes(pos) && Number.isInteger(digit) && digit >= 0 && digit <= 9;
  } else if (betType === "SUM_BIG_SMALL") {
    validSelection = BIG_SMALL_SELECTIONS.has(selection);
  } else if (betType === "SUM_ODD_EVEN") {
    validSelection = ODD_EVEN_SELECTIONS.has(selection);
  }

  if (!validSelection) {
    return { error: "Invalid selection for this bet type" };
  }

  const roundNumber = getRoundNumber(mode);
  const { locksAt, endsAt } = getRoundWindow(mode, roundNumber);
  const now = Date.now();

  if (now >= locksAt || now >= endsAt) {
    return { error: "Betting is locked for this round" };
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet || wallet.balance < amount) {
    return { error: "Insufficient balance" };
  }

  const balanceAfter = wallet.balance - amount;
  const metaJson = JSON.stringify({ mode, roundNumber: roundNumber.toString(), betType, selection, game: "fived" });

  // Execute atomic CTE SQL write to place the bet in a single database round-trip
  const rawResult = await prisma.$queryRaw<any[]>`
    WITH updated_wallet AS (
      UPDATE "Wallet"
      SET balance = balance - ${amount}
      WHERE "userId" = ${user.id} AND balance >= ${amount}
      RETURNING id, balance
    ),
    inserted_ledger AS (
      INSERT INTO "LedgerEntry" (id, "walletId", type, amount, "balanceAfter", meta, "createdAt")
      SELECT gen_random_uuid(), id, 'BET_PLACED'::"LedgerType", ${-amount}, balance, ${metaJson}::jsonb, now()
      FROM updated_wallet
    )
    INSERT INTO "FiveDBet" (id, "userId", mode, "roundNumber", "betType", selection, amount, status, payout, "createdAt")
    SELECT gen_random_uuid(), ${user.id}, ${mode}::"FiveDMode", ${roundNumber}::bigint, ${betType}::"FiveDBetType", ${selection}, ${amount}, 'PENDING'::"FiveDBetStatus", 0, now()
    FROM updated_wallet
    RETURNING id, amount;
  `;

  if (!rawResult || rawResult.length === 0) {
    return { error: "Insufficient balance" };
  }

  const bet = rawResult[0];

  // Decrement required wager if set
  if (user.requiredWager > 0) {
    const nextWager = Math.max(0, user.requiredWager - amount);
    await prisma.user.update({
      where: { id: user.id },
      data: { requiredWager: nextWager }
    });
  }

  checkAndAwardReferralReward(user.id).catch((err) => {
    console.error("5D bet placement referral reward check failed:", err);
  });

  return { success: true, betId: bet.id };
}
