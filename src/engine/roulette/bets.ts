import type { Bet, BetType } from "./types";

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function isRed(n: number): boolean {
  return RED_NUMBERS.has(n);
}

export function isBlack(n: number): boolean {
  return n !== 0 && !RED_NUMBERS.has(n);
}

/** Expected covered-number count per bet type — drives payout maths. */
const COVERAGE: Record<BetType, number> = {
  straight: 1,
  split: 2,
  street: 3,
  corner: 4,
  line: 6,
  dozen: 12,
  column: 12,
  red: 18,
  black: 18,
  odd: 18,
  even: 18,
  low: 18,
  high: 18,
};

/** European wheel order, for the wheel animation. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

/**
 * Standard European payout: the bet is returned plus (36 / coverage) * amount
 * profit, i.e. total return = amount * (36 / coverage).
 */
export function payoutForBet(type: BetType, amount: number): number {
  const coverage = COVERAGE[type];
  return Math.floor((amount * 36) / coverage);
}

export function betWins(bet: Bet, winningNumber: number): boolean {
  if (bet.type === "red") return isRed(winningNumber);
  if (bet.type === "black") return isBlack(winningNumber);
  if (bet.type === "odd") return winningNumber !== 0 && winningNumber % 2 === 1;
  if (bet.type === "even") return winningNumber !== 0 && winningNumber % 2 === 0;
  if (bet.type === "low") return winningNumber >= 1 && winningNumber <= 18;
  if (bet.type === "high") return winningNumber >= 19 && winningNumber <= 36;
  return bet.selection.includes(winningNumber);
}

/** Validate that a bet's covered numbers match its declared type. */
export function validateBetShape(bet: Bet): string | null {
  const expected = COVERAGE[bet.type];
  if (!expected) return `unknown bet type: ${bet.type}`;
  if (bet.amount <= 0 || !Number.isInteger(bet.amount)) return "bet amount must be a positive integer";

  if (bet.type === "red" || bet.type === "black" || bet.type === "odd" ||
      bet.type === "even" || bet.type === "low" || bet.type === "high") {
    return null; // outcome-only bets; selection is ignored
  }

  if (bet.selection.length !== expected) {
    return `${bet.type} must cover ${expected} numbers`;
  }
  for (const n of bet.selection) {
    if (!Number.isInteger(n) || n < 0 || n > 36) return `invalid number: ${n}`;
  }
  return null;
}
