import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBonusSettings, getFirstDepositBonus } from "@/lib/settings/bonuses";
import { sendTelegramNotification } from "@/lib/telegram";
import { checkAndAwardReferralReward } from "@/lib/rewards/referral";
import { applyDepositCredit, markDepositRejected } from "@/lib/wallet/creditDeposit";

/**
 * Cron job: Poll all PENDING Sunpays deposits and attempt to credit them.
 *
 * Since the Sunpays REST API for querying payin status is not accessible,
 * this route handles OLD pending deposits that may have been missed by the
 * webhook (IPN). It uses the Sunpays cashier page to detect payment success.
 *
 * Schedule: every 1 minute via vercel.json cron
 *
 * Strategy:
 *   1. Find all PENDING DepositRequests with gateway=sunpays older than 5 minutes
 *   2. For each, try to fetch the Sunpays cashier page using the stored checkoutUrl
 *   3. Parse the page to detect if the payment succeeded (look for success indicators)
 *   4. If success detected, auto-approve the deposit using centralized applyDepositCredit
 *   5. Deposits older than 2 hours that are still pending get auto-rejected (expired)
 */
export async function GET(req: NextRequest) {
  // Validate cron secret if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  // Only process deposits older than 3 minutes (give IPN a chance to fire first)
  const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
  // Expire deposits older than 2 hours
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  try {
    // Find pending Sunpays deposits
    const pendingDeposits = await prisma.depositRequest.findMany({
      where: {
        status: "PENDING",
        createdAt: { lte: threeMinutesAgo },
        note: { contains: "\"gateway\":\"sunpays\"" },
      },
      include: { user: true },
      orderBy: { createdAt: "asc" },
      take: 20, // Process max 20 per run to stay within timeout limits
    });

    let processed = 0;
    let approved = 0;
    let expired = 0;
    const errors: string[] = [];

    for (const deposit of pendingDeposits) {
      try {
        let noteDetails: any = {};
        try {
          noteDetails = JSON.parse(deposit.note || "{}");
        } catch {}

        const checkoutUrl: string | undefined = noteDetails.checkoutUrl;

        // Auto-expire deposits older than 2 hours
        if (deposit.createdAt < twoHoursAgo) {
          const rejectRes = await markDepositRejected({
            depositId: deposit.id,
            source: "payment_status_poll",
            buildNote: (existing) => ({
              ...existing,
              gatewayStatus: "expired",
              autoExpired: true,
              expiredAt: now.toISOString(),
            }),
          });
          if (rejectRes.rejected) {
            expired++;
          }
          processed++;
          continue;
        }

        if (!checkoutUrl) {
          // No checkout URL means we can't check status - skip
          continue;
        }

        // Try to fetch the cashier page to check payment status
        let pageHtml = "";
        try {
          const pageRes = await fetch(checkoutUrl, {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; StatusChecker/1.0)",
              Accept: "text/html,application/xhtml+xml",
            },
            signal: AbortSignal.timeout(8000),
          });
          pageHtml = await pageRes.text();
        } catch (fetchErr) {
          errors.push(`Fetch error for ${deposit.id}: ${fetchErr}`);
          continue;
        }

        // Detect success indicators on the Sunpays cashier page
        const lowerHtml = pageHtml.toLowerCase();
        const isSuccess =
          lowerHtml.includes("payment successful") ||
          lowerHtml.includes("payment complete") ||
          lowerHtml.includes("transaction successful") ||
          lowerHtml.includes("paid successfully") ||
          lowerHtml.includes("success") && lowerHtml.includes("amount") && lowerHtml.includes("rupee") ||
          lowerHtml.includes('"status":"success"') ||
          lowerHtml.includes('"status":"paid"') ||
          lowerHtml.includes('"status":"completed"') ||
          lowerHtml.includes("status:success") ||
          lowerHtml.includes("payment_status\":\"success") ||
          lowerHtml.includes("txn_status\":\"success");

        const isFailed =
          lowerHtml.includes("payment failed") ||
          lowerHtml.includes("transaction failed") ||
          lowerHtml.includes("payment expired") ||
          lowerHtml.includes('"status":"failed"') ||
          lowerHtml.includes('"status":"expired"');

        if (isSuccess) {
          // Auto-approve the deposit
          const { depositBonusPercent } = await getBonusSettings();

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
            bonusAmount = getFirstDepositBonus(deposit.amount, deposit.note);
          } else {
            bonusAmount = Math.floor((deposit.amount * depositBonusPercent) / 100);
          }

          const creditRes = await applyDepositCredit({
            depositId: deposit.id,
            bonusAmount,
            bonusPercent: depositBonusPercent,
            source: "payment_status_poll",
            gatewayMeta: { gateway: "sunpays", autoPolled: true },
            buildNote: (existing) => ({
              ...existing,
              gatewayStatus: "success",
              autoPolled: true,
              polledAt: now.toISOString(),
            }),
          });

          if (creditRes.credited) {
            // Send Telegram notification
            try {
              await sendTelegramNotification(
                deposit.user.uid,
                deposit.amount,
                "Sunpays Payin (Auto-Poll)",
                deposit.id,
                "success",
                deposit.createdAt,
                "N/A",
                noteDetails.telegramMessageId
              );
            } catch {}

            await checkAndAwardReferralReward(deposit.userId, deposit.amount, deposit.id);
            approved++;
          }
        } else if (isFailed) {
          const rejectRes = await markDepositRejected({
            depositId: deposit.id,
            source: "payment_status_poll",
            buildNote: (existing) => ({
              ...existing,
              gatewayStatus: "failed",
              autoPolled: true,
              polledAt: now.toISOString(),
            }),
          });

          if (rejectRes.rejected) {
            try {
              await sendTelegramNotification(
                deposit.user.uid,
                deposit.amount,
                "Sunpays Payin (Auto-Poll)",
                deposit.id,
                "failed",
                deposit.createdAt,
                "N/A",
                noteDetails.telegramMessageId
              );
            } catch {}
            expired++;
          }
        }

        processed++;
      } catch (err) {
        errors.push(`Error processing deposit ${deposit.id}: ${err}`);
      }
    }

    console.log(`[sunpays-poll] Processed: ${processed}, Approved: ${approved}, Expired: ${expired}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      processed,
      approved,
      expired,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[sunpays-poll] Fatal error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
