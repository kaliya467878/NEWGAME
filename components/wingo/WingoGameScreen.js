"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import {
  getCurrentPeriod,
  getRecentResults,
  placeBet,
  getMyBets } from "@/lib/wingoApi";
import { getBalance } from "@/lib/walletApi";
import { getWingoConfig } from "@/lib/platformApi";
import {
  BASE_AMOUNTS,
  MULTIPLIERS,
  NUMBERS,
  DURATION_SEC,
  colorClass,
  formatTimer,
  getColorDots,
  getDurationMeta,
  getSize,
  getBetTheme,
  getBetSelectionLabel,
  formatBetLabel,
  DURATIONS } from "@/lib/wingoUtils";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { BET_FEE } from "@/lib/wingo/rounds";
import PreSaleRulesModal from "@/components/wingo/PreSaleRulesModal";
import OutcomePopup from "@/components/games/OutcomePopup";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { GameHeader } from "@/components/games/GameHeader";
import { useToasts, ToastStack } from "@/components/ui/Toast";


export default function WingoGameScreen({ initialPeriod = null, initialResults = [] }) {
  const params = useParams();
  const router = useRouter();
  const duration = params.duration;
  const durationMeta = getDurationMeta(duration);
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();
  const { toasts, push: pushToast } = useToasts();

  // Seeded from the last known balance in localStorage so the wallet card
  // never flashes ₹0.00 while the client's own fetch is still in flight.
  const [balance, setBalance] = useState(() => {
    if (typeof window === "undefined") return 0;
    const cached = Number(window.localStorage.getItem("lastBalance"));
    return Number.isFinite(cached) ? cached : 0;
  });
  // Seeded with server-fetched data (see app/wingo/[duration]/page.js) so the
  // period/history are on screen immediately — no empty flash while the
  // client's own fetch is in flight.
  const [period, setPeriod] = useState(() => {
    if (typeof window === "undefined") return initialPeriod;
    const cachedPeriod = window.localStorage.getItem(`wingo_period_${duration}`);
    if (cachedPeriod) {
      try {
        const parsed = JSON.parse(cachedPeriod);
        const elapsed = (Date.now() - (parsed.cachedAt || 0)) / 1000;
        const remaining = (Number(parsed.remainingSeconds) || 0) - elapsed;
        if (remaining > 0) {
          return { ...parsed, remainingSeconds: Math.round(remaining) };
        }
      } catch (e) {}
    }
    return null;
  });
  const [results, setResults] = useState(() => {
    if (typeof window === "undefined") return initialResults;
    const cachedResults = window.localStorage.getItem(`wingo_results_${duration}`);
    if (cachedResults) {
      try {
        return JSON.parse(cachedResults);
      } catch (e) {}
    }
    return [];
  });
  const [myBets, setMyBets] = useState(() => {
    if (typeof window === "undefined") return [];
    const cachedBets = window.localStorage.getItem(`wingo_mybets_${duration}`);
    if (cachedBets) {
      try {
        return JSON.parse(cachedBets);
      } catch (e) {}
    }
    return [];
  });

  const [prevDuration, setPrevDuration] = useState(duration);
  if (duration !== prevDuration) {
    setPrevDuration(duration);
    
    let newPeriod = null;
    let newResults = [];
    let newBets = [];
    
    if (typeof window !== "undefined") {
      const cachedPeriod = window.localStorage.getItem(`wingo_period_${duration}`);
      if (cachedPeriod) {
        try {
          const parsed = JSON.parse(cachedPeriod);
          const elapsed = (Date.now() - (parsed.cachedAt || 0)) / 1000;
          const remaining = (Number(parsed.remainingSeconds) || 0) - elapsed;
          if (remaining > 0) {
            newPeriod = { ...parsed, remainingSeconds: Math.round(remaining) };
            endsAtRef.current = Date.now() + remaining * 1000;
          }
        } catch (e) {}
      }
      const cachedResults = window.localStorage.getItem(`wingo_results_${duration}`);
      if (cachedResults) {
        try {
          newResults = JSON.parse(cachedResults);
        } catch (e) {}
      }
      const cachedBets = window.localStorage.getItem(`wingo_mybets_${duration}`);
      if (cachedBets) {
        try {
          newBets = JSON.parse(cachedBets);
        } catch (e) {}
      }
    }
    
    setPeriod(newPeriod);
    setResults(newResults);
    setMyBets(newBets);
    myBetsRef.current = newBets;
  }

  const [historyTab, setHistoryTab] = useState("game");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [gameHistoryPage, setGameHistoryPage] = useState(1);
  const [expandedBetId, setExpandedBetId] = useState(null);
  const [outcomePopup, setOutcomePopup] = useState(null);
  const [centerToast, setCenterToast] = useState(null);
  const myBetsRef = useRef([]);
  const shownOutcomeIdsRef = useRef(new Set());
  // Absolute end-of-round timestamp (ms) that the smooth countdown is derived
  // from, so it never drifts or stutters from competing 1s intervals. Anchored
  // from the server-fetched initial period so the countdown ticks immediately,
  // before the client's own fetch even resolves. Lazily computed once via the
  // guarded-assignment pattern (React docs' recommended way to seed a ref with
  // an impure/expensive value without recomputing it on every render).
  const clockOffsetRef = useRef(0);
  const endsAtRef = useRef(undefined);
  if (endsAtRef.current === undefined) {
    const offset = initialPeriod?.serverTime ? Number(initialPeriod.serverTime) - Date.now() : 0;
    clockOffsetRef.current = offset;
    endsAtRef.current = initialPeriod ? Date.now() + offset + initialPeriod.remainingSeconds * 1000 : null;
  }
  const refreshedPeriodRef = useRef(null);
  const pollTimerRef = useRef(null);

  const [betSheet, setBetSheet] = useState(null);
  const [baseAmount, setBaseAmount] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [quickMultiplier, setQuickMultiplier] = useState(1);
  const [agreed, setAgreed] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [wingoPayouts, setWingoPayouts] = useState(null);
  const [betLimits, setBetLimits] = useState({ minBetAmount: 1, maxBetAmount: 100000 });

  const timer = formatTimer(period?.remainingSeconds ?? 0);
  const remainingSeconds = period?.remainingSeconds ?? 0;
  const showCountdownOverlay = remainingSeconds > 0 && remainingSeconds <= 5;
  const bettingLocked = showCountdownOverlay || loading || maintenanceMode || blocksAction("bet");
  const countdownDigits = timer.ss.split("");
  const totalAmount = baseAmount * (Number(quantity) || 0);
  const betTheme = betSheet ? getBetTheme(betSheet.betType, betSheet.betValue) : "green";
  const durationSeconds = DURATION_SEC[duration];
  const myBetsForDuration = useMemo(
    () => myBets.filter((bet) => bet.duration === durationSeconds),
    [myBets, durationSeconds]
  );
  // Page count must track the actual result count — a hardcoded 5 pages left
  // trailing empty pages showing no rows once the game had <50 results.
  const gameHistoryPageCount = Math.max(1, Math.ceil(results.length / 10));

  // The history period label must always read as one continuous, descending
  // sequence anchored to the live round (current-1, current-2, …). We derive
  // it from the live period instead of trusting the stored roundNumber, which
  // can lag far behind the clock if settlement stalls — leaving history frozen
  // on an old number while the header races ahead. Result values stay real;
  // only the displayed period label is re-anchored. When the backend is
  // healthy this is a no-op (the stored numbers already match).
  const displayResults = useMemo(() => {
    return results.map((r) => ({
      ...r,
      displayPeriodId: r.periodId }));
  }, [results]);

  // Apply authoritative period data without clobbering the smooth local
  // countdown: only (re)anchor the end time on a new period or when the client
  // has drifted more than 2s from the server.
  const syncPeriod = useCallback((data) => {
    const serverTime = Number(data?.serverTime);
    if (serverTime) {
      clockOffsetRef.current = serverTime - Date.now();
    }
    const serverRemaining = Math.max(0, Math.round(Number(data?.remainingSeconds)) || 0);
    setPeriod((prev) => {
      let serverPeriodId = data?.periodId || prev?.periodId;
      
      // Prevent rewinding the periodId if we already optimistically incremented it locally
      // due to the timer hitting zero just before this lagging server fetch completed.
      try {
        if (prev && String(BigInt(serverPeriodId) + 1n) === String(prev.periodId)) {
          serverPeriodId = prev.periodId;
        }
      } catch (e) {}

      const isNewPeriod = !prev || prev.periodId !== serverPeriodId;
      const offset = clockOffsetRef.current;
      const localRemaining =
        endsAtRef.current != null
          ? Math.max(0, Math.round((endsAtRef.current - (Date.now() + offset)) / 1000))
          : null;
      if (isNewPeriod || localRemaining == null || Math.abs(localRemaining - serverRemaining) > 2) {
        endsAtRef.current = Date.now() + offset + serverRemaining * 1000;
        return { ...prev, ...data, periodId: serverPeriodId, remainingSeconds: serverRemaining };
      }
      return { ...prev, ...data, periodId: serverPeriodId, remainingSeconds: localRemaining };
    });
  }, []);

  const loadData = useCallback(async () => {
    // Fire the public (period/history) and private (balance/my bets) fetches
    // together instead of sequencing private after public — halves the time
    // to a warm balance/results paint, and public data still never blocks
    // on private data failing (e.g. an expired token throwing a 401
    // shouldn't wipe the game history off the screen too).
    const publicFetch = Promise.all([getCurrentPeriod(duration), getRecentResults(duration, 50)]);
    const privateFetch = getToken()
      ? Promise.all([getBalance(), getMyBets({ limit: 20, duration })])
      : null;

    let latestResults = null;
    try {
      const [periodRes, resultsRes] = await publicFetch;
      syncPeriod(periodRes.data);
      latestResults = resultsRes.data || [];
      setResults(latestResults);
      localStorage.setItem(`wingo_period_${duration}`, JSON.stringify({ ...periodRes.data, cachedAt: Date.now() }));
      localStorage.setItem(`wingo_results_${duration}`, JSON.stringify(latestResults));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load game");
    }

    if (!privateFetch) return;
    try {
      const [balanceRes, betsRes] = await privateFetch;
      setBalance(balanceRes.data.balance);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lastBalance", String(balanceRes.data.balance));
      }
      const newBets = betsRes.data?.bets || [];

      // Detect bets that just resolved (pending -> won/lost) since the last
      // poll and show the win/loss popup for them. This can't rely on the
      // `wingo:result` socket event below — the server never emits it.
      const prevById = new Map(myBetsRef.current.map((b) => [b._id || b.id, b]));
      for (const bet of newBets) {
        const id = bet._id || bet.id;
        const prevBet = prevById.get(id);
        const justResolved =
          prevBet &&
          prevBet.state === "pending" &&
          (bet.state === "won" || bet.state === "lost") &&
          !shownOutcomeIdsRef.current.has(id);
        if (justResolved) {
          shownOutcomeIdsRef.current.add(id);
          // Read the result straight off the resolved bet — it always carries
          // resultNumber/resultColors/resultSize once settled. Matching against
          // the `results` array raced the poll and often left the Result row
          // blank because the just-settled round wasn't in the array yet.
          const matchedResult = (latestResults || results).find(
            (r) => String(r.periodId) === String(bet.periodId)
          );
          const resultNumber =
            bet.resultNumber != null ? bet.resultNumber : matchedResult?.resultNumber;
          setOutcomePopup({
            show: true,
            type: bet.state === "won" ? "win" : "lose",
            amount: bet.state === "won" ? bet.winAmount : bet.amount,
            periodId: bet.periodId,
            number: resultNumber,
            colors:
              bet.resultColors?.length
                ? bet.resultColors
                : resultNumber != null
                ? getColorDots(resultNumber)
                : [],
            size: bet.resultSize
              ? bet.resultSize.charAt(0).toUpperCase() + bet.resultSize.slice(1)
              : resultNumber != null
              ? getSize(resultNumber)
              : "" });
        }
      }
      const serverBetIds = new Set(newBets.map((b) => b._id || b.id));
      const missingPendingBets = myBetsRef.current.filter((b) => 
        (b.status === "pending" || b.state === "pending") && !serverBetIds.has(b._id || b.id)
      );
      const combinedBets = [...missingPendingBets, ...newBets];

      myBetsRef.current = combinedBets;
      setMyBets(combinedBets);
      localStorage.setItem(`wingo_mybets_${duration}`, JSON.stringify(combinedBets));
    } catch {}
  }, [duration, syncPeriod, results]);

  // Popup auto-close is handled inside the shared OutcomePopup component

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return undefined;
    }

    loadData();
    getWingoConfig()
      .then((res) => {
        if (res?.data?.payouts) setWingoPayouts(res.data.payouts);
        if (res?.data?.minBetAmount != null || res?.data?.maxBetAmount != null) {
          setBetLimits({
            minBetAmount: Number(res.data.minBetAmount) || 1,
            maxBetAmount: Number(res.data.maxBetAmount) || 100000 });
        }
      })
      .catch(() => {});

    let activeSocket = null;
    let cancelled = false;

    const userObj = getUser();
    getSocket().then((socket) => {
      if (!socket || cancelled) return;

      activeSocket = socket;
      socket.emit("join:wingo", duration);
      socket.emit("join:user");
      if (userObj && userObj._id) {
        socket.emit("auth:register", userObj._id);
      }

      socket.on("wallet:updated", (data) => setBalance(data.balance));
      socket.on("wallet:balance", (data) => setBalance(data.balance));
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated");
        activeSocket.off("wallet:balance");
      }
    };
  }, [duration, loadData, router]);

  // Smooth countdown derived from the anchored end time. Runs at 250ms so the
  // displayed second flips exactly on the boundary (no drift, no skipped/stuck
  // seconds), and only writes state when the integer second actually changes.
  useEffect(() => {
    const smoothTick = setInterval(() => {
      if (endsAtRef.current == null) return;
      const offset = clockOffsetRef.current;
      const remaining = Math.max(0, Math.round((endsAtRef.current - (Date.now() + offset)) / 1000));
      setPeriod((prev) => {
        if (!prev) return prev;
        let currentPeriodId = prev.periodId;
        if (remaining === 0 && prev.remainingSeconds > 0) {
          try {
            currentPeriodId = String(BigInt(prev.periodId) + 1n);
          } catch (e) {
            console.error(e);
          }
        }
        if (prev.remainingSeconds === remaining && prev.periodId === currentPeriodId) return prev;
        return { ...prev, periodId: currentPeriodId, remainingSeconds: remaining };
      });
      // When the round ends, pull the new period + fresh history exactly once.
      if (remaining === 0 && refreshedPeriodRef.current !== period?.periodId) {
        refreshedPeriodRef.current = period?.periodId;
        const endedPeriodId = period?.periodId;
        loadData();

        // Gentle poll every 2000ms until the ended period's result is settled
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(async () => {
          try {
            const resultsRes = await getRecentResults(duration, 50);
            const latest = resultsRes.data || [];
            const isSettled = latest.some(r => String(r.periodId) === String(endedPeriodId));
            if (isSettled) {
              clearInterval(pollTimerRef.current);
              loadData(); // final load to get updated user balance and bets
            }
          } catch (e) {
            console.error(e);
          }
        }, 2000);
      }
    }, 250);

    return () => {
      clearInterval(smoothTick);
      clearInterval(pollTimerRef.current);
    };
  }, [duration, loadData, period?.periodId]);

  // Reliable periodic refresh for game history/period/balance — the socket
  // events above never actually fire (no backend emitter), and the local
  // ticker's stuck-at-zero fallback only retries a couple of times before
  // giving up for good, which let history fall multiple rounds behind.
  useEffect(() => {
    const refreshInterval = setInterval(() => { loadData(); }, 4000);
    return () => clearInterval(refreshInterval);
  }, [loadData]);

  useEffect(() => {
    if (showCountdownOverlay && betSheet) {
      setBetSheet(null);
    }
  }, [showCountdownOverlay, betSheet]);

  const setBetQuantity = (value) => {
    if (value === "") {
      setQuantity("");
      return;
    }
    const val = parseInt(value, 10);
    if (isNaN(val)) return;
    const next = Math.max(0, val);
    setQuantity(next);
    if (MULTIPLIERS.includes(next)) {
      setQuickMultiplier(next);
    }
  };

  const openBetSheet = (betType, betValue) => {
    if (showCountdownOverlay || maintenanceMode || blocksAction("bet")) return;
    setError("");
    setBetSheet({ betType, betValue });
    setBaseAmount(1);
    setQuantity(quickMultiplier);
    setAgreed(true);
  };

  const closeBetSheet = () => {
    if (loading) return;
    setBetSheet(null);
  };

  const confirmBet = async () => {
    if (!betSheet || !agreed) return;
    if ((Number(quantity) || 0) <= 0) {
      setError("Please enter a valid quantity of 1 or more.");
      return;
    }
    if (totalAmount < betLimits.minBetAmount || totalAmount > betLimits.maxBetAmount) {
      setError(
        `Bet amount must be between ₹${betLimits.minBetAmount} and ₹${betLimits.maxBetAmount.toLocaleString("en-IN")}`
      );
      return;
    }
    setError("");
    setLoading(true);
    const deductedAmount = totalAmount;
    setBalance(prev => Math.max(0, prev - deductedAmount));
    const { betType, betValue } = betSheet;
    const generatedId = `opt-${Date.now()}`;
    const durationSecs = duration === "30s" ? 30 : duration === "1m" ? 60 : duration === "3m" ? 180 : duration === "5m" ? 300 : 600;
    
    const optimisticBet = {
      _id: generatedId,
      id: generatedId,
      periodId: String(period?.periodId || ""),
      amount: totalAmount,
      winAmount: 0,
      payoutRatio: 0,
      state: "pending",
      status: "pending",
      createdAt: new Date().toISOString(),
      resultNumber: null,
      resultColors: [],
      resultSize: "",
      betType,
      betValue: String(betValue),
      duration: durationSecs,
      orderNumber: `WG${period?.periodId || ""}${generatedId.slice(-8)}`.toUpperCase(),
      details: {
        betType,
        betValue: String(betValue),
        duration }
    };

    setMyBets(prev => [optimisticBet, ...prev]);
    myBetsRef.current = [optimisticBet, ...myBetsRef.current];
    setBetSheet(null);

    const clickTime = Date.now();
    try {
      const sendTime = Date.now();
      const res = await placeBet(duration, {
        betType,
        betValue: String(betValue),
        amount: totalAmount,
        idempotencyKey: `${period?.periodId}_${betType}_${betValue}_${Date.now()}`,
        clickTime,
        sendTime });
      
      const responseReceivedTime = Date.now();
      const t = res.timestamps || {};
      const timeline = {
        "Button Click -> Request Sent": `${sendTime - clickTime}ms`,
        "Request Sent -> Server Received (Network Request Latency)": `${t.serverReceivedTime - sendTime}ms`,
        "Server Received -> DB Write Complete (Server DB Transaction)": `${t.dbWriteTime - t.serverReceivedTime}ms`,
        "DB Write Complete -> Response Sent": `${t.responseSentTime - t.dbWriteTime}ms`,
        "Response Sent -> Response Received (Network Response Latency)": `${responseReceivedTime - t.responseSentTime}ms`,
        "Total Latency (Click -> Response Received)": `${responseReceivedTime - clickTime}ms`
      };
      console.log("⏱️ BET PLACEMENT TIMELINE:");
      console.table(timeline);

      const betData = res.data;
      if (betData?._id || betData?.id) {
        const realId = betData?._id || betData?.id;
        const updatedBet = {
          ...optimisticBet,
          _id: realId,
          id: realId,
          orderNumber: `WG${period?.periodId || ""}${realId.slice(-8)}`.toUpperCase()
        };
        setMyBets(prev => prev.map(b => b.id === generatedId ? updatedBet : b));
        myBetsRef.current = myBetsRef.current.map(b => b.id === generatedId ? updatedBet : b);
      }

      setCenterToast({ message: "Bet Successful", type: "success" });
      setLoading(false);
      loadData(); // Run in the background without blocking the UI
      setTimeout(() => setCenterToast(null), 1000);
    } catch (err) {
      setBalance(prev => prev + deductedAmount);
      setMyBets(prev => prev.filter(b => b.id !== generatedId));
      myBetsRef.current = myBetsRef.current.filter(b => b.id !== generatedId);
      const errMsg = getBetErrorMessage(err);
      setError(errMsg);
      setCenterToast({ message: errMsg, type: "error" });
      setTimeout(() => setCenterToast(null), 1500);
    } finally {
      setLoading(false);
    }
  };

  const handleRandom = () => {
    const pick = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    openBetSheet("number", pick);
  };

  const openRules = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setRulesOpen(true);
  };

  const closeRules = () => setRulesOpen(false);

  const formatBaseLabel = (value) => String(value);

  const getBetErrorMessage = (err) => {
    const msg = err.response?.data?.message || "Bet failed";
    if (/replica set|mongos|Transaction numbers/i.test(msg)) {
      return "Bet could not be processed. Please try again.";
    }
    return msg;
  };

  return (
    <main className="wingo-game">
      <GameHeader
        title="Win Go"
        durations={DURATIONS.map(d => ({ id: d.slug, label: `Win Go ${d.label}` }))}
        activeDuration={duration}
        durationHrefPrefix="/wingo"
      />

      {(maintenanceMode || blocksAction("bet")) && (
        <div className="wg-maintenance-notice">
          {maintenanceMessage || "Betting is temporarily unavailable during maintenance."}
        </div>
      )}

      {error && !betSheet && <div className="auth-error wg-msg">{error}</div>}

      {/* Ticket section */}
      <section className="wg-ticket">
        <div className="wg-ticket-left">
          <button type="button" className="wg-how-play" onClick={openRules} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            How to play
          </button>
          <p className="wg-mode-label">{durationMeta.short}</p>
          <div className="wg-recent-row">
            {results.slice(0, 5).map((r) => (
              <span key={r.periodId} className={`wg-mini-ball ${colorClass(r.resultNumber)}`}>
                {r.resultNumber}
              </span>
            ))}
          </div>
        </div>
        <div className="wg-ticket-right">
          <span className="wg-time-label">Time remaining</span>
          <div className="wg-timer">
            <span>{timer.mm}</span>
            <em>:</em>
            <span>{timer.ss}</span>
          </div>
          <p className="wg-period-id">{period?.periodId || "—"}</p>
        </div>
      </section>

      <section className="wg-bet-zone">
        {showCountdownOverlay && (
          <div className="wg-countdown-overlay" aria-live="polite" aria-label={`${remainingSeconds} seconds remaining`}>
            <div className="wg-countdown-digit">{countdownDigits[0]}</div>
            <div className="wg-countdown-digit">{countdownDigits[1]}</div>
          </div>
        )}

      <div className="wg-bet-panel">
      {/* Color bets */}
      <div className={`wg-color-row ${showCountdownOverlay ? "wg-bet-locked" : ""}`}>
        <button className="wg-color-btn green" disabled={bettingLocked} onClick={() => openBetSheet("color", "green")}>Green</button>
        <button className="wg-color-btn violet" disabled={bettingLocked} onClick={() => openBetSheet("color", "violet")}>Violet</button>
        <button className="wg-color-btn red" disabled={bettingLocked} onClick={() => openBetSheet("color", "red")}>Red</button>
      </div>

      {/* Number grid */}
      <div className={`wg-number-grid ${showCountdownOverlay ? "wg-bet-locked" : ""}`}>
        {NUMBERS.map((num) => (
          <button
            key={num}
            type="button"
            className={`wg-num-btn ${colorClass(num)}`}
            disabled={bettingLocked}
            onClick={() => openBetSheet("number", num)}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Random + multipliers */}
      <div className={`wg-multi-row ${showCountdownOverlay ? "wg-bet-locked" : ""}`}>
        <button type="button" className="wg-random-btn" disabled={bettingLocked} onClick={handleRandom}>
          Random
        </button>
        <div className="wg-multipliers">
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              type="button"
              className={`wg-multi-btn ${quickMultiplier === m ? "active" : ""}`}
              disabled={bettingLocked}
              onClick={() => setQuickMultiplier(m)}
            >
              X{m}
            </button>
          ))}
        </div>
      </div>

      {/* Big / Small */}
      <div className={`wg-size-row ${showCountdownOverlay ? "wg-bet-locked" : ""}`}>
        <button className="wg-size-btn big" disabled={bettingLocked} onClick={() => openBetSheet("big_small", "big")}>Big</button>
        <button className="wg-size-btn small" disabled={bettingLocked} onClick={() => openBetSheet("big_small", "small")}>Small</button>
      </div>
      </div>
      </section>

      {/* History tabs */}
      <div className="wg-history-tabs">
        {[
          { id: "game", label: "Game history" },
          { id: "chart", label: "Chart" },
          { id: "my", label: "My history" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`wg-history-tab ${historyTab === tab.id ? "active" : ""}`}
            onClick={() => setHistoryTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History content */}
      <section className="wg-history-panel">
        {historyTab === "game" && (
          <>
            <table className="wg-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Number</th>
                  <th>Big/Small</th>
                  <th>Color</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                      No data available
                    </td>
                  </tr>
                ) : (
                  displayResults
                    .slice((Math.min(gameHistoryPage, gameHistoryPageCount) - 1) * 10, Math.min(gameHistoryPage, gameHistoryPageCount) * 10)
                    .map((r) => (
                      <tr key={r.periodId}>
                        <td className="wg-period-cell">{r.displayPeriodId?.slice(-8)}</td>
                        <td>
                          <span className={`wg-table-num ${colorClass(r.resultNumber)}`}>{r.resultNumber}</span>
                        </td>
                        <td>{getSize(r.resultNumber)}</td>
                        <td>
                          <div className="wg-color-dots">
                            {getColorDots(r.resultNumber).map((c) => (
                              <span key={c} className={`wg-dot ${c}`} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls — page count tracks actual result count */}
            <div className="wg-pagination">
              <button
                type="button"
                onClick={() => setGameHistoryPage((prev) => Math.max(1, prev - 1))}
                disabled={gameHistoryPage === 1}
                className="wg-page-btn flex items-center justify-center"
              >
                <ArrowLeft size={16} />
              </button>
              {Array.from({ length: gameHistoryPageCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setGameHistoryPage(p)}
                  className={`wg-page-btn ${gameHistoryPage === p ? "active" : ""}`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGameHistoryPage((prev) => Math.min(gameHistoryPageCount, prev + 1))}
                disabled={gameHistoryPage === gameHistoryPageCount}
                className="wg-page-btn flex items-center justify-center"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {historyTab === "chart" && (
          <div style={{ overflowX: "auto" }}>
            <table className="wg-chart-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", paddingLeft: "10px" }}>Period</th>
                  <th colSpan={10} style={{ padding: "10px 0" }}>Number</th>
                  <th></th>
                </tr>
                <tr >
                  <th style={{ textAlign: "left", paddingLeft: "10px" }}></th>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <th key={n} style={{ fontSize: "0.8rem", width: "26px", color: "var(--gold)" }}>{n}</th>
                  ))}
                  <th style={{ width: "35px" }}></th>
                </tr>
              </thead>
              <tbody>
                {displayResults.slice(0, 15).map((r) => {
                  const winNum = r.resultNumber;
                  const size = getSize(winNum);

                  return (
                    <tr key={r.periodId}>
                      <td style={{ textAlign: "left", paddingLeft: "10px", color: "#9ca3af", fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {r.displayPeriodId}
                      </td>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                        const isActive = n === winNum;
                        return (
                          <td key={n} style={{ padding: "4px 0" }}>
                            <span
                              className={`wg-chart-cell-num ${isActive ? `active ${colorClass(winNum)}` : ""}`}
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                color: isActive ? "#ffffff" : "#4b5563",
                                background: isActive ? undefined : "rgba(255,255,255,0.03)"
                              }}
                            >
                              {n}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: "4px 0" }}>
                        <span
                          className={`wg-chart-size-badge ${size.toLowerCase()}`}
                          style={{
                            display: "inline-flex",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: "800",
                            color: "var(--theme-text)",
                            background: size === "Big" ? "#f59e0b" : "#3b82f6"
                          }}
                        >
                          {size === "Big" ? "B" : "S"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {historyTab === "my" && (
          <table className="wg-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Bet</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myBetsForDuration.length === 0 ? (
                <tr><td colSpan={4} className="wg-empty">No bets yet for {durationMeta.short}</td></tr>
              ) : (
                myBetsForDuration.map((bet) => {
                  const isExpanded = expandedBetId === bet._id;
                  const isWin = bet.status === "won";
                  const copyOrderId = (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(bet.orderNumber || "");
                    alert("Order number copied successfully!");
                  };

                  return (
                    <React.Fragment key={bet._id}>
                      <tr
                        onClick={() => setExpandedBetId(isExpanded ? null : bet._id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="wg-period-cell">
                          {bet.periodId?.slice(-8)} {isExpanded ? "▲" : "▼"}
                        </td>
                        <td>
                          <span className={`wg-my-bet-label wg-my-bet-${getBetTheme(bet.betType, bet.betValue)}`}>
                            {formatBetLabel(bet.betType, bet.betValue)}
                          </span>
                        </td>
                        <td>₹{bet.amount.toFixed(2)}</td>
                        <td className={`wg-status-${bet.status}`}>
                          <span className={`badge badge-${isWin ? "success" : bet.status === "pending" ? "warning" : "danger"}`} style={{ display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem" }}>
                            {isWin ? "Succeed" : bet.status === "pending" ? "Pending" : "Failed"}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="wg-details-row">
                          <td colSpan={4}>
                            <div className="wg-details-card">
                              <div className="wg-details-title">Details</div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Order number</span>
                                <span className="wg-details-val" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  {bet.orderNumber || "—"}
                                  <button
                                    type="button"
                                    onClick={copyOrderId}
                                    style={{ border: "none",
                                      color: "var(--gold)",
                                      cursor: "pointer",
                                      padding: "0 4px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      outline: "none"
                                    }}
                                    title="Copy Order Number"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      width="14"
                                      height="14"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                  </button>
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Period</span>
                                <span className="wg-details-val">{bet.periodId}</span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Purchase amount</span>
                                <span className="wg-details-val">₹{bet.amount.toFixed(2)}</span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Quantity</span>
                                <span className="wg-details-val">{bet.amount / baseAmount || 1}</span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Contract amount (after fee)</span>
                                <span className="wg-details-val" style={{ color: "#ef4444" }}>
                                  ₹{(bet.amount * (1 - BET_FEE)).toFixed(2)}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Bet fee ({BET_FEE * 100}%)</span>
                                <span className="wg-details-val">
                                  ₹{(bet.amount * BET_FEE).toFixed(2)}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Result</span>
                                <span className="wg-details-val">
                                  {bet.resultNumber !== null && bet.resultNumber !== undefined ? (
                                    <>
                                      <span style={{ marginRight: "6px", fontWeight: "800" }}>{bet.resultNumber}</span>
                                      <span style={{ textTransform: "capitalize", color: bet.resultColors?.includes("red") ? "#ef4444" : "#22c55e", marginRight: "6px" }}>
                                        {bet.resultColors?.join("/")}
                                      </span>
                                      <span style={{ textTransform: "capitalize", color: "var(--gold)" }}>
                                        {bet.resultSize}
                                      </span>
                                    </>
                                  ) : "Pending"}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Select</span>
                                <span className="wg-details-val" style={{ textTransform: "capitalize" }}>
                                  {formatBetLabel(bet.betType, bet.betValue)}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Status</span>
                                <span className="wg-details-val" style={{ color: isWin ? "#22c55e" : bet.status === "pending" ? "var(--gold)" : "#ef4444" }}>
                                  {isWin ? "Succeed" : bet.status === "pending" ? "Pending" : "Failed"}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Win/lose</span>
                                <span className={`wg-details-val ${bet.status === "pending" || bet.state === "pending" ? "" : isWin ? "wg-status-won" : "wg-status-lost"}`} style={{ color: bet.status === "pending" || bet.state === "pending" ? "#888" : isWin ? "#22c55e" : "#ef4444", fontWeight: "800" }}>
                                  {bet.status === "pending" || bet.state === "pending" ? "--" : isWin ? `+ ₹${bet.winAmount.toFixed(2)}` : `- ₹${bet.amount.toFixed(2)}`}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Order time</span>
                                <span className="wg-details-val">{new Date(bet.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </section>

      {betSheet && (
        <div className="wg-bet-overlay" onClick={closeBetSheet}>
          <div
            className={`wg-bet-sheet theme-${betTheme}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="wg-bet-sheet-banner">
              <div className="wg-bet-sheet-header">
                <p className="wg-bet-sheet-game">{durationMeta.short}</p>
              </div>
              <div className="wg-bet-sheet-select">
                {getBetSelectionLabel(betSheet.betType, betSheet.betValue)}
              </div>
            </div>

            <div className="wg-bet-sheet-body">
              <div className="wg-bet-field">
                <span className="wg-bet-field-label">Balance</span>
                <div className="wg-bet-amount-row">
                  {BASE_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`wg-bet-chip ${baseAmount === value ? "active" : ""}`}
                      onClick={() => setBaseAmount(value)}
                    >
                      {formatBaseLabel(value)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wg-bet-field">
                <span className="wg-bet-field-label">Quantity</span>
                <div className="wg-bet-qty">
                  <button
                    type="button"
                    className="wg-bet-qty-btn"
                    disabled={quantity <= 1}
                    onClick={() => setBetQuantity(quantity - 1)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setBetQuantity(e.target.value)}
                    className="wg-bet-qty-input"
                  />
                  <button
                    type="button"
                    className="wg-bet-qty-btn"
                    onClick={() => setBetQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="wg-bet-field wg-bet-field-multi">
                <div className="wg-bet-multi-row">
                  {MULTIPLIERS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`wg-bet-multi ${quantity === m ? "active" : ""}`}
                      onClick={() => setBetQuantity(m)}
                    >
                      X{m}
                    </button>
                  ))}
                </div>
              </div>

              <label className="wg-bet-agree">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>I agree</span>
                <button type="button" className="wg-bet-rules" onClick={openRules}>
                  (Pre-sale rules)
                </button>
              </label>

              {error && betSheet && (
                <p className="wg-bet-sheet-error" role="alert">{error}</p>
              )}
            </div>

            <div className="wg-bet-sheet-footer">
              <button type="button" className="wg-bet-cancel" disabled={loading} onClick={closeBetSheet}>
                Cancel
              </button>
              <button
                type="button"
                className="wg-bet-confirm"
                disabled={loading || !agreed}
                onClick={confirmBet}
              >
                {loading ? "Processing..." : `Total amount ₹${totalAmount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <PreSaleRulesModal open={rulesOpen} onClose={closeRules} payouts={wingoPayouts} />

      {/* Outcome announcement Win/Loss popup modal */}
      {outcomePopup && (
        <OutcomePopup
          show={outcomePopup.show ?? false}
          type={outcomePopup.type}
          amount={outcomePopup.amount}
          gameName="Lottery"
          periodId={outcomePopup.periodId}
          resultDetails={
            outcomePopup.number != null ? (() => {
              const n = outcomePopup.number;
              const circle = [1, 3, 7, 9].includes(n) ? "green" : n === 0 || n === 5 ? "violet" : "red";
              const primary = (outcomePopup.colors && outcomePopup.colors[0]) || circle;
              return (
                <>
                  <span className={`ln-chip ln-chip-txt ${primary}`} style={{ textTransform: "capitalize" }}>
                    {primary}
                  </span>
                  <span className={`ln-chip ln-chip-num ${circle}`}>{n}</span>
                  <span className="ln-chip ln-chip-size">{outcomePopup.size}</span>
                </>
              );
            })() : null
          }
          balance={balance}
          onClose={() => setOutcomePopup(null)}
        />
      )}

      <style>{`
        /* Refresh Button Spinning Keyframes */
        .wg-balance-refresh-btn.spinning svg {
          animation: balance-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes balance-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
          width: 100%;
          height: 100%;
          background: var(--theme-bg-card);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fade-in 0.25s ease-out forwards;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .wg-outcome-card-container {
          perspective: 1000px;
        }

        .wg-outcome-card-v2 {
          width: 360px;
          border-radius: 28px;
          padding: 2.25rem 1.75rem 1.75rem;
          box-sizing: border-box;
          position: relative;
          color: var(--theme-text);
          font-family: var(--font-inter, sans-serif);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--theme-bg-card);
          backdrop-filter: blur(20px);
          border: 1px solid;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
          animation: popup-scaleup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes popup-scaleup {
          from {
            transform: scale(0.85) translateY(20px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .wg-outcome-card-v2.win {
          border-color: rgba(71, 129, 255, 0.1);
          box-shadow: 0 0 35px rgba(71, 129, 255, 0.1), inset 0 0 15px rgba(71, 129, 255, 0.1);
          background: radial-gradient(circle at top center, rgba(71, 129, 255, 0.1) 0%, rgba(10, 10, 12, 0.95) 70%);
        }

        .wg-outcome-card-v2.lose {
          border-color: rgba(185, 28, 28, 0.35);
          box-shadow: 0 0 35px rgba(185, 28, 28, 0.15), inset 0 0 15px rgba(185, 28, 28, 0.05);
          background: radial-gradient(circle at top center, rgba(185, 28, 28, 0.08) 0%, rgba(10, 10, 12, 0.95) 70%);
        }

        .wg-outcome-v2-close-top {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: bold;
          transition: all 0.2s ease;
          z-index: 10;
        }
        .wg-outcome-v2-close-top:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--theme-text);
          transform: scale(1.05);
        }

        .wg-outcome-v2-header {
          position: relative;
          width: 100%;
          height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          margin-bottom: 1.25rem;
        }

        .wg-outcome-v2-header-svg {
          position: absolute;
          width: 280px;
          height: 160px;
          top: -20px;
          z-index: 1;
        }

        /* Subtitle with gold/red divider lines */
        .wg-outcome-v2-subtitle-container {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .wg-outcome-v2-sub-line {
          flex: 1;
          height: 1px;
        }
        .win .wg-outcome-v2-sub-line {
          background: linear-gradient(90deg, transparent, rgba(71, 129, 255, 0.1), transparent);
        }
        .lose .wg-outcome-v2-sub-line {
          background: linear-gradient(90deg, transparent, rgba(185, 28, 28, 0.5), transparent);
        }

        .wg-outcome-v2-subtitle-text {
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .win .wg-outcome-v2-subtitle-text {
          color: #fcd974;
          text-shadow: 0 0 8px rgba(71, 129, 255, 0.1);
        }
        .lose .wg-outcome-v2-subtitle-text {
          color: #fca5a5;
          text-shadow: 0 0 8px rgba(185, 28, 28, 0.3);
        }

        .wg-outcome-v2-main-result {
          margin: 0.5rem 0 1.25rem;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wg-outcome-v2-win-amount {
          font-size: 3.15rem;
          font-weight: 900;
          background: linear-gradient(180deg, #FFFFFF 15%, #fcd974 60%, #d4af37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));
          display: block;
          line-height: 1;
          letter-spacing: -0.02em;
          animation: text-pulse 2s infinite ease-in-out;
        }

        @keyframes text-pulse {
          0%, 100% { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)); }
          50% { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)); }
        }

        .wg-outcome-v2-loss-quote {
          color: #94a3b8;
          font-size: 0.875rem;
          line-height: 1.5;
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .wg-outcome-v2-loss-quote p {
          margin: 0;
        }

        /* Glass details container */
        .wg-outcome-v2-details-container {
          width: 100%;
          border-radius: 16px;
          padding: 1.25rem 1.125rem 0.65rem;
          box-sizing: border-box;
          position: relative;
          margin-bottom: 0.875rem;
          text-align: left;
          background: var(--theme-bg-card);
          backdrop-filter: blur(10px);
          border: 1px solid;
        }
        .win .wg-outcome-v2-details-container {
          border-color: rgba(71, 129, 255, 0.1);
        }
        .lose .wg-outcome-v2-details-container {
          border-color: rgba(185, 28, 28, 0.18);
        }

        .wg-outcome-v2-details-title-tag {
          position: absolute;
          top: -9px;
          left: 18px;
          background: var(--theme-bg-card);
          padding: 0 10px;
          font-size: 0.6875rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .win .wg-outcome-v2-details-title-tag { color: #d4af37; }
        .lose .wg-outcome-v2-details-title-tag { color: #fca5a5; }

        .wg-outcome-v2-details-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.55rem 0;
          border-bottom: 1.2px dashed rgba(255, 255, 255, 0.05);
        }
        .wg-outcome-v2-details-row:last-child {
          border-bottom: none;
        }

        .wg-outcome-v2-details-label {
          font-size: 0.75rem;
          color: #8892b0;
        }

        .wg-outcome-v2-details-value {
          font-size: 0.75rem;
          color: #f8fafc;
          font-weight: 700;
        }
        .wg-outcome-v2-details-value.period-num {
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          color: #e2e8f0;
        }

        .wg-outcome-v2-result-color-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Result pills & badges */
        .wg-outcome-v2-color-text {
          font-weight: 800;
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .wg-outcome-v2-color-text.green { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
        .wg-outcome-v2-color-text.red { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .wg-outcome-v2-color-text.violet { color: #c084fc; background: rgba(192, 132, 252, 0.1); }

        .wg-outcome-v2-num-circle {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--theme-text);
        }
        .wg-outcome-v2-num-circle.green { background-color: var(--theme-bg-card); }
        .wg-outcome-v2-num-circle.red { background-color: #ef4444; }
        .wg-outcome-v2-num-circle.violet { background-color: #a855f7; }

        .wg-outcome-v2-size-text {
          font-weight: 700;
          font-size: 0.75rem;
          color: #e2e8f0;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
        }

        .wg-outcome-v2-secondary-box {
          width: 100%;
          margin-bottom: 1.125rem;
        }

        /* Wallet glass card */
        .wg-outcome-v2-balance-card {
          border-radius: 14px;
          padding: 0.65rem 0.875rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(71, 129, 255, 0.1);
        }

        .wg-outcome-v2-balance-left {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
        }

        .wg-outcome-v2-balance-text span {
          display: block;
          font-size: 0.6875rem;
          color: #d4af37;
          opacity: 0.85;
          font-weight: 600;
        }
        .wg-outcome-v2-balance-text strong {
          display: block;
          font-size: 0.95rem;
          color: var(--theme-text);
          font-weight: 800;
          margin-top: 1px;
        }

        /* Loss motivation card */
        .wg-outcome-v2-motivation-card {
          border-radius: 14px;
          padding: 0.65rem 0.875rem;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(185, 28, 28, 0.15);
        }

        .wg-outcome-v2-motivation-text {
          font-size: 0.78rem;
          color: #fca5a5;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .wg-outcome-v2-action-row {
          width: 100%;
        }

        /* Premium Buttons */
        .wg-outcome-v2-action-btn {
          width: 100%;
          padding: 0.9rem;
          border-radius: 16px;
          font-size: 0.95rem;
          font-weight: 900;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .wg-outcome-v2-action-btn.win {
          background: linear-gradient(180deg, #f4d77d 0%, #d4af37 50%, #b8860b 100%);
          color: #302002;
          box-shadow: 0 4px 15px rgba(71, 129, 255, 0.1);
        }
        .wg-outcome-v2-action-btn.win:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(71, 129, 255, 0.1);
          filter: brightness(1.05);
        }
        .wg-outcome-v2-action-btn.win:active {
          transform: translateY(0);
        }

        .wg-outcome-v2-action-btn.loss {
          background: linear-gradient(180deg, #ef4444 0%, #b91c1c 50%, #7f1d1d 100%);
          color: var(--theme-text);
          box-shadow: 0 4px 15px rgba(185, 28, 28, 0.25);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .wg-outcome-v2-action-btn.loss:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(185, 28, 28, 0.35);
          filter: brightness(1.05);
        }
        .wg-outcome-v2-action-btn.loss:active {
          transform: translateY(0);
        }

        /* Auto-close loading indicator */
        .wg-outcome-v2-countdown-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 0.875rem;
        }

        .wg-outcome-v2-countdown-text {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .wg-details-card {
          background: var(--theme-bg-card);
          border-radius: 12px;
          border: 1px solid rgba(71, 129, 255, 0.1);
          padding: 12px;
          font-size: 0.85rem;
          text-align: left;
        }
        .wg-details-title {
          font-weight: bold;
          color: var(--gold);
          margin-bottom: 8px;
          font-size: 0.95rem;
        }
        .wg-details-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
        }
        .wg-details-item:last-child {
          border-bottom: none;
        }
        .wg-details-label {
          color: #9ca3af;
        }
        .wg-details-val {
          color: var(--theme-text);
          font-weight: 600;
        }

        /* Pagination styling */
        .wg-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          margin: 12px 0;
        }
        .wg-page-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #d1d5db;
          font-size: 0.8rem;
          border-radius: 6px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .wg-page-btn.active {
          background: linear-gradient(135deg, var(--gold) 0%, #a88118 100%);
          color: #111;
          font-weight: bold;
          border-color: var(--gold);
        }
        .wg-page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .wg-popup-overlay {
          position: fixed;
          inset: 0;
          background: var(--theme-bg-card);
          backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wg-outcome-card-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          animation: popup-scaleup 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: visible;
        }
        @keyframes popup-scaleup {
          0% { transform: scale(0.7) translateY(40px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        .wg-outcome-card {
          width: 320px;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          text-align: center;
          overflow: visible;
        }
        
        @keyframes card-glow {
          0% { box-shadow: 0 25px 60px rgba(0, 0, 0, 0.05); }
          50% { box-shadow: 0 25px 60px rgba(255, 94, 54, 0.3); }
          100% { box-shadow: 0 25px 60px rgba(0, 0, 0, 0.05); }
        }
        .wg-outcome-card.win {
          background: linear-gradient(135deg, #ff5e36 0%, #ff2d2d 100%) !important;
          animation: card-glow 3s ease-in-out infinite;
        }
        .wg-outcome-card.lose {
          background: var(--theme-bg-card) !important;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.05);
        }

        .wg-outcome-close-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--theme-bg-card);
          border: 1.5px solid rgba(255, 255, 255, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          outline: none;
        }
        .wg-outcome-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: scale(1.15);
          border-color: rgba(255, 255, 255, 0.6);
        }
        .wg-outcome-close-btn:active {
          transform: scale(0.92);
        }

        .wg-outcome-header {
          height: 120px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 12px;
          border-radius: 28px 28px 0 0;
        }
        .wg-outcome-header.win {
          background: transparent;
        }
        .wg-outcome-header.lose {
          background: transparent;
        }

        .wg-outcome-wings {
          position: absolute;
          top: -46px;
          display: flex;
          justify-content: center;
          width: 100%;
          pointer-events: none;
        }
        .wg-wings-svg {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));
        }
        
        @keyframes wings-pulse {
          0% { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)) brightness(1); }
          50% { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)) brightness(1.15); }
          100% { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05)) brightness(1); }
        }
        .wg-outcome-wings.win {
          animation: wings-pulse 2.5s ease-in-out infinite;
        }

        .wg-outcome-emblem {
          position: absolute;
          top: -30px;
          width: 68px;
          height: 68px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05);
          z-index: 10;
        }
        
        @keyframes rocket-float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(1.5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        .wg-outcome-emblem.win {
          background: linear-gradient(135deg, #ffd861 0%, #f5af19 100%);
          animation: rocket-float 3s ease-in-out infinite;
        }
        .wg-outcome-emblem.lose {
          background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
          animation: rocket-float 3.5s ease-in-out infinite;
        }
        .wg-outcome-rocket {
          font-size: 2.2rem;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.05));
        }

        .wg-outcome-ribbon {
          width: 85%;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 1.25rem;
          font-weight: 900;
          color: var(--theme-text);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          z-index: 5;
        }
        .wg-outcome-ribbon.win {
          background: linear-gradient(90deg, #ff8c00 0%, #e65c00 100%);
          border: 1px solid rgba(255, 255, 255, 0.25);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .wg-outcome-ribbon.lose {
          background: var(--theme-bg-card);
          border: 1px solid rgba(255, 255, 255, 0.15);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .wg-outcome-body {
          padding: 24px 20px;
        }

        .wg-outcome-details {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .wg-outcome-details-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }
        .wg-outcome-details-badges {
          display: flex;
          gap: 6px;
        }
        .wg-outcome-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--theme-text);
        }
        .wg-outcome-badge.red { background: #ef4444; }
        .wg-outcome-badge.green { background: var(--theme-bg-card); }
        .wg-outcome-badge.violet { background: #a855f7; }
        .wg-outcome-badge.number { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); }
        .wg-outcome-badge.size { background: rgba(255,255,255,0.15); color: var(--theme-text); border: 1px solid rgba(255,255,255,0.25); }

        .wg-outcome-envelope {
          margin-bottom: 20px;
          perspective: 1000px;
        }
        .wg-outcome-paper {
          background: #ffffff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .wg-outcome-paper::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, #3b82f6 10px, #3b82f6 20px);
        }
        .wg-outcome-paper-title {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: bold;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .wg-outcome-paper-val {
          font-size: 2.1rem;
          font-weight: 900;
          margin: 8px 0;
        }
        .wg-outcome-paper-val.win {
          color: #d32f2f;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .wg-outcome-paper-val.lose {
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .wg-outcome-paper-period {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .wg-outcome-footer-timer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.8);
        }
        .wg-outcome-timer-circle {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          border-top-color: transparent;
          animation: rotate 1s linear infinite;
        }
        @keyframes rotate {
          to { transform: rotate(360deg); }
        }

        /* Trend Chart Table styling */
        .wg-chart-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 10px;
        }
        .wg-chart-table th, .wg-chart-table td {
          text-align: center;
          padding: 6px 2px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .wg-chart-cell-num {
          transition: all 0.2s ease;
        }
        .wg-chart-cell-num.active {
          color: var(--theme-text) !important;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
        }
        .wg-chart-cell-num.active.green {
          background: var(--theme-primary) !important;
        }
        .wg-chart-cell-num.active.red {
          background: radial-gradient(circle at 35% 25%, #fca5a5 0%, #ef4444 50%, #b91c1c 100%) !important;
        }
        .wg-chart-cell-num.active.v0 {
          background: linear-gradient(135deg, #7c3aed 0%, #7c3aed 50%, #ef4444 50%, #ef4444 100%) !important;
        }
        .wg-chart-cell-num.active.v5 {
          background: var(--theme-bg-card) !important;
        }

        /* Number grid overrides for active highlight color disappearance */
        .wg-num-btn:focus,
        .wg-num-btn:active,
        .wg-num-btn:hover {
          outline: none !important;
          color: var(--theme-text) !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        .wg-num-btn.green:focus,
        .wg-num-btn.green:active {
          background: var(--theme-primary) !important;
        }
        
        .wg-num-btn.red:focus,
        .wg-num-btn.red:active {
          background: radial-gradient(circle at 35% 25%, #fca5a5 0%, #ef4444 50%, #b91c1c 100%) !important;
        }
        
        .wg-num-btn.v0:focus,
        .wg-num-btn.v0:active {
          background: linear-gradient(135deg, #7c3aed 0%, #7c3aed 50%, #ef4444 50%, #ef4444 100%) !important;
        }
        
        .wg-num-btn.v5:focus,
        .wg-num-btn.v5:active {
          background: var(--theme-bg-card) !important;
        }

        @keyframes wgToastIn {
          from { opacity: 0; transform: translate(-50%, -45%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      {centerToast && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          color: "var(--theme-text)",
          padding: "10px 20px",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "700",
          textAlign: "center",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
          pointerEvents: "none",
          animation: "wgToastIn 0.15s ease-out forwards" }}>
          {centerToast.message}
        </div>
      )}
      <ToastStack toasts={toasts} />
    </main>
  );
}
