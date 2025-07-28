import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ManagerFactory } from "../../../../config/factory";
import {
  ActionCache,
  CACHE_OPTIONS,
  CacheKeyGenerator,
  actionCache,
} from "../../../core/cache/action-cache";

// Type definitions for testing
type MockCacheManager = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  invalidateByPattern: ReturnType<typeof vi.fn>;
  clearAll: ReturnType<typeof vi.fn>;
};

type ActionCacheClass = {
  new (): ActionCache;
  getInstance(): ActionCache;
  instance?: ActionCache;
  MEMORY_CACHE_SIZE_LIMIT: number;
  cleanupMemoryCache(): void;
};

// Mock the ManagerFactory
vi.mock("../../../../config/factory", () => ({
  ManagerFactory: {
    createCacheManager: vi.fn(),
  },
}));

describe("ActionCache", () => {
  let mockCacheManager: MockCacheManager;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a proper mock cache manager
    mockCacheManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      delete: vi.fn(),
      invalidateByPattern: vi.fn().mockResolvedValue(0),
      clearAll: vi.fn(),
    };

    (
      ManagerFactory.createCacheManager as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockCacheManager);

    // Mock console.warn
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Clear the singleton instance for each test
    (ActionCache as unknown as ActionCacheClass).instance = undefined;
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = ActionCache.getInstance();
      const instance2 = ActionCache.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should create new instance when none exists", () => {
      const instance = ActionCache.getInstance();
      expect(instance).toBeInstanceOf(ActionCache);
    });
  });

  describe("get method", () => {
    it("should return value from memory cache", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };

      // Set in memory cache
      await cache.set("test-key", testData, { memoryTtl: 60000 });

      const result = await cache.get("test-key");
      expect(result).toEqual(testData);
    });

    it("should return null for non-existent key in memory", async () => {
      const cache = ActionCache.getInstance();
      const result = await cache.get("non-existent");
      expect(result).toBeNull();
    });

    it("should fall back to Redis cache when not in memory", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };

      mockCacheManager.get.mockResolvedValue(testData);

      const result = await cache.get("redis-key");
      expect(result).toEqual(testData);
      expect(mockCacheManager.get).toHaveBeenCalledWith("redis-key");
    });

    it("should cache Redis result in memory", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };

      mockCacheManager.get.mockResolvedValue(testData);

      await cache.get("redis-key");

      // Second call should hit memory cache
      const result = await cache.get("redis-key");
      expect(result).toEqual(testData);
      expect(mockCacheManager.get).toHaveBeenCalledTimes(1);
    });

    it("should handle Redis cache errors gracefully", async () => {
      const cache = ActionCache.getInstance();
      mockCacheManager.get.mockRejectedValue(new Error("Redis error"));

      const result = await cache.get("error-key");
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Cache get failed for key error-key:",
        expect.any(Error)
      );
    });

    it("should handle expired memory cache entries", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };

      // Set with very short TTL
      await cache.set("expired-key", testData, { memoryTtl: 1 });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await cache.get("expired-key");
      expect(result).toBeNull();
    });
  });

  describe("set method", () => {
    it("should set value in memory cache", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };

      await cache.set("test-key", testData);

      const result = await cache.get("test-key");
      expect(result).toEqual(testData);
    });

    it("should set value in Redis cache", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };

      await cache.set("test-key", testData, { ttl: 300 });

      expect(mockCacheManager.set).toHaveBeenCalledWith("test-key", testData, {
        ttl: 300,
      });
    });

    it("should handle Redis set errors gracefully", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };

      mockCacheManager.set.mockRejectedValue(new Error("Redis set error"));

      await cache.set("error-key", testData);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Cache set failed for key error-key:",
        expect.any(Error)
      );
    });

    it("should use default memory TTL when not specified", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };

      await cache.set("test-key", testData);

      // Should still be in memory cache
      const result = await cache.get("test-key");
      expect(result).toEqual(testData);
    });
  });

  describe("getOrSet method", () => {
    it("should return cached value when available", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };
      const factory = vi.fn().mockResolvedValue(testData);

      // Set initial value
      await cache.set("test-key", testData);

      const result = await cache.getOrSet("test-key", factory);

      expect(result).toEqual(testData);
      expect(factory).not.toHaveBeenCalled();
    });

    it("should call factory and cache result when not available", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };
      const factory = vi.fn().mockResolvedValue(testData);

      const result = await cache.getOrSet("test-key", factory);

      expect(result).toEqual(testData);
      expect(factory).toHaveBeenCalledOnce();
    });

    it("should use provided cache options", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };
      const factory = vi.fn().mockResolvedValue(testData);
      const options = { ttl: 600, memoryTtl: 120000 };

      await cache.getOrSet("test-key", factory, options);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        "test-key",
        testData,
        options
      );
    });
  });

  describe("delete method", () => {
    it("should delete from memory cache", async () => {
      const cache = ActionCache.getInstance();
      const testData = { id: "123", name: "test" };

      await cache.set("test-key", testData);
      await cache.delete("test-key");

      const result = await cache.get("test-key");
      expect(result).toBeNull();
    });

    it("should delete from Redis cache", async () => {
      const cache = ActionCache.getInstance();

      await cache.delete("test-key");

      expect(mockCacheManager.delete).toHaveBeenCalledWith("test-key");
    });

    it("should handle Redis delete errors gracefully", async () => {
      const cache = ActionCache.getInstance();
      mockCacheManager.delete.mockRejectedValue(
        new Error("Redis delete error")
      );

      await cache.delete("error-key");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Cache delete failed for key error-key:",
        expect.any(Error)
      );
    });
  });

  describe("invalidateByPattern method", () => {
    it("should clear memory cache entries matching pattern", async () => {
      const cache = ActionCache.getInstance();

      await cache.set("user:profile:123", { id: "123" });
      await cache.set("user:profile:456", { id: "456" });
      await cache.set("note:metadata:789", { id: "789" });

      const cleared = await cache.invalidateByPattern("user:profile");

      expect(cleared).toBeGreaterThan(0);

      const userProfile = await cache.get("user:profile:123");
      const noteMetadata = await cache.get("note:metadata:789");

      expect(userProfile).toBeNull();
      expect(noteMetadata).not.toBeNull();
    });

    it("should clear Redis cache entries matching pattern", async () => {
      const cache = ActionCache.getInstance();
      mockCacheManager.invalidateByPattern.mockResolvedValue(5);

      const cleared = await cache.invalidateByPattern("user:*");

      expect(mockCacheManager.invalidateByPattern).toHaveBeenCalledWith(
        "user:*"
      );
      expect(cleared).toBeGreaterThan(0);
    });

    it("should handle Redis invalidation errors gracefully", async () => {
      const cache = ActionCache.getInstance();
      mockCacheManager.invalidateByPattern.mockRejectedValue(
        new Error("Redis invalidation error")
      );

      const cleared = await cache.invalidateByPattern("user:*");

      expect(cleared).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Cache invalidation failed for pattern user:*:",
        expect.any(Error)
      );
    });
  });

  describe("clearAll method", () => {
    it("should clear memory cache", async () => {
      const cache = ActionCache.getInstance();

      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.clearAll();

      const result1 = await cache.get("key1");
      const result2 = await cache.get("key2");

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it("should clear Redis cache", async () => {
      const cache = ActionCache.getInstance();

      await cache.clearAll();

      expect(mockCacheManager.clearAll).toHaveBeenCalled();
    });

    it("should handle Redis clear errors gracefully", async () => {
      const cache = ActionCache.getInstance();
      mockCacheManager.clearAll.mockRejectedValue(
        new Error("Redis clear error")
      );

      await cache.clearAll();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Cache clear all failed:",
        expect.any(Error)
      );
    });
  });

  describe("getStats method", () => {
    it("should return memory cache statistics", () => {
      const cache = ActionCache.getInstance();

      const stats = cache.getStats();

      expect(stats).toHaveProperty("memorySize");
      expect(stats).toHaveProperty("memoryKeys");
      expect(stats).toHaveProperty("redisStats");
      expect(typeof stats.memorySize).toBe("number");
      expect(Array.isArray(stats.memoryKeys)).toBe(true);
    });
  });

  describe("memory cache management", () => {
    it("should clean up expired entries", async () => {
      const cache = ActionCache.getInstance();

      // Set entries with different TTLs
      await cache.set("expired", "value1", { memoryTtl: 1 });
      await cache.set("valid", "value2", { memoryTtl: 60000 });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Manually trigger cleanup
      (cache as unknown as ActionCacheClass).cleanupMemoryCache();

      const expired = await cache.get("expired");
      const valid = await cache.get("valid");

      expect(expired).toBeNull();
      expect(valid).toBe("value2");
    });

    it("should handle memory cache size limits", async () => {
      const cache = ActionCache.getInstance();
      const originalLimit = (cache as unknown as ActionCacheClass)
        .MEMORY_CACHE_SIZE_LIMIT;

      // Temporarily reduce limit for testing
      (cache as unknown as ActionCacheClass).MEMORY_CACHE_SIZE_LIMIT = 10;

      // Add more entries than the limit to trigger cleanup
      for (let i = 0; i < 15; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }

      // Manually trigger cleanup to ensure it happens
      (cache as unknown as ActionCacheClass).cleanupMemoryCache();

      const stats = cache.getStats();
      // The cleanup should remove some entries to stay under the limit
      expect(stats.memorySize).toBeLessThanOrEqual(10);

      // Restore original limit
      (cache as unknown as ActionCacheClass).MEMORY_CACHE_SIZE_LIMIT =
        originalLimit;
    });
  });
});

describe("CacheKeyGenerator", () => {
  describe("noteMetadata", () => {
    it("should generate note metadata key", () => {
      const key = CacheKeyGenerator.noteMetadata("note-123");
      expect(key).toBe("note:metadata:note-123");
    });
  });

  describe("noteStatus", () => {
    it("should generate note status key", () => {
      const key = CacheKeyGenerator.noteStatus("note-456");
      expect(key).toBe("note:status:note-456");
    });
  });

  describe("databaseQuery", () => {
    it("should generate database query key", () => {
      const key = CacheKeyGenerator.databaseQuery("abc123hash");
      expect(key).toBe("db:query:abc123hash");
    });
  });

  describe("actionResult", () => {
    it("should generate action result key", () => {
      const key = CacheKeyGenerator.actionResult("parse", "input-hash-456");
      expect(key).toBe("action:parse:input-hash-456");
    });
  });

  describe("fileProcessing", () => {
    it("should generate file processing key", () => {
      const key = CacheKeyGenerator.fileProcessing("/path/to/file.txt");
      expect(key).toBe("file:processed:/path/to/file.txt");
    });
  });
});

describe("CACHE_OPTIONS", () => {
  it("should have correct NOTE_METADATA options", () => {
    expect(CACHE_OPTIONS.NOTE_METADATA).toEqual({
      ttl: 1800,
      memoryTtl: 60000,
      tags: ["note", "metadata"],
    });
  });

  it("should have correct DATABASE_QUERY options", () => {
    expect(CACHE_OPTIONS.DATABASE_QUERY).toEqual({
      ttl: 300,
      memoryTtl: 30000,
      tags: ["database", "query"],
    });
  });

  it("should have correct ACTION_RESULT options", () => {
    expect(CACHE_OPTIONS.ACTION_RESULT).toEqual({
      ttl: 600,
      memoryTtl: 120000,
      tags: ["action", "result"],
    });
  });

  it("should have correct FILE_PROCESSING options", () => {
    expect(CACHE_OPTIONS.FILE_PROCESSING).toEqual({
      ttl: 3600,
      memoryTtl: 300000,
      tags: ["file", "processing"],
    });
  });

  it("should have correct INGREDIENT_PARSING options", () => {
    expect(CACHE_OPTIONS.INGREDIENT_PARSING).toEqual({
      ttl: 3600,
      memoryTtl: 300000,
      tags: ["ingredient", "parsing"],
    });
  });
});

describe("actionCache singleton export", () => {
  it("should export singleton instance", () => {
    expect(actionCache).toBeInstanceOf(ActionCache);
  });
});
