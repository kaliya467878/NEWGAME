import { prisma } from "@/lib/prisma";

export async function getDirectTeamStats(userId: string) {
  const referredUsers = await prisma.user.findMany({
    where: { referredById: userId },
    select: { id: true, displayName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const ids = referredUsers.map((u) => u.id);

  if (ids.length === 0) {
    return { totalRegistrations: 0, firstDeposits: 0, depositCount: 0, depositAmount: 0, members: [] };
  }

  const approvedDeposits = await prisma.depositRequest.findMany({
    where: { userId: { in: ids }, status: "APPROVED" },
    select: { userId: true, amount: true },
  });

  const depositCount = approvedDeposits.length;
  const depositAmount = approvedDeposits.reduce((sum, d) => sum + d.amount, 0);
  const firstDeposits = new Set(approvedDeposits.map((d) => d.userId)).size;

  return {
    totalRegistrations: ids.length,
    firstDeposits,
    depositCount,
    depositAmount,
    members: referredUsers,
  };
}

export async function getTeamNetworkStats(userId: string) {
  const downline = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE downline AS (
      SELECT id FROM "User" WHERE "referredById" = ${userId}
      UNION ALL
      SELECT u.id FROM "User" u JOIN downline d ON u."referredById" = d.id
    )
    SELECT id FROM downline
  `;

  const ids = downline.map((row) => row.id);
  if (ids.length === 0) {
    return { totalMembers: 0, depositCount: 0, depositAmount: 0, totalBets: 0 };
  }

  const [approvedDeposits, betCount] = await Promise.all([
    prisma.depositRequest.findMany({ where: { userId: { in: ids }, status: "APPROVED" }, select: { amount: true } }),
    prisma.wingoBet.count({ where: { userId: { in: ids } } }),
  ]);

  return {
    totalMembers: ids.length,
    depositCount: approvedDeposits.length,
    depositAmount: approvedDeposits.reduce((sum, d) => sum + d.amount, 0),
    totalBets: betCount,
  };
}
