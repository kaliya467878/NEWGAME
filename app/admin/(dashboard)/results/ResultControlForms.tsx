"use client";

import { useActionState } from "react";
import { setResultModeAction, setResultOverrideAction, setWinningPercentageAction, setBrahmastraProfitsAction, type AdminActionState } from "@/lib/actions/admin";
import { setK3OverrideAction, setFiveDOverrideAction } from "@/lib/actions/gameAdmin";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

function ModeSelect() {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">Mode</span>
      <select
        name="mode"
        defaultValue="S30"
        className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
      >
        <option value="S30">30 Seconds (Wingo only)</option>
        <option value="M1">1 Minute</option>
        <option value="M3">3 Minutes</option>
        <option value="M5">5 Minutes</option>
        <option value="M10">10 Minutes (K3/5D only)</option>
      </select>
    </label>
  );
}

export function ResultModeForm({ currentMode }: { currentMode: string }) {
  const [state, formAction, pending] = useActionState(setResultModeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <p className="text-sm text-muted">
        Current mode: <span className="text-gold font-semibold">{currentMode}</span>
      </p>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Default result mode</span>
        <select
          name="mode"
          defaultValue={currentMode}
          className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
        >
          <option value="RANDOM">Secure Random</option>
          <option value="SCHEDULED">Pre-generated Schedule</option>
        </select>
      </label>
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Saving…" : "Save mode"}
      </Button>
    </form>
  );
}

export function OverrideForm() {
  const [state, formAction, pending] = useActionState(setResultOverrideAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <ModeSelect />
      <TextField label="Round number" name="roundNumber" type="number" required />
      <TextField label="Winning number (0-9)" name="number" type="number" min={0} max={9} required />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending} variant="danger">
        {pending ? "Setting…" : "Set manual override"}
      </Button>
    </form>
  );
}

export function K3OverrideForm() {
  const [state, formAction, pending] = useActionState(setK3OverrideAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <ModeSelect />
      <TextField label="Round number" name="roundNumber" type="number" required />
      <div className="grid grid-cols-3 gap-2">
        <TextField label="Die 1 (1-6)" name="dice1" type="number" min={1} max={6} required />
        <TextField label="Die 2 (1-6)" name="dice2" type="number" min={1} max={6} required />
        <TextField label="Die 3 (1-6)" name="dice3" type="number" min={1} max={6} required />
      </div>
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending} variant="danger">
        {pending ? "Setting…" : "Set K3 override"}
      </Button>
    </form>
  );
}

export function FiveDOverrideForm() {
  const [state, formAction, pending] = useActionState(setFiveDOverrideAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <ModeSelect />
      <TextField label="Round number" name="roundNumber" type="number" required />
      <div className="grid grid-cols-5 gap-2">
        {(["a", "b", "c", "d", "e"] as const).map((p) => (
          <TextField key={p} label={p.toUpperCase()} name={p} type="number" min={0} max={9} required />
        ))}
      </div>
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending} variant="danger">
        {pending ? "Setting…" : "Set 5D override"}
      </Button>
    </form>
  );
}

import {
  deleteWingoOverrideAction,
  deleteK3OverrideAction,
  deleteFiveDOverrideAction,
} from "@/lib/actions/gameAdmin";

export function CancelOverrideButton({ id, type }: { id: string; type: "wingo" | "k3" | "fived" }) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: AdminActionState, _formData: FormData) => {
      if (type === "wingo") return await deleteWingoOverrideAction(id);
      if (type === "k3") return await deleteK3OverrideAction(id);
      return await deleteFiveDOverrideAction(id);
    },
    initialState
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      {state.error && <span className="text-xs text-red font-normal">{state.error}</span>}
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-semibold px-2.5 py-1 rounded bg-red/10 border border-red/30 text-red hover:bg-red/20 hover:text-[var(--theme-text)] transition disabled:opacity-50"
      >
        {pending ? "Undo..." : "Undo"}
      </button>
    </form>
  );
}

export function WinningPercentageForm({ currentPercentage }: { currentPercentage: number }) {
  const [state, formAction, pending] = useActionState(setWinningPercentageAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <p className="text-sm text-muted">
        Current winning percentage: <span className="text-gold font-semibold">{currentPercentage}%</span>
      </p>
      <TextField
        label="Winning Percentage (0-100)"
        name="percentage"
        type="number"
        min={0}
        max={100}
        defaultValue={String(currentPercentage)}
        required
      />
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Saving…" : "Save percentage"}
      </Button>
    </form>
  );
}

export function BrahmastraProfitsForm({ enabled }: { enabled: boolean }) {
  const [state, formAction, pending] = useActionState(setBrahmastraProfitsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 max-w-sm">
      <p className="text-sm text-muted">
        Brahmastra Mode: <span className={enabled ? "text-red font-bold animate-pulse" : "text-muted font-semibold"}>{enabled ? "ENABLED (Maximum Profits)" : "DISABLED"}</span>
      </p>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Brahmastra Mode Status</span>
        <select
          name="enabled"
          defaultValue={String(enabled)}
          className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
        >
          <option value="false">Disabled (Normal Mode)</option>
          <option value="true">Enabled (Force Maximum Platform Profits)</option>
        </select>
      </label>
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}
      <Button type="submit" disabled={pending} variant="danger">
        {pending ? "Updating…" : "Update Brahmastra Mode"}
      </Button>
    </form>
  );
}
