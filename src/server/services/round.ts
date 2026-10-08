import { createSecureRng } from "@/engine/rng/secure";
import { spinSlot } from "@/engine/slots/engine";
import { generatePickBoard, resolvePick, settlePickBonus, type GeneratedBoard } from "@/engine/slots/bonus";
import type { PickBonusResult, PickCell, SlotConfig, SpinState } from "@/engine/slots/types";
import { spinRoulette } from "@/engine/roulette/engine";
import type { Bet, RouletteResult } from "@/engine/roulette/types";
import type { Store, RoundRecord, UserRecord } from "@/server/store/types";
import { newId } from "@/server/store";
import { WalletError, WalletService } from "@/server/store/wallet";
import { withLock } from "@/server/store/mutex";
import { ProgressionService, type RoundOutcome } from "./progression";
import { JackpotService, type JackpotWin } from "./jackpot";

export class RoundError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type SlotBonus =
  | { type: "pickBonus"; id: string; picks: number; cellCount: number; bet: number }
  | { type: "freeSpins"; remaining: number; multiplier: number; bet: number }
  | null;

export interface SlotRoundResponse {
  kind: "slots";
  roundId: string;
  balance: number;
  result: ReturnType<typeof spinSlot>;
  progression: RoundOutcome;
  jackpot: JackpotWin | null;
  jackpotPool: number;
  bonus: SlotBonus;
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

  private async replay<T>(userId: string, idempotencyKey?: string): Promise<T | undefined> {
    if (!idempotencyKey) return undefined;
    const prior = await this.store.getIdempotency(idempotencyKey, userId);
    return prior ? (prior.response as T) : undefined;
  }

  private async remember(userId: string, key: string | undefined, roundId: string, response: unknown) {
    if (!key) return;
    await this.store.putIdempotency({
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

    const replay = await this.replay<SlotRoundResponse>(user.id, idempotencyKey);
    if (replay) return replay;

    if (!config.betLevels.includes(bet)) {
      throw new RoundError("INVALID_BET", "Bet is not an allowed level");
    }

    return withLock(`wallet:${user.id}`, async () => {
      const isFreeSpin = (opts.freeSpinState?.freeSpinsRemaining ?? 0) > 0;
      const charge = isFreeSpin ? 0 : bet;

      if ((await this.wallet.getBalance(user.id)) < charge) {
        throw new RoundError("INSUFFICIENT_FUNDS", "Not enough coins for this bet");
      }

      const result = spinSlot(config, bet, this.rng, opts.freeSpinState);
      const roundId = newId();

      try {
        await this.wallet.settleRound(user.id, charge, result.totalWin, roundId);
      } catch (error) {
        if (error instanceof WalletError) throw new RoundError(error.code, error.message);
        throw error;
      }

      await this.recordRound({
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

      // Start the relevant bonus game, if one was triggered.
      let bonus: SlotBonus = null;
      const pickFeature = config.features.find((f) => f.type === "pickBonus");
      const freeFeature = config.features.find((f) => f.type === "freeSpins");

      if (result.pickBonusAwarded && pickFeature?.type === "pickBonus") {
        const board = generatePickBoard(pickFeature, this.rng);
        const bonusId = newId();
        await this.store.createBonusGame({
          id: bonusId,
          userId: user.id,
          gameId: config.id,
          kind: "bonus-game",
          bet,
          status: "active",
          board,
          picks: pickFeature.picks,
          chosen: [],
          accumulatedWin: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        bonus = {
          type: "pickBonus",
          id: bonusId,
          picks: pickFeature.picks,
          cellCount: pickFeature.rows * pickFeature.cols,
          bet,
        };
      } else if (result.nextState.freeSpinsRemaining > 0) {
        // Only create a free-spins game when starting fresh; a retrigger during
        // free spins keeps the existing game and just tops up the count.
        const existing = await this.store.getActiveBonusGame(user.id, config.id);
        if (existing && existing.kind === "free-spins") {
          await this.store.updateBonusGame(existing.id, {
            freeSpinsRemaining: result.nextState.freeSpinsRemaining,
            freeSpinsMultiplier: result.nextState.freeSpinsMultiplier,
            updatedAt: new Date().toISOString(),
          });
          bonus = {
            type: "freeSpins",
            remaining: result.nextState.freeSpinsRemaining,
            multiplier: result.nextState.freeSpinsMultiplier,
            bet,
          };
        } else if (!isFreeSpin && freeFeature?.type === "freeSpins") {
          const bonusId = newId();
          await this.store.createBonusGame({
            id: bonusId,
            userId: user.id,
            gameId: config.id,
            kind: "free-spins",
            bet,
            status: "active",
            freeSpinsRemaining: result.nextState.freeSpinsRemaining,
            freeSpinsMultiplier: result.nextState.freeSpinsMultiplier,
            accumulatedWin: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          bonus = {
            type: "freeSpins",
            remaining: result.nextState.freeSpinsRemaining,
            multiplier: result.nextState.freeSpinsMultiplier,
            bet,
          };
        }
      }

      const fresh = (await this.store.getUserById(user.id))!;
      const progression = await this.progression.applyRoundResult(fresh, {
        bet: charge,
        win: result.totalWin,
        isSpin: true,
      });

      // Progressive jackpot: every paid spin feeds the pool and can win it.
      const jackpotService = new JackpotService(this.store, this.rng);
      let jackpot: JackpotWin | null = null;
      if (charge > 0) {
        await jackpotService.contribute(charge);
        jackpot = await jackpotService.roll(user.id, user.displayName, charge);
      }

      const response: SlotRoundResponse = {
        kind: "slots",
        roundId,
        balance: await this.wallet.getBalance(user.id),
        result,
        progression,
        bonus,
        jackpot,
        jackpotPool: await jackpotService.getPool(),
      };
      await this.remember(user.id, idempotencyKey, roundId, response);
      return response;
    });
  }

  async playRoulette(opts: {
    user: UserRecord;
    bets: Bet[];
    idempotencyKey?: string;
  }): Promise<RouletteRoundResponse> {
    const { user, bets, idempotencyKey } = opts;

    const replay = await this.replay<RouletteRoundResponse>(user.id, idempotencyKey);
    if (replay) return replay;

    if (bets.length === 0) throw new RoundError("INVALID_BET", "Place at least one bet");
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    return withLock(`wallet:${user.id}`, async () => {
      if ((await this.wallet.getBalance(user.id)) < totalBet) {
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
        await this.wallet.settleRound(user.id, totalBet, result.totalPayout, roundId);
      } catch (error) {
        if (error instanceof WalletError) throw new RoundError(error.code, error.message);
        throw error;
      }

      await this.recordRound({
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

      const fresh = (await this.store.getUserById(user.id))!;
      const progression = await this.progression.applyRoundResult(fresh, {
        bet: totalBet,
        win: result.totalPayout,
        isSpin: false,
      });

      const response: RouletteRoundResponse = {
        kind: "roulette",
        roundId,
        balance: await this.wallet.getBalance(user.id),
        result,
        progression,
      };
      await this.remember(user.id, idempotencyKey, roundId, response);
      return response;
    });
  }

  private async recordRound(round: RoundRecord) {
    await this.store.createRound(round);
  }

  /**
   * Resolve the state of a slot for a player: an active bonus game (blocking
   * regular spins) or an in-progress free-spin round.
   */
  async getSlotState(user: UserRecord, config: SlotConfig): Promise<SlotState> {
    const pickFeature = config.features.find((f) => f.type === "pickBonus");
    const bonus = await this.store.getActiveBonusGame(user.id, config.id);
    if (bonus && bonus.kind === "bonus-game") {
      const board = bonus.board as GeneratedBoard;
      const chosen = bonus.chosen ?? [];
      return {
        activeBonus: {
          id: bonus.id,
          kind: "pickBonus",
          bet: bonus.bet,
          picks: bonus.picks ?? 0,
          chosen,
          cellCount: pickFeature?.type === "pickBonus" ? pickFeature.rows * pickFeature.cols : 9,
          revealed: chosen.map((i) => resolvePick(board, i)),
        },
      };
    }
    if (bonus && bonus.kind === "free-spins" && (bonus.freeSpinsRemaining ?? 0) > 0) {
      return {
        freeSpins: {
          remaining: bonus.freeSpinsRemaining ?? 0,
          multiplier: bonus.freeSpinsMultiplier ?? 1,
          bet: bonus.bet,
          accumulated: bonus.accumulatedWin ?? 0,
        },
      };
    }
    return {};
  }

  /** Play one free spin. No coin is charged; wins are credited normally. */
  async playFreeSpin(opts: { user: UserRecord; config: SlotConfig }): Promise<SlotRoundResponse> {
    const { user, config } = opts;

    return withLock(`wallet:${user.id}`, async () => {
      const game = await this.store.getActiveBonusGame(user.id, config.id);
      if (!game || game.kind !== "free-spins" || (game.freeSpinsRemaining ?? 0) <= 0) {
        throw new RoundError("NO_FREE_SPINS", "No free spins remaining");
      }

      const state = {
        freeSpinsRemaining: game.freeSpinsRemaining ?? 0,
        freeSpinsMultiplier: game.freeSpinsMultiplier ?? 1,
      };
      const result = spinSlot(config, game.bet, this.rng, state);
      const roundId = newId();

      await this.wallet.settleRound(user.id, 0, result.totalWin, roundId);
      await this.recordRound({
        id: roundId,
        userId: user.id,
        gameId: config.id,
        kind: "slots",
        betTotal: 0,
        winTotal: result.totalWin,
        outcome: result,
        configVersion: config.version,
        createdAt: new Date().toISOString(),
      });

      if (result.nextState.freeSpinsRemaining <= 0) {
        await this.store.updateBonusGame(game.id, {
          status: "complete",
          freeSpinsRemaining: 0,
          accumulatedWin: (game.accumulatedWin ?? 0) + result.totalWin,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await this.store.updateBonusGame(game.id, {
          freeSpinsRemaining: result.nextState.freeSpinsRemaining,
          freeSpinsMultiplier: result.nextState.freeSpinsMultiplier,
          accumulatedWin: (game.accumulatedWin ?? 0) + result.totalWin,
          updatedAt: new Date().toISOString(),
        });
      }

      const fresh = (await this.store.getUserById(user.id))!;
      const progression = await this.progression.applyRoundResult(fresh, {
        bet: 0,
        win: result.totalWin,
        isSpin: true,
      });

      return {
        kind: "slots" as const,
        roundId,
        balance: await this.wallet.getBalance(user.id),
        result,
        progression,
        bonus: null,
        jackpot: null,
        jackpotPool: await new JackpotService(this.store, this.rng).getPool(),
      };
    });
  }

  /** Reveal one pick-bonus cell. Pure lookup against the stored board. */
  async pickBonusCell(opts: {
    user: UserRecord;
    config: SlotConfig;
    gameId: string;
    index: number;
  }): Promise<PickResponse> {
    const { user, config, gameId, index } = opts;
    const game = await this.store.getBonusGame(gameId);
    if (!game || game.userId !== user.id || game.gameId !== config.id) {
      throw new RoundError("NOT_FOUND", "Bonus game not found");
    }
    if (game.status !== "active") throw new RoundError("ALREADY_COMPLETE", "Bonus game is already finished");

    const board = game.board as GeneratedBoard;
    const chosen = game.chosen ?? [];
    if (chosen.includes(index)) throw new RoundError("ALREADY_PICKED", "That cell has already been revealed");

    const cell = resolvePick(board, index);
    const nextChosen = [...chosen, index];
    const picks = game.picks ?? 0;
    const complete = nextChosen.length >= picks;

    let result: PickBonusResult | null = null;
    let balance = await this.wallet.getBalance(user.id);
    let progression: RoundOutcome | null = null;

    if (complete) {
      result = settlePickBonus(board, nextChosen, game.bet);
      const roundId = newId();
      await this.wallet.settleRound(user.id, 0, result.win, roundId);
      await this.recordRound({
        id: roundId,
        userId: user.id,
        gameId: config.id,
        kind: "slots",
        betTotal: 0,
        winTotal: result.win,
        outcome: { bonus: "pick", result },
        configVersion: config.version,
        createdAt: new Date().toISOString(),
      });
      const fresh = (await this.store.getUserById(user.id))!;
      progression = await this.progression.applyRoundResult(fresh, { bet: 0, win: result.win, isSpin: false });
      balance = await this.wallet.getBalance(user.id);
      await this.store.updateBonusGame(game.id, {
        status: "complete",
        chosen: nextChosen,
        accumulatedWin: result.win,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await this.store.updateBonusGame(game.id, { chosen: nextChosen, updatedAt: new Date().toISOString() });
    }

    return {
      cell,
      chosen: nextChosen,
      picksRemaining: Math.max(0, picks - nextChosen.length),
      complete,
      result,
      balance,
      progression,
    };
  }

  getWalletService(): WalletService {
    return this.wallet;
  }
}

export interface PickResponse {
  cell: PickCell;
  chosen: number[];
  picksRemaining: number;
  complete: boolean;
  result: PickBonusResult | null;
  balance: number;
  progression: RoundOutcome | null;
}

export interface SlotState {
  activeBonus?: {
    id: string;
    kind: "pickBonus";
    bet: number;
    picks: number;
    chosen: number[];
    cellCount: number;
    revealed: PickCell[];
  };
  freeSpins?: { remaining: number; multiplier: number; bet: number; accumulated: number };
}
