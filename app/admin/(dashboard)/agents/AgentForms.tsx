"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import { saveAgentAction, toggleAgentStatusAction } from "@/lib/actions/agents";
import { AGENT_TYPE_LABELS } from "@/lib/agentTypes";
import type { AdminActionState } from "@/lib/actions/admin";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

export type AgentDto = {
  id: string;
  name: string;
  mobile: string;
  inviteCode: string;
  type: "MASTER_AGENT" | "SUB_AGENT" | "REFERRAL_AGENT" | "DIRECT_AFFILIATE";
  parentId: string | null;
  parent: { name: string; inviteCode: string } | null;
  commissionPct: number;
  status: "ACTIVE" | "INACTIVE";
  notes: string | null;
  _count: { children: number };
};

export type ParentOption = { id: string; name: string; inviteCode: string };

const TYPE_BADGE: Record<string, string> = {
  MASTER_AGENT: "border-violet/40 text-violet bg-violet/10",
  SUB_AGENT: "border-blue-400/40 text-blue-300 bg-blue-400/10",
  REFERRAL_AGENT: "border-green/40 text-green bg-green/10",
  DIRECT_AFFILIATE: "border-gold/40 text-gold bg-gold/10",
};

export function AddAgentButton({ parents }: { parents: ParentOption[] }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="card-surface rounded-2xl p-5">
        <AgentForm parents={parents} />
        <button onClick={() => setOpen(false)} className="mt-3 text-xs text-muted hover:text-foreground">
          Cancel
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setOpen(true)}
      className="rounded-lg border border-border px-4 py-2 text-sm hover:border-gold/50 hover:text-gold"
    >
      + Add partner
    </button>
  );
}

export function AgentRow({ agent, parents }: { agent: AgentDto; parents: ParentOption[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between p-4 text-left gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-9 w-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-semibold text-muted shrink-0">
            {agent.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{agent.name}</p>
            <p className="text-xs text-muted truncate">{agent.mobile}</p>
          </div>
        </div>
        <span className="font-mono text-xs text-gold shrink-0 hidden sm:inline">{agent.inviteCode}</span>
        <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", TYPE_BADGE[agent.type])}>
          {AGENT_TYPE_LABELS[agent.type]}
        </span>
        <span className="text-xs text-muted shrink-0 hidden md:inline">{agent.parent?.name ?? "Root"}</span>
        <span className="text-xs font-semibold shrink-0 hidden md:inline">{agent.commissionPct}%</span>
        <span className="text-xs text-muted shrink-0 hidden lg:inline">{agent._count.children} downline</span>
        <span
          className={clsx(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
            agent.status === "ACTIVE" ? "border-green/40 text-green bg-green/10" : "border-border text-muted bg-surface-2"
          )}
        >
          {agent.status}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-border p-5 flex flex-col gap-4">
          <AgentForm parents={parents.filter((p) => p.id !== agent.id)} defaults={agent} />
          <form action={toggleAgentStatusAction} className="self-start">
            <input type="hidden" name="id" value={agent.id} />
            <input type="hidden" name="makeActive" value={(agent.status === "INACTIVE").toString()} />
            <button type="submit" className="text-sm text-muted hover:text-foreground underline">
              {agent.status === "ACTIVE" ? "Deactivate this partner" : "Reactivate this partner"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function AgentForm({ parents, defaults }: { parents: ParentOption[]; defaults?: AgentDto }) {
  const [state, formAction, pending] = useActionState(saveAgentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {defaults && <input type="hidden" name="id" value={defaults.id} />}
      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Name" name="name" defaultValue={defaults?.name} required />
        <TextField label="Mobile number" name="mobile" defaultValue={defaults?.mobile} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Agent type</span>
          <select
            name="type"
            defaultValue={defaults?.type ?? "DIRECT_AFFILIATE"}
            className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
          >
            {Object.entries(AGENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <TextField label="Commission %" name="commissionPct" type="number" min={0} max={100} step="0.1" defaultValue={defaults?.commissionPct ?? 10} />
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Parent (upline)</span>
        <select
          name="parentId"
          defaultValue={defaults?.parentId ?? ""}
          className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
        >
          <option value="">Root (no parent)</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.inviteCode})</option>
          ))}
        </select>
      </label>
      <TextField label="Notes (optional)" name="notes" defaultValue={defaults?.notes ?? ""} />

      {state.error && <p className="text-sm text-red">{state.error}</p>}
      {state.success && <p className="text-sm text-green">{state.success}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving…" : defaults ? "Save changes" : "Create partner"}
      </Button>
    </form>
  );
}
