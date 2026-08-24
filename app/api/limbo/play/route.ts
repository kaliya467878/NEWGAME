import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { debitBet, creditWin } from "@/lib/games/wallet";
import { crashPointFromRandom } from "@/lib/games/logic";

const MIN_BET = 10;
const MAX_BET = 100000;
const MIN_TARGET = 1.01;
const MAX_TARGET = 1000;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const body = await req.json();
    const amount = Math.floor(Number(body.amount));
    const targetMultiplier = Math.min(MAX_TARGET, Math.max(MIN_TARGET, Number(body.targetMultiplier)));

    if (!Number.isFinite(amount) || amount < MIN_BET || amount > MAX_BET) {
      return NextResponse.json({ success: false, message: `Bet amount must be between ₹${MIN_BET} and ₹${MAX_BET}.` }, { status: 400 });
    }
    if (!Number.isFinite(targetMultiplier) || targetMultiplier < MIN_TARGET) {
      return NextResponse.json({ success: false, message: "Invalid target multiplier." }, { status: 400 });
    }

    const won = Math.random() < 0.02; // strictly 2% winning chances
    let crashPoint = 1.0;
    if (won) {
      // Force win! Make crashPoint at least targetMultiplier
      crashPoint = targetMultiplier + Math.random() * 5;
    } else {
      // Force loss! Make crashPoint less than targetMultiplier
      const maxCrash = Math.max(1.0, targetMultiplier - 0.01);
      crashPoint = 1.0 + Math.random() * (maxCrash - 1.0);
    }
    // Round crashPoint to 2 decimals
    crashPoint = Math.max(1.0, Math.floor(crashPoint * 100) / 100);
    const payout = won ? Math.floor(amount * targetMultiplier) : 0;

    let balance = 0;
    let betId = "";
    try {
      balance = await prisma.$transaction(async (tx) => {
        const wallet = await debitBet(tx, user.id, amount, "LIMBO", { targetMultiplier });

        const bet = await tx.limboBet.create({
          data: {
            userId: user.id,
            amount,
            targetMultiplier,
            crashPoint,
            payout,
            won,
          },
        });
        betId = bet.id;

        if (won) {
          const credited = await creditWin(tx, user.id, payout, "LIMBO", { betId: bet.id, crashPoint, targetMultiplier });
          return credited.balance;
        }
        return wallet.balance;
      });
    } catch (err: any) {
      if (err.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ success: false, message: "Insufficient balance." }, { status: 400 });
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: betId,
        result: crashPoint,
        targetMultiplier,
        status: won ? "won" : "lost",
        amount,
        winAmount: payout,
        balance,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("POST limbo/play API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
