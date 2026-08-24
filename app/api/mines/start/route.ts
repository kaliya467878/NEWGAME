import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { randomInt } from "crypto";

const MINES_GRID_SIZE = 25;

function generateMinePositions(mineCount: number): number[] {
  const positions = new Set<number>();
  while (positions.size < mineCount) {
    positions.add(randomInt(0, MINES_GRID_SIZE));
  }
  return [...positions];
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { betAmount, mineCount } = await req.json();
    if (!betAmount || !mineCount || betAmount <= 0 || mineCount < 1 || mineCount >= MINES_GRID_SIZE) {
      return NextResponse.json({ message: "Invalid bet amount or mine count." }, { status: 400 });
    }

    // Check if there is already an active game
    const active = await prisma.minesGame.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
    });
    if (active) {
      return NextResponse.json({ message: "Finish your current mines game first." }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (!wallet || wallet.balance < betAmount) {
      return NextResponse.json({ message: "Insufficient balance to start game." }, { status: 400 });
    }

    const minePositions = generateMinePositions(mineCount);

    const game = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: betAmount } },
      });

      if (updatedWallet.balance < 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      await tx.ledgerEntry.create({
        data: {
          walletId: updatedWallet.id,
          type: "BET_PLACED",
          amount: -betAmount,
          balanceAfter: updatedWallet.balance,
          meta: { game: "MINES", mineCount },
        },
      });

      return tx.minesGame.create({
        data: {
          userId: user.id,
          amount: betAmount,
          mineCount,
          minePositions,
          revealed: [],
          multiplier: 1,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Game started successfully.",
      data: {
        game: {
          id: game.id,
          betAmount: game.amount,
          mineCount: game.mineCount,
          gridSize: MINES_GRID_SIZE,
          revealedTiles: [],
          minePositions: [], // Do not return positions in response to avoid cheating
          currentMultiplier: 1,
          status: "active",
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ message: "Insufficient balance to start game." }, { status: 400 });
    }
    console.error("POST Mines start API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
