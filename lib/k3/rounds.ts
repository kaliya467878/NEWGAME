import type { K3BetType, K3Mode } from "@/generated/prisma/client";

export const MODE_DURATIONS_SECONDS: Record<K3Mode, number> = {
  S30: 30,
  M1: 60,
  M3: 180,
  M5: 300,
  M10: 600,
};

export const LOCK_SECONDS = 5;

// Classic K3 sum paytable (fair odds, keyed by sum 3..18 — multiplier
// reflects how many of the 216 dice combinations produce that sum, rarer
// sums pay more), before the platform bet fee below is applied.
const FAIR_SUM_MULTIPLIERS: Record<number, number> = {
  3: 180, 18: 180,
  4: 90, 17: 90,
  5: 60, 16: 60,
  6: 45, 15: 45,
  7: 34, 14: 34,
  8: 27, 13: 27,
  9: 25, 12: 25,
  10: 24, 11: 24,
};

// Platform bet fee: a flat 2% cut applied uniformly across every K3 bet
// type, same as Wingo — a 100 bet has a 98 "contract amount", and every
// multiplier below is the fair odds net of that 2% fee.
export const BET_FEE = 0.02;
const SUM_MULTIPLIERS: Record<number, number> = Object.fromEntries(
  Object.entries(FAIR_SUM_MULTIPLIERS).map(([sum, multiplier]) => [sum, multiplier * (1 - BET_FEE)])
);
const SUM_BIG_SMALL_MULTIPLIER = 2 * (1 - BET_FEE);

// Fair odds matching the K3 bet sheet UI (components/k3/K3GameScreen.js),
// net of the same 2% fee.
const ANY_TRIPLE_MULTIPLIER = 34.56 * (1 - BET_FEE);
const TWO_SAME_SPECIFIC_MULTIPLIER = 13.8 * (1 - BET_FEE);
const TWO_SAME_UNIQUE_MULTIPLIER = 69.12 * (1 - BET_FEE);
const THREE_SAME_SPECIFIC_MULTIPLIER = 207.36 * (1 - BET_FEE);
const THREE_DIFFERENT_MULTIPLIER = 34.56 * (1 - BET_FEE);
const TWO_DIFFERENT_MULTIPLIER = 6.91 * (1 - BET_FEE);
const THREE_CONTINUOUS_MULTIPLIER = 8.64 * (1 - BET_FEE);

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
export function getStartRoundNumber(mode: K3Mode): bigint {
  const modeCode = getModeCode(mode);
  return BigInt(`202611100${modeCode}00001`);
}

export function getRoundNumber(mode: K3Mode, atMs: number = Date.now()): bigint {
  const durationMs = MODE_DURATIONS_SECONDS[mode] * 1000;
  const rawRound = Math.floor(atMs / durationMs);
  const rawRoundAtT0 = Math.floor(T_0 / durationMs);
  const diff = rawRound - rawRoundAtT0;
  const startRound = getStartRoundNumber(mode);
  return startRound + BigInt(diff);
}

export function getRoundWindow(mode: K3Mode, roundNumber: bigint) {
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

export function rollDice(): [number, number, number] {
  const die = () => Math.floor(Math.random() * 6) + 1;
  return [die(), die(), die()];
}

export function sumBigSmall(sum: number): "BIG" | "SMALL" {
  return sum >= 11 ? "BIG" : "SMALL";
}

export function sumOddEven(sum: number): "ODD" | "EVEN" {
  return sum % 2 === 0 ? "EVEN" : "ODD";
}

/** Returns the payout multiplier for a bet given the settled dice, or 0 if it lost. */
export function resolveBetMultiplier(
  bet: { betType: K3BetType; selection: string },
  dice: [number, number, number]
): number {
  const sum = dice[0] + dice[1] + dice[2];

  if (bet.betType === "SUM_VALUE") {
    return Number(bet.selection) === sum ? SUM_MULTIPLIERS[sum] ?? 0 : 0;
  }

  if (bet.betType === "SUM_BIG_SMALL") {
    return bet.selection.toUpperCase() === sumBigSmall(sum) ? SUM_BIG_SMALL_MULTIPLIER : 0;
  }

  if (bet.betType === "SUM_ODD_EVEN") {
    return bet.selection.toUpperCase() === sumOddEven(sum) ? SUM_BIG_SMALL_MULTIPLIER : 0;
  }

  if (bet.betType === "ANY_TRIPLE") {
    return dice[0] === dice[1] && dice[1] === dice[2] ? ANY_TRIPLE_MULTIPLIER : 0;
  }

  // Selection formats below are normalized server-side in app/api/k3/[mode]/bet
  // before being stored, so settlement here can assume they're well-formed.
  const sorted = [...dice].sort((a, b) => a - b);

  if (bet.betType === "TWO_SAME_SPECIFIC") {
    // Wins if at least 2 of the 3 dice show this specific number (covers the
    // triple case too — a stricter "exactly 2" reading would just make the
    // rare triple lose both this bet and its own; paying it out here is the
    // standard K3 rule and matches the advertised ~13.8x odds).
    const digit = Number(bet.selection);
    const count = dice.filter((d) => d === digit).length;
    return count >= 2 ? TWO_SAME_SPECIFIC_MULTIPLIER : 0;
  }

  if (bet.betType === "TWO_SAME_UNIQUE") {
    // selection: "<pairDigit>_<singleDigit>" — exactly two dice show pairDigit
    // and the third shows singleDigit (order-independent).
    const [pairDigit, singleDigit] = bet.selection.split("_").map(Number);
    const target = [pairDigit, pairDigit, singleDigit].sort((a, b) => a - b);
    return sorted[0] === target[0] && sorted[1] === target[1] && sorted[2] === target[2]
      ? TWO_SAME_UNIQUE_MULTIPLIER
      : 0;
  }

  if (bet.betType === "THREE_SAME_SPECIFIC") {
    const digit = Number(bet.selection);
    return dice[0] === digit && dice[1] === digit && dice[2] === digit
      ? THREE_SAME_SPECIFIC_MULTIPLIER
      : 0;
  }

  if (bet.betType === "THREE_DIFFERENT") {
    // selection: 3 sorted distinct digits concatenated, e.g. "123".
    const target = bet.selection.split("").map(Number).sort((a, b) => a - b);
    return sorted[0] === target[0] && sorted[1] === target[1] && sorted[2] === target[2]
      ? THREE_DIFFERENT_MULTIPLIER
      : 0;
  }

  if (bet.betType === "TWO_DIFFERENT") {
    // selection: 2 sorted distinct digits concatenated, e.g. "12". Wins if
    // both values appear at least once among the 3 dice (third die is free).
    const [a, b] = bet.selection.split("").map(Number);
    const present = new Set(dice);
    return present.has(a) && present.has(b) ? TWO_DIFFERENT_MULTIPLIER : 0;
  }

  if (bet.betType === "THREE_CONTINUOUS") {
    const isConsecutive = sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2];
    return isConsecutive ? THREE_CONTINUOUS_MULTIPLIER : 0;
  }

  return 0;
}
