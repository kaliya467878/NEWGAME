import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import { getRoundNumber, getRoundWindow } from "@/lib/wingo/rounds";
import type { WingoMode, WingoBetType } from "@/generated/prisma/client";


const DURATION_MAP: Record<string, WingoMode> = {
  "30s": "S30",
  "1m": "M1",
  "3m": "M3",
  "5m": "M5",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mode: string }> }
) {
  const serverReceivedTime = Date.now();
  try {
    const { mode: duration } = await params;
    const mode = DURATION_MAP[duration];
    if (!mode) {
      return NextResponse.json({ message: "Invalid game duration requested." }, { status: 400 });
    }

    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { betType, betValue, amount, clickTime, sendTime } = await req.json();
    if (!betType || betValue === undefined || !amount || amount <= 0) {
      return NextResponse.json({ message: "Missing bet placement details." }, { status: 400 });
    }

    // Map betType & selection
    let mappedBetType: WingoBetType;
    if (betType === "number") mappedBetType = "NUMBER";
    else if (betType === "color") mappedBetType = "COLOR";
    else if (betType === "big_small") mappedBetType = "BIG_SMALL";
    else {
      return NextResponse.json({ message: "Invalid bet type." }, { status: 400 });
    }

    const selection = String(betValue).toUpperCase();

    // Check round locked status
    const roundNumber = getRoundNumber(mode);
    const { locksAt } = getRoundWindow(mode, roundNumber);
    if (Date.now() >= locksAt) {
      return NextResponse.json({ message: "Betting is locked for this round." }, { status: 400 });
    }

    // Optimized: Fetch User & Wallet in 1 single database round-trip
    const t0 = Date.now();
    const userWithWallet = await prisma.user.findUnique({
      where: { id: user.id },
      include: { wallet: true },
    });
    const userWalletTime = Date.now() - t0;

    if (!userWithWallet || userWithWallet.status === "SUSPENDED") {
      return NextResponse.json({ message: "Not authorized or user suspended" }, { status: 401 });
    }

    const wallet = userWithWallet.wallet;
    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ message: "Insufficient balance to place bet." }, { status: 400 });
    }

    const balanceAfter = wallet.balance - amount;

    // Execute atomic CTE SQL write to place the bet in a single database round-trip
    const t1 = Date.now();
    const metaJson = JSON.stringify({ mode, roundNumber: roundNumber.toString(), betType: mappedBetType, selection });
    const rawResult = await prisma.$queryRaw<any[]>`
      WITH updated_wallet AS (
        UPDATE "Wallet"
        SET balance = balance - ${amount}
        WHERE "userId" = ${user.id} AND balance >= ${amount}
        RETURNING id, balance
      ),
      inserted_ledger AS (
        INSERT INTO "LedgerEntry" (id, "walletId", type, amount, "balanceAfter", meta, "createdAt")
        SELECT gen_random_uuid(), id, 'BET_PLACED'::"LedgerType", ${-amount}, balance, ${metaJson}::jsonb, now()
        FROM updated_wallet
      )
      INSERT INTO "WingoBet" (id, "userId", mode, "roundNumber", "betType", selection, amount, status, payout, "createdAt")
      SELECT gen_random_uuid(), ${user.id}, ${mode}::"WingoMode", ${roundNumber}::bigint, ${mappedBetType}::"WingoBetType", ${selection}, ${amount}, 'PENDING'::"WingoBetStatus", 0, now()
      FROM updated_wallet
      RETURNING id, amount;
    `;
    const txTime = Date.now() - t1;

    if (!rawResult || rawResult.length === 0) {
      return NextResponse.json({ message: "Insufficient balance to place bet." }, { status: 400 });
    }

    // Decrement required wager if set
    if (userWithWallet.requiredWager > 0) {
      const nextWager = Math.max(0, userWithWallet.requiredWager - amount);
      await prisma.user.update({
        where: { id: user.id },
        data: { requiredWager: nextWager }
      });
    }

    const bet = rawResult[0];

    try {
      fs.appendFileSync(
        "C:/Users/ashut/Downloads/omega-new/scratch/latency.log",
        `[${new Date().toISOString()}] User & Wallet Fetch: ${userWalletTime}ms | Transaction Batch: ${txTime}ms\n`
      );
    } catch (e) {
      console.error("Failed to write to latency log:", e);
    }

    const dbWriteTime = Date.now();
    const responseSentTime = Date.now();

    return NextResponse.json({
      success: true,
      message: "Bet placed successfully.",
      data: {
        _id: bet.id,
        amount: bet.amount,
        state: "pending",
        details: {
          betType,
          betValue,
          duration,
        },
      },
      timestamps: {
        clickTime,
        sendTime,
        serverReceivedTime,
        dbWriteTime,
        responseSentTime,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Wingo bet API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
