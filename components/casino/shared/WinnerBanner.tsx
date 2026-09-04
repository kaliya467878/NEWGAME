"use client";

import React from "react";
import { Trophy } from "lucide-react";

interface WinnerBannerProps {
  show: boolean;
  title: string;
  payout: number;
  subtitle?: string;
}

export function WinnerBanner({ show, title, payout, subtitle }: WinnerBannerProps) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "30%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 50,
        width: "85%",
        maxWidth: "340px",
        padding: "16px 20px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, rgba(234, 179, 8, 0.95) 0%, rgba(202, 138, 4, 0.95) 100%)",
        border: "2px solid #fef08a",
        boxShadow: "0 10px 30px rgba(234, 179, 8, 0.5), 0 0 20px rgba(0,0,0,0.8)",
        color: "#000",
        textAlign: "center",
        animation: "bannerPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
      }}
    >
      <style>{`
        @keyframes bannerPop {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "4px" }}>
        <Trophy size={24} color="#78350f" />
        <div style={{ fontSize: "18px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px", color: "#451a03" }}>
          {title}
        </div>
      </div>

      {subtitle && (
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#78350f", marginBottom: "6px" }}>
          {subtitle}
        </div>
      )}

      {payout > 0 && (
        <div style={{ fontSize: "22px", fontWeight: "900", color: "#000", textShadow: "0 1px 2px rgba(255,255,255,0.4)" }}>
          +₹{payout.toLocaleString("en-IN")}
        </div>
      )}
    </div>
  );
}
