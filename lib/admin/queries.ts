import { prisma } from "@/lib/prisma";

export async function getAdminDashboardStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [userCount, betsToday, pendingDeposits, pendingWithdraws] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.wingoBet.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.depositRequest.count({ where: { status: "PENDING" } }),
    prisma.withdrawRequest.count({ where: { status: "PENDING" } }),
  ]);

  return { userCount, betsToday, pendingDeposits, pendingWithdraws };
}

export async function getPendingWalletRequests(sort: "asc" | "desc" = "desc", q: string = "") {
  const where: any = { status: "PENDING" };
  if (q) {
    const isNumeric = /^\d+$/.test(q);
    where.user = {
      OR: [
        { phone: { contains: q } },
        { displayName: { contains: q, mode: "insensitive" } },
        ...(isNumeric ? [{ uid: Number(q) }] : []),
      ],
    };
  }

  const [deposits, withdraws] = await Promise.all([
    prisma.depositRequest.findMany({
      where,
      include: { user: { select: { displayName: true, phone: true, uid: true } } },
      orderBy: { createdAt: sort },
    }),
    prisma.withdrawRequest.findMany({
      where,
      include: {
        user: {
          select: {
            displayName: true,
            phone: true,
            uid: true,
            wallet: { select: { balance: true } },
          },
        },
      },
      orderBy: { createdAt: sort },
    }),
  ]);

  const withdrawsWithUserStats = await Promise.all(
    withdraws.map(async (w) => {
      const [betsAgg, depositsAgg, rewardsAgg] = await Promise.all([
        prisma.ledgerEntry.aggregate({
          where: {
            wallet: { userId: w.userId },
            type: "BET_PLACED",
          },
          _sum: { amount: true },
        }),
        prisma.depositRequest.aggregate({
          where: {
            userId: w.userId,
            status: "APPROVED",
          },
          _sum: { amount: true },
        }),
        prisma.ledgerEntry.aggregate({
          where: {
            wallet: { userId: w.userId },
            type: "REWARD_CLAIMED",
          },
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

  return { deposits, withdraws: withdrawsWithUserStats };
}

export async function getResultControlData() {
  const [setting, winPct, brahmastra, overrides] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "resultMode" } }),
    prisma.setting.findUnique({ where: { key: "winningPercentage" } }),
    prisma.setting.findUnique({ where: { key: "brahmastraProfits" } }),
    prisma.resultOverride.findMany({
      include: { createdBy: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { 
    resultMode: setting?.value ?? "RANDOM", 
    winningPercentage: winPct ? Number(winPct.value) : 30,
    brahmastraProfits: brahmastra?.value === "true",
    overrides 
  };
}

export async function getPasswordResetRequests() {
  return prisma.passwordResetRequest.findMany({
    orderBy: { requestedAt: "desc" },
    take: 50,
  });
}

export async function getGiftCodes() {
  return prisma.giftCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getStaffAccounts() {
  return prisma.user.findMany({
    where: { role: "STAFF" },
    select: {
      id: true,
      phone: true,
      email: true,
      displayName: true,
      createdAt: true,
      staffPermissions: { select: { key: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getActivityFeed(take = 50) {
  return prisma.activityFeed.findMany({ orderBy: { createdAt: "desc" }, take });
}

export async function getAuditLogs(filters: { action?: string; actorId?: string }, take = 100) {
  return prisma.auditLog.findMany({
    where: {
      ...(filters.action ? { action: { contains: filters.action, mode: "insensitive" } } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
    },
    include: { actor: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getFinancialReports(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (days + 2));

  const [deposits, withdraws] = await Promise.all([
    prisma.depositRequest.findMany({
      where: { createdAt: { gte: cutoffDate } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.withdrawRequest.findMany({
      where: { createdAt: { gte: cutoffDate } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const getIstDateString = (date: Date) => {
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  };

  const todayIstStr = getIstDateString(new Date());

  const today = {
    deposits: { pendingCount: 0, pendingSum: 0, approvedCount: 0, approvedSum: 0, rejectedCount: 0, rejectedSum: 0, totalCount: 0, totalSum: 0 },
    withdraws: { pendingCount: 0, pendingSum: 0, approvedCount: 0, approvedSum: 0, rejectedCount: 0, rejectedSum: 0, totalCount: 0, totalSum: 0 },
    sunpayPayin: { totalCount: 0, totalSum: 0, successCount: 0, successSum: 0 },
    sunpayPayout: { totalCount: 0, totalSum: 0, successCount: 0, successSum: 0, failedCount: 0, failedSum: 0, processingCount: 0, processingSum: 0 },
  };

  const dailyMap: Record<string, {
    date: string;
    approvedDepositsCount: number;
    approvedDepositsSum: number;
    approvedWithdrawalsCount: number;
    approvedWithdrawalsSum: number;
    sunpaySuccessPayinsCount: number;
    sunpaySuccessPayinsSum: number;
    sunpaySuccessPayoutsCount: number;
    sunpaySuccessPayoutsSum: number;
    rejectedDepositsCount: number;
    rejectedDepositsSum: number;
    rejectedWithdrawalsCount: number;
    rejectedWithdrawalsSum: number;
  }> = {};

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getIstDateString(d);
    dailyMap[dateStr] = {
      date: dateStr,
      approvedDepositsCount: 0,
      approvedDepositsSum: 0,
      approvedWithdrawalsCount: 0,
      approvedWithdrawalsSum: 0,
      sunpaySuccessPayinsCount: 0,
      sunpaySuccessPayinsSum: 0,
      sunpaySuccessPayoutsCount: 0,
      sunpaySuccessPayoutsSum: 0,
      rejectedDepositsCount: 0,
      rejectedDepositsSum: 0,
      rejectedWithdrawalsCount: 0,
      rejectedWithdrawalsSum: 0,
    };
  }

  for (const d of deposits) {
    const istDate = getIstDateString(d.createdAt);
    const noteStr = d.note || "";
    const isSunpay = (d.channelKey && d.channelKey.toLowerCase().includes("sunpay")) || noteStr.includes('"gateway":"sunpays"');

    if (dailyMap[istDate]) {
      const entry = dailyMap[istDate];
      if (d.status === "APPROVED") {
        entry.approvedDepositsCount++;
        entry.approvedDepositsSum += d.amount;
        if (isSunpay) {
          entry.sunpaySuccessPayinsCount++;
          entry.sunpaySuccessPayinsSum += d.amount;
        }
      } else if (d.status === "REJECTED") {
        entry.rejectedDepositsCount++;
        entry.rejectedDepositsSum += d.amount;
      }
    }

    if (istDate === todayIstStr) {
      today.deposits.totalCount++;
      today.deposits.totalSum += d.amount;

      if (d.status === "APPROVED") {
        today.deposits.approvedCount++;
        today.deposits.approvedSum += d.amount;
      } else if (d.status === "PENDING") {
        today.deposits.pendingCount++;
        today.deposits.pendingSum += d.amount;
      } else if (d.status === "REJECTED") {
        today.deposits.rejectedCount++;
        today.deposits.rejectedSum += d.amount;
      }

      if (isSunpay) {
        today.sunpayPayin.totalCount++;
        today.sunpayPayin.totalSum += d.amount;
        if (d.status === "APPROVED") {
          today.sunpayPayin.successCount++;
          today.sunpayPayin.successSum += d.amount;
        }
      }
    }
  }

  for (const w of withdraws) {
    const istDate = getIstDateString(w.createdAt);
    const noteStr = w.note || "";
    const isSunpay = noteStr.includes('"gateway":"sunpays"');
    const isSunpaySuccess = isSunpay && noteStr.includes('"gatewayStatus":"success"');
    const isSunpayFailed = isSunpay && noteStr.includes('"gatewayStatus":"failed"');
    const isSunpayProcessing = isSunpay && noteStr.includes('"gatewayStatus":"processing"');

    if (dailyMap[istDate]) {
      const entry = dailyMap[istDate];
      if (w.status === "APPROVED") {
        entry.approvedWithdrawalsCount++;
        entry.approvedWithdrawalsSum += w.amount;
        if (isSunpaySuccess) {
          entry.sunpaySuccessPayoutsCount++;
          entry.sunpaySuccessPayoutsSum += w.amount;
        }
      } else if (w.status === "REJECTED") {
        entry.rejectedWithdrawalsCount++;
        entry.rejectedWithdrawalsSum += w.amount;
      }
    }

    if (istDate === todayIstStr) {
      today.withdraws.totalCount++;
      today.withdraws.totalSum += w.amount;

      if (w.status === "APPROVED") {
        today.withdraws.approvedCount++;
        today.withdraws.approvedSum += w.amount;
      } else if (w.status === "PENDING") {
        today.withdraws.pendingCount++;
        today.withdraws.pendingSum += w.amount;
      } else if (w.status === "REJECTED") {
        today.withdraws.rejectedCount++;
        today.withdraws.rejectedSum += w.amount;
      }

      if (isSunpay) {
        today.sunpayPayout.totalCount++;
        today.sunpayPayout.totalSum += w.amount;
        if (isSunpaySuccess) {
          today.sunpayPayout.successCount++;
          today.sunpayPayout.successSum += w.amount;
        } else if (isSunpayFailed) {
          today.sunpayPayout.failedCount++;
          today.sunpayPayout.failedSum += w.amount;
        } else if (isSunpayProcessing) {
          today.sunpayPayout.processingCount++;
          today.sunpayPayout.processingSum += w.amount;
        }
      }
    }
  }

  const dailyStats = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

  return {
    today,
    dailyStats,
  };
}
