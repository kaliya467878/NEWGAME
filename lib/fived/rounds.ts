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
export function getStartRoundNumber(mode: FiveDMode): bigint {
  const modeCode = getModeCode(mode);
  return BigInt(`202611100${modeCode}00001`);
}

export function getRoundNumber(mode: FiveDMode, atMs: number = Date.now()): bigint {
  const durationMs = MODE_DURATIONS_SECONDS[mode] * 1000;
  const rawRound = Math.floor(atMs / durationMs);
  const rawRoundAtT0 = Math.floor(T_0 / durationMs);
  const diff = rawRound - rawRoundAtT0;
  const startRound = getStartRoundNumber(mode);
  return startRound + BigInt(diff);
}

export function getRoundWindow(mode: FiveDMode, roundNumber: bigint) {
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
    return Number(digitStr) === digits[posIndex] ? POSITION_NUMBER_MULTIPLIER : 0;
  }

  if (bet.betType === "SUM_BIG_SMALL") {
    return bet.selection.toUpperCase() === sumBigSmall(sum) ? SUM_BIG_SMALL_MULTIPLIER : 0;
  }

  if (bet.betType === "SUM_ODD_EVEN") {
    return bet.selection.toUpperCase() === sumOddEven(sum) ? SUM_ODD_EVEN_MULTIPLIER : 0;
  }

  return 0;
}
