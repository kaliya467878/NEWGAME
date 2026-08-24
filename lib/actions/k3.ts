"use server";

import { z } from "zod";
import type { K3BetType, K3Mode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/auth";
import { getRoundNumber, getRoundWindow } from "@/lib/k3/rounds";
import { checkAndAwardReferralReward } from "@/lib/rewards/referral";

const MODE_MAP: Record<string, K3Mode> = { m1: "M1", m3: "M3", m5: "M5", m10: "M10" };

const SUM_VALUES = new Set(Array.from({ length: 16 }, (_, i) => String(i + 3)));
const BIG_SMALL_SELECTIONS = new Set(["BIG", "SMALL"]);
const ODD_EVEN_SELECTIONS = new Set(["ODD", "EVEN"]);

const placeBetSchema = z.object({
  mode: z.enum(["m1", "m3", "m5", "m10"]),
  betType: z.enum(["SUM_VALUE", "SUM_BIG_SMALL", "SUM_ODD_EVEN", "ANY_TRIPLE"]),
  selection: z.string(),
  amount: z.coerce.number().int().min(1).max(100_000),
});

export type PlaceBetResult = { error: string } | { success: true; betId: string };

export async function placeBetAction(input: {
  mode: string;
  betType: K3BetType;
  selection: string;
  amount: number;
}): Promise<PlaceBetResult> {
  const user = await requireUser();

  const parsed = placeBetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid bet" };
  }

  const { betType, amount } = parsed.data;
  const selection = parsed.data.selection.toUpperCase();
  const mode = MODE_MAP[parsed.data.mode];

  const validSelection =
    (betType === "SUM_VALUE" && SUM_VALUES.has(selection)) ||
    (betType === "SUM_BIG_SMALL" && BIG_SMALL_SELECTIONS.has(selection)) ||
    (betType === "SUM_ODD_EVEN" && ODD_EVEN_SELECTIONS.has(selection)) ||
    (betType === "ANY_TRIPLE" && selection === "TRIPLE");

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
          meta: { mode, roundNumber: roundNumber.toString(), betType, selection, game: "k3" },
        },
      });

      return tx.k3Bet.create({
        data: {
          userId: user.id,
          mode,
          roundNumber,
          betType,
          selection,
          amount,
        },
      });
    });

    checkAndAwardReferralReward(user.id).catch((err) => {
      console.error("K3 bet placement referral reward check failed:", err);
    });

    return { success: true, betId: bet.id };
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_BALANCE") {
      return { error: "Insufficient balance" };
    }
    throw error;
  }
}
