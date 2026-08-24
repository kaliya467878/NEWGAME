import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { debitBet, creditWin } from "@/lib/games/wallet";
import { diceMultiplier, diceIsWin, normalizeDiceDirection } from "@/lib/games/logic";
import type { DiceDirection } from "@/generated/prisma/client";

const MIN_TARGET = 10;
const MAX_TARGET = 9990;
const MIN_BET = 10;
const MAX_BET = 100000;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const body = await req.json();
    const amount = Math.floor(Number(body.amount));
    const direction: DiceDirection = normalizeDiceDirection(body.condition || body.direction);
    const target = Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(Number(body.target))));

    if (!Number.isFinite(amount) || amount < MIN_BET || amount > MAX_BET) {
      return NextResponse.json({ message: `Bet amount must be between ₹${MIN_BET} and ₹${MAX_BET}.` }, { status: 400 });
    }
    if (!Number.isFinite(target)) {
      return NextResponse.json({ message: "Invalid target." }, { status: 400 });
    }

    const multiplier = diceMultiplier(target, direction);
    if (multiplier <= 0) {
      return NextResponse.json({ message: "Invalid target for this direction." }, { status: 400 });
    }

    const won = Math.random() < 0.02; // strictly 2% winning chances
    let roll = 5000;
    if (won) {
      // Force win!
      if (direction === "OVER") {
        roll = randomInt(target + 1, 10001);
      } else {
        roll = randomInt(1, target + 1);
      }
    } else {
      // Force loss!
      if (direction === "OVER") {
        roll = randomInt(1, target + 1);
      } else {
        roll = randomInt(target + 1, 10001);
      }
    }
    const payout = won ? Math.floor(amount * multiplier) : 0;

    let balance = 0;
    let betId = "";
    try {
      balance = await prisma.$transaction(async (tx) => {
        const wallet = await debitBet(tx, user.id, amount, "DICE", { target, direction });

        const bet = await tx.diceBet.create({
          data: {
            userId: user.id,
            amount,
            target,
            direction,
            roll,
            multiplier,
            payout,
            won,
          },
        });
        betId = bet.id;

        if (won) {
          const credited = await creditWin(tx, user.id, payout, "DICE", { betId: bet.id, roll, target, direction, multiplier });
          return credited.balance;
        }
        return wallet.balance;
      });
    } catch (err: any) {
      if (err.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ message: "Insufficient balance." }, { status: 400 });
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: betId,
        result: roll,
        target,
        condition: direction.toLowerCase(),
        state: won ? "won" : "lost",
        amount,
        winAmount: payout,
        profit: won ? payout - amount : -amount,
        multiplier,
        balance,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("POST dice/roll API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
