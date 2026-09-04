"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, ChevronDown, Volume2, VolumeX, Clock, Users } from "lucide-react";
import { ChipSelector } from "../shared/ChipSelector";
import { WinnerBanner } from "../shared/WinnerBanner";

const NUMBERS_TOP = [
  { num: 2, odds: "1:26", boost: null },
  { num: 3, odds: "1:12", boost: "24X" },
  { num: 4, odds: "1:8", boost: "16X" },
  { num: 5, odds: "1:6", boost: null },
  { num: 6, odds: "1:5", boost: "10X" },
];

const NUMBERS_BOTTOM = [
  { num: 8, odds: "1:5", boost: null },
  { num: 9, odds: "1:7", boost: "12X" },
  { num: 10, odds: "1:6", boost: null },
  { num: 11, odds: "1:12", boost: null },
  { num: 12, odds: "1:26", boost: null },
];

const LIVE_PLAYERS = [
  { avatar: "👩🏻", balance: "4,772.09" },
  { avatar: "🧔🏻", balance: "2,580.23" },
  { avatar: "👱‍♀️", balance: "6,812.79" },
];

interface DiceHistoryItem {
  id: string;
  dice: [number, number];
  sum: number;
  outcome: "seven_down" | "seven_exact" | "seven_up";
}

export function SevenUpDownGameScreen() {
  const [balance, setBalance] = useState(10000);
  const [selectedChip, setSelectedChip] = useState(50);
  const [userBets, setUserBets] = useState<Record<string, number>>({});

  // Simulated Multiplayer Table Bets (Other Players' Chips)
  const [tableBets, setTableBets] = useState<Record<string, number>>({
    seven_down: 3500,
    seven_exact: 1200,
    seven_up: 4800,
    num_3: 400,
    num_4: 650,
    num_9: 500,
  });

  const [soundOn, setSoundOn] = useState(true);
  const [dice, setDice] = useState<[number, number]>([3, 4]);
  const [sum, setSum] = useState<number | null>(7);

  // 24/7 Server Period State
  const [periodId, setPeriodId] = useState<string>("20260904001");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25);
  const [isBettingLocked, setIsBettingLocked] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  const [winner, setWinner] = useState<string | null>(null);
  const [payout, setPayout] = useState(0);

  const [history, setHistory] = useState<DiceHistoryItem[]>([
    { id: "1", dice: [6, 4], sum: 10, outcome: "seven_up" },
    { id: "2", dice: [4, 4], sum: 8, outcome: "seven_up" },
    { id: "3", dice: [3, 3], sum: 6, outcome: "seven_down" },
    { id: "4", dice: [5, 3], sum: 8, outcome: "seven_up" },
    { id: "5", dice: [2, 6], sum: 8, outcome: "seven_up" },
    { id: "6", dice: [1, 4], sum: 5, outcome: "seven_down" },
    { id: "7", dice: [4, 3], sum: 7, outcome: "seven_exact" },
    { id: "8", dice: [2, 4], sum: 6, outcome: "seven_down" },
    { id: "9", dice: [5, 5], sum: 10, outcome: "seven_up" },
    { id: "10", dice: [4, 5], sum: 9, outcome: "seven_up" },
    { id: "11", dice: [2, 3], sum: 5, outcome: "seven_down" },
    { id: "12", dice: [4, 4], sum: 8, outcome: "seven_up" },
  ]);

  // -------------------------------------------------------------
  // 24-HOUR CONTINUOUS SERVER ROUND TIMER LOOP
  // -------------------------------------------------------------
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchCurrentRound = async () => {
      try {
        const res = await fetch("/api/seven-up-down/current");
        const json = await res.json();
        if (json.success && json.data) {
          const { periodId: pId, remainingSeconds: remSec, bettingLocked } = json.data;
          setPeriodId(pId);
          setRemainingSeconds(remSec);
          setIsBettingLocked(bettingLocked);

          // If period locked and timer hits <= 5s, trigger round settlement
          if (remSec <= 5 && !isShaking) {
            handleRoundResolve();
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchCurrentRound();
    timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          fetchCurrentRound();
          return 30;
        }
        if (prev === 6) {
          setIsBettingLocked(true);
          handleRoundResolve();
        }
        return prev - 1;
      });

      // Simulate live chips being placed by other table players during betting phase
      if (remainingSeconds > 5) {
        simulateMultiplayerBets();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  // Simulate other players placing chips in real time
  const simulateMultiplayerBets = () => {
    const keys = ["seven_down", "seven_exact", "seven_up", "num_3", "num_4", "num_6", "num_9"];
    const targetKey = keys[Math.floor(Math.random() * keys.length)];
    const chipVal = [50, 100, 500, 1000][Math.floor(Math.random() * 4)];

    setTableBets((prev) => ({
      ...prev,
      [targetKey]: (prev[targetKey] || 0) + chipVal,
    }));
  };

  const handleRoundResolve = async () => {
    setIsShaking(true);
    setWinner(null);
    setPayout(0);

    setTimeout(async () => {
      try {
        const activeBets = Object.entries(userBets).map(([key, amount]) => ({
          betType: key.startsWith("num_") ? "number" : key,
          selection: key.startsWith("num_") ? key.replace("num_", "") : key,
          amount,
        }));

        const res = await fetch("/api/casino/seven-up-down", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "settle", bets: activeBets }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          const { result, settlements, balance: newBal } = data.data;

          setDice(result.dice);
          setSum(result.sum);

          if (activeBets.length > 0) {
            const totalWin = settlements.reduce((acc: number, s: any) => acc + s.payout, 0);
            setPayout(totalWin);
            setBalance(newBal);

            const label =
              result.outcome === "seven_down"
                ? `2-6 DOWN (${result.sum})`
                : result.outcome === "seven_exact"
                ? `EXACT 7`
                : `8-12 UP (${result.sum})`;

            setWinner(totalWin > 0 ? `WINNER! ${label}` : label);
          }

          setHistory((prev) => [
            { id: String(Date.now()), dice: result.dice, sum: result.sum, outcome: result.outcome },
            ...prev.slice(0, 19),
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsShaking(false);
        setUserBets({});
        // Reset multiplayer table chips for next period
        setTableBets({
          seven_down: Math.floor(Math.random() * 2000) + 1000,
          seven_exact: Math.floor(Math.random() * 1000) + 500,
          seven_up: Math.floor(Math.random() * 2500) + 1200,
        });
      }
    }, 1500);
  };

  const placeBet = (key: string) => {
    if (isBettingLocked || isShaking) return;
    if (balance < selectedChip) return;
    setBalance((prev) => prev - selectedChip);
    setUserBets((prev) => ({ ...prev, [key]: (prev[key] || 0) + selectedChip }));
  };

  const clearBets = () => {
    if (isBettingLocked || isShaking) return;
    const totalUserBet = Object.values(userBets).reduce((a, b) => a + b, 0);
    setBalance((prev) => prev + totalUserBet);
    setUserBets({});
  };

  const doubleBets = () => {
    if (isBettingLocked || isShaking) return;
    const totalUserBet = Object.values(userBets).reduce((a, b) => a + b, 0);
    if (balance < totalUserBet) return;

    setBalance((prev) => prev - totalUserBet);
    const newBets: Record<string, number> = {};
    Object.entries(userBets).forEach(([k, v]) => {
      newBets[k] = v * 2;
    });
    setUserBets(newBets);
  };

  const totalUserBet = Object.values(userBets).reduce((a, b) => a + b, 0);

  // Stats calculation
  const downCount = history.filter((h) => h.outcome === "seven_down").length;
  const upCount = history.filter((h) => h.outcome === "seven_up").length;
  const totalRounds = Math.max(1, history.length);
  const downPct = Math.round((downCount / totalRounds) * 100);
  const upPct = Math.round((upCount / totalRounds) * 100);
  const exactPct = 100 - downPct - upPct;

  return (
    <div
      style={{
        minHeight: "100dvh",
        maxWidth: "480px",
        margin: "0 auto",
        background: "radial-gradient(circle at 50% 30%, #20062b 0%, #0e0214 100%)",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
        position: "relative",
        boxShadow: "0 0 40px rgba(0, 0, 0, 0.9)",
        overflow: "hidden",
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & ROADMAP STATS BAR                             */}
      {/* ------------------------------------------------------------- */}
      <header
        style={{
          background: "rgba(12, 2, 18, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "6px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#fbbf24",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: "700",
            }}
          >
            <ArrowLeft size={16} /> Home
          </Link>

          {/* 24/7 Timer HUD Display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: isBettingLocked ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
              border: `1px solid ${isBettingLocked ? "#ef4444" : "#22c55e"}`,
              borderRadius: "12px",
              padding: "2px 8px",
              fontSize: "11px",
              fontWeight: "900",
              color: isBettingLocked ? "#fca5a5" : "#86efac",
            }}
          >
            <Clock size={12} />
            <span>{isBettingLocked ? "LOCKED" : `BETTING: ${remainingSeconds}s`}</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "10px" }}>
          <div style={{ color: "#facc15" }}>
            ★ 2~6 <strong style={{ color: "#4ade80" }}>{downPct}%</strong> | ★ 8~12 <strong style={{ color: "#f87171" }}>{upPct}%</strong> | ★ 7 <strong style={{ color: "#60a5fa" }}>{exactPct}%</strong>
          </div>
          <div style={{ color: "#94a3b8" }}>Last 100 rounds</div>
        </div>

        {/* Bead Road Outcome Strip */}
        <div style={{ display: "flex", gap: "3px", overflowX: "auto", padding: "2px 0", scrollbarWidth: "none" }}>
          {history.map((h, idx) => {
            const isDown = h.outcome === "seven_down";
            const isExact = h.outcome === "seven_exact";
            const bg = isDown ? "#14532d" : isExact ? "#1e3a8a" : "#7f1d1d";
            const borderColor = isDown ? "#22c55e" : isExact ? "#3b82f6" : "#ef4444";
            return (
              <div
                key={h.id || idx}
                style={{
                  minWidth: "24px",
                  height: "32px",
                  borderRadius: "4px",
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: "900",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <div>{h.sum}</div>
                <div style={{ fontSize: "7px", opacity: 0.8 }}>
                  {h.dice[0]} {h.dice[1]}
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. CENTER STAGE: DOME SHAKER & HIGH WIN RATE PLAYERS          */}
      {/* ------------------------------------------------------------- */}
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8px" }}>
        <WinnerBanner show={!!winner} title={winner || ""} payout={payout} />

        {/* Left Side: High Win Rate Player Avatars */}
        <div style={{ position: "absolute", left: "8px", top: "8px", zIndex: 10, display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ fontSize: "8px", fontWeight: "800", color: "#fbbf24", textTransform: "uppercase" }}>
            HIGH WIN RATE
          </div>
          {LIVE_PLAYERS.map((p, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "2px 6px",
              }}
            >
              <span style={{ fontSize: "11px" }}>{p.avatar}</span>
              <span style={{ fontSize: "9px", color: "#fbbf24", fontWeight: "700" }}>₹{p.balance}</span>
            </div>
          ))}
        </div>

        {/* Center: Glass Dome Shaker Container */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "10px 0" }}>
          <div
            style={{
              position: "relative",
              width: "170px",
              height: "170px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Dark Green Pedestal Bowl Base */}
            <div
              style={{
                position: "absolute",
                bottom: "0",
                width: "160px",
                height: "50px",
                borderRadius: "50%",
                background: "radial-gradient(ellipse at center, #045e38 0%, #032b1a 100%)",
                border: "4px solid #064e2e",
                boxShadow: "0 8px 20px rgba(0,0,0,0.8)",
              }}
            />

            {/* Glass Dome Cover */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                width: "140px",
                height: "140px",
                borderRadius: "50% 50% 15% 15%",
                background: "radial-gradient(ellipse at 30% 30%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.05) 60%, rgba(0, 0, 0, 0.4) 100%)",
                border: "2px solid rgba(255, 255, 255, 0.4)",
                boxShadow: "inset 0 0 20px rgba(255, 255, 255, 0.3), 0 10px 20px rgba(0,0,0,0.6)",
                backdropFilter: "blur(2px)",
                transform: isShaking ? "translateY(-6px) rotate(6deg)" : "translateY(0) rotate(0)",
                transition: "transform 0.1s ease-in-out",
                zIndex: 3,
              }}
            />

            {/* 3D Dice inside Dome */}
            <div
              style={{
                position: "absolute",
                bottom: "22px",
                display: "flex",
                gap: "10px",
                zIndex: 2,
                transform: isShaking ? "rotate(15deg) scale(1.05)" : "rotate(0) scale(1)",
                transition: "transform 0.1s ease",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "#ffffff",
                  border: "2px solid #cbd5e1",
                  color: "#000",
                  fontSize: "20px",
                  fontWeight: "900",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.6)",
                }}
              >
                {dice[0]}
              </div>

              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "#ffffff",
                  border: "2px solid #cbd5e1",
                  color: "#dc2626",
                  fontSize: "20px",
                  fontWeight: "900",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.6)",
                }}
              >
                {dice[1]}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Control Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 8px",
            background: "rgba(10, 2, 16, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "6px",
            fontSize: "10px",
            color: "#cbd5e1",
            margin: "4px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Settings size={12} color="#fbbf24" />
            <span>12 Roadmap</span>
            <ChevronDown size={10} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#4ade80" }}>
            <Users size={12} /> Live Players (142)
          </div>
          <div style={{ color: "#fbbf24", fontWeight: "700" }}>Min 10 Max 200</div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. MAIN 3 BETTING ZONES (WITH LIVE MULTIPLAYER CHIPS)         */}
        {/* ------------------------------------------------------------- */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr 1fr", gap: "6px", marginBottom: "6px" }}>
          {/* DOWN 2-6 */}
          <button
            type="button"
            onClick={() => placeBet("seven_down")}
            disabled={isBettingLocked || isShaking}
            style={{
              background: "#045e38",
              border: "2px solid #27b878",
              borderRadius: "8px",
              padding: "12px 6px",
              color: "#ffffff",
              cursor: isBettingLocked || isShaking ? "not-allowed" : "pointer",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div style={{ fontSize: "22px", fontWeight: "900", color: "#facc15", lineHeight: 1 }}>
              2-6
            </div>
            <div style={{ fontSize: "11px", color: "#a7f3d0", fontWeight: "700", margin: "2px 0" }}>1:1</div>
            <div style={{ fontSize: "15px", fontWeight: "900", color: "#ffffff", letterSpacing: "1px" }}>
              DOWN
            </div>
            {/* Live Multiplayer Chip Stack Badge */}
            <div style={{ position: "absolute", bottom: "4px", left: "4px", fontSize: "8px", color: "#a7f3d0", background: "rgba(0,0,0,0.5)", padding: "1px 4px", borderRadius: "4px" }}>
              ₹{(tableBets["seven_down"] || 0).toLocaleString()}
            </div>
            {userBets["seven_down"] && (
              <div style={{ position: "absolute", bottom: "4px", right: "4px", background: "#fbbf24", color: "#000", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: "900" }}>
                ₹{userBets["seven_down"]}
              </div>
            )}
          </button>

          {/* 7 EXACT */}
          <button
            type="button"
            onClick={() => placeBet("seven_exact")}
            disabled={isBettingLocked || isShaking}
            style={{
              background: "#0c3f74",
              border: "2px solid #3b82f6",
              borderRadius: "8px",
              padding: "12px 6px",
              color: "#ffffff",
              cursor: isBettingLocked || isShaking ? "not-allowed" : "pointer",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div style={{ fontSize: "28px", fontWeight: "900", color: "#facc15", lineHeight: 1 }}>
              7
            </div>
            <div style={{ fontSize: "12px", color: "#bfdbfe", fontWeight: "700", marginTop: "4px" }}>1:4</div>
            <div style={{ position: "absolute", bottom: "4px", left: "4px", fontSize: "8px", color: "#bfdbfe", background: "rgba(0,0,0,0.5)", padding: "1px 4px", borderRadius: "4px" }}>
              ₹{(tableBets["seven_exact"] || 0).toLocaleString()}
            </div>
            {userBets["seven_exact"] && (
              <div style={{ position: "absolute", bottom: "4px", right: "4px", background: "#fbbf24", color: "#000", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: "900" }}>
                ₹{userBets["seven_exact"]}
              </div>
            )}
          </button>

          {/* UP 8-12 */}
          <button
            type="button"
            onClick={() => placeBet("seven_up")}
            disabled={isBettingLocked || isShaking}
            style={{
              background: "#8b1818",
              border: "2px solid #ef4444",
              borderRadius: "8px",
              padding: "12px 6px",
              color: "#ffffff",
              cursor: isBettingLocked || isShaking ? "not-allowed" : "pointer",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div style={{ fontSize: "22px", fontWeight: "900", color: "#facc15", lineHeight: 1 }}>
              8-12
            </div>
            <div style={{ fontSize: "11px", color: "#fca5a5", fontWeight: "700", margin: "2px 0" }}>1:1</div>
            <div style={{ fontSize: "15px", fontWeight: "900", color: "#ffffff", letterSpacing: "1px" }}>
              UP
            </div>
            <div style={{ position: "absolute", bottom: "4px", left: "4px", fontSize: "8px", color: "#fca5a5", background: "rgba(0,0,0,0.5)", padding: "1px 4px", borderRadius: "4px" }}>
              ₹{(tableBets["seven_up"] || 0).toLocaleString()}
            </div>
            {userBets["seven_up"] && (
              <div style={{ position: "absolute", bottom: "4px", right: "4px", background: "#fbbf24", color: "#000", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: "900" }}>
                ₹{userBets["seven_up"]}
              </div>
            )}
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. EXACT NUMBER BETTING GRID (WITH MULTIPLAYER CHIP BADGES)    */}
        {/* ------------------------------------------------------------- */}
        <div
          style={{
            background: "#033b30",
            border: "1px solid #0d9488",
            borderRadius: "8px",
            padding: "6px",
            marginBottom: "6px",
          }}
        >
          {/* Top Row: 2, 3, 4, 5, 6 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px", marginBottom: "4px" }}>
            {NUMBERS_TOP.map((item) => {
              const key = `num_${item.num}`;
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => placeBet(key)}
                  disabled={isBettingLocked || isShaking}
                  style={{
                    padding: "8px 2px",
                    borderRadius: "6px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    cursor: isBettingLocked || isShaking ? "not-allowed" : "pointer",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  {item.boost ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{item.num}</div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "900",
                          color: "#facc15",
                          background: "radial-gradient(circle at center, #854d0e 0%, #1e1b4b 100%)",
                          padding: "2px 4px",
                          borderRadius: "4px",
                          border: "1px solid #facc15",
                        }}
                      >
                        ⚡{item.boost}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "900", color: "#fff" }}>{item.num}</div>
                      <div style={{ fontSize: "9px", color: "#94a3b8" }}>{item.odds}</div>
                    </div>
                  )}

                  {tableBets[key] && (
                    <div style={{ fontSize: "7px", color: "#94a3b8", opacity: 0.8 }}>₹{tableBets[key]}</div>
                  )}

                  {userBets[key] && (
                    <div style={{ fontSize: "8px", color: "#000", background: "#fbbf24", borderRadius: "6px", padding: "0 2px", marginTop: "1px" }}>
                      ₹{userBets[key]}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Row: 8, 9, 10, 11, 12 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px" }}>
            {NUMBERS_BOTTOM.map((item) => {
              const key = `num_${item.num}`;
              return (
                <button
                  key={item.num}
                  type="button"
                  onClick={() => placeBet(key)}
                  disabled={isBettingLocked || isShaking}
                  style={{
                    padding: "8px 2px",
                    borderRadius: "6px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    cursor: isBettingLocked || isShaking ? "not-allowed" : "pointer",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  {item.boost ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>{item.num}</div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "900",
                          color: "#facc15",
                          background: "radial-gradient(circle at center, #854d0e 0%, #1e1b4b 100%)",
                          padding: "2px 4px",
                          borderRadius: "4px",
                          border: "1px solid #facc15",
                        }}
                      >
                        ⚡{item.boost}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "900", color: "#fff" }}>{item.num}</div>
                      <div style={{ fontSize: "9px", color: "#94a3b8" }}>{item.odds}</div>
                    </div>
                  )}

                  {tableBets[key] && (
                    <div style={{ fontSize: "7px", color: "#94a3b8", opacity: 0.8 }}>₹{tableBets[key]}</div>
                  )}

                  {userBets[key] && (
                    <div style={{ fontSize: "8px", color: "#000", background: "#fbbf24", borderRadius: "6px", padding: "0 2px", marginTop: "1px" }}>
                      ₹{userBets[key]}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 5. BOTTOM CONTROLS FOOTER                                     */}
        {/* ------------------------------------------------------------- */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          {/* Chip Selector Bar */}
          <ChipSelector activeChip={selectedChip} onSelectChip={setSelectedChip} />

          {/* Action Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
            <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
              Balance <strong style={{ color: "#4ade80" }}>₹{balance.toLocaleString("en-IN")}</strong> | Your Bet <strong style={{ color: "#facc15" }}>₹{totalUserBet}</strong>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={clearBets}
                disabled={totalUserBet === 0 || isBettingLocked || isShaking}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid #ef4444",
                  color: "#ef4444",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: totalUserBet === 0 || isBettingLocked || isShaking ? "not-allowed" : "pointer",
                }}
              >
                Clear
              </button>

              <button
                type="button"
                onClick={doubleBets}
                disabled={totalUserBet === 0 || isBettingLocked || isShaking}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: "rgba(59, 130, 246, 0.2)",
                  border: "1px solid #3b82f6",
                  color: "#60a5fa",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: totalUserBet === 0 || isBettingLocked || isShaking ? "not-allowed" : "pointer",
                }}
              >
                2x
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
