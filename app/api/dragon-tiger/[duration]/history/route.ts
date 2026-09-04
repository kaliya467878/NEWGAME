import { NextRequest, NextResponse } from "next/server";
import { resolveDragonTigerRound } from "@/lib/game-engine/dragon-tiger/engine";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ duration: string }> }
) {
  try {
    const { duration: durParam } = await params;
    const durKey = String(durParam || "1m").toLowerCase();
    const sec = durKey === "30s" ? 30 : 60;

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 10)));
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));

    const now = Date.now();
    const cycleMs = sec * 1000;
    const currentRoundIdx = Math.floor(now / cycleMs);

    const items = [];
    const startIndex = (page - 1) * limit;

    for (let i = 1 + startIndex; i <= limit + startIndex; i++) {
      const pastIdx = currentRoundIdx - i;
      const pastStartsAt = pastIdx * cycleMs;
      const dateStr = new Date(pastStartsAt).toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
      const periodId = `${dateStr}${String(Math.abs(pastIdx) % 1000).padStart(3, "0")}`;

      const result = resolveDragonTigerRound();

      items.push({
        periodId,
        outcome: result.outcome,
        dragonCard: result.dragonCard,
        tigerCard: result.tigerCard,
        createdAt: new Date(pastStartsAt).toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total: 100,
          totalPages: 10,
        },
      },
    });
  } catch (error: any) {
    console.error("GET dragon-tiger history API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
