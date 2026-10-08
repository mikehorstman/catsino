import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getFirebaseApp } from "@/server/firebase-admin";
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

const JACKPOT_SEED = 250_000;
const JACKPOT_DOC = "catsino-jackpot";

const COLLECTIONS = {
  users: "users",
  wallets: "wallets",
  transactions: "transactions",
  rounds: "rounds",
  idempotency: "idempotency",
  bonusGames: "bonusGames",
  jackpot: "jackpot",
} as const;

/**
 * Firestore cannot store arrays of arrays (the slot reel grid is number[][]),
 * so free-form payload fields are stored as JSON strings and revived on read.
 */
const JSON_FIELDS = ["outcome", "board", "response"] as const;

function encode<T extends object>(record: T): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...(record as Record<string, unknown>),
  };
  for (const field of JSON_FIELDS) {
    if (out[field] !== undefined && out[field] !== null) {
      out[field] = JSON.stringify(out[field]);
    }
  }
  return out;
}

function decode<T>(data: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...data };
  for (const field of JSON_FIELDS) {
    const value = out[field];
    if (typeof value === "string") {
      try {
        out[field] = JSON.parse(value);
      } catch {
        // leave as-is if it was not JSON
      }
    }
  }
  return out as T;
}

/**
 * Firestore-backed Store. Documents are stored as plain JSON objects; the
 * record shapes are flat (no nested maps beyond `outcome`/`board`, which are
 * stored as-is). Queries avoid composite indexes by filtering in memory where
 * a `where` + `orderBy` combination would otherwise require one.
 */
export class FirestoreStore implements Store {
  private db: Firestore;

  constructor(db?: Firestore) {
    this.db = db ?? getFirestore(getFirebaseApp());
    // Records carry optional fields (refId, idempotencyKey, …) that are often
    // undefined; Firestore rejects undefined unless this is enabled.
    this.db.settings({ ignoreUndefinedProperties: true });
  }

  private col(name: string) {
    return this.db.collection(name);
  }

  // ---- Users -------------------------------------------------------------
  async getUserById(id: string) {
    const snap = await this.col(COLLECTIONS.users).doc(id).get();
    return snap.exists ? (snap.data() as UserRecord) : undefined;
  }
  async getUserByEmail(email: string) {
    const normalised = email.trim().toLowerCase();
    const snap = await this.col(COLLECTIONS.users)
      .where("email", "==", normalised)
      .limit(1)
      .get();
    return snap.empty ? undefined : (snap.docs[0].data() as UserRecord);
  }
  async createUser(user: UserRecord) {
    await this.col(COLLECTIONS.users).doc(user.id).set(user);
  }
  async provisionUser(input: {
    user: UserRecord;
    wallet: WalletRecord;
    transaction: TransactionRecord;
  }) {
    const userRef = this.col(COLLECTIONS.users).doc(input.user.id);
    const walletRef = this.col(COLLECTIONS.wallets).doc(input.user.id);
    const txRef = this.col(COLLECTIONS.transactions).doc(input.transaction.id);
    return this.db.runTransaction(async (t) => {
      if ((await t.get(userRef)).exists) return false;
      t.create(userRef, input.user);
      t.create(walletRef, input.wallet);
      t.create(txRef, input.transaction);
      return true;
    });
  }
  async updateUser(id: string, patch: Partial<UserRecord>) {
    await this.col(COLLECTIONS.users).doc(id).set(patch, { merge: true });
  }

  // ---- Wallets -----------------------------------------------------------
  async getWallet(userId: string) {
    const snap = await this.col(COLLECTIONS.wallets).doc(userId).get();
    return snap.exists ? (snap.data() as WalletRecord) : undefined;
  }
  async putWallet(wallet: WalletRecord) {
    await this.col(COLLECTIONS.wallets).doc(wallet.userId).set(wallet);
  }

  // ---- Ledger ------------------------------------------------------------
  async appendTransaction(tx: TransactionRecord) {
    await this.col(COLLECTIONS.transactions).doc(tx.id).set(tx);
  }
  async listTransactions(userId: string) {
    const snap = await this.col(COLLECTIONS.transactions)
      .where("userId", "==", userId)
      .get();
    return snap.docs
      .map((d) => d.data() as TransactionRecord)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ---- Rounds ------------------------------------------------------------
  async createRound(round: RoundRecord) {
    await this.col(COLLECTIONS.rounds).doc(round.id).set(encode(round));
  }
  async listRounds(
    userId: string,
    opts: {
      limit?: number;
      offset?: number;
      kind?: string;
      result?: "win" | "loss";
    } = {},
  ) {
    const snap = await this.col(COLLECTIONS.rounds)
      .where("userId", "==", userId)
      .get();
    let rows = snap.docs.map((d) => decode<RoundRecord>(d.data()));
    if (opts.kind) rows = rows.filter((r) => r.kind === opts.kind);
    if (opts.result === "win") rows = rows.filter((r) => r.winTotal > 0);
    if (opts.result === "loss") rows = rows.filter((r) => r.winTotal === 0);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const offset = opts.offset ?? 0;
    const limit = opts.limit ?? 25;
    return rows.slice(offset, offset + limit);
  }
  async countRounds(userId: string) {
    const snap = await this.col(COLLECTIONS.rounds)
      .where("userId", "==", userId)
      .count()
      .get();
    return snap.data().count;
  }
  async listAllRounds(opts: { limit?: number } = {}) {
    const snap = await this.col(COLLECTIONS.rounds)
      .orderBy("createdAt", "desc")
      .limit(opts.limit ?? 100)
      .get();
    return snap.docs.map((d) => decode<RoundRecord>(d.data()));
  }
  async listAllUsers() {
    const snap = await this.col(COLLECTIONS.users).get();
    return snap.docs.map((d) => d.data() as UserRecord);
  }

  // ---- Idempotency -------------------------------------------------------
  private idemId(key: string, userId: string) {
    return `${userId}:${key}`;
  }
  async getIdempotency(key: string, userId: string) {
    const snap = await this.col(COLLECTIONS.idempotency)
      .doc(this.idemId(key, userId))
      .get();
    return snap.exists ? decode<IdempotencyRecord>(snap.data()!) : undefined;
  }
  async putIdempotency(record: IdempotencyRecord) {
    await this.col(COLLECTIONS.idempotency)
      .doc(this.idemId(record.key, record.userId))
      .set(encode(record));
  }

  // ---- Bonus games -------------------------------------------------------
  async createBonusGame(game: BonusGameRecord) {
    await this.col(COLLECTIONS.bonusGames).doc(game.id).set(encode(game));
  }
  async getBonusGame(id: string) {
    const snap = await this.col(COLLECTIONS.bonusGames).doc(id).get();
    return snap.exists ? decode<BonusGameRecord>(snap.data()!) : undefined;
  }
  async getActiveBonusGame(userId: string, gameId: string) {
    const snap = await this.col(COLLECTIONS.bonusGames)
      .where("userId", "==", userId)
      .where("gameId", "==", gameId)
      .where("status", "==", "active")
      .limit(1)
      .get();
    return snap.empty
      ? undefined
      : decode<BonusGameRecord>(snap.docs[0].data());
  }
  async updateBonusGame(id: string, patch: Partial<BonusGameRecord>) {
    await this.col(COLLECTIONS.bonusGames)
      .doc(id)
      .set(encode(patch), { merge: true });
  }

  // ---- Jackpot -----------------------------------------------------------
  async getJackpot(): Promise<JackpotRecord> {
    const snap = await this.col(COLLECTIONS.jackpot).doc(JACKPOT_DOC).get();
    if (snap.exists) return snap.data() as JackpotRecord;
    const seeded: JackpotRecord = {
      id: JACKPOT_DOC,
      pool: JACKPOT_SEED,
      seed: JACKPOT_SEED,
      lastWonAt: null,
      lastWonBy: null,
      lastWonByName: null,
      lastWonAmount: null,
    };
    await this.col(COLLECTIONS.jackpot).doc(JACKPOT_DOC).set(seeded);
    return seeded;
  }
  async putJackpot(jackpot: JackpotRecord) {
    await this.col(COLLECTIONS.jackpot).doc(JACKPOT_DOC).set(jackpot);
  }
}
