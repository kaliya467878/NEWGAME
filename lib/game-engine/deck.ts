import { Card } from "./types";
import { shuffleDeck } from "./rng";

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
export const SUITS = ["S", "H", "D", "C"] as const;

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ rank, suit });
    }
  }
  return cards;
}

export function createShoe(deckCount = 6): Card[] {
  let shoe: Card[] = [];
  for (let i = 0; i < deckCount; i++) {
    shoe = shoe.concat(createDeck());
  }
  return shuffleDeck(shoe);
}

export function getCardValue(card: Card, aceHigh = false): number {
  if (card.rank === "A") return aceHigh ? 14 : 1;
  if (card.rank === "K") return 13;
  if (card.rank === "Q") return 12;
  if (card.rank === "J") return 11;
  return Number(card.rank);
}

export function getBlackjackCardValue(card: Card): number {
  if (["K", "Q", "J"].includes(card.rank)) return 10;
  if (card.rank === "A") return 11;
  return Number(card.rank);
}
