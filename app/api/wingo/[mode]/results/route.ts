export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { WingoMode } from "@/generated/prisma/client";
import { colorChips, getRoundNumber } from "@/lib/wingo/rounds";
import { settleRoundIfDue } from "@/lib/wingo/settle";

const DURATION_MAP: Record<string, WingoMode> = {
  "30s": "S30",
  "1m": "M1",
  "3m": "M3",
  "5m": "M5",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mode: string }> }
) {
  try {
    const { mode: duration } = await params;
    const mode = DURATION_MAP[duration];
    if (!mode) {
      return NextResponse.json({ message: "Invalid game duration requested." }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 10);

    // Only return current-epoch rounds. The DB still holds legacy rows from an
    // older date-based numbering scheme (e.g. 20260711103004929 — 17 digits)
    // that are numerically far larger than every current round (2026111003…,
    // 16 digits), so without this bound a `desc` sort would forever surface the
    // stale legacy rows on top and hide the live results. The live round grows
    // by 1 per round and will never reach the legacy magnitude.
    const currentRound = getRoundNumber(mode, Date.now());

    // Lazy settle the previous round so results list is instantly updated on first hit
    try {
      await settleRoundIfDue(mode, currentRound - BigInt(1));
    } catch (settleError) {
      console.error("Failed to settle Wingo round in results endpoint:", settleError);
    }

    const list = await prisma.wingoResult.findMany({
      where: { mode, roundNumber: { lt: currentRound } },
      orderBy: { roundNumber: "desc" },
      take: limit,
    });

    const formatted = list.map((p) => {
      // Map colors to lowercase array expected by frontend
      // e.g. "RED_VIOLET" -> ["red", "violet"]
      const chips = colorChips(p.color).map((c) => c.toLowerCase());

      return {
        periodId: String(p.roundNumber),
        number: p.number,
        resultNumber: p.number,
        colors: chips,
        size: p.size.toLowerCase(),
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("GET Wingo results API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
