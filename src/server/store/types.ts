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

/**
 * The persistence contract. Every method is async so the same interface works
 * for the in-memory store, the JSON-file store and Firestore alike.
 */
export interface Store {
  getUserById(id: string): Promise<UserRecord | undefined>;
  getUserByEmail(email: string): Promise<UserRecord | undefined>;
  createUser(user: UserRecord): Promise<void>;
  updateUser(id: string, patch: Partial<UserRecord>): Promise<void>;

  getWallet(userId: string): Promise<WalletRecord | undefined>;
  putWallet(wallet: WalletRecord): Promise<void>;

  appendTransaction(tx: TransactionRecord): Promise<void>;
  listTransactions(userId: string): Promise<TransactionRecord[]>;

  getJackpot(): Promise<JackpotRecord>;
  putJackpot(jackpot: JackpotRecord): Promise<void>;
  createRound(round: RoundRecord): Promise<void>;
  listRounds(userId: string, opts?: { limit?: number; offset?: number; kind?: string; result?: "win" | "loss" }): Promise<RoundRecord[]>;
  countRounds(userId: string): Promise<number>;
  listAllRounds(opts?: { limit?: number }): Promise<RoundRecord[]>;
  listAllUsers(): Promise<UserRecord[]>;

  getIdempotency(key: string, userId: string): Promise<IdempotencyRecord | undefined>;
  putIdempotency(record: IdempotencyRecord): Promise<void>;

  createBonusGame(game: BonusGameRecord): Promise<void>;
  getBonusGame(id: string): Promise<BonusGameRecord | undefined>;
  getActiveBonusGame(userId: string, gameId: string): Promise<BonusGameRecord | undefined>;
  updateBonusGame(id: string, patch: Partial<BonusGameRecord>): Promise<void>;
}
