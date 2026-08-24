import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

const userSelect = { select: { displayName: true, phone: true } };

export async function getWalletReviewStats() {
  const midnight = startOfDay(new Date());

  const [
    pendingDeposits,
    pendingWithdraws,
    approvedDepositsToday,
    rejectedDepositsToday,
    approvedWithdrawsToday,
    rejectedWithdrawsToday,
    depositVolumeToday,
    withdrawVolumeToday,
    realDepositSum,
    realWithdrawSum,
  ] = await Promise.all([
    prisma.depositRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawRequest.count({ where: { status: "PENDING" } }),
    prisma.depositRequest.count({ where: { status: "APPROVED", reviewedAt: { gte: midnight } } }),
    prisma.depositRequest.count({ where: { status: "REJECTED", reviewedAt: { gte: midnight } } }),
    prisma.withdrawRequest.count({ where: { status: "APPROVED", reviewedAt: { gte: midnight } } }),
    prisma.withdrawRequest.count({ where: { status: "REJECTED", reviewedAt: { gte: midnight } } }),
    prisma.depositRequest.aggregate({ where: { status: "APPROVED", reviewedAt: { gte: midnight } }, _sum: { amount: true } }),
    prisma.withdrawRequest.aggregate({ where: { status: "APPROVED", reviewedAt: { gte: midnight } }, _sum: { amount: true } }),
    prisma.depositRequest.aggregate({ where: { status: "APPROVED", isMock: false }, _sum: { amount: true } }),
    prisma.withdrawRequest.aggregate({ where: { status: "APPROVED", isMock: false }, _sum: { amount: true } }),
  ]);

  const realDepositsTotal = realDepositSum._sum.amount ?? 0;
  const realWithdrawalsTotal = realWithdrawSum._sum.amount ?? 0;

  return {
    pendingDeposits,
    pendingWithdraws,
    approvedDepositsToday,
    rejectedDepositsToday,
    approvedWithdrawsToday,
    rejectedWithdrawsToday,
    depositVolumeToday: depositVolumeToday._sum.amount ?? 0,
    withdrawVolumeToday: withdrawVolumeToday._sum.amount ?? 0,
    realDepositsTotal,
    realWithdrawalsTotal,
    realProfits: realDepositsTotal - realWithdrawalsTotal,
  };
}

export type WalletHistoryRow = {
  id: string;
  userId: string;
  amount: number;
  status: string;
  isMock: boolean;
  createdAt: Date;
  reviewedAt: Date | null;
  user: {
    id: string;
    uid?: number;
    displayName: string;
    phone: string;
    wallet?: { balance: number } | null;
  };
  reviewedBy: { displayName: string } | null;
  note?: string | null;
  userStats?: {
    balance: number;
    totalBets: number;
    totalRecharge: number;
    totalReferralReward: number;
  };
};

export async function getWalletHistory(
  kind: "deposit" | "withdraw",
  opts: { q?: string; take?: number; createdAt?: { gte: Date; lte: Date } } = {}
): Promise<WalletHistoryRow[]> {
  const { q, take = 30, createdAt } = opts;
  const where = {
    status: { in: ["APPROVED" as const, "REJECTED" as const] },
    ...(createdAt ? { createdAt } : {}),
    ...(q
      ? { user: { OR: [{ phone: { contains: q } }, { displayName: { contains: q, mode: "insensitive" as const } }] } }
      : {}),
  };

  if (kind === "deposit") {
    const rows = await prisma.depositRequest.findMany({
      where, orderBy: { reviewedAt: "desc" }, take,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            phone: true,
          },
        },
        reviewedBy: { select: { displayName: true } },
      },
    });
    return rows as any[];
  }

  const rows = await prisma.withdrawRequest.findMany({
    where, orderBy: { reviewedAt: "desc" }, take,
    include: {
      user: {
        select: {
          id: true,
          uid: true,
          displayName: true,
          phone: true,
          wallet: { select: { balance: true } },
        },
      },
      reviewedBy: { select: { displayName: true } },
    },
  });

  const rowsWithStats = await Promise.all(
    rows.map(async (w) => {
      const [betsAgg, depositsAgg, rewardsAgg] = await Promise.all([
        prisma.ledgerEntry.aggregate({
          where: { wallet: { userId: w.userId }, type: "BET_PLACED" },
          _sum: { amount: true },
        }),
        prisma.depositRequest.aggregate({
          where: { userId: w.userId, status: "APPROVED" },
          _sum: { amount: true },
        }),
        prisma.ledgerEntry.aggregate({
          where: { wallet: { userId: w.userId }, type: "REWARD_CLAIMED" },
          _sum: { amount: true },
        }),
      ]);

      return {
        ...w,
        userStats: {
          balance: w.user.wallet?.balance ?? 0,
          totalBets: Math.abs(betsAgg._sum.amount ?? 0),
          totalRecharge: depositsAgg._sum.amount ?? 0,
          totalReferralReward: rewardsAgg._sum.amount ?? 0,
        },
      };
    })
  );

  return rowsWithStats as any[];
}
