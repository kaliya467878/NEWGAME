"use client";

import { useActionState } from "react";
import { createStaffAction, setStaffPermissionsAction } from "@/lib/actions/staff";
import type { AdminActionState } from "@/lib/actions/admin";
import { TextField, PasswordField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

export function CreateStaffForm() {
  const [state, formAction, pending] = useActionState(createStaffAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <TextField label="Mobile number" name="phone" type="tel" required />
      <PasswordField label="Password" name="password" minLength={8} required />
      <TextField label="Email (optional)" name="email" type="email" />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create staff account"}
      </Button>
    </form>
  );
}

export function StaffPermissionsForm({
  userId,
  displayName,
  currentKeys,
  catalog,
}: {
  userId: string;
  displayName: string;
  currentKeys: string[];
  catalog: { key: string; label: string; area: string }[];
}) {
  const [state, formAction, pending] = useActionState(setStaffPermissionsAction, initialState);
  const current = new Set(currentKeys);

  const byArea = catalog.reduce<Record<string, typeof catalog>>((acc, p) => {
    (acc[p.area] ??= []).push(p);
    return acc;
  }, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(byArea).map(([area, perms]) => (
          <div key={area} className="rounded-lg bg-surface-2 border border-border p-3">
            <p className="text-xs font-semibold text-gold mb-2">{area}</p>
            <div className="flex flex-col gap-1.5">
              {perms.map((p) => (
                <label key={p.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={p.key}
                    defaultChecked={current.has(p.key)}
                    className="mt-0.5 accent-[var(--gold)]"
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : `Save permissions for ${displayName}`}
        </Button>
      </div>
    </form>
  );
}
