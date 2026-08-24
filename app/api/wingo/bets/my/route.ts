import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { colorChips } from "@/lib/wingo/rounds";

const MODE_DURATIONS: Record<string, number> = {
  S30: 30,
  M1: 60,
  M3: 180,
  M5: 300,
};

const REVERSE_DURATION_MAP: Record<string, string> = {
  S30: "30s",
  M1: "1m",
  M3: "3m",
  M5: "5m",
};

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 30);

    const list = await prisma.wingoBet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const modes = Array.from(new Set(list.map((b) => b.mode)));
    const roundNumbers = Array.from(new Set(list.map((b) => b.roundNumber)));

    const results = await prisma.wingoResult.findMany({
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
      const durationSecs = MODE_DURATIONS[bet.mode] || 30;
      const durationStr = REVERSE_DURATION_MAP[bet.mode] || "30s";

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
        resultNumber: result ? result.number : null,
        betType: bet.betType.toLowerCase(),
        betValue: bet.selection.toLowerCase(),
        duration: durationSecs,
        tax: bet.amount * 0.02,
        amountAfterTax: bet.amount * 0.98,
        orderNumber: `WG${bet.roundNumber}${bet.id.slice(-8)}`.toUpperCase(),
        resultColors: result ? colorChips(result.color).map((c) => c.toLowerCase()) : [],
        resultSize: result ? result.size.toLowerCase() : "",
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
    console.error("GET Wingo my bets API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
