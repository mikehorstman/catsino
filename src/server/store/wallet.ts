import { newId } from "./memory";
import type { Store, TransactionRecord, TransactionType } from "./types";

export class WalletError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface LedgerEntryInput {
  userId: string;
  type: TransactionType;
  amount: number; // signed
  refType?: string;
  refId?: string;
  idempotencyKey?: string;
}

/**
 * Wallet + append-only ledger.
 *
 * `wallets.balance` is a cached running total; the ledger is the source of
 * truth. Every mutation writes a ledger row and updates the cached balance in
 * the same locked step.
 */
export class WalletService {
  constructor(private store: Store) {}

  getBalance(userId: string): number {
    return this.store.getWallet(userId)?.balance ?? 0;
  }

  /** Credit or debit. Negative amounts that would breach zero throw. */
  apply(input: LedgerEntryInput): TransactionRecord {
    const wallet = this.store.getWallet(input.userId);
    if (!wallet) throw new WalletError("NO_WALLET", "Wallet not found");

    const balanceAfter = wallet.balance + input.amount;
    if (balanceAfter < 0) throw new WalletError("INSUFFICIENT_FUNDS", "Insufficient balance");
    if (!Number.isInteger(input.amount)) throw new WalletError("INVALID_AMOUNT", "Amount must be an integer");

    this.store.putWallet({ ...wallet, balance: balanceAfter, version: wallet.version + 1 });

    const tx: TransactionRecord = {
      id: newId(),
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      balanceAfter,
      refType: input.refType,
      refId: input.refId,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    };
    this.store.appendTransaction(tx);
    return tx;
  }

  /**
   * A round: debit the bet and credit any winnings atomically. Either both
   * entries land or neither does (the debit is validated first).
   */
  settleRound(userId: string, bet: number, credit: number, refId: string): TransactionRecord[] {
    const wallet = this.store.getWallet(userId);
    if (!wallet) throw new WalletError("NO_WALLET", "Wallet not found");
    if (wallet.balance < bet) throw new WalletError("INSUFFICIENT_FUNDS", "Insufficient balance");

    const out: TransactionRecord[] = [];
    if (bet > 0) out.push(this.apply({ userId, type: "bet", amount: -bet, refType: "round", refId }));
    if (credit > 0) out.push(this.apply({ userId, type: "win", amount: credit, refType: "round", refId }));
    return out;
  }

  /** Recompute the cached balance from the ledger — used by the integrity job. */
  verify(userId: string): { cached: number; ledger: number; ok: boolean } {
    const cached = this.getBalance(userId);
    const ledger = this.store
      .listTransactions(userId)
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { cached, ledger, ok: cached === ledger };
  }
}
