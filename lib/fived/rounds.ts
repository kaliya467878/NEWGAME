import type { FiveDBetType, FiveDMode } from "@/generated/prisma/client";

export const MODE_DURATIONS_SECONDS: Record<FiveDMode, number> = {
  S30: 30,
  M1: 60,
  M3: 180,
  M5: 300,
  M10: 600,
};

export const LOCK_SECONDS = 5;

export const POSITIONS = ["A", "B", "C", "D", "E"] as const;
export type Position = (typeof POSITIONS)[number];

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
  if (mode === "M10") return "10";
  return "00";
}

// Round numbers embed the date directly (e.g. 2026071110010...), which
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

export function getStartRoundNumber(mode: FiveDMode): bigint {
  const rand9 = getDeterministic9Digits("fived", mode);
  return BigInt(`20260711${rand9}`);
}

export function getRoundNumber(mode: FiveDMode, atMs: number = Date.now()): bigint {
  const durationMs = MODE_DURATIONS_SECONDS[mode] * 1000;
  const istMs = atMs + 5.5 * 60 * 60 * 1000;
  const date = new Date(istMs);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const yyyymmdd = `${yyyy}${mm}${dd}`;

  const startOfDayMs = Date.UTC(yyyy, date.getUTCMonth(), date.getUTCDate()) - 5.5 * 60 * 60 * 1000;
  const diffToday = Math.floor((atMs - startOfDayMs) / durationMs);

  const rand9 = getDeterministic9Digits("fived", mode);
  return BigInt(yyyymmdd + rand9) + BigInt(diffToday);
}

export function getRoundWindow(mode: FiveDMode, roundNumber: bigint) {
  const durationMs = MODE_DURATIONS_SECONDS[mode] * 1000;
  const roundStr = roundNumber.toString();
  const yyyymmdd = roundStr.slice(0, 8);
  const yyyy = Number(yyyymmdd.slice(0, 4));
  const mm = Number(yyyymmdd.slice(4, 6)) - 1;
  const dd = Number(yyyymmdd.slice(6, 8));

  const startOfDayMs = Date.UTC(yyyy, mm, dd) - 5.5 * 60 * 60 * 1000;
  const suffix = Number(roundStr.slice(8));
  const rand9 = getDeterministic9Digits("fived", mode);
  const diffToday = suffix - rand9;

  const startsAt = startOfDayMs + diffToday * durationMs;
  const endsAt = startsAt + durationMs;
  const locksAt = endsAt - LOCK_SECONDS * 1000;
  return { startsAt, endsAt, locksAt };
}

export function rollDigits(): [number, number, number, number, number] {
  const digit = () => Math.floor(Math.random() * 10);
  return [digit(), digit(), digit(), digit(), digit()];
}

export function sumBigSmall(sum: number): "BIG" | "SMALL" {
  return sum >= 23 ? "BIG" : "SMALL";
}

export function sumOddEven(sum: number): "ODD" | "EVEN" {
  return sum % 2 === 0 ? "EVEN" : "ODD";
}

// Platform bet fee: a flat 2% cut applied uniformly across every 5D bet
// type, same as Wingo/K3 — a 100 bet has a 98 "contract amount", and every
// multiplier below is the fair odds (9x position, 2x sum big/small and
// odd/even) net of that 2% fee.
export const BET_FEE = 0.02;
const POSITION_NUMBER_MULTIPLIER = 9 * (1 - BET_FEE);
const SUM_BIG_SMALL_MULTIPLIER = 2 * (1 - BET_FEE);
const SUM_ODD_EVEN_MULTIPLIER = 2 * (1 - BET_FEE);

/** Returns the payout multiplier for a bet given the settled digits, or 0 if it lost. */
export function resolveBetMultiplier(
  bet: { betType: FiveDBetType; selection: string },
  digits: [number, number, number, number, number]
): number {
  const sum = digits.reduce((a, b) => a + b, 0);

  if (bet.betType === "POSITION_NUMBER") {
    const [posLabel, digitStr] = bet.selection.split(":");
    const posIndex = POSITIONS.indexOf(posLabel as Position);
    if (posIndex === -1) return 0;
    const digit = digits[posIndex];
    if (digitStr === "BIG") return digit >= 5 ? SUM_BIG_SMALL_MULTIPLIER : 0;
    if (digitStr === "SMALL") return digit <= 4 ? SUM_BIG_SMALL_MULTIPLIER : 0;
    if (digitStr === "ODD") return digit % 2 !== 0 ? SUM_ODD_EVEN_MULTIPLIER : 0;
    if (digitStr === "EVEN") return digit % 2 === 0 ? SUM_ODD_EVEN_MULTIPLIER : 0;
    return Number(digitStr) === digit ? POSITION_NUMBER_MULTIPLIER : 0;
  }

  if (bet.betType === "SUM_BIG_SMALL") {
    return bet.selection.toUpperCase() === sumBigSmall(sum) ? SUM_BIG_SMALL_MULTIPLIER : 0;
  }

  if (bet.betType === "SUM_ODD_EVEN") {
    return bet.selection.toUpperCase() === sumOddEven(sum) ? SUM_ODD_EVEN_MULTIPLIER : 0;
  }

  return 0;
}
