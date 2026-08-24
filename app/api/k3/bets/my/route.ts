import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MODE_DURATIONS: Record<string, number> = {
  M1: 60,
  M3: 180,
  M5: 300,
  M10: 600,
};

const REVERSE_DURATION_MAP: Record<string, string> = {
  M1: "1m",
  M3: "3m",
  M5: "5m",
  M10: "10m",
};

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 30);

    const list = await prisma.k3Bet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const modes = Array.from(new Set(list.map((b) => b.mode)));
    const roundNumbers = Array.from(new Set(list.map((b) => b.roundNumber)));

    const results = await prisma.k3Result.findMany({
      where: {
        mode: { in: modes },
        roundNumber: { in: roundNumbers },
      },
    });

    const resultsMap = new Map(results.map((r) => [`${r.mode}_${r.roundNumber}`, r]));

    const formatted = list.map((bet) => {
      const resultKey = `${bet.mode}_${bet.roundNumber}`;
      const result = resultsMap.get(resultKey);

      const payoutRatio = bet.amount > 0 ? bet.payout / bet.amount : 0;
      const durationSecs = MODE_DURATIONS[bet.mode] || 60;
      const durationStr = REVERSE_DURATION_MAP[bet.mode] || "1m";

      const stateStr = bet.status.toLowerCase();

      return {
        _id: bet.id,
        periodId: String(bet.roundNumber),
        amount: bet.amount,
        winAmount: bet.payout,
        payoutRatio,
        state: stateStr,
        status: stateStr,
        createdAt: bet.createdAt.toISOString(),
        dices: result ? [result.dice1, result.dice2, result.dice3] : [],
        resultSum: result ? result.sum : null,
        resultSize: result ? (result.sum >= 11 ? "big" : "small") : "",
        resultParity: result ? (result.sum % 2 !== 0 ? "odd" : "even") : "",
        betType: bet.betType.toLowerCase(),
        betValue: bet.selection.toLowerCase(),
        duration: durationSecs,
        orderNumber: `K3${bet.roundNumber}${bet.id.slice(-8)}`.toUpperCase(),
        details: {
          betType: bet.betType.toLowerCase(),
          betValue: bet.selection.toLowerCase(),
          duration: durationStr,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        bets: formatted,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (error: any) {
    console.error("GET K3 my bets API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
