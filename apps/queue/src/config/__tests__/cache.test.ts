import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestEnvironment } from "../../test-utils/test-utils";
import { CACHE_CONFIG, CacheManager } from "../cache";

// Mock Redis connection - this needs to be done before importing CacheManager
vi.mock("../redis", () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    mGet: vi.fn(),
    multi: vi.fn(),
    keys: vi.fn(),
    quit: vi.fn(),
    scan: vi.fn(),
    sMembers: vi.fn(),
  };
  return {
    redisConnection: mockRedis,
  };
});

describe("CacheManager", () => {
  let cacheManager: CacheManager;
  let testEnv: ReturnType<typeof setupTestEnvironment>;
  let mockRedisConnection: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    mGet: ReturnType<typeof vi.fn>;
    multi: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    sMembers: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    testEnv = setupTestEnvironment();
    cacheManager = CacheManager.getInstance();
    vi.clearAllMocks();

    // Get the mocked Redis connection
    const { redisConnection } = await import("../redis");
    mockRedisConnection =
      redisConnection as unknown as typeof mockRedisConnection;
  });

  afterEach(() => {
    testEnv.cleanup();
    vi.clearAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance when called multiple times", () => {
      const instance1 = CacheManager.getInstance();
      const instance2 = CacheManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should have correct initial stats", () => {
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.keys).toBe(0);
      expect(stats.memory).toBe(0);
      expect(stats.lastReset).toBeInstanceOf(Date);
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      mockRedisConnection.get.mockResolvedValue("test");

      await cacheManager.connect();
      expect(cacheManager.isReady()).toBe(true);
    });

    it("should handle connection failures", async () => {
      mockRedisConnection.get.mockRejectedValue(new Error("Connection failed"));

      await expect(cacheManager.connect()).rejects.toThrow("Connection failed");
      expect(cacheManager.isReady()).toBe(false);
    });

    it("should disconnect successfully", async () => {
      mockRedisConnection.quit.mockResolvedValue("OK");

      await cacheManager.disconnect();
      expect(cacheManager.isReady()).toBe(false);
    });
  });

  describe("Basic Operations", () => {
    beforeEach(async () => {
      mockRedisConnection.get.mockResolvedValue("test");
      await cacheManager.connect();
    });

    it("should set and get values", async () => {
      const testData = { name: "test", value: 123 };

      mockRedisConnection.set.mockResolvedValue("OK");
      mockRedisConnection.get.mockResolvedValue(JSON.stringify(testData));

      await cacheManager.set("test-key", testData);
      const result = await cacheManager.get("test-key");

      expect(result).toEqual(testData);
      expect(mockRedisConnection.set).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify(testData),
        { EX: 1800 }
      );
      expect(mockRedisConnection.get).toHaveBeenCalledWith("test-key");
    });

    it("should return null for non-existent keys", async () => {
      mockRedisConnection.get.mockResolvedValue(null);

      const result = await cacheManager.get("non-existent");
      expect(result).toBeNull();
    });

    it("should delete keys", async () => {
      mockRedisConnection.del.mockResolvedValue(1);

      await cacheManager.delete("test-key");
      expect(mockRedisConnection.del).toHaveBeenCalledWith("test-key");
    });

    it("should check if key exists", async () => {
      mockRedisConnection.exists.mockResolvedValue(1);

      const exists = await cacheManager.exists("test-key");
      expect(exists).toBe(true);
      expect(mockRedisConnection.exists).toHaveBeenCalledWith("test-key");
    });
  });

  describe("Advanced Operations", () => {
    beforeEach(async () => {
      mockRedisConnection.get.mockResolvedValue("test");
      await cacheManager.connect();
    });

    it("should get or set with factory function", async () => {
      const testData = { name: "generated", value: 456 };
      const factory = vi.fn().mockResolvedValue(testData);

      // First call - key doesn't exist, should call factory
      mockRedisConnection.get.mockResolvedValue(null);
      mockRedisConnection.set.mockResolvedValue("OK");

      const result = await cacheManager.getOrSet("test-key", factory);

      expect(result).toEqual(testData);
      expect(factory).toHaveBeenCalledTimes(1);
      expect(mockRedisConnection.set).toHaveBeenCalledWith(
        "test-key",
        JSON.stringify(testData),
        { EX: 1800 }
      );

      // Second call - key exists, should not call factory
      mockRedisConnection.get.mockResolvedValue(JSON.stringify(testData));
      factory.mockClear();

      const cachedResult = await cacheManager.getOrSet("test-key", factory);

      expect(cachedResult).toEqual(testData);
      expect(factory).not.toHaveBeenCalled();
    });

    it("should handle multiple get operations", async () => {
      const testData = [
        { key: "key1", value: "value1" },
        { key: "key2", value: "value2" },
        null, // key3 doesn't exist
      ];

      mockRedisConnection.mGet.mockResolvedValue([
        JSON.stringify(testData[0]),
        JSON.stringify(testData[1]),
        null,
      ]);

      const results = await cacheManager.mget(["key1", "key2", "key3"]);

      expect(results).toEqual(testData);
      expect(mockRedisConnection.mGet).toHaveBeenCalledWith([
        "key1",
        "key2",
        "key3",
      ]);
    });

    it("should handle multiple set operations", async () => {
      const entries = [
        { key: "key1", value: "value1" },
        { key: "key2", value: "value2", options: { ttl: 3600 } },
      ];

      const mockMulti = {
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockRedisConnection.multi.mockReturnValue(mockMulti);

      await cacheManager.mset(entries);

      expect(mockRedisConnection.multi).toHaveBeenCalled();
      expect(mockMulti.set).toHaveBeenCalledWith(
        "key1",
        JSON.stringify("value1"),
        { EX: 1800 }
      );
      expect(mockMulti.set).toHaveBeenCalledWith(
        "key2",
        JSON.stringify("value2"),
        { EX: 3600 }
      );
      expect(mockMulti.exec).toHaveBeenCalled();
    });
  });

  describe("Cache Invalidation", () => {
    beforeEach(async () => {
      mockRedisConnection.get.mockResolvedValue("test");
      await cacheManager.connect();
    });

    it("should invalidate by pattern", async () => {
      const keys = ["user:1:profile", "user:1:settings", "user:2:profile"];

      mockRedisConnection.keys.mockResolvedValue(keys);
      mockRedisConnection.del.mockResolvedValue(3);

      const deletedCount = await cacheManager.invalidateByPattern("user:1:*");

      expect(deletedCount).toBe(3);
      expect(mockRedisConnection.keys).toHaveBeenCalledWith("user:1:*");
      expect(mockRedisConnection.del).toHaveBeenCalledWith(keys);
    });

    it("should invalidate by tags", async () => {
      const taggedKeys = ["key1", "key2"];

      mockRedisConnection.sMembers.mockResolvedValue(taggedKeys);
      mockRedisConnection.del.mockResolvedValue(2);

      const deletedCount = await cacheManager.invalidateByTags(["user"]);

      expect(deletedCount).toBe(2);
      expect(mockRedisConnection.sMembers).toHaveBeenCalledWith("tag:user");
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      mockRedisConnection.get.mockResolvedValue("test");
      await cacheManager.connect();
    });

    it("should track hits and misses", async () => {
      // Reset stats first
      cacheManager.resetStats();

      // Simulate a hit
      mockRedisConnection.get.mockResolvedValue(
        JSON.stringify({ data: "test" })
      );
      await cacheManager.get("existing-key");

      // Simulate a miss
      mockRedisConnection.get.mockResolvedValue(null);
      await cacheManager.get("non-existing-key");

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it("should calculate hit rate correctly", async () => {
      // Reset stats first
      cacheManager.resetStats();

      // Ensure cache manager is connected
      mockRedisConnection.get.mockResolvedValue("test");
      await cacheManager.connect();

      // Manually set stats for testing by calling methods that update stats
      mockRedisConnection.get.mockResolvedValue(
        JSON.stringify({ data: "test" })
      );

      // Call get 8 times to simulate hits
      for (let i = 0; i < 8; i++) {
        await cacheManager.get("test-key");
      }

      // Call get 2 times to simulate misses
      mockRedisConnection.get.mockResolvedValue(null);
      for (let i = 0; i < 2; i++) {
        await cacheManager.get("test-key");
      }

      const hitRate = cacheManager.getHitRate();
      expect(hitRate).toBe(80); // 8 / (8 + 2) * 100 = 80
    });

    it("should reset statistics", () => {
      const originalStats = cacheManager.getStats();
      originalStats.hits = 10;
      originalStats.misses = 5;

      cacheManager.resetStats();

      const newStats = cacheManager.getStats();
      expect(newStats.hits).toBe(0);
      expect(newStats.misses).toBe(0);
      expect(newStats.lastReset).toBeInstanceOf(Date);
    });
  });

  describe("Key Generation", () => {
    it("should generate keys with prefixes", () => {
      const key = cacheManager.generateKey("user", "123", "profile");
      expect(key).toBe("user123:profile");
    });

    it("should handle undefined parts", () => {
      const key = cacheManager.generateKey("user", undefined, "profile");
      expect(key).toBe("userprofile");
    });
  });

  describe("Configuration", () => {
    it("should have correct TTL values", () => {
      expect(CACHE_CONFIG.TTL.HEALTH_CHECK).toBe(300);
      expect(CACHE_CONFIG.TTL.PARSED_HTML).toBe(3600);
      expect(CACHE_CONFIG.TTL.NOTE_METADATA).toBe(1800);
      expect(CACHE_CONFIG.TTL.QUEUE_STATUS).toBe(60);
      expect(CACHE_CONFIG.TTL.USER_SESSION).toBe(86400);
    });

    it("should have correct prefixes", () => {
      expect(CACHE_CONFIG.PREFIXES.HEALTH).toBe("health:");
      expect(CACHE_CONFIG.PREFIXES.HTML).toBe("html:");
      expect(CACHE_CONFIG.PREFIXES.NOTE).toBe("note:");
      expect(CACHE_CONFIG.PREFIXES.QUEUE).toBe("queue:");
      expect(CACHE_CONFIG.PREFIXES.SESSION).toBe("session:");
      expect(CACHE_CONFIG.PREFIXES.METRICS).toBe("metrics:");
    });

    it("should have correct performance settings", () => {
      expect(CACHE_CONFIG.PERFORMANCE.MAX_KEY_SIZE).toBe(1024 * 1024);
      expect(CACHE_CONFIG.PERFORMANCE.BATCH_SIZE).toBe(100);
      expect(CACHE_CONFIG.PERFORMANCE.CONNECTION_TIMEOUT).toBe(5000);
    });
  });
});
