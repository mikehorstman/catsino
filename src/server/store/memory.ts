import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  BonusGameRecord,
  IdempotencyRecord,
  JackpotRecord,
  RoundRecord,
  Store,
  TransactionRecord,
  UserRecord,
  WalletRecord,
} from "./types";

interface Data {
  users: UserRecord[];
  wallets: WalletRecord[];
  transactions: TransactionRecord[];
  rounds: RoundRecord[];
  idempotency: IdempotencyRecord[];
  bonusGames: BonusGameRecord[];
  jackpot: JackpotRecord;
}

const JACKPOT_SEED = 250_000;

function emptyData(): Data {
  return {
    users: [],
    wallets: [],
    transactions: [],
    rounds: [],
    idempotency: [],
    bonusGames: [],
    jackpot: {
      id: "catsino-jackpot",
      pool: JACKPOT_SEED,
      seed: JACKPOT_SEED,
      lastWonAt: null,
      lastWonBy: null,
      lastWonByName: null,
      lastWonAmount: null,
    },
  };
}

/**
 * In-memory Store implementation with optional JSON-file persistence.
 * Enabled with PERSIST=file and CATSINO_DATA_FILE (default data/catsino.json),
 * so a dev restart keeps players and balances.
 *
 * The global singleton survives Next.js hot reloads in development.
 */
class MemoryStore implements Store {
  private data: Data = emptyData();
  private readonly file: string | null;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(file: string | null) {
    this.file = file;
    if (file && existsSync(file)) {
      try {
        this.data = { ...emptyData(), ...JSON.parse(readFileSync(file, "utf8")) };
      } catch {
        this.data = emptyData();
      }
    }
  }

  private scheduleSave() {
    if (!this.file) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      mkdirSync(dirname(this.file!), { recursive: true });
      writeFileSync(this.file!, JSON.stringify(this.data, null, 2));
    }, 250);
  }

  getUserById(id: string) {
    return this.data.users.find((u) => u.id === id);
  }
  getUserByEmail(email: string) {
    const normalised = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email === normalised);
  }
  createUser(user: UserRecord) {
    this.data.users.push(user);
    this.scheduleSave();
  }
  updateUser(id: string, patch: Partial<UserRecord>) {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return;
    this.data.users[index] = { ...this.data.users[index], ...patch };
    this.scheduleSave();
  }

  getWallet(userId: string) {
    return this.data.wallets.find((w) => w.userId === userId);
  }
  putWallet(wallet: WalletRecord) {
    const index = this.data.wallets.findIndex((w) => w.userId === wallet.userId);
    if (index === -1) this.data.wallets.push(wallet);
    else this.data.wallets[index] = wallet;
    this.scheduleSave();
  }

  appendTransaction(tx: TransactionRecord) {
    this.data.transactions.push(tx);
    this.scheduleSave();
  }
  listTransactions(userId: string) {
    return this.data.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createRound(round: RoundRecord) {
    this.data.rounds.push(round);
    this.scheduleSave();
  }
  listRounds(userId: string, opts: { limit?: number; offset?: number; kind?: string; result?: "win" | "loss" } = {}) {
    let rows = this.data.rounds.filter((r) => r.userId === userId);
    if (opts.kind) rows = rows.filter((r) => r.kind === opts.kind);
    if (opts.result === "win") rows = rows.filter((r) => r.winTotal > 0);
    if (opts.result === "loss") rows = rows.filter((r) => r.winTotal === 0);
    rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 25;
    return rows.slice(offset, offset + limit);
  }
  countRounds(userId: string) {
    return this.data.rounds.filter((r) => r.userId === userId).length;
  }
  listAllRounds(opts: { limit?: number } = {}) {
    return [...this.data.rounds]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts.limit ?? 100);
  }
  listAllUsers() {
    return [...this.data.users];
  }

  getIdempotency(key: string, userId: string) {
    return this.data.idempotency.find((r) => r.key === key && r.userId === userId);
  }
  putIdempotency(record: IdempotencyRecord) {
    this.data.idempotency.push(record);
    this.scheduleSave();
  }
createBonusGame(game: BonusGameRecord) {
    this.data.bonusGames.push(game);
    this.scheduleSave();
  }
  getBonusGame(id: string) {
    return this.data.bonusGames.find((g) => g.id === id);
  }
  getActiveBonusGame(userId: string, gameId: string) {
    return this.data.bonusGames.find(
      (g) => g.userId === userId && g.gameId === gameId && g.status === "active",
    );
  }
  updateBonusGame(id: string, patch: Partial<BonusGameRecord>) {
    const index = this.data.bonusGames.findIndex((g) => g.id === id);
    if (index === -1) return;
    this.data.bonusGames[index] = { ...this.data.bonusGames[index], ...patch };
    this.scheduleSave();
  }

  getJackpot() {
    return this.data.jackpot;
  }
  putJackpot(jackpot: JackpotRecord) {
    this.data.jackpot = jackpot;
    this.scheduleSave();
  }

  /** Test helper: reset all state. */
  reset() {
    this.data = emptyData();
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __catsinoStore: MemoryStore | undefined;
}

function resolveFile(): string | null {
  if (process.env.PERSIST !== "file") return null;
  return process.env.CATSINO_DATA_FILE ?? `${process.cwd()}/data/catsino.json`;
}

/** Singleton accessor. */
export function getStore(): Store {
  if (!globalThis.__catsinoStore) {
    globalThis.__catsinoStore = new MemoryStore(resolveFile());
  }
  return globalThis.__catsinoStore;
}

/** Test helper: fresh in-memory store with no persistence. */
export function createMemoryStore(): Store & { reset: () => void } {
  return new MemoryStore(null);
}

export function newId(): string {
  return randomUUID();
}
