"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSlotConfig } from "@/games/slots/registry";
import { requireUser } from "@/server/auth/guards";
import { getStore } from "@/server/store/memory";
import { RoundError, RoundService } from "@/server/services/round";
import type { ActionResult } from "./auth";

const spinSchema = z.object({
  gameId: z.string().min(1).max(50),
  bet: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});

export async function spinSlotAction(input: unknown): Promise<ActionResult<unknown>> {
  const parsed = spinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: { code: "VALIDATION", message: "Invalid spin request" } };

  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: { code: "UNAUTHENTICATED", message: "Please sign in" } };
  }

  const config = getSlotConfig(parsed.data.gameId);
  if (!config) return { ok: false, error: { code: "NOT_FOUND", message: "Game not found" } };

  try {
    const service = new RoundService(getStore());
    const response = await service.playSlot({
      user,
      config,
      bet: parsed.data.bet,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    revalidatePath("/profile");
    return { ok: true, data: response };
  } catch (error) {
    if (error instanceof RoundError) return { ok: false, error: { code: error.code, message: error.message } };
    return { ok: false, error: { code: "UNKNOWN", message: "Spin failed" } };
  }
}
