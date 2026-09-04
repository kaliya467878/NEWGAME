"use client";

import React, { useState } from "react";
import { History, ChevronUp, ChevronDown } from "lucide-react";

interface GameHistoryDrawerProps {
  history: Array<{ id: string; outcome: string; badgeColor?: string; details?: string }>;
}

export function GameHistoryDrawer({ history }: GameHistoryDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "80px",
        left: "12px",
        right: "12px",
        zIndex: 30,
        background: "rgba(15, 23, 42, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "12px",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
        transition: "all 0.3s ease",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          color: "#94a3b8",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "700",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <History size={14} color="#38bdf8" />
          <span>Recent Rounds ({history.length})</span>
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {isOpen && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            maxHeight: "160px",
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {history.length === 0 ? (
            <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
              No previous rounds recorded yet.
            </div>
          ) : (
            history.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "800",
                  background: item.badgeColor || "rgba(56, 189, 248, 0.2)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                }}
              >
                {item.outcome} {item.details ? `(${item.details})` : ""}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
