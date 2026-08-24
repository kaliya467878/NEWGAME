export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getRoundNumber, getRoundWindow } from "@/lib/k3/rounds";
import { settleRoundIfDue } from "@/lib/k3/settle";
import { prisma } from "@/lib/prisma";
import type { K3Mode } from "@/generated/prisma/client";

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

const ALL_MODES: K3Mode[] = ["S30", "M1", "M3", "M5", "M10"];

// Keeps every duration settled, not just the one being viewed — a single
// active user's poll on any K3 tab now also drains the others in the
// background, so a duration nobody's looking at doesn't accumulate a
// backlog between cron runs (see /api/cron/settle-rounds for the fully
// idle-tab backstop).
function settleSiblingModesInBackground(currentMode: K3Mode, now: number) {
  for (const mode of ALL_MODES) {
    if (mode === currentMode) continue;
    const roundNumber = getRoundNumber(mode, now);
    settleRoundIfDue(mode, roundNumber - BigInt(1)).catch((err) => {
      console.error(`Failed to settle sibling K3 mode ${mode}:`, err);
    });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mode: string }> }
) {
  try {
    const { mode: duration } = await params;
    const mode = DURATION_MAP[duration.toLowerCase()];
    if (!mode) {
      return NextResponse.json({ message: "Invalid game duration requested." }, { status: 400 });
    }

    const now = Date.now();
    const roundNumber = getRoundNumber(mode, now);
    const { endsAt } = getRoundWindow(mode, roundNumber);
    const remainingSeconds = Math.max(0, Math.floor((endsAt - now) / 1000));

    // Lazy settle the previous round
    try {
      await settleRoundIfDue(mode, roundNumber - BigInt(1));
    } catch (settleError) {
      console.error("Failed to settle K3 round in current endpoint:", settleError);
    }
    settleSiblingModesInBackground(mode, now);

    // Fetch active stakes summary for this round
    const activeBets = await prisma.k3Bet.findMany({
      where: {
        mode,
        roundNumber,
        status: "PENDING",
      },
    });

    const totalBetsCount = activeBets.length;
    const totalAmountBetted = activeBets.reduce((sum, b) => sum + b.amount, 0);
    const uniquePlayers = new Set(activeBets.map((b) => b.userId));
    const uniquePlayersCount = uniquePlayers.size;

    return NextResponse.json({
      success: true,
      data: {
        periodId: String(roundNumber),
        remainingSeconds,
        serverTime: now,
        activeStakes: {
          totalBetsCount,
          totalAmountBetted,
          uniquePlayersCount,
        },
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (error: any) {
    console.error("GET K3 current API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
