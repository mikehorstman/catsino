import type { Rng } from "@/engine/rng/types";
import type { Store } from "@/server/store/types";
import { WalletService } from "@/server/store/wallet";

/** Share of every bet that feeds the progressive pool. */
export const JACKPOT_CONTRIBUTION = 0.01;
/** Base chance per spin of hitting the jackpot. */
export const JACKPOT_BASE_CHANCE = 1 / 50_000;
/** Bigger bets improve the odds, up to this multiplier. */
export const JACKPOT_MAX_BET_BONUS = 5;

export interface JackpotWin {
  amount: number;
  pool: number;
}

/**
 * Progressive jackpot. Every bet feeds the pool; a spin can win the whole
 * thing. The roll happens server-side with the injected RNG, so it is testable
 * and cannot be influenced by the client.
 */
export class JackpotService {
  private wallet: WalletService;

  constructor(
    private store: Store,
    private rng: Rng,
  ) {
    this.wallet = new WalletService(store);
  }

  async getPool(): Promise<number> {
    return (await this.store.getJackpot()).pool;
  }

  /** Add a share of a bet to the pool. */
  async contribute(bet: number): Promise<void> {
    if (bet <= 0) return;
    const jackpot = await this.store.getJackpot();
    await this.store.putJackpot({
      ...jackpot,
      pool: jackpot.pool + Math.floor(bet * JACKPOT_CONTRIBUTION),
    });
  }

  /**
   * Roll for the jackpot. Returns the win (and resets the pool) if it hits.
   * `bet` scales the odds so high rollers have a better chance.
   */
  async roll(
    userId: string,
    userName: string,
    bet: number,
  ): Promise<JackpotWin | null> {
    const jackpot = await this.store.getJackpot();
    const betBonus = Math.min(JACKPOT_MAX_BET_BONUS, Math.max(1, bet / 100));
    const chance = JACKPOT_BASE_CHANCE * betBonus;

    if (this.rng.float() >= chance) return null;

    const amount = jackpot.pool;
    await this.wallet.apply({
      userId,
      type: "win",
      amount,
      refType: "jackpot",
      refId: jackpot.id,
    });
    await this.store.putJackpot({
      ...jackpot,
      pool: jackpot.seed,
      lastWonAt: new Date().toISOString(),
      lastWonBy: userId,
      lastWonByName: userName,
      lastWonAmount: amount,
    });
    return { amount, pool: jackpot.seed };
  }
}
