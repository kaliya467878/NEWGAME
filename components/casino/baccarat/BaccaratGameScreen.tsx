"use client";

import React, { useState } from "react";
import { CasinoTable } from "../shared/CasinoTable";
import { ChipSelector } from "../shared/ChipSelector";
import { PlayingCard } from "../shared/PlayingCard";
import { WinnerBanner } from "../shared/WinnerBanner";
import { GameHistoryDrawer } from "../shared/GameHistoryDrawer";
import { Card } from "@/lib/game-engine/types";

export function BaccaratGameScreen() {
  const [balance, setBalance] = useState(10000);
  const [selectedChip, setSelectedChip] = useState(50);
  const [bets, setBets] = useState<{ player: number; banker: number; tie: number }>({
    player: 0,
    banker: 0,
    tie: 0,
  });
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [playerScore, setPlayerScore] = useState<number | null>(null);
  const [bankerScore, setBankerScore] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [payout, setPayout] = useState(0);
  const [history, setHistory] = useState<Array<{ id: string; outcome: string; badgeColor: string }>>([]);

  const placeBet = (type: "player" | "banker" | "tie") => {
    if (isPlaying) return;
    if (balance < selectedChip) return;
    setBalance((prev) => prev - selectedChip);
    setBets((prev) => ({ ...prev, [type]: prev[type] + selectedChip }));
  };

  const clearBets = () => {
    if (isPlaying) return;
    const totalBet = bets.player + bets.banker + bets.tie;
    setBalance((prev) => prev + totalBet);
    setBets({ player: 0, banker: 0, tie: 0 });
  };

  const dealRound = async (scenario?: string) => {
    const totalBet = bets.player + bets.banker + bets.tie;
    if (totalBet <= 0) return;

    setIsPlaying(true);
    setWinner(null);
    setPayout(0);
    setPlayerCards([]);
    setBankerCards([]);
    setPlayerScore(null);
    setBankerScore(null);

    try {
      const activeBets = [];
      if (bets.player > 0) activeBets.push({ betType: "player", amount: bets.player });
      if (bets.banker > 0) activeBets.push({ betType: "banker", amount: bets.banker });
      if (bets.tie > 0) activeBets.push({ betType: "tie", amount: bets.tie });

      const res = await fetch("/api/casino/baccarat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "settle",
          bets: activeBets,
          scenario,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Failed to deal round");
        setIsPlaying(false);
        return;
      }

      const { result, settlements, balance: newBal } = data.data;

      setPlayerCards(result.playerCards);
      setBankerCards(result.bankerCards);
      setPlayerScore(result.playerScore);
      setBankerScore(result.bankerScore);

      const totalWin = settlements.reduce((acc: number, s: any) => acc + s.payout, 0);
      setPayout(totalWin);
      setBalance(newBal);
      setWinner(result.outcome.toUpperCase());

      const color =
        result.outcome === "player"
          ? "rgba(59, 130, 246, 0.8)"
          : result.outcome === "banker"
          ? "rgba(239, 68, 68, 0.8)"
          : "rgba(34, 197, 94, 0.8)";

      setHistory((prev) => [
        { id: `bacc_${Date.now()}`, outcome: `${result.outcome.toUpperCase()} (${result.playerScore}-${result.bankerScore})`, badgeColor: color },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPlaying(false);
    }
  };

  const totalBet = bets.player + bets.banker + bets.tie;

  return (
    <CasinoTable title="BACCARAT" balance={balance}>
      <WinnerBanner show={!!winner} title={`${winner} WINS`} payout={payout} />

      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {/* Table Area */}
        <div
          style={{
            background: "radial-gradient(ellipse at center, #1e3a8a 0%, #0f172a 100%)",
            borderRadius: "24px",
            border: "3px solid #3b82f6",
            padding: "20px 16px",
            boxShadow: "inset 0 0 30px rgba(0,0,0,0.8), 0 10px 25px rgba(0,0,0,0.5)",
            position: "relative",
          }}
        >
          {/* Hands Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            {/* Player Side */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#60a5fa", letterSpacing: "1px" }}>
                PLAYER {playerScore !== null && `(${playerScore})`}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "8px", minHeight: "85px" }}>
                {playerCards.map((card, i) => (
                  <PlayingCard key={i} card={card} faceDown={false} />
                ))}
              </div>
            </div>

            {/* Banker Side */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#f87171", letterSpacing: "1px" }}>
                BANKER {bankerScore !== null && `(${bankerScore})`}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "8px", minHeight: "85px" }}>
                {bankerCards.map((card, i) => (
                  <PlayingCard key={i} card={card} faceDown={false} />
                ))}
              </div>
            </div>
          </div>

          {/* Betting Felt Zones */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              onClick={() => placeBet("player")}
              style={{
                background: "rgba(59, 130, 246, 0.15)",
                border: "2px solid #3b82f6",
                borderRadius: "14px",
                padding: "16px 8px",
                color: "#fff",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#60a5fa" }}>PLAYER</div>
              <div style={{ fontSize: "10px", color: "#93c5fd" }}>1 : 1</div>
              {bets.player > 0 && (
                <div style={{ marginTop: "6px", fontSize: "12px", fontWeight: "900", color: "#fef08a" }}>
                  ₹{bets.player}
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => placeBet("tie")}
              style={{
                background: "rgba(34, 197, 94, 0.15)",
                border: "2px solid #22c55e",
                borderRadius: "14px",
                padding: "16px 8px",
                color: "#fff",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#4ade80" }}>TIE</div>
              <div style={{ fontSize: "10px", color: "#86efac" }}>8 : 1</div>
              {bets.tie > 0 && (
                <div style={{ marginTop: "6px", fontSize: "12px", fontWeight: "900", color: "#fef08a" }}>
                  ₹{bets.tie}
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => placeBet("banker")}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "2px solid #ef4444",
                borderRadius: "14px",
                padding: "16px 8px",
                color: "#fff",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: "800", color: "#f87171" }}>BANKER</div>
              <div style={{ fontSize: "10px", color: "#fca5a5" }}>0.95 : 1</div>
              {bets.banker > 0 && (
                <div style={{ marginTop: "6px", fontSize: "12px", fontWeight: "900", color: "#fef08a" }}>
                  ₹{bets.banker}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* History Drawer */}
        <GameHistoryDrawer history={history} />

        {/* Controls Footer */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          <ChipSelector activeChip={selectedChip} onSelectChip={setSelectedChip} />

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              onClick={clearBets}
              disabled={totalBet === 0 || isPlaying}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "12px",
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#ef4444",
                fontSize: "14px",
                fontWeight: "800",
                cursor: totalBet === 0 || isPlaying ? "not-allowed" : "pointer",
              }}
            >
              CLEAR
            </button>

            <button
              type="button"
              onClick={() => dealRound()}
              disabled={totalBet === 0 || isPlaying}
              style={{
                flex: 2,
                padding: "14px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
                border: "none",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "900",
                letterSpacing: "1px",
                cursor: totalBet === 0 || isPlaying ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)",
              }}
            >
              {isPlaying ? "DEALING..." : `DEAL (₹${totalBet})`}
            </button>
          </div>
        </div>
      </div>
    </CasinoTable>
  );
}
