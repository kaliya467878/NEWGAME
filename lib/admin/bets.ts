import { prisma } from "@/lib/prisma";

export type BetRow = {
  id: string;
  user: { displayName: string; phone: string };
  game: string;
  detail: string;
  round: string;
  stake: number;
  payout: number;
  status: "PENDING" | "WON" | "LOST";
  createdAt: Date;
};

export const GAME_FILTERS = [
  { key: "", label: "All games" },
  { key: "wingo", label: "Wingo" },
  { key: "k3", label: "K3" },
  { key: "fived", label: "5D" },
  { key: "dice", label: "Dice" },
  { key: "wheel", label: "Wheel" },
  { key: "mines", label: "Mines" },
  { key: "crash", label: "Crash" },
] as const;

const userSelect = { select: { displayName: true, phone: true } };

/**
 * Cross-game bet rows for the admin bets table and its CSV export. `take`
 * caps rows per game before merging (the export path passes a much higher
 * cap and a date range; the page path keeps it small for snappy loads).
 */
export async function loadBetRows(opts: {
  game?: string;
  q?: string;
  take?: number;
  createdAt?: { gte: Date; lte: Date };
}): Promise<BetRow[]> {
  const { game = "", q = "", createdAt } = opts;
  const userWhere = q
    ? { user: { OR: [{ phone: { contains: q } }, { displayName: { contains: q, mode: "insensitive" as const } }] } }
    : {};
  const dateWhere = createdAt ? { createdAt } : {};
  const take = opts.take ?? (game ? 60 : 25);
  const rows: BetRow[] = [];

  if (!game || game === "wingo") {
    const bets = await prisma.wingoBet.findMany({
      where: { ...userWhere, ...dateWhere }, orderBy: { createdAt: "desc" }, take, include: { user: userSelect },
    });
    rows.push(...bets.map((b): BetRow => ({
      id: b.id, user: b.user, game: `Wingo ${b.mode}`,
      detail: b.betType === "NUMBER" ? `Number ${b.selection}` : b.selection,
      round: `#${Number(b.roundNumber % BigInt(100000))}`, stake: b.amount, payout: b.payout, status: b.status, createdAt: b.createdAt,
    })));
  }
  if (!game || game === "k3") {
    const bets = await prisma.k3Bet.findMany({
      where: { ...userWhere, ...dateWhere }, orderBy: { createdAt: "desc" }, take, include: { user: userSelect },
    });
    rows.push(...bets.map((b): BetRow => ({
      id: b.id, user: b.user, game: `K3 ${b.mode}`,
      detail: b.betType === "SUM_VALUE" ? `Sum ${b.selection}` : b.betType === "ANY_TRIPLE" ? "Any triple" : b.selection,
      round: `#${Number(b.roundNumber % BigInt(100000))}`, stake: b.amount, payout: b.payout, status: b.status, createdAt: b.createdAt,
    })));
  }
  if (!game || game === "fived") {
    const bets = await prisma.fiveDBet.findMany({
      where: { ...userWhere, ...dateWhere }, orderBy: { createdAt: "desc" }, take, include: { user: userSelect },
    });
    rows.push(...bets.map((b): BetRow => ({
      id: b.id, user: b.user, game: `5D ${b.mode}`,
      detail: b.betType === "POSITION_NUMBER" ? `Pos ${b.selection.replace(":", " = ")}` : b.selection,
      round: `#${Number(b.roundNumber % BigInt(100000))}`, stake: b.amount, payout: b.payout, status: b.status, createdAt: b.createdAt,
    })));
  }
  if (!game || game === "dice") {
    const bets = await prisma.diceBet.findMany({
      where: { ...userWhere, ...dateWhere }, orderBy: { createdAt: "desc" }, take, include: { user: userSelect },
    });
    rows.push(...bets.map((b): BetRow => ({
      id: b.id, user: b.user, game: "Dice",
      detail: `${b.direction} ${b.target} → rolled ${b.roll}`,
      round: "—", stake: b.amount, payout: b.payout, status: b.won ? "WON" : "LOST", createdAt: b.createdAt,
    })));
  }
  if (!game || game === "wheel") {
    const spins = await prisma.wheelSpin.findMany({
      where: { ...userWhere, ...dateWhere }, orderBy: { createdAt: "desc" }, take, include: { user: userSelect },
    });
    rows.push(...spins.map((b): BetRow => ({
      id: b.id, user: b.user, game: "Wheel",
      detail: `${b.multiplier}x segment`,
      round: "—", stake: b.amount, payout: b.payout, status: b.payout > 0 ? "WON" : "LOST", createdAt: b.createdAt,
    })));
  }
  if (!game || game === "mines") {
    const games = await prisma.minesGame.findMany({
      where: { ...userWhere, ...dateWhere }, orderBy: { createdAt: "desc" }, take, include: { user: userSelect },
    });
    rows.push(...games.map((b): BetRow => ({
      id: b.id, user: b.user, game: "Mines",
      detail: `${b.mineCount} mines · ${b.revealed.length} revealed`,
      round: "—", stake: b.amount, payout: b.payout,
      status: b.status === "ACTIVE" ? "PENDING" : b.status === "CASHED_OUT" ? "WON" : "LOST",
      createdAt: b.createdAt,
    })));
  }
  if (!game || game === "crash") {
    const games = await prisma.crashGame.findMany({
      where: { ...userWhere, ...dateWhere }, orderBy: { createdAt: "desc" }, take, include: { user: userSelect },
    });
    rows.push(...games.map((b): BetRow => ({
      id: b.id, user: b.user, game: "Crash",
      detail: b.cashOutMultiplier ? `Cashed out ${b.cashOutMultiplier}x` : `Crashed @ ${b.crashPoint}x`,
      round: "—", stake: b.amount, payout: b.payout,
      status: b.status === "ACTIVE" ? "PENDING" : b.status === "CASHED_OUT" ? "WON" : "LOST",
      createdAt: b.createdAt,
    })));
  }

  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
