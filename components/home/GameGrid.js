"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { getGameTile } from "@/lib/designAssets";
import ComingSoonModal from "./ComingSoonModal";
import { CircleDashed, Dices, Ticket, Gem, Rocket, Swords, Clock, Hourglass, Zap, Crown, Cpu } from "lucide-react";
import { filterGames } from "@/lib/gameCatalog";

const GAMES = {
  all: [
    {
      id: "wingo",
      label: "Wingo",
      category: "Lottery",
      href: "/wingo/30s",
      className: "wingo",
      art: <CircleDashed />,
      featured: true },
    {
      id: "k3",
      label: "K3",
      category: "Lottery",
      href: "/k3/1m",
      className: "cricket",
      art: <Dices />,
      badge: "new" },
    {
      id: "fived",
      label: "5D",
      category: "Lottery",
      href: "/fived/1m",
      className: "wingo",
      art: <Ticket />,
      badge: "hot" },
    {
      id: "mines",
      label: "Mines",
      category: "Mini",
      href: "/mines",
      className: "mines",
      art: <Gem />,
      badge: "new" },
    {
      id: "dice",
      label: "Dice",
      category: "Mini",
      href: "/dice",
      className: "aviator",
      art: <Dices /> },
    {
      id: "limbo",
      label: "Limbo",
      category: "Mini",
      href: "/limbo",
      className: "mines",
      art: <Rocket />,
      badge: "new" },
    {
      id: "cricket",
      label: "Cricket",
      category: "Sports",
      className: "cricket",
      art: <Swords />,
      comingSoon: true,
      comingSoonNote: "Cricket mini-games are on the roadmap. Check back for live match-style betting." },
  ],
  popular: [
    {
      id: "wingo",
      label: "Wingo",
      category: "Lottery",
      href: "/wingo/30s",
      className: "wingo",
      art: <CircleDashed />,
      featured: true },
    {
      id: "cricket",
      label: "Cricket",
      category: "Sports",
      className: "cricket",
      art: <Swords />,
      comingSoon: true,
      comingSoonNote: "Cricket mini-games are on the roadmap. Check back for live match-style betting." },
    {
      id: "mines",
      label: "Mines",
      category: "Mini",
      href: "/mines",
      className: "mines",
      art: <Gem />,
      badge: "new" },
    {
      id: "limbo",
      label: "Limbo",
      category: "Mini",
      href: "/limbo",
      className: "mines",
      art: <Rocket />,
      badge: "new" },
  ],
  lottery: [
    { id: "k3_1m", label: "K3 1M", category: "Lottery", href: "/k3/1m", className: "cricket", art: <Dices />, badge: "new" },
    { id: "k3_3m", label: "K3 3M", category: "Lottery", href: "/k3/3m", className: "cricket", art: <Dices /> },
    { id: "k3_5m", label: "K3 5M", category: "Lottery", href: "/k3/5m", className: "cricket", art: <Dices /> },
    { id: "k3_10m", label: "K3 10M", category: "Lottery", href: "/k3/10m", className: "cricket", art: <Dices />, badge: "new" },
    { id: "wingo1m", label: "Wingo 1M", category: "Lottery", href: "/wingo/1m", className: "wingo", art: <Clock />, badge: "hot" },
    { id: "wingo3m", label: "Wingo 3M", category: "Lottery", href: "/wingo/3m", className: "wingo", art: <Hourglass /> },
    { id: "wingo5m", label: "Wingo 5M", category: "Lottery", href: "/wingo/5m", className: "wingo", art: <Clock />, badge: "new" },
    { id: "fived_1m", label: "5D 1M", category: "Lottery", href: "/fived/1m", className: "wingo", art: <Ticket />, badge: "new" },
    { id: "fived_3m", label: "5D 3M", category: "Lottery", href: "/fived/3m", className: "wingo", art: <Ticket /> },
    { id: "fived_5m", label: "5D 5M", category: "Lottery", href: "/fived/5m", className: "wingo", art: <Ticket /> },
    { id: "fived_10m", label: "5D 10M", category: "Lottery", href: "/fived/10m", className: "wingo", art: <Ticket />, badge: "hot" },
  ],
  mini: [
    { id: "wingo30", label: "Wingo 30S", category: "Fast", href: "/wingo/30s", className: "wingo", art: <Zap />, featured: true },
    {
      id: "dice",
      label: "Dice",
      category: "Mini",
      className: "aviator",
      art: <Dices />,
      href: "/dice" },
    {
      id: "mines",
      label: "Mines",
      category: "Mini",
      href: "/mines",
      className: "mines",
      art: <Gem />,
      badge: "new" },
    {
      id: "limbo",
      label: "Limbo",
      category: "Mini",
      href: "/limbo",
      className: "mines",
      art: <Rocket />,
      badge: "new" },
  ],
  slots: [
    {
      id: "pg_slots",
      label: "PG Slots",
      category: "Slots",
      className: "aviator",
      art: <Crown />,
      comingSoon: true,
      comingSoonNote: "PG Slots are coming soon! Exciting digital slot machines with vibrant graphics, immersive soundtracks, and big reward multipliers." },
    {
      id: "jili_slots",
      label: "JILI Slots",
      category: "Slots",
      className: "aviator",
      art: <Crown />,
      comingSoon: true,
      comingSoonNote: "JILI Slots are coming soon! Experience top-tier graphic animations, interactive bonus games, and massive jackpot drops." },
  ],
  live: [
    {
      id: "evolution",
      label: "Evolution",
      category: "Live Casino",
      className: "cricket",
      art: <Crown />,
      comingSoon: true,
      comingSoonNote: "Evolution Live Gaming is coming soon! Bring the casino lobby straight to your screen with live dealers for roulette, blackjack, baccarat, and game shows." },
  ],
  sports: [
    {
      id: "cricket",
      label: "Cricket",
      category: "Sports",
      className: "cricket",
      art: <Swords />,
      comingSoon: true,
      comingSoonNote: "Cricket mini-games are on the roadmap. Check back for live match-style betting." },
  ] };

const SECTION_TITLES = {
  all: "All Games",
  popular: "Popular Games",
  lottery: "Lottery Games",
  slots: "Slots",
  live: "Live Casino",
  sports: "Sports",
  mini: "Mini Games" };

const ALL_LINKS = {
  all: "/games",
  popular: "/games",
  lottery: "/games?category=lottery",
  slots: "/games?category=slots",
  live: "/games?category=live",
  sports: "/games",
  mini: "/games?category=originals" };

const TILE_IMAGE_IDS = {
  wingo: "wingo",
  wingo1m: "wingo",
  wingo3m: "wingo",
  wingo5m: "wingo",
  wingo30: "wingo",
  trx_wingo: "trx_wingo",
  trx_wingo_30s: "trx_wingo",
  trx_wingo_1m: "trx_wingo",
  trx_wingo_3m: "trx_wingo",
  trx_wingo_5m: "trx_wingo",
  aviator: "aviator",
  cricket: "cricket",
  mines: "mines",
  evolution: "evolution",
  pg_slots: "pg_slots",
  jili_slots: "jili_slots" };

function GameCardArt({ game }) {
  const tileId = TILE_IMAGE_IDS[game.id];
  const tile = tileId ? getGameTile(tileId) : null;

  if (tile?.image) {
    return (
      <Image
        src={tile.image}
        alt=""
        fill
        sizes="124px"
        className="club-popular-card-img"
      />
    );
  }

  return <div className="club-popular-card-art">{game.art}</div>;
}

function GameBadge({ game }) {
  if (game.comingSoon) {
    return <span className="club-game-badge soon">Soon</span>;
  }
  if (game.badge === "hot") {
    return <span className="club-game-badge hot">Hot</span>;
  }
  if (game.badge === "new") {
    return <span className="club-game-badge new">New</span>;
  }
  return null;
}

function PopularGameCard({ game, onComingSoon }) {
  const cardClass = [
      "club-game-item",
    game.className,
    game.featured ? "featured" : "",
    game.comingSoon ? "coming-soon" : "",
  ]
    .filter(Boolean)
    .join(" ");

 const body = (
  <>
    <div className="club-popular-card-media">
      <GameBadge game={game} />
      <GameCardArt game={game} />
    </div>

    <div className="club-popular-card-info" style={{ textAlign: "left", padding: "10px 4px", background: "transparent" }}>
      <span style={{ display: "block", color: "var(--theme-text-secondary, #64748B)", fontSize: "11px", fontWeight: "500", textTransform: "capitalize", marginBottom: "4px" }}>{game.category}</span>
      <strong style={{ display: "block", margin: 0, fontSize: "14px", fontWeight: "800", color: "var(--theme-text)", lineHeight: 1.2 }}>{game.label}</strong>
    </div>
  </>
);
  if (game.comingSoon) {
    return (
      <button type="button" className={cardClass} onClick={() => onComingSoon(game)}>
        {body}
      </button>
    );
  }

  return (
    <Link href={game.href} className={cardClass}>
      {body}
    </Link>
  );
}

const LOBBY_SECTIONS = [
  { key: "trx", label: "TRX Wingo" },
  { key: "wingo", label: "Wingo Games" },
  { key: "k3", label: "K3 Games" },
  { key: "fived", label: "5D Games" },
  { key: "originals", label: "Mini Games" },
  { key: "slots", label: "Slots" },
  { key: "live", label: "Live Casino" },
];

const GAME_BANNER_MAP = {
  wingo_30s: "/design/game-tiles/wingo.png?v=3",
  wingo_1m: "/design/game-tiles/wingo.png?v=3",
  wingo_3m: "/design/game-tiles/wingo.png?v=3",
  wingo_5m: "/design/game-tiles/wingo.png?v=3",
  trx_wingo_30s: "/design/game-tiles/lottery_trx.jpg",
  trx_wingo_1m: "/design/game-tiles/lottery_trx.jpg",
  trx_wingo_3m: "/design/game-tiles/lottery_trx.jpg",
  trx_wingo_5m: "/design/game-tiles/lottery_trx.jpg",
  k3_1m: "/design/game-tiles/k3_gold.jpg?v=3",
  k3_3m: "/design/game-tiles/k3_gold.jpg?v=3",
  k3_5m: "/design/game-tiles/k3_gold.jpg?v=3",
  k3_10m: "/design/game-tiles/k3_gold.jpg?v=3",
  fived_1m: "/design/game-tiles/fived_gold.jpg?v=3",
  fived_3m: "/design/game-tiles/fived_gold.jpg?v=3",
  fived_5m: "/design/game-tiles/fived_gold.jpg?v=3",
  fived_10m: "/design/game-tiles/fived_gold.jpg?v=3",
  crash: "/design/game-tiles/aviator.png?v=3",
  limbo: "/design/game-tiles/limbo_gold.jpg?v=3",
  mines: "/design/game-tiles/mines_gold.jpg?v=3",
  dice: "/design/game-tiles/dice_gold.jpg?v=3",
  evolution: "/design/game-tiles/evolution.png?v=3",
  pg_slots: "/design/game-tiles/pg-slots.png?v=3",
  jili_slots: "/design/game-tiles/jili-slots.jpg?v=3",
  cricket: "/design/game-tiles/cricket.jpg" };

const CATEGORY_ICONS = {
  trx: Cpu,
  wingo: CircleDashed,
  k3: Dices,
  fived: Ticket,
  originals: Gem,
  slots: Crown,
  live: Crown,
  sports: Swords };

const COMING_SOON_GAMES = {
  jili_slots: {
    label: "JILI Slots",
    comingSoonNote: "Slot games are coming soon. Classic reels and jackpots will be added in a future update." },
  pg_slots: {
    label: "PG Slots",
    comingSoonNote: "Slot games are coming soon. Classic reels and jackpots will be added in a future update." },
  evolution: {
    label: "Evolution",
    comingSoonNote: "Live dealer tables are on the roadmap. Check back for roulette, blackjack, and more." },
  cricket: {
    label: "Cricket",
    comingSoonNote: "Cricket mini-games and sports betting are on the roadmap. Check back for live match-style betting." } };

const getCategoryLabel = (cat) => {
  if (!cat) return "Lottery";
  const lower = cat.toLowerCase();
  if (lower === "trx") return "TRX Wingo";
  if (lower === "wingo") return "Wingo";
  if (lower === "k3") return "K3";
  if (lower === "fived" || lower === "5d") return "5D";
  if (lower === "originals" || lower === "mini") return "Mini Game";
  if (lower === "slots") return "Slots";
  if (lower === "live" || lower === "casino") return "Live Casino";
  if (lower === "sports") return "Sports";
  return cat;
};

function HomeGameSection({ catKey, label, games, onComingSoon }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || games.length <= 3) return;
    
    let isTouching = false;
    let touchTimeout;
    
    const handleTouch = () => {
      isTouching = true;
      clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => isTouching = false, 3000);
    };
    
    el.addEventListener('touchstart', handleTouch, {passive: true});
    el.addEventListener('wheel', handleTouch, {passive: true});
    
    const interval = setInterval(() => {
      if (isTouching) return;
      const itemWidth = el.scrollWidth / games.length;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: itemWidth, behavior: 'smooth' });
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(touchTimeout);
      el.removeEventListener('touchstart', handleTouch);
      el.removeEventListener('wheel', handleTouch);
    };
  }, [games.length]);

  if (games.length === 0) return null;
  const Icon = CATEGORY_ICONS[catKey] || CircleDashed;

  return (
    <div className="mb-8 animate-fade-in" style={{ padding: "0 16px", overflow: "hidden" }}>
      <div className="club-section-header" style={{ display: "flex", alignItems: "center", marginBottom: "16px", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--theme-green)", display: "flex", alignItems: "center" }}>
            <Icon size={18} />
          </span>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--theme-text)", margin: 0, letterSpacing: "0.2px" }}>{label}</h2>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="horizontal-swipe-grid" 
        style={{ 
          display: "flex", 
          gap: "12px", 
          overflowX: "auto", 
          scrollSnapType: "x mandatory", 
          scrollbarWidth: "none",
          paddingBottom: "10px"
        }}
      >
        {games.map((game) => {
          const isSoon = COMING_SOON_GAMES[game.slug];
          const cardBody = (
            <>
              <div className="club-popular-card-media" style={{ width: "100%", aspectRatio: "3/4", position: "relative", borderRadius: "14px", overflow: "hidden", border: "none", boxShadow: "0 4px 12px rgba(71, 129, 255, 0.15)", background: "var(--theme-primary)" }}>
                {(game.badge || isSoon) && (
                  <span className={`club-game-badge ${isSoon ? 'soon' : game.badge?.toLowerCase() === 'hot' ? 'hot' : 'new'}`}>
                    {isSoon ? "Soon" : game.badge}
                  </span>
                )}
                {GAME_BANNER_MAP[game.slug] ? (
                  <img
                    src={GAME_BANNER_MAP[game.slug]}
                    alt={game.label}
                    className="club-popular-card-img"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", border: "none" }}
                  />
                ) : (
                  <div className="club-popular-card-art" style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "36px" }}>{game.emoji}</span>
                  </div>
                )}
              </div>

              <div style={{ textAlign: "left", marginTop: "10px", padding: "0 4px" }}>
                <span style={{ display: "block", color: "var(--theme-text-secondary, #64748B)", fontSize: "11px", fontWeight: "500", textTransform: "capitalize", marginBottom: "4px" }}>{getCategoryLabel(game.category)}</span>
                <span style={{ display: "block", color: "var(--theme-text, #0F172A)", fontSize: "14px", fontWeight: "800", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.label}</span>
              </div>
            </>
          );

          if (isSoon) {
            return (
              <button
                key={game.slug}
                onClick={() => onComingSoon(isSoon)}
                className="club-game-item coming-soon"
                style={{ display: "flex", flexDirection: "column", flex: "0 0 calc(33.333% - 8px)", scrollSnapAlign: "start", textDecoration: "none", border: "none", padding: 0, cursor: "pointer", boxShadow: "none" }}
              >
                {cardBody}
              </button>
            );
          }

          return (
            <Link key={game.slug} href={game.href} className="club-game-item"
              style={{ display: "flex", flexDirection: "column", flex: "0 0 calc(33.333% - 8px)", scrollSnapAlign: "start", textDecoration: "none", border: "none", padding: 0, boxShadow: "none" }}>
              {cardBody}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function GameGrid({ category }) {
  const [comingSoonGame, setComingSoonGame] = useState(null);

  let sectionsToShow = [];
  if (category === "all") {
    sectionsToShow = LOBBY_SECTIONS;
  } else if (category === "lottery") {
    sectionsToShow = [
      { key: "trx", label: "TRX Wingo" },
      { key: "wingo", label: "Wingo Games" },
      { key: "k3", label: "K3 Games" },
      { key: "fived", label: "5D Games" },
    ];
  } else if (category === "mini") {
    sectionsToShow = [
      { key: "originals", label: "Mini Games" },
    ];
  } else if (category === "slots") {
    sectionsToShow = [
      { key: "slots", label: "Slots" },
    ];
  } else if (category === "live") {
    sectionsToShow = [
      { key: "live", label: "Live Casino" },
    ];
  } else if (category === "sports") {
    sectionsToShow = [
      { key: "sports", label: "Sports" },
    ];
  }

  return (
    <>
      <div style={{ marginTop: "12px" }}>
        {sectionsToShow.map((sec) => (
          <HomeGameSection
            key={sec.key}
            catKey={sec.key}
            label={sec.label}
            games={filterGames(sec.key)}
            onComingSoon={setComingSoonGame}
          />
        ))}
      </div>
      <ComingSoonModal game={comingSoonGame} onClose={() => setComingSoonGame(null)} />
    </>
  );
}
