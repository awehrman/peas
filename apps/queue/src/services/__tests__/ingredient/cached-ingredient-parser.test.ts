import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogLevel } from "../../../types";
import type { StructuredLogger } from "../../../types";
import {
  CachedIngredientParser,
  INGREDIENT_CACHE_OPTIONS,
  IngredientCacheKeyGenerator,
  type IngredientParseResult,
  type IngredientParsingOptions,
} from "../../ingredient/cached-ingredient-parser";

// Mock the action cache
vi.mock("../../../workers/core/cache/action-cache", () => ({
  actionCache: {
    getOrSet: vi.fn(),
    invalidateByPattern: vi.fn(),
    getStats: vi.fn(),
  },
  CacheKeyGenerator: {
    actionResult: vi.fn(),
  },
  CACHE_OPTIONS: {
    ACTION_RESULT: {
      ttl: 3600,
      memoryTtl: 300000,
      tags: ["action", "result"],
    },
  },
}));

// Mock the v1 parser module
vi.mock("@peas/parser/v1/minified", () => ({
  parse: vi.fn(),
}));

describe("CachedIngredientParser", () => {
  let mockLogger: StructuredLogger;
  let mockActionCache: ReturnType<
    typeof vi.mocked<
      typeof import("../../../workers/core/cache/action-cache").actionCache
    >
  >;
  let mockCacheKeyGenerator: ReturnType<
    typeof vi.mocked<
      typeof import("../../../workers/core/cache/action-cache").CacheKeyGenerator
    >
  >;
  let mockV1Parser: ReturnType<
    typeof vi.mocked<typeof import("@peas/parser/v1/minified").parse>
  >;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    // Get the mocked modules
    const actionCacheModule = await import(
      "../../../workers/core/cache/action-cache"
    );
    mockActionCache = vi.mocked(actionCacheModule.actionCache);
    mockCacheKeyGenerator = vi.mocked(actionCacheModule.CacheKeyGenerator);

    const v1ParserModule = await import("@peas/parser/v1/minified");
    mockV1Parser = vi.mocked(v1ParserModule.parse);

    // Setup default mock implementations
    mockCacheKeyGenerator.actionResult.mockReturnValue("test-cache-key");
  });

  describe("parseIngredientLine", () => {
    it("should parse ingredient line with caching enabled", async () => {
      const line = "1 cup flour";
      const options: IngredientParsingOptions = { cacheResults: true };
      const mockResult: IngredientParseResult = {
        rule: "ingredient",
        type: "ingredient",
        values: [
          {
            index: 0,
            rule: "quantity",
            type: "quantity",
            value: "1",
            processingTime: 10,
          },
          {
            index: 1,
            rule: "unit",
            type: "unit",
            value: "cup",
            processingTime: 5,
          },
          {
            index: 2,
            rule: "ingredient",
            type: "ingredient",
            value: "flour",
            processingTime: 15,
          },
        ],
        processingTime: 30,
      };

      mockActionCache.getOrSet.mockResolvedValue(mockResult);

      const result = await CachedIngredientParser.parseIngredientLine(
        line,
        options,
        mockLogger
      );

      expect(mockCacheKeyGenerator.actionResult).toHaveBeenCalledWith(
        "parse_ingredient_line",
        expect.stringContaining("1 cup flour")
      );

      expect(mockActionCache.getOrSet).toHaveBeenCalledWith(
        "test-cache-key",
        expect.any(Function),
        expect.objectContaining({ ttl: 3600 })
      );

      expect(result).toEqual(mockResult);
    });

    it("should parse ingredient line with caching disabled", async () => {
      const line = "2 tbsp butter";
      const options: IngredientParsingOptions = { cacheResults: false };

      mockV1Parser.mockReturnValue({
        rule: "ingredient",
        type: "ingredient",
        values: [
          { type: "quantity", value: 2, rule: "quantity" },
          { type: "unit", value: "tbsp", rule: "unit" },
          { type: "ingredient", value: "butter", rule: "ingredient" },
        ],
      });

      const result = await CachedIngredientParser.parseIngredientLine(
        line,
        options,
        mockLogger
      );

      expect(mockActionCache.getOrSet).not.toHaveBeenCalled();
      expect(mockV1Parser).toHaveBeenCalledWith("2 tbsp butter");
      expect(result.rule).toBe("ingredient");
      expect(result.values).toHaveLength(3);
    });

    it("should handle cache miss and use v1 parser", async () => {
      const line = "3 eggs";
      const options: IngredientParsingOptions = {};

      mockActionCache.getOrSet.mockImplementation(
        async <T>(key: string, factory: () => Promise<T>): Promise<T> => {
          return factory();
        }
      );

      mockV1Parser.mockReturnValue({
        rule: "ingredient",
        type: "ingredient",
        values: [
          { type: "quantity", value: 3, rule: "quantity" },
          { type: "ingredient", value: "eggs", rule: "ingredient" },
        ],
      });

      const result = await CachedIngredientParser.parseIngredientLine(
        line,
        options,
        mockLogger
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        '[CACHED_INGREDIENT_PARSER] Cache miss for line: "3 eggs"',
        LogLevel.INFO,
        { line: "3 eggs", cacheKey: "test-cache-key" }
      );

      expect(result.rule).toBe("ingredient");
      expect(result.values).toHaveLength(2);
    });

    it("should handle cache hit and log appropriately", async () => {
      const line = "1 tsp salt";
      const options: IngredientParsingOptions = {};
      const mockResult: IngredientParseResult = {
        rule: "ingredient",
        type: "ingredient",
        values: [
          {
            index: 0,
            rule: "quantity",
            type: "quantity",
            value: "1",
            processingTime: 10,
          },
          {
            index: 1,
            rule: "unit",
            type: "unit",
            value: "tsp",
            processingTime: 5,
          },
          {
            index: 2,
            rule: "ingredient",
            type: "ingredient",
            value: "salt",
            processingTime: 15,
          },
        ],
        processingTime: 30,
      };

      mockActionCache.getOrSet.mockResolvedValue(mockResult);

      const result = await CachedIngredientParser.parseIngredientLine(
        line,
        options,
        mockLogger
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        '[CACHED_INGREDIENT_PARSER] Cache hit for line: "1 tsp salt"',
        LogLevel.INFO,
        {
          line: "1 tsp salt",
          cacheKey: "test-cache-key",
          rule: "ingredient",
          type: "ingredient",
          valuesCount: 3,
          processingTime: 30,
        }
      );

      expect(result).toEqual(mockResult);
    });

    it("should handle v1 parser failure gracefully", async () => {
      const line = "invalid ingredient";
      const options: IngredientParsingOptions = { cacheResults: false };

      mockV1Parser.mockImplementation(() => {
        throw new Error("Parser failed");
      });

      const result = await CachedIngredientParser.parseIngredientLine(
        line,
        options,
        mockLogger
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        '[CACHED_INGREDIENT_PARSER] v1 parser failed for "invalid ingredient": Error: Parser failed',
        LogLevel.ERROR
      );

      expect(result).toEqual({
        rule: "error",
        type: "error",
        values: [],
        processingTime: expect.any(Number),
      });
    });

    it("should handle v1 parser failure without logger", async () => {
      const line = "invalid ingredient";
      const options: IngredientParsingOptions = { cacheResults: false };

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockV1Parser.mockImplementation(() => {
        throw new Error("Parser failed");
      });

      const result = await CachedIngredientParser.parseIngredientLine(
        line,
        options
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[CACHED_INGREDIENT_PARSER] v1 parser failed for "invalid ingredient":',
        expect.any(Error)
      );

      expect(result).toEqual({
        rule: "error",
        type: "error",
        values: [],
        processingTime: expect.any(Number),
      });

      consoleSpy.mockRestore();
    });

    it("should handle cache miss without logger", async () => {
      const line = "1 cup sugar";
      const options: IngredientParsingOptions = {};

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      mockActionCache.getOrSet.mockImplementation(
        async <T>(key: string, factory: () => Promise<T>): Promise<T> => {
          return factory();
        }
      );

      mockV1Parser.mockReturnValue({
        rule: "ingredient",
        type: "ingredient",
        values: [
          { type: "quantity", value: 1, rule: "quantity" },
          { type: "unit", value: "cup", rule: "unit" },
          { type: "ingredient", value: "sugar", rule: "ingredient" },
        ],
      });

      await CachedIngredientParser.parseIngredientLine(line, options);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[CACHED_INGREDIENT_PARSER] Cache miss for line: "1 cup sugar"'
      );

      consoleSpy.mockRestore();
    });

    it("should normalize line and generate proper cache key", async () => {
      const line = "  2 CUPS FLOUR  ";
      const options: IngredientParsingOptions = { strictMode: true };

      mockActionCache.getOrSet.mockResolvedValue({
        rule: "ingredient",
        type: "ingredient",
        values: [],
        processingTime: 10,
      });

      await CachedIngredientParser.parseIngredientLine(
        line,
        options,
        mockLogger
      );

      expect(mockCacheKeyGenerator.actionResult).toHaveBeenCalledWith(
        "parse_ingredient_line",
        expect.stringContaining("2 cups flour")
      );
    });
  });

  describe("parseIngredientLines", () => {
    it("should parse multiple ingredient lines", async () => {
      const lines = ["1 cup flour", "2 tbsp butter", "3 eggs"];
      const options: IngredientParsingOptions = {};

      const mockResults: IngredientParseResult[] = [
        {
          rule: "ingredient",
          type: "ingredient",
          values: [
            {
              index: 0,
              rule: "ingredient",
              type: "ingredient",
              value: "flour",
              processingTime: 10,
            },
          ],
          processingTime: 10,
        },
        {
          rule: "ingredient",
          type: "ingredient",
          values: [
            {
              index: 0,
              rule: "ingredient",
              type: "ingredient",
              value: "butter",
              processingTime: 10,
            },
          ],
          processingTime: 10,
        },
        {
          rule: "ingredient",
          type: "ingredient",
          values: [
            {
              index: 0,
              rule: "ingredient",
              type: "ingredient",
              value: "eggs",
              processingTime: 10,
            },
          ],
          processingTime: 10,
        },
      ];

      mockActionCache.getOrSet
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = await CachedIngredientParser.parseIngredientLines(
        lines,
        options,
        mockLogger
      );

      expect(results).toEqual(mockResults);
      expect(mockActionCache.getOrSet).toHaveBeenCalledTimes(3);
    });

    it("should handle empty lines array", async () => {
      const lines: string[] = [];
      const options: IngredientParsingOptions = {};

      const results = await CachedIngredientParser.parseIngredientLines(
        lines,
        options,
        mockLogger
      );

      expect(results).toEqual([]);
      expect(mockActionCache.getOrSet).not.toHaveBeenCalled();
    });
  });

  describe("invalidateIngredientCache", () => {
    it("should invalidate cache with specific pattern", async () => {
      const pattern = "flour";
      const invalidatedCount = 5;

      mockActionCache.invalidateByPattern.mockResolvedValue(invalidatedCount);

      const result =
        await CachedIngredientParser.invalidateIngredientCache(pattern);

      expect(mockActionCache.invalidateByPattern).toHaveBeenCalledWith(
        "ingredient:flour"
      );
      expect(result).toBe(invalidatedCount);
    });

    it("should invalidate all ingredient cache when no pattern provided", async () => {
      const invalidatedCount = 10;

      mockActionCache.invalidateByPattern.mockResolvedValue(invalidatedCount);

      const result = await CachedIngredientParser.invalidateIngredientCache();

      expect(mockActionCache.invalidateByPattern).toHaveBeenCalledWith(
        "ingredient:"
      );
      expect(result).toBe(invalidatedCount);
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics for ingredient parsing", () => {
      const mockStats = {
        memoryKeys: [
          "ingredient:line:1 cup flour:abc123",
          "ingredient:line:2 tbsp butter:def456",
          "ingredient:pattern:flour:ghi789",
          "other:key:value",
        ],
        memorySize: 4,
        redisStats: {},
      };
      mockActionCache.getStats.mockReturnValue(mockStats);

      const stats = CachedIngredientParser.getCacheStats();

      expect(stats).toEqual({
        totalIngredientKeys: 3,
        ingredientKeys: [
          "ingredient:line:1 cup flour:abc123",
          "ingredient:line:2 tbsp butter:def456",
          "ingredient:pattern:flour:ghi789",
        ],
        totalMemoryKeys: 4,
      });
    });

    it("should handle empty cache statistics", () => {
      const mockStats = {
        memoryKeys: [],
        memorySize: 0,
        redisStats: {},
      };
      mockActionCache.getStats.mockReturnValue(mockStats);

      const stats = CachedIngredientParser.getCacheStats();

      expect(stats).toEqual({
        totalIngredientKeys: 0,
        ingredientKeys: [],
        totalMemoryKeys: 0,
      });
    });

    it("should limit ingredient keys to first 10", () => {
      const mockStats = {
        memoryKeys: Array.from({ length: 15 }, (_, i) => `ingredient:key:${i}`),
        memorySize: 15,
        redisStats: {},
      };
      mockActionCache.getStats.mockReturnValue(mockStats);

      const stats = CachedIngredientParser.getCacheStats();

      expect(stats.totalIngredientKeys).toBe(15);
      expect(stats.ingredientKeys).toHaveLength(10);
      expect(stats.ingredientKeys[0]).toBe("ingredient:key:0");
      expect(stats.ingredientKeys[9]).toBe("ingredient:key:9");
    });
  });

  describe("IngredientCacheKeyGenerator", () => {
    it("should generate ingredient line parsing key", () => {
      const line = "1 cup flour";
      const optionsHash = "abc123";

      const key = IngredientCacheKeyGenerator.ingredientLineParsing(
        line,
        optionsHash
      );

      expect(key).toBe("ingredient:line:1 cup flour:abc123");
    });

    it("should generate ingredient pattern key", () => {
      const pattern = "flour";

      const key = IngredientCacheKeyGenerator.ingredientPattern(pattern);

      expect(key).toBe("ingredient:pattern:flour");
    });

    it("should generate ingredient lookup key", () => {
      const ingredientName = "flour";

      const key = IngredientCacheKeyGenerator.ingredientLookup(ingredientName);

      expect(key).toBe("ingredient:lookup:flour");
    });
  });

  describe("INGREDIENT_CACHE_OPTIONS", () => {
    it("should have correct cache options structure", () => {
      expect(INGREDIENT_CACHE_OPTIONS.LINE_PARSING).toEqual({
        ttl: 3600,
        memoryTtl: 300000,
        tags: ["ingredient", "parsing"],
      });

      expect(INGREDIENT_CACHE_OPTIONS.PATTERN_MATCHING).toEqual({
        ttl: 7200,
        memoryTtl: 600000,
        tags: ["ingredient", "pattern"],
      });

      expect(INGREDIENT_CACHE_OPTIONS.LOOKUP).toEqual({
        ttl: 1800,
        memoryTtl: 120000,
        tags: ["ingredient", "lookup"],
      });
    });
  });

  describe("parseWithV1Parser (private method)", () => {
    it("should convert v1 parser result correctly", async () => {
      const line = "1 cup flour";
      const mockV1Result = {
        rule: "ingredient",
        type: "ingredient",
        values: [
          { type: "quantity", value: 1, rule: "quantity" },
          { type: "unit", value: "cup", rule: "unit" },
          { type: "ingredient", value: "flour", rule: "ingredient" },
        ],
      };

      mockV1Parser.mockReturnValue(mockV1Result);

      const result = await CachedIngredientParser.parseIngredientLine(
        line,
        { cacheResults: false },
        mockLogger
      );

      expect(result.rule).toBe("ingredient");
      expect(result.type).toBe("ingredient");
      expect(result.values).toHaveLength(3);
      expect(result.values[0]).toEqual({
        index: 0,
        rule: "quantity",
        type: "quantity",
        value: "1",
        processingTime: expect.any(Number),
      });
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle v1 parser with non-string values", async () => {
      const line = "1.5 cups flour";
      const mockV1Result = {
        rule: "ingredient",
        type: "ingredient",
        values: [
          { type: "quantity", value: 1.5, rule: "quantity" },
          { type: "unit", value: "cups", rule: "unit" },
          { type: "ingredient", value: "flour", rule: "ingredient" },
        ],
      };

      mockV1Parser.mockReturnValue(mockV1Result);

      const result = await CachedIngredientParser.parseIngredientLine(
        line,
        { cacheResults: false },
        mockLogger
      );

      expect(result.values[0]?.value).toBe("1.5");
      expect(result.values[1]?.value).toBe("cups");
      expect(result.values[2]?.value).toBe("flour");
    });

    it("should log v1 parser usage", async () => {
      const line = "1 cup flour";
      const mockV1Result = {
        rule: "ingredient",
        type: "ingredient",
        values: [{ type: "ingredient", value: "flour", rule: "ingredient" }],
      };

      mockV1Parser.mockReturnValue(mockV1Result);

      await CachedIngredientParser.parseIngredientLine(
        line,
        { cacheResults: false },
        mockLogger
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        '[CACHED_INGREDIENT_PARSER] Using v1 parser for: "1 cup flour"',
        LogLevel.INFO
      );
    });
  });
});
