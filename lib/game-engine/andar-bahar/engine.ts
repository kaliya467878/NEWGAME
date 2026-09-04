import { Card, SettlementResult } from "../types";
import { createDeck } from "../deck";
import { shuffleDeck } from "../rng";

export interface AndarBaharResult {
  jokerCard: Card;
  andarCards: Card[];
  baharCards: Card[];
  winningSide: "andar" | "bahar";
  matchingCardCount: number;
}

export function resolveAndarBaharRound(scenario?: string): AndarBaharResult {
  if (scenario === "andar_first_match") {
    const joker: Card = { rank: "K", suit: "S" };
    return {
      jokerCard: joker,
      andarCards: [{ rank: "K", suit: "H" }],
      baharCards: [],
      winningSide: "andar",
      matchingCardCount: 1,
    };
  }

  if (scenario === "bahar_match") {
    const joker: Card = { rank: "8", suit: "D" };
    return {
      jokerCard: joker,
      andarCards: [{ rank: "2", suit: "C" }],
      baharCards: [{ rank: "8", suit: "S" }],
      winningSide: "bahar",
      matchingCardCount: 2,
    };
  }

  const deck = shuffleDeck(createDeck());
  const jokerCard = deck[0];
  const remaining = deck.slice(1);

  const andarCards: Card[] = [];
  const baharCards: Card[] = [];
  let winningSide: "andar" | "bahar" = "andar";
  let count = 0;

  for (let i = 0; i < remaining.length; i++) {
    const c = remaining[i];
    count++;
    if (i % 2 === 0) {
      andarCards.push(c);
      if (c.rank === jokerCard.rank) {
        winningSide = "andar";
        break;
      }
    } else {
      baharCards.push(c);
      if (c.rank === jokerCard.rank) {
        winningSide = "bahar";
        break;
      }
    }
  }

  return { jokerCard, andarCards, baharCards, winningSide, matchingCardCount: count };
}

export function settleAndarBaharBets(
  result: AndarBaharResult,
  bets: { id: string; userId: string; betType: "andar" | "bahar"; amount: number }[]
): SettlementResult[] {
  const payouts = {
    andar: 1.9,
    bahar: 2.0,
  };

  return bets.map((bet) => {
    const won = bet.betType === result.winningSide;
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
