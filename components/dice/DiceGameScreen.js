"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import BrandLogo from "@/components/brand/BrandLogo";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getToken } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { getBalance } from "@/lib/walletApi";
import { getDiceConfig } from "@/lib/platformApi";
import { getMyRolls, roll } from "@/lib/diceApi";
import HowToPlayModal from "@/components/games/HowToPlayModal";
import { GameHeader } from "@/components/games/GameHeader";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

const DICE_RULE_SECTIONS = [
  {
    title: "Roll bet",
    items: [
      { label: "Roll Under", detail: "Win if the 0–100 roll lands below your target", tag: "green" },
      { label: "Roll Over", detail: "Win if the 0–100 roll lands above your target", tag: "red" },
    ] },
];

const DICE_RULE_NOTES = [
  "Every bet carries a flat 2% bet fee — a 100 bet has a 98 contract amount, and winnings are multiplied by 98 (contract money).",
  "Payout multiplier = (1 − 0.02) ÷ (win chance ÷ 100) — shown live as you move the target.",
  "Winnings are credited automatically the instant the roll resolves.",
];

const DEFAULT_CFG = {
  minBetAmount: 10,
  maxBetAmount: 100000,
  minTarget: 0.10,
  maxTarget: 99.90,
  houseEdge: 0.03 };

const safeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeRoll = (r) => {
  if (!r) return null;
  const details = r.details || {};
  const rawResult = details.rolledValue ?? r.result ?? r.rollResult ?? 50.00;
  const rawTarget = details.targetValue ?? r.target ?? 50.00;
  const result = Number(rawResult) > 100 ? Number(rawResult) / 100 : Number(rawResult);
  const target = Number(rawTarget) > 100 ? Number(rawTarget) / 100 : Number(rawTarget);
  const condition = details.prediction ?? r.condition ?? "under";
  const status = r.state ?? r.status ?? (r.payout > 0 || r.winAmount > 0 ? "won" : "lost");
  const amount = r.amount ?? r.betAmount ?? 100;
  const winAmount = r.winAmount ?? r.payout ?? 0;
  const profit = r.profit !== undefined ? r.profit : (status === "won" ? winAmount - amount : -amount);
  
  return {
    id: r._id || r.id,
    result: Number(result),
    target: Number(target),
    condition,
    status,
    amount: Number(amount),
    winAmount: Number(winAmount),
    profit: Number(profit) };
};

function GoldDie({ value }) {
  const renderTopPips = () => {
    switch (value) {
      case 1:
        return <circle cx="40" cy="25" r="4" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>;
      case 2:
        return (
          <>
            <circle cx="52" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      case 3:
        return (
          <>
            <circle cx="52" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="40" cy="25" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      case 4:
        return (
          <>
            <circle cx="28" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      case 5:
        return (
          <>
            <circle cx="28" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="40" cy="25" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      case 6:
        return (
          <>
            <circle cx="28" cy="17" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="25" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="33" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="17" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="25" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="33" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="dieGoldTop" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stop-color="#FFFDF2"/>
          <stop offset="35%" stop-color="#FCD974"/>
          <stop offset="80%" stop-color="#C29A21"/>
          <stop offset="100%" stop-color="#84620A"/>
        </radialGradient>
        <linearGradient id="dieGoldLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EAA61E"/>
          <stop offset="60%" stop-color="#B28414"/>
          <stop offset="100%" stop-color="#604605"/>
        </linearGradient>
        <linearGradient id="dieGoldRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF0BE"/>
          <stop offset="50%" stop-color="#CE9B21"/>
          <stop offset="100%" stop-color="#72550D"/>
        </linearGradient>
      </defs>

      {/* Top Face */}
      <polygon points="40,10 70,25 40,40 10,25" fill="url(#dieGoldTop)" stroke="#FFF7D1" strokeWidth="0.5" strokeLinejoin="round"/>
      
      {/* Left Face */}
      <polygon points="10,25 40,40 40,75 10,60" fill="url(#dieGoldLeft)" stroke="#B58D21" strokeWidth="0.5" strokeLinejoin="round"/>
      
      {/* Right Face */}
      <polygon points="70,25 40,40 40,75 70,60" fill="url(#dieGoldRight)" stroke="#FFF7D1" strokeWidth="0.5" strokeLinejoin="round"/>
      
      {/* Inner reflections */}
      <polyline points="10,25 40,40 70,25" fill="none" stroke="#FFFDF5" strokeWidth="0.8" opacity="0.65"/>
      <line x1="40" y1="40" x2="40" y2="75" fill="none" stroke="#FFE9A3" strokeWidth="0.8" opacity="0.55"/>

      {/* Render pips on Top Face */}
      {renderTopPips()}

      {/* Left Face Pips (isometric ellipsis, representing 3) */}
      <g opacity="0.95">
        <ellipse cx="20" cy="40" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="25" cy="50" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="30" cy="60" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
      </g>

      {/* Right Face Pips (isometric ellipsis, representing 4) */}
      <g opacity="0.95">
        <ellipse cx="50" cy="43" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="60" cy="48" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="50" cy="57" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="60" cy="62" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
      </g>
    </svg>
  );
}

export default function DiceGameScreen() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();

  const [mounted, setMounted] = useState(false);
  // Seeded from the last known balance in localStorage so the header never
  // flashes ₹0.00 while the client's own fetch is still in flight.
  const [balance, setBalance] = useState(() => {
    if (typeof window === "undefined") return 0;
    const cached = Number(window.localStorage.getItem("lastBalance"));
    return Number.isFinite(cached) ? cached : 0;
  });
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [myRolls, setMyRolls] = useState([]);
  const [rulesOpen, setRulesOpen] = useState(false);

  const [condition, setCondition] = useState("under"); // under | over
  // Rolls are always whole numbers 1-100 on the server (see diceIsWin in
  // lib/games/logic.ts), which rounds any fractional target to the nearest
  // integer before comparing against the roll. Keeping the UI's target an
  // integer too means the boundary shown to the player always exactly matches
  // the one the server settles against — a fractional target (e.g. "under
  // 49.30") used to get rounded down to 49 server-side, silently turning a
  // roll of 49 (which reads as a win against 49.30) into a loss.
  const [target, setTarget] = useState(50.11);
  const [betAmount, setBetAmount] = useState(10);
 
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [autoPlayOpen, setAutoPlayOpen] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [stopOnDecrease, setStopOnDecrease] = useState(false);
  const [stopOnDecreaseVal, setStopOnDecreaseVal] = useState(100);
  const [stopOnWinExceeds, setStopOnWinExceeds] = useState(false);
  const [stopOnWinExceedsVal, setStopOnWinExceedsVal] = useState(500);
  const [stopOnIncrease, setStopOnIncrease] = useState(false);
  const [stopOnIncreaseVal, setStopOnIncreaseVal] = useState(200);
  const [autoPlayActive, setAutoPlayActive] = useState(false);
  const [autoRoundsLeft, setAutoRoundsLeft] = useState(0);
 
  const startBalanceRef = useRef(0);
  const autoPlayActiveRef = useRef(false);
  const autoRoundsLeftRef = useRef(0);
 
  const [rollingNumber, setRollingNumber] = useState(null);
  const [lastRoll, setLastRoll] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [d1, setD1] = useState(3);
  const [d2, setD2] = useState(4);
 
  const queryClient = useQueryClient();
 
  const bettingLocked = loading || maintenanceMode || blocksAction("bet");
 
  const winChance = useMemo(() => {
    return clamp(safeNumber(target, 50.11), 0.10, 88.18);
  }, [target]);
 
  const multiplier = useMemo(() => {
    return Math.round((0.97 / (winChance / 100)) * 100) / 100;
  }, [winChance]);
 
  const profitOnWin = useMemo(() => betAmount * (multiplier - 1), [betAmount, multiplier]);
 
  const loadData = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [balanceRes, configRes, rollsRes] = await Promise.all([
        getBalance(),
        getDiceConfig().catch(() => ({ data: null })),
        getMyRolls({ limit: 30 }).catch(() => ({ rolls: [] })),
      ]);
 
      const nextBalance = balanceRes?.data?.balance ?? balanceRes?.balance ?? 0;
      setBalance(nextBalance);
      queryClient.setQueryData(["wallet-balance"], nextBalance);
 
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lastBalance", String(nextBalance));
      }
 
      const c = configRes?.data || configRes || {};
      setCfg({
        minBetAmount: safeNumber(c.minBetAmount, DEFAULT_CFG.minBetAmount),
        maxBetAmount: safeNumber(c.maxBetAmount, DEFAULT_CFG.maxBetAmount),
        minTarget: safeNumber(c.minTarget, DEFAULT_CFG.minTarget),
        maxTarget: safeNumber(c.maxTarget, DEFAULT_CFG.maxTarget),
        houseEdge: safeNumber(c.houseEdge, DEFAULT_CFG.houseEdge) });
 
      const rolls = rollsRes?.data?.rolls || rollsRes?.rolls || rollsRes?.data || [];
      setMyRolls((Array.isArray(rolls) ? rolls : []).map(normalizeRoll));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load Dice");
    }
  }, [queryClient]);
 
  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return undefined;
    }
 
    loadData();
 
    let activeSocket = null;
    let cancelled = false;
 
    const onWalletUpdated = (data) => {
      if (typeof data?.balance === "number") {
        setBalance(data.balance);
        queryClient.setQueryData(["wallet-balance"], data.balance);
      }
    };
 
    getSocket().then((socket) => {
      if (!socket || cancelled) return;
      activeSocket = socket;
      socket.emit("join:user");
      socket.on("wallet:updated", onWalletUpdated);
    });
 
    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated", onWalletUpdated);
      }
    };
  }, [loadData, queryClient, router]);
 
  const validate = () => {
    const numericBet = Number(betAmount);
    const numericBalance = Number(balance);
    if (numericBet < cfg.minBetAmount || numericBet > cfg.maxBetAmount) {
      return `Bet amount must be between ₹${cfg.minBetAmount} and ₹${cfg.maxBetAmount.toLocaleString("en-IN")}`;
    }
    if (numericBet > numericBalance) return "Insufficient balance";
    return "";
  };
 
  const setAutoRoundsLeftStateAndRef = (val) => {
    setAutoRoundsLeft(val);
    autoRoundsLeftRef.current = val;
  };
 
  const handleStopAuto = () => {
    setAutoPlayActive(false);
    setAutoRoundsLeftStateAndRef(0);
    autoPlayActiveRef.current = false;
  };
 
  const executeRoll = useCallback(async (activeCondition) => {
    const validation = validate();
    if (validation) {
      setError(validation);
      handleStopAuto();
      return null;
    }
 
    setError("");
    setLoading(true);
 
    // Optimistic balance debit
    setBalance((prev) => {
      const next = prev - betAmount;
      queryClient.setQueryData(["wallet-balance"], next);
      return next;
    });
 
    const spinner = { id: null, stopped: false };
    spinner.id = window.setInterval(() => {
      if (spinner.stopped) return;
      setRollingNumber(Number((Math.random() * 100).toFixed(2)));
    }, 55);
 
    const activeTarget = activeCondition === "under" ? winChance : (100 - winChance - 0.01);
 
    try {
      const payload = {
        amount: betAmount,
        condition: activeCondition,
        target: Math.round(activeTarget * 100),
        clientRollId: `dc_${Date.now()}` };
 
      const res = await roll(payload);
      const rawRollData = res?.data || res;
      const rollData = normalizeRoll(rawRollData);
      
      await new Promise((resolve) => setTimeout(resolve, 600));
 
      let finalBalance = balance - betAmount;
      if (rollData) {
        spinner.stopped = true;
        if (spinner.id) window.clearInterval(spinner.id);
        setRollingNumber(null);
 
        setLastRoll(rollData);
        setMyRolls((prev) => [rollData, ...prev].slice(0, 30));
 
        if (rollData.status === "won") {
          finalBalance += rollData.winAmount;
        }
      }
 
      const updatedBalance = res?.data?.balance ?? res?.balance ?? finalBalance;
      setBalance(updatedBalance);
      queryClient.setQueryData(["wallet-balance"], updatedBalance);
 
      // Handle Auto Play recursion
      if (autoPlayActiveRef.current && autoRoundsLeftRef.current > 1) {
        const nextRounds = autoRoundsLeftRef.current - 1;
        setAutoRoundsLeftStateAndRef(nextRounds);
 
        const diff = updatedBalance - startBalanceRef.current;
        let shouldStop = false;
        if (stopOnDecrease && diff <= -Number(stopOnDecreaseVal)) {
          shouldStop = true;
          setError(`Auto stopped: Loss limit reached (-₹${stopOnDecreaseVal})`);
        }
        if (stopOnIncrease && diff >= Number(stopOnIncreaseVal)) {
          shouldStop = true;
          setError(`Auto stopped: Profit target reached (+₹${stopOnIncreaseVal})`);
        }
        if (stopOnWinExceeds && rollData && rollData.status === "won" && rollData.winAmount >= Number(stopOnWinExceedsVal)) {
          shouldStop = true;
          setError(`Auto stopped: Single win limit exceeded (₹${stopOnWinExceedsVal})`);
        }
 
        if (shouldStop) {
          handleStopAuto();
        } else {
          setTimeout(() => {
            if (autoPlayActiveRef.current) {
              executeRoll(activeCondition);
            }
          }, 900);
        }
      } else if (autoPlayActiveRef.current) {
        handleStopAuto();
      }
 
      return rollData;
    } catch (err) {
      setError(err.response?.data?.message || "Roll failed");
      handleStopAuto();
      return null;
    } finally {
      spinner.stopped = true;
      if (spinner.id) window.clearInterval(spinner.id);
      setRollingNumber(null);
      setLoading(false);
    }
  }, [betAmount, balance, winChance, queryClient, stopOnDecrease, stopOnDecreaseVal, stopOnIncrease, stopOnIncreaseVal, stopOnWinExceeds, stopOnWinExceedsVal]);
 
  const handleRollClick = async (overrideCondition) => {
    if (autoPlayActive) {
      handleStopAuto();
      return;
    }
    if (bettingLocked) return;
    setCondition(overrideCondition);
    await executeRoll(overrideCondition);
  };
 
  const handleStartAuto = () => {
    if (bettingLocked) return;
    setAutoPlayOpen(false);
    setAutoPlayActive(true);
    autoPlayActiveRef.current = true;
    setAutoRoundsLeftStateAndRef(autoRounds);
    startBalanceRef.current = balance;
    executeRoll(condition);
  };
 
  const rollDisplay = rollingNumber !== null ? rollingNumber : lastRoll ? lastRoll.result : 50.00;
 
  const handlePosition = useMemo(() => {
    if (rollingNumber !== null) return rollingNumber;
    if (lastRoll !== null) return lastRoll.result;
    return 50.00;
  }, [rollingNumber, lastRoll]);
 
  const topTrackBackground = useMemo(() => {
    const overTarget = 100 - winChance - 0.01;
    return `linear-gradient(to right, #be123c 0%, #be123c ${overTarget}%, #3b82f6 ${overTarget}%, #3b82f6 100%)`;
  }, [winChance]);
 
  const bottomTrackBackground = useMemo(() => {
    return `var(--theme-primary)`;
  }, [winChance]);
 
  const thumbPercent = useMemo(() => {
    return (((88.28 - winChance) - 0.10) / (88.18 - 0.10)) * 100;
  }, [winChance]);
 
  const miniTrackBackground = useMemo(() => {
    return `linear-gradient(to right, var(--ln-gold) 0%, var(--ln-gold) ${thumbPercent}%, #21262d ${thumbPercent}%, #21262d 100%)`;
  }, [thumbPercent]);
 
  if (!mounted) {
    return (
      <main className="dice-game">
        <div className="dc-msg">Loading...</div>
      </main>
    );
  }
 
  return (
    <main className="dice-game">
      <GameHeader
        title="Dice"
        durations={null}
        activeDuration={null}
        durationHrefPrefix=""
      />
 
      <HowToPlayModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        kicker="Dice"
        sections={DICE_RULE_SECTIONS}
        notes={DICE_RULE_NOTES}
      />
 
      {error && <div className="auth-error dc-msg">{error}</div>}
 
      <section className="dc-board-stage">
        {/* Real-time roll history bar */}
        <div className="sp-dc-history-bar">
          <div className="sp-dc-history-scroll">
            {myRolls.slice(0, 10).map((r, i) => {
              const val = safeNumber(r.result, 50);
              const isWin = r.status === "won" || r.profit > 0;
              return (
                <span 
                  key={r.id || r._id || i} 
                  className={`sp-dc-history-pill ${isWin ? "high" : "low"}`}
                >
                  {val.toFixed(2)}
                </span>
              );
            })}
          </div>
          <button 
            type="button" 
            className="sp-dc-history-toggle-btn"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sp-dc-clock-icon"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span className="sp-dc-chevron">▼</span>
          </button>
        </div>
 
        {/* Roll outcome main screen display */}
        <div className="dc-outcome-card">
          {/* Seed Bar */}
          <div className="sp-dc-seed-bar">
            <span className="sp-dc-seed-text">Encrypted Result: 960a8ceda24a5d92ffd640864233f7e10...</span>
            <button className="sp-dc-seed-btn-icon" type="button">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button className="sp-dc-seed-btn-icon" type="button">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </button>
          </div>
 
          <div className="dc-outcome-main-row">
            {/* Large Roll Value */}
            <div className="dc-outcome-value">
              {typeof rollDisplay === "number" ? rollDisplay.toFixed(2) : rollDisplay}
            </div>
          </div>
 
          {/* Double Track representation of win/loss zones */}
          <div className="sp-dc-slider-container">
            <div className="sp-dc-double-track">
              <div className="sp-dc-track sp-dc-track-top" style={{ background: topTrackBackground }} />
              <div className="sp-dc-track sp-dc-track-bottom" style={{ background: bottomTrackBackground }} />
              <div className="sp-dc-handle" style={{ left: `${handlePosition}%` }}>
                <span className="sp-dc-handle-dot" />
              </div>
            </div>
            <div className="sp-dc-slider-labels">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
        </div>
 
        {/* Payout & win stats capsule pill card */}
        <div className="sp-dc-payout-box">
          <div className="sp-dc-payout-row">
            <div className="sp-dc-payout-col">
              <span className="sp-dc-label">Payout</span>
              <div className="sp-dc-value-badge">{multiplier.toFixed(2)} x</div>
            </div>
            
            <div className="sp-dc-slider-wrapper">
              <div className="sp-dc-mini-track" style={{ background: miniTrackBackground }}>
                <div className="sp-dc-mini-thumb" style={{ left: `${thumbPercent}%` }}>
                  &lt;&gt;
                </div>
                <input 
                  type="range"
                  className="sp-dc-mini-range-native"
                  min={0.10}
                  max={88.18}
                  step={0.01}
                  value={Number((88.28 - winChance).toFixed(2))}
                  disabled={bettingLocked || autoPlayActive}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTarget(Number((88.28 - val).toFixed(2)));
                  }}
                />
              </div>
              <div className="sp-dc-ruler-ticks">
                {Array.from({ length: 41 }).map((_, i) => (
                  <span key={i} className="sp-dc-tick-line" />
                ))}
              </div>
            </div>
          </div>
          <div className="sp-dc-metrics-sub">
            <span className="sp-dc-pot-win">Potential win: <strong>{(betAmount * multiplier).toFixed(2)} INR</strong></span>
            <span className="sp-dc-chance">Chance: <strong>{winChance.toFixed(2)} %</strong></span>
          </div>
        </div>
 
        {/* Control bar row */}
        <div className="sp-dc-control-row" style={{ position: "relative" }}>
          {/* Bet Picker capsule */}
          <div className="dc-bet-wrapper">
            <div className="dc-bet-input-pill">
              <span className="dc-bet-pill-label">Bet</span>
              <input 
                type="number" 
                value={betAmount} 
                disabled={bettingLocked || autoPlayActive}
                onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value) || 0))} 
                className="dc-bet-pill-input"
              />
            </div>
            <button 
              type="button" 
              className="dc-circle-bet-btn"
              disabled={bettingLocked || autoPlayActive}
              onClick={() => setBetAmount(prev => Math.max(cfg.minBetAmount, prev - 10))}
            >
              -
            </button>
            <button 
              type="button" 
              className="dc-circle-bet-btn"
              disabled={bettingLocked || autoPlayActive}
              onClick={() => setPresetsOpen(!presetsOpen)}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button 
              type="button" 
              className="dc-circle-bet-btn"
              disabled={bettingLocked || autoPlayActive}
              onClick={() => setBetAmount(prev => Math.min(cfg.maxBetAmount, prev + 10))}
            >
              +
            </button>
          </div>
 
          {/* Auto play toggle button */}
          <button 
            type="button" 
            className="dc-auto-btn"
            onClick={() => {
              if (autoPlayActive) {
                handleStopAuto();
              } else {
                setAutoPlayOpen(true);
              }
            }}
            disabled={bettingLocked && !autoPlayActive}
            style={{ background: autoPlayActive ? "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)" : "#0066ff" }}
          >
            {autoPlayActive ? (
              <span style={{ fontSize: "9px", fontWeight: "900" }}>STOP</span>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            )}
          </button>
 
          {/* Roll Under Button */}
          <button 
            type="button" 
            className="dc-roll-btn-double under" 
            disabled={bettingLocked && !autoPlayActive} 
            onClick={() => handleRollClick("under")}
          >
            <svg className="dc-roll-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
            <span className="dc-roll-btn-label">{winChance.toFixed(2)}</span>
          </button>
 
          {/* Roll Over Button */}
          <button 
            type="button" 
            className="dc-roll-btn-double over" 
            disabled={bettingLocked && !autoPlayActive} 
            onClick={() => handleRollClick("over")}
          >
            <svg className="dc-roll-arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            <span className="dc-roll-btn-label">{(100 - winChance - 0.01).toFixed(2)}</span>
          </button>
 
          {/* Presets Popover */}
          {presetsOpen && (
            <div className="dc-presets-popover">
              <div className="dc-presets-title">Select Preset</div>
              <div className="dc-presets-grid">
                {[10, 20, 50, 100, 200, 500, 1000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="dc-preset-item"
                    onClick={() => {
                      setBetAmount(preset);
                      setPresetsOpen(false);
                    }}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
 
      {/* Auto Play Overlay Modal */}
      {autoPlayOpen && (
        <div className="dc-autoplay-overlay">
          <div className="dc-autoplay-modal">
            <div className="dc-autoplay-header">
              <span className="dc-autoplay-title">AUTO PLAY</span>
              <button 
                type="button" 
                className="dc-autoplay-close-btn"
                onClick={() => setAutoPlayOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
 
            <div className="dc-autoplay-section-title">NUMBER OF ROUNDS</div>
            <div className="dc-autoplay-rounds-grid">
              {[10, 30, 50, 100].map((r) => (
                <button
                  key={r}
                  type="button"
                  className="dc-autoplay-round-pill"
                  onClick={() => setAutoRounds(r)}
                  style={{ borderColor: autoRounds === r ? "#22c55e" : "#30363d" }}
                >
                  <span className={autoRounds === r ? "dc-autoplay-dot-active" : "dc-autoplay-dot"} />
                  {r} Rounds
                </button>
              ))}
            </div>
 
            <div className="dc-autoplay-condition-row">
              <div className="dc-autoplay-condition-label-box">
                <input 
                  type="checkbox"
                  checked={stopOnDecrease}
                  onChange={(e) => setStopOnDecrease(e.target.checked)}
                />
                <span className="dc-autoplay-condition-label">Stop if cash decreases by</span>
              </div>
              <div className="dc-autoplay-controls">
                <button 
                  type="button"
                  className="dc-autoplay-circle-btn"
                  onClick={() => setStopOnDecreaseVal(p => Math.max(10, p - 50))}
                >
                  -
                </button>
                <input 
                  type="number"
                  className="dc-autoplay-value-input"
                  value={stopOnDecreaseVal}
                  onChange={(e) => setStopOnDecreaseVal(Math.max(0, Number(e.target.value) || 0))}
                />
                <button 
                  type="button"
                  className="dc-autoplay-circle-btn"
                  onClick={() => setStopOnDecreaseVal(p => p + 50)}
                >
                  +
                </button>
              </div>
            </div>
 
            <div className="dc-autoplay-condition-row">
              <div className="dc-autoplay-condition-label-box">
                <input 
                  type="checkbox"
                  checked={stopOnWinExceeds}
                  onChange={(e) => setStopOnWinExceeds(e.target.checked)}
                />
                <span className="dc-autoplay-condition-label">Stop if single win exceeds</span>
              </div>
              <div className="dc-autoplay-controls">
                <button 
                  type="button"
                  className="dc-autoplay-circle-btn"
                  onClick={() => setStopOnWinExceedsVal(p => Math.max(10, p - 100))}
                >
                  -
                </button>
                <input 
                  type="number"
                  className="dc-autoplay-value-input"
                  value={stopOnWinExceedsVal}
                  onChange={(e) => setStopOnWinExceedsVal(Math.max(0, Number(e.target.value) || 0))}
                />
                <button 
                  type="button"
                  className="dc-autoplay-circle-btn"
                  onClick={() => setStopOnWinExceedsVal(p => p + 100)}
                >
                  +
                </button>
              </div>
            </div>
 
            <div className="dc-autoplay-condition-row">
              <div className="dc-autoplay-condition-label-box">
                <input 
                  type="checkbox"
                  checked={stopOnIncrease}
                  onChange={(e) => setStopOnIncrease(e.target.checked)}
                />
                <span className="dc-autoplay-condition-label">Stop if cash increases by</span>
              </div>
              <div className="dc-autoplay-controls">
                <button 
                  type="button"
                  className="dc-autoplay-circle-btn"
                  onClick={() => setStopOnIncreaseVal(p => Math.max(10, p - 50))}
                >
                  -
                </button>
                <input 
                  type="number"
                  className="dc-autoplay-value-input"
                  value={stopOnIncreaseVal}
                  onChange={(e) => setStopOnIncreaseVal(Math.max(0, Number(e.target.value) || 0))}
                />
                <button 
                  type="button"
                  className="dc-autoplay-circle-btn"
                  onClick={() => setStopOnIncreaseVal(p => p + 50)}
                >
                  +
                </button>
              </div>
            </div>
 
            <button 
              type="button"
              className="dc-roll-btn-double under"
              style={{ width: "100%", height: "40px", marginTop: "12px" }}
              onClick={handleStartAuto}
            >
              Start Autoplay
            </button>
          </div>
        </div>
      )}
 
      {historyOpen && (
        <section className="dc-history">
          <h2>Roll history</h2>
          <table className="dc-table">
            <thead>
              <tr>
                <th>Roll</th>
                <th>Target</th>
                <th>Status</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {myRolls.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: "var(--theme-text-dim)", padding: "0.875rem 0.25rem" }}>
                    No rolls yet
                  </td>
                </tr>
              ) : (
              myRolls.slice(0, 25).map((r) => {
                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "monospace", color: "var(--theme-text-muted)" }}>
                      {r.result.toFixed(2)}
                    </td>
                    <td>
                      {r.condition} {r.target.toFixed(2)}
                    </td>
                    <td>
                      <span className={`dc-pill ${r.status === "won" ? "win" : "loss"}`}>{r.status}</span>
                    </td>
                    <td style={{ color: r.profit >= 0 ? "#86efac" : "var(--theme-danger-text)", fontWeight: 800 }}>
                      {r.profit >= 0 ? "+" : "−"}₹{Math.abs(r.profit).toFixed(2)}
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </section>
      )}
 
      <BottomNav />
    </main>
  );
}

