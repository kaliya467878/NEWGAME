import { Card, SettlementResult } from "../types";
import { createShoe, getBlackjackCardValue } from "../deck";
import { shuffleDeck } from "../rng";

export interface BlackjackHand {
  cards: Card[];
  value: number;
  isSoft: boolean;
  isBust: boolean;
  isBlackjack: boolean;
}

export function evaluateBlackjackHand(cards: Card[]): BlackjackHand {
  let value = 0;
  let aceCount = 0;

  for (const c of cards) {
    const val = getBlackjackCardValue(c);
    value += val;
    if (c.rank === "A") aceCount++;
  }

  while (value > 21 && aceCount > 0) {
    value -= 10;
    aceCount--;
  }

  const isSoft = aceCount > 0;
  const isBust = value > 21;
  const isBlackjack = cards.length === 2 && value === 21;

  return { cards, value, isSoft, isBust, isBlackjack };
}

export interface BlackjackResult {
  playerHand: BlackjackHand;
  dealerHand: BlackjackHand;
  outcome: "PLAYER_WIN" | "DEALER_WIN" | "PUSH" | "PLAYER_BLACKJACK" | "PLAYER_BUST";
  payoutMultiplier: number;
}

export function resolveBlackjackRound(
  playerCards: Card[],
  dealerCards: Card[],
  scenario?: string
): BlackjackResult {
  if (scenario === "player_blackjack") {
    const pHand = evaluateBlackjackHand([
      { rank: "A", suit: "S" },
      { rank: "K", suit: "D" },
    ]);
    const dHand = evaluateBlackjackHand([
      { rank: "10", suit: "H" },
      { rank: "7", suit: "C" },
    ]);
    return {
      playerHand: pHand,
      dealerHand: dHand,
      outcome: "PLAYER_BLACKJACK",
      payoutMultiplier: 2.5, // 3:2 payout (bet 100 -> win 250)
    };
  }

  if (scenario === "dealer_blackjack") {
    const pHand = evaluateBlackjackHand([
      { rank: "10", suit: "S" },
      { rank: "9", suit: "D" },
    ]);
    const dHand = evaluateBlackjackHand([
      { rank: "A", suit: "H" },
      { rank: "J", suit: "C" },
    ]);
    return {
      playerHand: pHand,
      dealerHand: dHand,
      outcome: "DEALER_WIN",
      payoutMultiplier: 0,
    };
  }

  if (scenario === "player_bust") {
    const pHand = evaluateBlackjackHand([
      { rank: "10", suit: "S" },
      { rank: "8", suit: "D" },
      { rank: "6", suit: "C" },
    ]); // 24
    const dHand = evaluateBlackjackHand([
      { rank: "10", suit: "H" },
      { rank: "7", suit: "S" },
    ]);
    return {
      playerHand: pHand,
      dealerHand: dHand,
      outcome: "PLAYER_BUST",
      payoutMultiplier: 0,
    };
  }

  if (scenario === "push") {
    const pHand = evaluateBlackjackHand([
      { rank: "10", suit: "S" },
      { rank: "9", suit: "D" },
    ]);
    const dHand = evaluateBlackjackHand([
      { rank: "10", suit: "H" },
      { rank: "9", suit: "C" },
    ]);
    return {
      playerHand: pHand,
      dealerHand: dHand,
      outcome: "PUSH",
      payoutMultiplier: 1.0, // Push returns bet
    };
  }

  const pHand = evaluateBlackjackHand(playerCards);
  let dHand = evaluateBlackjackHand(dealerCards);

  // Dealer hits on 16 or below
  const shoe = createShoe(1);
  let cardIdx = 0;
  while (dHand.value < 17 && !pHand.isBust) {
    dealerCards.push(shoe[cardIdx++]);
    dHand = evaluateBlackjackHand(dealerCards);
  }

  if (pHand.isBust) {
    return { playerHand: pHand, dealerHand: dHand, outcome: "PLAYER_BUST", payoutMultiplier: 0 };
  }

  if (pHand.isBlackjack && !dHand.isBlackjack) {
    return { playerHand: pHand, dealerHand: dHand, outcome: "PLAYER_BLACKJACK", payoutMultiplier: 2.5 };
  }

  if (dHand.isBust || pHand.value > dHand.value) {
    return { playerHand: pHand, dealerHand: dHand, outcome: "PLAYER_WIN", payoutMultiplier: 2.0 };
  }

  if (pHand.value === dHand.value) {
    return { playerHand: pHand, dealerHand: dHand, outcome: "PUSH", payoutMultiplier: 1.0 };
  }

  return { playerHand: pHand, dealerHand: dHand, outcome: "DEALER_WIN", payoutMultiplier: 0 };
}
