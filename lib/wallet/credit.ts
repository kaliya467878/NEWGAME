import type { LedgerType, Prisma } from "@/generated/prisma/client";

export async function creditWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: LedgerType,
  meta?: Record<string, unknown>
) {
  const wallet = await tx.wallet.update({
    where: { userId },
    data: { balance: { increment: amount } },
  });

  await tx.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      type,
      amount,
      balanceAfter: wallet.balance,
      meta: meta as Prisma.InputJsonValue | undefined,
    },
  });

  return wallet;
}
