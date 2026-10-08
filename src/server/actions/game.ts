"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrCreateUser } from "@/server/auth/guards";
import { getStore } from "@/server/store";
import { RoundError, RoundService } from "@/server/services/round";
import { BonusClaimError, BonusService } from "@/server/services/bonus";
import type { ActionResult } from "./auth";

const betSchema = z.object({
  type: z.enum([
    "straight", "split", "street", "corner", "line",
    "dozen", "column", "red", "black", "odd", "even", "low", "high",
  ]),
  selection: z.array(z.number().int().min(0).max(36)).max(36),
  amount: z.number().int().positive(),
});

const rouletteSchema = z.object({
  bets: z.array(betSchema).min(1).max(50),
  idempotencyKey: z.string().uuid(),
});

export async function spinRouletteAction(input: unknown): Promise<ActionResult<unknown>> {
  const parsed = rouletteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION", message: "Invalid bets" } };

  const user = await getOrCreateUser();

  try {
    const service = new RoundService(getStore());
    const response = await service.playRoulette({
      user,
      bets: parsed.data.bets,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    revalidatePath("/profile");
    return { ok: true, data: response };
  } catch (error) {
    if (error instanceof RoundError) return { ok: false, error: { code: error.code, message: error.message } };
    return { ok: false, error: { code: "UNKNOWN", message: "Spin failed" } };
  }
}

export async function claimDailyBonusAction(): Promise<ActionResult<{ amount: number; streak: number }>> {
  const user = await getOrCreateUser();

  try {
    const store = getStore();
    const service = new BonusService(store, new RoundService(store).getWalletService());
    const result = await service.claimDaily(user);
    revalidatePath("/bonuses");
    revalidatePath("/");
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof BonusClaimError) return { ok: false, error: { code: error.code, message: error.message } };
    return { ok: false, error: { code: "UNKNOWN", message: "Claim failed" } };
  }
}

export async function claimRefillAction(): Promise<ActionResult<{ amount: number }>> {
  const user = await getOrCreateUser();

  try {
    const store = getStore();
    const service = new BonusService(store, new RoundService(store).getWalletService());
    const result = await service.claimRefill(user);
    revalidatePath("/bonuses");
    return { ok: true, data: result };
  } catch (error) {
    if (error instanceof BonusClaimError) return { ok: false, error: { code: error.code, message: error.message } };
    return { ok: false, error: { code: "UNKNOWN", message: "Claim failed" } };
  }
}
