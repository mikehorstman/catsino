import type { Rng } from "../rng/types";
import { betWins, payoutForBet, validateBetShape } from "./bets";
import type { RouletteResult, Bet } from "./types";

/**
 * Spin the wheel and resolve a set of bets.
 * Pure and server-only. The winning number is drawn here, never on the client.
 */
export function spinRoulette(bets: Bet[], rng: Rng): RouletteResult {
  for (const bet of bets) {
    const error = validateBetShape(bet);
    if (error) throw new Error(error);
  }

  const winningNumber = rng.int(0, 36);
  let totalBet = 0;
  let totalPayout = 0;

  const outcomes = bets.map((bet) => {
    totalBet += bet.amount;
    const won = betWins(bet, winningNumber);
    const payout = won ? payoutForBet(bet.type, bet.amount) : 0;
    totalPayout += payout;
    return { bet, won, payout };
  });

  return { winningNumber, outcomes, totalBet, totalPayout };
}
