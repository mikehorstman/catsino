/** Shared game-domain types used by both the engine and the server layer. */

export type GameKind = "slots" | "roulette";

/** Result of a single resolved round, as returned to the client. */
export interface RoundResult {
  gameId: string;
  kind: GameKind;
  betTotal: number;
  winTotal: number;
  /** Free-form, game-specific outcome payload (safe to send to the client). */
  outcome: unknown;
  /** Appended to the ledger as a bet entry (positive magnitude). */
  betAmount: number;
  /** Credited back (bet + winnings) as a win entry. */
  creditAmount: number;
}

export interface EngineError {
  code: string;
  message: string;
}
