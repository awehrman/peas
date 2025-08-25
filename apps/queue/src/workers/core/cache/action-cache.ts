import type { CacheOptions } from "../../../config/cache";
import { ManagerFactory } from "../../../config/factory";

// ============================================================================
// ACTION CACHE CLASS
// ============================================================================

/**
 * Enhanced action cache for expensive operations
 * Integrates with the existing cache manager for persistence
 */
export class ActionCache {
  private static instance: ActionCache;
  private memoryCache: Map<string, { value: unknown; expiresAt: number }> =
    new Map();
  private readonly MEMORY_CACHE_SIZE_LIMIT = 1000;
  private readonly MEMORY_CACHE_CLEANUP_INTERVAL = 60000; // 1 minute

  private constructor() {
    this.startCleanupInterval();

    // Cache reset on startup is disabled to preserve cache across restarts
    // To force reset, use the /cache/reset-memory endpoint or set FORCE_RESET_MEMORY_CACHE=true
  }

  public static getInstance(): ActionCache {
    if (!ActionCache.instance) {
      ActionCache.instance = new ActionCache();
    }
    return ActionCache.instance;
  }

  /**
   * Get a value from cache (memory first, then Redis)
   */
  public async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryResult = this.getFromMemory<T>(key);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // Fall back to Redis cache
    try {
      const cacheManager = ManagerFactory.createCacheManager();
      const redisResult = await cacheManager.get<T>(key);

      // If found in Redis, also cache in memory for faster access
      if (redisResult !== null) {
        this.setInMemory(key, redisResult, 300000); // 5 minutes in memory
      }

      return redisResult;
    } catch (error) {
      console.warn(`Cache get failed for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache (both memory and Redis)
   */
  public async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    // Set in memory cache
    const memoryTtl = options.memoryTtl || 300000; // 5 minutes default
    this.setInMemory(key, value, memoryTtl);

    // Set in Redis cache
    try {
      const cacheManager = ManagerFactory.createCacheManager();
      await cacheManager.set(key, value, options);
    } catch (error) {
      console.warn(`Cache set failed for key ${key}:`, error);
    }
  }

  /**
   * Get or set a value with a factory function
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, generate and store
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Delete a value from cache
   */
  public async delete(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from Redis cache
    try {
      const cacheManager = ManagerFactory.createCacheManager();
      await cacheManager.delete(key);
    } catch (error) {
      console.warn(`Cache delete failed for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  public async invalidateByPattern(pattern: string): Promise<number> {
    // Clear memory cache entries that match pattern
    let memoryCleared = 0;
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        memoryCleared++;
      }
    }

    // Clear Redis cache entries that match pattern
    try {
      const cacheManager = ManagerFactory.createCacheManager();
      const redisCleared = await cacheManager.invalidateByPattern(pattern);
      return memoryCleared + redisCleared;
    } catch (error) {
      console.warn(`Cache invalidation failed for pattern ${pattern}:`, error);
      return memoryCleared;
    }
  }

  /**
   * Clear all cache
   */
  public async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear Redis cache
    try {
      const cacheManager = ManagerFactory.createCacheManager();
      await cacheManager.clearAll();
    } catch (error) {
      console.warn("Cache clear all failed:", error);
    }
  }

  /**
   * Reset only the memory cache (keeps Redis cache intact)
   */
  public resetMemoryCache(): void {
    this.memoryCache.clear();
    console.log(
      "Memory cache reset - cleared",
      this.memoryCache.size,
      "entries"
    );
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    memorySize: number;
    memoryKeys: string[];
    redisStats: unknown;
  } {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
      redisStats: null, // Could be enhanced to get Redis stats
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private setInMemory<T>(key: string, value: T, ttlMs: number): void {
    // Clean up if we're at the limit
    if (this.memoryCache.size >= this.MEMORY_CACHE_SIZE_LIMIT) {
      this.cleanupMemoryCache();
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.memoryCache) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      this.memoryCache.delete(key);
    }

    // If still at limit, remove oldest entries
    if (this.memoryCache.size >= this.MEMORY_CACHE_SIZE_LIMIT) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);

      const toRemove = entries.slice(
        0,
        Math.floor(this.MEMORY_CACHE_SIZE_LIMIT * 0.2)
      ); // Remove 20%
      for (const [key] of toRemove) {
        this.memoryCache.delete(key);
      }
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      /* istanbul ignore next -- @preserve */
      this.cleanupMemoryCache();
    }, this.MEMORY_CACHE_CLEANUP_INTERVAL);
  }
}

// Export singleton instance
export const actionCache = ActionCache.getInstance();

// ============================================================================
// CACHE KEY GENERATORS
// ============================================================================

/**
 * Generate cache keys for different types of operations
 */
export class CacheKeyGenerator {
  /**
   * Generate key for note metadata
   */
  static noteMetadata(noteId: string): string {
    return `note:metadata:${noteId}`;
  }

  /**
   * Generate key for note status
   */
  static noteStatus(noteId: string): string {
    return `note:status:${noteId}`;
  }

  /**
   * Generate key for database query results
   */
  static databaseQuery(queryHash: string): string {
    return `db:query:${queryHash}`;
  }

  /**
   * Generate key for action results
   */
  static actionResult(actionName: string, inputHash: string): string {
    return `action:${actionName}:${inputHash}`;
  }

  /**
   * Generate key for file processing results
   */
  static fileProcessing(filePath: string): string {
    return `file:processed:${filePath}`;
  }
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/**
 * Default cache options for different operation types
 */
export const CACHE_OPTIONS = {
  NOTE_METADATA: {
    ttl: 1800, // 30 minutes
    memoryTtl: 60000, // 1 minute in memory
    tags: ["note", "metadata"],
  },
  DATABASE_QUERY: {
    ttl: 300, // 5 minutes
    memoryTtl: 30000, // 30 seconds in memory
    tags: ["database", "query"],
  },
  ACTION_RESULT: {
    ttl: 600, // 10 minutes
    memoryTtl: 120000, // 2 minutes in memory
    tags: ["action", "result"],
  },
  FILE_PROCESSING: {
    ttl: 3600, // 1 hour
    memoryTtl: 300000, // 5 minutes in memory
    tags: ["file", "processing"],
  },
  INGREDIENT_PARSING: {
    ttl: 3600, // 1 hour
    memoryTtl: 300000, // 5 minutes in memory
    tags: ["ingredient", "parsing"],
  },
} as const;
