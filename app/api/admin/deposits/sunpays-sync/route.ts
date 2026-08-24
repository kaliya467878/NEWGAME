import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getBonusSettings, getFirstDepositBonus } from "@/lib/settings/bonuses";
import { sendTelegramNotification } from "@/lib/telegram";
import { checkAndAwardReferralReward } from "@/lib/rewards/referral";
import { applyDepositCredit } from "@/lib/wallet/creditDeposit";

/**
 * POST /api/admin/deposits/sunpays-sync
 *
 * Bulk-approve PENDING Sunpays deposits that were successful on the gateway
 * but never got their IPN callback.
 *
 * Safety: Before crediting, checks if a DEPOSIT_APPROVED ledger entry already
 * exists for the deposit. If it does, the deposit is marked APPROVED in the DB
 * without re-crediting (fixing stuck status without double-paying).
 *
 * Modes:
 * - body.ids (string[])  → process specific deposit IDs
 * - body.all = true      → process ALL pending sunpays deposits
 * - body.dryRun = true   → preview only, no changes made
 *
 * Only accessible by STAFF or SUPER_ADMIN roles.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "STAFF" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ids?: string[]; all?: boolean; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch {}

  const dryRun = body.dryRun === true;

  // Fetch pending Sunpays deposits
  const whereClause: any = {
    status: "PENDING",
    note: { contains: '"gateway":"sunpays"' },
  };

  if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
    whereClause.id = { in: body.ids };
  }

  const pendingDeposits = await prisma.depositRequest.findMany({
    where: whereClause,
    include: {
      user: {
        select: { uid: true, phone: true, displayName: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  if (pendingDeposits.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No pending Sunpays deposits found.",
      approved: 0,
      dryRun,
    });
  }

  // 1. Fetch user wallets to check existing ledger entries safely in memory
  const userIds = pendingDeposits.map((d) => d.userId);
  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const walletIds = wallets.map((w) => w.id);

  const existingLedgers = await prisma.ledgerEntry.findMany({
    where: {
      walletId: { in: walletIds },
      type: "DEPOSIT_APPROVED",
    },
    select: { meta: true },
  });

  // Build a set of deposit IDs that were already credited
  const alreadyCreditedIds = new Set<string>();
  for (const entry of existingLedgers) {
    try {
      const meta = entry.meta as any;
      if (meta && meta.depositId) {
        alreadyCreditedIds.add(meta.depositId);
      }
    } catch {}
  }

  const safeToApprove = pendingDeposits.filter((d) => !alreadyCreditedIds.has(d.id));
  const alreadyCredited = pendingDeposits.filter((d) => alreadyCreditedIds.has(d.id));

  if (dryRun) {
    return NextResponse.json({
      success: true,
      message: `Found ${pendingDeposits.length} pending Sunpays deposits: ${safeToApprove.length} need crediting, ${alreadyCredited.length} already credited (will just fix DB status).`,
      safeToApprove: safeToApprove.map((d) => ({
        id: d.id,
        userId: d.userId,
        uid: d.user.uid,
        phone: d.user.phone,
        displayName: d.user.displayName,
        amount: d.amount,
        createdAt: d.createdAt,
        alreadyCredited: false,
      })),
      alreadyCredited: alreadyCredited.map((d) => ({
        id: d.id,
        userId: d.userId,
        uid: d.user.uid,
        phone: d.user.phone,
        displayName: d.user.displayName,
        amount: d.amount,
        createdAt: d.createdAt,
        alreadyCredited: true,
      })),
      dryRun: true,
    });
  }

  const now = new Date();
  const { depositBonusPercent } = await getBonusSettings();

  let approved = 0;
  let fixedStatus = 0;  // Already credited but DB status fixed
  let skipped = 0;
  const errors: string[] = [];
  const approvedIds: string[] = [];
  const fixedIds: string[] = [];

  // 1. Fix DB status for already-credited deposits (no re-crediting)
  for (const deposit of alreadyCredited) {
    try {
      await prisma.depositRequest.update({
        where: { id: deposit.id },
        data: {
          status: "APPROVED",
          reviewedAt: now,
          reviewedById: user.id,
          note: (() => {
            let noteDetails: any = {};
            try { noteDetails = JSON.parse((deposit as any).note || "{}"); } catch {}
            return JSON.stringify({
              ...noteDetails,
              gatewayStatus: "success",
              statusFixedAt: now.toISOString(),
              statusFixedBy: user.id,
              note: "Status fixed - deposit was already credited via ledger entry",
            });
          })(),
        },
      });
      fixedStatus++;
      fixedIds.push(deposit.id);
    } catch (err) {
      errors.push(`Status fix error for ${deposit.id}: ${err}`);
    }
  }

  // 2. Properly approve (credit + ledger) the ones not yet credited using central helper
  for (const deposit of safeToApprove) {
    try {
      let noteDetails: any = {};
      try {
        noteDetails = JSON.parse((deposit as any).note || "{}");
      } catch {}

      const previousApprovedCount = await prisma.depositRequest.count({
        where: {
          userId: deposit.userId,
          status: "APPROVED",
          id: { not: deposit.id },
        },
      });
      const isFirstDeposit = previousApprovedCount === 0;

      let bonusAmount = 0;
      if (isFirstDeposit) {
        bonusAmount = getFirstDepositBonus(deposit.amount, (deposit as any).note);
      } else {
        bonusAmount = Math.floor((deposit.amount * depositBonusPercent) / 100);
      }

      // Check one more time before calling applyDepositCredit
      const userWallet = await prisma.wallet.findUnique({
        where: { userId: deposit.userId },
        select: { id: true },
      });
      if (userWallet) {
        const doubleCheckLedger = await prisma.ledgerEntry.findMany({
          where: {
            walletId: userWallet.id,
            type: "DEPOSIT_APPROVED",
          },
          select: { meta: true },
        });
        const isDoublePaid = doubleCheckLedger.some((entry) => {
          try {
            const meta = entry.meta as any;
            return meta && meta.depositId === deposit.id;
          } catch {
            return false;
          }
        });

        if (isDoublePaid) {
          // Already credited in a concurrent task — just fix status
          await prisma.depositRequest.update({
            where: { id: deposit.id },
            data: {
              status: "APPROVED",
              reviewedAt: now,
              reviewedById: user.id,
            },
          });
          skipped++;
          continue;
        }
      }

      const creditRes = await applyDepositCredit({
        depositId: deposit.id,
        bonusAmount,
        bonusPercent: depositBonusPercent,
        source: "admin_manual",
        gatewayMeta: { gateway: "sunpays", adminBulkSync: true, approvedBy: user.id },
        buildNote: (existing) => ({
          ...existing,
          gatewayStatus: "success",
          adminBulkSync: true,
          syncedAt: now.toISOString(),
          syncedBy: user.id,
        }),
        reviewedById: user.id,
      });

      if (creditRes.credited) {
        approved++;
        approvedIds.push(deposit.id);

        try {
          await sendTelegramNotification(
            deposit.user.uid,
            deposit.amount,
            "Sunpays Payin (Admin Sync)",
            deposit.id,
            "success",
            (deposit as any).createdAt,
            "N/A",
            noteDetails.telegramMessageId
          );
        } catch {}

        try {
          await checkAndAwardReferralReward(deposit.userId, deposit.amount, deposit.id);
        } catch {}
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push(`Error processing deposit ${deposit.id}: ${err}`);
    }
  }

  console.log(
    `[admin/sunpays-sync] Approved: ${approved}, StatusFixed: ${fixedStatus}, Skipped: ${skipped}, Errors: ${errors.length} — by ${user.id}`
  );

  return NextResponse.json({
    success: true,
    message: `Done! Credited ${approved} new deposit(s). Fixed DB status for ${fixedStatus} already-credited deposit(s).`,
    approved,
    fixedStatus,
    skipped,
    approvedIds,
    fixedIds,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * GET /api/admin/deposits/sunpays-sync
 * Returns all pending Sunpays deposits with already-credited flag.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "STAFF" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deposits = await prisma.depositRequest.findMany({
    where: {
      status: "PENDING",
      note: { contains: '"gateway":"sunpays"' },
    },
    include: {
      user: {
        select: { uid: true, phone: true, displayName: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  const userIds = deposits.map((d) => d.userId);
  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const walletIds = wallets.map((w) => w.id);

  const existingLedgers = await prisma.ledgerEntry.findMany({
    where: {
      walletId: { in: walletIds },
      type: "DEPOSIT_APPROVED",
    },
    select: { meta: true },
  });

  const alreadyCreditedIds = new Set<string>();
  for (const entry of existingLedgers) {
    try {
      const meta = entry.meta as any;
      if (meta && meta.depositId) alreadyCreditedIds.add(meta.depositId);
    } catch {}
  }

  return NextResponse.json({
    success: true,
    count: deposits.length,
    deposits: deposits.map((d) => {
      let note: any = {};
      try { note = JSON.parse((d as any).note || "{}"); } catch {}
      return {
        id: d.id,
        userId: d.userId,
        uid: d.user.uid,
        phone: d.user.phone,
        displayName: d.user.displayName,
        amount: d.amount,
        createdAt: (d as any).createdAt,
        checkoutUrl: note.checkoutUrl,
        providerId: d.providerId,
        alreadyCredited: alreadyCreditedIds.has(d.id),
      };
    }),
  });
}
