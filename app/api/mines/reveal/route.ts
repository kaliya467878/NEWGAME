import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { minesMultiplier } from "@/lib/games/logic";
import { creditWin } from "@/lib/games/wallet";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { gameId, tileIndex } = await req.json();
    if (tileIndex === undefined || tileIndex < 0 || tileIndex >= 25) {
      return NextResponse.json({ message: "Invalid tile index." }, { status: 400 });
    }

    const activeGame = await prisma.minesGame.findFirst({
      where: {
        userId: user.id,
        status: "ACTIVE",
      },
    });

    if (!activeGame || (gameId && activeGame.id !== gameId)) {
      return NextResponse.json({ message: "Active game not found." }, { status: 400 });
    }

    if (activeGame.revealed.includes(tileIndex)) {
      return NextResponse.json({ message: "Tile is already revealed." }, { status: 400 });
    }

    let minePositions = [...activeGame.minePositions];
    if (activeGame.revealed.length === 0) {
      const isAllowedToWin = Math.random() < 0.02; // strictly 2% winning chances
      if (isAllowedToWin) {
        // Force safe tile by removing mine from clicked tile
        minePositions = minePositions.filter((p) => p !== tileIndex);
      } else {
        // Force mine tile by adding mine to clicked tile
        if (!minePositions.includes(tileIndex)) {
          minePositions.push(tileIndex);
        }
      }
    } else {
      // Force mine on any subsequent tile reveal
      if (!minePositions.includes(tileIndex)) {
        minePositions.push(tileIndex);
      }
    }

    const isMine = minePositions.includes(tileIndex);

    if (isMine) {
      // Hit a mine! Game is lost
      const revealedWithHit = [...activeGame.revealed, tileIndex];
      await prisma.minesGame.update({
        where: { id: activeGame.id },
        data: { status: "LOST", revealed: revealedWithHit, minePositions },
      });

      return NextResponse.json({
        success: true,
        data: {
          tileResult: "mine",
          hitMine: true,
          game: {
            id: activeGame.id,
            betAmount: activeGame.amount,
            mineCount: activeGame.mineCount,
            gridSize: 25,
            revealedTiles: revealedWithHit,
            minePositions,
            currentMultiplier: activeGame.multiplier,
            status: "lost",
            payout: 0,
          },
        },
      });
    }

    // Safe tile revealed!
    const newRevealed = [...activeGame.revealed, tileIndex];
    const newMultiplier = minesMultiplier(activeGame.mineCount, newRevealed.length);
    const safeTilesTotal = 25 - activeGame.mineCount;

    if (newRevealed.length >= safeTilesTotal) {
      // Auto-cashout since all safe tiles are revealed!
      const payout = Math.floor(activeGame.amount * newMultiplier);

      const balance = await prisma.$transaction(async (tx) => {
        await tx.minesGame.update({
          where: { id: activeGame.id },
          data: {
            status: "CASHED_OUT",
            revealed: newRevealed,
            minePositions,
            multiplier: newMultiplier,
            payout,
            endedAt: new Date(),
          },
        });

        const wallet = await creditWin(tx, user.id, payout, "MINES", {
          gameId: activeGame.id,
          multiplier: newMultiplier,
        });

        return wallet.balance;
      });

      return NextResponse.json({
        success: true,
        data: {
          tileResult: "gem",
          cashedOut: true,
          multiplier: newMultiplier,
          payout,
          balance,
          game: {
            id: activeGame.id,
            betAmount: activeGame.amount,
            mineCount: activeGame.mineCount,
            gridSize: 25,
            revealedTiles: newRevealed,
            minePositions,
            currentMultiplier: newMultiplier,
            status: "won",
            payout,
          },
        },
      });
    }

    // Keep playing
    await prisma.minesGame.update({
      where: { id: activeGame.id },
      data: {
        revealed: newRevealed,
        minePositions,
        multiplier: newMultiplier,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tileResult: "gem",
        revealed: newRevealed,
        multiplier: newMultiplier,
        game: {
          id: activeGame.id,
          betAmount: activeGame.amount,
          mineCount: activeGame.mineCount,
          gridSize: 25,
          revealedTiles: newRevealed,
          minePositions: [],
          currentMultiplier: newMultiplier,
          status: "active",
          payout: null,
        },
      },
    });
  } catch (error: any) {
    console.error("POST Mines reveal API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
