"use client";

import React from "react";
import { Card } from "@/lib/game-engine/types";

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
}

const SUIT_SYMBOLS: Record<string, { symbol: string; color: string }> = {
  S: { symbol: "♠", color: "#1e293b" },
  H: { symbol: "♥", color: "#ef4444" },
  D: { symbol: "♦", color: "#ef4444" },
  C: { symbol: "♣", color: "#1e293b" },
};

export function PlayingCard({ card, faceDown = false, size = "md" }: PlayingCardProps) {
  const width = size === "sm" ? "42px" : size === "lg" ? "86px" : "64px";
  const height = size === "sm" ? "60px" : size === "lg" ? "120px" : "90px";
  const fontSize = size === "sm" ? "14px" : size === "lg" ? "24px" : "18px";

  if (faceDown || !card) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: "8px",
          background: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
          border: "2px solid #60a5fa",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#60a5fa",
          fontSize: "20px",
          fontWeight: "bold",
          userSelect: "none",
        }}
      >
        ✦
      </div>
    );
  }

  const meta = SUIT_SYMBOLS[card.suit] || { symbol: "♠", color: "#000" };

  return (
    <div
      style={{
        width,
        height,
        borderRadius: "8px",
        background: "#ffffff",
        border: "1px solid #cbd5e1",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: size === "sm" ? "4px" : "6px",
        color: meta.color,
        fontFamily: "'Outfit', 'Segoe UI', sans-serif",
        userSelect: "none",
      }}
    >
      <div style={{ fontSize, fontWeight: "900", lineHeight: 1 }}>
        {card.rank}
        <span style={{ fontSize: "0.8em", marginLeft: "2px" }}>{meta.symbol}</span>
      </div>
      <div style={{ fontSize: `${parseInt(fontSize) * 1.5}px`, textAlign: "center", lineHeight: 1 }}>
        {meta.symbol}
      </div>
      <div style={{ fontSize, fontWeight: "900", lineHeight: 1, textAlign: "right", transform: "rotate(180deg)" }}>
        {card.rank}
      </div>
    </div>
  );
}
