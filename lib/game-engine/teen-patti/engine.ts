import { Card, SettlementResult } from "../types";
import { createDeck, getCardValue } from "../deck";
import { shuffleDeck } from "../rng";

export type TeenPattiHandType =
  | "TRAIL"
  | "PURE_SEQUENCE"
  | "SEQUENCE"
  | "COLOR"
  | "PAIR"
  | "HIGH_CARD";

export interface TeenPattiHandEval {
  cards: Card[];
  type: TeenPattiHandType;
  rankScore: number;
}

export function evaluateTeenPattiHand(cards: Card[]): TeenPattiHandEval {
  const vals = cards.map((c) => getCardValue(c, true)).sort((a, b) => b - a); // desc
  const isFlush = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;

  // Trio
  if (vals[0] === vals[1] && vals[1] === vals[2]) {
    return { cards, type: "TRAIL", rankScore: 60000 + vals[0] };
  }

  // Check straight (AKQ, A23, etc.)
  let isStraight = false;
  let straightHigh = vals[0];
  if (vals[0] === vals[1] + 1 && vals[1] === vals[2] + 1) {
    isStraight = true;
  } else if (vals[0] === 14 && vals[1] === 3 && vals[2] === 2) {
    // A-2-3
    isStraight = true;
    straightHigh = 3;
  }

  if (isFlush && isStraight) {
    return { cards, type: "PURE_SEQUENCE", rankScore: 50000 + straightHigh };
  }

  if (isStraight) {
    return { cards, type: "SEQUENCE", rankScore: 40000 + straightHigh };
  }

  if (isFlush) {
    return { cards, type: "COLOR", rankScore: 30000 + vals[0] * 100 + vals[1] * 10 + vals[2] };
  }

  // Pair
  if (vals[0] === vals[1]) {
    return { cards, type: "PAIR", rankScore: 20000 + vals[0] * 10 + vals[2] };
  }
  if (vals[1] === vals[2]) {
    return { cards, type: "PAIR", rankScore: 20000 + vals[1] * 10 + vals[0] };
  }

  return { cards, type: "HIGH_CARD", rankScore: 10000 + vals[0] * 100 + vals[1] * 10 + vals[2] };
}

export interface TeenPattiResult {
  playerCards: Card[];
  dealerCards: Card[];
  playerEval: TeenPattiHandEval;
  dealerEval: TeenPattiHandEval;
  winner: "player" | "dealer" | "push";
}

export function resolveTeenPattiRound(scenario?: string): TeenPattiResult {
  if (scenario === "trio_win") {
    const pCards: Card[] = [{ rank: "A", suit: "S" }, { rank: "A", suit: "H" }, { rank: "A", suit: "D" }];
    const dCards: Card[] = [{ rank: "K", suit: "C" }, { rank: "Q", suit: "C" }, { rank: "J", suit: "C" }];
    return {
      playerCards: pCards,
      dealerCards: dCards,
      playerEval: evaluateTeenPattiHand(pCards),
      dealerEval: evaluateTeenPattiHand(dCards),
      winner: "player",
    };
  }

  if (scenario === "pure_sequence") {
    const pCards: Card[] = [{ rank: "K", suit: "S" }, { rank: "Q", suit: "S" }, { rank: "J", suit: "S" }];
    const dCards: Card[] = [{ rank: "10", suit: "H" }, { rank: "10", suit: "D" }, { rank: "4", suit: "C" }];
    return {
      playerCards: pCards,
      dealerCards: dCards,
      playerEval: evaluateTeenPattiHand(pCards),
      dealerEval: evaluateTeenPattiHand(dCards),
      winner: "player",
    };
  }

  const deck = shuffleDeck(createDeck());
  const playerCards = [deck[0], deck[1], deck[2]];
  const dealerCards = [deck[3], deck[4], deck[5]];

  const playerEval = evaluateTeenPattiHand(playerCards);
  const dealerEval = evaluateTeenPattiHand(dealerCards);

  let winner: "player" | "dealer" | "push" = "push";
  if (playerEval.rankScore > dealerEval.rankScore) winner = "player";
  else if (dealerEval.rankScore > playerEval.rankScore) winner = "dealer";

  return { playerCards, dealerCards, playerEval, dealerEval, winner };
}

export function settleTeenPattiBets(
  result: TeenPattiResult,
  bets: { id: string; userId: string; betType: "ante" | "pair_plus"; amount: number }[]
): SettlementResult[] {
  return bets.map((bet) => {
    let won = false;
    let multiplier = 0;

    if (bet.betType === "ante") {
      if (result.winner === "player") {
        won = true;
        multiplier = 2.0;
      } else if (result.winner === "push") {
        won = true;
        multiplier = 1.0;
      }
    } else if (bet.betType === "pair_plus") {
      const type = result.playerEval.type;
      if (type === "TRAIL") { won = true; multiplier = 41; }
      else if (type === "PURE_SEQUENCE") { won = true; multiplier = 31; }
      else if (type === "SEQUENCE") { won = true; multiplier = 7; }
      else if (type === "COLOR") { won = true; multiplier = 5; }
      else if (type === "PAIR") { won = true; multiplier = 2; }
    }

    const payout = won ? Math.floor(bet.amount * multiplier) : 0;
    return {
      betId: bet.id,
      userId: bet.userId,
      amount: bet.amount,
      payout,
      profit: payout - bet.amount,
      status: won ? (multiplier === 1 ? "PUSH" : "WON") : "LOST",
    };
  });
}
