import { createSecureRng } from "@/engine/rng/secure";
import { spinSlot, type SpinState } from "@/engine/slots/engine";
import type { SlotConfig } from "@/engine/slots/types";
import { spinRoulette } from "@/engine/roulette/engine";
import type { Bet, RouletteResult } from "@/engine/roulette/types";
import type { Store, RoundRecord, UserRecord } from "@/server/store/types";
import { newId } from "@/server/store/memory";
import { WalletError, WalletService } from "@/server/store/wallet";
import { withLock } from "@/server/store/mutex";
import { ProgressionService, type RoundOutcome } from "./progression";

export class RoundError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface SlotRoundResponse {
  kind: "slots";
  roundId: string;
  balance: number;
  result: ReturnType<typeof spinSlot>;
  progression: RoundOutcome;
}

export interface RouletteRoundResponse {
  kind: "roulette";
  roundId: string;
  balance: number;
  result: RouletteResult;
  progression: RoundOutcome;
}

/**
 * Orchestrates a full game round under a per-user lock:
 *   validate → idempotency check → run engine → settle ledger →
 *   record round → apply progression → store idempotent response.
 */
export class RoundService {
  private wallet: WalletService;
  private progression: ProgressionService;

  constructor(
    private store: Store,
    private rng = createSecureRng(),
  ) {
    this.wallet = new WalletService(store);
    this.progression = new ProgressionService(store, this.wallet);
  }

  private replay<T>(userId: string, idempotencyKey?: string): T | undefined {
    if (!idempotencyKey) return undefined;
    const prior = this.store.getIdempotency(idempotencyKey, userId);
    return prior ? (prior.response as T) : undefined;
  }

  private remember(userId: string, key: string | undefined, roundId: string, response: unknown) {
    if (!key) return;
    this.store.putIdempotency({
      key,
      userId,
      roundId,
      response,
      createdAt: new Date().toISOString(),
    });
  }

  async playSlot(opts: {
    user: UserRecord;
    config: SlotConfig;
    bet: number;
    idempotencyKey?: string;
    freeSpinState?: SpinState;
  }): Promise<SlotRoundResponse> {
    const { user, config, bet, idempotencyKey } = opts;

    const replay = this.replay<SlotRoundResponse>(user.id, idempotencyKey);
    if (replay) return replay;

    if (!config.betLevels.includes(bet)) {
      throw new RoundError("INVALID_BET", "Bet is not an allowed level");
    }

    return withLock(`wallet:${user.id}`, () => {
      const isFreeSpin = (opts.freeSpinState?.freeSpinsRemaining ?? 0) > 0;
      const charge = isFreeSpin ? 0 : bet;

      if (this.wallet.getBalance(user.id) < charge) {
        throw new RoundError("INSUFFICIENT_FUNDS", "Not enough coins for this bet");
      }

      const result = spinSlot(config, bet, this.rng, opts.freeSpinState);
      const roundId = newId();

      try {
        this.wallet.settleRound(user.id, charge, result.totalWin, roundId);
      } catch (error) {
        if (error instanceof WalletError) throw new RoundError(error.code, error.message);
        throw error;
      }

      this.recordRound({
        id: roundId,
        userId: user.id,
        gameId: config.id,
        kind: "slots",
        betTotal: charge,
        winTotal: result.totalWin,
        outcome: result,
        configVersion: config.version,
        createdAt: new Date().toISOString(),
      });

      const fresh = this.store.getUserById(user.id)!;
      const progression = this.progression.applyRoundResult(fresh, {
        bet: charge,
        win: result.totalWin,
        isSpin: true,
      });

      const response: SlotRoundResponse = {
        kind: "slots",
        roundId,
        balance: this.wallet.getBalance(user.id),
        result,
        progression,
      };
      this.remember(user.id, idempotencyKey, roundId, response);
      return response;
    });
  }

  async playRoulette(opts: {
    user: UserRecord;
    bets: Bet[];
    idempotencyKey?: string;
  }): Promise<RouletteRoundResponse> {
    const { user, bets, idempotencyKey } = opts;

    const replay = this.replay<RouletteRoundResponse>(user.id, idempotencyKey);
    if (replay) return replay;

    if (bets.length === 0) throw new RoundError("INVALID_BET", "Place at least one bet");
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    return withLock(`wallet:${user.id}`, () => {
      if (this.wallet.getBalance(user.id) < totalBet) {
        throw new RoundError("INSUFFICIENT_FUNDS", "Not enough coins for these bets");
      }

      let result: RouletteResult;
      try {
        result = spinRoulette(bets, this.rng);
      } catch (error) {
        throw new RoundError("INVALID_BET", (error as Error).message);
      }

      const roundId = newId();
      try {
        this.wallet.settleRound(user.id, totalBet, result.totalPayout, roundId);
      } catch (error) {
        if (error instanceof WalletError) throw new RoundError(error.code, error.message);
        throw error;
      }

      this.recordRound({
        id: roundId,
        userId: user.id,
        gameId: "roulette",
        kind: "roulette",
        betTotal: totalBet,
        winTotal: result.totalPayout,
        outcome: result,
        createdAt: new Date().toISOString(),
        configVersion: 1,
      });

      const fresh = this.store.getUserById(user.id)!;
      const progression = this.progression.applyRoundResult(fresh, {
        bet: totalBet,
        win: result.totalPayout,
        isSpin: false,
      });

      const response: RouletteRoundResponse = {
        kind: "roulette",
        roundId,
        balance: this.wallet.getBalance(user.id),
        result,
        progression,
      };
      this.remember(user.id, idempotencyKey, roundId, response);
      return response;
    });
  }

  private recordRound(round: RoundRecord) {
    this.store.createRound(round);
  }

  getWalletService(): WalletService {
    return this.wallet;
  }
}
