import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNowPaymentsPaymentStatus } from "@/lib/nowpayments";
import { getBonusSettings, getFirstDepositBonus } from "@/lib/settings/bonuses";
import { sendTelegramNotification } from "@/lib/telegram";
import { checkAndAwardReferralReward } from "@/lib/rewards/referral";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("NOWPayments Webhook IPN triggered:", JSON.stringify(body));

    const { payment_id, order_id } = body;

    if (!payment_id || !order_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the payment status securely by calling the NOWPayments API directly
    const npStatus = await getNowPaymentsPaymentStatus(String(payment_id));
    const paymentStatus = npStatus.payment_status?.toLowerCase();
    console.log("NOWPayments verified payment status response:", JSON.stringify(npStatus));

    if (String(npStatus.order_id) !== String(order_id)) {
      console.warn(`NOWPayments IPN order_id mismatch. Webhook: ${order_id}, API: ${npStatus.order_id}`);
      return NextResponse.json({ error: "Order ID mismatch" }, { status: 400 });
    }

    // Fetch the deposit request
    const deposit = await prisma.depositRequest.findUnique({
      where: { id: order_id },
      include: { user: true },
    });

    if (!deposit) {
      console.warn(`Deposit request not found for webhook order ID: ${order_id}`);
      return NextResponse.json({ error: "Deposit request not found" }, { status: 404 });
    }

    // If it is already processed, return 200 OK immediately
    if (deposit.status !== "PENDING") {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    let noteDetails: any = {};
    try {
      noteDetails = JSON.parse(deposit.note || "{}");
    } catch {}

    const isSuccess = paymentStatus === "finished" || paymentStatus === "confirmed" || paymentStatus === "sending" || paymentStatus === "partially_paid";
    if (isSuccess) {
      // Auto-approve the payment
      const { depositBonusPercent } = await getBonusSettings();

      const usdtRate = 102;
      const actualUsdt = npStatus.actually_paid || npStatus.pay_amount || (deposit.amount / usdtRate);
      const actualInr = Math.round(actualUsdt * usdtRate);
      const creditAmount = actualInr > 0 ? actualInr : deposit.amount;

      // Check if this is the user's first approved deposit
      const previousApprovedCount = await prisma.depositRequest.count({
        where: {
          userId: deposit.userId,
          status: "APPROVED",
          id: { not: order_id }
        }
      });
      const isFirstDeposit = previousApprovedCount === 0;

      let bonusAmount = 0;
      if (isFirstDeposit) {
        bonusAmount = getFirstDepositBonus(creditAmount, deposit.note);
      } else {
        bonusAmount = Math.floor((creditAmount * depositBonusPercent) / 100);
      }

      await prisma.$transaction(async (tx) => {
        const currentDep = await tx.depositRequest.findUnique({ where: { id: order_id } });
        if (!currentDep || currentDep.status !== "PENDING") return;

        const wallet = await tx.wallet.update({
          where: { userId: deposit.userId },
          data: { balance: { increment: creditAmount + bonusAmount } },
        });

        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            type: "DEPOSIT_APPROVED",
            amount: creditAmount,
            balanceAfter: wallet.balance - bonusAmount,
            meta: { depositId: order_id, ipnAutoApproved: true, actuallyPaidUsdt: actualUsdt },
          },
        });

        if (bonusAmount > 0) {
          await tx.ledgerEntry.create({
            data: {
              walletId: wallet.id,
              type: "DEPOSIT_BONUS",
              amount: bonusAmount,
              balanceAfter: wallet.balance,
              meta: { depositId: order_id, percent: depositBonusPercent, ipnAutoApproved: true },
            },
          });
        }

        await tx.depositRequest.update({
          where: { id: order_id },
          data: {
            status: "APPROVED",
            isMock: false,
            reviewedAt: new Date(),
            note: JSON.stringify({
              ...noteDetails,
              gatewayStatus: paymentStatus,
              ipnVerified: true,
              actuallyPaidUsdt: actualUsdt,
            }),
          },
        });
      });

      // Trigger Telegram success update
      await sendTelegramNotification(
        deposit.user.uid,
        creditAmount,
        "Usdt(deposit channel)",
        deposit.id,
        "success",
        new Date(),
        noteDetails.txid || "N/A",
        noteDetails.telegramMessageId,
        deposit.isMock,
        "Automatic"
      );
      await checkAndAwardReferralReward(deposit.userId, deposit.amount, deposit.id);
      console.log(`Auto-approved deposit ${order_id} via IPN webhook.`);
    } else if (paymentStatus === "failed" || paymentStatus === "expired") {
      // Auto-reject the payment
      await prisma.depositRequest.update({
        where: { id: order_id },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          note: JSON.stringify({
            ...noteDetails,
            gatewayStatus: paymentStatus,
            ipnVerified: true,
          }),
        },
      });

      // Trigger Telegram failed update
      await sendTelegramNotification(
        deposit.user.uid,
        deposit.amount,
        "Usdt(deposit channel)",
        deposit.id,
        "failed",
        new Date(),
        noteDetails.txid || "N/A",
        noteDetails.telegramMessageId,
        deposit.isMock,
        "Automatic"
      );
      console.log(`Auto-rejected deposit ${order_id} via IPN webhook.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("IPN Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
