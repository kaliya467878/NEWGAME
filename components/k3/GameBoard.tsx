"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { formatAmount } from "@/lib/format";
import { placeBetAction } from "@/lib/actions/k3";
import { Button } from "@/components/ui/Button";
import { RoundTimer } from "@/components/ui/RoundTimer";
import { TabBar } from "@/components/ui/TabBar";
import { Pager } from "@/components/ui/Pager";
import { BetConfirmModal } from "@/components/games/BetConfirmModal";
import { useToasts, ToastStack } from "@/components/ui/Toast";

type K3BetDto = {
  id: string;
  roundNumber: number;
  betType: "SUM_VALUE" | "SUM_BIG_SMALL" | "SUM_ODD_EVEN" | "ANY_TRIPLE";
  selection: string;
  amount: number;
  status: "PENDING" | "WON" | "LOST";
  payout: number;
};

type K3ResultDto = {
  id: string;
  roundNumber: number;
  dice1: number;
  dice2: number;
  dice3: number;
  sum: number;
  settledAt: string;
};

type StateDto = {
  mode: string;
  roundNumber: number;
  serverTime: number;
  startsAt: number;
  endsAt: number;
  locksAt: number;
  locked: boolean;
  durationSeconds: number;
  recentResults: K3ResultDto[];
  myBets: K3BetDto[];
};

const SUM_VALUES = Array.from({ length: 16 }, (_, i) => i + 3);

// Mirrors lib/k3/rounds.ts SUM_MULTIPLIERS — display-only copy for the bet grid.
const SUM_MULTIPLIERS: Record<number, number> = {
  3: 180, 18: 180,
  4: 90, 17: 90,
  5: 60, 16: 60,
  6: 45, 15: 45,
  7: 34, 14: 34,
  8: 27, 13: 27,
  9: 25, 12: 25,
  10: 24, 11: 24,
};

const HISTORY_PAGE_SIZE = 5;

const DOT_POSITIONS: Record<number, string[]> = {
  1: ["c"],
  2: ["tl", "br"],
  3: ["tl", "c", "br"],
  4: ["tl", "tr", "bl", "br"],
  5: ["tl", "tr", "c", "bl", "br"],
  6: ["tl", "tr", "ml", "mr", "bl", "br"],
};

const DOT_POS_CLASS: Record<string, string> = {
  tl: "top-[15%] left-[15%]",
  tr: "top-[15%] right-[15%]",
  bl: "bottom-[15%] left-[15%]",
  br: "bottom-[15%] right-[15%]",
  ml: "top-1/2 left-[15%] -translate-y-1/2",
  mr: "top-1/2 right-[15%] -translate-y-1/2",
  c: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

function DiceFace({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-20 w-20 sm:h-24 sm:w-24" : size === "sm" ? "h-8 w-8" : "h-14 w-14 sm:h-16 sm:w-16";
  return (
    <img 
      src={`/k3/images/${value}.png`}
      alt={`Dice ${value}`}
      className={clsx(
        "object-contain filter drop-shadow-lg", 
        dims
      )} 
    />
  );
}

function bigSmall(sum: number): "BIG" | "SMALL" {
  return sum >= 11 ? "BIG" : "SMALL";
}

async function fetchState(mode: string): Promise<StateDto> {
  const res = await fetch(`/api/k3/${mode}/state`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load round state");
  return res.json();
}

async function fetchBalance(): Promise<number> {
  const res = await fetch("/api/wallet/summary", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load balance");
  const data = await res.json();
  return data.balance;
}

export function GameBoard({ mode, modeLabel }: { mode: string; modeLabel: string }) {
  const queryClient = useQueryClient();
  const [betType, setBetType] = useState<K3BetDto["betType"]>("SUM_VALUE");
  const [selection, setSelection] = useState<string>("7");
  const [betTab, setBetTab] = useState<"TOTAL" | "SUM_BIG_SMALL" | "SUM_ODD_EVEN" | "ANY_TRIPLE">("TOTAL");
  const [modalOpen, setModalOpen] = useState(false);
  const [reveal, setReveal] = useState<K3ResultDto | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [historyTab, setHistoryTab] = useState<"HISTORY" | "CHART" | "MINE">("HISTORY");
  const [historyPage, setHistoryPage] = useState(1);
  const { toasts, push: pushToast } = useToasts();

  const clockOffsetRef = useRef(0);
  const previousRoundRef = useRef<number | null>(null);

  const stateQuery = useQuery({
    queryKey: ["k3-state", mode],
    queryFn: () => fetchState(mode),
    refetchInterval: 2000,
  });

  const balanceQuery = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: fetchBalance,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!stateQuery.data) return;
    clockOffsetRef.current = stateQuery.data.serverTime - Date.now();

    const newRound = stateQuery.data.roundNumber;
    const prevRound = previousRoundRef.current;
    if (prevRound !== null && newRound !== prevRound) {
      const iBetThatRound = stateQuery.data.myBets.some((b) => b.roundNumber === prevRound);
      const justSettled = stateQuery.data.recentResults.find((r) => r.roundNumber === prevRound);
      if (justSettled && iBetThatRound) {
        setReveal(justSettled);
        setTimeout(() => setReveal((current) => (current?.id === justSettled.id ? null : current)), 3000);
      }
    }
    previousRoundRef.current = newRound;
  }, [stateQuery.data]);

  const remainingMs = stateQuery.data ? stateQuery.data.endsAt - (now + clockOffsetRef.current) : 0;
  const locked = stateQuery.data ? remainingMs <= 5000 : false;

  const balance = balanceQuery.data ?? 0;

  const selectionLabel = useMemo(() => {
    if (betType === "SUM_VALUE") return `Total ${selection}`;
    if (betType === "ANY_TRIPLE") return "Any triple";
    return selection.charAt(0) + selection.slice(1).toLowerCase();
  }, [betType, selection]);

  const payoutLabel = useMemo(() => {
    if (betType === "SUM_VALUE") return `${SUM_MULTIPLIERS[Number(selection)] ?? 0}× payout`;
    if (betType === "ANY_TRIPLE") return "30× payout";
    return "2× payout";
  }, [betType, selection]);

  const accentClass = useMemo(() => {
    if (betType === "SUM_BIG_SMALL") return selection === "BIG" ? "text-blue" : "text-orange";
    if (betType === "ANY_TRIPLE") return "text-violet";
    return "text-gold";
  }, [betType, selection]);

  function pick(type: typeof betType, value: string) {
    if (locked) return;
    setBetType(type);
    setSelection(value);
    setModalOpen(true);
  }

  function handleBetSuccess() {
    queryClient.invalidateQueries({ queryKey: ["k3-state", mode] });
    queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    pushToast("Bet Successful");
    setModalOpen(false);
  }

  const recentResults = stateQuery.data?.recentResults ?? [];
  const pageCount = Math.max(1, Math.ceil(recentResults.length / HISTORY_PAGE_SIZE));
  const pagedResults = recentResults.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <RoundTimer
        roundNumber={stateQuery.data ? stateQuery.data.roundNumber : "—"}
        remainingMs={remainingMs}
        locked={locked}
        balance={balance}
      />

      <section className="card-surface rounded-2xl p-5 sm:p-6 relative overflow-hidden bg-gradient-to-b from-gold/10 to-transparent">
        {locked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <div className="rounded-full bg-red/20 border border-red/50 px-6 py-3 text-red font-semibold tracking-wide animate-pulse">
              🔒 Betting locked
            </div>
          </div>
        )}
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <DiceFace value={reveal ? reveal.dice1 : recentResults[0]?.dice1 ?? 1} size="lg" />
          <DiceFace value={reveal ? reveal.dice2 : recentResults[0]?.dice2 ?? 1} size="lg" />
          <DiceFace value={reveal ? reveal.dice3 : recentResults[0]?.dice3 ?? 1} size="lg" />
        </div>
      </section>

      <section className={clsx("card-surface rounded-2xl p-5 sm:p-6 relative overflow-hidden flex flex-col gap-5", locked && "opacity-70")}>
        {locked && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10" />}

        <TabBar
          tabs={[
            { key: "TOTAL", label: "Total" },
            { key: "SUM_BIG_SMALL", label: "Big/Small" },
            { key: "SUM_ODD_EVEN", label: "Odd/Even" },
            { key: "ANY_TRIPLE", label: "Any Triple" },
          ]}
          active={betTab}
          onChange={setBetTab}
        />

        {betTab === "TOTAL" && (
          <div>
            <p className="text-xs text-muted mb-3">Total (3–18) — exact sum of all three dice</p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {SUM_VALUES.map((v) => (
                <button
                  key={v}
                  onClick={() => pick("SUM_VALUE", String(v))}
                  className={clsx(
                    "aspect-square rounded-xl border border-gold/20 bg-gradient-to-b from-surface-2 to-surface flex flex-col items-center justify-center gap-0.5 shadow-md hover:border-gold/50 hover:brightness-110 transition",
                    betType === "SUM_VALUE" && selection === String(v) && "ring-4 ring-gold/70 border-gold scale-[1.05]"
                  )}
                >
                  <span className="font-bold text-lg text-gold">{v}</span>
                  <span className="text-[10px] text-muted">{SUM_MULTIPLIERS[v]}X</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {betTab === "SUM_BIG_SMALL" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => pick("SUM_BIG_SMALL", "BIG")}
              className={clsx(
                "rounded-xl py-4 font-bold text-lg transition bg-blue text-[var(--theme-text)] shadow-lg shadow-blue/20 hover:brightness-105",
                betType === "SUM_BIG_SMALL" && selection === "BIG" && "ring-4 ring-gold/70 scale-[1.03]"
              )}
            >
              Big (11–18) <span className="block text-xs font-normal mt-0.5 opacity-80">2X</span>
            </button>
            <button
              onClick={() => pick("SUM_BIG_SMALL", "SMALL")}
              className={clsx(
                "rounded-xl py-4 font-bold text-lg transition bg-orange text-[var(--theme-text)] shadow-lg shadow-orange/20 hover:brightness-105",
                betType === "SUM_BIG_SMALL" && selection === "SMALL" && "ring-4 ring-gold/70 scale-[1.03]"
              )}
            >
              Small (3–10) <span className="block text-xs font-normal mt-0.5 opacity-80">2X</span>
            </button>
          </div>
        )}

        {betTab === "SUM_ODD_EVEN" && (
          <div className="grid grid-cols-2 gap-3">
            {(["ODD", "EVEN"] as const).map((s) => (
              <button
                key={s}
                onClick={() => pick("SUM_ODD_EVEN", s)}
                className={clsx(
                  "rounded-xl border border-gold/20 bg-gradient-to-b from-surface-2 to-surface py-4 font-bold text-lg shadow-md hover:border-gold/50 transition",
                  betType === "SUM_ODD_EVEN" && selection === s && "ring-4 ring-gold/70 border-gold scale-[1.03]"
                )}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()} <span className="block text-xs font-normal mt-0.5 text-muted">2X</span>
              </button>
            ))}
          </div>
        )}

        {betTab === "ANY_TRIPLE" && (
          <button
            onClick={() => pick("ANY_TRIPLE", "TRIPLE")}
            className={clsx(
              "w-full rounded-xl py-5 font-bold text-lg transition bg-violet text-[var(--theme-text)] shadow-lg shadow-violet/20 hover:brightness-105",
              betType === "ANY_TRIPLE" && "ring-4 ring-gold/70 scale-[1.02]"
            )}
          >
            All three dice match · 30X
          </button>
        )}
      </section>

      <section className="card-surface rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
        <TabBar
          tabs={[
            { key: "HISTORY", label: "Game history" },
            { key: "CHART", label: "Chart" },
            { key: "MINE", label: "My history" },
          ]}
          active={historyTab}
          onChange={(k) => {
            setHistoryTab(k);
            setHistoryPage(1);
          }}
        />

        {historyTab === "HISTORY" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2 text-[11px] uppercase tracking-wider text-muted px-1">
              <span>Period</span>
              <span>Result</span>
              <span className="text-right">Total</span>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {pagedResults.map((result) => (
                <div key={result.id} className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2 py-2.5">
                  <span className="text-xs font-mono text-muted">#{result.roundNumber}</span>
                  <span className="flex gap-1">
                    <DiceFace value={result.dice1} size="sm" />
                    <DiceFace value={result.dice2} size="sm" />
                    <DiceFace value={result.dice3} size="sm" />
                  </span>
                  <span className="text-right font-semibold">{result.sum}</span>
                </div>
              ))}
              {pagedResults.length === 0 && <p className="text-sm text-muted text-center py-6">No results yet.</p>}
            </div>
            <Pager page={historyPage} pageCount={pageCount} onChange={setHistoryPage} />
          </div>
        )}

        {historyTab === "CHART" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue" /> Big
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-orange" /> Small
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {recentResults.map((r) => (
                <span
                  key={r.id}
                  title={`Round ${r.roundNumber} — sum ${r.sum}`}
                  className={clsx(
                    "aspect-square rounded-md flex items-center justify-center text-[9px] font-semibold text-[var(--theme-text)]",
                    bigSmall(r.sum) === "BIG" ? "bg-blue/70" : "bg-orange/70"
                  )}
                >
                  {r.sum}
                </span>
              ))}
              {recentResults.length === 0 && <p className="col-span-full text-sm text-muted text-center py-6">No results yet.</p>}
            </div>
          </div>
        )}

        {historyTab === "MINE" && (
          <div className="flex flex-col divide-y divide-border">
            {(stateQuery.data?.myBets ?? []).map((bet) => (
              <div key={bet.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-xs text-muted font-mono">Round {bet.roundNumber}</p>
                  <p className="font-medium text-sm">
                    {bet.betType === "SUM_VALUE" ? `Total ${bet.selection}` : bet.betType === "ANY_TRIPLE" ? "Any triple" : bet.selection}
                  </p>
                  <p className="text-sm text-muted">{formatAmount(bet.amount)}</p>
                </div>
                <span
                  className={clsx(
                    "text-xs font-semibold px-2.5 py-1 rounded-full border",
                    bet.status === "PENDING" && "border-gold/40 text-gold bg-gold/10",
                    bet.status === "WON" && "border-green/40 text-green bg-green/10",
                    bet.status === "LOST" && "border-red/40 text-red bg-red/10"
                  )}
                >
                  {bet.status}
                  {bet.status === "WON" ? ` +${bet.payout}` : ""}
                </span>
              </div>
            ))}
            {(stateQuery.data?.myBets ?? []).length === 0 && (
              <p className="text-sm text-muted text-center py-6">No bets placed yet this round.</p>
            )}
          </div>
        )}
      </section>

      {reveal && (() => {
        const myBet = stateQuery.data?.myBets.find((b) => b.roundNumber === reveal.roundNumber);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="modal-in card-surface rounded-2xl p-8 sm:p-10 text-center max-w-xs w-full">
              <p className="text-muted text-sm mb-4">Round #{reveal.roundNumber} result</p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <DiceFace value={reveal.dice1} />
                <DiceFace value={reveal.dice2} />
                <DiceFace value={reveal.dice3} />
              </div>
              <p className="text-muted mb-4">Sum {reveal.sum}</p>
              {myBet && (
                <p className={clsx("text-lg font-bold mb-6", myBet.status === "WON" ? "text-green" : "text-red")}>
                  {myBet.status === "WON" ? `You won ${formatAmount(myBet.payout)}!` : "Better luck next round"}
                </p>
              )}
              <Button variant="secondary" onClick={() => setReveal(null)} className="w-full">
                Skip
              </Button>
            </div>
          </div>
        );
      })()}

      <BetConfirmModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        selectionLabel={selectionLabel}
        payoutLabel={payoutLabel}
        accentClass={accentClass}
        balance={balance}
        mutationFn={(amount) => placeBetAction({ mode, betType, selection, amount })}
        onSuccess={handleBetSuccess}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
}
