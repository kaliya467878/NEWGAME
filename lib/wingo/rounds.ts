import type { WingoBetType, WingoMode } from "@/generated/prisma/client";

export const MODE_DURATIONS_SECONDS: Record<WingoMode, number> = {
  S30: 30,
  M1: 60,
  M3: 180,
  M5: 300,
};

export const LOCK_SECONDS = 5;

const T_0 = 1783728000000; // 2026-07-11 00:00:00 UTC in ms

function getDeterministicRandom4Digits(game: string, mode: string): number {
  const input = `${game}_${mode}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) & 0xffffffff;
  }
  return 1000 + Math.abs(hash) % 9000;
}

function getModeCode(mode: string): string {
  if (mode === "S30") return "30";
  if (mode === "M1") return "01";
  if (mode === "M3") return "03";
  if (mode === "M5") return "05";
  return "00";
}

// Round numbers embed the date directly (e.g. 2026071110300...), which
// exceeds Number.MAX_SAFE_INTEGER (~9e15) — a plain `number` silently
// rounds to the nearest representable double at that magnitude, corrupting
// round identity (skipped/duplicate rounds, wrong countdown). BigInt keeps
// this exact; only the small, safely-sized millisecond timestamps derived
// from it stay as `number`.
export function getStartRoundNumber(mode: WingoMode): bigint {
  const modeCode = getModeCode(mode);
  return BigInt(`202611100${modeCode}00001`);
}

export function getRoundNumber(mode: WingoMode, atMs: number = Date.now()): bigint {
  const durationMs = MODE_DURATIONS_SECONDS[mode] * 1000;
  const rawRound = Math.floor(atMs / durationMs);
  const rawRoundAtT0 = Math.floor(T_0 / durationMs);
  const diff = rawRound - rawRoundAtT0;
  const startRound = getStartRoundNumber(mode);
  return startRound + BigInt(diff);
}

export function getRoundWindow(mode: WingoMode, roundNumber: bigint) {
  const durationMs = MODE_DURATIONS_SECONDS[mode] * 1000;
  const startRound = getStartRoundNumber(mode);
  const diff = Number(roundNumber - startRound);
  const rawRoundAtT0 = Math.floor(T_0 / durationMs);
  const rawRound = rawRoundAtT0 + diff;
  const startsAt = rawRound * durationMs;
  const endsAt = startsAt + durationMs;
  const locksAt = endsAt - LOCK_SECONDS * 1000;
  return { startsAt, endsAt, locksAt };
}

export function getColorAndSize(number: number): { color: string; size: "BIG" | "SMALL" } {
  const size = number <= 4 ? "SMALL" : "BIG";
  let color: string;
  if (number === 0) color = "RED_VIOLET";
  else if (number === 5) color = "GREEN_VIOLET";
  else if ([1, 3, 7, 9].includes(number)) color = "GREEN";
  else color = "RED";
  return { color, size };
}

/** Splits a combined color (e.g. "RED_VIOLET") into its individual chip colors for rendering. */
export function colorChips(color: string): string[] {
  if (color === "RED_VIOLET") return ["RED", "VIOLET"];
  if (color === "GREEN_VIOLET") return ["GREEN", "VIOLET"];
  return [color];
}

/** Tailwind classes for a single color chip (used by number balls and digit pickers). */
export function ballClass(chip: string): string {
  if (chip === "RED") return "bg-red text-white";
  if (chip === "GREEN") return "bg-green text-black";
  return "bg-violet text-white";
}

/** Convenience: full solid ball classes (bg + ring for two-tone numbers) for a given 0-9 digit. */
export function numberBallClasses(n: number): { chips: string[]; primaryClass: string; twoTone: boolean } {
  const { color } = getColorAndSize(n);
  const chips = colorChips(color);
  return { chips, primaryClass: ballClass(chips[0]), twoTone: chips.length > 1 };
}

// Platform bet fee: a flat 2% cut applied uniformly across every Wingo bet
// type (number, color, violet, big/small) — mathematically equivalent to
// deducting 2% from the stake up front (a 100 bet becomes a 98 "contract
// amount") and then applying the fair odds below, since multiplication is
// commutative: bet * fair * (1 - fee) === (bet * (1 - fee)) * fair.
export const BET_FEE = 0.02;
const NUMBER_MULTIPLIER = 9 * (1 - BET_FEE);
const BIG_SMALL_MULTIPLIER = 2 * (1 - BET_FEE);
const VIOLET_MULTIPLIER = 4.5 * (1 - BET_FEE);
const COLOR_MULTIPLIER = 2 * (1 - BET_FEE);
const PARTIAL_COLOR_MULTIPLIER = 1.45 * (1 - BET_FEE);

/** Returns the payout multiplier for a bet given the settled winning number, or 0 if it lost. */
export function resolveBetMultiplier(
  bet: { betType: WingoBetType; selection: string },
  resultNumber: number
): number {
  const { color, size } = getColorAndSize(resultNumber);

  if (bet.betType === "NUMBER") {
    return Number(bet.selection) === resultNumber ? NUMBER_MULTIPLIER : 0;
  }

  if (bet.betType === "BIG_SMALL") {
    return bet.selection.toUpperCase() === size ? BIG_SMALL_MULTIPLIER : 0;
  }

  if (bet.betType === "COLOR") {
    const selection = bet.selection.toUpperCase();
    if (selection === "VIOLET") return color.includes("VIOLET") ? VIOLET_MULTIPLIER : 0;
    if (selection === "RED") {
      if (color === "RED") return COLOR_MULTIPLIER;
      if (color === "RED_VIOLET") return PARTIAL_COLOR_MULTIPLIER;
      return 0;
    }
    if (selection === "GREEN") {
      if (color === "GREEN") return COLOR_MULTIPLIER;
      if (color === "GREEN_VIOLET") return PARTIAL_COLOR_MULTIPLIER;
      return 0;
    }
  }

  return 0;
}
