"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, VolumeX, Clock, Users } from "lucide-react";
import { ChipSelector } from "../shared/ChipSelector";
import { WinnerBanner } from "../shared/WinnerBanner";

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const ROW_3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
const ROW_2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
const ROW_1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

interface RouletteHistoryItem {
  id: string;
  slot: string;
  color: "red" | "black" | "green";
}

export function RouletteGameScreen() {
  const [balance, setBalance] = useState(10000);
  const [selectedChip, setSelectedChip] = useState(100);
  const [userBets, setUserBets] = useState<Record<string, number>>({});

  // Simulated Multiplayer Table Chips
  const [tableBets, setTableBets] = useState<Record<string, number>>({
    red: 6500,
    black: 5200,
    even: 3100,
    odd: 2800,
    dozen1: 2400,
    dozen2: 1800,
    col1: 1500,
    "17": 400,
    "32": 600,
  });

  const [soundOn, setSoundOn] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [winningSlot, setWinningSlot] = useState<string | null>(null);

  // 24/7 Server Period State
  const [periodId, setPeriodId] = useState<string>("20260904001");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25);
  const [isBettingLocked, setIsBettingLocked] = useState<boolean>(false);

  const [payout, setPayout] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  const [history, setHistory] = useState<RouletteHistoryItem[]>([
    { id: "1", slot: "9", color: "red" },
    { id: "2", slot: "29", color: "black" },
    { id: "3", slot: "8", color: "black" },
    { id: "4", slot: "6", color: "black" },
    { id: "5", slot: "35", color: "black" },
    { id: "6", slot: "36", color: "red" },
    { id: "7", slot: "12", color: "red" },
    { id: "8", slot: "4", color: "black" },
  ]);

  // -------------------------------------------------------------
  // 24-HOUR CONTINUOUS SERVER ROUND TIMER LOOP
  // -------------------------------------------------------------
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const fetchCurrentRound = async () => {
      try {
        const res = await fetch("/api/roulette/current");
        const json = await res.json();
        if (json.success && json.data) {
          const { periodId: pId, remainingSeconds: remSec, bettingLocked } = json.data;
          setPeriodId(pId);
          setRemainingSeconds(remSec);
          setIsBettingLocked(bettingLocked);

          if (remSec <= 5 && !isSpinning) {
            handleWheelSpin();
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
          handleWheelSpin();
        }
        return prev - 1;
      });

      if (remainingSeconds > 5) {
        simulateMultiplayerBets();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  const simulateMultiplayerBets = () => {
    const keys = ["red", "black", "even", "odd", "dozen1", "dozen2", "dozen3", "col1", "col2", "17", "32", "0"];
    const targetKey = keys[Math.floor(Math.random() * keys.length)];
    const chipVal = [100, 200, 500, 1000][Math.floor(Math.random() * 4)];

    setTableBets((prev) => ({
      ...prev,
      [targetKey]: (prev[targetKey] || 0) + chipVal,
    }));
  };

  const handleWheelSpin = async () => {
    setIsSpinning(true);
    setWinner(null);
    setPayout(0);

    const extraRot = 1440 + Math.floor(Math.random() * 360);
    setWheelRotation((prev) => prev + extraRot);

    setTimeout(async () => {
      try {
        const activeBets = Object.entries(userBets).map(([key, amount]) => ({
          betType: !isNaN(Number(key)) || key === "0" || key === "00" ? "straight" : key,
          selection: key,
          amount,
        }));

        const res = await fetch("/api/casino/roulette", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "settle", bets: activeBets }),
        });

        const data = await res.json();
        if (data.success && data.data) {
          const { result, settlements, balance: newBal } = data.data;

          setWinningSlot(String(result.winningSlot));

          if (activeBets.length > 0) {
            const totalWin = settlements.reduce((acc: number, s: any) => acc + s.payout, 0);
            setPayout(totalWin);
            setBalance(newBal);

            const slotColor = result.color.toUpperCase();
            setWinner(totalWin > 0 ? `WINNER! ${result.winningSlot} (${slotColor})` : `${result.winningSlot} (${slotColor})`);
          }

          setHistory((prev) => [
            { id: String(Date.now()), slot: String(result.winningSlot), color: result.color },
            ...prev.slice(0, 19),
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSpinning(false);
        setUserBets({});
        setTableBets({
          red: Math.floor(Math.random() * 4000) + 2000,
          black: Math.floor(Math.random() * 4000) + 2000,
          even: Math.floor(Math.random() * 2000) + 1000,
          odd: Math.floor(Math.random() * 2000) + 1000,
        });
      }
    }, 2000);
  };

  const placeBet = (key: string) => {
    if (isBettingLocked || isSpinning) return;
    if (balance < selectedChip) return;
    setBalance((prev) => prev - selectedChip);
    setUserBets((prev) => ({ ...prev, [key]: (prev[key] || 0) + selectedChip }));
  };

  const clearBets = () => {
    if (isBettingLocked || isSpinning) return;
    const totalUserBet = Object.values(userBets).reduce((a, b) => a + b, 0);
    setBalance((prev) => prev + totalUserBet);
    setUserBets({});
  };

  const doubleBets = () => {
    if (isBettingLocked || isSpinning) return;
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

  const hotNumbers = [
    { num: 9, hits: 20 },
    { num: 29, hits: 19 },
    { num: 8, hits: 19 },
    { num: 6, hits: 19 },
  ];
  const coldNumbers = [
    { num: 35, hits: 4 },
    { num: 36, hits: 5 },
    { num: 12, hits: 8 },
    { num: 4, hits: 8 },
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        maxWidth: "500px",
        margin: "0 auto",
        background: "radial-gradient(circle at 50% 30%, #1a0505 0%, #080202 100%)",
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
      {/* 1. NETENT CLEAN HEADER BAR WITH 24/7 TIMER                    */}
      {/* ------------------------------------------------------------- */}
      <header
        style={{
          background: "rgba(10, 2, 2, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} />
          </Link>
          <div style={{ fontSize: "14px", fontWeight: "900", color: "#ffffff", letterSpacing: "0.5px" }}>
            American <span style={{ color: "#ef4444" }}>ROULETTE™</span>
          </div>
        </div>

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
          <span>{isBettingLocked ? "SPINNING" : `BETTING: ${remainingSeconds}s`}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "#facc15" }}>
            ₹{balance.toLocaleString("en-IN")}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2. TOP STAGE: 3D WHEEL & HOT/COLD NUMBERS PANEL                */}
      {/* ------------------------------------------------------------- */}
      <div style={{ position: "relative", padding: "10px", display: "flex", flexDirection: "column", flex: 1 }}>
        <WinnerBanner show={!!winner} title={winner || ""} payout={payout} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
          {/* Roulette Wheel Container */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                width: "180px",
                height: "180px",
                position: "relative",
                borderRadius: "50%",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.8)",
              }}
            >
              <img
                src="/design/american_roulette_wheel.jpg"
                alt="American Roulette Wheel"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? "transform 2s cubic-bezier(0.15, 0.85, 0.35, 1.2)" : "none",
                }}
              />
            </div>
          </div>

          {/* HOT & COLD NUMBERS Panel */}
          <div
            style={{
              background: "rgba(10, 2, 2, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              padding: "8px",
            }}
          >
            {/* HOT */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "8px", fontWeight: "900", color: "#f87171", textTransform: "uppercase", marginBottom: "4px" }}>
                HOT NUMBERS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px" }}>
                {hotNumbers.map((item, idx) => (
                  <div key={idx} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#991b1b",
                        color: "#fff",
                        fontSize: "9px",
                        fontWeight: "900",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #fca5a5",
                        margin: "0 auto",
                      }}
                    >
                      {item.num}
                    </div>
                    <div style={{ fontSize: "7px", color: "#94a3b8", marginTop: "1px" }}>{item.hits}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLD */}
            <div>
              <div style={{ fontSize: "8px", fontWeight: "900", color: "#60a5fa", textTransform: "uppercase", marginBottom: "4px" }}>
                COLD NUMBERS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px" }}>
                {coldNumbers.map((item, idx) => (
                  <div key={idx} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#18181b",
                        color: "#fff",
                        fontSize: "9px",
                        fontWeight: "900",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #71717a",
                        margin: "0 auto",
                      }}
                    >
                      {item.num}
                    </div>
                    <div style={{ fontSize: "7px", color: "#94a3b8", marginTop: "1px" }}>{item.hits}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 3. NETENT RED FELT AMERICAN ROULETTE TABLE WITH CHIPS          */}
        {/* ------------------------------------------------------------- */}
        <div
          style={{
            background: "radial-gradient(ellipse at center, #6b1115 0%, #3b090b 100%)",
            borderRadius: "12px",
            border: "2px solid #991b1b",
            padding: "10px 6px",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
            marginBottom: "8px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 38px", gap: "4px" }}>
            {/* Green Zeros Column (00 & 0) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button
                type="button"
                onClick={() => placeBet("00")}
                disabled={isBettingLocked || isSpinning}
                style={{
                  flex: 1,
                  background: "#14532d",
                  border: "1px solid #22c55e",
                  borderRadius: "6px 0 0 6px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "900",
                  cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
                }}
              >
                00
                {userBets["00"] && <div style={{ fontSize: "8px", color: "#fbbf24" }}>₹{userBets["00"]}</div>}
              </button>

              <button
                type="button"
                onClick={() => placeBet("0")}
                disabled={isBettingLocked || isSpinning}
                style={{
                  flex: 1,
                  background: "#14532d",
                  border: "1px solid #22c55e",
                  borderRadius: "6px 0 0 6px",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "900",
                  cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
                }}
              >
                0
                {userBets["0"] && <div style={{ fontSize: "8px", color: "#fbbf24" }}>₹{userBets["0"]}</div>}
              </button>
            </div>

            {/* 3x12 Inside Numbers Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {/* Row 3 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "3px" }}>
                {ROW_3.map((num) => {
                  const isRed = RED_NUMBERS.includes(num);
                  const key = String(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => placeBet(key)}
                      disabled={isBettingLocked || isSpinning}
                      style={{
                        padding: "8px 0",
                        borderRadius: "3px",
                        background: isRed ? "#991b1b" : "#18181b",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "900",
                        cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
                        position: "relative",
                      }}
                    >
                      {num}
                      {userBets[key] && (
                        <div style={{ position: "absolute", bottom: "1px", right: "1px", fontSize: "7px", background: "#fbbf24", color: "#000", padding: "0 2px" }}>
                          ₹{userBets[key]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Row 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "3px" }}>
                {ROW_2.map((num) => {
                  const isRed = RED_NUMBERS.includes(num);
                  const key = String(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => placeBet(key)}
                      disabled={isBettingLocked || isSpinning}
                      style={{
                        padding: "8px 0",
                        borderRadius: "3px",
                        background: isRed ? "#991b1b" : "#18181b",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "900",
                        cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
                        position: "relative",
                      }}
                    >
                      {num}
                      {userBets[key] && (
                        <div style={{ position: "absolute", bottom: "1px", right: "1px", fontSize: "7px", background: "#fbbf24", color: "#000", padding: "0 2px" }}>
                          ₹{userBets[key]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Row 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "3px" }}>
                {ROW_1.map((num) => {
                  const isRed = RED_NUMBERS.includes(num);
                  const key = String(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => placeBet(key)}
                      disabled={isBettingLocked || isSpinning}
                      style={{
                        padding: "8px 0",
                        borderRadius: "3px",
                        background: isRed ? "#991b1b" : "#18181b",
                        border: "1px solid rgba(255,255,255,0.2)",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: "900",
                        cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
                        position: "relative",
                      }}
                    >
                      {num}
                      {userBets[key] && (
                        <div style={{ position: "absolute", bottom: "1px", right: "1px", fontSize: "7px", background: "#fbbf24", color: "#000", padding: "0 2px" }}>
                          ₹{userBets[key]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2:1 Column Payouts */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button
                type="button"
                onClick={() => placeBet("col3")}
                disabled={isBettingLocked || isSpinning}
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "3px",
                  color: "#fef08a",
                  fontSize: "9px",
                  fontWeight: "900",
                  cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
                }}
              >
                2:1
              </button>
              <button
                type="button"
                onClick={() => placeBet("col2")}
                disabled={isBettingLocked || isSpinning}
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "3px",
                  color: "#fef08a",
                  fontSize: "9px",
                  fontWeight: "900",
                  cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
                }}
              >
                2:1
              </button>
              <button
                type="button"
                onClick={() => placeBet("col1")}
                disabled={isBettingLocked || isSpinning}
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "3px",
                  color: "#fef08a",
                  fontSize: "9px",
                  fontWeight: "900",
                  cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
                }}
              >
                2:1
              </button>
            </div>
          </div>

          {/* Dozens Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginTop: "6px" }}>
            <button
              type="button"
              onClick={() => placeBet("dozen1")}
              disabled={isBettingLocked || isSpinning}
              style={{
                padding: "6px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: "900",
                cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
              }}
            >
              1st - 12 (₹{(tableBets["dozen1"] || 0).toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => placeBet("dozen2")}
              disabled={isBettingLocked || isSpinning}
              style={{
                padding: "6px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: "900",
                cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
              }}
            >
              2nd - 12 (₹{(tableBets["dozen2"] || 0).toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => placeBet("dozen3")}
              disabled={isBettingLocked || isSpinning}
              style={{
                padding: "6px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: "900",
                cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
              }}
            >
              3rd - 12
            </button>
          </div>

          {/* Outside Bets Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "4px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => placeBet("low")}
              disabled={isBettingLocked || isSpinning}
              style={{
                padding: "6px 2px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: "9px",
                fontWeight: "900",
                cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
              }}
            >
              1 - 18
            </button>
            <button
              type="button"
              onClick={() => placeBet("even")}
              disabled={isBettingLocked || isSpinning}
              style={{
                padding: "6px 2px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: "9px",
                fontWeight: "900",
                cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
              }}
            >
              EVEN (₹{(tableBets["even"] || 0).toLocaleString()})
            </button>

            <button
              type="button"
              onClick={() => placeBet("red")}
              disabled={isBettingLocked || isSpinning}
              style={{
                padding: "6px 2px",
                borderRadius: "4px",
                background: "#991b1b",
                border: "1px solid #fca5a5",
                color: "#fff",
                fontSize: "9px",
                fontWeight: "900",
                cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
              }}
            >
              RED (₹{(tableBets["red"] || 0).toLocaleString()})
            </button>

            <button
              type="button"
              onClick={() => placeBet("black")}
              disabled={isBettingLocked || isSpinning}
              style={{
                padding: "6px 2px",
                borderRadius: "4px",
                background: "#18181b",
                border: "1px solid #71717a",
                color: "#fff",
                fontSize: "9px",
                fontWeight: "900",
                cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
              }}
            >
              BLACK (₹{(tableBets["black"] || 0).toLocaleString()})
            </button>

            <button
              type="button"
              onClick={() => placeBet("odd")}
              disabled={isBettingLocked || isSpinning}
              style={{
                padding: "6px 2px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: "9px",
                fontWeight: "900",
                cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
              }}
            >
              ODD (₹{(tableBets["odd"] || 0).toLocaleString()})
            </button>

            <button
              type="button"
              onClick={() => placeBet("high")}
              disabled={isBettingLocked || isSpinning}
              style={{
                padding: "6px 2px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontSize: "9px",
                fontWeight: "900",
                cursor: isBettingLocked || isSpinning ? "not-allowed" : "pointer",
              }}
            >
              19 - 36
            </button>
          </div>

          <div style={{ marginTop: "6px", fontSize: "9px", color: "#cbd5e1" }}>
            MIN ₹10.00 | MAX ₹500,000.00
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. CONTROLS FOOTER                                            */}
        {/* ------------------------------------------------------------- */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
          <ChipSelector activeChip={selectedChip} onSelectChip={setSelectedChip} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
            <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
              Balance <strong style={{ color: "#4ade80" }}>₹{balance.toLocaleString("en-IN")}</strong> | Your Bet <strong style={{ color: "#facc15" }}>₹{totalUserBet}</strong>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={clearBets}
                disabled={totalUserBet === 0 || isBettingLocked || isSpinning}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid #ef4444",
                  color: "#ef4444",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: totalUserBet === 0 || isBettingLocked || isSpinning ? "not-allowed" : "pointer",
                }}
              >
                Clear
              </button>

              <button
                type="button"
                onClick={doubleBets}
                disabled={totalUserBet === 0 || isBettingLocked || isSpinning}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: "rgba(59, 130, 246, 0.2)",
                  border: "1px solid #3b82f6",
                  color: "#60a5fa",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: totalUserBet === 0 || isBettingLocked || isSpinning ? "not-allowed" : "pointer",
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
