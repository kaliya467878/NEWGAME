"use client";

import { useActionState } from "react";
import { changeAdminPasswordAction } from "@/lib/actions/admin";
import { suspendUserAction, reactivateUserAction } from "@/lib/actions/users";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeAdminPasswordAction, initialState as any);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm">
      <TextField
        label="Current Password"
        name="currentPassword"
        type="password"
        required
      />
      <TextField
        label="New Password"
        name="newPassword"
        type="password"
        required
      />
      <TextField
        label="Confirm New Password"
        name="confirmPassword"
        type="password"
        required
      />

      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}

      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Changing Password…" : "Change Password"}
      </Button>
    </form>
  );
}

export function SuspendUserButton({ userId, status }: { userId: string; status: "ACTIVE" | "SUSPENDED" }) {
  const isSuspended = status === "SUSPENDED";
  const [state, formAction, pending] = useActionState(
    async (_prevState: any, _formData: FormData) => {
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
        className={`text-xs font-semibold px-2.5 py-1 rounded border transition disabled:opacity-50 ${
          isSuspended
            ? "border-green/30 text-green bg-green/10 hover:bg-green/20 hover:text-[var(--theme-text)]"
            : "border-red/30 text-red bg-red/10 hover:bg-red/20 hover:text-[var(--theme-text)]"
        }`}
      >
        {pending ? "Updating…" : isSuspended ? "Reactivate" : "Suspend / Ban"}
      </button>
    </form>
  );
}
