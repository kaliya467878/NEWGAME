import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { sendTelegramNotification } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { amount, method, reference, proofUrl, depositId } = await req.json();

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ message: "Amount is required and must be positive" }, { status: 400 });
    }

    const numericAmount = Number(amount);
    const trimmedReference = String(reference || "").trim();

    if (!trimmedReference) {
      return NextResponse.json({ message: "Reference/TxID is required" }, { status: 400 });
    }

    let deposit;
    
    if (depositId) {
      deposit = await prisma.depositRequest.findUnique({
        where: { id: depositId, userId: user.id }
      });
    }

    if (!deposit) {
      deposit = await prisma.depositRequest.findFirst({
        where: {
          userId: user.id,
          amount: numericAmount,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    let isNew = false;
    let existingNote: any = {};

    if (!deposit) {
      // Fallback: If no pending request was created beforehand, create a new one
      deposit = await prisma.depositRequest.create({
        data: {
          userId: user.id,
          amount: numericAmount,
          status: "PENDING",
        },
      });
      isNew = true;
    } else {
      try {
        existingNote = JSON.parse(deposit.note || "{}");
      } catch {}
    }

    // Determine deposit mode label from method (e.g. upi, bank)
    const methodLower = String(method || "").toLowerCase();
    const modeLabel = methodLower.includes("usdt")
      ? "Usdt(deposit channel)"
      : methodLower.includes("bank")
      ? "Bank(deposit channel)"
      : "Upi(deposit channel)";

    // Send/Update Telegram notification to "created" state but with the TxID populated
    let telegramMessageId: number | null = existingNote.telegramMessageId || null;
    try {
      const msgId = await sendTelegramNotification(
        user.uid,
        numericAmount,
        modeLabel,
        deposit.id,
        "created",
        deposit.createdAt,
        trimmedReference,
        telegramMessageId || undefined
      );
      if (msgId) {
        telegramMessageId = msgId;
      }
    } catch (err) {
      console.error("Failed to send/edit Telegram notification:", err);
    }

    // Update note with payment info
    const updatedNote = JSON.stringify({
      ...existingNote,
      txid: trimmedReference,
      screenshotUrl: proofUrl || existingNote.screenshotUrl,
      submittedAt: new Date().toISOString(),
      telegramMessageId: telegramMessageId || undefined,
    });

    const updatedDeposit = await prisma.depositRequest.update({
      where: { id: deposit.id },
      data: {
        note: updatedNote,
        txid: trimmedReference,
        screenshot: proofUrl || deposit.screenshot,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        depositId: updatedDeposit.id,
        amount: updatedDeposit.amount,
        isNew,
      },
    });
  } catch (error: any) {
    console.error("POST wallet/deposit/request API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
