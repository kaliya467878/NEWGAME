"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { QuickBetChips } from "@/components/ui/QuickBetChips";

export type PlaceBetResult = { error: string } | { success: true; betId: string };

export function BetConfirmModal({
  open,
  onClose,
  selectionLabel,
  payoutLabel,
  accentClass = "text-gold",
  balance,
  mutationFn,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  selectionLabel: string;
  payoutLabel: string;
  accentClass?: string;
  balance: number;
  mutationFn: (amount: number) => Promise<PlaceBetResult>;
  onSuccess: (amount: number, result: PlaceBetResult) => void;
}) {
  const [amount, setAmount] = useState(10);

  const mutation = useMutation({
    mutationFn: () => mutationFn(amount),
    onSuccess: (result) => {
      if ("error" in result) return;
      onSuccess(amount, result);
    },
  });

  if (!open) return null;

  const error = mutation.data && "error" in mutation.data ? mutation.data.error : null;
  const canBet = amount > 0 && amount <= balance && !mutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-4"
      onClick={onClose}
    >
      <div
        className="modal-in card-surface rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Confirm your bet</p>
          <p className={clsx("text-2xl font-extrabold mt-1", accentClass)}>{selectionLabel}</p>
          <p className="text-xs text-muted mt-0.5">{payoutLabel}</p>
        </div>

        <QuickBetChips onChange={setAmount} />

        <div className="flex items-center justify-between rounded-xl bg-surface-2 border border-border px-4 py-3">
          <span className="text-sm text-muted">Total bet</span>
          <span className="text-lg font-bold text-gold">{formatAmount(amount)}</span>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}
        {amount > balance && <p className="text-sm text-red">Insufficient balance</p>}

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={!canBet}>
            {mutation.isPending ? "Placing…" : "Confirm Bet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
