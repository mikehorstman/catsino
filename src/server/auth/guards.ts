import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "@/server/store";
import type { UserRecord } from "@/server/store/types";
import { AuthService } from "@/server/services/auth";
import { SESSION_COOKIE, verifySessionCookie } from "./firebase";

/** The signed-in player, or null. Server-only. */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  const session = await verifySessionCookie(cookie);
  if (!session) return null;

  const store = getStore();
  const existing = await store.getUserById(session.uid);
  if (existing) return existing;

  // Signed in with Firebase but the profile is missing (e.g. a failed first
  // provision). Heal it; the ledger id makes the welcome bonus single-use.
  if (!session.email) return null;
  const { user } = await new AuthService(store).provision({
    uid: session.uid,
    email: session.email,
    displayName: session.name as string | undefined,
    provider: session.firebase?.sign_in_provider,
  });
  return user;
}

/**
 * Require a signed-in player. Pages and server actions both use this; an
 * anonymous visitor is sent to the login page.
 */
export async function requireUser(): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Throwing guard for admin-only actions. */
export async function requireAdmin(): Promise<UserRecord> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}
