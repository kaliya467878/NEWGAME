import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { amount, method, accountDetails } = await req.json();

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ message: "Amount is required and must be positive" }, { status: 400 });
    }

    // Enforce daily frequency limit:
    const dailyLimit = user.dailyWithdrawLimit ?? 3;
    const midnight = startOfDay(new Date());
    const withdrawalsCountToday = await prisma.withdrawRequest.count({
      where: {
        userId: user.id,
        createdAt: { gte: midnight },
      },
    });

    if (withdrawalsCountToday >= dailyLimit) {
      return NextResponse.json({ message: `You have reached your daily limit of ${dailyLimit} withdrawals today. Please try again tomorrow.` }, { status: 400 });
    }

    const numericAmount = Number(amount);
    const methodLower = String(method || "").toLowerCase();

    if (methodLower === "upi") {
      return NextResponse.json({ message: "UPI withdrawals are temporarily disabled. Please use Bank transfer." }, { status: 400 });
    }

    if (methodLower === "usdt") {
      const approvedDeposits = await prisma.depositRequest.findMany({
        where: { userId: user.id, status: "APPROVED" },
        select: { channelKey: true, note: true },
      });
      const hasUsdtDeposit = approvedDeposits.some((d) => {
        const key = (d.channelKey || "").toLowerCase();
        if (key.includes("usdt") || key.includes("tron") || key.includes("crypto") || key.includes("bep20")) return true;
        try {
          const noteObj = JSON.parse(d.note || "{}");
          const noteCurrency = (noteObj.payCurrency || noteObj.currency || "").toLowerCase();
          if (noteCurrency.includes("usdt") || noteCurrency.includes("trc20") || noteCurrency.includes("bep20")) return true;
          if ((noteObj.gateway || "").toLowerCase() === "nowpayments") return true;
        } catch {}
        return false;
      });
      if (!hasUsdtDeposit) {
        return NextResponse.json({ message: "USDT withdrawals are only available for users who have recharged using USDT/crypto." }, { status: 400 });
      }
    }

    // ENFORCE LIMITS:
    // UPI and Bank: Minimum ₹211
    // USDT: Minimum $10 (10 USDT * 104 = 1040 INR)
    if (methodLower === "usdt") {
      const minUsdt = 10;
      const usdtRate = 104; // withdrawal USDT rate
      const minInr = minUsdt * usdtRate;
      if (numericAmount < minInr) {
        return NextResponse.json({ message: `Minimum withdrawal amount for USDT is 10 USDT (₹${minInr})` }, { status: 400 });
      }
    } else {
      if (numericAmount < 211) {
        return NextResponse.json({ message: "Minimum withdrawal amount is ₹211" }, { status: 400 });
      }
      const maxLimit = user.maxWithdrawLimit ?? 50000;
      if (numericAmount > maxLimit) {
        return NextResponse.json({ message: `Maximum withdrawal amount per request is ₹${maxLimit.toLocaleString("en-IN")}` }, { status: 400 });
      }
    }

    if (!method || !accountDetails) {
      return NextResponse.json({ message: "Withdrawal method and account details are required" }, { status: 400 });
    }

    const approvedDepositCount = await prisma.depositRequest.count({
      where: { userId: user.id, status: "APPROVED" },
    });

    if (approvedDepositCount === 0 && !user.bypassRechargeCheck) {
      return NextResponse.json({
        message: "You must complete at least one recharge (deposit) to be eligible for withdrawals."
      }, { status: 400 });
    }

    if (user.requiredWager > 0) {
      return NextResponse.json({ 
        message: `Need to bet ₹${user.requiredWager.toLocaleString("en-IN")} more to be able to withdraw. Complete your wagering requirement first.` 
      }, { status: 400 });
    }

    if (user.holdWithdrawals) {
      return NextResponse.json({ 
        message: "Your withdrawals are currently on hold. Please contact support." 
      }, { status: 400 });
    }

    // Execute in a transaction to safely check balance, decrement balance, and create request + ledger
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: user.id },
      });

      if (!wallet || wallet.balance < numericAmount) {
        throw new Error("Insufficient wallet balance");
      }

      // Decrement balance immediately
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: numericAmount } },
      });

      // Save note with fee details
      const processingFeePercent = 5;
      const processingFee = Math.round(numericAmount * 0.05 * 100) / 100;
      const netPayoutAmount = Math.round(numericAmount * 0.95 * 100) / 100;

      const noteContent = JSON.stringify({
        method: method,
        accountDetails: accountDetails,
        requestedAt: new Date().toISOString(),
        requestedAmount: numericAmount,
        processingFeePercent,
        processingFee,
        netPayoutAmount,
      });

      const withdrawRequest = await tx.withdrawRequest.create({
        data: {
          userId: user.id,
          amount: numericAmount,
          status: "PENDING",
          note: noteContent,
        },
      });

      // Create Ledger Entry
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAW_REQUESTED",
          amount: -numericAmount,
          balanceAfter: updatedWallet.balance,
          meta: { withdrawId: withdrawRequest.id },
        },
      });

      return withdrawRequest;
    });

    // Send Telegram Notification (1st notification - Created)
    try {
      const { sendTelegramNotification } = await import("@/lib/telegram");
      await sendTelegramNotification(
        user.uid,
        result.amount,
        "Withdrawal",
        result.id,
        "created",
        result.createdAt,
        "N/A"
      );
    } catch (err) {
      console.error("Failed to send withdraw creation Telegram notification:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted for review",
      data: {
        _id: result.id,
        amount: result.amount,
        status: "pending",
      },
    });
  } catch (error: any) {
    console.error("POST wallet/withdraw/request API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
