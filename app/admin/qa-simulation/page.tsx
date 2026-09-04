"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Play, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function QASimulationPage() {
  const [scenarios, setScenarios] = useState<Record<string, any[]>>({});
  const [selectedGame, setSelectedGame] = useState("blackjack");
  const [selectedScenario, setSelectedScenario] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/qa/simulation")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.scenarios) {
          setScenarios(data.data.scenarios);
          if (data.data.scenarios.blackjack?.[0]) {
            setSelectedScenario(data.data.scenarios.blackjack[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleGameChange = (game: string) => {
    setSelectedGame(game);
    const list = scenarios[game] || [];
    if (list.length > 0) {
      setSelectedScenario(list[0].id);
    } else {
      setSelectedScenario("");
    }
  };

  const runSimulation = async () => {
    if (!selectedScenario) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/qa/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: selectedGame,
          scenarioId: selectedScenario,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const gameList = Object.keys(scenarios);

  return (
    <div
      style={{
        minHeight: "100dvh",
        maxWidth: "600px",
        margin: "0 auto",
        background: "#090d16",
        color: "#f8fafc",
        padding: "20px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "900", color: "#fbbf24", margin: 0 }}>
            QA Simulation Control Center
          </h1>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            Deterministic game engine scenario trigger & rule auditor
          </div>
        </div>
      </header>

      {/* Info Warning */}
      <div
        style={{
          background: "rgba(234, 179, 8, 0.1)",
          border: "1px solid rgba(234, 179, 8, 0.3)",
          borderRadius: "12px",
          padding: "14px",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          marginBottom: "24px",
        }}
      >
        <ShieldAlert size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div style={{ fontSize: "12px", color: "#fef08a", lineHeight: "1.5" }}>
          QA mode emits outcome payloads with <strong>{"{ simulation: true, environment: 'QA' }"}</strong>.
          Use this panel to verify card rank rules, win multipliers, and settlement math without impacting live production pools.
        </div>
      </div>

      {/* Selector controls */}
      <div
        style={{
          background: "#131b2e",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div>
          <label style={{ fontSize: "12px", fontWeight: "800", color: "#94a3b8", display: "block", marginBottom: "8px" }}>
            SELECT GAME ENGINE
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {gameList.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleGameChange(g)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  background: selectedGame === g ? "#fbbf24" : "rgba(255, 255, 255, 0.05)",
                  color: selectedGame === g ? "#000" : "#94a3b8",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  cursor: "pointer",
                }}
              >
                {g.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: "800", color: "#94a3b8", display: "block", marginBottom: "8px" }}>
            SELECT QA SCENARIO
          </label>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              background: "#090d16",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {(scenarios[selectedGame] || []).map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name} - {sc.description}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={runSimulation}
          disabled={loading || !selectedScenario}
          style={{
            padding: "14px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
            border: "none",
            color: "#000",
            fontSize: "15px",
            fontWeight: "900",
            cursor: loading ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "8px",
          }}
        >
          <Play size={18} />
          {loading ? "EXECUTING..." : "EXECUTE QA SIMULATION"}
        </button>
      </div>

      {/* Output Console */}
      {result && (
        <div
          style={{
            background: "#050811",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.8)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <CheckCircle2 size={18} color="#38bdf8" />
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#38bdf8" }}>
              SIMULATION PAYLOAD RESULT
            </div>
          </div>

          <pre
            style={{
              background: "#0a0f1d",
              padding: "14px",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#a7f3d0",
              overflowX: "auto",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
