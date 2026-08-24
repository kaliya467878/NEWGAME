import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { getRoundNumber, getRoundWindow } from "@/lib/k3/rounds";
import type { K3Mode, K3BetType } from "@/generated/prisma/client";


const DURATION_MAP: Record<string, K3Mode> = {
  "30s": "S30",
  "s30": "S30",
  "1m": "M1",
  "3m": "M3",
  "5m": "M5",
  "10m": "M10",
  "1min": "M1",
  "3min": "M3",
  "5min": "M5",
  "10min": "M10",
  "m1": "M1",
  "m3": "M3",
  "m5": "M5",
  "m10": "M10",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mode: string }> }
) {
  try {
    const { mode: duration } = await params;
    const mode = DURATION_MAP[duration.toLowerCase()];
    if (!mode) {
      return NextResponse.json({ message: "Invalid game duration requested." }, { status: 400 });
    }

    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { betType, betValue, amount } = await req.json();
    if (!betType || betValue === undefined || !amount || amount <= 0) {
      return NextResponse.json({ message: "Missing bet placement details." }, { status: 400 });
    }

    // Map betType + the UI's chip-label betValue onto the enum + normalized
    // `selection` string that lib/k3/rounds.ts's resolveBetMultiplier expects.
    // See lib/k3Utils.js's calculateK3Combinations for the exact betValue
    // shapes each category sends (e.g. "11" for a pair chip, "11_2" for a
    // pair+single combo, "123" for 3 sorted distinct digits).
    let mappedBetType: K3BetType;
    let selection: string;
    const rawValue = String(betValue);

    if (betType === "sum_value") {
      mappedBetType = "SUM_VALUE";
      selection = rawValue.toUpperCase();
    } else if (betType === "sum_big_small") {
      mappedBetType = "SUM_BIG_SMALL";
      selection = rawValue.toUpperCase();
    } else if (betType === "sum_odd_even") {
      mappedBetType = "SUM_ODD_EVEN";
      selection = rawValue.toUpperCase();
    } else if (betType === "any_triple") {
      mappedBetType = "ANY_TRIPLE";
      selection = rawValue.toUpperCase();
    } else if (betType === "2_same_specific") {
      mappedBetType = "TWO_SAME_SPECIFIC";
      selection = rawValue[0]; // "11" -> "1"
    } else if (betType === "2_same_unique") {
      mappedBetType = "TWO_SAME_UNIQUE";
      const [pair, single] = rawValue.split("_"); // "11_2" -> pair="11", single="2"
      if (!pair || !single) {
        return NextResponse.json({ message: "Invalid bet selection." }, { status: 400 });
      }
      selection = `${pair[0]}_${single}`;
    } else if (betType === "3_same_specific") {
      mappedBetType = "THREE_SAME_SPECIFIC";
      selection = rawValue[0]; // "111" -> "1"
    } else if (betType === "3_diff") {
      mappedBetType = "THREE_DIFFERENT";
      selection = rawValue; // already 3 sorted distinct digits, e.g. "123"
    } else if (betType === "2_diff") {
      mappedBetType = "TWO_DIFFERENT";
      selection = rawValue; // already 2 sorted distinct digits, e.g. "12"
    } else if (betType === "3_cont") {
      mappedBetType = "THREE_CONTINUOUS";
      selection = "ANY";
    } else {
      return NextResponse.json({ message: "Invalid bet type." }, { status: 400 });
    }

    // Check round locked status
    const roundNumber = getRoundNumber(mode);
    const { locksAt } = getRoundWindow(mode, roundNumber);
    if (Date.now() >= locksAt) {
      return NextResponse.json({ message: "Betting is locked for this round." }, { status: 400 });
    }

    // Optimized: Fetch User & Wallet in 1 single database round-trip
    const userWithWallet = await prisma.user.findUnique({
      where: { id: user.id },
      include: { wallet: true },
    });

    if (!userWithWallet || userWithWallet.status === "SUSPENDED") {
      return NextResponse.json({ message: "Not authorized or user suspended" }, { status: 401 });
    }

    const wallet = userWithWallet.wallet;
    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ message: "Insufficient balance to place bet." }, { status: 400 });
    }

    const balanceAfter = wallet.balance - amount;

    // Execute atomic CTE SQL write to place the bet in a single database round-trip
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
      INSERT INTO "K3Bet" (id, "userId", mode, "roundNumber", "betType", selection, amount, status, payout, "createdAt")
      SELECT gen_random_uuid(), ${user.id}, ${mode}::"K3Mode", ${roundNumber}::bigint, ${mappedBetType}::"K3BetType", ${selection}, ${amount}, 'PENDING'::"K3BetStatus", 0, now()
      FROM updated_wallet
      RETURNING id, amount;
    `;

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
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST K3 bet API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
