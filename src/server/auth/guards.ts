import { cookies } from "next/headers";
import { getStore } from "@/server/store/memory";
import type { UserRecord } from "@/server/store/types";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/** Read the current user from the session cookie, or null. Server-only. */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return getStore().getUserById(payload.sub) ?? null;
}

/** Throwing guard for actions that require a signed-in player. */
export async function requireUser(): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/** Throwing guard for admin-only actions. */
export async function requireAdmin(): Promise<UserRecord> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
