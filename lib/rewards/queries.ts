import { prisma } from "@/lib/prisma";
import { getBonusSettings } from "@/lib/settings/bonuses";
import { ACHIEVEMENTS } from "./achievements";

export function todayRewardKey(date: Date = new Date()) {
  return `daily:${date.toISOString().slice(0, 10)}`;
}

export async function getRewardsCenterData(userId: string) {
  const [
    betCount,
    referralCount,
    approvedDepositCount,
    achievementRewards,
    availableReferralRewards,
    availableEventRewards,
    dailyClaimedToday,
    bonusSettings,
  ] = await Promise.all([
    prisma.wingoBet.count({ where: { userId } }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.depositRequest.count({ where: { userId, status: "APPROVED" } }),
    prisma.reward.findMany({ where: { userId, type: "ACHIEVEMENT" } }),
    prisma.reward.findMany({ where: { userId, type: "REFERRAL", status: "AVAILABLE" }, orderBy: { createdAt: "desc" } }),
    prisma.reward.findMany({ where: { userId, type: "EVENT", status: "AVAILABLE" }, orderBy: { createdAt: "desc" } }),
    prisma.reward.findUnique({ where: { userId_key: { userId, key: todayRewardKey() } } }),
    getBonusSettings(),
  ]);

  const claimedAchievementKeys = new Set(achievementRewards.map((r) => r.key));
  const stats = { betCount, referralCount, approvedDepositCount };

  const achievements = ACHIEVEMENTS.map((a) => ({
    key: a.key,
    label: a.label,
    description: a.description,
    amount: bonusSettings.achievements[a.key] ?? a.amount,
    unlocked: a.isUnlocked(stats),
    claimed: claimedAchievementKeys.has(a.key),
  }));

  return {
    daily: { amount: bonusSettings.dailyReward, claimedToday: Boolean(dailyClaimedToday) },
    referralRewards: availableReferralRewards,
    eventRewards: availableEventRewards,
    achievements,
  };
}

/** Lightweight count for the header's Daily Bonus badge — claimable rewards right now. */
export async function getAvailableRewardsCount(userId: string): Promise<number> {
  const [referralCount, eventCount, dailyClaimedToday] = await Promise.all([
    prisma.reward.count({ where: { userId, type: "REFERRAL", status: "AVAILABLE" } }),
    prisma.reward.count({ where: { userId, type: "EVENT", status: "AVAILABLE" } }),
    prisma.reward.findUnique({ where: { userId_key: { userId, key: todayRewardKey() } } }),
  ]);
  return referralCount + eventCount + (dailyClaimedToday ? 0 : 1);
}
