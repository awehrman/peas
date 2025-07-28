import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestError } from "../../test-utils/service";
import {
  DatabaseOptimizer,
  createOptimizedQuery,
  databaseOptimizer,
  generateCacheKey,
  optimizeBatchOperations,
  optimizeQuery,
} from "../database-optimizer";
// Import mocked modules
import { performanceOptimizer } from "../performance-optimizer";

// Mock dependencies before imports
vi.mock("../performance-optimizer", () => ({
  performanceOptimizer: {
    profile: vi.fn(),
  },
}));

vi.mock("../standardized-logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock("../../config/configuration-manager", () => ({
  configManager: {
    getConfig: vi.fn(() => ({
      queue: { batchSize: 100 },
      database: { queryTimeout: 5000, maxConnections: 10 },
    })),
  },
}));

describe("DatabaseOptimizer", () => {
  let optimizer: DatabaseOptimizer;
  let mockPerformanceOptimizer: typeof performanceOptimizer;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mocked performance optimizer
    mockPerformanceOptimizer = performanceOptimizer;

    // Setup default mock behavior
    (
      mockPerformanceOptimizer.profile as ReturnType<typeof vi.fn>
    ).mockImplementation(async (name, fn) => {
      return await fn();
    });

    optimizer = new DatabaseOptimizer();
  });

  describe("constructor", () => {
    it("should initialize with default options", () => {
      const defaultOptimizer = new DatabaseOptimizer();
      expect(defaultOptimizer).toBeInstanceOf(DatabaseOptimizer);
    });

    it("should initialize with custom options", () => {
      const customOptions = {
        enableQueryCaching: false,
        enableBatchOperations: false,
        maxBatchSize: 50,
        queryTimeout: 3000,
      };

      const customOptimizer = new DatabaseOptimizer(customOptions);
      expect(customOptimizer).toBeInstanceOf(DatabaseOptimizer);
    });
  });

  describe("executeQuery", () => {
    it("should execute query without caching when cache is disabled", async () => {
      const customOptimizer = new DatabaseOptimizer({
        enableQueryCaching: false,
      });
      const queryFn = vi.fn().mockResolvedValue("test data");

      const result = await customOptimizer.executeQuery(
        "test_query",
        queryFn,
        "cache_key"
      );

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(result.data).toBe("test data");
      expect(result.cached).toBe(false);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it("should execute query without cache key", async () => {
      const queryFn = vi.fn().mockResolvedValue("test data");

      const result = await optimizer.executeQuery("test_query", queryFn);

      expect(queryFn).toHaveBeenCalledTimes(1);
      expect(result.data).toBe("test data");
      expect(result.cached).toBe(false);
    });

    it("should return cached result when available", async () => {
      const queryFn = vi.fn().mockResolvedValue("test data");
      const cacheKey = "test_cache_key";

      // First call to populate cache
      await optimizer.executeQuery("test_query", queryFn, cacheKey, 60000);

      // Second call should use cache
      const result = await optimizer.executeQuery(
        "test_query",
        queryFn,
        cacheKey
      );

      expect(queryFn).toHaveBeenCalledTimes(1); // Only called once
      expect(result.data).toBe("test data");
      expect(result.cached).toBe(true);
      expect(result.executionTime).toBe(0);
    });

    it("should not use expired cache", async () => {
      const queryFn = vi.fn().mockResolvedValue("test data");
      const cacheKey = "test_cache_key";

      // First call with short TTL
      await optimizer.executeQuery("test_query", queryFn, cacheKey, 1);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call should not use expired cache
      const result = await optimizer.executeQuery(
        "test_query",
        queryFn,
        cacheKey
      );

      expect(queryFn).toHaveBeenCalledTimes(2);
      expect(result.cached).toBe(false);
    });

    it("should mark query as optimized when execution time is under 100ms", async () => {
      const queryFn = vi.fn().mockResolvedValue("test data");

      const result = await optimizer.executeQuery("test_query", queryFn);

      expect(result.optimized).toBe(true);
    });

    it("should handle query errors", async () => {
      const error = createTestError("Query failed");
      const queryFn = vi.fn().mockRejectedValue(error);

      await expect(
        optimizer.executeQuery("test_query", queryFn)
      ).rejects.toThrow("Query failed");
    });
  });

  describe("executeBatchOperations", () => {
    it("should execute batch operations successfully", async () => {
      const items = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        data: `item${i}`,
      }));
      const operation = vi.fn().mockImplementation(async (batch) =>
        batch.map((item: { id: number; data: string }) => ({
          ...item,
          processed: true,
        }))
      );

      const result = await optimizer.executeBatchOperations(
        items,
        operation,
        10
      );

      expect(operation).toHaveBeenCalledTimes(3); // 25 items / 10 batch size = 3 batches
      expect(result.results).toHaveLength(25);
      expect(result.batchCount).toBe(3);
      expect(result.successCount).toBe(25);
      expect(result.errorCount).toBe(0);
      expect(result.totalTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle batch operation errors", async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const operation = vi
        .fn()
        .mockResolvedValueOnce([{ id: 0, processed: true }]) // First batch succeeds
        .mockRejectedValueOnce(new Error("Batch failed")); // Second batch fails

      const result = await optimizer.executeBatchOperations(
        items,
        operation,
        5
      );

      expect(result.successCount).toBe(5);
      expect(result.errorCount).toBe(5);
      expect(result.results).toHaveLength(1); // Only results from successful batch
    });

    it("should use default batch size when not specified", async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      const operation = vi
        .fn()
        .mockImplementation(async (batch) =>
          batch.map((item: { id: number }) => ({ ...item, processed: true }))
        );

      const result = await optimizer.executeBatchOperations(items, operation);

      expect(result.batchCount).toBe(1); // 50 items / 100 default batch size = 1 batch
    });

    it("should handle empty items array", async () => {
      const operation = vi.fn().mockResolvedValue([]);

      const result = await optimizer.executeBatchOperations([], operation);

      expect(operation).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(0);
      expect(result.batchCount).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(0);
    });
  });

  describe("optimizePrismaQuery", () => {
    it("should optimize query with all options", () => {
      const baseQuery = { model: "User" };
      const options = {
        select: { id: true, name: true },
        include: { profile: true },
        take: 10,
        skip: 5,
        orderBy: { createdAt: "desc" },
        where: { active: true },
      };

      const result = optimizer.optimizePrismaQuery(baseQuery, options);

      expect(result).toEqual({
        model: "User",
        select: { id: true, name: true },
        include: { profile: true },
        take: 10,
        skip: 5,
        orderBy: { createdAt: "desc" },
        where: { active: true },
      });
    });

    it("should optimize query with partial options", () => {
      const baseQuery = { model: "User" };
      const options = {
        select: { id: true },
        take: 5,
      };

      const result = optimizer.optimizePrismaQuery(baseQuery, options);

      expect(result).toEqual({
        model: "User",
        select: { id: true },
        take: 5,
      });
    });

    it("should return base query when no options provided", () => {
      const baseQuery = { model: "User" };

      const result = optimizer.optimizePrismaQuery(baseQuery);

      expect(result).toEqual(baseQuery);
    });
  });

  describe("createOptimizedFindManyQuery", () => {
    it("should create findMany query with all options", () => {
      const options = {
        select: { id: true, name: true },
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 10,
        include: { profile: true },
      };

      const result = optimizer.createOptimizedFindManyQuery("User", options);

      expect(result).toEqual({
        select: { id: true, name: true },
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 10,
        include: { profile: true },
      });
    });

    it("should use default take limit when not specified", () => {
      const result = optimizer.createOptimizedFindManyQuery("User");

      expect(result.take).toBe(100);
    });
  });

  describe("createOptimizedFindUniqueQuery", () => {
    it("should create findUnique query with options", () => {
      const options = {
        select: { id: true, name: true },
        include: { profile: true },
      };

      const result = optimizer.createOptimizedFindUniqueQuery("User", options);

      expect(result).toEqual({
        select: { id: true, name: true },
        include: { profile: true },
      });
    });
  });

  describe("createOptimizedCreateQuery", () => {
    it("should create create query with options", () => {
      const options = {
        select: { id: true, name: true },
        include: { profile: true },
      };

      const result = optimizer.createOptimizedCreateQuery("User", options);

      expect(result).toEqual({
        select: { id: true, name: true },
        include: { profile: true },
      });
    });
  });

  describe("createOptimizedUpdateQuery", () => {
    it("should create update query with options", () => {
      const options = {
        select: { id: true, name: true },
        include: { profile: true },
      };

      const result = optimizer.createOptimizedUpdateQuery("User", options);

      expect(result).toEqual({
        select: { id: true, name: true },
        include: { profile: true },
      });
    });
  });

  describe("clearQueryCache", () => {
    it("should clear the query cache", async () => {
      const queryFn = vi.fn().mockResolvedValue("test data");

      // Populate cache
      await optimizer.executeQuery("test_query", queryFn, "cache_key");

      // Clear cache
      optimizer.clearQueryCache();

      // Verify cache is cleared
      const stats = optimizer.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", () => {
      const stats = optimizer.getCacheStats();

      expect(stats).toEqual({
        size: 0,
        hitRate: 0.8,
        missRate: 0.2,
      });
    });

    it("should return correct size after adding items", async () => {
      const queryFn = vi.fn().mockResolvedValue("test data");

      await optimizer.executeQuery("test_query", queryFn, "cache_key");

      const stats = optimizer.getCacheStats();
      expect(stats.size).toBe(1);
    });
  });

  describe("getOptimizedConnectionConfig", () => {
    it("should return optimized connection configuration", () => {
      const config = optimizer.getOptimizedConnectionConfig();

      expect(config).toEqual({
        pool: {
          min: 2,
          max: 10, // From mock config
          acquireTimeoutMillis: 5000, // From mock config
          createTimeoutMillis: 5000, // From mock config
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
        },
        connection: {
          timeout: 5000, // From mock config
        },
      });
    });
  });

  describe("generateCacheKey", () => {
    it("should generate consistent cache key for same parameters", () => {
      const params1 = { id: 1, name: "test", active: true };
      const params2 = { active: true, name: "test", id: 1 }; // Different order

      const key1 = optimizer.generateCacheKey("findUser", params1);
      const key2 = optimizer.generateCacheKey("findUser", params2);

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different operations", () => {
      const params = { id: 1 };

      const key1 = optimizer.generateCacheKey("findUser", params);
      const key2 = optimizer.generateCacheKey("findPost", params);

      expect(key1).not.toBe(key2);
    });

    it("should handle empty parameters", () => {
      const key = optimizer.generateCacheKey("findAll", {});

      expect(key).toBe("findAll:{}");
    });
  });

  describe("cleanupExpiredCache", () => {
    it("should clean up expired cache entries", async () => {
      const queryFn = vi.fn().mockResolvedValue("test data");

      // Add items with short TTL
      await optimizer.executeQuery("test_query1", queryFn, "cache_key1", 1);
      await optimizer.executeQuery("test_query2", queryFn, "cache_key2", 1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Clean up expired entries
      optimizer.cleanupExpiredCache();

      const stats = optimizer.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it("should not clean up non-expired cache entries", async () => {
      const queryFn = vi.fn().mockResolvedValue("test data");

      // Add item with long TTL
      await optimizer.executeQuery("test_query", queryFn, "cache_key", 60000);

      // Clean up (should not remove non-expired entry)
      optimizer.cleanupExpiredCache();

      const stats = optimizer.getCacheStats();
      expect(stats.size).toBe(1);
    });
  });

  describe("chunkArray", () => {
    it("should split array into correct chunks", () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // Access private method through reflection for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chunkArray = (optimizer as any).chunkArray;
      const chunks = chunkArray(array, 3);

      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    });

    it("should handle empty array", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chunkArray = (optimizer as any).chunkArray;
      const chunks = chunkArray([], 5);

      expect(chunks).toEqual([]);
    });

    it("should handle array smaller than chunk size", () => {
      const array = [1, 2];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chunkArray = (optimizer as any).chunkArray;
      const chunks = chunkArray(array, 5);

      expect(chunks).toEqual([[1, 2]]);
    });
  });
});

describe("Utility Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("optimizeQuery", () => {
    it("should call databaseOptimizer.executeQuery", async () => {
      const queryFn = vi.fn().mockResolvedValue("test data");

      const result = await optimizeQuery(
        "test_query",
        queryFn,
        "cache_key",
        30000
      );

      expect(result.data).toBe("test data");
      expect(result.cached).toBe(false);
    });
  });

  describe("optimizeBatchOperations", () => {
    it("should call databaseOptimizer.executeBatchOperations", async () => {
      const items = [{ id: 1 }, { id: 2 }];
      const operation = vi
        .fn()
        .mockImplementation(async (batch) =>
          batch.map((item: { id: number }) => ({ ...item, processed: true }))
        );

      const result = await optimizeBatchOperations(items, operation, 10);

      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
    });
  });

  describe("createOptimizedQuery", () => {
    it("should call databaseOptimizer.optimizePrismaQuery", () => {
      const options = {
        select: { id: true },
        where: { active: true },
      };

      const result = createOptimizedQuery("User", options);

      expect(result).toEqual({
        select: { id: true },
        where: { active: true },
      });
    });
  });

  describe("generateCacheKey", () => {
    it("should call databaseOptimizer.generateCacheKey", () => {
      const params = { id: 1, name: "test" };

      const key = generateCacheKey("findUser", params);

      expect(key).toBe('findUser:{"id":1,"name":"test"}');
    });
  });
});

describe("Database Optimizer Instance", () => {
  it("should export a singleton instance", () => {
    expect(databaseOptimizer).toBeInstanceOf(DatabaseOptimizer);
  });

  it("should be the same instance across imports", async () => {
    // Import the same module again to test singleton behavior
    const { databaseOptimizer: instance1 } = await import(
      "../database-optimizer"
    );
    const { databaseOptimizer: instance2 } = await import(
      "../database-optimizer"
    );

    expect(instance1).toBe(instance2);
  });
});
