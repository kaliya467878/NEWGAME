"use client";

import React, { useState } from "react";
import { CasinoTable } from "../shared/CasinoTable";
import { ChipSelector } from "../shared/ChipSelector";
import { PlayingCard } from "../shared/PlayingCard";
import { WinnerBanner } from "../shared/WinnerBanner";
import { GameHistoryDrawer } from "../shared/GameHistoryDrawer";
import { Card } from "@/lib/game-engine/types";

export function AndarBaharGameScreen() {
  const [balance, setBalance] = useState(10000);
  const [selectedChip, setSelectedChip] = useState(50);
  const [bets, setBets] = useState<{ andar: number; bahar: number }>({ andar: 0, bahar: 0 });

  const [jokerCard, setJokerCard] = useState<Card | null>(null);
  const [andarCards, setAndarCards] = useState<Card[]>([]);
  const [baharCards, setBaharCards] = useState<Card[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [payout, setPayout] = useState(0);
  const [history, setHistory] = useState<Array<{ id: string; outcome: string; badgeColor: string }>>([]);

  const placeBet = (type: "andar" | "bahar") => {
    if (isPlaying) return;
    if (balance < selectedChip) return;
    setBalance((prev) => prev - selectedChip);
    setBets((prev) => ({ ...prev, [type]: prev[type] + selectedChip }));
  };

  const clearBets = () => {
    if (isPlaying) return;
    const totalBet = bets.andar + bets.bahar;
    setBalance((prev) => prev + totalBet);
    setBets({ andar: 0, bahar: 0 });
  };

  const dealRound = async (scenario?: string) => {
    const totalBet = bets.andar + bets.bahar;
    if (totalBet <= 0) return;

    setIsPlaying(true);
    setWinner(null);
    setPayout(0);
    setJokerCard(null);
    setAndarCards([]);
    setBaharCards([]);

    try {
      const activeBets = [];
      if (bets.andar > 0) activeBets.push({ betType: "andar", amount: bets.andar });
      if (bets.bahar > 0) activeBets.push({ betType: "bahar", amount: bets.bahar });

      const res = await fetch("/api/casino/andar-bahar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settle", bets: activeBets, scenario }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Failed to deal round");
        setIsPlaying(false);
        return;
      }

      const { result, settlements, balance: newBal } = data.data;

      setJokerCard(result.jokerCard);
      setAndarCards(result.andarCards);
      setBaharCards(result.baharCards);

      const totalWin = settlements.reduce((acc: number, s: any) => acc + s.payout, 0);
      setPayout(totalWin);
      setBalance(newBal);

      const label = result.winningSide.toUpperCase();
      setWinner(`${label} WINS (${result.matchingCardCount} CARDS)`);

      const badgeColor =
        result.winningSide === "andar" ? "rgba(59, 130, 246, 0.8)" : "rgba(239, 68, 68, 0.8)";

      setHistory((prev) => [
        { id: `ab_${Date.now()}`, outcome: `${label} (${result.matchingCardCount} cards)`, badgeColor },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPlaying(false);
    }
  };

  const totalBet = bets.andar + bets.bahar;

  return (
    <CasinoTable title="ANDAR BAHAR" balance={balance}>
      <WinnerBanner show={!!winner} title={winner || ""} payout={payout} />

      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {/* Table Felt Stage */}
        <div
          style={{
            background: "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%)",
            borderRadius: "24px",
            border: "3px solid #64748b",
            padding: "20px 16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          }}
        >
          {/* Joker Spot */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#fbbf24", letterSpacing: "1px", marginBottom: "6px" }}>
              JOKER (TARGET CUT CARD)
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {jokerCard ? (
                <PlayingCard card={jokerCard} faceDown={false} />
              ) : (
                <div
                  style={{
                    width: "56px",
                    height: "80px",
                    borderRadius: "8px",
                    border: "2px dashed #475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  CUT
                </div>
              )}
            </div>
          </div>

          {/* Andar & Bahar Deal Rows */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Andar Row */}
            <div
              style={{
                background: "rgba(59, 130, 246, 0.1)",
                border: "2px solid #3b82f6",
                borderRadius: "14px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: "900", color: "#60a5fa", marginBottom: "8px" }}>
                ANDAR (1.9x)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px", minHeight: "80px" }}>
                {andarCards.map((c, i) => (
                  <PlayingCard key={i} card={c} faceDown={false} />
                ))}
              </div>
            </div>

            {/* Bahar Row */}
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "2px solid #ef4444",
                borderRadius: "14px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: "900", color: "#f87171", marginBottom: "8px" }}>
                BAHAR (2.0x)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px", minHeight: "80px" }}>
                {baharCards.map((c, i) => (
                  <PlayingCard key={i} card={c} faceDown={false} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bet Selection Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "16px 0" }}>
          <button
            type="button"
            onClick={() => placeBet("andar")}
            style={{
              background: "rgba(59, 130, 246, 0.2)",
              border: "2px solid #3b82f6",
              borderRadius: "14px",
              padding: "16px",
              color: "#fff",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "900", color: "#60a5fa" }}>BET ANDAR</div>
            <div style={{ fontSize: "11px", color: "#93c5fd" }}>First Deal (1.9 : 1)</div>
            {bets.andar > 0 && (
              <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: "900", color: "#fef08a" }}>
                ₹{bets.andar}
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => placeBet("bahar")}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "2px solid #ef4444",
              borderRadius: "14px",
              padding: "16px",
              color: "#fff",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "900", color: "#f87171" }}>BET BAHAR</div>
            <div style={{ fontSize: "11px", color: "#fca5a5" }}>Second Deal (2.0 : 1)</div>
            {bets.bahar > 0 && (
              <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: "900", color: "#fef08a" }}>
                ₹{bets.bahar}
              </div>
            )}
          </button>
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
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                border: "none",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "900",
                letterSpacing: "1px",
                cursor: totalBet === 0 || isPlaying ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)",
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
