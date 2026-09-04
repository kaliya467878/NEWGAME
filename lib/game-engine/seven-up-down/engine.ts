import { SettlementResult } from "../types";
import { secureRandomInt, pickRandomItem } from "../rng";

export interface ExtraPayBoost {
  number: number;
  multiplier: number;
}

export interface SevenUpDownResult {
  dice: [number, number];
  sum: number;
  outcome: "seven_down" | "seven_exact" | "seven_up";
  extraPay: ExtraPayBoost;
}

export const NUMBER_PAYTABLE: Record<number, number> = {
  2: 30,
  3: 15,
  4: 10,
  5: 7,
  6: 5,
  7: 5,
  8: 5,
  9: 7,
  10: 10,
  11: 15,
  12: 30,
};

export function resolveSevenUpDownRound(scenario?: string): SevenUpDownResult {
  let dice: [number, number] = [secureRandomInt(1, 7), secureRandomInt(1, 7)];

  if (scenario === "seven_down") dice = [2, 3];
  if (scenario === "seven_exact") dice = [3, 4];
  if (scenario === "seven_up") dice = [5, 5];

  const sum = dice[0] + dice[1];
  let outcome: "seven_down" | "seven_exact" | "seven_up" = "seven_exact";
  if (sum < 7) outcome = "seven_down";
  else if (sum > 7) outcome = "seven_up";

  // Extra Pay System: Pick a random number 2-12 and give it an Extra Pay Multiplier (e.g. 10x..50x)
  const boostedNum = secureRandomInt(2, 13);
  const boostMults = [10, 15, 20, 25, 50];
  const boostedMult = pickRandomItem(boostMults);

  return {
    dice,
    sum,
    outcome,
    extraPay: {
      number: boostedNum,
      multiplier: boostedMult,
    },
  };
}

export interface SevenUpDownBetInput {
  id: string;
  userId: string;
  betType: string; // "seven_down" | "seven_exact" | "seven_up" | "number" | "sum_X"
  selection?: string; // e.g. "2".."12"
  amount: number;
}

export function settleSevenUpDownBets(
  result: SevenUpDownResult,
  bets: SevenUpDownBetInput[]
): SettlementResult[] {
  const basePayouts = {
    seven_down: 2,
    seven_exact: 5,
    seven_up: 2,
  };

  return bets.map((bet) => {
    let won = false;
    let multiplier = 0;
    const type = bet.betType.toLowerCase();
    const selStr = (bet.selection || type.replace("sum_", "")).toLowerCase();
    const targetNum = Number(selStr);

    if (type === "seven_down" || selStr === "seven_down") {
      if (result.outcome === "seven_down") {
        won = true;
        multiplier = basePayouts.seven_down;
      }
    } else if (type === "seven_exact" || selStr === "seven_exact" || selStr === "7_exact") {
      if (result.outcome === "seven_exact") {
        won = true;
        multiplier = basePayouts.seven_exact;
      }
    } else if (type === "seven_up" || selStr === "seven_up") {
      if (result.outcome === "seven_up") {
        won = true;
        multiplier = basePayouts.seven_up;
      }
    } else if (!isNaN(targetNum) && targetNum >= 2 && targetNum <= 12) {
      if (result.sum === targetNum) {
        won = true;
        // Check if this number hit the Extra Pay Boost!
        if (result.extraPay && result.extraPay.number === targetNum) {
          multiplier = Math.max(NUMBER_PAYTABLE[targetNum] || 5, result.extraPay.multiplier);
        } else {
          multiplier = NUMBER_PAYTABLE[targetNum] || 5;
        }
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
