export type GameId =
  | "dragon_tiger"
  | "blackjack"
  | "roulette"
  | "baccarat"
  | "sicbo"
  | "seven_up_down"
  | "andar_bahar"
  | "teen_patti";

export type RoundStatus =
  | "WAITING"
  | "BETTING"
  | "DEALING"
  | "PLAYER_TURN"
  | "DEALER_TURN"
  | "RESOLVING"
  | "SETTLEMENT"
  | "COMPLETED"
  | "CANCELLED";

export interface Card {
  rank: string; // '2'..'10', 'J', 'Q', 'K', 'A'
  suit: "S" | "H" | "D" | "C"; // Spades, Hearts, Diamonds, Clubs
}

export interface BaseBet {
  id: string;
  userId: string;
  gameId: GameId;
  roundId: string;
  betType: string;
  betValue: string;
  amount: number;
  status: "PENDING" | "WON" | "LOST" | "PUSH" | "REFUNDED";
  payout: number;
  createdAt: string;
}

export interface BaseRound {
  id: string;
  gameId: GameId;
  roundId: string;
  durationSeconds?: number;
  status: RoundStatus;
  startTime: string;
  endTime: string;
  simulation?: boolean;
  environment?: string;
  result?: any;
}

export interface SettlementResult {
  betId: string;
  userId: string;
  amount: number;
  payout: number;
  profit: number;
  status: "WON" | "LOST" | "PUSH" | "REFUNDED";
}

export interface GameEngine<TRound extends BaseRound, TBet extends BaseBet, TResult> {
  createRound(params?: any): TRound;
  validateBet(bet: Partial<TBet>, round: TRound): { valid: boolean; error?: string };
  resolveRound(round: TRound, scenario?: string): TResult;
  calculateSettlement(result: TResult, bets: TBet[]): SettlementResult[];
}
