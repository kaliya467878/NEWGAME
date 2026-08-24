"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { formatAmount } from "@/lib/format";
import { colorChips, ballClass, numberBallClasses } from "@/lib/wingo/rounds";
import { placeBetAction } from "@/lib/actions/wingo";
import { Button } from "@/components/ui/Button";
import { RoundTimer } from "@/components/ui/RoundTimer";
import { TabBar } from "@/components/ui/TabBar";
import { Pager } from "@/components/ui/Pager";
import { BetConfirmModal } from "@/components/games/BetConfirmModal";
import { useToasts, ToastStack } from "@/components/ui/Toast";
import { Lock } from "lucide-react";

type WingoBetDto = {
  id: string;
  roundNumber: number;
  betType: "NUMBER" | "COLOR" | "BIG_SMALL";
  selection: string;
  amount: number;
  status: "PENDING" | "WON" | "LOST";
  payout: number;
};

type WingoResultDto = {
  id: string;
  roundNumber: number;
  number: number;
  color: string;
  size: "BIG" | "SMALL";
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
  recentResults: WingoResultDto[];
  myBets: WingoBetDto[];
};

const NUMBERS = Array.from({ length: 10 }, (_, i) => i);
const HISTORY_PAGE_SIZE = 5;

async function fetchState(mode: string): Promise<StateDto> {
  const res = await fetch(`/api/wingo/${mode}/state`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load round state");
  return res.json();
}

async function fetchBalance(): Promise<number> {
  const res = await fetch("/api/wallet/summary", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load balance");
  const data = await res.json();
  return data.balance;
}

function ResultBall({ result, size = "md" }: { result: WingoResultDto; size?: "sm" | "md" | "lg" }) {
  const chips = colorChips(result.color);
  const dims = size === "lg" ? "h-16 w-16 sm:h-20 sm:w-20 text-2xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-base";
  const primary = chips[0];
  return (
    <span
      className={clsx(
        "rounded-full flex items-center justify-center font-bold shadow-lg",
        dims,
        ballClass(primary),
        chips.length > 1 && "ring-2 ring-violet ring-offset-2 ring-offset-background"
      )}
    >
      {result.number}
    </span>
  );
}

export function GameBoard({ mode, modeLabel }: { mode: string; modeLabel: string }) {
  const queryClient = useQueryClient();
  const [betType, setBetType] = useState<"NUMBER" | "COLOR" | "BIG_SMALL">("COLOR");
  const [selection, setSelection] = useState<string>("GREEN");
  const [modalOpen, setModalOpen] = useState(false);
  const [reveal, setReveal] = useState<WingoResultDto | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [historyTab, setHistoryTab] = useState<"HISTORY" | "CHART" | "MINE">("HISTORY");
  const [historyPage, setHistoryPage] = useState(1);
  const { toasts, push: pushToast } = useToasts();

  const clockOffsetRef = useRef(0);
  const previousRoundRef = useRef<number | null>(null);

  const stateQuery = useQuery({
    queryKey: ["wingo-state", mode],
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
    if (betType === "NUMBER") return `Number ${selection}`;
    if (betType === "BIG_SMALL") return selection;
    return selection.charAt(0) + selection.slice(1).toLowerCase();
  }, [betType, selection]);

  const payoutLabel = useMemo(() => {
    if (betType === "NUMBER") return "9× payout if this number hits";
    if (betType === "BIG_SMALL") return "2× payout";
    if (selection === "VIOLET") return "4.5× payout";
    return "2× payout (1.5× if violet also hits)";
  }, [betType, selection]);

  const accentClass = useMemo(() => {
    if (betType === "COLOR") {
      if (selection === "GREEN") return "text-green";
      if (selection === "RED") return "text-red";
      return "text-violet";
    }
    if (betType === "BIG_SMALL") return selection === "BIG" ? "text-blue" : "text-orange";
    return "text-gold";
  }, [betType, selection]);

  function pick(type: typeof betType, value: string) {
    if (locked) return;
    setBetType(type);
    setSelection(value);
    setModalOpen(true);
  }

  function handleBetSuccess() {
    queryClient.invalidateQueries({ queryKey: ["wingo-state", mode] });
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

      <section className="card-surface rounded-2xl p-5 sm:p-6 flex items-center justify-center gap-3">
        {recentResults.slice(0, 5).map((r, i) => (
          <ResultBall key={r.id} result={r} size={i === 0 ? "lg" : "md"} />
        ))}
        {recentResults.length === 0 && <p className="text-sm text-muted py-6">No results yet.</p>}
      </section>

      <section className={clsx("card-surface rounded-2xl p-5 sm:p-6 relative overflow-hidden flex flex-col gap-5", locked && "opacity-70")}>
        {locked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            <div className="rounded-full bg-red/20 border border-red/50 px-6 py-3 text-red font-semibold tracking-wide animate-pulse flex items-center gap-1.5">
              <Lock size={16} /> Betting locked
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => pick("COLOR", "GREEN")}
            className={clsx(
              "rounded-xl py-4 font-bold text-lg transition bg-green text-black shadow-lg shadow-green/20 hover:brightness-105",
              betType === "COLOR" && selection === "GREEN" && "ring-4 ring-gold/70 scale-[1.03]"
            )}
          >
            Green
          </button>
          <button
            onClick={() => pick("COLOR", "VIOLET")}
            className={clsx(
              "rounded-xl py-4 font-bold text-lg transition bg-violet text-[var(--theme-text)] shadow-lg shadow-violet/20 hover:brightness-105",
              betType === "COLOR" && selection === "VIOLET" && "ring-4 ring-gold/70 scale-[1.03]"
            )}
          >
            Violet
          </button>
          <button
            onClick={() => pick("COLOR", "RED")}
            className={clsx(
              "rounded-xl py-4 font-bold text-lg transition bg-red text-[var(--theme-text)] shadow-lg shadow-red/20 hover:brightness-105",
              betType === "COLOR" && selection === "RED" && "ring-4 ring-gold/70 scale-[1.03]"
            )}
          >
            Red
          </button>
        </div>

        <div>
          <p className="text-xs text-muted mb-3">Number</p>
          <div className="grid grid-cols-5 gap-2">
            {NUMBERS.map((n) => {
              const { primaryClass, twoTone } = numberBallClasses(n);
              return (
                <button
                  key={n}
                  onClick={() => pick("NUMBER", String(n))}
                  className={clsx(
                    "aspect-square rounded-full font-bold text-lg shadow-md transition hover:brightness-105",
                    primaryClass,
                    twoTone && "ring-2 ring-violet ring-offset-2 ring-offset-background",
                    betType === "NUMBER" && selection === String(n) && "ring-4 ring-gold/70 scale-[1.06]"
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => pick("BIG_SMALL", "BIG")}
            className={clsx(
              "rounded-xl py-4 font-bold text-lg transition bg-blue text-[var(--theme-text)] shadow-lg shadow-blue/20 hover:brightness-105",
              betType === "BIG_SMALL" && selection === "BIG" && "ring-4 ring-gold/70 scale-[1.03]"
            )}
          >
            Big
          </button>
          <button
            onClick={() => pick("BIG_SMALL", "SMALL")}
            className={clsx(
              "rounded-xl py-4 font-bold text-lg transition bg-orange text-[var(--theme-text)] shadow-lg shadow-orange/20 hover:brightness-105",
              betType === "BIG_SMALL" && selection === "SMALL" && "ring-4 ring-gold/70 scale-[1.03]"
            )}
          >
            Small
          </button>
        </div>
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
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[11px] uppercase tracking-wider text-muted px-1">
              <span>Period</span>
              <span>Number</span>
              <span>Big/Small</span>
              <span className="text-right">Color</span>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {pagedResults.map((result) => (
                <div key={result.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 py-2.5">
                  <span className="text-xs font-mono text-muted">#{result.roundNumber}</span>
                  <span className="font-bold text-lg text-center w-8">{result.number}</span>
                  <span className="text-xs text-muted text-center w-14">{result.size}</span>
                  <span className="flex justify-end gap-1">
                    {colorChips(result.color).map((chip) => (
                      <span key={chip} className={clsx("h-4 w-4 rounded-full", ballClass(chip))} />
                    ))}
                  </span>
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
                <span className="h-2.5 w-2.5 rounded-full bg-green" /> Green
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-violet" /> Violet
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red" /> Red
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1.5">
              {recentResults.map((r) => (
                <span
                  key={r.id}
                  title={`Round ${r.roundNumber} — number ${r.number}`}
                  className={clsx(
                    "aspect-square rounded-md flex items-center justify-center text-[9px] font-semibold",
                    ballClass(colorChips(r.color)[0])
                  )}
                >
                  {r.number}
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
                  <p className="font-medium text-sm">{bet.betType === "NUMBER" ? `Number ${bet.selection}` : bet.selection}</p>
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
                  {bet.status === "WON" ? ` +${formatAmount(bet.payout)}` : ""}
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
              <div className="flex justify-center mb-4">
                <ResultBall result={reveal} size="lg" />
              </div>
              <p className="text-muted mb-4">{reveal.size}</p>
              {myBet && (
                <p
                  className={clsx(
                    "text-lg font-bold mb-6",
                    myBet.status === "WON" ? "text-green" : "text-red"
                  )}
                >
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
