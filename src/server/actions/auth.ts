"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/server/auth/session";
import { getStore } from "@/server/store";
import { AuthService, AuthError } from "@/server/services/auth";

const registerSchema = z.object({
  email: z.string().email().max(200),
  displayName: z.string().min(1).max(40),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

async function setSession(
  userId: string,
  email: string,
  role: "player" | "admin",
) {
  const token = await createSessionToken({ sub: userId, email, role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function registerAction(
  input: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Invalid input",
    );

  try {
    const service = new AuthService(getStore());
    const user = await service.register(parsed.data);
    await setSession(user.id, user.email, user.role);
    return { ok: true, data: { userId: user.id } };
  } catch (error) {
    if (error instanceof AuthError) return fail(error.code, error.message);
    return fail("UNKNOWN", "Something went wrong. Please try again.");
  }
}

export async function loginAction(
  input: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", "Invalid input");

  try {
    const service = new AuthService(getStore());
    const user = await service.login(parsed.data.email, parsed.data.password);
    await setSession(user.id, user.email, user.role);
    return { ok: true, data: { userId: user.id } };
  } catch (error) {
    if (error instanceof AuthError) return fail(error.code, error.message);
    return fail("UNKNOWN", "Something went wrong. Please try again.");
  }
}

export async function logoutAction(): Promise<ActionResult<null>> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return { ok: true, data: null };
}
