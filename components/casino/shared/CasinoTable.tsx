"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";

interface CasinoTableProps {
  title: string;
  category?: string;
  balance: number;
  children: React.ReactNode;
  soundOn?: boolean;
  onToggleSound?: () => void;
}

export function CasinoTable({
  title,
  category = "Live Casino",
  balance,
  children,
  soundOn = true,
  onToggleSound,
}: CasinoTableProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        maxWidth: "480px",
        margin: "0 auto",
        background: "radial-gradient(circle at 50% 20%, #0f1d38 0%, #070d19 100%)",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
        boxShadow: "0 0 40px rgba(0, 0, 0, 0.8)",
      }}
    >
      {/* Stage Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "rgba(10, 18, 36, 0.9)",
          borderBottom: "1px solid rgba(56, 189, 248, 0.15)",
          backdropFilter: "blur(8px)",
          zIndex: 20,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={20} />
        </Link>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "15px", fontWeight: "800", letterSpacing: "0.5px", color: "#fbbf24" }}>
            {title}
          </div>
          <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>
            {category}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}

          <div
            style={{
              padding: "6px 12px",
              borderRadius: "20px",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              fontSize: "13px",
              fontWeight: "700",
              color: "#38bdf8",
            }}
          >
            ₹{balance.toLocaleString("en-IN")}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        {children}
      </main>
    </div>
  );
}
