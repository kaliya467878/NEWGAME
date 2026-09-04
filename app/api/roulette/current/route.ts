import { NextRequest, NextResponse } from "next/server";
import { resolveRouletteRound } from "@/lib/game-engine/roulette/engine";

export const dynamic = "force-dynamic";

const CYCLE_SECONDS = 30; // 30-second 24/7 continuous rounds

export async function GET() {
  try {
    const now = Date.now();
    const cycleMs = CYCLE_SECONDS * 1000;
    const roundIdx = Math.floor(now / cycleMs);
    const startsAt = roundIdx * cycleMs;
    const endsAt = startsAt + cycleMs;
    const remainingSeconds = Math.max(0, Math.ceil((endsAt - now) / 1000));

    const dateStr = new Date(startsAt).toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
    const periodId = `${dateStr}${String(roundIdx % 1000).padStart(3, "0")}`;

    const result = resolveRouletteRound();

    return NextResponse.json({
      success: true,
      data: {
        periodId,
        remainingSeconds,
        totalCycleSeconds: CYCLE_SECONDS,
        startTime: new Date(startsAt).toISOString(),
        endTime: new Date(endsAt).toISOString(),
        status: remainingSeconds <= 5 ? "SPINNING" : "BETTING",
        bettingLocked: remainingSeconds <= 5,
        result: remainingSeconds <= 5 ? result : null,
      },
    });
  } catch (error: any) {
    console.error("GET roulette current API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
