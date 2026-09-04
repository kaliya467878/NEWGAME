"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import { getBalance } from "@/lib/walletApi";
import { getSocket } from "@/lib/socket";
import { getCurrentPeriod, getGameHistory, getMyBets, placeBet, undoBet } from "@/lib/dragonTigerApi";
import { getDragonTigerConfig } from "@/lib/platformApi";
import { bindDtSocket, joinDtRoom, leaveDtRoom } from "@/lib/dragonTigerSocket";
import {
  DT_ASSETS,
  dtCardSrc,
  dtChipSrc,
  dtHistorySrc,
} from "@/lib/dragonTigerAssets";
import { formatPeriodDisplay } from "@/lib/periodUtils";

const DURATION_SEC = { "30s": 30, "1m": 60, "60s": 60 };
const DEFAULT_CHIPS = [1, 2, 5, 10, 25, 50];
const DEFAULT_PAYOUTS = { dragon: 2, tiger: 2, tie: 9 };
const HISTORY_PAGE_SIZE = 10;

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

function zoneLabel(zone) {
  if (zone === "dragon") return "Dragon";
  if (zone === "tiger") return "Tiger";
  return "Tie";
}

function formatBetPnL(bet) {
  if (bet.status === "won") {
    return { text: `+₹${Number(bet.winAmount || 0).toFixed(2)}`, className: "won" };
  }
  if (bet.status === "lost") {
    return { text: `-₹${Number(bet.amount || 0).toFixed(2)}`, className: "lost" };
  }
  if (bet.status === "refunded") {
    return { text: "Refunded", className: "refunded" };
  }
  return { text: "—", className: "pending" };
}

function remainingFromEnd(endMs) {
  if (!endMs) return 0;
  return Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
}

export default function DragonTigerGameScreen() {
  const params = useParams();
  const router = useRouter();
  const durationLabel = String(params?.duration || "1m").toLowerCase();
  const durationSec = DURATION_SEC[durationLabel] || 60;

  const [period, setPeriod] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [chip, setChip] = useState(1);
  const [balance, setBalance] = useState(0);
  const [stakes, setStakes] = useState({ dragon: 0, tiger: 0, tie: 0 });
  const [history, setHistory] = useState([]);
  const [historyTab, setHistoryTab] = useState("game");
  const [gameHistory, setGameHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [myBets, setMyBets] = useState([]);
  const [myBetsPage, setMyBetsPage] = useState(1);
  const [myBetsTotalPages, setMyBetsTotalPages] = useState(1);
  const [expandedBetId, setExpandedBetId] = useState(null);
  const [dragonCard, setDragonCard] = useState(null);
  const [tigerCard, setTigerCard] = useState(null);
  const [showFaces, setShowFaces] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [winGlow, setWinGlow] = useState(false);
  const [toast, setToast] = useState("Connecting…");
  const [betting, setBetting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [payouts, setPayouts] = useState(DEFAULT_PAYOUTS);
  const endTimeRef = useRef(null);
  const periodIdRef = useRef(null);
  const handledResultRef = useRef(null);
  const cardResetTimerRef = useRef(null);

  const betLockSeconds = period?.betLockSeconds ?? 5;
  const totalBet = stakes.dragon + stakes.tiger + stakes.tie;
  const canBet =
    period?.status === "BETTING"
    && !period?.bettingLocked
    && seconds > betLockSeconds
    && !betting
    && !undoing;

  const canUndo =
    totalBet > 0
    && period?.status === "BETTING"
    && !period?.bettingLocked
    && seconds > betLockSeconds
    && !betting
    && !undoing;

  const timerClass = useMemo(() => {
    if (seconds <= betLockSeconds) return "dt-timer danger";
    if (seconds <= 10) return "dt-timer warn";
    return "dt-timer";
  }, [seconds, betLockSeconds]);

  const pushHistory = useCallback((periodId, outcome) => {
    if (!periodId || !outcome) return;
    setHistory((h) => {
      if (h.some((row) => row.periodId === periodId)) return h;
      return [{ periodId, outcome }, ...h].slice(0, 16);
    });
  }, []);

  const applyResult = useCallback((data, { fromFallback = false } = {}) => {
    if (!data?.outcome || !data?.periodId) return;
    if (handledResultRef.current === data.periodId) return;
    handledResultRef.current = data.periodId;

    const outcome = String(data.outcome).trim().toLowerCase();
    setDragonCard(data.dragonCard || null);
    setTigerCard(data.tigerCard || null);
    setLastResult(outcome);
    setShowFaces(true);
    setWinGlow(true);
    pushHistory(data.periodId, outcome);
    setToast(`${zoneLabel(outcome)} won`);
    setPeriod((prev) => (prev ? { ...prev, status: "RESULT_DECLARED" } : prev));
    if (!fromFallback) refreshBalanceRef.current?.();
    loadGameHistoryPageRef.current?.(1);
    loadMyBetsPageRef.current?.(1);

    // After a short reveal, flip cards face-down for the betting round
    if (cardResetTimerRef.current) clearTimeout(cardResetTimerRef.current);
    cardResetTimerRef.current = setTimeout(() => {
      setShowFaces(false);
      setWinGlow(false);
      setLastResult(null);
      setDragonCard(null);
      setTigerCard(null);
      cardResetTimerRef.current = null;
    }, 2800);
  }, [pushHistory]);

  const refreshBalanceRef = useRef(null);
  const loadGameHistoryPageRef = useRef(null);
  const loadMyBetsPageRef = useRef(null);

  const refreshBalance = useCallback(async () => {
    try {
      if (!getToken()) return;
      const res = await getBalance();
      const bal = res?.data?.available ?? res?.data?.balance ?? res?.available ?? 0;
      setBalance(Number(bal) || 0);
    } catch {
      /* ignore */
    }
  }, []);

  refreshBalanceRef.current = refreshBalance;

  const applyPeriod = useCallback((data) => {
    if (!data) return;
    setPeriod(data);
    periodIdRef.current = data.periodId;
    const endMs = data.endTime ? new Date(data.endTime).getTime() : null;
    endTimeRef.current = endMs;
    setSeconds(remainingFromEnd(endMs) || Number(data.remainingSeconds) || 0);

    // Only paint result cards when this period already settled
    if (data.status === "RESULT_DECLARED" && data.result?.dragonCard) {
      applyResult({
        periodId: data.periodId,
        outcome: data.result.outcome,
        dragonCard: data.result.dragonCard,
        tigerCard: data.result.tigerCard,
      });
    }
  }, [applyResult]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await getGameHistory(durationLabel, { limit: 16 });
      const items = res?.data?.items || [];
      setHistory(
        items
          .filter((row) => row.outcome && row.periodId)
          .map((row) => ({ periodId: row.periodId, outcome: row.outcome }))
      );
    } catch {
      /* ignore */
    }
  }, [durationLabel]);

  const loadGameHistoryPage = useCallback(
    async (pageNum = 1) => {
      try {
        const res = await getGameHistory(durationLabel, {
          page: pageNum,
          limit: HISTORY_PAGE_SIZE,
        });
        const items = res?.data?.items || [];
        const pagination = res?.data?.pagination || {};
        setGameHistory(items);
        setHistoryPage(pagination.page || pageNum);
        setHistoryTotalPages(pagination.totalPages || 1);
      } catch {
        /* ignore */
      }
    },
    [durationLabel]
  );

  const loadMyBetsPage = useCallback(
    async (pageNum = 1) => {
      try {
        const res = await getMyBets({
          page: pageNum,
          limit: HISTORY_PAGE_SIZE,
          duration: durationLabel,
        });
        const bets = res?.data?.bets || [];
        const pagination = res?.data?.pagination || {};
        const total = pagination.total ?? bets.length;
        const limit = pagination.limit || HISTORY_PAGE_SIZE;
        setMyBets(bets);
        setMyBetsPage(pagination.page || pageNum);
        setMyBetsTotalPages(Math.max(1, Math.ceil(total / limit)));
        setExpandedBetId(null);
      } catch {
        /* ignore */
      }
    },
    [durationLabel]
  );

  useEffect(() => {
    loadGameHistoryPageRef.current = loadGameHistoryPage;
  }, [loadGameHistoryPage]);

  useEffect(() => {
    loadMyBetsPageRef.current = loadMyBetsPage;
  }, [loadMyBetsPage]);

  const loadCurrent = useCallback(async () => {
    try {
      const res = await getCurrentPeriod(durationLabel);
      applyPeriod(res?.data);
      setToast("Tap a side to bet");
    } catch (error) {
      setToast(error?.response?.data?.message || error.message || "Failed to load period");
    }
  }, [durationLabel, applyPeriod]);

  useEffect(() => {
    if (!DURATION_SEC[durationLabel]) {
      router.replace("/dragon-tiger/1m");
      return;
    }
    setHistoryTab("game");
    setHistoryPage(1);
    setMyBetsPage(1);
    loadCurrent();
    loadHistory();
    loadGameHistoryPage(1);
    loadMyBetsPage(1);
    refreshBalance();
    getDragonTigerConfig()
      .then((res) => {
        const p = res?.data?.payouts;
        if (p) setPayouts({ ...DEFAULT_PAYOUTS, ...p });
      })
      .catch(() => {});
  }, [
    durationLabel,
    loadCurrent,
    loadHistory,
    loadGameHistoryPage,
    loadMyBetsPage,
    refreshBalance,
    router,
  ]);

  // Smooth countdown from endTime only (ignore raw socket remainingSeconds — avoids 1s flicker)
  useEffect(() => {
    const id = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = remainingFromEnd(endTimeRef.current);
      setSeconds((prev) => (prev === remaining ? prev : remaining));
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let activeSocket = null;
    let unbind = null;
    let cancelled = false;

    getSocket().then((socket) => {
      if (!socket || cancelled) return;

      activeSocket = socket;
      joinDtRoom(socket, durationSec);
      socket.emit("join:user");

      unbind = bindDtSocket(socket, durationSec, {
        onTimer: (data) => {
          // Sync clock anchor only — local interval owns the displayed seconds
          if (data.endTime) {
            endTimeRef.current = new Date(data.endTime).getTime();
          }
          setPeriod((prev) => {
            if (!prev) return prev;
            const nextStatus = data.status || prev.status;
            const nextId = data.periodId || prev.periodId;
            if (nextStatus === prev.status && nextId === prev.periodId) return prev;
            return { ...prev, status: nextStatus, periodId: nextId };
          });
        },
        onPeriodCreated: (data) => {
          periodIdRef.current = data.periodId;
          const endMs = data.endTime ? new Date(data.endTime).getTime() : null;
          endTimeRef.current = endMs;
          setSeconds(remainingFromEnd(endMs) || durationSec);
          setStakes({ dragon: 0, tiger: 0, tie: 0 });
          setPeriod((prev) => ({
            ...(prev || {}),
            periodId: data.periodId,
            status: data.status || "BETTING",
            startTime: data.startTime,
            endTime: data.endTime,
            bettingLocked: false,
            totalBetAmount: 0,
            totalBetCount: 0,
          }));
          setToast("New round — place bets");
        },
        onPeriodSnapshot: (data) => {
          applyPeriod(data);
        },
        onBetClosed: () => {
          if (cardResetTimerRef.current) {
            clearTimeout(cardResetTimerRef.current);
            cardResetTimerRef.current = null;
          }
          setPeriod((prev) => (prev ? { ...prev, status: "PROCESSING", bettingLocked: true } : prev));
          setShowFaces(false);
          setWinGlow(false);
          setLastResult(null);
          setDragonCard(null);
          setTigerCard(null);
          setToast("Betting locked — drawing cards…");
        },
        onResult: (data) => {
          applyResult(data);
        },
        onWalletUpdated: (data) => {
          if (data?.balance != null) setBalance(Number(data.balance));
        },
      });
    });

    return () => {
      cancelled = true;
      if (cardResetTimerRef.current) {
        clearTimeout(cardResetTimerRef.current);
        cardResetTimerRef.current = null;
      }
      if (activeSocket) {
        leaveDtRoom(activeSocket, durationSec);
        unbind?.();
      }
    };
  }, [durationSec, applyPeriod, applyResult]);

  // Fallback: if socket result missed, poll history once after timer hits 0
  useEffect(() => {
    if (seconds !== 0) return undefined;
    const closedId = periodIdRef.current;
    if (closedId && handledResultRef.current === closedId) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (closedId && handledResultRef.current === closedId) return;
        const res = await getGameHistory(durationLabel, { limit: 1 });
        const item = res?.data?.items?.[0];
        if (cancelled || !item?.outcome) return;
        applyResult(
          {
            periodId: item.periodId,
            outcome: item.outcome,
            dragonCard: item.dragonCard,
            tigerCard: item.tigerCard,
          },
          { fromFallback: true }
        );
        refreshBalance();
      } catch {
        /* ignore */
      }
    }, 2800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [seconds, durationLabel, applyResult, refreshBalance]);

  const placeOn = async (zone) => {
    if (!getToken()) {
      setToast("Login required to bet");
      router.push("/login");
      return;
    }
    if (!canBet) {
      setToast(period?.bettingLocked || seconds <= betLockSeconds ? "Bets locked" : "Wait for round");
      return;
    }
    if (balance < chip) {
      setToast("Insufficient balance");
      return;
    }

    setBetting(true);
    try {
      const res = await placeBet(durationLabel, {
        betType: zone,
        amount: chip,
        idempotencyKey: `dt_${periodIdRef.current}_${zone}_${Date.now()}`,
      });
      const bet = res?.data?.bet;
      if (bet) {
        setStakes((s) => ({ ...s, [zone]: s[zone] + Number(bet.amount || chip) }));
        setToast(`₹${chip} on ${zoneLabel(zone)}`);
      }
      await refreshBalance();
      loadMyBetsPage(1);
    } catch (error) {
      setToast(error?.response?.data?.message || error.message || "Bet failed");
    } finally {
      setBetting(false);
    }
  };

  const undoLast = async () => {
    if (!getToken()) {
      setToast("Login required");
      router.push("/login");
      return;
    }
    if (!canUndo) {
      setToast(seconds <= betLockSeconds ? "Bets locked — cannot undo" : "Nothing to undo");
      return;
    }

    setUndoing(true);
    try {
      const res = await undoBet(durationLabel, {});
      const refunded = res?.data?.bets?.[0];
      if (refunded) {
        const zone = refunded.betType;
        const amt = Number(refunded.amount) || 0;
        setStakes((s) => ({
          ...s,
          [zone]: Math.max(0, (s[zone] || 0) - amt),
        }));
        setToast(`Undid ₹${amt} from ${zoneLabel(zone)}`);
      }
      if (res?.data?.refundedAmount != null && res.data.bets?.length > 1) {
        setStakes({ dragon: 0, tiger: 0, tie: 0 });
      }
      await refreshBalance();
      loadMyBetsPage(1);
    } catch (error) {
      setToast(error?.response?.data?.message || error.message || "Undo failed");
    } finally {
      setUndoing(false);
    }
  };

  const clearAllBets = async () => {
    if (!getToken()) {
      setToast("Login required");
      router.push("/login");
      return;
    }
    if (!canUndo) {
      setToast(seconds <= betLockSeconds ? "Bets locked — cannot clear" : "Nothing to clear");
      return;
    }

    setUndoing(true);
    try {
      const res = await undoBet(durationLabel, { all: true });
      setStakes({ dragon: 0, tiger: 0, tie: 0 });
      const amt = Number(res?.data?.refundedAmount) || 0;
      setToast(amt ? `Cleared bets — ₹${amt} refunded` : "Bets cleared");
      await refreshBalance();
      loadMyBetsPage(1);
    } catch (error) {
      setToast(error?.response?.data?.message || error.message || "Clear failed");
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div className="dt-mock">
      <div className="dt-stage" style={{ backgroundImage: `url(${DT_ASSETS.art.stageBg})` }}>
        <header className="dt-topbar">
          <Link href="/" className="dt-back" aria-label="Back">
            ‹
          </Link>
          <div className="dt-top-title">
            <strong>Dragon vs Tiger</strong>
            <span className="dt-duration-pill">{durationLabel}</span>
          </div>
          <div className="dt-top-actions">
            <Link href="/dragon-tiger/30s" className={durationLabel === "30s" ? "dt-mode on" : "dt-mode"}>
              30s
            </Link>
            <Link href="/dragon-tiger/1m" className={durationLabel === "1m" || durationLabel === "60s" ? "dt-mode on" : "dt-mode"}>
              1m
            </Link>
          </div>
        </header>

        <div className="dt-dealer-wrap">
          <div className={timerClass}>
            <img src={DT_ASSETS.icons.clock} alt="" width={22} height={22} />
            <span>{String(seconds).padStart(2, "0")}</span>
          </div>
        </div>

        <div className="dt-cards">
          <div className={`dt-card-slot dragon ${lastResult === "dragon" && showFaces && winGlow ? "winner" : ""}`}>
            <span className="dt-card-label">Dragon</span>
            <div className={`dt-card-flip ${showFaces && dragonCard ? "show" : ""}`}>
              <Image
                src={DT_ASSETS.art.cardBackPng}
                alt="Back"
                width={86}
                height={120}
                className="dt-card-face back"
              />
              {dragonCard ? (
                <img
                  src={dtCardSrc(dragonCard.rank, dragonCard.suit)}
                  alt={`${dragonCard.rank}${dragonCard.suit}`}
                  width={86}
                  height={120}
                  className="dt-card-face front"
                />
              ) : (
                <Image
                  src={DT_ASSETS.art.cardBackPng}
                  alt="Back"
                  width={86}
                  height={120}
                  className="dt-card-face front"
                />
              )}
            </div>
          </div>
          <div className={`dt-card-slot tiger ${lastResult === "tiger" && showFaces && winGlow ? "winner" : ""}`}>
            <span className="dt-card-label">Tiger</span>
            <div className={`dt-card-flip ${showFaces && tigerCard ? "show" : ""}`}>
              <Image
                src={DT_ASSETS.art.cardBackPng}
                alt="Back"
                width={86}
                height={120}
                className="dt-card-face back"
              />
              {tigerCard ? (
                <img
                  src={dtCardSrc(tigerCard.rank, tigerCard.suit)}
                  alt={`${tigerCard.rank}${tigerCard.suit}`}
                  width={86}
                  height={120}
                  className="dt-card-face front"
                />
              ) : (
                <Image
                  src={DT_ASSETS.art.cardBackPng}
                  alt="Back"
                  width={86}
                  height={120}
                  className="dt-card-face front"
                />
              )}
            </div>
          </div>
        </div>

        {lastResult === "tie" && showFaces ? <div className="dt-tie-banner">TIE</div> : null}
      </div>

      {period?.periodId ? (
        <div className="dt-period-bar">
          <span className="dt-period-label">Period</span>
          <span className="dt-period-id">{formatPeriodDisplay(period.periodId)}</span>
        </div>
      ) : null}

      <div className="dt-history" aria-label="Recent results">
        {history.map((row) => (
          <img
            key={row.periodId}
            src={dtHistorySrc(row.outcome)}
            alt={row.outcome}
            width={26}
            height={26}
          />
        ))}
      </div>

      <div className="dt-table">
        <button
          type="button"
          className={`dt-zone tie ${stakes.tie ? "has-bet" : ""} ${!canBet && !winGlow ? "locked" : ""} ${lastResult === "tie" && winGlow ? "winner" : ""}`}
          onClick={() => placeOn("tie")}
          disabled={betting}
        >
          <img src={DT_ASSETS.art.tieEmblem} alt="" width={72} height={72} className="dt-zone-emblem" />
          <div className="dt-zone-meta">
            <strong>TIE</strong>
            <span>1:{Math.max(1, Math.round(payouts.tie) - 1)}</span>
          </div>
          {stakes.tie > 0 ? <div className="dt-my-chip">₹{stakes.tie}</div> : null}
          <span className="dt-tap">Tap to play</span>
        </button>

        <div className="dt-zone-row">
          <button
            type="button"
            className={`dt-zone dragon ${stakes.dragon ? "has-bet" : ""} ${!canBet && !(lastResult === "dragon" && winGlow) ? "locked" : ""} ${lastResult === "dragon" && winGlow ? "winner" : ""}`}
            onClick={() => placeOn("dragon")}
            disabled={betting}
          >
            <img src={DT_ASSETS.art.dragonEmblem} alt="" width={88} height={88} className="dt-zone-emblem" />
            <div className="dt-zone-meta">
              <strong>DRAGON</strong>
              <span>1:1</span>
            </div>
            {stakes.dragon > 0 ? <div className="dt-my-chip">₹{stakes.dragon}</div> : null}
            <span className="dt-tap">Tap to play</span>
          </button>

          <button
            type="button"
            className={`dt-zone tiger ${stakes.tiger ? "has-bet" : ""} ${!canBet && !(lastResult === "tiger" && winGlow) ? "locked" : ""} ${lastResult === "tiger" && winGlow ? "winner" : ""}`}
            onClick={() => placeOn("tiger")}
            disabled={betting}
          >
            <img src={DT_ASSETS.art.tigerEmblem} alt="" width={88} height={88} className="dt-zone-emblem" />
            <div className="dt-zone-meta">
              <strong>TIGER</strong>
              <span>1:1</span>
            </div>
            {stakes.tiger > 0 ? <div className="dt-my-chip">₹{stakes.tiger}</div> : null}
            <span className="dt-tap">Tap to play</span>
          </button>
        </div>
      </div>

      <footer className="dt-footer">
        <div className="dt-user">
          <div className="dt-avatar">O7</div>
          <div>
            <div className="dt-user-name">Balance</div>
            <div className="dt-balance">₹ {formatMoney(balance)}</div>
          </div>
          <Link href="/wallet/deposit" className="dt-plus" aria-label="Deposit">
            <img src={DT_ASSETS.icons.plus} alt="" width={36} height={36} />
          </Link>
        </div>

        <div className="dt-total">
          <div className="dt-total-main">
            <span className="dt-total-label">My bet</span>
            <strong className="dt-total-amount">₹{formatMoney(totalBet)}</strong>
          </div>
          {totalBet > 0 ? (
            <div className="dt-undo-actions">
              <button
                type="button"
                className="dt-undo-btn"
                onClick={undoLast}
                disabled={!canUndo}
              >
                Undo
              </button>
              <button
                type="button"
                className="dt-undo-btn clear"
                onClick={clearAllBets}
                disabled={!canUndo}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>

        <div className="dt-chips" role="listbox" aria-label="Chip value">
          {DEFAULT_CHIPS.map((v) => (
            <button
              key={v}
              type="button"
              className={`dt-chip ${chip === v ? "active" : ""}`}
              onClick={() => setChip(v)}
              aria-selected={chip === v}
            >
              <img src={dtChipSrc(v)} alt={`${v}`} width={44} height={44} />
            </button>
          ))}
        </div>

        <p className="dt-toast">{toast}</p>
      </footer>

      <div className="dt-history-section">
        <div className="dt-history-nav">
          <button
            type="button"
            className={`dt-history-nav-btn ${historyTab === "game" ? "active" : ""}`}
            onClick={() => setHistoryTab("game")}
          >
            Game history
          </button>
          <button
            type="button"
            className={`dt-history-nav-btn ${historyTab === "my" ? "active" : ""}`}
            onClick={() => {
              setHistoryTab("my");
              loadMyBetsPage(myBetsPage);
            }}
          >
            My history
          </button>
        </div>

        <section className="dt-history-panel">
          {historyTab === "game" ? (
            <>
              <div className="dt-history-head">
                <span>Period</span>
                <span>Result</span>
                <span>Cards</span>
              </div>
              <div className="dt-history-body">
                {gameHistory.length === 0 ? (
                  <div className="dt-history-empty">No results yet</div>
                ) : (
                  gameHistory.map((row) => (
                    <div key={row.periodId} className="dt-history-row">
                      <span className="dt-history-period">{formatPeriodDisplay(row.periodId)}</span>
                      <span className={`dt-history-outcome ${row.outcome}`}>
                        <img src={dtHistorySrc(row.outcome)} alt="" width={22} height={22} />
                        {zoneLabel(row.outcome)}
                      </span>
                      <span className="dt-history-cards">
                        {row.dragonCard?.rank ? (
                          <img
                            src={dtCardSrc(row.dragonCard.rank, row.dragonCard.suit)}
                            alt={`D ${row.dragonCard.rank}${row.dragonCard.suit}`}
                            width={28}
                            height={40}
                          />
                        ) : (
                          <span>—</span>
                        )}
                        {row.tigerCard?.rank ? (
                          <img
                            src={dtCardSrc(row.tigerCard.rank, row.tigerCard.suit)}
                            alt={`T ${row.tigerCard.rank}${row.tigerCard.suit}`}
                            width={28}
                            height={40}
                          />
                        ) : null}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {historyTotalPages > 1 ? (
                <div className="dt-history-pager">
                  <button
                    type="button"
                    disabled={historyPage <= 1}
                    onClick={() => loadGameHistoryPage(historyPage - 1)}
                  >
                    Prev
                  </button>
                  <span>
                    {historyPage}/{historyTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={historyPage >= historyTotalPages}
                    onClick={() => loadGameHistoryPage(historyPage + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="dt-history-head dt-history-head-my">
                <span>Period</span>
                <span>Bet</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              <div className="dt-history-body">
                {myBets.length === 0 ? (
                  <div className="dt-history-empty">No bets yet</div>
                ) : (
                  myBets.map((bet) => {
                    const betId = String(bet.id || bet._id);
                    const expanded = expandedBetId === betId;
                    const pnl = formatBetPnL(bet);
                    return (
                      <div key={betId} className="dt-my-item">
                        <button
                          type="button"
                          className={`dt-history-row dt-history-row-my ${expanded ? "expanded" : ""}`}
                          onClick={() => setExpandedBetId(expanded ? null : betId)}
                          aria-expanded={expanded}
                        >
                          <span className="dt-history-period">
                            {formatPeriodDisplay(bet.periodId)}
                          </span>
                          <span>{zoneLabel(bet.betValue || bet.betType)}</span>
                          <span>₹{bet.amount}</span>
                          <span className={`dt-my-status ${bet.status}`}>{bet.status}</span>
                        </button>
                        {expanded ? (
                          <div className="dt-my-detail">
                            <div>
                              <span>P/L</span>
                              <strong className={pnl.className}>{pnl.text}</strong>
                            </div>
                            <div>
                              <span>Result</span>
                              <strong>{bet.outcome ? zoneLabel(bet.outcome) : "—"}</strong>
                            </div>
                            <div>
                              <span>Time</span>
                              <strong>
                                {bet.createdAt
                                  ? new Date(bet.createdAt).toLocaleString("en-IN")
                                  : "—"}
                              </strong>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
              {myBetsTotalPages > 1 ? (
                <div className="dt-history-pager">
                  <button
                    type="button"
                    disabled={myBetsPage <= 1}
                    onClick={() => loadMyBetsPage(myBetsPage - 1)}
                  >
                    Prev
                  </button>
                  <span>
                    {myBetsPage}/{myBetsTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={myBetsPage >= myBetsTotalPages}
                    onClick={() => loadMyBetsPage(myBetsPage + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
