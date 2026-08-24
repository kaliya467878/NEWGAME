import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getBonusSettings } from "@/lib/settings/bonuses";

/**
 * A referral only pays out once the referred user has BOTH had a deposit
 * approved AND placed a bet — this is the "qualified bet" rule from the
 * spec, tightened to deter people farming referral rewards with just the
 * free welcome coins. Called after either event, since either could be the
 * one that completes qualification. Idempotent via the Reward.key unique
 * constraint, so calling it twice for the same referral is harmless.
 */
export async function checkAndAwardReferralReward(referredUserId: string, depositAmount?: number, depositId?: string) {
  const referredUser = await prisma.user.findUnique({ where: { id: referredUserId } });
  if (!referredUser?.referredById) return;

  // 1. Process Automatic Deposit Brackets Reward (Tier 1 Only)
  if (depositAmount && depositId) {
    let rewardAmount = 0;
    if (depositAmount >= 10200) {
      rewardAmount = 2040;
    } else if (depositAmount >= 5100) {
      rewardAmount = 510;
    } else if (depositAmount >= 2040) {
      rewardAmount = 306;
    } else if (depositAmount >= 1020) {
      rewardAmount = 204;
    } else if (depositAmount >= 510) {
      rewardAmount = 102;
    }

    if (rewardAmount > 0) {
      const key = `referral-deposit:${depositId}`;
      try {
        await prisma.$transaction(async (tx) => {
          await tx.reward.create({
            data: {
              userId: referredUser.referredById!,
              type: "REFERRAL",
              key,
              amount: rewardAmount,
              status: "CLAIMED",
              meta: { referredUserId, referredDisplayName: referredUser.displayName, depositId, depositAmount },
              claimedAt: new Date(),
            },
          });

          const inviterWallet = await tx.wallet.update({
            where: { userId: referredUser.referredById! },
            data: { balance: { increment: rewardAmount } },
          });

          await tx.user.update({
            where: { id: referredUser.referredById! },
            data: { requiredWager: { increment: rewardAmount } }
          });

          await tx.ledgerEntry.create({
            data: {
              walletId: inviterWallet.id,
              type: "REWARD_CLAIMED",
              amount: rewardAmount,
              balanceAfter: inviterWallet.balance,
              meta: { referredUserId, depositId, depositAmount },
            },
          });
        });

        await createNotification(
          referredUser.referredById,
          "REWARD_AVAILABLE",
          "Referral reward credited",
          `You have received a ₹${rewardAmount} automatic referral bonus because ${referredUser.displayName} deposited ₹${depositAmount}!`,
          { referredUserId }
        );
      } catch (err: unknown) {
        const isUniqueViolation =
          typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
        if (!isUniqueViolation) {
          console.error("Failed to credit referral deposit bonus:", err);
        }
      }
    }
  }

  // 2. Original Bet Qualification Reward
  const key = `referral:${referredUserId}`;
  const existingReward = await prisma.reward.findFirst({
    where: { key },
    select: { id: true }
  });
  if (existingReward) return;

  const [approvedDepositCount, wingoBetCount, k3BetCount, fiveDBetCount] = await Promise.all([
    prisma.depositRequest.count({ where: { userId: referredUserId, status: "APPROVED" } }),
    prisma.wingoBet.count({ where: { userId: referredUserId } }),
    prisma.k3Bet.count({ where: { userId: referredUserId } }),
    prisma.fiveDBet.count({ where: { userId: referredUserId } }),
  ]);
  const betCount = wingoBetCount + k3BetCount + fiveDBetCount;

  if (approvedDepositCount === 0 || betCount === 0) return;

  const { referralReward } = await getBonusSettings();

  try {
    await prisma.reward.create({
      data: {
        userId: referredUser.referredById,
        type: "REFERRAL",
        key,
        amount: referralReward,
        meta: { referredUserId, referredDisplayName: referredUser.displayName },
      },
    });

    await createNotification(
      referredUser.referredById,
      "REWARD_AVAILABLE",
      "Referral reward available",
      `${referredUser.displayName} is now a qualified referral. Claim your reward in the Rewards Center.`,
      { referredUserId }
    );
  } catch (err: unknown) {
    const isUniqueViolation =
      typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002";
    if (isUniqueViolation) return; // already awarded
    throw err;
  }
}
