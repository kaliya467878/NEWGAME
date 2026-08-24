import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySignature, generateSignature } from "@/lib/sunpays";
import { sendTelegramNotification } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get("x-signature") ||
      req.headers.get("signature") ||
      req.headers.get("X-Signature") ||
      req.headers.get("x-sign") ||
      "";

    let bodyObj: any;
    try {
      bodyObj = JSON.parse(rawBody);
    } catch (e) {
      try {
        const params = new URLSearchParams(rawBody);
        bodyObj = {};
        for (const [key, value] of params.entries()) {
          bodyObj[key] = value;
        }
      } catch (err) {
        return new NextResponse("Invalid request body format", { status: 400 });
      }
    }

    const payoutSecret = process.env.SUNPAYS_WEBHOOK_SECRET || "b14ed658d0fbda54d296a336c28f3e59a333b29ef5ee8fb62a5e67900010c5fd";

    const incomingSignature = signatureHeader || bodyObj.signature || "";
    if (!incomingSignature) {
      return new NextResponse("Missing signature", { status: 401 });
    }

    // Verify signature
    let isValid = false;
    let calculated = "";
    if (signatureHeader) {
      isValid = verifySignature(rawBody, signatureHeader, payoutSecret);
      calculated = generateSignature(rawBody, payoutSecret);
    } else if (bodyObj.signature) {
      const { signature, ...rest } = bodyObj;
      const canonicalBody = JSON.stringify(rest);
      isValid = verifySignature(canonicalBody, signature, payoutSecret);
      calculated = generateSignature(canonicalBody, payoutSecret);
    }

    if (!isValid) {
      console.warn("Sunpays payout signature mismatch. Header:", signatureHeader, "BodySig:", bodyObj?.signature, "Calculated:", calculated, "Body:", rawBody);
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const { event, payout_id, transaction_id, status, failure_reason } = bodyObj;

    if (!payout_id || !status) {
      return new NextResponse("Missing required payload fields", { status: 400 });
    }

    // Fetch the withdraw request
    const withdraw = await prisma.withdrawRequest.findUnique({
      where: { id: payout_id },
      include: { user: true },
    });

    if (!withdraw) {
      console.warn(`Sunpays Payout Withdraw request not found for ID: ${payout_id}`);
      return new NextResponse("Withdraw request not found", { status: 404 });
    }

    let noteDetails: any = {};
    try {
      noteDetails = JSON.parse(withdraw.note || "{}");
    } catch {}

    // If it's already rejected or already completed, return 200 OK immediately
    if (withdraw.status === "REJECTED" || noteDetails.gatewayStatus === "success") {
      return new NextResponse("ok", { status: 200 });
    }

    const statusLower = String(status || "").toLowerCase();
    const eventLower = String(event || "").toLowerCase();
    const isSuccess = statusLower === "success" || eventLower === "payout.success" || statusLower === "paid" || statusLower === "completed";
    const isFailed = statusLower === "failed" || eventLower === "payout.failed" || statusLower === "expired";

    if (isSuccess) {
      // Payout completed successfully
      await prisma.withdrawRequest.update({
        where: { id: payout_id },
        data: {
          note: JSON.stringify({
            ...noteDetails,
            gateway: "sunpays",
            gatewayStatus: "success",
            transactionId: transaction_id,
            processedAt: new Date().toISOString(),
          }),
        },
      });
      console.log(`Sunpays payout ${payout_id} marked as success.`);

      // Send Telegram notification (4th notification - Success)
      try {
        await sendTelegramNotification(
          withdraw.user.uid,
          withdraw.amount,
          "Withdrawal",
          withdraw.id,
          "success",
          new Date(),
          transaction_id || "N/A",
          noteDetails.telegramMessageId,
          withdraw.isMock,
          "Automatic"
        );
      } catch (err) {
        console.error("Failed to send Sunpays payout IPN success Telegram notification:", err);
      }
    } else if (isFailed) {
      // Payout failed. Perform refund transaction!
      await prisma.$transaction(async (tx) => {
        // Re-read inside transaction to avoid race conditions
        const currentReq = await tx.withdrawRequest.findUnique({ where: { id: payout_id } });
        if (!currentReq || currentReq.status === "REJECTED") return;

        // Refund user wallet balance (increment)
        const wallet = await tx.wallet.update({
          where: { userId: withdraw.userId },
          data: { balance: { increment: withdraw.amount } },
        });

        // Log refund ledger entry
        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            type: "WITHDRAW_REJECTED_REFUND",
            amount: withdraw.amount,
            balanceAfter: wallet.balance,
            meta: { withdrawId: payout_id, gateway: "sunpays", transactionId: transaction_id, reason: failure_reason || "Gateway Payout Failed" },
          },
        });

        // Set status to REJECTED (refunded)
        await tx.withdrawRequest.update({
          where: { id: payout_id },
          data: {
            status: "REJECTED",
            note: JSON.stringify({
              ...noteDetails,
              gateway: "sunpays",
              gatewayStatus: "failed",
              transactionId: transaction_id,
              failureReason: failure_reason || "Gateway Payout Failed",
              refunded: true,
              refundedAt: new Date().toISOString(),
            }),
          },
        });
      });

      console.log(`Sunpays payout ${payout_id} failed. User balance refunded.`);

      // Send Telegram notification (4th notification - Failed)
      try {
        await sendTelegramNotification(
          withdraw.user.uid,
          withdraw.amount,
          "Withdrawal",
          withdraw.id,
          "failed",
          new Date(),
          transaction_id || "N/A",
          noteDetails.telegramMessageId,
          withdraw.isMock,
          "Automatic"
        );
      } catch (err) {
        console.error("Failed to send Sunpays payout IPN failed Telegram notification:", err);
      }
    }

    return new NextResponse("ok", { status: 200 });
  } catch (error: any) {
    console.error("Sunpays payout IPN webhook error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
