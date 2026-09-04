import { GameId } from "./types";

export interface QAScenario {
  id: string;
  gameId: GameId;
  name: string;
  description: string;
}

export const QA_SCENARIOS: Record<GameId, QAScenario[]> = {
  dragon_tiger: [
    { id: "dragon_win", gameId: "dragon_tiger", name: "Dragon Win", description: "Dragon gets King, Tiger gets 7" },
    { id: "tiger_win", gameId: "dragon_tiger", name: "Tiger Win", description: "Dragon gets 4, Tiger gets Queen" },
    { id: "tie", gameId: "dragon_tiger", name: "Tie Game", description: "Both get 9s" },
  ],
  blackjack: [
    { id: "player_blackjack", gameId: "blackjack", name: "Player Natural Blackjack", description: "Player gets Ace+King, Dealer 10+7" },
    { id: "dealer_blackjack", gameId: "blackjack", name: "Dealer Natural Blackjack", description: "Player 10+9, Dealer Ace+Jack" },
    { id: "player_bust", gameId: "blackjack", name: "Player Bust", description: "Player hits to 23" },
    { id: "push", gameId: "blackjack", name: "Push (Tie)", description: "Both Player and Dealer get 19" },
  ],
  roulette: [
    { id: "red_32", gameId: "roulette", name: "Red 32", description: "Wheel lands on Red 32" },
    { id: "black_17", gameId: "roulette", name: "Black 17", description: "Wheel lands on Black 17" },
    { id: "zero", gameId: "roulette", name: "Single Zero (0)", description: "Wheel lands on Green 0" },
  ],
  baccarat: [
    { id: "player_win", gameId: "baccarat", name: "Player Win (8 vs 4)", description: "Player natural 8, Banker 4" },
    { id: "banker_win", gameId: "baccarat", name: "Banker Win (7 vs 5)", description: "Banker 7, Player 5" },
    { id: "tie", gameId: "baccarat", name: "Tie Game (6 vs 6)", description: "Both Player and Banker 6" },
  ],
  sicbo: [
    { id: "small_val", gameId: "sicbo", name: "Small (2-3-4 = 9)", description: "Dice roll 2, 3, 4" },
    { id: "big_val", gameId: "sicbo", name: "Big (4-5-6 = 15)", description: "Dice roll 4, 5, 6" },
    { id: "triple_fours", gameId: "sicbo", name: "Triple Fours (4-4-4)", description: "Dice roll 4, 4, 4" },
  ],
  seven_up_down: [
    { id: "seven_down", gameId: "seven_up_down", name: "7 DOWN (2-3 = 5)", description: "Dice sum 5" },
    { id: "seven_exact", gameId: "seven_up_down", name: "EXACT 7 (3-4 = 7)", description: "Dice sum 7" },
    { id: "seven_up", gameId: "seven_up_down", name: "7 UP (5-5 = 10)", description: "Dice sum 10" },
  ],
  andar_bahar: [
    { id: "andar_first_match", gameId: "andar_bahar", name: "Andar First Card Match", description: "Joker King, 1st Andar card King" },
    { id: "bahar_match", gameId: "andar_bahar", name: "Bahar Card Match", description: "Joker 8, Bahar gets matching 8" },
  ],
  teen_patti: [
    { id: "trio_win", gameId: "teen_patti", name: "Player Trio (A-A-A)", description: "Player gets AAA, Dealer gets KQJ" },
    { id: "pure_sequence", gameId: "teen_patti", name: "Player Pure Sequence", description: "Player gets K-Q-J Spades" },
    { id: "high_card", gameId: "teen_patti", name: "High Card Win", description: "Player A-K-5 vs Dealer Q-J-9" },
  ],
};
