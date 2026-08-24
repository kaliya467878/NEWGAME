"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { formatAmount } from "@/lib/format";
import { placeBetAction } from "@/lib/actions/fived";
import { getAnnouncements } from "@/lib/platformApi";
import { RoundTimer } from "@/components/ui/RoundTimer";
import { TabBar } from "@/components/ui/TabBar";
import { Pager } from "@/components/ui/Pager";
import { BetConfirmModal } from "@/components/games/BetConfirmModal";
import { useToasts, ToastStack } from "@/components/ui/Toast";
import { Lock } from "lucide-react";
import OutcomePopup from "@/components/games/OutcomePopup";
import HowToPlayModal from "@/components/games/HowToPlayModal";
import { FiveDReel } from "./FiveDReel";
import FiveDTrendChart from "./FiveDTrendChart";
import { getSocket } from "@/lib/socket";

const POSITIONS = ["A", "B", "C", "D", "E"] as const;
const DIGITS = Array.from({ length: 10 }, (_, i) => i);
const HISTORY_PAGE_SIZE = 5;
const SELECTOR_TABS = [...POSITIONS, "SUM"] as const;
type SelectorTab = (typeof SELECTOR_TABS)[number];

const FIVED_RULE_SECTIONS = [
  {
    title: "Position bets",
    items: [
      { label: "A / B / C / D / E", detail: "Pick a digit (0–9) for one of the 5 dice positions", tag: "gold", payout: "9x" },
    ],
  },
  {
    title: "Sum bets",
    items: [
      { label: "Big", detail: "Sum of all 5 dice is 23–45", tag: "blue", payout: "2x" },
      { label: "Small", detail: "Sum of all 5 dice is 0–22", tag: "orange", payout: "2x" },
      { label: "Odd", detail: "Sum of all 5 dice is odd", tag: "red", payout: "2x" },
      { label: "Even", detail: "Sum of all 5 dice is even", tag: "green", payout: "2x" },
    ],
  },
];

const FIVED_RULE_NOTES = [
  "Bets lock a few seconds before the round ends.",
  "Every bet carries a flat 2% bet fee — a 100 bet has a 98 contract amount, and winnings are multiplied by 98 (contract money).",
  "Payout multiplier for Position (digit) bets is 9x (98 contract amount × 9x = 882).",
  "Payout multiplier for Sum Big/Small/Odd/Even bets is 2x (98 contract amount × 2x = 196).",
  "Winnings are credited automatically once the round settles.",
];

type FiveDBetDto = {
  id: string;
  roundNumber: string;
  betType: "POSITION_NUMBER" | "SUM_BIG_SMALL" | "SUM_ODD_EVEN";
  selection: string;
  amount: number;
  status: "PENDING" | "WON" | "LOST";
  payout: number;
  createdAt?: string;
};

type FiveDResultDto = {
  id: string;
  roundNumber: string;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  sum: number;
  settledAt: string;
};

type StateDto = {
  mode: string;
  roundNumber: string;
  serverTime: number;
  startsAt: number;
  endsAt: number;
  locksAt: number;
  locked: boolean;
  durationSeconds: number;
  recentResults: FiveDResultDto[];
  myBets: FiveDBetDto[];
};

function sumBigSmall(sum: number): "BIG" | "SMALL" {
  return sum >= 23 ? "BIG" : "SMALL";
}

async function fetchState(mode: string): Promise<StateDto> {
  const res = await fetch(`/api/fived/${mode}/state`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load round state");
  return res.json();
}

async function fetchBalance(): Promise<number> {
  try {
    const res = await fetch("/api/wallet/summary", { cache: "no-store" });
    if (!res.ok) {
      if (typeof window !== "undefined") {
        const cached = Number(window.localStorage.getItem("lastBalance"));
        if (Number.isFinite(cached)) return cached;
      }
      return 0;
    }
    const data = await res.json();
    return data.balance;
  } catch (err) {
    console.error("fetchBalance failed:", err);
    if (typeof window !== "undefined") {
      const cached = Number(window.localStorage.getItem("lastBalance"));
      if (Number.isFinite(cached)) return cached;
    }
    return 0;
  }
}

function ResultBalls({ result }: { result: FiveDResultDto }) {
  const digits = [result.a, result.b, result.c, result.d, result.e];
  return (
    <div className="flex gap-1">
      {digits.map((d, i) => (
        <span
          key={i}
          className="h-7 w-7 rounded-full bg-gradient-to-b from-surface-2 to-surface border border-gold/30 flex items-center justify-center text-xs font-bold text-gold"
        >
          {d}
        </span>
      ))}
    </div>
  );
}

// Wallet card + announcement banner, matching the reference layout's top
// section. Deposit/Withdraw are plain navigation to the existing wallet
// pages — no new balance logic, just links, so this stays a pure UI addition
// on top of the same balanceQuery already used by the rest of the board.
function WalletAndAnnouncement({
  balance,
  onRefresh,
  refreshing,
}: {
  balance: number;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const announcementQuery = useQuery({
    queryKey: ["platform-announcements"],
    queryFn: getAnnouncements,
    staleTime: 60_000,
  });
  const announcement = announcementQuery.data?.data?.[0]?.content;

  return (
    <div className="flex flex-col gap-3">
      <section className="card-surface rounded-2xl p-5 sm:p-6 flex flex-col items-center gap-4">
        <div className="w-full flex items-center justify-center relative">
          <div className="flex flex-col items-center gap-1">
            <span suppressHydrationWarning className="text-2xl font-bold text-gold">
              ₹{balance.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs text-muted flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="14" rx="2" />
                <path d="M16 12h.01M2 10h20" />
              </svg>
              Wallet balance
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh balance"
            className="absolute right-0 top-0 text-gold hover:text-gold-light transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
              className={refreshing ? "animate-spin" : ""}>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
        <div className="w-full grid grid-cols-2 gap-3">
          <Link
            href="/wallet/withdraw"
            className="rounded-xl py-3 text-center text-sm font-semibold border border-red/40 text-red bg-red/10 hover:bg-red/15 transition"
          >
            Withdraw
          </Link>
          <Link
            href="/wallet/deposit"
            className="rounded-xl py-3 text-center text-sm font-semibold border border-gold/50 bg-gradient-to-r from-gold-light to-gold text-dark hover:brightness-105 transition"
          >
            Deposit
          </Link>
        </div>
      </section>

      {announcement && (
        <section className="card-surface rounded-2xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(212, 175, 55, 0.25)" }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <div className="flex-1 overflow-hidden" style={{ display: "block" }}>
            {React.createElement(
              "marquee",
              {
                scrollamount: "3.5",
                style: { color: "#a1a1aa", fontSize: "12px", display: "block", whiteSpace: "nowrap" }
              },
              announcement
            )}
          </div>
          <span className="text-xs font-semibold text-gold shrink-0 cursor-pointer">Detail</span>
        </section>
      )}
    </div>
  );
}

export function GameBoard({ mode, modeLabel }: { mode: string; modeLabel: string }) {
  const queryClient = useQueryClient();
  const [selectorTab, setSelectorTab] = useState<SelectorTab>("A");
  const [betType, setBetType] = useState<FiveDBetDto["betType"]>("POSITION_NUMBER");
  const [selection, setSelection] = useState<string>("");
  const [subTab, setSubTab] = useState<"BIG_SMALL" | "ODD_EVEN">("BIG_SMALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [reveal, setReveal] = useState<FiveDResultDto | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [historyTab, setHistoryTab] = useState<"HISTORY" | "CHART" | "MINE">("HISTORY");
  const [historyPage, setHistoryPage] = useState(1);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  const [centerToast, setCenterToast] = useState<{ message: string; type: string } | null>(null);
  const { toasts, push: pushToast } = useToasts();

  const clockOffsetRef = useRef(0);
  const previousRoundRef = useRef<string | null>(null);

  const [cachedState, setCachedState] = useState<any>(() => {
    if (typeof window === "undefined") return undefined;
    const cached = window.localStorage.getItem(`fived_state_${mode}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.endsAt && Date.now() < parsed.endsAt) {
          return parsed;
        }
      } catch (e) {}
    }
    return undefined;
  });

  const stateQuery = useQuery({
    queryKey: ["fived-state", mode],
    queryFn: async () => {
      const data = await fetchState(mode);
      const serverBetIds = new Set(data.myBets.map((b: any) => b.id || b._id));
      const cachedData = queryClient.getQueryData<any>(["fived-state", mode]);
      const missingPendingBets = (cachedData?.myBets || []).filter((b: any) => 
        (b.status === "PENDING" || b.status === "pending" || b.state === "pending") && !serverBetIds.has(b.id || b._id)
      );
      data.myBets = [...missingPendingBets, ...data.myBets];
      localStorage.setItem(`fived_state_${mode}`, JSON.stringify(data));
      return data;
    },
    refetchInterval: 2000,
    gcTime: 0,
    placeholderData: cachedState,
  });

  const balanceQuery = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: fetchBalance,
    refetchInterval: 5000,
    enabled: typeof window !== "undefined" && !!window.localStorage.getItem("token"),
    // Paint the last known balance immediately instead of ₹0 while the
    // first fetch is in flight; corrected as soon as the real value lands.
    initialData: () => {
      if (typeof window === "undefined") return undefined;
      const cached = Number(window.localStorage.getItem("lastBalance"));
      return Number.isFinite(cached) && cached > 0 ? cached : undefined;
    },
  });

  useEffect(() => {
    if (typeof window !== "undefined" && typeof balanceQuery.data === "number") {
      window.localStorage.setItem("lastBalance", String(balanceQuery.data));
    }
  }, [balanceQuery.data]);

  useEffect(() => {
    let activeSocket: any = null;
    let cancelled = false;

    getSocket().then((socket) => {
      if (!socket || cancelled) return;
      activeSocket = socket;
      socket.emit("join:user");
      socket.on("wallet:updated", () => {
        queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      });
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated");
      }
    };
  }, [queryClient]);

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
        // Refresh the wallet immediately instead of waiting up to 2s for the
        // next balance poll — a bet of mine just resolved, so the balance
        // may already be stale the instant the round result appears.
        queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      }
    }
    previousRoundRef.current = newRound;
  }, [stateQuery.data]);

  const selectedPosition = betType === "POSITION_NUMBER" ? selection.split(":")[0] : null;
  const remainingMs = stateQuery.data ? stateQuery.data.endsAt - (now + clockOffsetRef.current) : 0;
  const locked = stateQuery.data ? remainingMs <= 5000 : false;
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const secondsDigits = ss.split("");
  const isRolling = stateQuery.data
    ? remainingMs <= 0 && (!stateQuery.data.recentResults?.[0] || stateQuery.data.recentResults[0].roundNumber !== stateQuery.data.roundNumber)
    : false;

  const balance = balanceQuery.data ?? 0;

  const selectionLabel = useMemo(() => {
    if (betType === "POSITION_NUMBER") return `Position ${selection.split(":")[0]} = ${selection.split(":")[1]}`;
    return selection.charAt(0) + selection.slice(1).toLowerCase();
  }, [betType, selection]);

  const payoutLabel = useMemo(() => {
    if (betType === "POSITION_NUMBER") return "8.82x payout";
    return "1.96x payout";
  }, [betType]);

  const accentClass = useMemo(() => {
    if (betType === "SUM_BIG_SMALL") return selection === "BIG" ? "text-blue" : "text-orange";
    return "text-gold";
  }, [betType, selection]);

  function pickSelectorTab(tab: SelectorTab) {
    setSelectorTab(tab);
    if (tab === "SUM") {
      setBetType(subTab === "BIG_SMALL" ? "SUM_BIG_SMALL" : "SUM_ODD_EVEN");
      setSelection("");
    } else {
      setBetType("POSITION_NUMBER");
      setSelection("");
    }
  }

  function pickDigit(pos: (typeof POSITIONS)[number], digit: number) {
    if (locked) return;
    setBetType("POSITION_NUMBER");
    setSelection(`${pos}:${digit}`);
    setModalOpen(true);
  }

  function pickSum(type: "SUM_BIG_SMALL" | "SUM_ODD_EVEN", value: string) {
    if (locked) return;
    setBetType(type);
    setSelection(value);
    setSubTab(type === "SUM_BIG_SMALL" ? "BIG_SMALL" : "ODD_EVEN");
    setModalOpen(true);
  }

  function handleBetSuccess(amount: number, result: any) {
    const betId = result.betId || `opt-${Date.now()}`;
    queryClient.setQueryData(["fived-state", mode], (oldData: any) => {
      if (!oldData) return oldData;
      const newBet = {
        id: betId,
        _id: betId,
        roundNumber: String(stateQuery.data?.roundNumber || ""),
        betType,
        selection,
        amount,
        status: "PENDING",
        state: "pending",
        payout: 0,
        createdAt: new Date().toISOString(),
      };
      return {
        ...oldData,
        myBets: [newBet, ...(oldData.myBets || [])],
      };
    });

    queryClient.invalidateQueries({ queryKey: ["fived-state", mode] });
    queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    setCenterToast({ message: "Bet Successful", type: "success" });
    setTimeout(() => setCenterToast(null), 1000);
    setModalOpen(false);
  }

  if (stateQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <section className="card-surface rounded-2xl p-5 sm:p-6 h-[180px]" />
        <section className="card-surface rounded-2xl p-5 sm:p-6 h-[120px]" />
        <section className="card-surface rounded-2xl p-5 sm:p-6 h-[180px]" />
        <section className="card-surface rounded-2xl p-5 sm:p-6 h-[320px]" />
        <section className="card-surface rounded-2xl p-5 sm:p-6 h-[220px]" />
      </div>
    );
  }

  const recentResults = stateQuery.data?.recentResults ?? [];
  const latestResult = recentResults[0];
  // History period labels are re-anchored to the live round so they always read
  // as one continuous descending run (current-1, current-2, …) even if the
  // stored roundNumber lags the clock. No-op when the backend is fresh.
  const displayResults = recentResults.map((r) => ({
    ...r,
    displayRound: r.roundNumber,
  }));
  const pageCount = Math.max(1, Math.ceil(displayResults.length / HISTORY_PAGE_SIZE));
  const pagedResults = displayResults.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">

      {/* Unified Premium Wingo-style Ticket Layout */}
      <section className="wg-ticket">
        <div className="wg-ticket-left">
          <button
            type="button"
            className="wg-how-play"
            onClick={() => setRulesOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            How to play
          </button>
          <p className="wg-mode-label">{modeLabel} Lottery</p>
          <div className="wg-recent-row">
            {latestResult ? (
              <>
                {([latestResult.a, latestResult.b, latestResult.c, latestResult.d, latestResult.e] as const).map((d, i) => (
                  <span key={i} className="wg-mini-ball" title={POSITIONS[i]}>
                    {d}
                  </span>
                ))}
                <span className="text-[11px] font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded ml-0.5 self-center">
                  {latestResult.sum}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted">Waiting...</span>
            )}
          </div>
        </div>
        <div className="wg-ticket-right">
          <span className="wg-time-label">Time remaining</span>
          <div className="wg-timer">
            <span>{mm}</span>
            <em>:</em>
            <span>{ss}</span>
          </div>
          <p className="wg-period-id">{stateQuery.data ? stateQuery.data.roundNumber.toString() : "-"}</p>
        </div>
      </section>

      <HowToPlayModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        kicker={modeLabel}
        sections={FIVED_RULE_SECTIONS}
        notes={FIVED_RULE_NOTES}
      />

      <section className="card-surface rounded-2xl p-5 sm:p-6 flex flex-col gap-3">
        <div className="k5-dice-stage">
          <div className="k5-dice-arrow left"></div>
          <div className="k5-dice-slots-container">
            {reveal
              ? [reveal.a, reveal.b, reveal.c, reveal.d, reveal.e].map((d, i) => (
                  <div key={i} className="k5-dice-slot">
                    <FiveDReel index={i} value={d} rolling={isRolling} active={selectedPosition === POSITIONS[i]} />
                  </div>
                ))
              : recentResults[0]
              ? [recentResults[0].a, recentResults[0].b, recentResults[0].c, recentResults[0].d, recentResults[0].e].map((d, i) => (
                  <div key={i} className="k5-dice-slot">
                    <FiveDReel index={i} value={d} rolling={isRolling} active={selectedPosition === POSITIONS[i]} />
                  </div>
                ))
              : [0, 0, 0, 0, 0].map((d, i) => (
                  <div key={i} className="k5-dice-slot">
                    <FiveDReel index={i} value={d} rolling={isRolling} active={selectedPosition === POSITIONS[i]} />
                  </div>
                ))}
          </div>
          <div className="k5-dice-arrow right"></div>
        </div>
        {recentResults[0] && (
          <p className="text-center text-xs text-muted mt-1">
            Sum <span className="text-gold font-semibold">{recentResults[0].sum}</span>
          </p>
        )}
      </section>

      <section className={clsx("card-surface rounded-2xl p-5 sm:p-6 relative overflow-hidden flex flex-col gap-5", locked && "opacity-70")}>
        {locked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
            {remainingMs > 0 && remainingMs <= 5000 ? (
              <div className="flex gap-2.5 animate-pulse">
                <div className="wg-countdown-digit">{secondsDigits[0]}</div>
                <div className="wg-countdown-digit">{secondsDigits[1]}</div>
              </div>
            ) : (
              <div className="rounded-full bg-red/20 border border-red/50 px-6 py-3 text-red font-semibold tracking-wide flex items-center justify-center gap-2 animate-pulse">
                <Lock size={18} /> Betting locked
              </div>
            )}
          </div>
        )}

        {/* Single row of A/B/C/D/E/SUM tabs, matching the reference — picking a
            position shows just that position's number grid instead of all 5
            stacked, and SUM shows the existing Big/Small/Odd/Even options. */}
        <div className="grid grid-cols-6 gap-1.5">
          {SELECTOR_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => pickSelectorTab(tab)}
              className={clsx(
                "rounded-xl py-2.5 text-sm font-bold border transition-all duration-200",
                selectorTab === tab
                  ? "border-gold text-dark bg-gradient-to-r from-gold-light to-gold shadow-md"
                  : "border-border text-muted hover:text-foreground bg-surface-2"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {selectorTab !== "SUM" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Position {selectorTab} · 8.82x</span>
              {betType === "POSITION_NUMBER" && selection.startsWith(`${selectorTab}:`) && (
                <span className="text-[10px] text-gold font-medium bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                  Selected: {selection.split(":")[1]}
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2 bg-surface-2 p-2 rounded-xl border border-border">
              {DIGITS.map((n) => {
                const isSelected = betType === "POSITION_NUMBER" && selection === `${selectorTab}:${n}`;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => pickDigit(selectorTab as any, n)}
                    className={clsx(
                      "aspect-square rounded-lg flex flex-col items-center justify-center font-bold transition-all duration-150",
                      isSelected
                        ? "bg-gold text-dark scale-[1.05] ring-2 ring-gold/40 shadow-lg shadow-gold/20"
                        : "text-muted hover:text-[var(--theme-text)] bg-background/40 hover:bg-background/80"
                    )}
                  >
                    <span className="text-base leading-none">{n}</span>
                    <span className="text-[9px] font-medium opacity-70 mt-0.5">8.82X</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {selectorTab === "SUM" && (
          <div className="flex flex-col gap-4">
            <TabBar
              tabs={[
                { key: "BIG_SMALL", label: "Big/Small" },
                { key: "ODD_EVEN", label: "Odd/Even" },
              ]}
              active={subTab}
              onChange={(val) => {
                setSubTab(val as "BIG_SMALL" | "ODD_EVEN");
              }}
            />
            {subTab === "BIG_SMALL" ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => pickSum("SUM_BIG_SMALL", "BIG")}
                  className={clsx(
                    "rounded-xl py-4 font-bold text-lg transition bg-blue text-[var(--theme-text)] shadow-lg shadow-blue/20 hover:brightness-105",
                    betType === "SUM_BIG_SMALL" && selection === "BIG" && "ring-4 ring-gold/70 scale-[1.03]"
                  )}
                >
                  Big (23–45) <span className="block text-xs font-normal mt-0.5 opacity-80">1.96X</span>
                </button>
                <button
                  onClick={() => pickSum("SUM_BIG_SMALL", "SMALL")}
                  className={clsx(
                    "rounded-xl py-4 font-bold text-lg transition bg-orange text-[var(--theme-text)] shadow-lg shadow-orange/20 hover:brightness-105",
                    betType === "SUM_BIG_SMALL" && selection === "SMALL" && "ring-4 ring-gold/70 scale-[1.03]"
                  )}
                >
                  Small (0–22) <span className="block text-xs font-normal mt-0.5 opacity-80">1.96X</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(["ODD", "EVEN"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => pickSum("SUM_ODD_EVEN", s)}
                    className={clsx(
                      "rounded-xl border border-gold/20 bg-gradient-to-b from-surface-2 to-surface py-4 font-bold text-lg shadow-md hover:border-gold/50 transition",
                      betType === "SUM_ODD_EVEN" && selection === s && "ring-4 ring-gold/70 border-gold scale-[1.03]"
                    )}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()} <span className="block text-xs font-normal mt-0.5 text-muted">1.96X</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
            <div className="grid grid-cols-[1fr_2fr_auto] gap-2 text-[11px] uppercase tracking-wider text-muted px-1">
              <span>Period</span>
              <span>Result</span>
              <span className="text-right">Total</span>
            </div>
            <div className="flex flex-col divide-y divide-border">
              {pagedResults.map((result) => (
                <div key={result.id} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2 py-2.5">
                  <span className="text-xs font-mono text-muted">{result.displayRound}</span>
                  <ResultBalls result={result} />
                  <span
                    className={clsx(
                      "text-right font-semibold justify-self-end px-2 py-0.5 rounded-full text-xs",
                      sumBigSmall(result.sum) === "BIG" ? "bg-blue/20 text-blue" : "bg-orange/20 text-orange"
                    )}
                  >
                    {result.sum}
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
            <FiveDTrendChart 
              results={recentResults.map(r => ({ 
                periodId: String(r.roundNumber), 
                resultNumber: "" + r.a + r.b + r.c + r.d + r.e 
              }))} 
            />
          </div>
        )}

        {historyTab === "MINE" && (
          <div className="flex flex-col divide-y divide-border">
            {(stateQuery.data?.myBets ?? []).map((bet) => {
              const isExpanded = expandedBetId === bet.id;
              const isWon = bet.status === "WON";
              const matchedResult = stateQuery.data?.recentResults.find(
                (r) => String(r.roundNumber) === String(bet.roundNumber)
              );
              return (
                <div key={bet.id} className="flex flex-col py-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedBetId(isExpanded ? null : bet.id)}
                  >
                    <div>
                      <p className="text-xs text-muted font-mono">
                        Round {String(bet.roundNumber).slice(-8)} {isExpanded ? "▲" : "▼"}
                      </p>
                      <p className="font-medium text-sm">
                        {bet.betType === "POSITION_NUMBER"
                          ? `Pos ${bet.selection.split(":")[0]} = ${bet.selection.split(":")[1]}`
                          : bet.selection}
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
                      {bet.status === "PENDING" ? "Pending" : bet.status === "WON" ? "Succeed" : "Failed"}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 p-3 bg-surface-2 rounded-xl text-xs space-y-2 border border-border">
                      <div className="text-gold font-bold text-sm mb-1">Details</div>
                      
                      <div className="flex justify-between text-muted">
                        <span>Order ID</span>
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          {bet.id}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(bet.id);
                              alert("Order ID copied successfully!");
                            }}
                            className="text-gold hover:underline p-0.5"
                          >
                            Copy
                          </button>
                        </span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Period</span>
                        <span>{String(bet.roundNumber)}</span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Purchase amount</span>
                        <span>{formatAmount(bet.amount)}</span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Quantity</span>
                        <span>1</span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Contract amount (after fee)</span>
                        <span className="text-red">₹{(bet.amount * 0.99).toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Bet fee (1.0%)</span>
                        <span>₹{(bet.amount * 0.01).toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Result</span>
                        <span>
                          {bet.status !== "PENDING" && matchedResult ? (
                            <span className="font-semibold text-[var(--theme-text)]">
                              [{[matchedResult.a, matchedResult.b, matchedResult.c, matchedResult.d, matchedResult.e].join(", ")}] Sum: {matchedResult.sum}
                            </span>
                          ) : "Pending"}
                        </span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Select</span>
                        <span>
                          {bet.betType === "POSITION_NUMBER"
                            ? `Pos ${bet.selection.split(":")[0]} = ${bet.selection.split(":")[1]}`
                            : bet.selection}
                        </span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Status</span>
                        <span className={clsx(isWon ? "text-green" : bet.status === "PENDING" ? "text-gold" : "text-red")}>
                          {bet.status === "PENDING" ? "Pending" : isWon ? "Succeed" : "Failed"}
                        </span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Win/lose</span>
                        <span className={clsx("font-bold", bet.status === "PENDING" ? "text-zinc-500" : isWon ? "text-green" : "text-red")}>
                          {bet.status === "PENDING" ? "--" : isWon ? `+ ₹${bet.payout.toFixed(2)}` : `- ₹${bet.amount.toFixed(2)}`}
                        </span>
                      </div>

                      <div className="flex justify-between text-muted">
                        <span>Order time</span>
                        <span>{bet.createdAt ? new Date(bet.createdAt).toLocaleString() : "—"}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {(stateQuery.data?.myBets ?? []).length === 0 && (
              <p className="text-sm text-muted text-center py-6">No bets placed yet this round.</p>
            )}
          </div>
        )}
      </section>

      {reveal && (() => {
        const myBet = stateQuery.data?.myBets.find((b) => b.roundNumber === reveal.roundNumber);
        if (!myBet) return null;
        return (
          <OutcomePopup
            show={true}
            onClose={() => setReveal(null)}
            type={myBet.status === "WON" ? "win" : "lose"}
            amount={myBet.status === "WON" ? myBet.payout : myBet.amount}
            gameName="5D"
            periodId={String(reveal.roundNumber)}
            balance={balance}
            resultDetails={
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {[reveal.a, reveal.b, reveal.c, reveal.d, reveal.e].map((d, i) => (
                  <span
                    key={i}
                    style={{
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--theme-bg-card)",
                      border: "1px solid var(--theme-border)",
                      borderRadius: "4px",
                      color: "var(--theme-text)",
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                  >
                    {d}
                  </span>
                ))}
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>=</span>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#FFEAA0" }}>
                  {reveal.sum}
                </span>
                <span style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: reveal.sum >= 23 ? "rgba(212,175,55,0.15)" : "rgba(185,28,28,0.15)",
                  color: reveal.sum >= 23 ? "#FFEAA0" : "#FCA5A5",
                  fontWeight: "700",
                }}>
                  {reveal.sum >= 23 ? "Big" : "Small"}
                </span>
              </div>
            }
          />
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
      {centerToast && (
        <>
          <style>{`
            @keyframes wgToastIn {
              from { opacity: 0; transform: translate(-50%, -45%) scale(0.9); }
              to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
          `}</style>
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 99999,
            background: "var(--theme-bg-card)",
            color: "var(--theme-text)",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "700",
            textAlign: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
            pointerEvents: "none",
            animation: "wgToastIn 0.15s ease-out forwards",
          }}>
            {centerToast.message}
          </div>
        </>
      )}
      <ToastStack toasts={toasts} />
    </div>
  );
}
