"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import { GameBoard } from "@/components/fived/GameBoard";
import { GameHeader } from "@/components/games/GameHeader";

const DURATIONS = [
  { id: "1m", label: "5D Lot 1 Min", mode: "M1", apiLabel: "1 Min" },
  { id: "3m", label: "5D Lot 3 Min", mode: "M3", apiLabel: "3 Min" },
  { id: "5m", label: "5D Lot 5 Min", mode: "M5", apiLabel: "5 Min" },
  { id: "10m", label: "5D Lot 10 Min", mode: "M10", apiLabel: "10 Min" },
];

export default function FiveDGamePage() {
  const params = useParams();
  const router = useRouter();
  
  let duration = (params?.duration as string) || "1m";
  if (duration === "1min") duration = "1m";
  if (duration === "3min") duration = "3m";
  if (duration === "5min") duration = "5m";
  if (duration === "10min") duration = "10m";

  const currentMeta = DURATIONS.find((d) => d.id === duration) || DURATIONS[0];

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto bg-background text-[var(--theme-text)] relative">
      <GameHeader
        title="5D Lottery"
        durations={DURATIONS.map(d => ({ id: d.id, label: d.label }))}
        activeDuration={duration}
        durationHrefPrefix="/fived"
      />
      {/* GAME BOARD */}
      <GameBoard key={currentMeta.mode} mode={currentMeta.mode} modeLabel={currentMeta.apiLabel} />
    </div>
  );
}
