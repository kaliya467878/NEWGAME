"use client";

import { useActionState } from "react";
import { saveBonusSettingsAction, type AdminActionState } from "@/lib/actions/admin";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

export type AchievementRow = { key: string; label: string; amount: number };

export function BonusSettingsForm({
  signupBonus,
  dailyReward,
  referralReward,
  depositBonusPercent,
  achievements,
}: {
  signupBonus: number;
  dailyReward: number;
  referralReward: number;
  depositBonusPercent: number;
  achievements: AchievementRow[];
}) {
  const [state, formAction, pending] = useActionState(saveBonusSettingsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField label="Signup / welcome bonus (₹)" name="signupBonus" type="number" min={0} defaultValue={signupBonus} required />
        <TextField label="Daily login reward (₹)" name="dailyReward" type="number" min={0} defaultValue={dailyReward} required />
        <TextField label="Referral reward (₹)" name="referralReward" type="number" min={0} defaultValue={referralReward} required />
        <TextField
          label="Deposit bonus (%, auto-credited on approval)"
          name="depositBonusPercent"
          type="number"
          min={0}
          max={100}
          step="0.1"
          defaultValue={depositBonusPercent}
          required
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Achievement rewards</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {achievements.map((a) => (
            <TextField key={a.key} label={`${a.label} (₹)`} name={a.key} type="number" min={0} defaultValue={a.amount} required />
          ))}
        </div>
      </div>

      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save bonus settings"}
      </Button>
    </form>
  );
}
