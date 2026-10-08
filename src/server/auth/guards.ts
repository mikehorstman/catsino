import { cookies } from "next/headers";
import { getStore } from "@/server/store";
import type { UserRecord } from "@/server/store/types";
import { AuthService } from "@/server/services/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, verifySessionToken } from "./session";

const GUEST_COOKIE = "catsino_guest";

/** Read the current user from the session cookie, or null. Server-only. */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  return (await getStore().getUserById(payload.sub)) ?? null;
}

/**
 * Return the current user, auto-provisioning a guest account when nobody is
 * signed in. This is what makes the app playable without a sign-in step.
 *
 * The guest id comes from a middleware-set cookie, so the same guest is reused
 * across requests. The session cookie is only set from Server Actions (Next.js
 * forbids cookie writes during render); until then the guest id cookie is the
 * identity, which is enough for gameplay.
 */
export async function getOrCreateUser(): Promise<UserRecord> {
  const existing = await getCurrentUser();
  if (existing) return existing;

  const store = getStore();
  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE)?.value;

  if (guestId) {
    const known = await store.getUserById(guestId);
    if (known) return known;
  }

  // Reuse the middleware-assigned id so the guest is stable across requests.
  return new AuthService(store).createGuest(guestId);
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
