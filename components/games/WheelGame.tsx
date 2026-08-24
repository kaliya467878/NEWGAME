"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { playWheelAction, type WheelResult } from "@/lib/actions/games";
import { WHEEL_SEGMENTS } from "@/lib/games/logic";
import { BetAmountInput } from "./BetAmountInput";
import { Button } from "@/components/ui/Button";
import { Odometer } from "@/components/Odometer";
import { PartyPopper } from "lucide-react";

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

function segmentColor(mult: number) {
  if (mult === 0) return "#262b38";
  if (mult < 2) return "#1ec78a";
  if (mult < 3) return "#4aa8f0";
  if (mult < 5) return "#9b6bf5";
  return "#e6c260";
}

export function WheelGame({ initialBalance }: { initialBalance: number }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(10);
  const [balance, setBalance] = useState(initialBalance);
  const [pending, setPending] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Extract<WheelResult, { multiplier: number }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function spin() {
    setPending(true);
    setError(null);
    setResult(null);
    const res = await playWheelAction({ amount });
    if ("error" in res) {
      setPending(false);
      setError(res.error);
      return;
    }

    // Land the pointer (at top) on the winning segment, after a few full turns.
    const targetAngle = 360 * 5 + (360 - res.segmentIndex * SEGMENT_ANGLE - SEGMENT_ANGLE / 2);
    setRotation((prev) => prev - (prev % 360) + targetAngle);

    setTimeout(() => {
      setResult(res);
      setBalance(res.balance);
      setPending(false);
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    }, 3200);
  }

  const gradient = WHEEL_SEGMENTS.map((mult, i) => {
    const start = i * SEGMENT_ANGLE;
    const end = start + SEGMENT_ANGLE;
    return `${segmentColor(mult)} ${start}deg ${end}deg`;
  }).join(", ");

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="card-surface rounded-2xl p-6 w-full flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">Balance</p>
          <Odometer value={balance} className="text-2xl font-semibold text-coin" />
        </div>
        {result && (
          <div className="text-right">
            <p className="text-muted text-sm">Result</p>
            <p className={clsx("text-2xl font-bold", result.payout > 0 ? "text-green" : "text-red")}>
              {result.multiplier}×
            </p>
          </div>
        )}
      </div>

      <div className="relative w-64 h-64">
        <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 text-gold text-2xl">▼</div>
        <div
          className="w-64 h-64 rounded-full border-4 border-gold/40 transition-transform duration-[3000ms] ease-out"
          style={{
            background: `conic-gradient(${gradient})`,
            transform: `rotate(${rotation}deg)`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center text-xs text-muted">
            SPIN
          </div>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-6 w-full flex flex-col gap-4">
        <BetAmountInput amount={amount} setAmount={setAmount} disabled={pending} />
        {error && <p className="text-sm text-red">{error}</p>}
        {result && (
          <p className={clsx("text-sm font-medium", result.payout > 0 ? "text-green" : "text-red")}>
            {result.payout > 0 ? (
              <span className="flex items-center gap-1">
                You won ₹{result.payout}! <PartyPopper className="w-4 h-4" />
              </span>
            ) : (
              "No win this time."
            )}
          </p>
        )}
        <Button onClick={spin} disabled={pending || amount > balance}>
          {pending ? "Spinning…" : "Spin"}
        </Button>
      </div>
    </div>
  );
}
