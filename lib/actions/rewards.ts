"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/auth";
import { creditWallet } from "@/lib/wallet/credit";
import { ACHIEVEMENTS } from "@/lib/rewards/achievements";
import { todayRewardKey } from "@/lib/rewards/queries";
import { getBonusSettings } from "@/lib/settings/bonuses";
import { createNotification } from "@/lib/notifications";
import { logActivity } from "@/lib/admin/activity";
import { formatAmount } from "@/lib/format";

function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
}

export async function claimDailyRewardAction(): Promise<ActionState> {
  const user = await requireUser();
  const { dailyReward } = await getBonusSettings();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.reward.create({
        data: {
          userId: user.id,
          type: "DAILY",
          key: todayRewardKey(),
          amount: dailyReward,
          status: "CLAIMED",
          claimedAt: new Date(),
        },
      });
      await creditWallet(tx, user.id, dailyReward, "REWARD_CLAIMED", { rewardType: "DAILY" });
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "You've already claimed today's reward." };
    throw err;
  }

  revalidatePath("/rewards");
  return { success: `Claimed ${formatAmount(dailyReward)}!` };
}

export async function claimAchievementAction(key: string): Promise<ActionState> {
  const user = await requireUser();

  const def = ACHIEVEMENTS.find((a) => a.key === key);
  if (!def) return { error: "Unknown achievement" };

  const [betCount, referralCount, approvedDepositCount, bonusSettings] = await Promise.all([
    prisma.wingoBet.count({ where: { userId: user.id } }),
    prisma.user.count({ where: { referredById: user.id } }),
    prisma.depositRequest.count({ where: { userId: user.id, status: "APPROVED" } }),
    getBonusSettings(),
  ]);

  if (!def.isUnlocked({ betCount, referralCount, approvedDepositCount })) {
    return { error: "This achievement isn't unlocked yet." };
  }

  const amount = bonusSettings.achievements[def.key] ?? def.amount;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.reward.create({
        data: {
          userId: user.id,
          type: "ACHIEVEMENT",
          key: def.key,
          amount,
          status: "CLAIMED",
          claimedAt: new Date(),
        },
      });
      await creditWallet(tx, user.id, amount, "REWARD_CLAIMED", { rewardType: "ACHIEVEMENT", key: def.key });
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "Already claimed." };
    throw err;
  }

  revalidatePath("/rewards");
  return { success: `Claimed ${formatAmount(amount)} for "${def.label}"!` };
}

export async function claimRewardAction(rewardId: string): Promise<ActionState> {
  const user = await requireUser();

  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  if (!reward || reward.userId !== user.id || reward.status !== "AVAILABLE") {
    return { error: "This reward is not available." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.reward.update({
      where: { id: rewardId },
      data: { status: "CLAIMED", claimedAt: new Date() },
    });
    await creditWallet(tx, user.id, reward.amount, "REWARD_CLAIMED", { rewardType: reward.type, rewardId });
    if (reward.type === "REFERRAL") {
      await tx.user.update({
        where: { id: user.id },
        data: { requiredWager: { increment: reward.amount } },
      });
    }
  });

  revalidatePath("/rewards");
  return { success: `Claimed ${formatAmount(reward.amount)}!` };
}

const giftCodeSchema = z.object({
  code: z.string().trim().min(1, "Enter a gift code").toUpperCase(),
});

export async function redeemGiftCodeAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = giftCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid code" };

  const giftCode = await prisma.giftCode.findUnique({ where: { code: parsed.data.code } });
  if (!giftCode || !giftCode.isActive) return { error: "Invalid or inactive gift code" };
  if (giftCode.expiresAt && giftCode.expiresAt < new Date()) return { error: "This gift code has expired" };
  if (giftCode.redeemedCount >= giftCode.maxRedemptions) return { error: "This gift code has been fully redeemed" };

  const alreadyRedeemed = await prisma.giftCodeRedemption.findUnique({
    where: { giftCodeId_userId: { giftCodeId: giftCode.id, userId: user.id } },
  });
  if (alreadyRedeemed) return { error: "You've already redeemed this gift code" };

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.giftCode.updateMany({
        where: { id: giftCode.id, redeemedCount: { lt: giftCode.maxRedemptions } },
        data: { redeemedCount: { increment: 1 } },
      });
      if (updated.count === 0) throw new Error("GIFT_CODE_EXHAUSTED");

      await tx.giftCodeRedemption.create({
        data: { giftCodeId: giftCode.id, userId: user.id, amount: giftCode.amount },
      });

      await creditWallet(tx, user.id, giftCode.amount, "GIFT_CODE_REDEEMED", { giftCodeId: giftCode.id });
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "You've already redeemed this gift code" };
    if (err instanceof Error && err.message === "GIFT_CODE_EXHAUSTED") {
      return { error: "This gift code has been fully redeemed" };
    }
    throw err;
  }

  await createNotification(
    user.id,
    "GIFT_CODE_REDEEMED",
    "Gift code redeemed",
    `You redeemed ${formatAmount(giftCode.amount)} with code ${giftCode.code}.`,
    { giftCodeId: giftCode.id }
  );
  await logActivity("GIFT_CODE_REDEEMED", `${user.displayName} redeemed gift code ${giftCode.code} (${formatAmount(giftCode.amount)})`, user.id);

  revalidatePath("/rewards");
  revalidatePath("/dashboard");
  return { success: `Redeemed ${formatAmount(giftCode.amount)}!` };
}
