import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const midnight = startOfDay(new Date());

    // Count how many withdrawals the user has requested today (pending, approved or rejected)
    const withdrawalsToday = await prisma.withdrawRequest.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: midnight },
      },
    });

    const withdrawalsCountToday = withdrawalsToday.length;
    const totalWithdrawnToday = withdrawalsToday
      .filter((w) => w.status === "APPROVED")
      .reduce((sum, w) => sum + w.amount, 0);

    const dailyLimit = user.dailyWithdrawLimit ?? 3;
    const maxLimit = user.maxWithdrawLimit ?? 50000;
    const remainingWithdrawals = Math.max(0, dailyLimit - withdrawalsCountToday);

    const approvedDeposits = await prisma.depositRequest.findMany({
      where: { userId: user.id, status: "APPROVED" },
      select: { channelKey: true, note: true },
    });

    const hasApprovedDeposit = user.bypassRechargeCheck || approvedDeposits.length > 0;

    // Determine if user has a USDT deposit (via channelKey or note)
    const hasUsdtDeposit = approvedDeposits.some((d) => {
      const key = (d.channelKey || "").toLowerCase();
      if (key.includes("usdt") || key.includes("tron") || key.includes("crypto") || key.includes("bep20")) return true;
      try {
        const noteObj = JSON.parse(d.note || "{}");
        const noteGateway = (noteObj.gateway || "").toLowerCase();
        const noteCurrency = (noteObj.payCurrency || noteObj.currency || "").toLowerCase();
        if (noteCurrency.includes("usdt") || noteCurrency.includes("trc20") || noteCurrency.includes("bep20")) return true;
        if (noteGateway === "nowpayments") return true;
      } catch {}
      return false;
    });

    // Determine if user has any INR (non-USDT) deposit
    const hasInrDeposit = approvedDeposits.some((d) => {
      const key = (d.channelKey || "").toLowerCase();
      if (key.includes("usdt") || key.includes("tron") || key.includes("crypto") || key.includes("bep20")) return false;
      try {
        const noteObj = JSON.parse(d.note || "{}");
        const noteGateway = (noteObj.gateway || "").toLowerCase();
        const noteCurrency = (noteObj.payCurrency || noteObj.currency || "").toLowerCase();
        if (noteCurrency.includes("usdt") || noteCurrency.includes("trc20") || noteCurrency.includes("bep20")) return false;
        if (noteGateway === "nowpayments") return false;
      } catch {}
      return true; // Treat as INR deposit if no USDT indicator found
    });

    // Wagering requirement
    const requiredWager = user.requiredWager ?? 0;
    const wagerRemaining = Math.max(0, requiredWager);

    // Context rules mapping
    const rules = {
      deposit: { minAmount: 100, maxAmount: 100000 },
      withdraw: {
        windowStart: "00:00",
        windowEnd: "23:59",
        dailyLimit: dailyLimit,
        betRequired: wagerRemaining,
        bank: { min: 211, max: maxLimit, enabled: true },
        upi: { min: 211, max: maxLimit, enabled: false }, // UPI withdrawals disabled
        usdt: { min: 1040, max: 10000000, usdtRate: 104, enabled: hasUsdtDeposit },
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        rules,
        stats: {
          remainingWithdrawals,
          totalWithdrawnToday,
          hasApprovedDeposit,
          hasUsdtDeposit,
          hasInrDeposit,
          wagerRemaining,
          requiredWager,
          holdWithdrawals: user.holdWithdrawals ?? false,
        },
      },
    });
  } catch (error: any) {
    console.error("GET wallet/withdraw/context API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}

