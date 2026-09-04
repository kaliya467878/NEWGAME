"use client";

import React, { useState } from "react";
import { CasinoTable } from "../shared/CasinoTable";
import { PlayingCard } from "../shared/PlayingCard";
import { ChipSelector } from "../shared/ChipSelector";
import { Card } from "@/lib/game-engine/types";
import { evaluateBlackjackHand } from "@/lib/game-engine/blackjack/engine";
import { getBalance } from "@/lib/walletApi";
import { getToken } from "@/lib/auth";

export function BlackjackGameScreen() {
  const [balance, setBalance] = useState(1000);
  const [chip, setChip] = useState(100);
  const [bet, setBet] = useState(0);
  const [gameState, setGameState] = useState<"BETTING" | "PLAYING" | "ENDED">("BETTING");

  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [toast, setToast] = useState("Place your bet and tap Deal");
  const [resultText, setResultText] = useState("");

  const refreshWallet = async () => {
    try {
      if (!getToken()) return;
      const res = await getBalance();
      const bal = res?.data?.available ?? res?.data?.balance ?? 1000;
      setBalance(Number(bal));
    } catch {}
  };

  React.useEffect(() => {
    refreshWallet();
  }, []);

  const placeChip = () => {
    if (gameState !== "BETTING") return;
    setBet((prev) => prev + chip);
  };

  const clearBet = () => {
    if (gameState !== "BETTING") return;
    setBet(0);
  };

  const dealRound = async () => {
    if (bet <= 0) {
      setToast("Please place a bet first!");
      return;
    }
    setGameState("PLAYING");
    setToast("Your turn: Hit or Stand");

    // Call unified casino API
    try {
      const res = await fetch("/api/casino/blackjack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settle", amount: bet }),
      });
      const json = await res.json();
      if (json.success) {
        const data = json.data.result;
        setPlayerCards(data.playerHand.cards);
        setDealerCards(data.dealerHand.cards);
        setGameState("ENDED");
        setResultText(data.outcome.replace("_", " "));
        if (json.data.balance != null) setBalance(json.data.balance);
      }
    } catch {
      setToast("Failed to deal round");
    }
  };

  const pHand = evaluateBlackjackHand(playerCards);
  const dHand = evaluateBlackjackHand(dealerCards);

  return (
    <CasinoTable title="Blackjack Live" category="Evolution Live Studio" balance={balance}>
      {/* Dealer Felt Section */}
      <div
        style={{
          flex: 1,
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          background: "radial-gradient(ellipse at 50% 30%, #064e3b 0%, #022c22 100%)",
          borderBottom: "4px solid #b45309",
        }}
      >
        {/* Dealer Hand */}
        <div style={{ textAlign: "center", width: "100%" }}>
          <div style={{ fontSize: "12px", color: "#6ee7b7", fontWeight: "700", marginBottom: "8px" }}>
            DEALER {dHand.cards.length > 0 && `(${dHand.value})`}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
            {dealerCards.length === 0 ? (
              <>
                <PlayingCard faceDown size="md" />
                <PlayingCard faceDown size="md" />
              </>
            ) : (
              dealerCards.map((c, i) => <PlayingCard key={i} card={c} size="md" />)
            )}
          </div>
        </div>

        {/* Status / Result Overlay */}
        {resultText && (
          <div
            style={{
              margin: "12px 0",
              padding: "10px 24px",
              borderRadius: "24px",
              background: "rgba(251, 191, 36, 0.2)",
              border: "2px solid #fbbf24",
              color: "#fbbf24",
              fontWeight: "900",
              fontSize: "18px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {resultText}
          </div>
        )}

        {/* Player Hand */}
        <div style={{ textAlign: "center", width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
            {playerCards.length === 0 ? (
              <>
                <PlayingCard faceDown size="md" />
                <PlayingCard faceDown size="md" />
              </>
            ) : (
              playerCards.map((c, i) => <PlayingCard key={i} card={c} size="md" />)
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#6ee7b7", fontWeight: "700" }}>
            PLAYER {pHand.cards.length > 0 && `(${pHand.value})`}
          </div>
        </div>
      </div>

      {/* Control Panel & Betting Felt */}
      <div style={{ padding: "16px 12px", background: "#0f172a" }}>
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Current Bet: </span>
          <strong style={{ fontSize: "16px", color: "#fbbf24" }}>₹{bet}</strong>
        </div>

        <ChipSelector activeChip={chip} onSelectChip={setChip} />

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          {gameState === "BETTING" ? (
            <>
              <button
                type="button"
                onClick={clearBet}
                style={{
                  flex: 1,
                  padding: "12px",
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
                onClick={placeChip}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "rgba(56, 189, 248, 0.2)",
                  border: "1px solid #38bdf8",
                  color: "#38bdf8",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                + Chip
              </button>
              <button
                type="button"
                onClick={dealRound}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #fbbf24 0%, #b45309 100%)",
                  border: "none",
                  color: "#000",
                  fontWeight: "900",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                DEAL
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setGameState("BETTING");
                setResultText("");
                setPlayerCards([]);
                setDealerCards([]);
              }}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #38bdf8 0%, #1d4ed8 100%)",
                border: "none",
                color: "#fff",
                fontWeight: "900",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              NEW ROUND
            </button>
          )}
        </div>
        <p style={{ textAlign: "center", fontSize: "11px", color: "#64748b", marginTop: "10px" }}>{toast}</p>
      </div>
    </CasinoTable>
  );
}
