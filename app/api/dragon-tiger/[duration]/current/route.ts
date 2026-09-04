import { NextRequest, NextResponse } from "next/server";
import { resolveDragonTigerRound } from "@/lib/game-engine/dragon-tiger/engine";

export const dynamic = "force-dynamic";

const DURATION_SEC: Record<string, number> = {
  "30s": 30,
  "1m": 60,
  "60s": 60,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ duration: string }> }
) {
  try {
    const { duration: durParam } = await params;
    const durKey = String(durParam || "1m").toLowerCase();
    const sec = DURATION_SEC[durKey] || 60;

    const now = Date.now();
    const cycleMs = sec * 1000;
    const roundIdx = Math.floor(now / cycleMs);
    const startsAt = roundIdx * cycleMs;
    const endsAt = startsAt + cycleMs;
    const remainingSeconds = Math.max(0, Math.ceil((endsAt - now) / 1000));

    // Calculate deterministic round result for just-ended or current round
    const dateStr = new Date(startsAt).toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
    const periodId = `${dateStr}${String(roundIdx % 1000).padStart(3, "0")}`;

    const result = resolveDragonTigerRound();

    return NextResponse.json({
      success: true,
      data: {
        periodId,
        remainingSeconds,
        startTime: new Date(startsAt).toISOString(),
        endTime: new Date(endsAt).toISOString(),
        status: remainingSeconds <= 5 ? "PROCESSING" : "BETTING",
        betLockSeconds: 5,
        bettingLocked: remainingSeconds <= 5,
        result: remainingSeconds <= 5 ? result : null,
      },
    });
  } catch (error: any) {
    console.error("GET dragon-tiger current API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
