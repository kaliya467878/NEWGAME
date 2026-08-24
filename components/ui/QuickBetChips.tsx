"use client";

import { useState } from "react";
import clsx from "clsx";
import { Pen } from "lucide-react";

const CHIPS = [
  { value: 10, className: "bg-green text-black" },
  { value: 50, className: "bg-blue text-[var(--theme-text)]" },
  { value: 100, className: "bg-violet text-[var(--theme-text)]" },
  { value: 500, className: "bg-orange text-[var(--theme-text)]" },
  { value: 1000, className: "bg-gold-gradient text-[var(--theme-text)]" },
];

const MULTIPLIERS = [1, 5, 10, 50, 100];

export function QuickBetChips({ onChange }: { onChange: (amount: number) => void }) {
  const [chip, setChip] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState(10);

  function pickChip(value: number) {
    setChip(value);
    setCustom(false);
    onChange(value * multiplier);
  }

  function pickMultiplier(m: number) {
    setMultiplier(m);
    setCustom(false);
    onChange(chip * m);
  }

  function pickCustom(value: number) {
    setCustomValue(value);
    onChange(value);
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[11px] uppercase tracking-wider text-muted font-medium">Quick Bet</p>

      <div className="flex flex-wrap items-center gap-3">
        {CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => pickChip(c.value)}
            className={clsx(
              "h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border-2 transition",
              c.className,
              chip === c.value && !custom
                ? "border-white/80 scale-110 shadow-lg"
                : "border-black/20 opacity-75 hover:opacity-100 hover:scale-105"
            )}
          >
            ₹{c.value}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={clsx(
            "h-9 shrink-0 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition",
            custom ? "border-gold text-gold bg-gold/10" : "border-border text-muted hover:text-foreground"
          )}
        >
          <Pen size={12} /> Custom
        </button>
      </div>

      {custom ? (
        <input
          type="number"
          min={1}
          value={customValue}
          onChange={(e) => pickCustom(Number(e.target.value))}
          className="w-32 rounded-lg bg-surface-2 border border-border px-3 py-1.5 text-sm outline-none focus:border-gold/60"
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pickMultiplier(m)}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                multiplier === m ? "border-gold text-gold bg-gold/10" : "border-border text-muted hover:text-foreground"
              )}
            >
              X{m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
