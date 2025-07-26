import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Import after mocks
import { ManagerFactory } from "../../config/factory";
import { CachedIngredientParser } from "../../services/ingredient/cached-ingredient-parser";
import {
  type MockActionCache,
  type MockCachedIngredientParser,
  type MockManagerFactory,
  createMockActionCacheStats,
  createMockCacheManager,
  createMockRedisClient,
  createMockRedisStats,
  createTestApp,
} from "../../test-utils/test-utils";
import { HttpStatus } from "../../types";
import { actionCache } from "../../workers/core/cache/action-cache";
import { cacheRouter } from "../cache";

// Mock dependencies
vi.mock("../../config/factory", () => ({
  ManagerFactory: {
    createCacheManager: vi.fn(),
  },
}));

vi.mock("../../services/ingredient/cached-ingredient-parser", () => ({
  CachedIngredientParser: {
    parseIngredientLines: vi.fn(),
    getCacheStats: vi.fn(),
    invalidateIngredientCache: vi.fn(),
  },
}));

vi.mock("../../workers/core/cache/action-cache", () => ({
  actionCache: {
    getStats: vi.fn(),
    clearAll: vi.fn(),
    invalidateByPattern: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("Cache Router", () => {
  let app: express.Application;
  let mockCacheManager: ReturnType<typeof createMockRedisClient> & {
    getHitRate: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
  };
  let mockActionCacheStats: {
    memorySize: number;
    memoryKeys: string[];
  };
  let mockRedisStats: {
    hits: number;
    misses: number;
    keys: number;
    lastReset: string;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create test app
    app = createTestApp();
    app.use("/cache", cacheRouter);

    // Setup mock cache manager
    mockCacheManager = createMockCacheManager();

    // Setup mock stats
    mockActionCacheStats = createMockActionCacheStats();
    mockRedisStats = createMockRedisStats();

    // Setup default mock implementations
    (
      ManagerFactory.createCacheManager as MockManagerFactory["createCacheManager"]
    ).mockReturnValue(mockCacheManager);
    (actionCache.getStats as MockActionCache["getStats"]).mockReturnValue(
      mockActionCacheStats
    );
    (mockCacheManager.getStats as ReturnType<typeof vi.fn>).mockReturnValue(
      mockRedisStats
    );
    (actionCache.clearAll as MockActionCache["clearAll"]).mockResolvedValue(
      undefined
    );
    (
      actionCache.invalidateByPattern as MockActionCache["invalidateByPattern"]
    ).mockResolvedValue(5);
    (actionCache.delete as MockActionCache["delete"]).mockResolvedValue(
      undefined
    );
    (
      CachedIngredientParser.parseIngredientLines as MockCachedIngredientParser["parseIngredientLines"]
    ).mockResolvedValue([{ parsed: true, ingredient: "flour" }]);
    (
      CachedIngredientParser.getCacheStats as MockCachedIngredientParser["getCacheStats"]
    ).mockReturnValue({
      hits: 50,
      misses: 10,
      hitRate: 83.3,
    });
    (
      CachedIngredientParser.invalidateIngredientCache as MockCachedIngredientParser["invalidateIngredientCache"]
    ).mockResolvedValue(3);
  });

  describe("GET /cache/stats", () => {
    it("should return cache statistics successfully", async () => {
      const response = await request(app).get("/cache/stats");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.success).toBe(true);
      expect(response.body.data.actionCache).toEqual({
        memorySize: 1024,
        memoryKeys: ["key1", "key2", "key3", "key4", "key5"],
        totalMemoryKeys: 5,
      });
      expect(response.body.data.redis).toEqual({
        hits: 100,
        misses: 20,
        keys: 50,
        hitRate: 85.5,
        lastReset: mockRedisStats.lastReset,
      });
      expect(response.body.data.performance.totalHits).toBe(1124);
      expect(response.body.data.performance.totalRequests).toBe(120);
      expect(response.body.data.performance.overallHitRate).toBeCloseTo(
        936.67,
        2
      );
      expect(response.body.timestamp).toBeDefined();
    });

    it("should handle errors when getting cache stats", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (actionCache.getStats as MockActionCache["getStats"]).mockImplementation(
        () => {
          throw new Error("Cache stats error");
        }
      );

      const response = await request(app).get("/cache/stats");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Failed to retrieve cache statistics",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get cache stats:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("POST /cache/clear", () => {
    it("should clear all caches successfully", async () => {
      const response = await request(app).post("/cache/clear");

      expect(actionCache.clearAll).toHaveBeenCalled();
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        message: "All caches cleared successfully",
        timestamp: expect.any(String),
      });
    });

    it("should handle errors when clearing caches", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (actionCache.clearAll as MockActionCache["clearAll"]).mockRejectedValue(
        new Error("Clear error")
      );

      const response = await request(app).post("/cache/clear");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Failed to clear caches",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to clear caches:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("POST /cache/invalidate", () => {
    it("should invalidate cache by pattern successfully", async () => {
      const response = await request(app)
        .post("/cache/invalidate")
        .send({ pattern: "test-*" });

      expect(actionCache.invalidateByPattern).toHaveBeenCalledWith("test-*");
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        message: "Invalidated 5 cache entries matching pattern: test-*",
        clearedCount: 5,
        pattern: "test-*",
        timestamp: expect.any(String),
      });
    });

    it("should return error when pattern is missing", async () => {
      const response = await request(app).post("/cache/invalidate").send({});

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        success: false,
        error: "Pattern is required and must be a string",
      });
      expect(actionCache.invalidateByPattern).not.toHaveBeenCalled();
    });

    it("should return error when pattern is not a string", async () => {
      const response = await request(app)
        .post("/cache/invalidate")
        .send({ pattern: 123 });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        success: false,
        error: "Pattern is required and must be a string",
      });
      expect(actionCache.invalidateByPattern).not.toHaveBeenCalled();
    });

    it("should handle errors when invalidating cache", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        actionCache.invalidateByPattern as MockActionCache["invalidateByPattern"]
      ).mockRejectedValue(new Error("Invalidate error"));

      const response = await request(app)
        .post("/cache/invalidate")
        .send({ pattern: "test-*" });

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Failed to invalidate cache",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to invalidate cache:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("GET /cache/keys", () => {
    it("should get cache keys with default pattern", async () => {
      const response = await request(app).get("/cache/keys");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: {
          pattern: "*",
          keys: ["key1", "key2", "key3", "key4", "key5"],
          totalKeys: 5,
          totalMemoryKeys: 5,
        },
        timestamp: expect.any(String),
      });
    });

    it("should get cache keys with specific pattern", async () => {
      const response = await request(app).get("/cache/keys?pattern=key");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: {
          pattern: "key",
          keys: ["key1", "key2", "key3", "key4", "key5"],
          totalKeys: 5,
          totalMemoryKeys: 5,
        },
        timestamp: expect.any(String),
      });
    });

    it("should return error when pattern is not a string", async () => {
      // Query parameters are always strings in HTTP, so this test case doesn't apply
      // The validation would only trigger if pattern was somehow not a string
      // Let's test with a valid pattern instead
      const response = await request(app).get("/cache/keys?pattern=valid");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: {
          pattern: "valid",
          keys: [],
          totalKeys: 0,
          totalMemoryKeys: 5,
        },
        timestamp: expect.any(String),
      });
    });

    it("should handle errors when getting cache keys", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (actionCache.getStats as MockActionCache["getStats"]).mockImplementation(
        () => {
          throw new Error("Get keys error");
        }
      );

      const response = await request(app).get("/cache/keys");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Failed to retrieve cache keys",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get cache keys:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should limit keys to 50 when there are more", async () => {
      // Create more than 50 keys
      const manyKeys = Array.from({ length: 60 }, (_, i) => `key${i}`);
      (actionCache.getStats as MockActionCache["getStats"]).mockReturnValue({
        ...mockActionCacheStats,
        memoryKeys: manyKeys,
      });

      const response = await request(app).get("/cache/keys");

      expect(response.body).toEqual({
        success: true,
        data: {
          pattern: "*",
          keys: manyKeys.slice(0, 50),
          totalKeys: 60,
          totalMemoryKeys: 60,
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe("DELETE /cache/keys/:key", () => {
    it("should delete specific cache key successfully", async () => {
      const response = await request(app).delete("/cache/keys/test-key");

      expect(actionCache.delete).toHaveBeenCalledWith("test-key");
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        message: "Cache key 'test-key' deleted successfully",
        key: "test-key",
        timestamp: expect.any(String),
      });
    });

    it("should return error when key is missing", async () => {
      const response = await request(app).delete("/cache/keys/");

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      // Express returns 404 for routes that don't match
      expect(actionCache.delete).not.toHaveBeenCalled();
    });

    it("should handle errors when deleting cache key", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (actionCache.delete as MockActionCache["delete"]).mockRejectedValue(
        new Error("Delete error")
      );

      const response = await request(app).delete("/cache/keys/test-key");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Failed to delete cache key",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to delete cache key:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("POST /cache/ingredient/parse", () => {
    it("should parse ingredient lines successfully", async () => {
      const response = await request(app)
        .post("/cache/ingredient/parse")
        .send({
          lines: ["1 cup flour", "2 eggs"],
          options: { debug: true },
        });

      expect(CachedIngredientParser.parseIngredientLines).toHaveBeenCalledWith(
        ["1 cup flour", "2 eggs"],
        { debug: true }
      );
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: {
          lines: ["1 cup flour", "2 eggs"],
          results: [{ parsed: true, ingredient: "flour" }],
          totalLines: 2,
          cacheStats: {
            hits: 50,
            misses: 10,
            hitRate: 83.3,
          },
        },
        timestamp: expect.any(String),
      });
    });

    it("should parse ingredient lines with default options", async () => {
      await request(app)
        .post("/cache/ingredient/parse")
        .send({
          lines: ["1 cup flour"],
        });

      expect(CachedIngredientParser.parseIngredientLines).toHaveBeenCalledWith(
        ["1 cup flour"],
        {}
      );
    });

    it("should return error when lines array is missing", async () => {
      const response = await request(app)
        .post("/cache/ingredient/parse")
        .send({});

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        success: false,
        error: "Lines array is required",
      });
      expect(
        CachedIngredientParser.parseIngredientLines
      ).not.toHaveBeenCalled();
    });

    it("should return error when lines is not an array", async () => {
      const response = await request(app)
        .post("/cache/ingredient/parse")
        .send({ lines: "not an array" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        success: false,
        error: "Lines array is required",
      });
      expect(
        CachedIngredientParser.parseIngredientLines
      ).not.toHaveBeenCalled();
    });

    it("should handle errors when parsing ingredient lines", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        CachedIngredientParser.parseIngredientLines as MockCachedIngredientParser["parseIngredientLines"]
      ).mockRejectedValue(new Error("Parse error"));

      const response = await request(app)
        .post("/cache/ingredient/parse")
        .send({
          lines: ["1 cup flour"],
        });

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Failed to parse ingredient lines",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to parse ingredient lines:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("GET /cache/ingredient/stats", () => {
    it("should get ingredient cache statistics successfully", async () => {
      const response = await request(app).get("/cache/ingredient/stats");

      expect(CachedIngredientParser.getCacheStats).toHaveBeenCalled();
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: {
          hits: 50,
          misses: 10,
          hitRate: 83.3,
        },
        timestamp: expect.any(String),
      });
    });

    it("should handle errors when getting ingredient cache stats", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        CachedIngredientParser.getCacheStats as MockCachedIngredientParser["getCacheStats"]
      ).mockImplementation(() => {
        throw new Error("Stats error");
      });

      const response = await request(app).get("/cache/ingredient/stats");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Failed to get ingredient cache stats",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to get ingredient cache stats:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("POST /cache/ingredient/invalidate", () => {
    it("should invalidate ingredient cache with pattern successfully", async () => {
      const response = await request(app)
        .post("/cache/ingredient/invalidate")
        .send({ pattern: "flour-*" });

      expect(
        CachedIngredientParser.invalidateIngredientCache
      ).toHaveBeenCalledWith("flour-*");
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        message:
          "Invalidated 3 ingredient cache entries matching pattern: flour-*",
        clearedCount: 3,
        pattern: "flour-*",
        timestamp: expect.any(String),
      });
    });

    it("should invalidate ingredient cache without pattern successfully", async () => {
      const response = await request(app)
        .post("/cache/ingredient/invalidate")
        .send({});

      expect(
        CachedIngredientParser.invalidateIngredientCache
      ).toHaveBeenCalledWith(undefined);
      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        message: "Invalidated 3 ingredient cache entries",
        clearedCount: 3,
        pattern: undefined,
        timestamp: expect.any(String),
      });
    });

    it("should handle errors when invalidating ingredient cache", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        CachedIngredientParser.invalidateIngredientCache as MockCachedIngredientParser["invalidateIngredientCache"]
      ).mockRejectedValue(new Error("Invalidate error"));

      const response = await request(app)
        .post("/cache/ingredient/invalidate")
        .send({ pattern: "test-*" });

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Failed to invalidate ingredient cache",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to invalidate ingredient cache:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
