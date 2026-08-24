"use client";

import { useState } from "react";
import clsx from "clsx";
import { Copy, Check, ArrowRight } from "lucide-react";

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable — nothing more we can do here
    }
  }

  return (
    <div className="rounded-xl bg-surface-2 border border-border p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted mb-1">{label}</p>
        <p className="font-mono text-gold tracking-widest truncate">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy"
        className={clsx(
          "shrink-0 h-9 w-9 rounded-lg border flex items-center justify-center transition",
          copied ? "border-green text-green bg-green/10" : "border-border text-muted hover:text-foreground hover:border-gold/40"
        )}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}

export function InviteNowButton({ url, code }: { url: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function invite() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Join me on Lucky Nova", text: `Use my referral code ${code}`, url });
        return;
      } catch {
        // user cancelled the share sheet — fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={invite}
      className="w-full rounded-xl bg-gold-gradient px-5 py-3 text-sm font-bold text-[var(--theme-text)] shadow-lg shadow-gold/20 hover:brightness-105 transition flex items-center justify-center gap-2"
    >
      {copied ? "Link copied!" : <span className="flex items-center justify-center gap-1">Invite Now <ArrowRight size={16} /></span>}
    </button>
  );
}
