import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { creditWin } from "@/lib/games/wallet";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { gameId } = await req.json();

    const activeGame = await prisma.minesGame.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!activeGame || (gameId && activeGame.id !== gameId)) {
      return NextResponse.json({ message: "Active game not found." }, { status: 400 });
    }

    if (activeGame.revealed.length === 0) {
      return NextResponse.json({ message: "Cannot cash out without revealing any tiles." }, { status: 400 });
    }

    const payout = Math.floor(activeGame.amount * activeGame.multiplier);

    const balance = await prisma.$transaction(async (tx) => {
      await tx.minesGame.update({
        where: { id: activeGame.id },
        data: {
          status: "CASHED_OUT",
          payout,
          endedAt: new Date(),
        },
      });

      const wallet = await creditWin(tx, user.id, payout, "MINES", {
        gameId: activeGame.id,
        multiplier: activeGame.multiplier,
      });

      return wallet.balance;
    });

    return NextResponse.json({
      success: true,
      data: {
        cashedOut: true,
        multiplier: activeGame.multiplier,
        payout,
        balance,
        game: {
          id: activeGame.id,
          betAmount: activeGame.amount,
          mineCount: activeGame.mineCount,
          gridSize: 25,
          revealedTiles: activeGame.revealed,
          minePositions: activeGame.minePositions,
          currentMultiplier: activeGame.multiplier,
          status: "won",
          payout,
        },
      },
    });
  } catch (error: any) {
    console.error("POST Mines cashout API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
