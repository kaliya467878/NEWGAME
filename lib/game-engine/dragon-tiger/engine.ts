import { Card, SettlementResult } from "../types";
import { createDeck, getCardValue } from "../deck";
import { shuffleDeck, secureRandomInt } from "../rng";

export interface DragonTigerBet {
  id: string;
  userId: string;
  betType: "dragon" | "tiger" | "tie";
  amount: number;
}

export interface DragonTigerResult {
  outcome: "dragon" | "tiger" | "tie";
  dragonCard: Card;
  tigerCard: Card;
}

export function resolveDragonTigerRound(scenario?: string): DragonTigerResult {
  if (scenario === "dragon_win") {
    return {
      outcome: "dragon",
      dragonCard: { rank: "K", suit: "S" },
      tigerCard: { rank: "7", suit: "H" },
    };
  }
  if (scenario === "tiger_win") {
    return {
      outcome: "tiger",
      dragonCard: { rank: "4", suit: "C" },
      tigerCard: { rank: "Q", suit: "D" },
    };
  }
  if (scenario === "tie") {
    return {
      outcome: "tie",
      dragonCard: { rank: "9", suit: "S" },
      tigerCard: { rank: "9", suit: "H" },
    };
  }

  const deck = shuffleDeck(createDeck());
  const dragonCard = deck[0];
  const tigerCard = deck[1];

  const dVal = getCardValue(dragonCard, true); // Ace High = 14
  const tVal = getCardValue(tigerCard, true);

  let outcome: "dragon" | "tiger" | "tie" = "tie";
  if (dVal > tVal) outcome = "dragon";
  else if (tVal > dVal) outcome = "tiger";

  return { outcome, dragonCard, tigerCard };
}

export function settleDragonTigerBets(result: DragonTigerResult, bets: DragonTigerBet[]): SettlementResult[] {
  const payouts = { dragon: 2, tiger: 2, tie: 9 };
  return bets.map((bet) => {
    const won = bet.betType === result.outcome;
    const mult = won ? payouts[bet.betType] : 0;
    const payout = Math.floor(bet.amount * mult);
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
