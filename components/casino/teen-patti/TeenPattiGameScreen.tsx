"use client";

import React, { useState } from "react";
import { CasinoTable } from "../shared/CasinoTable";
import { PlayingCard } from "../shared/PlayingCard";
import { ChipSelector } from "../shared/ChipSelector";
import { Card } from "@/lib/game-engine/types";

export function TeenPattiGameScreen() {
  const [balance, setBalance] = useState(1000);
  const [chip, setChip] = useState(100);
  const [stakes, setStakes] = useState({ ante: 0, pair_plus: 0 });
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [handType, setHandType] = useState<string | null>(null);
  const [isDealing, setIsDealing] = useState(false);

  const placeBet = (side: "ante" | "pair_plus") => {
    if (isDealing) return;
    setStakes((prev) => ({ ...prev, [side]: prev[side] + chip }));
  };

  const clearBets = () => {
    if (isDealing) return;
    setStakes({ ante: 0, pair_plus: 0 });
  };

  const totalStakes = stakes.ante + stakes.pair_plus;

  const dealRound = async () => {
    if (totalStakes <= 0) return;
    setIsDealing(true);

    const betsPayload = [
      ...(stakes.ante > 0 ? [{ betType: "ante", amount: stakes.ante }] : []),
      ...(stakes.pair_plus > 0 ? [{ betType: "pair_plus", amount: stakes.pair_plus }] : []),
    ];

    try {
      const res = await fetch("/api/casino/teen-patti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settle", bets: betsPayload }),
      });
      const json = await res.json();
      if (json.success) {
        const data = json.data.result;
        setPlayerCards(data.playerCards);
        setDealerCards(data.dealerCards);
        setWinner(data.winner);
        setHandType(data.playerEval.type);
        setIsDealing(false);
        if (json.data.balance != null) setBalance(json.data.balance);
      }
    } catch {
      setIsDealing(false);
    }
  };

  return (
    <CasinoTable title="Teen Patti Live" category="Indian Casino Classics" balance={balance}>
      {/* Studio Stage */}
      <div
        style={{
          flex: 1,
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: "radial-gradient(ellipse at 50% 30%, #581c87 0%, #2e1065 100%)",
          borderBottom: "4px solid #a855f7",
        }}
      >
        {/* Dealer 3 Cards */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", color: "#d8b4fe", fontWeight: "800", marginBottom: "6px" }}>
            DEALER
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {dealerCards.length === 0 ? (
              <>
                <PlayingCard faceDown size="sm" />
                <PlayingCard faceDown size="sm" />
                <PlayingCard faceDown size="sm" />
              </>
            ) : (
              dealerCards.map((c, i) => <PlayingCard key={i} card={c} size="sm" />)
            )}
          </div>
        </div>

        {winner && (
          <div style={{ textAlign: "center", margin: "10px 0" }}>
            <div
              style={{
                padding: "6px 20px",
                borderRadius: "16px",
                background: "#fbbf24",
                color: "#000",
                fontWeight: "900",
                fontSize: "16px",
              }}
            >
              {winner === "player" ? "YOU WIN!" : winner === "push" ? "PUSH!" : "DEALER WINS"}
            </div>
            {handType && (
              <div style={{ fontSize: "12px", color: "#e9d5ff", marginTop: "4px", fontWeight: "700" }}>
                {handType.replace("_", " ")}
              </div>
            )}
          </div>
        )}

        {/* Player 3 Cards */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
            {playerCards.length === 0 ? (
              <>
                <PlayingCard faceDown size="sm" />
                <PlayingCard faceDown size="sm" />
                <PlayingCard faceDown size="sm" />
              </>
            ) : (
              playerCards.map((c, i) => <PlayingCard key={i} card={c} size="sm" />)
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#d8b4fe", fontWeight: "800" }}>
            PLAYER
          </div>
        </div>
      </div>

      {/* Betting Zones */}
      <div style={{ padding: "16px 12px", background: "#0f0728" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <button
            type="button"
            onClick={() => placeBet("ante")}
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(168, 85, 247, 0.2)",
              border: "2px solid #a855f7",
              color: "#c084fc",
              fontWeight: "900",
              cursor: "pointer",
            }}
          >
            ANTE (1:1)
            {stakes.ante > 0 && <div style={{ color: "#fbbf24", marginTop: "4px" }}>₹{stakes.ante}</div>}
          </button>

          <button
            type="button"
            onClick={() => placeBet("pair_plus")}
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(236, 72, 153, 0.2)",
              border: "2px solid #ec4899",
              color: "#f472b6",
              fontWeight: "900",
              cursor: "pointer",
            }}
          >
            PAIR PLUS (Bonus)
            {stakes.pair_plus > 0 && <div style={{ color: "#fbbf24", marginTop: "4px" }}>₹{stakes.pair_plus}</div>}
          </button>
        </div>

        <ChipSelector activeChip={chip} onSelectChip={setChip} />

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button
            type="button"
            onClick={clearBets}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid #ef4444",
              color: "#ef4444",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={dealRound}
            disabled={isDealing || totalStakes === 0}
            style={{
              flex: 2,
              padding: "14px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #a855f7 0%, #581c87 100%)",
              border: "none",
              color: "#fff",
              fontWeight: "900",
              fontSize: "16px",
              cursor: "pointer",
              opacity: isDealing || totalStakes === 0 ? 0.5 : 1,
            }}
          >
            DEAL (₹{totalStakes})
          </button>
        </div>
      </div>
    </CasinoTable>
  );
}
