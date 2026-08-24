"use client";

import { useActionState } from "react";
import { createGiftCodeAction, broadcastEventRewardAction, type AdminActionState } from "@/lib/actions/admin";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

export function CreateGiftCodeForm() {
  const [state, formAction, pending] = useActionState(createGiftCodeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <TextField label="Code (leave blank to auto-generate)" name="code" placeholder="OMEGA2026" />
      <TextField label="Amount (₹)" name="amount" type="number" min={1} required />
      <TextField label="Max redemptions" name="maxRedemptions" type="number" min={1} defaultValue={1} required />
      <TextField label="Expires at (optional)" name="expiresAt" type="datetime-local" />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create gift code"}
      </Button>
    </form>
  );
}

export function BroadcastEventForm() {
  const [state, formAction, pending] = useActionState(broadcastEventRewardAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <TextField label="Event label" name="label" placeholder="e.g. Diwali Bonus" required />
      <TextField label="Amount per user (₹)" name="amount" type="number" min={1} required />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Sending…" : "Send to all users"}
      </Button>
    </form>
  );
}
