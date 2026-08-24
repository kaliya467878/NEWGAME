"use server";

import { z } from "zod";
import type { WingoBetType, WingoMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/auth";
import { getRoundNumber, getRoundWindow } from "@/lib/wingo/rounds";
import { checkAndAwardReferralReward } from "@/lib/rewards/referral";

const MODE_MAP: Record<string, WingoMode> = { s30: "S30", m1: "M1", m3: "M3", m5: "M5" };

const NUMBER_SELECTIONS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const COLOR_SELECTIONS = new Set(["RED", "GREEN", "VIOLET"]);
const SIZE_SELECTIONS = new Set(["BIG", "SMALL"]);

const placeBetSchema = z.object({
  mode: z.enum(["s30", "m1", "m3", "m5"]),
  betType: z.enum(["NUMBER", "COLOR", "BIG_SMALL"]),
  selection: z.string(),
  amount: z.coerce.number().int().min(1).max(100_000),
});

export type PlaceBetResult = { error: string } | { success: true; betId: string };

export async function placeBetAction(input: {
  mode: string;
  betType: WingoBetType;
  selection: string;
  amount: number;
}): Promise<PlaceBetResult> {
  const user = await requireUser();

  const parsed = placeBetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid bet" };
  }

  const { betType, selection, amount } = parsed.data;
  const mode = MODE_MAP[parsed.data.mode];

  const validSelection =
    (betType === "NUMBER" && NUMBER_SELECTIONS.has(selection)) ||
    (betType === "COLOR" && COLOR_SELECTIONS.has(selection.toUpperCase())) ||
    (betType === "BIG_SMALL" && SIZE_SELECTIONS.has(selection.toUpperCase()));

  if (!validSelection) {
    return { error: "Invalid selection for this bet type" };
  }

  const roundNumber = getRoundNumber(mode);
  const { locksAt, endsAt } = getRoundWindow(mode, roundNumber);
  const now = Date.now();

  if (now >= locksAt || now >= endsAt) {
    return { error: "Betting is locked for this round" };
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet || wallet.balance < amount) {
    return { error: "Insufficient balance" };
  }

  try {
    const bet = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId: user.id },
        data: { balance: { decrement: amount } },
      });

      if (updatedWallet.balance < 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      await tx.ledgerEntry.create({
        data: {
          walletId: updatedWallet.id,
          type: "BET_PLACED",
          amount: -amount,
          balanceAfter: updatedWallet.balance,
          meta: { mode, roundNumber: roundNumber.toString(), betType, selection },
        },
      });

      return tx.wingoBet.create({
        data: {
          userId: user.id,
          mode,
          roundNumber,
          betType,
          selection: selection.toUpperCase(),
          amount,
        },
      });
    });

    checkAndAwardReferralReward(user.id).catch((err) => {
      console.error("Wingo bet placement referral reward check failed:", err);
    });

    return { success: true, betId: bet.id };
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_BALANCE") {
      return { error: "Insufficient balance" };
    }
    throw error;
  }
}
