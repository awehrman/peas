import { describe, it, expect, beforeEach } from "vitest";
import { globalActionCache, createCacheKey } from "../../cache";

describe("Cache Helper Functions", () => {
  beforeEach(() => {
    globalActionCache.clear();
  });

  describe("globalActionCache", () => {
    it("should store and retrieve values", () => {
      globalActionCache.set("test-key", "test-value");
      expect(globalActionCache.get("test-key")).toBe("test-value");
    });

    it("should be shared across all imports", async () => {
      // This test verifies that the global cache is truly global
      globalActionCache.set("shared-key", "shared-value");

      // Simulate another import accessing the same cache
      const { globalActionCache: importedCache } = await import("../../cache");
      expect(importedCache.get("shared-key")).toBe("shared-value");
    });
  });

  describe("createCacheKey", () => {
    it("should create key with prefix and parts", () => {
      const key = createCacheKey(
        "action",
        "test_action",
        "job123",
        "data_hash"
      );
      expect(key).toBe("action:test_action:job123:data_hash");
    });

    it("should handle string parts", () => {
      const key = createCacheKey("prefix", "part1", "part2");
      expect(key).toBe("prefix:part1:part2");
    });

    it("should handle number parts", () => {
      const key = createCacheKey("prefix", 123, 456);
      expect(key).toBe("prefix:123:456");
    });

    it("should handle mixed string and number parts", () => {
      const key = createCacheKey("prefix", "action", 123, "data");
      expect(key).toBe("prefix:action:123:data");
    });

    it("should handle single part", () => {
      const key = createCacheKey("prefix", "single");
      expect(key).toBe("prefix:single");
    });

    it("should handle empty parts", () => {
      const key = createCacheKey("prefix", "", "part");
      expect(key).toBe("prefix::part");
    });

    it("should handle special characters in parts", () => {
      const key = createCacheKey(
        "prefix",
        "action:with:colons",
        "data/with/slashes"
      );
      expect(key).toBe("prefix:action:with:colons:data/with/slashes");
    });

    it("should handle very long parts", () => {
      const longPart = "a".repeat(1000);
      const key = createCacheKey("prefix", longPart);
      expect(key).toBe(`prefix:${longPart}`);
    });

    it("should handle many parts", () => {
      const parts = Array.from({ length: 100 }, (_, i) => `part${i}`);
      const key = createCacheKey("prefix", ...parts);
      expect(key).toContain("prefix:part0:part1:part2");
      expect(key.split(":")).toHaveLength(101); // prefix + 100 parts
    });
  });

  describe("integration with globalActionCache", () => {
    it("should work together for action caching", () => {
      const actionName = "parse_ingredient";
      const jobId = "job-123";
      const dataHash = "abc123";

      const cacheKey = createCacheKey("action", actionName, jobId, dataHash);
      const cachedValue = { parsed: true, data: "test" };

      globalActionCache.set(cacheKey, cachedValue);
      const retrieved = globalActionCache.get(cacheKey);

      expect(retrieved).toEqual(cachedValue);
      expect(cacheKey).toBe("action:parse_ingredient:job-123:abc123");
    });

    it("should handle different action types", () => {
      const actions = [
        { name: "parse_ingredient", jobId: "job1", data: "ingredient_data" },
        { name: "fetch_recipe", jobId: "job2", data: "recipe_data" },
        { name: "validate_note", jobId: "job3", data: "note_data" },
      ];

      actions.forEach(({ name, jobId, data }) => {
        const cacheKey = createCacheKey("action", name, jobId, data);
        const cachedValue = { action: name, result: `processed_${data}` };

        globalActionCache.set(cacheKey, cachedValue);
        const retrieved = globalActionCache.get(cacheKey);

        expect(retrieved).toEqual(cachedValue);
      });

      expect(globalActionCache.getStats().size).toBe(3);
    });

    it("should handle cache key collisions", () => {
      // Different data should create different keys
      const key1 = createCacheKey("action", "parse", "job1", "data1");
      const key2 = createCacheKey("action", "parse", "job1", "data2");

      expect(key1).not.toBe(key2);

      globalActionCache.set(key1, "value1");
      globalActionCache.set(key2, "value2");

      expect(globalActionCache.get(key1)).toBe("value1");
      expect(globalActionCache.get(key2)).toBe("value2");
    });

    it("should handle cache expiration with created keys", () => {
      const cacheKey = createCacheKey(
        "action",
        "test_action",
        "job123",
        "data"
      );
      const value = "test_value";

      // Set with short TTL
      globalActionCache.set(cacheKey, value, 1);

      // Wait for expiration
      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      return wait(10).then(() => {
        const retrieved = globalActionCache.get(cacheKey);
        expect(retrieved).toBeNull();
      });
    });
  });

  describe("cache key patterns", () => {
    it("should follow consistent naming convention", () => {
      const patterns = [
        { prefix: "action", parts: ["parse_ingredient", "job123", "hash"] },
        { prefix: "fetch", parts: ["recipe", "job456", "hash"] },
        { prefix: "validate", parts: ["note", "job789", "hash"] },
      ];

      patterns.forEach(({ prefix, parts }) => {
        const key = createCacheKey(prefix, ...parts);
        expect(key).toMatch(new RegExp(`^${prefix}:`));
        expect(key.split(":")).toHaveLength(parts.length + 1);
      });
    });

    it("should be deterministic", () => {
      const key1 = createCacheKey("action", "test", "job", "data");
      const key2 = createCacheKey("action", "test", "job", "data");

      expect(key1).toBe(key2);
    });

    it("should be unique for different inputs", () => {
      const keys = new Set();

      // Generate many different keys
      for (let i = 0; i < 100; i++) {
        const key = createCacheKey(
          "action",
          `action_${i}`,
          `job_${i}`,
          `data_${i}`
        );
        keys.add(key);
      }

      expect(keys.size).toBe(100);
    });
  });
});
