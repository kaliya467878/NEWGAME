"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import clsx from "clsx";
import { formatAmount } from "@/lib/format";
import { ArrowDown, ArrowUp, Gift, Trophy, Circle, Dices } from "lucide-react";

export type LedgerEntryDto = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  createdAt: string | Date;
};

export type TabKey = "ALL" | "DEPOSIT" | "WITHDRAW" | "BONUS" | "WIN";

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "DEPOSIT", label: "Deposit" },
  { key: "WITHDRAW", label: "Withdraw" },
  { key: "BONUS", label: "Bonus" },
  { key: "WIN", label: "Win" },
];

const TYPE_TAB: Record<string, TabKey> = {
  DEPOSIT_APPROVED: "DEPOSIT",
  WITHDRAW_APPROVED: "WITHDRAW",
  WITHDRAW_REJECTED_REFUND: "WITHDRAW",
  WELCOME_BONUS: "BONUS",
  REWARD_CLAIMED: "BONUS",
  GIFT_CODE_REDEEMED: "BONUS",
  ADMIN_ADJUST: "BONUS",
  BET_WON: "WIN",
};

const LEDGER_LABELS: Record<string, string> = {
  WELCOME_BONUS: "Welcome bonus",
  DEPOSIT_APPROVED: "Deposit",
  WITHDRAW_APPROVED: "Withdrawal",
  WITHDRAW_REJECTED_REFUND: "Withdrawal refund",
  BET_PLACED: "Bet placed",
  BET_WON: "Bet won",
  BET_LOST: "Bet lost",
  ADMIN_ADJUST: "Balance adjustment",
  REWARD_CLAIMED: "Reward claimed",
  GIFT_CODE_REDEEMED: "Gift code redeemed",
};

const TYPE_ICON: Record<TabKey | "OTHER", { icon: React.ReactNode; className: string }> = {
  DEPOSIT: { icon: <ArrowDown size={18} />, className: "bg-green/15 text-green" },
  WITHDRAW: { icon: <ArrowUp size={18} />, className: "bg-red/15 text-red" },
  BONUS: { icon: <Gift size={18} />, className: "bg-violet/15 text-violet" },
  WIN: { icon: <Trophy size={18} />, className: "bg-gold/15 text-gold" },
  ALL: { icon: <Circle size={10} />, className: "bg-surface-2 text-muted" },
  OTHER: { icon: <Dices size={18} />, className: "bg-surface-2 text-muted" },
};

export function TransactionList({ entries, defaultTab = "ALL" }: { entries: LedgerEntryDto[]; defaultTab?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(defaultTab);

  const filtered = useMemo(() => {
    if (tab === "ALL") return entries;
    return entries.filter((e) => TYPE_TAB[e.type] === tab);
  }, [entries, tab]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-xl bg-surface-2/70 p-1 border border-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
              tab === t.key ? "bg-gold-gradient text-[var(--theme-text)] shadow-md shadow-gold/20" : "text-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">No transactions in this category yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {filtered.map((entry) => {
            const category = TYPE_TAB[entry.type] ?? "OTHER";
            const { icon, className } = TYPE_ICON[category];
            return (
              <div key={entry.id} className="flex items-center gap-3 py-3">
                <span className={clsx("h-9 w-9 rounded-lg flex items-center justify-center text-base shrink-0", className)}>
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{LEDGER_LABELS[entry.type] ?? entry.type}</p>
                  <p className="text-xs text-muted">{format(new Date(entry.createdAt), "d MMM yyyy, h:mm a")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={clsx("text-sm font-semibold", entry.amount >= 0 ? "text-green" : "text-red")}>
                    {entry.amount >= 0 ? "+" : ""}
                    {formatAmount(entry.amount)}
                  </p>
                  <p className="text-[11px] text-muted">Completed</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
