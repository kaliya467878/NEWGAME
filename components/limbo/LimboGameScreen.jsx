"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import BrandLogo from "@/components/brand/BrandLogo";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getToken } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { getBalance } from "@/lib/walletApi";
import { playLimbo, cashOutLimbo, getMyLimboBets } from "@/lib/limboApi";
import HowToPlayModal from "@/components/games/HowToPlayModal";
import { ArrowLeft, RotateCcw, Play, X } from "lucide-react";
import { GameHeader } from "@/components/games/GameHeader";
import { useQueryClient } from "@tanstack/react-query";

const LIMBO_RULE_SECTIONS = [
  {
    title: "How it works",
    items: [
      { label: "Set a target", detail: "Pick a target multiplier (1.01x or higher) before you bet" },
      { label: "Win", detail: "The round's multiplier climbs — if it reaches your target, you win" },
      { label: "Lose", detail: "If the round crashes before reaching your target, you lose your stake" },
    ] },
];

const LIMBO_RULE_NOTES = [
  "Every bet carries a flat 2% bet fee — a 100 bet has a 98 contract amount, and winnings are multiplied by 98 (contract money).",
  "Payout = contract amount (98% of bet) × target multiplier if the round reaches your target.",
  "A house edge (2%) is built into the crash-point distribution, same as classic crash games.",
  "Winnings are credited automatically the instant the round resolves.",
];

const normalizeBet = (b) => {
  if (!b) return null;
  const details = b.details || {};
  const rolledMultiplier = details.rolledMultiplier ?? b.rolledMultiplier ?? b.result ?? 1.00;
  const targetMultiplier = details.targetMultiplier ?? b.targetMultiplier ?? b.target ?? 2.00;
  const status = b.state ?? b.status ?? (b.winAmount > 0 ? "won" : "lost");
  const amount = b.amount ?? 10;
  const winAmount = b.winAmount ?? b.payout ?? 0;
  
  return {
    id: b._id || b.id || Math.random().toString(),
    result: Number(rolledMultiplier),
    target: Number(targetMultiplier),
    status,
    amount: Number(amount),
    winAmount: Number(winAmount),
    createdAt: b.createdAt || new Date().toISOString() };
};

export default function LimboGameScreen() {
  const router = useRouter();
  const { maintenanceMode: isMaintenance, loading } = usePlatformStatus();
  const platformLoaded = !loading;
  const queryClient = useQueryClient();
  
  // Seeded from the last known balance in localStorage so the header never
  // flashes ₹0.00 while the client's own fetch is still in flight.
  const [balance, setBalance] = useState(() => {
    if (typeof window === "undefined") return 0;
    const cached = Number(window.localStorage.getItem("lastBalance"));
    return Number.isFinite(cached) ? cached : 0;
  });
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

  const setAutoRoundsLeftStateAndRef = (val) => {
    setAutoRoundsLeft(val);
    autoRoundsLeftRef.current = val;
  };

  const handleStopAuto = () => {
    setAutoPlayActive(false);
    setAutoRoundsLeftStateAndRef(0);
    autoPlayActiveRef.current = false;
  };

  const handleStartAuto = () => {
    if (isPlaying) return;
    setAutoPlayOpen(false);
    setAutoPlayActive(true);
    autoPlayActiveRef.current = true;
    setAutoRoundsLeftStateAndRef(autoRounds);
    startBalanceRef.current = balance;
    
    placeBet();
  };

  const handleBetClick = () => {
    if (autoPlayActive) {
      handleStopAuto();
    } else {
      placeBet();
    }
  };
  const [betAmount, setBetAmount] = useState(10);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBetId, setActiveBetId] = useState(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [displayState, setDisplayState] = useState("idle"); // idle, playing, won, crashed
  const [crashPoint, setCrashPoint] = useState(null);
  
  const [history, setHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [error, setError] = useState(null);
  const [popupData, setPopupData] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  
  const animRef = useRef(null);
  const startTimeRef = useRef(null);
  const playingRef = useRef(false);
  const targetMultiplierRef = useRef(2.0);
  const resultRef = useRef({ result: 1.0, status: "lost", payout: 0, betAmount: 10 });

  useEffect(() => {
    if (platformLoaded && isMaintenance) {
      router.replace("/");
      return;
    }

    const init = async () => {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      fetchBalance();
      fetchHistory();
    };
    init();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [platformLoaded, isMaintenance, router]);

  const fetchBalance = async () => {
    const res = await getBalance();
    if (res?.success) {
      const nextBalance = res.data.balance || 0;
      setBalance(nextBalance);
      queryClient.setQueryData(["wallet-balance"], nextBalance);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("lastBalance", String(nextBalance));
      }
    }
  };

  const fetchHistory = async () => {
    const res = await getMyLimboBets();
    if (res?.success && res.data) {
      setHistory(res.data.map(normalizeBet));
    }
  };

  const handleBetChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, "");
    setBetAmount(val);
  };
  
  const handleTargetChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, "");
    setTargetMultiplier(val);
  };

  const placeBet = async () => {
    if (isPlaying) return;
    const amount = Number(betAmount);
    const target = Number(targetMultiplier);

    if (isNaN(amount) || amount < 10) {
      setError("Minimum bet is ₹10");
      return;
    }
    if (isNaN(target) || target < 1.01) {
      setError("Minimum target is 1.01x");
      return;
    }
    if (balance < amount) {
      setError("Insufficient balance");
      return;
    }

    setError(null);
    setIsPlaying(true);
    setIsStarting(true);
    playingRef.current = true;
    setCurrentMultiplier(1.0);
    setCrashPoint(null);
    // Reset visuals (rocket, colors, moon surface) the instant a new round
    // starts, not when the network reply lands. Previously this only flipped
    // to "playing" after the response arrived, so the multiplier had already
    // reset to 1.00x while the rocket was still mid-explosion from the last
    // round's "crashed" state — a jarring, out-of-sync glitch on every bet.
    setDisplayState("playing");
    setBalance(prev => {
      const next = prev - amount;
      queryClient.setQueryData(["wallet-balance"], next);
      return next;
    }); // Optimistic

    // Set a placeholder result while we wait for the network
    resultRef.current = { result: null, status: "pending", payout: 0, betAmount: amount };
    targetMultiplierRef.current = target;
    
    // Start local animation loop INSTANTLY
    let localCurrent = 1.0;
    let hasRebased = false;
    let animStartTime = Date.now();
    let hasShownPopup = false;
    
    // Clear any existing popup when starting a new bet
    setPopupData(null);
    
    const animateMultiplier = () => {
      if (!playingRef.current) return;
      
      // If network hasn't returned yet, wait at 1.00x
      if (resultRef.current.result === null) {
          animRef.current = requestAnimationFrame(animateMultiplier);
          return;
      }

      // When network returns, start the growth animation
      if (!hasRebased) {
          hasRebased = true;
          animStartTime = Date.now();
      }

      const elapsedSec = (Date.now() - animStartTime) / 1000;

      // Animate over a fixed wall-clock duration instead of a fixed growth
      // RATE. A constant rate (the old e^(0.8t) curve) makes low crash points
      // (e.g. 1.05x) resolve in a single frame — no visible animation at all —
      // while high ones (100x+) drag on for many seconds. Scaling the
      // duration logarithmically with the result and easing within that fixed
      // window keeps every round feeling equally smooth regardless of size.
      const durationSec = Math.min(3.5, Math.max(0.6, 0.6 + Math.log(resultRef.current.result) * 0.55));
      const progress = Math.min(1, elapsedSec / durationSec);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

      let calculatedCurrent = 1 + (resultRef.current.result - 1) * eased;

      if (progress >= 1) {
          localCurrent = resultRef.current.result;
      } else {
          localCurrent = calculatedCurrent;
      }
      
      setCurrentMultiplier(localCurrent);

      // Trigger the win popup exactly when the visual multiplier crosses the user's target
      if (!hasShownPopup && resultRef.current.status === "won" && localCurrent >= targetMultiplierRef.current) {
        hasShownPopup = true;
        setPopupData({ amount: resultRef.current.payout, type: "win" });
        setBalance(prev => {
          const next = prev + resultRef.current.payout;
          queryClient.setQueryData(["wallet-balance"], next);
          return next;
        });
        setTimeout(() => setPopupData(null), 3000);
      }

      if (localCurrent < resultRef.current.result) {
        animRef.current = requestAnimationFrame(animateMultiplier);
      } else {
        finishGame();
      }
    };
    animRef.current = requestAnimationFrame(animateMultiplier);

    // Now make the network request asynchronously without blocking the UI
    try {
      const res = await playLimbo({ amount, targetMultiplier: target });

      if (!res?.success) {
        setError(res?.message || "Bet failed");
        setIsPlaying(false);
        playingRef.current = false;
        setDisplayState("idle");
        fetchBalance();
        return;
      }

      // Store the exact result
      const finalResult = res.data.result !== undefined ? res.data.result : 1.0;
      resultRef.current = {
        result: finalResult,
        status: res.data.status || "lost",
        payout: res.data.winAmount || 0,
        betAmount: amount
      };
      
      setIsStarting(false);
      setDisplayState("playing");
    } catch (err) {
      setError("Network error");
      setIsPlaying(false);
      setIsStarting(false);
      playingRef.current = false;
      setDisplayState("idle");
      fetchBalance();
    }
  };

  const finishGame = () => {
    setIsPlaying(false);
    playingRef.current = false;
    
    const { result, status, payout } = resultRef.current;
    setCurrentMultiplier(result || 1.0);
    setCrashPoint(result || 1.0);
    
    if (status === "won") {
      setDisplayState("won");
      if (popupData === null) {
        setPopupData({ amount: payout, type: "win" });
        setTimeout(() => setPopupData(null), 3000);
      }
    } else {
      setDisplayState("crashed");
      setPopupData({ amount: resultRef.current.betAmount, type: "loss" });
      setTimeout(() => setPopupData(null), 3000);
    }
    
    fetchBalance();
    fetchHistory();

    if (autoPlayActiveRef.current && autoRoundsLeftRef.current > 1) {
      const nextRounds = autoRoundsLeftRef.current - 1;
      setAutoRoundsLeftStateAndRef(nextRounds);
      
      const currentBalance = status === "won" ? balance + payout : balance;
      const diff = currentBalance - startBalanceRef.current;
      
      let shouldStop = false;
      if (stopOnDecrease && diff <= -Number(stopOnDecreaseVal)) {
        shouldStop = true;
        setError("Auto play stopped: balance decrease limit reached");
      }
      if (stopOnIncrease && diff >= Number(stopOnIncreaseVal)) {
        shouldStop = true;
        setError("Auto play stopped: balance increase limit reached");
      }
      if (stopOnWinExceeds && status === "won" && payout >= Number(stopOnWinExceedsVal)) {
        shouldStop = true;
        setError("Auto play stopped: win limit reached");
      }
      
      if (shouldStop) {
        handleStopAuto();
      } else {
        setTimeout(() => {
          if (autoPlayActiveRef.current) {
            placeBet();
          }
        }, 1500);
      }
    } else if (autoPlayActiveRef.current) {
      handleStopAuto();
    }
  };

  return (
    <div style={styles.container}>
      <GameHeader
        title="Limbo"
        durations={null}
        activeDuration={null}
        durationHrefPrefix=""
      />

      {popupData !== null && (
        <div style={{
          position: "absolute",
          top: "80px",
          right: "20px",
          zIndex: 99,
          padding: "10px 20px",
          borderRadius: "8px",
          color: "var(--theme-text)",
          fontWeight: "bold",
          background: popupData.type === "win" ? "#22c55e" : "#ef4444",
          boxShadow: popupData.type === "win" ? "0 2px 10px rgba(34,197,94,0.5)" : "0 2px 10px rgba(239,68,68,0.5)" }}>
          {popupData.type === "win" ? "+" : "-"}{popupData.amount.toFixed(2)} INR
        </div>
      )}

      <div style={styles.content}>
        {/* Recent History Bar */}
        <div style={{ ...styles.historyBar, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", flex: 1, paddingRight: "10px", scrollbarWidth: "none" }}>
            {history.slice(0, 15).map((bet) => {
              const isWin = bet.status === "won";
              return (
                <div 
                  key={bet.id} 
                  style={{
                    ...styles.historyPill,
                    borderColor: isWin ? "#22c55e" : "rgba(239, 68, 68, 0.4)",
                    background: isWin ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.1)",
                    color: isWin ? "#4ade80" : "#f87171" }}
                >
                  {(bet.result || 1.0).toFixed(2)}x
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            <button
              style={styles.historyBtn}
              onClick={() => setRulesOpen(true)}
            >
              How to play?
            </button>
            <button
              style={styles.historyBtn}
              onClick={() => setShowHistoryModal(true)}
            >
              History
            </button>
          </div>
        </div>

        {/* Main Game Canvas */}
        <div style={styles.gameArea}>
          <div style={styles.spaceBackground(displayState)}>
            <div className="stars"></div>
            <div className="stars stars2"></div>
            <div style={styles.planet1}></div>
            <div style={styles.planet2}></div>
          </div>
          
          <div style={styles.multiplierContainer}>
            <div 
              style={{
                ...styles.multiplierText,
                color: (displayState === "playing" || displayState === "won") ? "#4ade80" : displayState === "crashed" ? "#f87171" : "#fff" }}
            >
              {(currentMultiplier || 1.0).toFixed(2)}x
            </div>
          </div>

          <div style={styles.rocketContainer(displayState)}>
            {displayState === "crashed" ? (
              // Exploded state
              <div style={styles.planeExplosion}>
                <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.05))" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  <circle cx="12" cy="12" r="5" fill="#f87171" opacity="0.3" />
                  <path d="M8 12h8M12 8v8" stroke="#f87171" strokeWidth="2" />
                </svg>
              </div>
            ) : (
              // 3D CSS Rocket matching the screenshot
              <div style={styles.rocketBody}>
                <div style={styles.rocketNose}></div>
                <div style={styles.rocketWindowContainer}>
                  <div style={styles.windowReflection}></div>
                </div>
                <div style={styles.rocketStripe}></div>
                <div style={styles.rocketFinLeft}></div>
                <div style={styles.rocketFinRight}></div>
                <div style={styles.rocketEngine}></div>
                {(displayState === "playing") && (
                  <div style={styles.flameCore}></div>
                )}
              </div>
            )}
          </div>

          {/* Moon Surface at the bottom */}
          <div style={styles.moonSurface(displayState)}>
            <div style={styles.crater1}></div>
            <div style={styles.crater2}></div>
            <div style={styles.crater3}></div>
          </div>
        </div>

        {/* Controls */}
        <div style={styles.controlsArea}>
          {error && <div style={styles.errorText}>{error}</div>}
          
          <div style={styles.targetWrapper}>
            <button 
              style={styles.circleAdjustBtn} 
              onClick={() => setTargetMultiplier(Math.max(1.01, Number(targetMultiplier) - 0.1).toFixed(2))}
              disabled={isPlaying}
            >-</button>
            <input 
              type="number" 
              style={styles.targetInput} 
              value={targetMultiplier} 
              onChange={handleTargetChange} 
              disabled={isPlaying}
            />
            <button 
              style={styles.circleAdjustBtn} 
              onClick={() => setTargetMultiplier((Number(targetMultiplier) + 0.1).toFixed(2))}
              disabled={isPlaying}
            >+</button>
          </div>

          <div style={styles.footerControlBar}>
            <div style={styles.betWrapper}>
              <div style={styles.betInputPill}>
                <span style={styles.betPillLabel}>Bet</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <input
                    type="number"
                    style={styles.betPillInput}
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={isPlaying}
                  />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginLeft: '1px', fontWeight: 'bold' }}>INR</span>
                </div>
              </div>
              
              <button 
                style={styles.circleBetBtn} 
                onClick={() => setBetAmount(prev => Math.max(10, Number(prev) - 10))} 
                disabled={isPlaying}
              >
                -
              </button>
              
              <button 
                style={styles.circleBetBtn} 
                onClick={() => setPresetsOpen(prev => !prev)} 
                disabled={isPlaying}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2C6.48 2 2 4.69 2 8s4.48 6 10 6 10-2.69 10-6-4.48-6-10-6zM2 8v4c0 3.31 4.48 6 10 6s10-2.69 10-6V8M2 13v4c0 3.31 4.48 6 10 6s10-2.69 10-6v-4" />
                </svg>
              </button>
              
              <button 
                style={styles.circleBetBtn} 
                onClick={() => setBetAmount(prev => Number(prev) + 10)} 
                disabled={isPlaying}
              >
                +
              </button>
            </div>
            
            <button 
              style={styles.autoBtn} 
              onClick={() => setAutoPlayOpen(true)}
              disabled={isPlaying || autoPlayActive}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" style={{ display: 'block' }}>
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                <polygon points="10 8 16 12 10 16" fill="#fff" />
              </svg>
            </button>

            <button 
              style={{
                ...styles.playBtn,
                opacity: (isPlaying && !autoPlayActive) ? 0.5 : 1,
                cursor: (isPlaying && !autoPlayActive) ? "not-allowed" : "pointer"
              }}
              onClick={handleBetClick}
              disabled={isPlaying && !autoPlayActive}
            >
              {autoPlayActive ? (
                 <span style={{color: "var(--theme-text)", fontSize: 13}}>STOP ({autoRoundsLeft})</span>
              ) : isStarting ? (
                 <span style={{fontSize: 14}}>LOADING...</span>
              ) : (
                 <>
                   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" style={{ display: 'block' }}>
                     <polygon points="6 3 20 12 6 21 6 3"/>
                   </svg>
                   <span>BET</span>
                 </>
              )}
            </button>
          </div>
        </div>
      </div>

      {presetsOpen && (
        <div style={styles.presetsPopover}>
          <div style={styles.presetsTitle}>Bet</div>
          <div style={styles.presetsGrid}>
            {[10, 20, 50, 100, 200, 500, 1000, 5000, 8000].map(val => (
              <button
                key={val}
                style={val === 8000 ? { ...styles.presetItem, gridColumn: "span 2" } : styles.presetItem}
                onClick={() => {
                  setBetAmount(val);
                  setPresetsOpen(false);
                }}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      )}

      {autoPlayOpen && (
        <div style={styles.autoPlayModalOverlay}>
          <div style={styles.autoPlayModal}>
            <div style={styles.autoPlayHeader}>
              <span style={styles.autoPlayTitle}>AUTO PLAY</span>
              <button style={styles.autoPlayCloseBtn} onClick={() => setAutoPlayOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.autoPlaySectionTitle}>Number of rounds</div>
            <div style={styles.autoPlayRoundsGrid}>
              {[10, 100, 500, 1000, 5000, 10000].map(r => (
                <div 
                  key={r} 
                  style={{
                    ...styles.autoPlayRoundPill,
                    borderColor: autoRounds === r ? "#22c55e" : "#30363d"
                  }}
                  onClick={() => setAutoRounds(r)}
                >
                  <div style={autoRounds === r ? styles.autoPlayDotActive : styles.autoPlayDot} />
                  <span>{r}</span>
                </div>
              ))}
            </div>
            
            <div style={styles.autoPlayConditionRow}>
              <div style={styles.autoPlayConditionLabelBox}>
                <button
                  style={{
                    width: "34px",
                    height: "18px",
                    borderRadius: "9px",
                    background: stopOnDecrease ? "#22c55e" : "#30363d",
                    position: "relative",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "background 0.2s" }}
                  onClick={() => setStopOnDecrease(prev => !prev)}
                >
                  <div style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "2px",
                    left: stopOnDecrease ? "18px" : "2px",
                    transition: "left 0.2s" }} />
                </button>
                <span style={styles.autoPlayConditionLabel}>Stop if cash decreases by</span>
              </div>
              <div style={styles.autoPlayControls}>
                <button 
                  style={styles.autoPlayCircleBtn}
                  onClick={() => setStopOnDecreaseVal(prev => Math.max(10, Number(prev) - 10))}
                >-</button>
                <input 
                  type="number" 
                  style={styles.autoPlayValueInput} 
                  value={stopOnDecreaseVal}
                  onChange={(e) => setStopOnDecreaseVal(Number(e.target.value))}
                />
                <button 
                  style={styles.autoPlayCircleBtn}
                  onClick={() => setStopOnDecreaseVal(prev => Number(prev) + 10)}
                >+</button>
              </div>
            </div>

            <div style={styles.autoPlayConditionRow}>
              <div style={styles.autoPlayConditionLabelBox}>
                <button
                  style={{
                    width: "34px",
                    height: "18px",
                    borderRadius: "9px",
                    background: stopOnWinExceeds ? "#22c55e" : "#30363d",
                    position: "relative",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "background 0.2s" }}
                  onClick={() => setStopOnWinExceeds(prev => !prev)}
                >
                  <div style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "2px",
                    left: stopOnWinExceeds ? "18px" : "2px",
                    transition: "left 0.2s" }} />
                </button>
                <span style={styles.autoPlayConditionLabel}>Stop if single win exceeds</span>
              </div>
              <div style={styles.autoPlayControls}>
                <button 
                  style={styles.autoPlayCircleBtn}
                  onClick={() => setStopOnWinExceedsVal(prev => Math.max(10, Number(prev) - 10))}
                >-</button>
                <input 
                  type="number" 
                  style={styles.autoPlayValueInput} 
                  value={stopOnWinExceedsVal}
                  onChange={(e) => setStopOnWinExceedsVal(Number(e.target.value))}
                />
                <button 
                  style={styles.autoPlayCircleBtn}
                  onClick={() => setStopOnWinExceedsVal(prev => Number(prev) + 10)}
                >+</button>
              </div>
            </div>

            <div style={styles.autoPlayConditionRow}>
              <div style={styles.autoPlayConditionLabelBox}>
                <button
                  style={{
                    width: "34px",
                    height: "18px",
                    borderRadius: "9px",
                    background: stopOnIncrease ? "#22c55e" : "#30363d",
                    position: "relative",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "background 0.2s" }}
                  onClick={() => setStopOnIncrease(prev => !prev)}
                >
                  <div style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "2px",
                    left: stopOnIncrease ? "18px" : "2px",
                    transition: "left 0.2s" }} />
                </button>
                <span style={styles.autoPlayConditionLabel}>Stop if cash increases by</span>
              </div>
              <div style={styles.autoPlayControls}>
                <button 
                  style={styles.autoPlayCircleBtn}
                  onClick={() => setStopOnIncreaseVal(prev => Math.max(10, Number(prev) - 10))}
                >-</button>
                <input 
                  type="number" 
                  style={styles.autoPlayValueInput} 
                  value={stopOnIncreaseVal}
                  onChange={(e) => setStopOnIncreaseVal(Number(e.target.value))}
                />
                <button 
                  style={styles.autoPlayCircleBtn}
                  onClick={() => setStopOnIncreaseVal(prev => Number(prev) + 10)}
                >+</button>
              </div>
            </div>

            <button 
              style={{
                width: "100%",
                border: "1.5px solid #246d03",
                borderRadius: "9999px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "14px",
                color: "var(--theme-text)",
                marginTop: "20px",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(47, 140, 5, 0.4)" }}
              onClick={handleStartAuto}
            >
              START AUTO
            </button>
          </div>
        </div>
      )}

      <BottomNav />

      <HowToPlayModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        kicker="Limbo"
        sections={LIMBO_RULE_SECTIONS}
        notes={LIMBO_RULE_NOTES}
      />

      {/* History Modal */}
      {showHistoryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>My Limbo History</h3>
              <button style={styles.closeBtn} onClick={() => setShowHistoryModal(false)}><X size={18} /></button>
            </div>
            <div style={styles.historyList}>
              {history.length === 0 ? (
                <div style={{textAlign: "center", padding: 20, color: "#aaa"}}>No bets found</div>
              ) : (
                history.map(bet => (
                  <div key={bet.id} style={styles.historyRow}>
                    <div style={styles.historyCol}>
                      <span style={{fontSize: 12, color: "#888"}}>Amount</span>
                      <span style={{fontWeight: "bold"}}>₹{bet.amount}</span>
                    </div>
                    <div style={styles.historyCol}>
                      <span style={{fontSize: 12, color: "#888"}}>Crash/Cashout</span>
                      <span style={{fontWeight: "bold", color: bet.status === "won" ? "#4ade80" : "#f87171"}}>
                        {(bet.result || 1.0).toFixed(2)}x
                      </span>
                    </div>
                    <div style={{...styles.historyCol, alignItems: "flex-end"}}>
                      <span style={{fontSize: 12, color: "#888"}}>Payout</span>
                      <span style={{fontWeight: "bold", color: bet.status === "won" ? "#4ade80" : "#888"}}>
                        {bet.status === "won" ? `₹${bet.winAmount.toFixed(2)}` : "₹0.00"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .stars {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: transparent;
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 50px 160px, rgba(255,255,255,0.9), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 130px 80px, rgba(255,255,255,0.7), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.8), rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 200px 200px;
          animation: moveStars 15s linear infinite;
        }
        .stars2 {
          background-image: 
            radial-gradient(1px 1px at 30px 50px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 70px 90px, rgba(255,255,255,0.6), rgba(0,0,0,0)),
            radial-gradient(1px 1px at 110px 20px, rgba(255,255,255,0.8), rgba(0,0,0,0));
          background-size: 150px 150px;
          animation: moveStars 25s linear infinite;
        }
        @keyframes moveStars {
          from { transform: translateY(0); }
          to { transform: translateY(200px); }
        }
        @keyframes rocketShake {
          0%, 100% { transform: translate(-50%, 0); }
          25% { transform: translate(-52%, 2px); }
          50% { transform: translate(-48%, -2px); }
          75% { transform: translate(-50%, 3px); }
        }
        @keyframes rocketLaunch {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          10% { transform: translate(-50%, -20px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -300px) scale(0.5); opacity: 0; }
        }
        @keyframes rocketCrash {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1.5); opacity: 0; filter: blur(10px); }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
          50% { transform: translateX(-50%) scale(1.1) translateY(5px); opacity: 0.8; }
        }
      `}} />
    </div>
  );
}

const styles = {
  container: {
    background: "var(--theme-bg)",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    color: "var(--theme-text)",
    fontFamily: "sans-serif",
    paddingBottom: 70,
    maxWidth: "480px",
    margin: "0 auto",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.05)",
    position: "relative" },
  header: {
    height: 60,
    background: "var(--theme-bg-card)",
    backdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 15px",
    borderBottom: "1px solid rgba(71, 129, 255, 0.1)",
    position: "sticky",
    top: 0,
    zIndex: 50 },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10 },
  backButton: {
    color: "var(--theme-green)",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "bold" },
  headerTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "var(--theme-text)" },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10 },
  historyBtn: {
    background: "transparent",
    border: "1px solid var(--theme-border)",
    color: "var(--theme-text)",
    padding: "6px 12px",
    borderRadius: "15px",
    fontSize: "12px",
    cursor: "pointer" },
  walletBox: {
    background: "var(--theme-bg-card)",
    padding: "4px 10px",
    borderRadius: 8,
    border: "1px solid rgba(71, 129, 255, 0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end" },
  walletLabel: {
    fontSize: "10px",
    color: "#aaa" },
  walletAmount: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "var(--theme-green)" },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "0",
    position: "relative" },
  historyBar: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    padding: "10px 15px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: "linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, transparent 100%)" },
  historyPill: {
    padding: "4px 12px",
    borderRadius: "15px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    border: "1px solid",
    boxShadow: "0 0 10px rgba(0, 0, 0, 0.05)" },
  gameArea: {
    flex: 1,
    background: "var(--theme-bg-elevated)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center" },
  spaceBackground: (state) => ({
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: state === "crashed" ? "var(--theme-primary)" : "var(--theme-primary)",
    zIndex: 0,
    transition: "background 0.5s ease" }),
  planet1: {
    position: "absolute",
    top: "20%", left: "15%",
    width: "40px", height: "40px",
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, #5d6d7e, #2c3e50)",
    boxShadow: "inset -5px -5px 15px rgba(0, 0, 0, 0.05)",
    opacity: 0.8 },
  planet2: {
    position: "absolute",
    top: "15%", right: "20%",
    width: "25px", height: "25px",
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, #e67e22, #d35400)",
    boxShadow: "inset -3px -3px 10px rgba(0, 0, 0, 0.05)",
    opacity: 0.6 },
  multiplierContainer: {
    position: "absolute",
    top: "25%",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center" },
  multiplierText: {
    fontSize: "64px",
    fontWeight: "900",
    textShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
    transition: "color 0.3s" },
  winText: {
    fontSize: "20px",
    color: "#4ade80",
    fontWeight: "bold",
    marginTop: "5px",
    textShadow: "0 2px 10px rgba(34,197,94,0.5)" },
  crashText: {
    fontSize: "20px",
    color: "#f87171",
    fontWeight: "bold",
    marginTop: "5px",
    textShadow: "0 2px 10px rgba(248,113,113,0.5)" },
  rocketContainer: (state) => ({
    position: "absolute",
    bottom: "20%",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 5,
    animation: state === "playing" ? "rocketShake 0.3s ease-in-out infinite" : state === "crashed" ? "rocketCrash 0.5s forwards" : state === "won" ? "rocketLaunch 1s forwards" : "none" }),
  planeExplosion: {
    fontSize: "80px",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.05))",
    transform: "translate(-50%, -50%)" },
  rocketBody: {
    width: "70px",
    height: "110px",
    background: "linear-gradient(to right, #475569 0%, #cbd5e1 30%, #e2e8f0 50%, #94a3b8 80%, #334155 100%)",
    borderRadius: "50% 50% 10% 10%",
    position: "relative",
    boxShadow: "inset 0 -10px 15px rgba(0, 0, 0, 0.05)",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center" },
  rocketNose: {
    width: "70px",
    height: "40px",
    background: "linear-gradient(to right, #7f1d1d 0%, #ef4444 30%, #f87171 50%, #dc2626 80%, #450a0a 100%)",
    borderRadius: "50% 50% 0 0",
    borderBottom: "4px solid #1e293b",
    boxShadow: "inset 0 -3px 5px rgba(0, 0, 0, 0.05)" },
  rocketWindowContainer: {
    marginTop: "12px",
    width: "34px",
    height: "34px",
    background: "var(--theme-primary)",
    borderRadius: "50%",
    border: "5px solid #334155",
    boxShadow: "inset 0 0 8px rgba(0, 0, 0, 0.05), 0 3px 5px rgba(0, 0, 0, 0.05)",
    position: "relative" },
  windowReflection: {
    position: "absolute",
    top: "3px",
    left: "3px",
    width: "10px",
    height: "14px",
    background: "rgba(255,255,255,0.6)",
    borderRadius: "50%",
    transform: "rotate(40deg)",
    filter: "blur(0.5px)" },
  rocketStripe: {
    marginTop: "10px",
    width: "70px",
    height: "6px",
    background: "var(--theme-bg-card)",
    boxShadow: "0 2px 3px rgba(0,0,0,0.2)" },
  rocketFinLeft: {
    position: "absolute",
    bottom: "-10px",
    left: "-24px",
    width: "30px",
    height: "60px",
    background: "linear-gradient(to bottom right, #ef4444 0%, #b91c1c 50%, #450a0a 100%)",
    borderTopLeftRadius: "100%",
    borderBottomLeftRadius: "20%",
    borderBottomRightRadius: "20%",
    zIndex: -1,
    boxShadow: "inset 3px 3px 5px rgba(255,255,255,0.2), -3px 5px 10px rgba(0, 0, 0, 0.05)" },
  rocketFinRight: {
    position: "absolute",
    bottom: "-10px",
    right: "-24px",
    width: "30px",
    height: "60px",
    background: "linear-gradient(to bottom left, #ef4444 0%, #b91c1c 50%, #450a0a 100%)",
    borderTopRightRadius: "100%",
    borderBottomRightRadius: "20%",
    borderBottomLeftRadius: "20%",
    zIndex: -1,
    boxShadow: "inset -3px 3px 5px rgba(255,255,255,0.2), 3px 5px 10px rgba(0, 0, 0, 0.05)" },
  rocketEngine: {
    position: "absolute",
    bottom: "-12px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "34px",
    height: "12px",
    background: "var(--theme-bg-card)",
    borderBottomLeftRadius: "6px",
    borderBottomRightRadius: "6px",
    zIndex: 1,
    boxShadow: "inset 0 3px 5px rgba(0, 0, 0, 0.05)" },
  flameCore: {
    position: "absolute",
    bottom: "-48px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "24px",
    height: "40px",
    background: "radial-gradient(ellipse at top, #fef08a 0%, #f59e0b 60%, transparent 100%)",
    borderRadius: "50%",
    filter: "blur(1px)",
    animation: "flameFlicker 0.1s infinite alternate",
    zIndex: 0,
    boxShadow: "0 5px 25px 15px rgba(245, 158, 11, 0.6)" },
  moonSurface: (state) => ({
    position: "absolute",
    bottom: "-15%",
    left: "-10%",
    width: "120%",
    height: "35%",
    background: "var(--theme-primary)",
    borderRadius: "50% 50% 0 0",
    boxShadow: "inset 0 15px 30px rgba(203, 213, 225, 0.15), 0 -10px 40px rgba(14, 165, 233, 0.15)",
    zIndex: 1,
    transform: state === "playing" ? "translateY(100%)" : "translateY(0)",
    transition: "transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)" }),
  crater1: {
    position: "absolute",
    top: "25%", left: "25%",
    width: "50px", height: "18px",
    background: "var(--theme-bg-card)",
    borderRadius: "50%",
    boxShadow: "inset 0 3px 6px rgba(0, 0, 0, 0.05), 0 2px 2px rgba(255,255,255,0.1)" },
  crater2: {
    position: "absolute",
    top: "45%", right: "25%",
    width: "70px", height: "25px",
    background: "var(--theme-bg-card)",
    borderRadius: "50%",
    boxShadow: "inset 0 3px 8px rgba(0, 0, 0, 0.05), 0 2px 2px rgba(255,255,255,0.1)" },
  crater3: {
    position: "absolute",
    top: "35%", left: "55%",
    width: "35px", height: "12px",
    background: "var(--theme-bg-card)",
    borderRadius: "50%",
    boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 1px rgba(255,255,255,0.1)" },
  controlsArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "transparent",
    padding: "10px",
    zIndex: 20,
    display: "flex",
    flexDirection: "column" },
  errorText: {
    color: "#f87171",
    fontSize: "12px",
    textAlign: "center",
    marginBottom: "5px",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.05)" },
  targetWrapper: {
    display: "flex",
    background: "var(--theme-bg-card)",
    borderRadius: "20px",
    width: "160px",
    margin: "0 auto -10px auto",
    overflow: "hidden",
    border: "1.5px solid rgba(255,255,255,0.08)",
    zIndex: 2,
    boxShadow: "0 4px 10px rgba(0, 0, 0, 0.05)",
    alignItems: "center",
    padding: "3px" },
  circleAdjustBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "var(--theme-bg-card)",
    border: "none",
    color: "var(--theme-text)",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s" },
  targetInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "var(--theme-text)",
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "bold",
    outline: "none",
    width: "100%" },
  footerControlBar: {
    background: "var(--theme-bg-card)",
    borderTop: "1.5px solid rgba(255,255,255,0.06)",
    padding: "12px 14px",
    margin: "0 -10px -10px -10px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    justifyContent: "space-between" },
  betWrapper: {
    flex: 1,
    display: "flex",
    background: "var(--theme-bg-card)",
    borderRadius: "9999px",
    border: "1.5px solid rgba(59,130,246,0.35)",
    padding: "4px 8px",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px" },
  betInputPill: {
    background: "var(--theme-bg-card)",
    borderRadius: "9999px",
    border: "1px solid var(--theme-border)",
    padding: "4px 12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "90px",
    height: "36px" },
  betPillLabel: {
    fontSize: "9px",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    fontWeight: "700",
    lineHeight: "1",
    marginBottom: "2px" },
  betPillInput: {
    background: "transparent",
    border: "none",
    color: "var(--theme-text)",
    fontWeight: "800",
    fontSize: "12px",
    textAlign: "center",
    outline: "none",
    width: "45px",
    padding: "0" },
  circleBetBtn: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "var(--theme-bg-card)",
    border: "1.5px solid rgba(59,130,246,0.25)",
    color: "var(--theme-text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.2s, border-color 0.2s" },
  autoBtn: {
    background: "var(--theme-bg-card)",
    border: "2px solid #000",
    color: "var(--theme-text)",
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 10px rgba(0, 102, 255, 0.4)",
    flexShrink: 0 },
  playBtn: {
    background: "var(--theme-bg-card)",
    border: "1.5px solid #246d03",
    color: "var(--theme-text)",
    padding: "0 22px",
    height: "44px",
    borderRadius: "9999px",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(47, 140, 5, 0.4), inset 0 1px 2px rgba(255,255,255,0.3)",
    flexShrink: 0 },
  adjustBtn: {
    background: "transparent",
    border: "none",
    color: "#93c5fd",
    padding: "0 12px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "background 0.2s" },
  presetsPopover: {
    position: "absolute",
    bottom: "65px",
    left: "14px",
    width: "220px",
    background: "var(--theme-bg-card)",
    border: "1.5px solid #233b80",
    borderRadius: "12px",
    padding: "12px",
    zIndex: 99,
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05)" },
  presetsTitle: {
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.03em" },
  presetsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px" },
  presetItem: {
    background: "var(--theme-bg-card)",
    border: "none",
    color: "var(--theme-text)",
    padding: "8px 0",
    borderRadius: "6px",
    fontWeight: "800",
    fontSize: "12px",
    cursor: "pointer",
    transition: "background 0.2s" },
  autoPlayModalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "var(--theme-bg-card)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "16px" },
  autoPlayModal: {
    background: "var(--theme-bg-card)",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "360px",
    border: "1.5px solid #30363d",
    padding: "20px",
    boxShadow: "0 15px 35px rgba(0, 0, 0, 0.05)" },
  autoPlayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px" },
  autoPlayTitle: {
    fontSize: "15px",
    fontWeight: "800",
    color: "var(--theme-text)",
    letterSpacing: "0.03em" },
  autoPlayCloseBtn: {
    background: "transparent",
    border: "none",
    color: "#8b949e",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center" },
  autoPlaySectionTitle: {
    fontSize: "12px",
    color: "#8b949e",
    textAlign: "center",
    marginBottom: "10px",
    fontWeight: "700" },
  autoPlayRoundsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
    marginBottom: "20px" },
  autoPlayRoundPill: {
    background: "var(--theme-bg-card)",
    border: "1.5px solid #30363d",
    borderRadius: "8px",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "var(--theme-text)",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "border-color 0.2s" },
  autoPlayDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "var(--theme-bg-card)" },
  autoPlayDotActive: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "var(--theme-bg-card)" },
  autoPlayConditionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
    background: "var(--theme-bg-card)",
    borderRadius: "10px",
    padding: "8px 12px",
    border: "1px solid #21262d" },
  autoPlayConditionLabelBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px" },
  autoPlayConditionLabel: {
    fontSize: "11px",
    color: "#c9d1d9",
    fontWeight: "600" },
  autoPlayControls: {
    display: "flex",
    alignItems: "center",
    gap: "6px" },
  autoPlayCircleBtn: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "var(--theme-bg-card)",
    border: "1px solid #30363d",
    color: "var(--theme-text)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    cursor: "pointer" },
  autoPlayValueInput: {
    background: "transparent",
    border: "none",
    color: "var(--theme-text)",
    width: "36px",
    textAlign: "center",
    fontSize: "11px",
    fontWeight: "bold",
    outline: "none" },
  modalOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "var(--theme-bg-card)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100 },
  modalContent: {
    background: "var(--theme-bg-card)",
    width: "90%",
    maxWidth: "400px",
    borderRadius: "12px",
    border: "1px solid rgba(71, 129, 255, 0.1)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    maxHeight: "80vh" },
  modalHeader: {
    padding: "15px 20px",
    background: "var(--theme-bg-elevated)",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center" },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--theme-text)",
    fontSize: "18px",
    cursor: "pointer" },
  historyList: {
    padding: "10px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px" },
  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    background: "var(--theme-bg)",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid var(--theme-border)" },
  historyCol: {
    display: "flex",
    flexDirection: "column",
    gap: "4px" } };
