import type { User } from "firebase/auth";

/** Exchange the signed-in Firebase user for the server session cookie. */
export async function establishSession(
  user: User,
  displayName?: string,
): Promise<{ created: boolean }> {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, displayName }),
  });
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    created?: boolean;
  } | null;
  if (!res.ok || !data?.ok) throw new Error("SESSION_FAILED");
  return { created: Boolean(data.created) };
}

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password",
  "auth/wrong-password": "Invalid email or password",
  "auth/user-not-found": "Invalid email or password",
  "auth/invalid-email": "Enter a valid email address",
  "auth/email-already-in-use": "That email is already registered",
  "auth/weak-password": "Password must be at least 8 characters",
  "auth/too-many-requests": "Too many attempts. Try again in a few minutes",
  "auth/popup-closed-by-user": "Sign-in was cancelled",
  "auth/cancelled-popup-request": "Sign-in was cancelled",
  "auth/network-request-failed": "Network error. Check your connection",
  "auth/configuration-not-found":
    "Sign-in isn't enabled yet. Enable Authentication in the Firebase console",
  "auth/operation-not-allowed": "This sign-in method isn't enabled yet",
};

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if ((error as Error)?.message === "SESSION_FAILED")
    return "Couldn't start your session. Please try again";
  return "Something went wrong. Please try again";
}

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
