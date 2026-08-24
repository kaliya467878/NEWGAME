import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 30);

    const list = await prisma.minesGame.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formatted = list.map((game) => {
      const stateStr = game.status.toLowerCase();
      const stateMapped = stateStr === "cashed_out" ? "won" : stateStr === "active" ? "active" : "lost";

      return {
        _id: game.id,
        periodId: game.id.slice(0, 8).toUpperCase(),
        amount: game.amount,
        winAmount: game.payout,
        payoutRatio: game.multiplier,
        state: stateMapped,
        status: stateMapped,
        createdAt: game.createdAt.toISOString(),
        details: {
          mineCount: game.mineCount,
          revealedTiles: game.revealed,
          won: stateMapped === "won",
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error("GET Mines my bets API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
