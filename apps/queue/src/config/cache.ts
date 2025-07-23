import { redisConnection } from "./redis";

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export const CACHE_CONFIG = {
  // Default TTL values (in seconds)
  TTL: {
    HEALTH_CHECK: 300, // 5 minutes
    PARSED_HTML: 3600, // 1 hour
    NOTE_METADATA: 1800, // 30 minutes
    QUEUE_STATUS: 60, // 1 minute
    USER_SESSION: 86400, // 24 hours
  },

  // Cache key prefixes
  PREFIXES: {
    HEALTH: "health:",
    HTML: "html:",
    NOTE: "note:",
    QUEUE: "queue:",
    SESSION: "session:",
    METRICS: "metrics:",
  },

  // Performance settings
  PERFORMANCE: {
    MAX_KEY_SIZE: 1024 * 1024, // 1MB
    BATCH_SIZE: 100,
    CONNECTION_TIMEOUT: 5000,
  },
} as const;

// ============================================================================
// CACHE INTERFACES
// ============================================================================

export interface CacheOptions {
  ttl?: number;
  memoryTtl?: number; // TTL for memory cache in milliseconds
  compress?: boolean;
  tags?: readonly string[]; // Make readonly to match our cache options
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
  lastReset: Date;
}

// ============================================================================
// CACHE MANAGER
// ============================================================================

export class CacheManager {
  private static instance: CacheManager;
  private stats: CacheStats;
  private isConnected: boolean = false;

  private constructor() {
    this.stats = {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 0,
      lastReset: new Date(),
    };
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  public async connect(): Promise<void> {
    try {
      // Test connection by trying to get a simple key
      await redisConnection.get("connection_test");
      this.isConnected = true;
      console.log("✅ Cache connection established");
    } catch (error) {
      this.isConnected = false;
      console.error("❌ Cache connection failed:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await redisConnection.quit();
      this.isConnected = false;
      console.log("🛑 Cache connection closed");
    } catch (error) {
      console.error("❌ Error closing cache connection:", error);
    }
  }

  public isReady(): boolean {
    return this.isConnected;
  }

  // ============================================================================
  // BASIC CACHE OPERATIONS
  // ============================================================================

  public async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const value = await redisConnection.get(key);

      if (value) {
        this.stats.hits++;
        return JSON.parse(value) as T;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error(`❌ Cache get error for key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  public async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);
      const ttl = options.ttl || CACHE_CONFIG.TTL.NOTE_METADATA;

      await redisConnection.set(key, serializedValue, { EX: ttl });

      // Update stats
      this.stats.keys++;

      // Add tags if specified
      if (options.tags && options.tags.length > 0) {
        await this.addTags(key, [...options.tags]);
      }
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error);
    }
  }

  public async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }
    if (typeof key !== "string" || !key) {
      throw new Error("Cache delete called with undefined or empty key");
    }
    try {
      await redisConnection.del(key);
      this.stats.keys = Math.max(0, this.stats.keys - 1);
    } catch (error) {
      console.error(`❌ Cache delete error for key ${key}:`, error);
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await redisConnection.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  // ============================================================================
  // ADVANCED CACHE OPERATIONS
  // ============================================================================

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

  public async invalidateByPattern(pattern: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      const keys = await redisConnection.keys(pattern);
      const filteredKeys = keys.filter(
        (k): k is string => typeof k === "string"
      );
      if (filteredKeys.length > 0) {
        await redisConnection.del(filteredKeys);
        this.stats.keys = Math.max(0, this.stats.keys - filteredKeys.length);
        return filteredKeys.length;
      }
      return 0;
    } catch (error) {
      console.error(`❌ Cache invalidate error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  public async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      let totalDeleted = 0;

      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await redisConnection.sMembers(tagKey);
        const filteredKeys = keys.filter(
          (k): k is string => typeof k === "string"
        );
        if (filteredKeys.length > 0) {
          await redisConnection.del(filteredKeys);
          await redisConnection.del(tagKey);
          totalDeleted += filteredKeys.length;
        }
      }

      this.stats.keys = Math.max(0, this.stats.keys - totalDeleted);
      return totalDeleted;
    } catch (error) {
      console.error(`❌ Cache tag invalidation error:`, error);
      return 0;
    }
  }

  private async addTags(key: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await redisConnection.sAdd(tagKey, key);
      }
    } catch (error) {
      console.error(`❌ Cache tag addition error:`, error);
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  public async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected) {
      return keys.map(() => null);
    }

    try {
      const filteredKeys = keys.filter(
        (k): k is string => typeof k === "string"
      );
      const values = await redisConnection.mGet(filteredKeys);
      return values.map((value) => {
        if (value) {
          this.stats.hits++;
          return JSON.parse(value) as T;
        } else {
          this.stats.misses++;
          return null;
        }
      });
    } catch (error) {
      console.error("❌ Cache mget error:", error);
      return keys.map(() => null);
    }
  }

  public async mset<T>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const multi = redisConnection.multi();

      for (const { key, value, options } of entries) {
        if (typeof key !== "string" || !key) continue;
        const serializedValue = JSON.stringify(value);
        const ttl = options?.ttl || CACHE_CONFIG.TTL.NOTE_METADATA;
        multi.set(key, serializedValue, { EX: ttl });
        if (options?.tags) {
          for (const tag of options.tags) {
            const tagKey = `tag:${tag}`;
            multi.sAdd(tagKey, key);
          }
        }
      }

      await multi.exec();
      this.stats.keys += entries.length;
    } catch (error) {
      console.error("❌ Cache mset error:", error);
    }
  }

  // ============================================================================
  // CACHE STATISTICS
  // ============================================================================

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public async updateStats(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      const info = await redisConnection.info();
      const keys = await redisConnection.dbSize();

      this.stats.keys = keys;

      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:(\d+)/);
      if (memoryMatch) {
        this.stats.memory =
          memoryMatch && typeof memoryMatch[1] === "string"
            ? parseInt(memoryMatch[1], 10)
            : 0;
      }
    } catch (error) {
      console.warn("⚠️ Could not update cache stats:", error);
    }
  }

  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 0,
      lastReset: new Date(),
    };
  }

  public getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // ============================================================================
  // CACHE UTILITIES
  // ============================================================================

  public generateKey(prefix: string, ...parts: (string | undefined)[]): string {
    if (typeof prefix !== "string" || !prefix) {
      throw new Error(
        "Cache generateKey called with undefined or empty prefix"
      );
    }
    // Filter out undefined parts to ensure only strings are joined
    return `${prefix}${parts.filter((p): p is string => typeof p === "string").join(":")}`;
  }

  public async clearAll(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await redisConnection.flushDb();
      this.stats.keys = 0;
      console.log("🗑️ Cache cleared");
    } catch (error) {
      console.error("❌ Cache clear error:", error);
    }
  }

  public async getKeys(pattern: string): Promise<string[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      return await redisConnection.keys(pattern);
    } catch (error) {
      console.error(`❌ Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE (DEPRECATED - Use ManagerFactory instead)
// ============================================================================

// @deprecated Use ManagerFactory.createCacheManager() instead
export const cacheManager = CacheManager.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export async function cacheGet<T>(key: string): Promise<T | null> {
  return cacheManager.get<T>(key);
}

export async function cacheSet<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<void> {
  return cacheManager.set(key, value, options);
}

export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  return cacheManager.getOrSet(key, factory, options);
}

export async function cacheDelete(key: string): Promise<void> {
  return cacheManager.delete(key);
}

export async function cacheInvalidate(pattern: string): Promise<number> {
  return cacheManager.invalidateByPattern(pattern);
}

export function getCacheStats(): CacheStats {
  return cacheManager.getStats();
}
