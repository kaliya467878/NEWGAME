"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { playDiceAction, type DiceResult } from "@/lib/actions/games";
import { diceMultiplier, diceWinChance } from "@/lib/games/logic";
import { BetAmountInput } from "./BetAmountInput";
import { Button } from "@/components/ui/Button";
import { Odometer } from "@/components/Odometer";
import { PartyPopper } from "lucide-react";

export function DiceGame({ initialBalance }: { initialBalance: number }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(10);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<"OVER" | "UNDER">("OVER");
  const [balance, setBalance] = useState(initialBalance);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Extract<DiceResult, { won: boolean }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const multiplier = useMemo(() => diceMultiplier(target, direction), [target, direction]);
  const winChance = useMemo(() => diceWinChance(target, direction) * 100, [target, direction]);

  async function play() {
    setPending(true);
    setError(null);
    const res = await playDiceAction({ amount, target, direction });
    setPending(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setResult(res);
    setBalance(res.balance);
    queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card-surface rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">Balance</p>
          <Odometer value={balance} className="text-2xl font-semibold text-coin" />
        </div>
        {result && (
          <div className="text-right">
            <p className="text-muted text-sm">Last roll</p>
            <p className={clsx("text-3xl font-bold", result.won ? "text-green" : "text-red")}>{result.roll}</p>
          </div>
        )}
      </div>

      <div className="card-surface rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Roll {direction === "OVER" ? "over" : "under"}</span>
          <span className="text-2xl font-bold text-gold">{target}</span>
        </div>
        <input
          type="range"
          min={2}
          max={99}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="w-full accent-[var(--gold)]"
        />
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg bg-surface-2 border border-border p-3">
            <p className="text-muted text-xs">Win chance</p>
            <p className="font-semibold">{winChance.toFixed(0)}%</p>
          </div>
          <div className="rounded-lg bg-surface-2 border border-border p-3">
            <p className="text-muted text-xs">Multiplier</p>
            <p className="font-semibold text-gold">{multiplier.toFixed(2)}×</p>
          </div>
          <div className="rounded-lg bg-surface-2 border border-border p-3">
            <p className="text-muted text-xs">Payout</p>
            <p className="font-semibold">₹{Math.floor(amount * multiplier)}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setDirection("UNDER")}
            className={clsx(
              "flex-1 rounded-xl border py-2.5 font-medium transition",
              direction === "UNDER" ? "border-gold text-gold bg-gold/10" : "border-border text-muted"
            )}
          >
            Under
          </button>
          <button
            onClick={() => setDirection("OVER")}
            className={clsx(
              "flex-1 rounded-xl border py-2.5 font-medium transition",
              direction === "OVER" ? "border-gold text-gold bg-gold/10" : "border-border text-muted"
            )}
          >
            Over
          </button>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-6 flex flex-col gap-4">
        <BetAmountInput amount={amount} setAmount={setAmount} disabled={pending} />
        {error && <p className="text-sm text-red">{error}</p>}
        {result && (
          <p className={clsx("text-sm font-medium", result.won ? "text-green" : "text-red")}>
            {result.won ? (
              <span className="flex items-center gap-1">
                You won ₹{result.payout}! <PartyPopper className="w-4 h-4" />
              </span>
            ) : (
              "No win this time."
            )}
          </p>
        )}
        <Button onClick={play} disabled={pending || amount > balance}>
          {pending ? "Rolling…" : "Roll dice"}
        </Button>
      </div>
    </div>
  );
}
