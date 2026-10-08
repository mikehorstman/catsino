/**
 * Persistence layer types.
 *
 * The app talks to a `Store` interface. Today the only implementation is an
 * in-memory store with optional JSON-file persistence. Swapping in Postgres
 * later means writing one more implementation — services never change.
 */

export type TransactionType =
  | "welcome"
  | "bet"
  | "win"
  | "daily-bonus"
  | "level-reward"
  | "achievement"
  | "refill"
  | "refund";

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: "player" | "admin";
  /** Guests are auto-provisioned so the app is playable without signing in. */
  isGuest?: boolean;
  createdAt: string;
  // Progression
  xp: number;
  level: number;
  // Aggregated stats (denormalised for fast reads)
  totalRounds: number;
  totalWins: number;
  totalSpins: number;
  biggestWin: number;
  totalWagered: number;
  totalWon: number;
  // Bonus bookkeeping
  dailyStreak: number;
  lastDailyClaim: string | null;
  lastRefill: string | null;
  achievements: string[];
}

export interface WalletRecord {
  userId: string;
  balance: number;
  version: number;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // signed
  balanceAfter: number;
  refType?: string;
  refId?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export interface RoundRecord {
  id: string;
  userId: string;
  gameId: string;
  kind: "slots" | "roulette";
  betTotal: number;
  winTotal: number;
  outcome: unknown;
  configVersion: number;
  createdAt: string;
}

export interface IdempotencyRecord {
  key: string;
  userId: string;
  roundId: string;
  response: unknown;
  createdAt: string;
}

/** The shared progressive jackpot pool. */
export interface JackpotRecord {
  id: string;
  /** Current pool in coins. */
  pool: number;
  /** Pool value the next jackpot resets to. */
  seed: number;
  lastWonAt: string | null;
  lastWonBy: string | null;
  lastWonByName: string | null;
  lastWonAmount: number | null;
}

/**
 * An in-progress or completed bonus game (e.g. pick-and-win). The board is
 * generated server-side at trigger time and stored so a client reload cannot
 * change the outcome.
 */
export interface BonusGameRecord {
  id: string;
  userId: string;
  gameId: string;
  kind: "bonus-game" | "free-spins";
  bet: number;
  status: "active" | "complete";
  /** Pick-board cells (server-only until picked). */
  board?: unknown;
  picks?: number;
  /** Revealed cell indices so far. */
  chosen?: number[];
  /** Running total credited so far (pick bonus credits once at the end). */
  accumulatedWin: number;
  /** Free-spin bookkeeping. */
  freeSpinsRemaining?: number;
  freeSpinsMultiplier?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  getUserById(id: string): UserRecord | undefined;
  getUserByEmail(email: string): UserRecord | undefined;
  createUser(user: UserRecord): void;
  updateUser(id: string, patch: Partial<UserRecord>): void;

  getWallet(userId: string): WalletRecord | undefined;
  putWallet(wallet: WalletRecord): void;

  appendTransaction(tx: TransactionRecord): void;
  listTransactions(userId: string): TransactionRecord[];


  getJackpot(): JackpotRecord;
  putJackpot(jackpot: JackpotRecord): void;
  createRound(round: RoundRecord): void;
  listRounds(userId: string, opts?: { limit?: number; offset?: number; kind?: string; result?: "win" | "loss" }): RoundRecord[];
  countRounds(userId: string): number;
  listAllRounds(opts?: { limit?: number }): RoundRecord[];
  listAllUsers(): UserRecord[];

  getIdempotency(key: string, userId: string): IdempotencyRecord | undefined;
  putIdempotency(record: IdempotencyRecord): void;

  createBonusGame(game: BonusGameRecord): void;
  getBonusGame(id: string): BonusGameRecord | undefined;
  getActiveBonusGame(userId: string, gameId: string): BonusGameRecord | undefined;
  updateBonusGame(id: string, patch: Partial<BonusGameRecord>): void;
}
