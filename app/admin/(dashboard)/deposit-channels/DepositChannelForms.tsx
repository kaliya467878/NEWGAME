"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import {
  saveDepositChannelAction,
  deleteDepositChannelAction,
  saveDepositFallbackMessageAction,
  saveDepositMaintenanceModeAction,
} from "@/lib/actions/depositChannels";
import type { AdminActionState } from "@/lib/actions/admin";
import { formatAmount } from "@/lib/format";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: AdminActionState = {};

export type ChannelDto = {
  id: string;
  kind: "CHANNEL" | "METHOD";
  channelKey: string;
  iconKey: string | null;
  label: string;
  detail: string | null;
  channelType: string;
  minAmount: number;
  maxAmount: number;
  bonusBadge: string | null;
  networkLabel: string | null;
  active: boolean;
  disabledMessage: string | null;
  sortOrder: number;
};

export function FallbackMessageForm({ current }: { current: string }) {
  const [state, formAction, pending] = useActionState(saveDepositFallbackMessageAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Fallback message (when no channel is active)</span>
        <textarea
          name="message"
          defaultValue={current}
          rows={2}
          className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60 resize-y"
        />
      </label>
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="!py-1.5 text-sm self-start">
          {pending ? "Saving…" : "Save"}
        </Button>
        {state.success && <p className="text-sm text-green">{state.success}</p>}
      </div>
    </form>
  );
}

export function AddChannelButton({ kind }: { kind: "CHANNEL" | "METHOD" }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <div className="card-surface rounded-2xl p-5">
        <ChannelForm
          kind={kind}
          defaults={{
            id: "", kind, channelKey: "", iconKey: "", label: "", detail: "", channelType: "",
            minAmount: 100, maxAmount: 50000, bonusBadge: "", networkLabel: "", active: false,
            disabledMessage: "", sortOrder: 0,
          }}
        />
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
      + {kind === "CHANNEL" ? "Add channel" : "Add payment method"}
    </button>
  );
}

export function ChannelRow({ index, channel }: { index: number; channel: ChannelDto }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-surface rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="h-7 w-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs text-muted shrink-0">
            {index}
          </span>
          <div>
            <p className="font-medium text-sm">{channel.label}</p>
            <p className="text-xs text-muted">
              {formatAmount(channel.minAmount)} – {formatAmount(channel.maxAmount)}
              {channel.detail ? ` · ${channel.detail}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              channel.active ? "border-green/40 text-green bg-green/10" : "border-border text-muted bg-surface-2"
            )}
          >
            {channel.active ? "ACTIVE" : "DISABLED"}
          </span>
          <span className={clsx("text-muted transition-transform", expanded && "rotate-180")}>▾</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border p-5">
          <ChannelForm kind={channel.kind} defaults={channel} />
        </div>
      )}
    </div>
  );
}

function ChannelForm({ kind, defaults }: { kind: "CHANNEL" | "METHOD"; defaults: ChannelDto }) {
  const [state, formAction, pending] = useActionState(saveDepositChannelAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3">
        {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
        <input type="hidden" name="kind" value={kind} />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField
            label={kind === "CHANNEL" ? "Channel ID" : "Method ID (e.g. upixqr)"}
            name="channelKey"
            defaultValue={defaults.channelKey}
            required
          />
          <TextField
            label="Icon key / Logo image URL (e.g. upi / https://...)"
            name="iconKey"
            defaultValue={defaults.iconKey ?? ""}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Or upload direct logo image file</span>
          <input
            type="file"
            name="iconFile"
            accept="image/*"
            className="rounded-lg bg-surface-2 border border-border px-3.5 py-2 outline-none focus:border-gold/60 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-surface-3 file:text-foreground file:cursor-pointer hover:file:bg-surface-4"
          />
        </label>
        <TextField label="Label" name="label" defaultValue={defaults.label} required />
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField
            label={kind === "CHANNEL" ? "Channel type" : "Method type"}
            name="channelType"
            defaultValue={defaults.channelType}
            placeholder={kind === "CHANNEL" ? "UPI (INR) / USDT (TRC20)" : "Card / NetBanking / Wallet"}
            required
          />
          <TextField label="Min amount" name="minAmount" type="number" defaultValue={defaults.minAmount} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField label="Max amount" name="maxAmount" type="number" defaultValue={defaults.maxAmount} />
          <TextField label="Bonus badge" name="bonusBadge" defaultValue={defaults.bonusBadge ?? ""} placeholder="3% bonus" />
        </div>
        <TextField
          label={kind === "CHANNEL" ? "Payee name / wallet address" : "Linked Channel ID (e.g. weepay)"}
          name="detail"
          defaultValue={defaults.detail ?? ""}
        />
        <TextField label="Network label (optional)" name="networkLabel" defaultValue={defaults.networkLabel ?? ""} placeholder="Tron (TRC20)" />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Disabled message (shown when off)</span>
          <textarea
            name="disabledMessage"
            defaultValue={defaults.disabledMessage ?? ""}
            rows={2}
            className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60 resize-y"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={defaults.active} className="accent-[var(--gold)]" />
          Active for players
        </label>

        {state.error && <p className="text-sm text-red">{state.error}</p>}
        {state.success && <p className="text-sm text-green">{state.success}</p>}

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Saving…" : defaults.id ? "Save changes" : "Create"}
        </Button>
      </form>

      {defaults.id && (
        <form action={deleteDepositChannelAction} className="self-start">
          <input type="hidden" name="id" value={defaults.id} />
          <button type="submit" className="text-sm text-red hover:underline">
            Remove this {kind === "CHANNEL" ? "channel" : "method"}
          </button>
        </form>
      )}
    </div>
  );
}

export function MaintenanceModeForm({ enabled, message }: { enabled: boolean; message: string }) {
  const [state, formAction, pending] = useActionState(saveDepositMaintenanceModeAction, initialState);
  const [isMaintenance, setIsMaintenance] = useState(enabled);

  return (
    <form action={formAction} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-semibold text-sm">Deposit Maintenance Mode</span>
          <span className="text-xs text-muted">When enabled, players cannot deposit and see a maintenance message.</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="hidden" name="enabled" value={String(isMaintenance)} />
          <button
            type="button"
            onClick={() => setIsMaintenance(!isMaintenance)}
            className={clsx(
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              isMaintenance ? "bg-gold" : "bg-surface-3"
            )}
          >
            <span
              className={clsx(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                isMaintenance ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Maintenance message shown to players</span>
        <textarea
          name="message"
          defaultValue={message || "Deposit channels are currently in maintenance. Please try again later."}
          rows={2}
          className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60 resize-y"
        />
      </label>
      {state.error && <p className="text-sm text-red">{state.error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="!py-1.5 text-sm self-start">
          {pending ? "Saving…" : "Save Maintenance Settings"}
        </Button>
        {state.success && <p className="text-sm text-green">{state.success}</p>}
      </div>
    </form>
  );
}
