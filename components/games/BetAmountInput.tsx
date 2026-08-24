"use client";

import clsx from "clsx";

const PRESETS = [10, 50, 100, 500];

export function BetAmountInput({
  amount,
  setAmount,
  disabled,
}: {
  amount: number;
  setAmount: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          disabled={disabled}
          onClick={() => setAmount(preset)}
          className={clsx(
            "rounded-lg border border-border px-3 py-1.5 text-sm hover:border-gold/50 disabled:opacity-50",
            amount === preset && "border-gold text-gold"
          )}
        >
          ₹{preset}
        </button>
      ))}
      <input
        type="number"
        min={1}
        value={amount}
        disabled={disabled}
        onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
        className="w-28 rounded-lg bg-surface-2 border border-border px-3 py-1.5 outline-none focus:border-gold/60 disabled:opacity-50"
      />
    </div>
  );
}
