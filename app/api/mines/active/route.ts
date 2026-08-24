import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const activeGame = await prisma.minesGame.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!activeGame) {
      return NextResponse.json({ success: true, data: { game: null } });
    }

    return NextResponse.json({
      success: true,
      data: {
        game: {
          id: activeGame.id,
          betAmount: activeGame.amount,
          mineCount: activeGame.mineCount,
          gridSize: 25,
          revealedTiles: activeGame.revealed,
          minePositions: [], // Do not return mine positions for active game!
          currentMultiplier: activeGame.multiplier,
          status: "active",
        },
      },
    });
  } catch (error: any) {
    console.error("GET Mines active API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
