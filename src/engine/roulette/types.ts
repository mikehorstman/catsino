/** European roulette (single zero) domain types. */

export type BetType =
  | "straight" // 1 number, pays 35:1
  | "split" // 2 numbers, pays 17:1
  | "street" // 3 numbers, pays 11:1
  | "corner" // 4 numbers, pays 8:1
  | "line" // 6 numbers, pays 5:1
  | "dozen" // 12 numbers, pays 2:1
  | "column" // 12 numbers, pays 2:1
  | "red"
  | "black"
  | "odd"
  | "even"
  | "low" // 1-18
  | "high"; // 19-36

export interface Bet {
  type: BetType;
  /** Numbers this bet covers. */
  selection: number[];
  amount: number;
}

export interface BetOutcome {
  bet: Bet;
  won: boolean;
  /** Total returned to the player (stake + profit) when won, else 0. */
  payout: number;
}

export interface RouletteResult {
  winningNumber: number;
  outcomes: BetOutcome[];
  totalBet: number;
  totalPayout: number;
}
