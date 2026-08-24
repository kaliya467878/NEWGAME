"use client";

import { useActionState } from "react";
import { adjustBalanceAction, type AdminActionState } from "@/lib/actions/admin";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

export function AdjustBalanceForm({ defaultPhone }: { defaultPhone?: string }) {
  const [state, formAction, pending] = useActionState(adjustBalanceAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <TextField label="User mobile number or UID" name="identifier" defaultValue={defaultPhone} required />
      <TextField label="Amount (₹, use a negative number to deduct)" name="amount" type="number" required />
      <TextField label="Note (optional)" name="note" />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Applying…" : "Apply adjustment"}
      </Button>
    </form>
  );
}
