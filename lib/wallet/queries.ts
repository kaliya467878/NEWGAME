import { prisma } from "@/lib/prisma";

export async function getWalletSummary(userId: string) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      ledgerEntries: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  const [pendingDeposits, pendingWithdraws, totalsByType] = await Promise.all([
    prisma.depositRequest.findMany({ where: { userId, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    prisma.withdrawRequest.findMany({ where: { userId, status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    wallet
      ? prisma.ledgerEntry.groupBy({ by: ["type"], where: { walletId: wallet.id }, _sum: { amount: true } })
      : Promise.resolve([]),
  ]);

  const sumFor = (...types: string[]) =>
    totalsByType.filter((t) => types.includes(t.type)).reduce((s, t) => s + (t._sum.amount ?? 0), 0);

  return {
    balance: wallet?.balance ?? 0,
    ledgerEntries: wallet?.ledgerEntries ?? [],
    pendingDeposits,
    pendingWithdraws,
    totalDeposited: sumFor("DEPOSIT_APPROVED"),
    totalWithdrawn: Math.abs(sumFor("WITHDRAW_APPROVED")),
    totalBonus: sumFor("WELCOME_BONUS", "REWARD_CLAIMED", "GIFT_CODE_REDEEMED"),
    totalWinnings: sumFor("BET_WON"),
  };
}
