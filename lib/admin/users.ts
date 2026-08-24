import { prisma } from "@/lib/prisma";

export async function searchUsers(q: string, take = 50) {
  const trimmed = q.trim();
  const uidMatch = /^\d+$/.test(trimmed) ? Number(trimmed) : null;

  return prisma.user.findMany({
    where: {
      role: "USER",
      ...(trimmed
        ? {
            OR: [
              { phone: { contains: trimmed } },
              { displayName: { contains: trimmed, mode: "insensitive" as const } },
              { referralCode: { contains: trimmed, mode: "insensitive" as const } },
              ...(uidMatch !== null ? [{ uid: uidMatch }] : []),
            ],
          }
        : {}),
    },
    select: {
      id: true,
      uid: true,
      displayName: true,
      phone: true,
      email: true,
      isGuest: true,
      status: true,
      createdAt: true,
      referralCode: true,
      adminNote: true,
      wallet: { select: { balance: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getUserDetail(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      wallet: true,
      referredBy: { select: { id: true, displayName: true, referralCode: true } },
      withdrawalAccounts: true,
      _count: { select: { referrals: true } },
    },
  });
  if (!user) return null;

  const [deposits, withdraws, wingoBets, k3Bets, fiveDBets, ledger, referrals] = await Promise.all([
    prisma.depositRequest.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.withdrawRequest.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.wingoBet.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.k3Bet.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.fiveDBet.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.ledgerEntry.findMany({
      where: { wallet: { userId: id } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      where: { referredById: id },
      select: {
        id: true,
        uid: true,
        displayName: true,
        phone: true,
        createdAt: true,
        wallet: { select: { balance: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const bets = [
    ...wingoBets.map((b) => ({ ...b, game: "Wingo", detail: b.betType === "NUMBER" ? `Number ${b.selection}` : b.selection })),
    ...k3Bets.map((b) => ({
      ...b,
      game: "K3",
      detail: b.betType === "SUM_VALUE" ? `Total ${b.selection}` : b.betType === "ANY_TRIPLE" ? "Any triple" : b.selection,
    })),
    ...fiveDBets.map((b) => ({
      ...b,
      game: "5D",
      detail: b.betType === "POSITION_NUMBER" ? `Pos ${b.selection.replace(":", " = ")}` : b.selection,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { user, deposits, withdraws, bets, ledger, referrals };
}

export async function getUserStats() {
  const [total, guests, suspended, newToday] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", isGuest: true } }),
    prisma.user.count({ where: { role: "USER", status: "SUSPENDED" } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);
  return { total, guests, suspended, newToday };
}
