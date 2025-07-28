import { describe, expect, it } from "vitest";

import * as CacheModule from "../../../core/cache";

describe("Cache Module Index", () => {
  describe("exports", () => {
    it("should export ActionCache class", () => {
      expect(CacheModule.ActionCache).toBeDefined();
      expect(typeof CacheModule.ActionCache).toBe("function");
    });

    it("should export actionCache singleton", () => {
      expect(CacheModule.actionCache).toBeDefined();
      expect(CacheModule.actionCache).toBeInstanceOf(CacheModule.ActionCache);
    });

    it("should export CacheKeyGenerator class", () => {
      expect(CacheModule.CacheKeyGenerator).toBeDefined();
      expect(typeof CacheModule.CacheKeyGenerator).toBe("function");
    });

    it("should export CACHE_OPTIONS constant", () => {
      expect(CacheModule.CACHE_OPTIONS).toBeDefined();
      expect(typeof CacheModule.CACHE_OPTIONS).toBe("object");
    });

    it("should export createCacheKey function", () => {
      expect(CacheModule.createCacheKey).toBeDefined();
      expect(typeof CacheModule.createCacheKey).toBe("function");
    });
  });

  describe("export structure", () => {
    it("should have all expected exports", () => {
      const expectedExports = [
        "ActionCache",
        "actionCache",
        "CacheKeyGenerator",
        "CACHE_OPTIONS",
        "createCacheKey",
      ];

      expectedExports.forEach((exportName) => {
        expect(CacheModule).toHaveProperty(exportName);
      });
    });
  });

  describe("CACHE_OPTIONS structure", () => {
    it("should have all required cache option types", () => {
      const options = CacheModule.CACHE_OPTIONS;

      expect(options).toHaveProperty("NOTE_METADATA");
      expect(options).toHaveProperty("DATABASE_QUERY");
      expect(options).toHaveProperty("ACTION_RESULT");
      expect(options).toHaveProperty("FILE_PROCESSING");
      expect(options).toHaveProperty("INGREDIENT_PARSING");
    });

    it("should have correct structure for each option type", () => {
      const options = CacheModule.CACHE_OPTIONS;

      Object.values(options).forEach((option) => {
        expect(option).toHaveProperty("ttl");
        expect(option).toHaveProperty("memoryTtl");
        expect(option).toHaveProperty("tags");
        expect(typeof option.ttl).toBe("number");
        expect(typeof option.memoryTtl).toBe("number");
        expect(Array.isArray(option.tags)).toBe(true);
      });
    });
  });

  describe("CacheKeyGenerator methods", () => {
    it("should have noteMetadata method", () => {
      expect(typeof CacheModule.CacheKeyGenerator.noteMetadata).toBe(
        "function"
      );
    });

    it("should have noteStatus method", () => {
      expect(typeof CacheModule.CacheKeyGenerator.noteStatus).toBe("function");
    });

    it("should have databaseQuery method", () => {
      expect(typeof CacheModule.CacheKeyGenerator.databaseQuery).toBe(
        "function"
      );
    });

    it("should have actionResult method", () => {
      expect(typeof CacheModule.CacheKeyGenerator.actionResult).toBe(
        "function"
      );
    });

    it("should have fileProcessing method", () => {
      expect(typeof CacheModule.CacheKeyGenerator.fileProcessing).toBe(
        "function"
      );
    });
  });

  describe("createCacheKey function", () => {
    it("should be callable with multiple arguments", () => {
      const result = CacheModule.createCacheKey("test", "key", "123");
      expect(typeof result).toBe("string");
    });

    it("should handle empty arguments", () => {
      const result = CacheModule.createCacheKey();
      expect(result).toBe("");
    });
  });

  describe("actionCache singleton", () => {
    it("should be the same instance as ActionCache.getInstance()", () => {
      const instance = CacheModule.ActionCache.getInstance();
      expect(CacheModule.actionCache).toBe(instance);
    });

    it("should have cache methods", () => {
      expect(typeof CacheModule.actionCache.get).toBe("function");
      expect(typeof CacheModule.actionCache.set).toBe("function");
      expect(typeof CacheModule.actionCache.delete).toBe("function");
      expect(typeof CacheModule.actionCache.clearAll).toBe("function");
      expect(typeof CacheModule.actionCache.getStats).toBe("function");
    });
  });
});
