import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNowPaymentsPaymentStatus } from "@/lib/nowpayments";
import { getBonusSettings, getFirstDepositBonus } from "@/lib/settings/bonuses";
import { sendTelegramNotification } from "@/lib/telegram";
import { checkAndAwardReferralReward } from "@/lib/rewards/referral";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing deposit ID" }, { status: 400 });
  }

  try {
    const deposit = await prisma.depositRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!deposit) {
      return NextResponse.json({ error: "Deposit request not found" }, { status: 404 });
    }

    // If already verified, return status immediately
    if (deposit.status !== "PENDING") {
      return NextResponse.json({ status: deposit.status });
    }

    let noteDetails: any = {};
    try {
      noteDetails = JSON.parse(deposit.note || "{}");
    } catch {}

    const { paymentId } = noteDetails;

    // If it's a NOWPayments transaction, poll the gateway API
    if (paymentId) {
      const npStatus = await getNowPaymentsPaymentStatus(String(paymentId));
      const paymentStatus = npStatus.payment_status?.toLowerCase();

      if (paymentStatus === "finished") {
        // Auto-approve the payment
        const { depositBonusPercent } = await getBonusSettings();
        
        const previousApprovedCount = await prisma.depositRequest.count({
          where: {
            userId: deposit.userId,
            status: "APPROVED",
            id: { not: id }
          }
        });
        const isFirstDeposit = previousApprovedCount === 0;

        let bonusAmount = 0;
        if (isFirstDeposit) {
          bonusAmount = getFirstDepositBonus(deposit.amount, deposit.note);
        } else {
          bonusAmount = Math.floor((deposit.amount * depositBonusPercent) / 100);
        }

        await prisma.$transaction(async (tx) => {
          // Double check request status inside transaction to avoid race conditions
          const currentDep = await tx.depositRequest.findUnique({ where: { id } });
          if (!currentDep || currentDep.status !== "PENDING") return;

          const wallet = await tx.wallet.update({
            where: { userId: deposit.userId },
            data: { balance: { increment: deposit.amount + bonusAmount } },
          });

          await tx.ledgerEntry.create({
            data: {
              walletId: wallet.id,
              type: "DEPOSIT_APPROVED",
              amount: deposit.amount,
              balanceAfter: wallet.balance - bonusAmount,
              meta: { depositId: id, autoApproved: true },
            },
          });

          if (bonusAmount > 0) {
            await tx.ledgerEntry.create({
              data: {
                walletId: wallet.id,
                type: "DEPOSIT_BONUS",
                amount: bonusAmount,
                balanceAfter: wallet.balance,
                meta: { depositId: id, percent: depositBonusPercent, autoApproved: true },
              },
            });
          }

          await tx.depositRequest.update({
            where: { id },
            data: {
              status: "APPROVED",
              reviewedAt: new Date(),
              note: JSON.stringify({
                ...noteDetails,
                gatewayStatus: paymentStatus,
                autoVerified: true,
              }),
            },
          });
        });

        // Trigger Telegram update (success)
        await sendTelegramNotification(
          deposit.user.uid,
          deposit.amount,
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

        return NextResponse.json({ status: "APPROVED" });
      } else if (paymentStatus === "failed" || paymentStatus === "expired") {
        // Auto-reject the payment
        await prisma.depositRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
            note: JSON.stringify({
              ...noteDetails,
              gatewayStatus: paymentStatus,
              autoVerified: true,
            }),
          },
        });

        // Trigger Telegram update (failed)
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

        return NextResponse.json({ status: "REJECTED" });
      }

      return NextResponse.json({
        status: "PENDING",
        gatewayStatus: paymentStatus,
      });
    }

    // Manual/Static deposit, wait for manual admin review
    return NextResponse.json({ status: "PENDING" });
  } catch (error: any) {
    console.error("Error checking payment status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
