/**
 * Simple in-memory cache for action results
 */
export class ActionResultCache {
  private cache = new Map<
    string,
    { value: any; timestamp: number; ttl: number }
  >();

  /**
   * Get a cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, value: T, ttlMs: number = 300000): void {
    // Default 5 minutes
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

/**
 * Global cache instance
 */
export const globalActionCache = new ActionResultCache();

/**
 * Helper function to create a cache key
 */
export function createCacheKey(
  prefix: string,
  ...parts: (string | number)[]
): string {
  return `${prefix}:${parts.join(":")}`;
}
