export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { K3Mode } from "@/generated/prisma/client";
import { getRoundNumber, getStartRoundNumber } from "@/lib/k3/rounds";
import { settleRoundIfDue } from "@/lib/k3/settle";

const DURATION_MAP: Record<string, K3Mode> = {
  "30s": "S30",
  "s30": "S30",
  "1m": "M1",
  "3m": "M3",
  "5m": "M5",
  "10m": "M10",
  "1min": "M1",
  "3min": "M3",
  "5min": "M5",
  "10min": "M10",
  "m1": "M1",
  "m3": "M3",
  "m5": "M5",
  "m10": "M10",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mode: string }> }
) {
  try {
    const { mode: duration } = await params;
    const mode = DURATION_MAP[duration.toLowerCase()];
    if (!mode) {
      return NextResponse.json({ message: "Invalid game duration requested." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 10);

    // Exclude legacy-epoch rows (older 17-digit date-based round numbers that
    // are numerically larger than every current round) so history shows live
    // results, not the stale legacy block. See the Wingo results route for the
    // full rationale.
    const currentRound = getRoundNumber(mode, Date.now());
    const startRound = getStartRoundNumber(mode);

    // Lazy settle the previous round so results list is instantly updated on first hit
    try {
      await settleRoundIfDue(mode, currentRound - BigInt(1));
    } catch (settleError) {
      console.error("Failed to settle K3 round in results endpoint:", settleError);
    }

    const list = await prisma.k3Result.findMany({
      where: { mode, roundNumber: { lt: currentRound, gte: startRound } },
      orderBy: { roundNumber: "desc" },
      take: limit,
    });

    const formatted = list.map((p) => {
      const dices = [p.dice1, p.dice2, p.dice3];
      const sum = p.sum;
      const size = sum >= 11 ? "big" : "small";
      const parity = sum % 2 !== 0 ? "odd" : "even";

      return {
        periodId: String(p.roundNumber),
        dices,
        sum,
        size,
        parity,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET K3 results API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
