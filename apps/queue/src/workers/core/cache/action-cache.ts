// Action cache logic
const globalActionCache = new Map<string, unknown>();

export function setActionCache(key: string, value: unknown, ttlMs: number) {
  globalActionCache.set(key, value);
  setTimeout(() => globalActionCache.delete(key), ttlMs);
}

export function getActionCache<T>(key: string): T | undefined {
  return globalActionCache.get(key) as T | undefined;
}

export { globalActionCache };
