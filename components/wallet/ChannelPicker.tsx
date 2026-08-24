"use client";

import { useState } from "react";
import clsx from "clsx";
import { formatAmount } from "@/lib/format";

export type ChannelOption = {
  id: string;
  label: string;
  detail: string | null;
  channelType: string;
  minAmount: number;
  maxAmount: number;
  bonusBadge: string | null;
  networkLabel: string | null;
};

/**
 * Informational channel picker shown above the deposit amount form.
 * Selecting a channel doesn't change how the request is submitted — every
 * deposit is still a manual request reviewed by staff — it just shows the
 * player where/how to send funds and the valid amount range for that channel.
 */
export function ChannelPicker({
  channels,
  selected: externalSelected,
  onSelect,
}: {
  channels: ChannelOption[];
  selected?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [localSelected, setLocalSelected] = useState(channels[0]?.id ?? null);
  const selected = externalSelected !== undefined ? externalSelected : localSelected;
  const selectedChannel = channels.find((c) => c.id === selected);

  const handleSelect = (id: string) => {
    setLocalSelected(id);
    if (onSelect) onSelect(id);
  };

  const getChannelRangeText = (c: ChannelOption) => {
    const type = c.channelType.toLowerCase();
    const label = c.label.toLowerCase();
    const network = (c.networkLabel || "").toLowerCase();
    const isTrc20 = type.includes("trc20") || label.includes("trc20") || network.includes("trc20");
    const isBep20 = type.includes("bep20") || label.includes("bep20") || network.includes("bep20");

    if (isTrc20 || isBep20) {
      const minUsdt = isTrc20 ? 12 : 1;
      const maxUsdt = Math.floor(c.maxAmount / 97);
      return `$${minUsdt} – $${maxUsdt} USDT`;
    }

    return `${formatAmount(c.minAmount)}–${formatAmount(c.maxAmount)}`;
  };

  if (channels.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-4">
      <p className="text-xs text-muted">Select channel</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {channels.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleSelect(c.id)}
            className={clsx(
              "rounded-xl border p-3 text-left transition",
              selected === c.id ? "border-gold bg-gold/10" : "border-border bg-surface-2 hover:border-gold/40"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{c.label}</p>
              {c.bonusBadge && (
                <span className="text-[10px] font-semibold text-green bg-green/10 border border-green/30 rounded-full px-2 py-0.5">
                  {c.bonusBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              {c.channelType} · {getChannelRangeText(c)}
            </p>
          </button>
        ))}
      </div>
      {selectedChannel && (
        <div className="rounded-lg bg-surface-2 border border-border p-3 text-xs text-muted">
          {selectedChannel.detail && (
            <p>
              Send to: <span className="text-foreground font-mono">{selectedChannel.detail}</span>
            </p>
          )}
          {selectedChannel.networkLabel && <p className="mt-0.5">Network: {selectedChannel.networkLabel}</p>}
          <p className="mt-0.5">
            Allowed range: {getChannelRangeText(selectedChannel)}
          </p>
        </div>
      )}
    </div>
  );
}
