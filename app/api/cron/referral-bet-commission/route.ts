import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    // India is UTC + 5.5 hours
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);

    // Start of today in IST:
    const istTodayStart = new Date(istNow);
    istTodayStart.setUTCHours(0, 0, 0, 0);

    // Yesterday's start and end times in IST represented in UTC
    const startOfYesterday = new Date(istTodayStart.getTime() - 24 * 60 * 60 * 1000 - istOffset);
    const endOfYesterday = new Date(istTodayStart.getTime() - istOffset);

    // 1. Fetch all bets placed yesterday
    const [wingoBets, k3Bets, fivedBets, limboBets, diceBets, minesGames, wheelSpins] = await Promise.all([
      prisma.wingoBet.findMany({
        where: { createdAt: { gte: startOfYesterday, lt: endOfYesterday } },
        select: { userId: true, amount: true }
      }),
      prisma.k3Bet.findMany({
        where: { createdAt: { gte: startOfYesterday, lt: endOfYesterday } },
        select: { userId: true, amount: true }
      }),
      prisma.fiveDBet.findMany({
        where: { createdAt: { gte: startOfYesterday, lt: endOfYesterday } },
        select: { userId: true, amount: true }
      }),
      prisma.limboBet.findMany({
        where: { createdAt: { gte: startOfYesterday, lt: endOfYesterday } },
        select: { userId: true, amount: true }
      }),
      prisma.diceBet.findMany({
        where: { createdAt: { gte: startOfYesterday, lt: endOfYesterday } },
        select: { userId: true, amount: true }
      }),
      prisma.minesGame.findMany({
        where: { createdAt: { gte: startOfYesterday, lt: endOfYesterday } },
        select: { userId: true, amount: true }
      }),
      prisma.wheelSpin.findMany({
        where: { createdAt: { gte: startOfYesterday, lt: endOfYesterday } },
        select: { userId: true, amount: true }
      })
    ]);

    // Sum bets by user
    const betsByUser = new Map<string, number>();
    const addBets = (bets: { userId: string; amount: number }[]) => {
      for (const b of bets) {
        betsByUser.set(b.userId, (betsByUser.get(b.userId) || 0) + b.amount);
      }
    };
    addBets(wingoBets);
    addBets(k3Bets);
    addBets(fivedBets);
    addBets(limboBets);
    addBets(diceBets);
    addBets(minesGames);
    addBets(wheelSpins);

    if (betsByUser.size === 0) {
      return NextResponse.json({ success: true, message: "No bets recorded yesterday.", creditedCount: 0 });
    }

    // 2. Fetch all users who have referred at least one user
    const inviters = await prisma.user.findMany({
      where: { referrals: { some: {} } },
      select: { id: true }
    });

    const rates = [0.01, 0.005, 0.003, 0.002, 0.002, 0.002]; // Tiers 1-6
    let creditedCount = 0;

    for (const inviter of inviters) {
      let totalCommission = 0;
      let currentLevelUserIds = [inviter.id];

      // Crawl Tiers 1 to 6
      for (let tier = 1; tier <= 6; tier++) {
        if (currentLevelUserIds.length === 0) break;
        const levelUsers = await prisma.user.findMany({
          where: { referredById: { in: currentLevelUserIds } },
          select: { id: true }
        });
        if (levelUsers.length === 0) break;

        const rate = rates[tier - 1];
        for (const lu of levelUsers) {
          const userBets = betsByUser.get(lu.id) || 0;
          if (userBets > 0) {
            totalCommission += userBets * rate;
          }
        }
        currentLevelUserIds = levelUsers.map(lu => lu.id);
      }

      const commissionAmount = Math.round(totalCommission);

      if (commissionAmount > 0) {
        const dateStr = startOfYesterday.toISOString().slice(0, 10);
        let wasCredited = false;
        await prisma.$transaction(async (tx) => {
          const wallet = await tx.wallet.findUnique({ where: { userId: inviter.id } });
          if (wallet) {
            // Check if already credited for this date to prevent duplicate execution
            const existing = await tx.ledgerEntry.findFirst({
              where: {
                walletId: wallet.id,
                type: "ADMIN_ADJUST",
                meta: {
                  path: ["date"],
                  equals: dateStr
                }
              }
            });
            if (existing) {
              return;
            }

            const newBalance = wallet.balance + commissionAmount;
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: newBalance }
            });
            await tx.user.update({
              where: { id: inviter.id },
              data: { requiredWager: { increment: commissionAmount } }
            });
            await tx.ledgerEntry.create({
              data: {
                walletId: wallet.id,
                type: "ADMIN_ADJUST",
                amount: commissionAmount,
                balanceAfter: newBalance,
                meta: {
                  description: "Bet Volume Bonus",
                  date: dateStr
                }
              }
            });
            wasCredited = true;
          }
        });
        if (wasCredited) {
          creditedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed bet volume commissions for yesterday (${startOfYesterday.toISOString().slice(0, 10)}).`,
      creditedCount
    });
  } catch (error) {
    console.error("Bet volume commission cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
