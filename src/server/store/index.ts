import { MemoryStore } from "./memory";
import { FirestoreStore } from "./firestore";
import type { Store } from "./types";

export { newId } from "./memory";
export type { Store } from "./types";

/**
 * Which persistence backend to use.
 *   STORE_BACKEND=firestore  → Firestore (production / shared state)
 *   anything else / unset    → in-memory (with optional JSON file persistence)
 */
function backend(): "firestore" | "memory" {
  return process.env.STORE_BACKEND === "firestore" ? "firestore" : "memory";
}

function resolveFile(): string | null {
  if (process.env.PERSIST !== "file") return null;
  return process.env.CATSINO_DATA_FILE ?? `${process.cwd()}/data/catsino.json`;
}

declare global {
  // eslint-disable-next-line no-var
  var __catsinoStore: Store | undefined;
}

/**
 * Singleton accessor. The instance survives Next.js hot reloads in dev so the
 * in-memory backend keeps its state between requests.
 */
export function getStore(): Store {
  if (!globalThis.__catsinoStore) {
    globalThis.__catsinoStore =
      backend() === "firestore" ? new FirestoreStore() : new MemoryStore(resolveFile());
  }
  return globalThis.__catsinoStore;
}
