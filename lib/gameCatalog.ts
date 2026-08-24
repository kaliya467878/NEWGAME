export type GameCategoryKey = "popular" | "wingo" | "k3" | "fived" | "originals" | "slots" | "live" | "sports";

export const GAME_CATEGORIES: { key: GameCategoryKey; label: string }[] = [
  { key: "popular", label: "All Games" },
  { key: "wingo", label: "Wingo" },
  { key: "k3", label: "K3" },
  { key: "fived", label: "5D" },
  { key: "originals", label: "Mini Games" },
  { key: "slots", label: "Slots" },
  { key: "live", label: "Live Casino" },
  { key: "sports", label: "Sports" },
];

export type GameCatalogEntry = {
  slug: string;
  label: string;
  description: string;
  href: string;
  category: Exclude<GameCategoryKey, "popular">;
  popular: boolean;
  badge?: "HOT" | "NEW";
  emoji: string;
};

export const GAMES: GameCatalogEntry[] = [
  // Wingo Family
  {
    slug: "wingo_30s",
    label: "Wingo 30S",
    description: "Color prediction 30s",
    href: "/wingo/30s",
    category: "wingo",
    popular: true,
    badge: "HOT",
    emoji: "🎱",
  },
  {
    slug: "wingo_1m",
    label: "Wingo 1M",
    description: "Color prediction 1m",
    href: "/wingo/1m",
    category: "wingo",
    popular: true,
    badge: "HOT",
    emoji: "🎱",
  },
  {
    slug: "wingo_3m",
    label: "Wingo 3M",
    description: "Color prediction 3m",
    href: "/wingo/3m",
    category: "wingo",
    popular: false,
    emoji: "🎱",
  },
  {
    slug: "wingo_5m",
    label: "Wingo 5M",
    description: "Color prediction 5m",
    href: "/wingo/5m",
    category: "wingo",
    popular: false,
    badge: "NEW",
    emoji: "🎱",
  },

  // K3 Family
  {
    slug: "k3_1m",
    label: "K3 1M",
    description: "Dice sum lottery 1m",
    href: "/k3/1m",
    category: "k3",
    popular: true,
    badge: "NEW",
    emoji: "🎲",
  },
  {
    slug: "k3_3m",
    label: "K3 3M",
    description: "Dice sum lottery 3m",
    href: "/k3/3m",
    category: "k3",
    popular: false,
    emoji: "🎲",
  },
  {
    slug: "k3_5m",
    label: "K3 5M",
    description: "Dice sum lottery 5m",
    href: "/k3/5m",
    category: "k3",
    popular: false,
    emoji: "🎲",
  },
  {
    slug: "k3_10m",
    label: "K3 10M",
    description: "Dice sum lottery 10m",
    href: "/k3/10m",
    category: "k3",
    popular: false,
    badge: "NEW",
    emoji: "🎲",
  },

  // 5D Family
  {
    slug: "fived_1m",
    label: "5D 1M",
    description: "5-digit lottery 1m",
    href: "/fived/1m",
    category: "fived",
    popular: true,
    badge: "NEW",
    emoji: "🔢",
  },
  {
    slug: "fived_3m",
    label: "5D 3M",
    description: "5-digit lottery 3m",
    href: "/fived/3m",
    category: "fived",
    popular: false,
    emoji: "🔢",
  },
  {
    slug: "fived_5m",
    label: "5D 5M",
    description: "5-digit lottery 5m",
    href: "/fived/5m",
    category: "fived",
    popular: false,
    emoji: "🔢",
  },
  {
    slug: "fived_10m",
    label: "5D 10M",
    description: "5-digit lottery 10m",
    href: "/fived/10m",
    category: "fived",
    popular: false,
    badge: "HOT",
    emoji: "🔢",
  },

  {
    slug: "mines",
    label: "Mines",
    description: "Reveal tiles, avoid mines",
    href: "/mines",
    category: "originals",
    popular: true,
    emoji: "💎",
  },
  {
    slug: "dice",
    label: "Dice",
    description: "Roll over or under",
    href: "/dice",
    category: "originals",
    popular: false,
    emoji: "🎯",
  },
  {
    slug: "limbo",
    label: "Limbo",
    description: "Multiplier predictor",
    href: "/limbo",
    category: "originals",
    popular: true,
    badge: "NEW",
    emoji: "🚀",
  },

  // Slots
  {
    slug: "jili_slots",
    label: "JILI Slots",
    description: "Spin to win big",
    href: "/games/slots",
    category: "slots",
    popular: true,
    badge: "HOT",
    emoji: "🎰",
  },
  {
    slug: "pg_slots",
    label: "PG Slots",
    description: "Premium slot games",
    href: "/games/slots",
    category: "slots",
    popular: false,
    emoji: "🎰",
  },

  // Live Casino
  {
    slug: "evolution",
    label: "Evolution",
    description: "Live dealers",
    href: "/games/live",
    category: "live",
    popular: true,
    badge: "HOT",
    emoji: "🃏",
  },

  // Sports
  {
    slug: "cricket",
    label: "Cricket",
    description: "Sports betting",
    href: "#",
    category: "sports",
    popular: false,
    emoji: "🏏",
  },
];

export function filterGames(category: GameCategoryKey): GameCatalogEntry[] {
  if (category === "popular") return GAMES.filter((g) => g.popular);
  return GAMES.filter((g) => g.category === category);
}
