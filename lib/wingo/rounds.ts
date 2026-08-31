import type { WingoBetType, WingoMode } from "@/generated/prisma/client";

export const MODE_DURATIONS_SECONDS: Record<WingoMode, number> = {
  S30: 30,
  M1: 60,
  M3: 180,
  M5: 300,
  TRX_S30: 30,
  TRX_M1: 60,
  TRX_M3: 180,
  TRX_M5: 300,
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
  if (mode === "TRX_S30") return "130";
  if (mode === "TRX_M1") return "101";
  if (mode === "TRX_M3") return "103";
  if (mode === "TRX_M5") return "105";
  return "00";
}

// Round numbers embed the date directly (e.g. 2026071110300...), which
// exceeds Number.MAX_SAFE_INTEGER (~9e15) — a plain `number` silently
// rounds to the nearest representable double at that magnitude, corrupting
// round identity (skipped/duplicate rounds, wrong countdown). BigInt keeps
// this exact; only the small, safely-sized millisecond timestamps derived
// from it stay as `number`.
function getDeterministic9Digits(game: string, mode: string): number {
  const input = `${game}_${mode}_salt_v2`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33 + input.charCodeAt(i)) & 0xffffffff;
  }
  return 100000000 + Math.abs(hash) % 900000000;
}

export function getStartRoundNumber(mode: WingoMode): bigint {
  const rand9 = getDeterministic9Digits("wingo", mode);
  return BigInt(`20260711${rand9}`);
}

export function getRoundNumber(mode: WingoMode, atMs: number = Date.now()): bigint {
  const durationMs = MODE_DURATIONS_SECONDS[mode] * 1000;
  const istMs = atMs + 5.5 * 60 * 60 * 1000;
  const date = new Date(istMs);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const yyyymmdd = `${yyyy}${mm}${dd}`;

  const startOfDayMs = Date.UTC(yyyy, date.getUTCMonth(), date.getUTCDate()) - 5.5 * 60 * 60 * 1000;
  const diffToday = Math.floor((atMs - startOfDayMs) / durationMs);

  const rand9 = getDeterministic9Digits("wingo", mode);
  return BigInt(yyyymmdd + rand9) + BigInt(diffToday);
}

export function getRoundWindow(mode: WingoMode, roundNumber: bigint) {
  const durationMs = MODE_DURATIONS_SECONDS[mode] * 1000;
  const roundStr = roundNumber.toString();
  const yyyymmdd = roundStr.slice(0, 8);
  const yyyy = Number(yyyymmdd.slice(0, 4));
  const mm = Number(yyyymmdd.slice(4, 6)) - 1;
  const dd = Number(yyyymmdd.slice(6, 8));

  const startOfDayMs = Date.UTC(yyyy, mm, dd) - 5.5 * 60 * 60 * 1000;
  const suffix = Number(roundStr.slice(8));
  const rand9 = getDeterministic9Digits("wingo", mode);
  const diffToday = suffix - rand9;

  const startsAt = startOfDayMs + diffToday * durationMs;
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
