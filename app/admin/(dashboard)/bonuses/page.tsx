import { requirePermission } from "@/lib/admin/permissions";
import { getBonusSettings } from "@/lib/settings/bonuses";
import { ACHIEVEMENTS } from "@/lib/rewards/achievements";
import { BonusSettingsForm } from "./BonusSettingsForm";

export default async function BonusesAdminPage() {
  await requirePermission("bonuses.manage");
  const settings = await getBonusSettings();

  const achievements = ACHIEVEMENTS.map((a) => ({
    key: a.key,
    label: a.label,
    amount: settings.achievements[a.key] ?? a.amount,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Bonuses &amp; rewards</h1>
        <p className="text-sm text-muted mt-1">
          Signup bonus, daily reward, referral reward, achievement payouts, and the deposit bonus percentage —
          all applied live, no redeploy needed.
        </p>
      </div>

      <section className="card-surface rounded-2xl p-6">
        <BonusSettingsForm
          signupBonus={settings.signupBonus}
          dailyReward={settings.dailyReward}
          referralReward={settings.referralReward}
          depositBonusPercent={settings.depositBonusPercent}
          achievements={achievements}
        />
      </section>
    </div>
  );
}
