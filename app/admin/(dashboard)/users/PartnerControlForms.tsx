"use client";

import { useActionState } from "react";
import { resetPartnerBalanceAction, adjustPartnerBalanceAction, type AdminActionState } from "@/lib/actions/admin";
import { suspendUserAction, reactivateUserAction } from "@/lib/actions/users";

const initialState: AdminActionState = {};

export function PartnerResetButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    async () => await resetPartnerBalanceAction(userId),
    initialState
  );

  return (
    <div className="inline-flex flex-col">
      <form action={formAction} className="inline">
        <button
          type="submit"
          disabled={pending}
          className="text-[10px] font-bold px-2.5 py-1.5 rounded bg-gold/10 border border-gold/30 text-gold hover:bg-gold hover:text-[var(--theme-text)] transition disabled:opacity-50"
        >
          {pending ? "Resetting…" : "Reset to 50k"}
        </button>
      </form>
      {state.error && <span className="text-[9px] text-red mt-0.5 font-semibold">{state.error}</span>}
    </div>
  );
}

export function PartnerAdjustForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: AdminActionState, formData: FormData) => {
      const amount = Number(formData.get("amount"));
      if (Number.isNaN(amount) || amount === 0) {
        return { error: "Enter a valid non-zero amount" };
      }
      return await adjustPartnerBalanceAction(userId, amount);
    },
    initialState
  );

  return (
    <div className="inline-flex flex-col gap-0.5">
      <form action={formAction} className="inline-flex items-center gap-1.5">
        <input
          type="number"
          name="amount"
          placeholder="e.g. 500 or -200"
          required
          className="w-24 rounded bg-surface-3 border border-border px-2 py-1 text-xs text-foreground outline-none focus:border-gold/50"
        />
        <button
          type="submit"
          disabled={pending}
          className="text-[10px] font-bold px-2.5 py-1.5 rounded bg-surface-2 border border-border text-foreground hover:bg-gold hover:text-[var(--theme-text)] transition disabled:opacity-50"
        >
          {pending ? "Applying…" : "Adjust"}
        </button>
      </form>
      {state.error && <span className="text-[9px] text-red font-semibold">{state.error}</span>}
      {state.success && <span className="text-[9px] text-green font-semibold">{state.success}</span>}
    </div>
  );
}

export function PartnerSuspendButton({ userId, status }: { userId: string; status: "ACTIVE" | "SUSPENDED" }) {
  const isSuspended = status === "SUSPENDED";
  const [, formAction, pending] = useActionState(
    async () => {
      const data = new FormData();
      data.append("userId", userId);
      if (isSuspended) {
        await reactivateUserAction(data);
      } else {
        await suspendUserAction(data);
      }
      return {};
    },
    {}
  );

  return (
    <form action={formAction} className="inline">
      <button
        type="submit"
        disabled={pending}
        className={`text-[10px] font-bold px-2.5 py-1.5 rounded border transition disabled:opacity-50 ${
          isSuspended
            ? "border-green/30 text-green bg-green/10 hover:bg-green/20 hover:text-[var(--theme-text)]"
            : "border-red/30 text-red bg-red/10 hover:bg-red/20 hover:text-[var(--theme-text)]"
        }`}
      >
        {pending ? "Updating…" : isSuspended ? "Reactivate" : "Ban"}
      </button>
    </form>
  );
}
