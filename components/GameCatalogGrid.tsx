"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { GAME_CATEGORIES, filterGames, type GameCategoryKey } from "@/lib/gameCatalog";
import { ArtImg } from "@/components/ArtImg";
import {
  CrashArt,
  DiceArt,
  FiveDArt,
  GamepadArt,
  K3Art,
  LotteryArt,
  MinesArt,
  StarArt,
  WheelArt,
  WingoArt,
} from "@/components/icons/art";

const CATEGORY_ART: Record<GameCategoryKey, React.ComponentType<{ size?: number }>> = {
  popular: StarArt,
  wingo: WingoArt,
  k3: K3Art,
  fived: FiveDArt,
  originals: GamepadArt,
  slots: MinesArt,
  live: DiceArt,
  sports: LotteryArt,
};

const GAME_ART: Record<string, React.ComponentType<{ size?: number }>> = {
  wingo_30s: WingoArt,
  wingo_1m: WingoArt,
  wingo_3m: WingoArt,
  wingo_5m: WingoArt,
  k3_1m: K3Art,
  k3_3m: K3Art,
  k3_5m: K3Art,
  k3_10m: K3Art,
  fived_1m: FiveDArt,
  fived_3m: FiveDArt,
  fived_5m: FiveDArt,
  fived_10m: FiveDArt,
  crash: CrashArt,
  mines: MinesArt,
  dice: DiceArt,
  wheel: WheelArt,
  limbo: GamepadArt,
};

/** Per-game card glow tint, echoing the reference's colorful tiles. */
const GAME_TINT: Record<string, string> = {
  wingo_30s: "from-[#3d0f1e]",
  wingo_1m: "from-[#3d0f1e]",
  wingo_3m: "from-[#3d0f1e]",
  wingo_5m: "from-[#3d0f1e]",
  k3_1m: "from-[#301040]",
  k3_3m: "from-[#301040]",
  k3_5m: "from-[#301040]",
  k3_10m: "from-[#301040]",
  fived_1m: "from-[#0f2440]",
  fived_3m: "from-[#0f2440]",
  fived_5m: "from-[#0f2440]",
  fived_10m: "from-[#0f2440]",
  crash: "from-[#40140f]",
  mines: "from-[#0f3038]",
  dice: "from-[#3d0f1e]",
  wheel: "from-[#3a2a08]",
  limbo: "from-[#103028]",
};

import ComingSoonModal from "@/components/home/ComingSoonModal";

const GAME_BANNER_MAP: Record<string, string> = {
  wingo_30s: "/design/game-tiles/wingo.png",
  wingo_1m: "/design/game-tiles/wingo.png",
  wingo_3m: "/design/game-tiles/wingo.png",
  wingo_5m: "/design/game-tiles/wingo.png",
  k3_1m: "/design/game-tiles/k3_gold.jpg",
  k3_3m: "/design/game-tiles/k3_gold.jpg",
  k3_5m: "/design/game-tiles/k3_gold.jpg",
  k3_10m: "/design/game-tiles/k3_gold.jpg",
  fived_1m: "/design/game-tiles/fived_gold.jpg",
  fived_3m: "/design/game-tiles/fived_gold.jpg",
  fived_5m: "/design/game-tiles/fived_gold.jpg",
  fived_10m: "/design/game-tiles/fived_gold.jpg",
  crash: "/design/game-tiles/aviator.png",
  limbo: "/design/game-tiles/limbo_gold.jpg",
  mines: "/design/game-tiles/mines_gold.jpg",
  dice: "/design/game-tiles/dice_gold.jpg",
};

const LOBBY_SECTIONS = [
  { key: "wingo", label: "Wingo Games" },
  { key: "k3", label: "K3 Games" },
  { key: "fived", label: "5D Games" },
  { key: "originals", label: "Mini Games" },
  { key: "slots", label: "Slots" },
  { key: "live", label: "Live Casino" },
] as const;

const COMING_SOON_GAMES: Record<string, { label: string; comingSoonNote: string }> = {
  jili_slots: {
    label: "JILI Slots",
    comingSoonNote: "Slot games are coming soon. Classic reels and jackpots will be added in a future update.",
  },
  pg_slots: {
    label: "PG Slots",
    comingSoonNote: "Slot games are coming soon. Classic reels and jackpots will be added in a future update.",
  },
  evolution: {
    label: "Evolution",
    comingSoonNote: "Live dealer tables are on the roadmap. Check back for roulette, blackjack, and more.",
  },
};

interface GameSectionProps {
  catKey: string;
  label: string;
  games: ReturnType<typeof filterGames>;
  onComingSoon: (game: any) => void;
  limit?: number | null;
}

const getCategoryLabel = (cat: string | undefined): string => {
  if (!cat) return "Lottery";
  const lower = cat.toLowerCase();
  if (lower === "wingo") return "Wingo";
  if (lower === "k3") return "K3";
  if (lower === "fived" || lower === "5d") return "5D";
  if (lower === "originals" || lower === "mini") return "Mini Game";
  if (lower === "slots") return "Slots";
  if (lower === "live" || lower === "casino") return "Live Casino";
  if (lower === "sports") return "Sports";
  return cat;
};

function GameSection({ catKey, label, games, onComingSoon, limit = null }: GameSectionProps) {
  const displayGames = limit ? games.slice(0, limit) : games;
  if (displayGames.length === 0) return null;
  const Art = CATEGORY_ART[catKey as GameCategoryKey] ?? StarArt;

  return (
    <div className="mb-8 animate-fade-in">
      <div className="club-section-header" style={{ display: "flex", alignItems: "center", marginBottom: "16px", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--theme-green)", display: "flex", alignItems: "center" }}>
            <Art size={18} />
          </span>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--theme-text)", margin: 0, letterSpacing: "0.2px" }}>{label}</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {displayGames.map((game) => {
          const GameArt = GAME_ART[game.slug] ?? GamepadArt;
          const isSoon = COMING_SOON_GAMES[game.slug];
          const cardBody = (
            <>
              <div className="club-popular-card-media" style={{ width: "100%", aspectRatio: "3/4", position: "relative", borderRadius: "14px", overflow: "hidden", background: "var(--theme-bg-card)", border: "1px solid var(--theme-border)", boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>
                {(game.badge || isSoon) && (
                  <span className={clsx("club-game-badge", isSoon ? "soon" : game.badge?.toLowerCase() === "hot" ? "hot" : "new")}>
                    {isSoon ? "Soon" : game.badge}
                  </span>
                )}
                {GAME_BANNER_MAP[game.slug] ? (
                  <img
                    src={GAME_BANNER_MAP[game.slug]}
                    alt={game.label}
                    className="club-popular-card-img"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }}
                  />
                ) : (
                  <div className="club-popular-card-art" style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
                    <GameArt size={36} />
                  </div>
                )}
              </div>

              <div style={{ textAlign: "center", marginTop: "8px", padding: "0 2px" }}>
                <span style={{ display: "block", color: "var(--theme-text)", fontSize: "11px", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.label}</span>
                <span style={{ display: "block", color: "var(--theme-green)", fontSize: "9px", fontWeight: "600", textTransform: "uppercase", marginTop: "2px" }}>{getCategoryLabel(game.category)}</span>
              </div>
            </>
          );

          if (isSoon) {
            return (
              <button
                key={game.slug}
                onClick={() => onComingSoon(isSoon)}
                className="club-popular-card coming-soon"
                style={{ display: "flex", flexDirection: "column", width: "100%", textDecoration: "none", background: "none", border: "none", padding: 0, cursor: "pointer", boxShadow: "none" }}
              >
                {cardBody}
              </button>
            );
          }

          return (
            <Link
              key={game.slug}
              href={game.href}
              className="club-popular-card"
              style={{ display: "flex", flexDirection: "column", width: "100%", textDecoration: "none", background: "none", border: "none", padding: 0, boxShadow: "none" }}
            >
              {cardBody}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function GameCatalogGrid() {
  const [category, setCategory] = useState<GameCategoryKey>("popular");
  const [comingSoonGame, setComingSoonGame] = useState<any>(null);

  return (
    <div className="flex flex-col gap-5">
      {/* Tab bar */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {GAME_CATEGORIES.map((c) => {
          const Art = CATEGORY_ART[c.key];
          const active = category === c.key;
          return (
            <button 
              key={c.key} 
              onClick={() => setCategory(c.key)} 
              className="shrink-0 flex flex-col items-center gap-1.5 w-[72px]"
            >
              <span
                className={clsx(
                  "h-14 w-14 rounded-full flex items-center justify-center overflow-hidden border transition bg-surface-2",
                  active
                    ? "border-gold ring-2 ring-gold/40 shadow-lg shadow-gold/20"
                    : "border-border hover:border-gold/40"
                )}
              >
                <ArtImg name={`cat-${c.key}`} className="h-full w-full object-cover" fallback={<Art size={34} />} />
              </span>
              <span className={clsx("text-xs whitespace-nowrap", active ? "text-gold font-semibold" : "text-muted")}>
                {c.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid listing */}
      <div className="mt-2">
        {category === "popular" ? (
          LOBBY_SECTIONS.map((sec) => (
            <GameSection
              key={sec.key}
              catKey={sec.key}
              label={sec.label}
              games={filterGames(sec.key)}
              onComingSoon={setComingSoonGame}
              limit={null}
            />
          ))
        ) : (
          (() => {
            const label = GAME_CATEGORIES.find((c) => c.key === category)?.label || category;
            const games = filterGames(category);
            return (
              <GameSection
                catKey={category}
                label={label}
                games={games}
                onComingSoon={setComingSoonGame}
              />
            );
          })()
        )}
      </div>

      <ComingSoonModal game={comingSoonGame} onClose={() => setComingSoonGame(null)} />
    </div>
  );
}
