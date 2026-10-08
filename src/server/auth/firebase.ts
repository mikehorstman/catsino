import { getAuth } from "firebase-admin/auth";
import { getFirebaseApp } from "@/server/firebase-admin";

export { SESSION_COOKIE } from "./cookie-name";
/** Firebase session cookies live 1 minute to 14 days; use 5. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

const adminAuth = () => getAuth(getFirebaseApp());

/** Verify a freshly issued client ID token (must be recent: guards token theft). */
export async function verifyFreshIdToken(idToken: string) {
  const decoded = await adminAuth().verifyIdToken(idToken, true);
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
    throw new Error("STALE_TOKEN");
  }
  return decoded;
}

export function createSessionCookie(idToken: string) {
  return adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
}

/** Returns the decoded session, or null when missing/expired/revoked. */
export async function verifySessionCookie(cookie: string) {
  try {
    return await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}
