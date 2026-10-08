/**
 * A tiny per-key async mutex. Serialises wallet mutations so two concurrent
 * game actions for the same user cannot double-spend. This is the in-memory
 * stand-in for a database row lock.
 */
const chains = new Map<string, Promise<unknown>>();

export async function withLock<T>(
  key: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const chained = previous.then(() => gate);
  chains.set(key, chained);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (chains.get(key) === chained) chains.delete(key);
  }
}
