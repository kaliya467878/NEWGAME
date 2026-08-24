import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { creditWallet } from "@/lib/wallet/credit";

/** Debits a bet inside a transaction, returning the wallet, or throwing if insufficient. */
export async function debitBet(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  game: string,
  meta?: Record<string, unknown>
) {
  const wallet = await tx.wallet.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });

  const user = await tx.user.findUnique({ where: { id: userId } });
  if (user && user.requiredWager > 0) {
    const nextWager = Math.max(0, user.requiredWager - amount);
    await tx.user.update({
      where: { id: userId },
      data: { requiredWager: nextWager }
    });
  }
  if (wallet.balance < 0) {
    throw new Error("INSUFFICIENT_BALANCE");
  }
  await tx.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      type: "BET_PLACED",
      amount: -amount,
      balanceAfter: wallet.balance,
      meta: { game, ...meta } as Prisma.InputJsonValue,
    },
  });
  return wallet;
}

export async function creditWin(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  game: string,
  meta?: Record<string, unknown>
) {
  return creditWallet(tx, userId, amount, "BET_WON", { game, ...meta });
}

export async function getBalance(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet?.balance ?? 0;
}
