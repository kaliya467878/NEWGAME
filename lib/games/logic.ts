// Pure, shared game math. House edge is applied consistently at ~2-8% so the
// virtual economy trends slightly in the house's favour over time.

export const HOUSE_EDGE = 0.03;

// ---------- Dice ----------
// Roll is an integer 1..10000. Target is 10..9990. OVER wins if roll > target,
// UNDER wins if roll < target.
export function normalizeDiceDirection(dir: string): "OVER" | "UNDER" {
  const d = String(dir || "").toUpperCase();
  if (d === "OVER" || d === "UP" || d === "BIG" || d === "ABOVE") return "OVER";
  return "UNDER";
}

export function diceWinChance(target: number, direction: string): number {
  const norm = normalizeDiceDirection(direction);
  const winCount = norm === "OVER" ? 10000 - target : target;
  return Math.max(0, winCount) / 10000;
}
 
export function diceMultiplier(target: number, direction: string): number {
  const chance = diceWinChance(target, direction);
  if (chance <= 0) return 0;
  const mult = (1 - HOUSE_EDGE) / chance;
  return Math.round(mult * 100) / 100;
}
 
export function diceIsWin(roll: number, target: number, direction: string): boolean {
  const norm = normalizeDiceDirection(direction);
  return norm === "OVER" ? roll > target : roll <= target;
}

// ---------- Lucky Wheel ----------
// 16 fixed positions picked uniformly. EV ≈ 0.92.
export const WHEEL_SEGMENTS: number[] = [
  0, 2, 0, 1.5, 0, 3, 0, 2, 0, 5, 0, 1.2, 0, 0, 0, 0,
];

// ---------- Mines ----------
// 5x5 grid. Multiplier after revealing k safe tiles with M mines on N=25 tiles.
export const MINES_GRID_SIZE = 25;

export function minesMultiplier(mineCount: number, revealedCount: number): number {
  const N = MINES_GRID_SIZE;
  let multiplier = 1;
  for (let i = 0; i < revealedCount; i++) {
    multiplier *= (N - i) / (N - mineCount - i);
  }
  return Math.floor(multiplier * (1 - HOUSE_EDGE) * 100) / 100;
}

// ---------- Crash ----------
const CRASH_GROWTH_PER_MS = 0.0002;

export function crashMultiplierAt(elapsedMs: number): number {
  const raw = Math.exp(CRASH_GROWTH_PER_MS * Math.max(0, elapsedMs));
  return Math.floor(raw * 100) / 100;
}

/** Given a uniform random r in [0,1), produce a crash point with the house edge baked in. */
export function crashPointFromRandom(r: number): number {
  const raw = (1 - HOUSE_EDGE) / (1 - r);
  const capped = Math.min(raw, 1000);
  return Math.max(1, Math.floor(capped * 100) / 100);
}

/** Maps the current multiplier to a normalized plane position for the flight animation. */
export function crashPlanePosition(multiplier: number): {
  progress: number;
  leftPct: number;
  bottomPct: number;
  rotateDeg: number;
} {
  const progress = Math.min(1, (multiplier - 1) / 9);
  return {
    progress,
    leftPct: 8 + progress * 78,
    bottomPct: 8 + progress * 70,
    rotateDeg: -8 - progress * 22,
  };
}
