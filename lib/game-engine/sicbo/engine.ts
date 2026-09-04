import { SettlementResult } from "../types";
import { secureRandomInt } from "../rng";

export interface SicBoResult {
  dice: [number, number, number];
  sum: number;
  isTriple: boolean;
  isSmall: boolean;
  isBig: boolean;
  isOdd: boolean;
  isEven: boolean;
}

export function resolveSicBoRound(scenario?: string): SicBoResult {
  let dice: [number, number, number] = [
    secureRandomInt(1, 7),
    secureRandomInt(1, 7),
    secureRandomInt(1, 7),
  ];

  if (scenario === "small_val") dice = [2, 3, 4];
  if (scenario === "big_val") dice = [4, 5, 6];
  if (scenario === "triple_fours") dice = [4, 4, 4];

  const sum = dice[0] + dice[1] + dice[2];
  const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
  const isSmall = !isTriple && sum >= 4 && sum <= 10;
  const isBig = !isTriple && sum >= 11 && sum <= 17;
  const isOdd = !isTriple && sum % 2 === 1;
  const isEven = !isTriple && sum % 2 === 0;

  return { dice, sum, isTriple, isSmall, isBig, isOdd, isEven };
}

export function settleSicBoBets(
  result: SicBoResult,
  bets: { id: string; userId: string; betType: string; selection: string; amount: number }[]
): SettlementResult[] {
  const sumPaytable: Record<number, number> = {
    4: 61, 17: 61,
    5: 31, 16: 31,
    6: 19, 15: 19,
    7: 13, 14: 13,
    8: 9, 13: 9,
    9: 7, 10: 7, 11: 7, 12: 7,
  };

  return bets.map((bet) => {
    let won = false;
    let multiplier = 0;
    const type = bet.betType.toLowerCase();
    const sel = bet.selection.toLowerCase();

    if (type === "small" || sel === "small") {
      if (result.isSmall) { won = true; multiplier = 2; }
    } else if (type === "big" || sel === "big") {
      if (result.isBig) { won = true; multiplier = 2; }
    } else if (type === "odd" || sel === "odd") {
      if (result.isOdd) { won = true; multiplier = 2; }
    } else if (type === "even" || sel === "even") {
      if (result.isEven) { won = true; multiplier = 2; }
    } else if (type === "triple_any" || sel === "any_triple") {
      if (result.isTriple) { won = true; multiplier = 31; }
    } else if (type === "triple_specific" || type === "triple") {
      const target = Number(sel);
      if (result.isTriple && result.dice[0] === target) { won = true; multiplier = 181; }
    } else if (type === "double_specific" || type === "double") {
      const target = Number(sel);
      const matchCount = result.dice.filter((d) => d === target).length;
      if (matchCount >= 2) { won = true; multiplier = 11; }
    } else if (type === "sum" || type.startsWith("sum_")) {
      const targetSum = Number(sel.replace("sum_", ""));
      if (result.sum === targetSum) {
        won = true;
        multiplier = sumPaytable[targetSum] || 7;
      }
    } else if (type === "single" || !isNaN(Number(sel))) {
      const target = Number(sel);
      const matchCount = result.dice.filter((d) => d === target).length;
      if (matchCount > 0) {
        won = true;
        multiplier = matchCount + 1; // 1 match=2x, 2=3x, 3=4x
      }
    }

    const payout = won ? Math.floor(bet.amount * multiplier) : 0;
    return {
      betId: bet.id,
      userId: bet.userId,
      amount: bet.amount,
      payout,
      profit: payout - bet.amount,
      status: won ? "WON" : "LOST",
    };
  });
}
