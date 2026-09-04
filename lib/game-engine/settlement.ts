import { prisma } from "@/lib/prisma";
import { debitBet, creditWin } from "@/lib/games/wallet";
import { SettlementResult } from "./types";

export async function processBetDebit(userId: string, amount: number, gameId: string, meta?: Record<string, unknown>) {
  return prisma.$transaction(async (tx) => {
    return debitBet(tx, userId, amount, gameId.toUpperCase(), meta);
  });
}

export async function processBetSettlement(
  userId: string,
  settlements: SettlementResult[],
  gameId: string,
  meta?: Record<string, unknown>
) {
  return prisma.$transaction(async (tx) => {
    let finalBalance = 0;
    for (const s of settlements) {
      if (s.payout > 0) {
        const credited = await creditWin(tx, userId, s.payout, gameId.toUpperCase(), {
          betId: s.betId,
          status: s.status,
          ...meta,
        });
        finalBalance = credited.balance;
      }
    }
    if (finalBalance === 0) {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      finalBalance = wallet?.balance ?? 0;
    }
    return finalBalance;
  });
}
