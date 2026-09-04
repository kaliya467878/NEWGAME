"use client";

import React from "react";

interface ChipSelectorProps {
  chips?: number[];
  activeChip: number;
  onSelectChip: (val: number) => void;
}

const CHIP_COLORS: Record<number, { bg: string; border: string; text: string }> = {
  10: { bg: "#1e293b", border: "#64748b", text: "#f8fafc" },
  50: { bg: "#1d4ed8", border: "#60a5fa", text: "#ffffff" },
  100: { bg: "#b91c1c", border: "#f87171", text: "#ffffff" },
  500: { bg: "#15803d", border: "#4ade80", text: "#ffffff" },
  1000: { bg: "#7e22ce", border: "#c084fc", text: "#ffffff" },
  5000: { bg: "#b45309", border: "#fbbf24", text: "#ffffff" },
};

export function ChipSelector({
  chips = [10, 50, 100, 500, 1000, 5000],
  activeChip,
  onSelectChip,
}: ChipSelectorProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "10px 12px",
        background: "rgba(15, 23, 42, 0.95)",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        margin: "0 12px 12px",
      }}
    >
      {chips.map((val) => {
        const theme = CHIP_COLORS[val] || { bg: "#334155", border: "#94a3b8", text: "#fff" };
        const isActive = activeChip === val;

        return (
          <button
            key={val}
            type="button"
            onClick={() => onSelectChip(val)}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: theme.bg,
              border: `3px dashed ${theme.border}`,
              boxShadow: isActive
                ? `0 0 12px ${theme.border}, inset 0 0 8px rgba(255, 255, 255, 0.4)`
                : "0 2px 6px rgba(0, 0, 0, 0.4)",
              color: theme.text,
              fontWeight: "900",
              fontSize: val >= 1000 ? "10px" : "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transform: isActive ? "scale(1.15)" : "scale(1)",
              transition: "all 0.15s ease-in-out",
            }}
          >
            {val >= 1000 ? `${val / 1000}k` : val}
          </button>
        );
      })}
    </div>
  );
}
