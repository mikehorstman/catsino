import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

/**
 * Resolve service-account credentials from, in order:
 *   1. FIREBASE_SERVICE_ACCOUNT  — the JSON itself (best for hosts/Vercel)
 *   2. GOOGLE_APPLICATION_CREDENTIALS — a path to the JSON
 *   3. .secrets/firebase-service-account.json — local dev default
 */
function loadCredential() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inline) return cert(JSON.parse(inline));

  const path =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    join(process.cwd(), ".secrets/firebase-service-account.json");
  if (existsSync(path)) return cert(JSON.parse(readFileSync(path, "utf8")));

  throw new Error(
    "Firestore backend selected but no credentials found. Set FIREBASE_SERVICE_ACCOUNT " +
      "or GOOGLE_APPLICATION_CREDENTIALS, or place a key at .secrets/firebase-service-account.json",
  );
}

export function getFirebaseApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  return initializeApp({
    credential: loadCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID ?? "catsino-casino",
  });
}

