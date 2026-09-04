"use client";

import React, { useState } from "react";
import { CasinoTable } from "../shared/CasinoTable";
import { ChipSelector } from "../shared/ChipSelector";
import { WinnerBanner } from "../shared/WinnerBanner";
import { GameHistoryDrawer } from "../shared/GameHistoryDrawer";

export function SicBoGameScreen() {
  const [balance, setBalance] = useState(10000);
  const [selectedChip, setSelectedChip] = useState(50);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [dice, setDice] = useState<[number, number, number] | null>(null);
  const [sum, setSum] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [payout, setPayout] = useState(0);
  const [history, setHistory] = useState<Array<{ id: string; outcome: string; badgeColor: string }>>([]);

  const placeBet = (betType: string) => {
    if (isPlaying) return;
    if (balance < selectedChip) return;
    setBalance((prev) => prev - selectedChip);
    setBets((prev) => ({ ...prev, [betType]: (prev[betType] || 0) + selectedChip }));
  };

  const clearBets = () => {
    if (isPlaying) return;
    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
    setBalance((prev) => prev + totalBet);
    setBets({});
  };

  const rollDice = async (scenario?: string) => {
    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);
    if (totalBet <= 0) return;

    setIsPlaying(true);
    setWinner(null);
    setPayout(0);

    try {
      const activeBets = Object.entries(bets).map(([key, amount]) => ({
        betType: key,
        selection: key,
        amount,
      }));

      const res = await fetch("/api/casino/sicbo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settle", bets: activeBets, scenario }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Failed to roll dice");
        setIsPlaying(false);
        return;
      }

      const { result, settlements, balance: newBal } = data.data;

      setDice(result.dice);
      setSum(result.sum);

      const totalWin = settlements.reduce((acc: number, s: any) => acc + s.payout, 0);
      setPayout(totalWin);
      setBalance(newBal);

      const label = result.isTriple
        ? `TRIPLE ${result.dice[0]}s`
        : result.isSmall
        ? `SMALL (${result.sum})`
        : `BIG (${result.sum})`;
      setWinner(label);

      setHistory((prev) => [
        {
          id: `sb_${Date.now()}`,
          outcome: `${result.dice.join("-")} (${label})`,
          badgeColor: result.isSmall ? "rgba(59, 130, 246, 0.8)" : "rgba(239, 68, 68, 0.8)",
        },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPlaying(false);
    }
  };

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  return (
    <CasinoTable title="SIC BO" balance={balance}>
      <WinnerBanner show={!!winner} title={winner || ""} payout={payout} />

      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {/* Shaker & Dice Display */}
        <div
          style={{
            background: "radial-gradient(ellipse at center, #831843 0%, #0f172a 100%)",
            borderRadius: "24px",
            border: "3px solid #ec4899",
            padding: "20px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontSize: "12px", color: "#f472b6", fontWeight: "700", marginBottom: "12px" }}>
            VIRTUAL DICE SHAKER
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "16px", minHeight: "60px", alignItems: "center" }}>
            {dice ? (
              dice.map((val, idx) => (
                <div
                  key={idx}
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)",
                    border: "2px solid #cbd5e1",
                    color: "#000",
                    fontSize: "24px",
                    fontWeight: "900",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                  }}
                >
                  {val}
                </div>
              ))
            ) : (
              <div style={{ fontSize: "14px", color: "#94a3b8", fontStyle: "italic" }}>
                Place bets and tap ROLL DICE
              </div>
            )}
          </div>

          {sum !== null && (
            <div style={{ marginTop: "12px", fontSize: "16px", fontWeight: "800", color: "#fef08a" }}>
              SUM = {sum}
            </div>
          )}
        </div>

        {/* Betting Board Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "16px 0" }}>
          <button
            type="button"
            onClick={() => placeBet("small")}
            style={{
              background: "rgba(59, 130, 246, 0.2)",
              border: "2px solid #3b82f6",
              borderRadius: "14px",
              padding: "16px 8px",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "900", color: "#60a5fa" }}>SMALL (4-10)</div>
            <div style={{ fontSize: "10px", color: "#93c5fd" }}>1 : 1 (Triples Lose)</div>
            {bets["small"] && <div style={{ color: "#fef08a", fontWeight: "800", marginTop: "4px" }}>₹{bets["small"]}</div>}
          </button>

          <button
            type="button"
            onClick={() => placeBet("big")}
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "2px solid #ef4444",
              borderRadius: "14px",
              padding: "16px 8px",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "900", color: "#f87171" }}>BIG (11-17)</div>
            <div style={{ fontSize: "10px", color: "#fca5a5" }}>1 : 1 (Triples Lose)</div>
            {bets["big"] && <div style={{ color: "#fef08a", fontWeight: "800", marginTop: "4px" }}>₹{bets["big"]}</div>}
          </button>

          <button
            type="button"
            onClick={() => placeBet("any_triple")}
            style={{
              gridColumn: "span 2",
              background: "rgba(234, 179, 8, 0.2)",
              border: "2px solid #eab308",
              borderRadius: "14px",
              padding: "14px 8px",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "900", color: "#facc15" }}>ANY TRIPLE</div>
            <div style={{ fontSize: "10px", color: "#fef08a" }}>30 : 1</div>
            {bets["any_triple"] && <div style={{ color: "#fff", fontWeight: "800", marginTop: "4px" }}>₹{bets["any_triple"]}</div>}
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
              onClick={() => rollDice()}
              disabled={totalBet === 0 || isPlaying}
              style={{
                flex: 2,
                padding: "14px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
                border: "none",
                color: "#fff",
                fontSize: "15px",
                fontWeight: "900",
                letterSpacing: "1px",
                cursor: totalBet === 0 || isPlaying ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(236, 72, 153, 0.4)",
              }}
            >
              {isPlaying ? "ROLLING..." : `ROLL (₹${totalBet})`}
            </button>
          </div>
        </div>
      </div>
    </CasinoTable>
  );
}
