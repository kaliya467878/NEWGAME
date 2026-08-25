"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { getToken } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { getBalance } from "@/lib/walletApi";
import {
  getCurrentPeriod,
  getRecentResults,
  placeBet,
  getMyBets } from "@/lib/k3Api";
import {
  DURATIONS,
  DURATION_SEC,
  getDurationMeta,
  formatTimer,
  MULTIPLIERS,
  formatBetLabel,
  calculateK3Combinations,
  groupK3BetsForDisplay
} from "@/lib/k3Utils";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import BrandLogo from "@/components/brand/BrandLogo";
import OutcomePopup from "../games/OutcomePopup";
import { Odometer } from "@/components/Odometer";
import Dice2D from "@/components/k3/Dice2D";
import HowToPlayModal from "@/components/games/HowToPlayModal";
import { Clock, HelpCircle } from "lucide-react";
import { GameHeader } from "@/components/games/GameHeader";
import { useToasts, ToastStack } from "@/components/ui/Toast";

const K3_RULE_SECTIONS = [
  {
    title: "Size & parity bets",
    items: [
      { label: "Big", detail: "Dice sum is 11–18", tag: "blue", payout: `${MULTIPLIERS.size}x` },
      { label: "Small", detail: "Dice sum is 3–10", tag: "orange", payout: `${MULTIPLIERS.size}x` },
      { label: "Odd", detail: "Dice sum is odd", tag: "red", payout: `${MULTIPLIERS.parity}x` },
      { label: "Even", detail: "Dice sum is even", tag: "green", payout: `${MULTIPLIERS.parity}x` },
    ] },
  {
    title: "Sum value bet",
    items: [
      { label: "Exact sum", detail: "Pick the exact total (3–18) of all 3 dice", tag: "gold", payout: "23.52x – 176.4x, rarer sums pay more" },
    ] },
  {
    title: "Combination bets",
    items: [
      { label: "Any triple", detail: "All 3 dice show the same number", tag: "gold", payout: "33.87x" },
      { label: "2 same (specific)", detail: "At least 2 dice show a chosen number", tag: "gold", payout: "13.52x" },
      { label: "2 same + 1 unique", detail: "Two dice match, third is a different chosen number", tag: "gold", payout: "67.74x" },
      { label: "3 same (specific)", detail: "All 3 dice show one exact chosen number", tag: "gold", payout: "203.21x" },
      { label: "3 different", detail: "3 chosen distinct numbers all appear", tag: "gold", payout: "33.87x" },
      { label: "2 different", detail: "2 chosen distinct numbers both appear", tag: "gold", payout: "6.77x" },
      { label: "3 continuous", detail: "The 3 dice form a run, e.g. 3-4-5", tag: "gold", payout: "8.47x" },
    ] },
];

const K3_RULE_NOTES = [
  "Bets lock 5 seconds before the round ends.",
  "Total stake = base amount × quantity.",
  "Every bet carries a flat 2% bet fee — a 100 bet has a 98 contract amount, and payouts above are already net of that fee.",
  "Winnings are credited automatically after the dice are revealed.",
];

const T_0 = 1783728000000; // 2026-07-11 00:00:00 UTC in ms

function getModeCode(duration) {
  if (duration === "30s" || duration === "S30") return "30";
  if (duration === "1m" || duration === "M1") return "01";
  if (duration === "3m" || duration === "M3") return "03";
  if (duration === "5m" || duration === "M5") return "05";
  if (duration === "10m" || duration === "M10") return "10";
  return "00";
}



export default function K3GameScreen({ initialPeriod = null, initialResults = [] }) {
  const params = useParams();
  const router = useRouter();
  let duration = params.duration || "1m";
  if (duration === "1min") duration = "1m";
  if (duration === "3min") duration = "3m";
  if (duration === "5min") duration = "5m";
  if (duration === "10min") duration = "10m";

  const { maintenanceMode, blocksAction } = usePlatformStatus();
  const { toasts, push: pushToast } = useToasts();

  // Seeded from the last known balance in localStorage so the wallet card
  // never flashes ₹0.00 while the client's own fetch is still in flight.
  const [balance, setBalance] = useState(() => {
    if (typeof window === "undefined") return 0;
    const cached = Number(window.localStorage.getItem("lastBalance"));
    return Number.isFinite(cached) ? cached : 0;
  });
  const [refreshing, setRefreshing] = useState(false);
  // Seeded with server-fetched data (see app/k3/[duration]/page.js) so the
  // period/history are on screen immediately — no empty flash while the
  // client's own fetch is in flight.
  const [period, setPeriod] = useState(() => {
    if (typeof window === "undefined") return initialPeriod;
    const cachedPeriod = window.localStorage.getItem(`k3_period_${duration}`);
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
    const cachedResults = window.localStorage.getItem(`k3_results_${duration}`);
    if (cachedResults) {
      try {
        return JSON.parse(cachedResults);
      } catch (e) {}
    }
    return [];
  });
  const [myBets, setMyBets] = useState(() => {
    if (typeof window === "undefined") return [];
    const cachedBets = window.localStorage.getItem(`k3_mybets_${duration}`);
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
      const cachedPeriod = window.localStorage.getItem(`k3_period_${duration}`);
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
      const cachedResults = window.localStorage.getItem(`k3_results_${duration}`);
      if (cachedResults) {
        try {
          newResults = JSON.parse(cachedResults);
        } catch (e) {}
      }
      const cachedBets = window.localStorage.getItem(`k3_mybets_${duration}`);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyTab, setHistoryTab] = useState("game");
  const [expandedBetId, setExpandedBetId] = useState(null);
  
  // Pagination page states
  const [gamePage, setGamePage] = useState(1);
  const [chartPage, setChartPage] = useState(1);
  const [myPage, setMyPage] = useState(1);
  
  const [betCategory, setBetCategory] = useState("total");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [centerToast, setCenterToast] = useState(null);
  const [selectedChips, setSelectedChips] = useState({});
  const [baseAmount, setBaseAmount] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [agreed, setAgreed] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);
  // Seeded from the latest known result (falls back to a placeholder face) so
  // the dice rest on a real value instead of snapping to it after mount.
  const [diceAnim, setDiceAnim] = useState(initialResults?.[0]?.dices || [5, 4, 5]);
  const [isRolling, setIsRolling] = useState(false);
  const [outcomePopup, setOutcomePopup] = useState(null);
  const myBetsRef = useRef([]);
  const shownOutcomeIdsRef = useRef(new Set());
  // Tracks which period's result has already been applied to diceAnim, so the
  // dice only "land" once — and so the roll never stops on a stale mid-shuffle
  // value (see loadData, which is the only place diceAnim is written once a
  // round is live: the backend never emits the k3:result socket event).
  const lastAppliedResultPeriodRef = useRef(
    initialResults?.[0]?.periodId != null ? String(initialResults[0].periodId) : null
  );
  // Absolute end-of-round timestamp (ms). The countdown is derived from this so
  // it never drifts or stutters, instead of being decremented/overwritten by
  // several 1s intervals fighting each other. Anchored from the server-fetched
  // initial period so the countdown ticks immediately, before the client's own
  // fetch even resolves. Lazily computed once via the guarded-assignment
  // pattern (React docs' recommended way to seed a ref with an impure/expensive
  // value without recomputing it on every render).
  const clockOffsetRef = useRef(0);
  const endsAtRef = useRef(undefined);
  if (endsAtRef.current === undefined) {
    const offset = initialPeriod?.serverTime ? Number(initialPeriod.serverTime) - Date.now() : 0;
    clockOffsetRef.current = offset;
    endsAtRef.current = initialPeriod ? Date.now() + offset + initialPeriod.remainingSeconds * 1000 : null;
  }
  const refreshedPeriodRef = useRef(null);
  // Holds the pending "stop rolling" timeout so the dice roll for a fixed 5s
  // window after each round ends — independent of how long settlement/network
  // takes — and so a stale timer from a prior round/duration can be cancelled.
  const rollStopTimerRef = useRef(null);

  const rollingPeriodIdRef = useRef(null);
  const rollStartTimeRef = useRef(0);
  const pendingResultRef = useRef(null);
  const pendingBetsRef = useRef(null);
  const pollTimerRef = useRef(null);

  const checkAndRevealResult = useCallback(() => {
    const endedPeriodId = rollingPeriodIdRef.current;
    if (!endedPeriodId) return;

    if (pendingResultRef.current && String(pendingResultRef.current.periodId) === String(endedPeriodId)) {
      const res = pendingResultRef.current;
      setResults((prev) => {
        const exists = prev.some((r) => String(r.periodId) === String(res.periodId));
        if (exists) return prev;
        return [res, ...prev].slice(0, 50);
      });
      setDiceAnim(res.dices);
      lastAppliedResultPeriodRef.current = String(res.periodId);

      if (pendingBetsRef.current) {
        const outcome = pendingBetsRef.current;
        if (!outcome.dice) {
          outcome.dice = res.dices;
          outcome.sum = res.sum;
        }
        setOutcomePopup(outcome);
        pendingBetsRef.current = null;
      }

      loadDataRef.current && loadDataRef.current();

      setIsRolling(false);
      rollingPeriodIdRef.current = null;
      pendingResultRef.current = null;
    }
  }, [setResults, setDiceAnim]);

  const timer = formatTimer(period?.remainingSeconds ?? 0);
  const remainingSeconds = period?.remainingSeconds ?? 0;
  const showCountdownOverlay = remainingSeconds > 0 && remainingSeconds <= 5;
  const bettingLocked = showCountdownOverlay || loading || maintenanceMode || blocksAction("bet");

  // History period labels must read as one continuous descending run anchored
  // to the live round (current-1, current-2, …), rather than the stored
  // roundNumber which can lag the clock if settlement stalls. Only the label
  // is re-anchored; dice/sum values stay real. No-op when the backend is fresh.
  const displayResults = useMemo(() => {
    return results.map((r) => ({
      ...r,
      displayPeriodId: r.periodId }));
  }, [results]);

  const loadDataRef = useRef();

  // Apply authoritative period data (from the API poll or socket tick) without
  // clobbering the smooth local countdown: only (re)anchor the end time on a new
  // period or when the client has drifted more than 2s from the server.
  const syncPeriod = useCallback((data) => {
    const serverTime = Number(data?.serverTime);
    if (serverTime) {
      clockOffsetRef.current = serverTime - Date.now();
    }
    const serverRemaining = Math.max(0, Math.round(Number(data?.remainingSeconds)) || 0);
    setPeriod((prev) => {
      const serverPeriodId = data?.periodId || prev?.periodId;
      const offset = clockOffsetRef.current;
      if (!prev) {
        endsAtRef.current = Date.now() + offset + serverRemaining * 1000;
        return { ...data, periodId: serverPeriodId, remainingSeconds: serverRemaining };
      }

      // Check if server is lagging behind the client's locally advanced period
      let isLagging = false;
      try {
        if (BigInt(serverPeriodId) < BigInt(prev.periodId)) {
          isLagging = true;
        }
      } catch (e) {}

      if (isLagging) {
        const localRemaining =
          endsAtRef.current != null
            ? Math.max(0, Math.round((endsAtRef.current - (Date.now() + offset)) / 1000))
            : 0;
        return { ...prev, remainingSeconds: localRemaining };
      }

      const isNewPeriod = prev.periodId !== serverPeriodId;
      const localRemaining =
        endsAtRef.current != null
          ? Math.max(0, Math.round((endsAtRef.current - (Date.now() + offset)) / 1000))
          : null;
          
      // If the client clock is fast, we might have advanced the period and started rolling early.
      // If the server confirms we're still in the older period with remaining time, cancel rolling.
      if (rollingPeriodIdRef.current) {
        try {
          if (BigInt(serverPeriodId) <= BigInt(rollingPeriodIdRef.current) && serverRemaining > 5) {
            setIsRolling(false);
            rollingPeriodIdRef.current = null;
            pendingResultRef.current = null;
            pendingBetsRef.current = null;
          }
        } catch (e) {}
      }

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
    // to a warm balance/results paint. Public data still never blocks on
    // private data failing (e.g. an expired token throwing a 401 shouldn't
    // wipe the game history off the screen too).
    const publicFetch = Promise.all([getCurrentPeriod(duration), getRecentResults(duration, 50)]);
    const privateFetch = getToken()
      ? Promise.all([getBalance(), getMyBets({ limit: 20, duration })])
      : null;

    let latestResults = null;
    try {
      const [periodRes, resultsRes] = await publicFetch;
      syncPeriod(periodRes.data);
      latestResults = resultsRes.data || [];
      localStorage.setItem(`k3_period_${duration}`, JSON.stringify({ ...periodRes.data, cachedAt: Date.now() }));
      localStorage.setItem(`k3_results_${duration}`, JSON.stringify(latestResults));

      const top = latestResults[0];
      const topPeriodId = top ? String(top.periodId) : null;
      const rollingPeriodId = rollingPeriodIdRef.current;

      if (rollingPeriodId && topPeriodId === String(rollingPeriodId)) {
        // Buffer the top result because it belongs to the period currently rolling
        pendingResultRef.current = top;
        setResults(latestResults.slice(1));

        // If the 5s timer has already expired, reveal immediately!
        if (Date.now() - rollStartTimeRef.current >= 5000) {
          checkAndRevealResult();
        }
      } else {
        setResults(latestResults);
        if (topPeriodId != null && topPeriodId !== lastAppliedResultPeriodRef.current) {
          lastAppliedResultPeriodRef.current = topPeriodId;
          setDiceAnim(top.dices);
        }
      }
    } catch (err) {
      setError("Failed to load game");
    }

    if (!privateFetch) return;
    try {
      const [balanceRes, betsRes] = await privateFetch;

      const serverBalance = balanceRes.data.balance;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lastBalance", String(serverBalance));
      }
      // Apply the balance the instant it arrives instead of holding it back
      // until the dice-roll animation finishes — a real-money wallet number
      // should never lag behind what the server actually credited, even if
      // that means it updates a beat before the dice visually land.
      setBalance(serverBalance);

      const newBets = betsRes.data?.bets || [];

      // Detect bets that just resolved (pending -> won/lost) since the last
      // poll and show the win/loss popup for them. This can't rely on the
      // `k3:result` socket event below — the server never emits it.
      const prevById = new Map(myBetsRef.current.map((b) => [b._id || b.id, b]));
      const justResolvedBets = newBets.filter((bet) => {
        const id = bet._id || bet.id;
        const prevBet = prevById.get(id);
        const prevPending = prevBet && (prevBet.state === "pending" || prevBet.status === "pending");
        const betResolved = bet && (bet.state === "won" || bet.state === "lost" || bet.status === "won" || bet.status === "lost");
        return (
          prevBet &&
          prevPending &&
          betResolved &&
          !shownOutcomeIdsRef.current.has(id)
        );
      });
      if (justResolvedBets.length > 0) {
        const periodId = justResolvedBets[0].periodId;
        const resolvedForPeriod = justResolvedBets.filter((b) => String(b.periodId) === String(periodId));
        resolvedForPeriod.forEach((b) => shownOutcomeIdsRef.current.add(b._id || b.id));
        const wonBet = resolvedForPeriod.find((b) => b.state === "won" || b.status === "won");
        const totalWinAmount = resolvedForPeriod.reduce((sum, b) => sum + ((b.state === "won" || b.status === "won") ? b.winAmount : 0), 0);
        const totalBetAmount = resolvedForPeriod.reduce((sum, b) => sum + b.amount, 0);
        const matchedResult =
          (latestResults || results).find((r) => String(r.periodId) === String(periodId)) ||
          (pendingResultRef.current && String(pendingResultRef.current.periodId) === String(periodId) ? pendingResultRef.current : null);

        const outcome = {
          show: true,
          type: wonBet ? "win" : "lose",
          amount: wonBet ? totalWinAmount : totalBetAmount,
          periodId,
          dice: matchedResult?.dices,
          sum: matchedResult?.sum };

        setOutcomePopup(outcome);
      }
      const serverBetIds = new Set(newBets.map((b) => b._id || b.id));
      const missingPendingBets = myBetsRef.current.filter((b) => 
        (b.status === "pending" || b.state === "pending") && !serverBetIds.has(b._id || b.id)
      );
      const combinedBets = [...missingPendingBets, ...newBets];

      myBetsRef.current = combinedBets;
      localStorage.setItem(`k3_mybets_${duration}`, JSON.stringify(combinedBets));
      const currentRollingId = rollingPeriodIdRef.current;
      if (currentRollingId) {
        const displayedBets = combinedBets.map((b) => {
          if (String(b.periodId) === String(currentRollingId)) {
            return { ...b, state: "pending", winAmount: 0 };
          }
          return b;
        });
        setMyBets(displayedBets);
      } else {
        setMyBets(combinedBets);
      }
    } catch (err) {
      // Private data failing (e.g. expired token) shouldn't surface as a
      // fatal error — the public game state above already loaded fine.
    }
  }, [duration, syncPeriod, checkAndRevealResult]);

  loadDataRef.current = loadData;

  useEffect(() => {
    loadData();
    setGamePage(1);
    setChartPage(1);
    setMyPage(1);
    let activeSocket = null;
    let cancelled = false;

    getSocket().then((socket) => {
      if (!socket || cancelled) return;
      activeSocket = socket;
      socket.emit("k3:join", duration);
      socket.emit("join:user");

      const onWalletUpdated = (data) => {
        if (typeof data?.balance === "number") {
          setBalance(data.balance);
          window.localStorage.setItem("lastBalance", String(data.balance));
        }
      };
      socket.on("wallet:updated", onWalletUpdated);
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.emit("k3:leave", duration);

        activeSocket.off("wallet:updated");
      }
    };
  }, [duration, loadData]);

  // Smooth countdown derived from the anchored end time. Runs at 250ms so the
  // displayed second flips exactly on the boundary (no drift, no skipped/stuck
  // seconds), and only writes state when the integer second actually changes.
  useEffect(() => {
    const smoothTick = setInterval(() => {
      if (endsAtRef.current == null) return;
      const offset = clockOffsetRef.current;
      const remaining = Math.max(0, Math.round((endsAtRef.current - (Date.now() + offset)) / 1000));
      // Fires exactly once per round transition. Deliberately computed and
      // acted on OUTSIDE the setPeriod updater below — React may invoke a
      // state updater more than once, and mutating endsAtRef/scheduling the
      // roll-stop timer in there would risk double-applying them.
      const isRoundEnd = remaining === 0 && refreshedPeriodRef.current !== period?.periodId;

      if (isRoundEnd) {
        refreshedPeriodRef.current = period?.periodId;
        const endedPeriodId = period?.periodId;
        rollingPeriodIdRef.current = endedPeriodId;
        rollStartTimeRef.current = Date.now();

        // Advance the countdown to the next round immediately by extending the
        // anchor by exactly one round length — rounds sit back-to-back on a
        // fixed wall-clock grid (lib/k3/rounds.ts), so this is exact, not a
        // guess. Without this the displayed timer would freeze at 00:00 until
        // the server's period response returns, however long settlement + the
        // network round-trip take — i.e. the seconds must never stop dropping
        // just because the previous round's result is still being drawn.
        const durationSec = DURATION_SEC[duration] || 60;
        endsAtRef.current += durationSec * 1000;

        // Roll the dice for a fixed 5s window regardless of how long
        // settlement/network takes, while the new round's timer (just
        // advanced above) keeps counting down uninterrupted underneath it.
        // Kick off an immediate refresh so data is in flight right away, then
        // refetch once more right as the window closes so the dice land on the
        // real result and game history is updated in the same beat the roll
        // stops.
        setIsRolling(true);
        pendingResultRef.current = null;
        pendingBetsRef.current = null;

        loadDataRef.current && loadDataRef.current();
        clearTimeout(rollStopTimerRef.current);
        rollStopTimerRef.current = setTimeout(() => {
          checkAndRevealResult();
        }, 5000);

        // Start gentle poll for result of the ended period
        clearInterval(pollTimerRef.current);
        const rollingPeriodId = rollingPeriodIdRef.current;
        pollTimerRef.current = setInterval(async () => {
          if (pendingResultRef.current || !rollingPeriodIdRef.current) {
            clearInterval(pollTimerRef.current);
            return;
          }
          try {
            const resultsRes = await getRecentResults(duration, 50);
            const latest = resultsRes.data || [];
            const top = latest[0];
            const topPeriodId = top ? String(top.periodId) : null;
            if (topPeriodId === String(rollingPeriodId)) {
              pendingResultRef.current = top;
              clearInterval(pollTimerRef.current);
              if (loadDataRef.current) loadDataRef.current();
              if (Date.now() - rollStartTimeRef.current >= 5000) {
                checkAndRevealResult();
              }
            }
          } catch (e) {
            console.error(e);
          }
        }, 2000);
      }

      setPeriod((prev) => {
        if (!prev) return prev;
        // Recompute from endsAtRef (already advanced above if the round just
        // ended) rather than reusing the outer `remaining`, so this reflects
        // the new round's full duration instead of the stale 0.
        const nowRemaining = Math.max(0, Math.round((endsAtRef.current - (Date.now() + offset)) / 1000));
        let currentPeriodId = prev.periodId;
        if (isRoundEnd) {
          try {
            currentPeriodId = String(BigInt(prev.periodId) + 1n);
          } catch (e) {
            console.error(e);
          }
        }
        if (prev.remainingSeconds === nowRemaining && prev.periodId === currentPeriodId) return prev;
        return { ...prev, periodId: currentPeriodId, remainingSeconds: nowRemaining };
      });
    }, 250);
    // Only tears down the interval. Deliberately does NOT clear
    // rollStopTimerRef here — this effect re-runs on every `period` change
    // (≈once a second, whenever the displayed second ticks over), so clearing
    // the 5s roll-stop timer in this cleanup would cancel it almost
    // immediately, every time, and the dice would never stop rolling. See the
    // dedicated effect below for that timer's actual lifecycle.
    return () => clearInterval(smoothTick);
  }, [period, duration, checkAndRevealResult]);

  // Cancels any in-flight roll-stop timer when switching game duration/tab or
  // unmounting, so a stale timer from a previous context can never fire and
  // flip isRolling for the wrong round.
  useEffect(() => {
    return () => {
      clearTimeout(rollStopTimerRef.current);
      clearInterval(pollTimerRef.current);
      rollingPeriodIdRef.current = null;
      rollStartTimeRef.current = 0;
      pendingResultRef.current = null;
      pendingBetsRef.current = null;
    };
  }, [duration]);

  // Reliable periodic refresh for game history/period — the socket events
  // above never actually fire (no backend emitter), and the local ticker's
  // stuck-at-zero fallback only fires loadData() once per round with no
  // retry, which let history fall multiple rounds behind if that single
  // attempt ever failed or lagged.
  useEffect(() => {
    const refreshInterval = setInterval(() => { loadDataRef.current && loadDataRef.current(); }, 4000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Keep the wallet balance fresh so wins/losses reflect without a manual reload
  useEffect(() => {
    const refreshBalance = async () => {
      if (!getToken()) return;
      try {
        const res = await getBalance();
        setBalance(res.data.balance);
      } catch {
        // ignore transient balance refresh failures
      }
    };
    const balanceInterval = setInterval(refreshBalance, 5000);
    return () => clearInterval(balanceInterval);
  }, []);

  const handleRefreshBalance = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await getBalance();
      setBalance(res.data.balance);
    } catch (err) {
      console.error("Failed to refresh balance", err);
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  };

  const BASE_AMOUNTS = [1, 10, 100, 1000];
  const MULTIPLIERS_ARRAY = [1, 5, 10, 20, 50, 100];

  const confirmBet = async () => {
    if (bettingLocked) return;
    if (quantity < 1) {
      pushToast("Please enter a valid quantity.", "error");
      return;
    }
    
    const generatedBets = calculateK3Combinations(selectedChips);
    if (generatedBets.length === 0) {
      pushToast("Please select at least one valid combination.", "error");
      return;
    }

    const betAmountPerCombo = baseAmount * quantity;
    const totalDeducted = betAmountPerCombo * generatedBets.length;

    setBalance(prev => Math.max(0, prev - totalDeducted));

    const durationSecs = duration === "30s" ? 30 : duration === "1m" ? 60 : duration === "3m" ? 180 : duration === "5m" ? 300 : 600;
    const tempIds = generatedBets.map((_, index) => `opt-${Date.now()}-${index}`);
    const optimisticBets = generatedBets.map((originBet, index) => {
      const generatedId = tempIds[index];
      return {
        _id: generatedId,
        id: generatedId,
        periodId: String(period?.periodId || ""),
        amount: betAmountPerCombo,
        winAmount: 0,
        payoutRatio: 0,
        state: "pending",
        status: "pending",
        createdAt: new Date().toISOString(),
        dices: [],
        resultSum: null,
        resultSize: "",
        resultParity: "",
        betType: originBet.betType.toLowerCase(),
        betValue: originBet.betValue.toLowerCase(),
        duration: durationSecs,
        orderNumber: `K3${period?.periodId || ""}${generatedId.slice(-8)}`.toUpperCase(),
        details: {
          betType: originBet.betType.toLowerCase(),
          betValue: originBet.betValue.toLowerCase(),
          duration: duration }
      };
    });

    setMyBets(prev => [...optimisticBets, ...prev]);
    myBetsRef.current = [...optimisticBets, ...myBetsRef.current];

    setIsModalOpen(false);
    setSelectedChips({});
    setLoading(true);

    try {
      const responses = await Promise.all(generatedBets.map(bet => 
        placeBet(duration, {
          betType: bet.betType,
          betValue: bet.betValue,
          amount: betAmountPerCombo
        })
      ));

      const updatedBets = optimisticBets.map((optBet, index) => {
        const betData = responses[index]?.data;
        const realId = betData?._id || betData?.id;
        if (realId) {
          return {
            ...optBet,
            _id: realId,
            id: realId,
            orderNumber: `K3${period?.periodId || ""}${realId.slice(-8)}`.toUpperCase()
          };
        }
        return optBet;
      });

      setMyBets(prev => prev.map(b => {
        const optIndex = tempIds.indexOf(b.id);
        return optIndex !== -1 ? updatedBets[optIndex] : b;
      }));
      myBetsRef.current = myBetsRef.current.map(b => {
        const optIndex = tempIds.indexOf(b.id);
        return optIndex !== -1 ? updatedBets[optIndex] : b;
      });

      setCenterToast({ message: "Bet Successful", type: "success" });
      setLoading(false);
      loadDataRef.current && loadDataRef.current();
      setTimeout(() => setCenterToast(null), 1000);
    } catch (err) {
      setBalance(prev => prev + totalDeducted);
      setMyBets(prev => prev.filter(b => !tempIds.includes(b.id)));
      myBetsRef.current = myBetsRef.current.filter(b => !tempIds.includes(b.id));
      pushToast(err.response?.data?.message || "Failed to place bet(s)", "error");
      setLoading(false);
    }
  };

  const isSelected = (bType, bVal) => {
    const current = selectedChips[bType];
    if (Array.isArray(current)) {
      return current.includes(bVal);
    }
    return !!current;
  };

  const selectBet = (bType, bVal) => {
    setSelectedChips(prev => {
      const next = { ...prev };
      if (bVal === "any") {
        next[bType] = !next[bType];
      } else {
        if (!next[bType]) next[bType] = [];
        if (next[bType].includes(bVal)) {
          next[bType] = next[bType].filter(v => v !== bVal);
        } else {
          next[bType] = [...next[bType], bVal];
        }
      }
      return next;
    });
  };

  const totalCombinations = calculateK3Combinations(selectedChips).length;

  const closeBetSheet = () => {
    setSelectedChips({});
    setIsModalOpen(false);
    setError("");
  };

  const setBetQuantity = (val) => {
    if (val === "") {
      setQuantity("");
      return;
    }
    const next = parseInt(val, 10);
    if (isNaN(next) || next < 1) return;
    setQuantity(next);
  };

  const renderDiceValue = (val) => {
    return <img src={`/k3/images/${val}.png`} alt={`Dice ${val}`} className="w-6 h-6 object-contain" />;
  };

  const renderBetGrid = () => {
    if (betCategory === "total") {
      const numbers = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      return (
        <div className="k3-chip-grid">
          {numbers.map(num => {
            // Replicating exactly red vs green as shown in the mockup
            // Red: 3, 5, 7, 9, 11, 13, 15, 17
            // Green: 4, 6, 8, 10, 12, 14, 16, 18
            const theme = (num % 2 !== 0) ? "theme-red" : "theme-green";
            const active = isSelected("total", String(num)) ? "selected" : "";
            const multDisplay = (MULTIPLIERS[`total_${num}`] === 207) ? "207.36X" : (MULTIPLIERS[`total_${num}`] === 60 ? "69.12X" : `${MULTIPLIERS[`total_${num}`]}X`);

            return (
              <div key={num} className={`k3-chip-wrapper ${active}`} onClick={() => selectBet("total", String(num), MULTIPLIERS[`total_${num}`])}>
                <div className={`k3-chip-btn ${theme}`}>
                  <div className="k3-chip-inner">
                    <span className="k3-chip-val">{num}</span>
                  </div>
                </div>
                <span className="k3-chip-mult">{multDisplay}</span>
              </div>
            );
          })}
          <div style={{ gridColumn: "span 4", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "16px" }}>
            <button className={`k3-wg-color-btn red ${isSelected("size", "big") ? "active" : ""}`} onClick={() => selectBet("size", "big", MULTIPLIERS.size)}>BIG</button>
            <button className={`k3-wg-color-btn green ${isSelected("size", "small") ? "active" : ""}`} onClick={() => selectBet("size", "small", MULTIPLIERS.size)}>SMALL</button>
            <button className={`k3-wg-color-btn red ${isSelected("parity", "odd") ? "active" : ""}`} onClick={() => selectBet("parity", "odd", MULTIPLIERS.parity)}>ODD</button>
            <button className={`k3-wg-color-btn green ${isSelected("parity", "even") ? "active" : ""}`} onClick={() => selectBet("parity", "even", MULTIPLIERS.parity)}>EVEN</button>
          </div>
        </div>
      );
    }
    if (betCategory === "2_same") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "16px" }}>
          <div>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "8px" }}>2 matching numbers: odds({MULTIPLIERS["2_same_specific"]}) <HelpCircle size={14} className="inline text-red-500" /></div>
            <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", padding: 0 }}>
              {[11, 22, 33, 44, 55, 66].map(num => (
                <div key={num} className={`k3-chip-square theme-violet ${isSelected("2_same_specific", String(num)) ? "active" : ""}`} onClick={() => selectBet("2_same_specific", String(num))}>
                  {num}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "8px" }}>A pair of unique numbers: odds(69.12) <HelpCircle size={14} className="inline text-red-500" /></div>
            <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", padding: 0, marginBottom: "8px" }}>
              {[11, 22, 33, 44, 55, 66].map(num => (
                <div key={`pair_${num}`} className={`k3-chip-square theme-red ${isSelected("2_same_unique_pair", String(num)) ? "active" : ""}`} onClick={() => selectBet("2_same_unique_pair", String(num))}>
                  {num}
                </div>
              ))}
            </div>
            <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", padding: 0 }}>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <div key={`single_${num}`} className={`k3-chip-square theme-green ${isSelected("2_same_unique_single", String(num)) ? "active" : ""}`} onClick={() => selectBet("2_same_unique_single", String(num))}>
                  {num}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (betCategory === "3_same") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "16px" }}>
          <div>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "8px" }}>3 of the same number: odds(207.36) <HelpCircle size={14} className="inline text-red-500" /></div>
            <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", padding: 0 }}>
              {[111, 222, 333, 444, 555, 666].map(num => (
                <div key={num} className={`k3-chip-square theme-violet ${isSelected("3_same_specific", String(num)) ? "active" : ""}`} onClick={() => selectBet("3_same_specific", String(num))}>
                  {num}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "8px" }}>Any 3 of the same number: odds(34.56) <HelpCircle size={14} className="inline text-red-500" /></div>
            <div className={`k3-chip-square theme-red ${isSelected("3_same_any", "any") ? "active" : ""}`} onClick={() => selectBet("3_same_any", "any")} style={{ width: "100%", padding: "12px 0", borderRadius: "6px" }}>
              Any 3 of the same number: odds
            </div>
          </div>
        </div>
      );
    }
    if (betCategory === "different") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "16px" }}>
          <div>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "8px" }}>3 different numbers: odds(34.56) <HelpCircle size={14} className="inline text-red-500" /></div>
            <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", padding: 0 }}>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <div key={num} className={`k3-chip-square theme-violet ${isSelected("3_diff", String(num)) ? "active" : ""}`} onClick={() => selectBet("3_diff", String(num))}>
                  {num}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "8px" }}>3 continuous numbers: odds(8.64) <HelpCircle size={14} className="inline text-red-500" /></div>
            <div className={`k3-chip-square theme-red ${isSelected("3_cont", "any") ? "active" : ""}`} onClick={() => selectBet("3_cont", "any")} style={{ width: "100%", padding: "12px 0", borderRadius: "6px" }}>
              3 continuous numbers
            </div>
          </div>
          <div>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "8px" }}>2 different numbers: odds(6.91) <HelpCircle size={14} className="inline text-red-500" /></div>
            <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", padding: 0 }}>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <div key={`2diff_${num}`} className={`k3-chip-square theme-violet ${isSelected("2_diff", String(num)) ? "active" : ""}`} onClick={() => selectBet("2_diff", String(num))}>
                  {num}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="k3-container">
      <GameHeader
        title="K3 Lot"
        durations={DURATIONS.map(d => ({ id: d.id, label: `K3 Lot ${d.label}` }))}
        activeDuration={duration}
        durationHrefPrefix="/k3"
      />

      {/* GAME ARENA */}
      <div className="k3-game-arena">
        {/* Period & Countdown */}
        <div className="k3-period-header">
          <div className="k3-period-col">
            <div className="k3-period-label-row">
              <span className="k3-period-label">Period</span>
              <button className="k3-how-to-play" onClick={() => setRulesOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                How to play
              </button>
            </div>
            <div className="k3-period-value">{period ? period.periodId : "Loading..."}</div>
          </div>
          <div className="k3-timer-col">
            <div className="k3-timer-label">Time remaining</div>
            <div className="k3-timer-boxes">
              <div className="k3-time-box">{timer.mm[0]}</div>
              <div className="k3-time-box">{timer.mm[1]}</div>
              <div className="k3-time-sep">:</div>
              <div className="k3-time-box">{timer.ss[0]}</div>
              <div className="k3-time-box">{timer.ss[1]}</div>
            </div>
          </div>
        </div>

        {/* Dice Stage — clean 2D vector dice */}
        <div className="k3-dice-stage">
          <div className="k3-dice-arrow left"></div>
          <div className="k3-dice-slots-container">
            {diceAnim.map((die, i) => (
              <div key={i} className="k3-dice-slot">
                <Dice2D value={die} rolling={isRolling} index={i} />
              </div>
            ))}
          </div>
          <div className="k3-dice-arrow right"></div>
        </div>
      </div>
      
      {/* BETTING SECTION WRAPPER */}
      <div className="k3-betting-section-wrapper" style={{ position: "relative" }}>
        {showCountdownOverlay && (
          <div className="k3-big-countdown-overlay">
             <div className="k3-big-digit">0</div>
             <div className="k3-big-digit">{remainingSeconds}</div>
          </div>
        )}

        {/* Betting Category Segments */}
        <div className="k3-segments">
          <div className={`k3-segment ${betCategory === "total" ? "active" : ""}`} onClick={() => setBetCategory("total")}>Total</div>
          <div className={`k3-segment ${betCategory === "2_same" ? "active" : ""}`} onClick={() => setBetCategory("2_same")}>2 same</div>
          <div className={`k3-segment ${betCategory === "3_same" ? "active" : ""}`} onClick={() => setBetCategory("3_same")}>3 same</div>
          <div className={`k3-segment ${betCategory === "different" ? "active" : ""}`} onClick={() => setBetCategory("different")}>Different</div>
        </div>

        {/* Number Grid */}
        {renderBetGrid()}
      </div>

      {/* HISTORY SECTION */}
      <div className="k3-history-section">
        <div className="k3-history-tabs">
          <button className={`k3-hist-tab ${historyTab === "game" ? "active" : ""}`} onClick={() => setHistoryTab("game")}>Game history</button>
          <button className={`k3-hist-tab ${historyTab === "chart" ? "active" : ""}`} onClick={() => setHistoryTab("chart")}>Chart</button>
          <button className={`k3-hist-tab ${historyTab === "my" ? "active" : ""}`} onClick={() => setHistoryTab("my")}>My history</button>
        </div>

        {historyTab === "game" && (() => {
          const PAGE_SIZE = 5;
          const gamePageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
          const activeGamePage = Math.min(gamePage, gamePageCount);
          const pagedGameResults = displayResults.slice((activeGamePage - 1) * PAGE_SIZE, activeGamePage * PAGE_SIZE);
          return (
            <>
              <div className="k3-history-table">
                <div className="k3-history-th">
                  <div className="k3-th-col">Period</div>
                  <div className="k3-th-col">Sum</div>
                  <div className="k3-th-col">Results</div>
                </div>
                <div className="k3-history-body">
                  {results.length === 0 && <div style={{padding: "20px", textAlign: "center", color: "#888"}}>No data available</div>}
                  {pagedGameResults.map((res, i) => {
                    const sum = res.sum;
                    return (
                      <div key={i} className="k3-history-tr">
                        <div className="k3-td-col" style={{ fontSize: "12px" }}>{res.displayPeriodId?.slice(-8)}</div>
                        <div className="k3-td-col k3-td-sum">
                          <span className="k3-sum-val">{sum}</span>
                          <span className="k3-sum-size">{res.size === "big" ? "Big" : "Small"}</span>
                          <span className="k3-sum-parity">{res.parity === "even" ? "Even" : "Odd"}</span>
                        </div>
                        <div className="k3-td-col k3-td-dice">
                          {res.dices.map((d, di) => (
                            <div key={di} className="k3-mini-die">
                              {renderDiceValue(d)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination Controls */}
              {results.length > 0 && (
                <div className="wg-pagination">
                  <button
                    type="button"
                    onClick={() => setGamePage((prev) => Math.max(1, prev - 1))}
                    disabled={activeGamePage === 1}
                    className="wg-page-btn"
                  >
                    ‹
                  </button>
                  {Array.from({ length: gamePageCount }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setGamePage(p)}
                      className={`wg-page-btn ${activeGamePage === p ? "active" : ""}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setGamePage((prev) => Math.min(gamePageCount, prev + 1))}
                    disabled={activeGamePage === gamePageCount}
                    className="wg-page-btn"
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          );
        })()}

        {historyTab === "chart" && (() => {
          const PAGE_SIZE = 5;
          const chartPageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
          const activeChartPage = Math.min(chartPage, chartPageCount);
          const pagedChartResults = displayResults.slice((activeChartPage - 1) * PAGE_SIZE, activeChartPage * PAGE_SIZE);
          return (
            <>
              <div className="k3-history-table">
                <div className="k3-history-th">
                  <div className="k3-th-col">Period</div>
                  <div className="k3-th-col">Results</div>
                  <div className="k3-th-col" style={{flex: 1.5}}>Number</div>
                </div>
                <div className="k3-history-body">
                  {results.length === 0 && <div style={{padding: "20px", textAlign: "center", color: "#888"}}>No data available</div>}
                  {pagedChartResults.map((res, i) => {
                    const sorted = [...res.dices].sort();
                    let combText = "3 different numbers";
                    if (sorted.length === 3) {
                      if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) combText = "3 same numbers";
                      else if (sorted[0] === sorted[1] || sorted[1] === sorted[2]) combText = "2 same numbers";
                      else if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) combText = "3 continuous numbers";
                    }

                    return (
                      <div key={i} className="k3-history-tr">
                        <div className="k3-td-col" style={{ fontSize: "12px" }}>{res.displayPeriodId?.slice(-8)}</div>
                        <div className="k3-td-col k3-td-dice">
                          {res.dices.map((d, di) => (
                            <div key={di} className="k3-mini-die">
                              {renderDiceValue(d)}
                            </div>
                          ))}
                        </div>
                        <div className="k3-td-col" style={{ fontSize: "12px", flex: 1.5, color: "#ccc" }}>
                          {combText}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pagination Controls */}
              {results.length > 0 && (
                <div className="wg-pagination">
                  <button
                    type="button"
                    onClick={() => setChartPage((prev) => Math.max(1, prev - 1))}
                    disabled={activeChartPage === 1}
                    className="wg-page-btn"
                  >
                    ‹
                  </button>
                  {Array.from({ length: chartPageCount }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setChartPage(p)}
                      className={`wg-page-btn ${activeChartPage === p ? "active" : ""}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setChartPage((prev) => Math.min(chartPageCount, prev + 1))}
                    disabled={activeChartPage === chartPageCount}
                    className="wg-page-btn"
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          );
        })()}

        {historyTab === "my" && (() => {
          const PAGE_SIZE = 5;
          const myPageCount = Math.max(1, Math.ceil(myBets.length / PAGE_SIZE));
          const activeMyPage = Math.min(myPage, myPageCount);
          const pagedMyBets = myBets.slice((activeMyPage - 1) * PAGE_SIZE, activeMyPage * PAGE_SIZE);
          return (
            <>
              <div className="k3-history-table">
                <div className="k3-history-th">
                  <div className="k3-th-col" style={{flex: 1.5}}>Period</div>
                  <div className="k3-th-col">Detail</div>
                  <div className="k3-th-col">Result</div>
                </div>
                <div className="k3-history-body">
                  {myBets.length === 0 && <div style={{padding: "20px", textAlign: "center", color: "#888"}}>No bets yet</div>}
                  {pagedMyBets.map((bet, i) => {
                    const isWon = bet.status === "won";
                    const color = isWon ? "#00c97b" : bet.status === "lost" ? "#ff4d4d" : "#F5C542";
                    const sign = isWon ? "+" : "-";
                    const isExpanded = expandedBetId === (bet._id || bet.id);
                    return (
                      <React.Fragment key={i}>
                        <div 
                          className="k3-history-tr"
                          onClick={() => setExpandedBetId(isExpanded ? null : (bet._id || bet.id))}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="k3-td-col" style={{ fontSize: "12px", flex: 1.5, textAlign: "center" }}>
                            {String(bet.periodId ?? "").slice(-8)} {isExpanded ? "▲" : "▼"}<br/>
                            <span style={{color: "#888", fontSize: "10px"}}>₹{bet.amount}</span>
                          </div>
                          <div className="k3-td-col" style={{fontSize: "12px"}}>
                             {formatBetLabel(bet.details.betType, bet.details.betValue)}
                          </div>
                          <div className="k3-td-col" style={{color, fontWeight: 600}}>
                             {bet.status === "pending" ? "Pending" : `${isWon ? "Succeed" : "Failed"}`}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="k3-details-row" style={{ width: "100%", padding: "12px", borderBottom: "1px solid #333", fontSize: "11px", boxSizing: "border-box" }}>
                            <div style={{ color: "#F5C542", fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>Details</div>
                            
                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Order number</span>
                              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {bet.orderNumber || "—"}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(bet.orderNumber || "");
                                    alert("Order number copied successfully!");
                                  }}
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
                                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                </button>
                              </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Period</span>
                              <span>{bet.periodId}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Purchase amount</span>
                              <span>₹{bet.amount.toFixed(2)}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Quantity</span>
                              <span>{bet.amount / baseAmount || 1}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Contract amount (after fee)</span>
                              <span style={{ color: "#ff4d4d" }}>₹{(bet.amount * 0.99).toFixed(2)}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Bet fee (1.0%)</span>
                              <span>₹{(bet.amount * 0.01).toFixed(2)}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Result</span>
                              <span>
                                {bet.status !== "pending" ? (
                                  <>
                                    <span style={{ marginRight: "6px", fontWeight: "800", color: "var(--gold)" }}>
                                      {bet.resultSum != null ? bet.resultSum : "—"}
                                    </span>
                                    <span style={{ textTransform: "capitalize", marginRight: "6px" }}>
                                      {bet.dices && bet.dices.length > 0 ? `[${bet.dices.join(", ")}]` : ""}
                                    </span>
                                    <span style={{ textTransform: "capitalize", color: "#888" }}>
                                      {bet.resultSize} {bet.resultParity}
                                    </span>
                                  </>
                                ) : "Pending"}
                              </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Select</span>
                              <span style={{ textTransform: "capitalize" }}>
                                {formatBetLabel(bet.details.betType, bet.details.betValue)}
                              </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Status</span>
                              <span style={{ color: isWon ? "#00c97b" : bet.status === "pending" ? "#F5C542" : "#ff4d4d" }}>
                                {bet.status === "pending" ? "Pending" : isWon ? "Succeed" : "Failed"}
                              </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Win/lose</span>
                              <span style={{ color: bet.status === "pending" ? "#888" : isWon ? "#00c97b" : "#ff4d4d", fontWeight: "800" }}>
                                {bet.status === "pending" ? "--" : isWon ? `+ ₹${(bet.winAmount || bet.amount * (bet.payoutRatio || 1.96)).toFixed(2)}` : `- ₹${bet.amount.toFixed(2)}`}
                              </span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0", color: "#ccc" }}>
                              <span style={{ color: "#888" }}>Order time</span>
                              <span>{new Date(bet.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Pagination Controls */}
              {myBets.length > 0 && (
                <div className="wg-pagination">
                  <button
                    type="button"
                    onClick={() => setMyPage((prev) => Math.max(1, prev - 1))}
                    disabled={activeMyPage === 1}
                    className="wg-page-btn"
                  >
                    ‹
                  </button>
                  {Array.from({ length: myPageCount }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setMyPage(p)}
                      className={`wg-page-btn ${activeMyPage === p ? "active" : ""}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMyPage((prev) => Math.min(myPageCount, prev + 1))}
                    disabled={activeMyPage === myPageCount}
                    className="wg-page-btn"
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {totalCombinations > 0 && (
        <div className="wg-bet-overlay" onClick={closeBetSheet}>
          <div
            className="wg-bet-sheet theme-blue"
            style={{ paddingBottom: "16px", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="wg-bet-sheet-body" style={{ maxHeight: "30vh", overflowY: "auto", padding: "12px", marginBottom: "10px", borderRadius: "12px", border: "1px solid var(--theme-border)" }}>
              {groupK3BetsForDisplay(selectedChips).map((group, i) => (
                <div key={i} style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>{group.label}:</div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--theme-text)", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                     {group.value.split(',').map((v, j) => (
                        <span key={j} style={{ padding: "2px 6px", borderRadius: "4px" }}>
                          {v.trim()}
                        </span>
                     ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="wg-bet-sheet-body" style={{ paddingTop: 0 }}>
              <div className="wg-bet-field" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="wg-bet-field-label" style={{ margin: 0, color: "#ccc" }}>Balance</span>
                <div className="wg-bet-amount-row" style={{ display: "flex", gap: "8px" }}>
                  {BASE_AMOUNTS.map((value) => {
                    const active = baseAmount === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`wg-bet-chip ${active ? "active" : ""}`}
                        onClick={() => setBaseAmount(value)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: active ? "var(--ln-gold, #d4af37)" : "#212128",
                          color: active ? "#000" : "#ccc",
                          border: active ? "1px solid var(--ln-gold, #d4af37)" : "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {value >= 1000 ? `${value/1000}K` : value}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="wg-bet-field" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                <span className="wg-bet-field-label" style={{ margin: 0, color: "#ccc" }}>Quantity</span>
                <div className="wg-bet-qty" style={{ display: "flex", alignItems: "center", border: "1px solid var(--theme-border)", borderRadius: "6px", overflow: "hidden" }}>
                  <button
                    type="button"
                    className="wg-bet-qty-btn"
                    disabled={quantity <= 1}
                    onClick={() => setBetQuantity(quantity - 1)}
                    style={{ border: "none",
                      color: "var(--theme-text)",
                      width: "32px",
                      height: "32px",
                      fontSize: "16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setBetQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="wg-bet-qty-input"
                    style={{ border: "none",
                      color: "var(--theme-text)",
                      width: "48px",
                      textAlign: "center",
                      fontSize: "14px",
                      fontWeight: "700"
                    }}
                  />
                  <button
                    type="button"
                    className="wg-bet-qty-btn"
                    onClick={() => setBetQuantity(quantity + 1)}
                    style={{ border: "none",
                      color: "var(--theme-text)",
                      width: "32px",
                      height: "32px",
                      fontSize: "16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="wg-bet-field wg-bet-field-multi" style={{ marginTop: "12px" }}>
                <div className="wg-bet-multi-row" style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
                  {MULTIPLIERS_ARRAY.map((m) => {
                    const active = quantity === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        className={`wg-bet-multi ${active ? "active" : ""}`}
                        onClick={() => setBetQuantity(m)}
                        style={{
                          flex: "1",
                          padding: "6px 0",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: active ? "var(--ln-gold, #d4af37)" : "#212128",
                          color: active ? "#000" : "#ccc",
                          border: active ? "1px solid var(--ln-gold, #d4af37)" : "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          minWidth: "48px"
                        }}
                      >
                        X{m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="wg-bet-agree" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#bbb", marginTop: "16px", cursor: "pointer", fontSize: "12px" }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ accentcolor: "var(--theme-green)", width: "16px", height: "16px" }}
                />
                <span>I agree</span>
                <button type="button" className="wg-bet-rules" onClick={() => {}} style={{ color: "var(--theme-green)", border: "none", padding: 0, textDecoration: "underline", cursor: "pointer", fontSize: "12px" }}>
                  《Pre-sale rules》
                </button>
              </label>

              {error && (
                <p className="wg-bet-sheet-error" role="alert">{error}</p>
              )}
            </div>

            <div className="wg-bet-sheet-footer" style={{ display: "flex", gap: "12px", marginTop: "16px", padding: "0 16px" }}>
              <button 
                type="button" 
                className="wg-bet-cancel" 
                disabled={loading} 
                onClick={closeBetSheet} 
                style={{ 
                  flex: "1", 
                  padding: "12px", 
                  borderRadius: "12px", 
                  color: "#ccc", 
                  border: "1px solid var(--theme-border)", 
                  fontWeight: "700",
                  fontSize: "14px",
                  cursor: "pointer" 
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wg-bet-confirm"
                disabled={loading || !agreed}
                onClick={confirmBet}
                style={{ 
                  flex: "2", 
                  padding: "12px", 
                  borderRadius: "12px", 
                  color: "var(--theme-text)", 
                  border: "none", 
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(71, 129, 255, 0.1)" 
                }}
              >
                {loading ? "Processing..." : `Total amount ₹${(baseAmount * quantity * totalCombinations).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {outcomePopup && (
        <OutcomePopup
          show={outcomePopup.show}
          onClose={() => setOutcomePopup(null)}
          type={outcomePopup.type}
          amount={outcomePopup.amount}
          gameName="K3"
          periodId={outcomePopup.periodId}
          balance={balance}
          resultDetails={
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {outcomePopup.dice?.map((d, i) => (
                <span key={i} style={{
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--theme-border)",
                  borderRadius: "4px",
                  color: "var(--theme-text)",
                  fontSize: "12px",
                  fontWeight: "700" }}>
                  {d}
                </span>
              ))}
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>=</span>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#FFEAA0" }}>
                {outcomePopup.sum}
              </span>
              <span style={{
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: outcomePopup.sum > 10 ? "rgba(71, 129, 255, 0.1)" : "rgba(185,28,28,0.15)",
                color: outcomePopup.sum > 10 ? "#FFEAA0" : "#FCA5A5",
                fontWeight: "700" }}>
                {outcomePopup.sum > 10 ? "Big" : "Small"}
              </span>
            </div>
          }
        />
      )}

      <HowToPlayModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        kicker="K3"
        sections={K3_RULE_SECTIONS}
        notes={K3_RULE_NOTES}
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
        </>
      )}
      <ToastStack toasts={toasts} />
    </div>
  );
}
