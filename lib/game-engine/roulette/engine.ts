import { SettlementResult } from "../types";
import { secureRandomInt } from "../rng";

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export interface RouletteBet {
  id: string;
  userId: string;
  betType: string;
  selection: string; // "0", "00", "1".."36", "red", "black", "even", "odd", "low", "high", "dozen1", "dozen2", "dozen3", "col1", "col2", "col3"
  amount: number;
}

export interface RouletteResult {
  winningSlot: string; // "0", "00", or "1".."36"
  winningNumber: number | string;
  color: "red" | "black" | "green";
  isEven: boolean;
  isHigh: boolean;
  dozen: 1 | 2 | 3 | null;
  column: 1 | 2 | 3 | null;
}

export function resolveRouletteRound(scenario?: string): RouletteResult {
  // American Roulette has 38 slots: 0, 00, 1..36
  const randSlotIdx = secureRandomInt(0, 38);
  let slotStr: string;

  if (randSlotIdx === 37) {
    slotStr = "00";
  } else {
    slotStr = String(randSlotIdx);
  }

  if (scenario === "red_32") slotStr = "32";
  if (scenario === "black_17") slotStr = "17";
  if (scenario === "zero") slotStr = "0";
  if (scenario === "double_zero") slotStr = "00";

  const numVal = slotStr === "00" ? -1 : Number(slotStr);
  const color = slotStr === "0" || slotStr === "00" ? "green" : RED_NUMBERS.includes(numVal) ? "red" : "black";
  const isEven = numVal > 0 && numVal % 2 === 0;
  const isHigh = numVal >= 19 && numVal <= 36;

  let dozen: 1 | 2 | 3 | null = null;
  if (numVal >= 1 && numVal <= 12) dozen = 1;
  else if (numVal >= 13 && numVal <= 24) dozen = 2;
  else if (numVal >= 25 && numVal <= 36) dozen = 3;

  let column: 1 | 2 | 3 | null = null;
  if (numVal > 0) {
    const rem = numVal % 3;
    column = rem === 1 ? 1 : rem === 2 ? 2 : 3;
  }

  return { winningSlot: slotStr, winningNumber: slotStr === "00" ? "00" : numVal, color, isEven, isHigh, dozen, column };
}

export function settleRouletteBets(result: RouletteResult, bets: RouletteBet[]): SettlementResult[] {
  const slot = result.winningSlot;
  const num = typeof result.winningNumber === "number" ? result.winningNumber : -1;

  return bets.map((bet) => {
    let won = false;
    let multiplier = 0;

    const sel = bet.selection.toLowerCase();
    const type = bet.betType.toLowerCase();

    if (type === "straight" || !isNaN(Number(sel)) || sel === "00" || sel === "0") {
      if (sel === slot.toLowerCase()) {
        won = true;
        multiplier = 36;
      }
    } else if (sel === "red" && result.color === "red") {
      won = true;
      multiplier = 2;
    } else if (sel === "black" && result.color === "black") {
      won = true;
      multiplier = 2;
    } else if (sel === "even" && num > 0 && result.isEven) {
      won = true;
      multiplier = 2;
    } else if (sel === "odd" && num > 0 && !result.isEven) {
      won = true;
      multiplier = 2;
    } else if (sel === "low" && num >= 1 && num <= 18) {
      won = true;
      multiplier = 2;
    } else if (sel === "high" && result.isHigh) {
      won = true;
      multiplier = 2;
    } else if ((sel === "dozen1" || sel === "1st-12" || sel === "1st_12") && result.dozen === 1) {
      won = true;
      multiplier = 3;
    } else if ((sel === "dozen2" || sel === "2nd-12" || sel === "2nd_12") && result.dozen === 2) {
      won = true;
      multiplier = 3;
    } else if ((sel === "dozen3" || sel === "3rd-12" || sel === "3rd_12") && result.dozen === 3) {
      won = true;
      multiplier = 3;
    } else if ((sel === "col1" || sel === "2:1_1") && result.column === 1) {
      won = true;
      multiplier = 3;
    } else if ((sel === "col2" || sel === "2:1_2") && result.column === 2) {
      won = true;
      multiplier = 3;
    } else if ((sel === "col3" || sel === "2:1_3") && result.column === 3) {
      won = true;
      multiplier = 3;
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
