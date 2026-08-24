"use client";

import { useActionState } from "react";
import { adminLoginAction, type AdminActionState } from "@/lib/actions/admin";
import { TextField, PasswordField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full max-w-sm">
      <TextField label="Staff mobile number or email" name="identifier" required />
      <PasswordField label="Password" name="password" required />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full mt-2">
        {pending ? "Logging in…" : "Log in to admin"}
      </Button>
    </form>
  );
}
