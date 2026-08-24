import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

function maskMobile(phone: string): string {
  const digits = String(phone || "");
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 2)}${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-2)}`;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // Expects YYYY-MM-DD

    let dateFilter: Record<string, unknown> = {};
    if (dateStr && dateStr !== "all") {
      const startOfDay = new Date(`${dateStr}T00:00:00+05:30`);
      const endOfDay = new Date(`${dateStr}T23:59:59+05:30`);
      dateFilter = {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      };
    }

    const [referredBy, agent, referralRewards, walletEarningsAgg, pendingCount] = await Promise.all([
      user.referredById
        ? prisma.user.findUnique({
            where: { id: user.referredById },
            select: { displayName: true, referralCode: true },
          })
        : Promise.resolve(null),
      prisma.agent.findUnique({
        where: { linkedUserId: user.id },
      }),
      prisma.reward.findMany({
        where: { userId: user.id, type: "REFERRAL", ...dateFilter },
      }),
      prisma.reward.aggregate({
        where: { userId: user.id, type: "REFERRAL", status: "CLAIMED" },
        _sum: { amount: true },
      }),
      prisma.reward.count({
        where: { userId: user.id, type: "REFERRAL", status: "AVAILABLE" },
      }),
    ]);

    // Recursively fetch referred users down to Tier 6
    interface ReferralUser {
      id: string;
      displayName: string;
      phone: string;
      createdAt: Date;
      referredById: string | null;
      tier: number;
      uid: number;
    }

    const allReferralsList: ReferralUser[] = [];
    let currentLevelUserIds: string[] = [user.id];

    for (let tier = 1; tier <= 6; tier++) {
      if (currentLevelUserIds.length === 0) break;
      const levelUsers = await prisma.user.findMany({
        where: { referredById: { in: currentLevelUserIds } },
        select: { id: true, displayName: true, phone: true, createdAt: true, referredById: true, uid: true },
      });
      if (levelUsers.length === 0) break;

      allReferralsList.push(...levelUsers.map((lu) => ({ ...lu, tier })));
      currentLevelUserIds = levelUsers.map((lu) => lu.id);
      
      if (allReferralsList.length >= 1000) break; // Safe ceiling
    }

    // Sort: lower tiers first, and within same tier sort by date descending
    allReferralsList.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const totalReferrals = allReferralsList.length;
    const downlineUserIds = allReferralsList.map((ru) => ru.id);

    // Fetch approved deposits for downline on that date
    const deposits = await prisma.depositRequest.findMany({
      where: {
        userId: { in: downlineUserIds },
        status: "APPROVED",
        ...dateFilter
      },
      select: { userId: true, amount: true, createdAt: true },
    });

    // Group deposits by user
    const depositsByUser = new Map<string, typeof deposits>();
    for (const d of deposits) {
      if (!depositsByUser.has(d.userId)) {
        depositsByUser.set(d.userId, []);
      }
      depositsByUser.get(d.userId)!.push(d);
    }

    // Fetch earliest approved deposit for all downline users (lifetime, to verify first deposits)
    const allApprovedDeposits = await prisma.depositRequest.findMany({
      where: {
        userId: { in: downlineUserIds },
        status: "APPROVED"
      },
      orderBy: { createdAt: "asc" },
      select: { userId: true, amount: true, createdAt: true }
    });

    const firstDepositByUser = new Map<string, typeof allApprovedDeposits[0]>();
    for (const d of allApprovedDeposits) {
      if (!firstDepositByUser.has(d.userId)) {
        firstDepositByUser.set(d.userId, d);
      }
    }

    // Fetch bets for downline (wingo, k3, fived, limbo, dice, mines, wheel)
    const [wingoBets, k3Bets, fivedBets, limboBets, diceBets, minesGames, wheelSpins] = await Promise.all([
      prisma.wingoBet.findMany({ where: { userId: { in: downlineUserIds }, ...dateFilter }, select: { userId: true, amount: true } }),
      prisma.k3Bet.findMany({ where: { userId: { in: downlineUserIds }, ...dateFilter }, select: { userId: true, amount: true } }),
      prisma.fiveDBet.findMany({ where: { userId: { in: downlineUserIds }, ...dateFilter }, select: { userId: true, amount: true } }),
      prisma.limboBet.findMany({ where: { userId: { in: downlineUserIds }, ...dateFilter }, select: { userId: true, amount: true } }),
      prisma.diceBet.findMany({ where: { userId: { in: downlineUserIds }, ...dateFilter }, select: { userId: true, amount: true } }),
      prisma.minesGame.findMany({ where: { userId: { in: downlineUserIds }, ...dateFilter }, select: { userId: true, amount: true } }),
      prisma.wheelSpin.findMany({ where: { userId: { in: downlineUserIds }, ...dateFilter }, select: { userId: true, amount: true } }),
    ]);

    // Sum bets by user
    const betSumByUser = new Map<string, number>();
    const addBets = (bets: { userId: string; amount: number }[]) => {
      for (const b of bets) {
        betSumByUser.set(b.userId, (betSumByUser.get(b.userId) || 0) + b.amount);
      }
    };
    addBets(wingoBets);
    addBets(k3Bets);
    addBets(fivedBets);
    addBets(limboBets);
    addBets(diceBets);
    addBets(minesGames);
    addBets(wheelSpins);

    // Sum commission (referral rewards) by user
    const commissionByUser = new Map<string, number>();
    for (const r of referralRewards) {
      const referredId = (r.meta as Record<string, unknown> | null)?.referredUserId as string | undefined;
      if (referredId) {
        commissionByUser.set(referredId, (commissionByUser.get(referredId) || 0) + r.amount);
      }
    }

    const selectStart = dateStr && dateStr !== "all" ? new Date(`${dateStr}T00:00:00+05:30`).getTime() : 0;
    const selectEnd = dateStr && dateStr !== "all" ? new Date(`${dateStr}T23:59:59+05:30`).getTime() : Infinity;

    const referrals = allReferralsList.map((ru) => {
      const userDeposits = depositsByUser.get(ru.id) || [];
      const totalDepositAmount = userDeposits.reduce((sum, d) => sum + d.amount, 0);
      const totalDepositNumber = userDeposits.length;

      const firstDep = firstDepositByUser.get(ru.id);
      const firstDepositAmount = (firstDep && firstDep.createdAt.getTime() >= selectStart && firstDep.createdAt.getTime() <= selectEnd)
        ? firstDep.amount
        : 0;

      const totalBetAmount = betSumByUser.get(ru.id) || 0;
      const commission = commissionByUser.get(ru.id) || 0;
      const regDate = ru.createdAt.toISOString().slice(0, 10);

      return {
        id: ru.id,
        uid: ru.uid,
        level: ru.tier,
        displayName: ru.displayName,
        phoneMasked: maskMobile(ru.phone),
        depositAmount: totalDepositAmount,
        depositNumber: totalDepositNumber,
        firstDepositAmount,
        totalBet: totalBetAmount,
        commission,
        time: regDate,
      };
    });

    let agentPayload: unknown = undefined;
    if (agent) {
      const [directPlayers, downlineAgents] = await Promise.all([
        prisma.user.count({ where: { referredById: user.id } }),
        prisma.agent.findMany({ where: { parentId: agent.id }, select: { id: true } }),
      ]);
      agentPayload = {
        status: agent.status.toLowerCase(),
        agentTypeLabel: agent.type.replace(/_/g, " "),
        commissionRate: agent.commissionPct,
        stats: {
          directPlayers,
          totalDownlinePlayers: downlineAgents.length,
          totalCommissionEarned: walletEarningsAgg._sum.amount ?? 0,
        },
        commission: { eventCount: referralRewards.filter((r) => r.status === "CLAIMED").length },
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        inviteCode: user.referralCode,
        referralCode: user.referralCode,
        inviteType: agent ? "agent" : "user",
        summary: {
          totalReferrals,
          walletEarnings: walletEarningsAgg._sum.amount ?? 0,
          pendingBonuses: pendingCount,
        },
        referredBy: referredBy ? { name: referredBy.displayName, referralCode: referredBy.referralCode } : null,
        agent: agentPayload,
        referrals,
      },
    });
  } catch (error) {
    console.error("GET referrals/me API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
