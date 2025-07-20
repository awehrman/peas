import { describe, it, expect, beforeEach } from "vitest";
import { ActionResultCache } from "../../cache";

describe("ActionResultCache", () => {
  let cache: ActionResultCache;

  beforeEach(() => {
    cache = new ActionResultCache();
  });

  describe("constructor", () => {
    it("should create an empty cache", () => {
      expect(cache).toBeInstanceOf(ActionResultCache);
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe("set and get", () => {
    it("should store and retrieve values", () => {
      const key = "test-key";
      const value = { data: "test-value" };

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it("should store and retrieve different types", () => {
      cache.set("string", "test");
      cache.set("number", 42);
      cache.set("boolean", true);
      cache.set("object", { key: "value" });
      cache.set("array", [1, 2, 3]);

      expect(cache.get("string")).toBe("test");
      expect(cache.get("number")).toBe(42);
      expect(cache.get("boolean")).toBe(true);
      expect(cache.get("object")).toEqual({ key: "value" });
      expect(cache.get("array")).toEqual([1, 2, 3]);
    });

    it("should return null for non-existent keys", () => {
      expect(cache.get("non-existent")).toBeNull();
    });

    it("should use default TTL of 5 minutes", () => {
      const key = "test-key";
      const value = "test-value";

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toBe(value);
    });

    it("should use custom TTL", () => {
      const key = "test-key";
      const value = "test-value";
      const customTtl = 1000; // 1 second

      cache.set(key, value, customTtl);
      const retrieved = cache.get(key);

      expect(retrieved).toBe(value);
    });
  });

  describe("delete", () => {
    it("should delete existing keys", () => {
      const key = "test-key";
      const value = "test-value";

      cache.set(key, value);
      expect(cache.get(key)).toBe(value);

      const deleted = cache.delete(key);
      expect(deleted).toBe(true);
      expect(cache.get(key)).toBeNull();
    });

    it("should return false for non-existent keys", () => {
      const deleted = cache.delete("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove all cached values", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      expect(cache.getStats().size).toBe(3);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
      expect(cache.get("key3")).toBeNull();
    });
  });

  describe("getStats", () => {
    it("should return cache statistics", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.keys).toContain("key1");
      expect(stats.keys).toContain("key2");
      expect(stats.keys).toHaveLength(2);
    });

    it("should return empty stats for empty cache", () => {
      const stats = cache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", () => {
      // Set entries with very short TTL
      cache.set("expired1", "value1", 1);
      cache.set("expired2", "value2", 1);
      cache.set("valid", "value3", 10000);

      // Wait for entries to expire
      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      return wait(10).then(() => {
        const cleaned = cache.cleanup();

        expect(cleaned).toBe(2);
        expect(cache.get("expired1")).toBeNull();
        expect(cache.get("expired2")).toBeNull();
        expect(cache.get("valid")).toBe("value3");
        expect(cache.getStats().size).toBe(1);
      });
    });

    it("should return 0 when no entries are expired", () => {
      cache.set("valid1", "value1", 10000);
      cache.set("valid2", "value2", 10000);

      const cleaned = cache.cleanup();

      expect(cleaned).toBe(0);
      expect(cache.getStats().size).toBe(2);
    });
  });

  describe("expiration", () => {
    it("should automatically expire entries", () => {
      const key = "expired-key";
      const value = "expired-value";
      const ttl = 1; // 1ms

      cache.set(key, value, ttl);

      // Wait for expiration
      const wait = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      return wait(10).then(() => {
        const retrieved = cache.get(key);
        expect(retrieved).toBeNull();
      });
    });

    it("should not expire valid entries", () => {
      const key = "valid-key";
      const value = "valid-value";
      const ttl = 10000; // 10 seconds

      cache.set(key, value, ttl);
      const retrieved = cache.get(key);

      expect(retrieved).toBe(value);
    });
  });

  describe("type safety", () => {
    it("should maintain type safety with generics", () => {
      interface TestData {
        id: number;
        name: string;
      }

      const testData: TestData = { id: 1, name: "test" };
      cache.set("typed-key", testData);

      const retrieved = cache.get<TestData>("typed-key");
      expect(retrieved).toEqual(testData);
      expect(retrieved?.id).toBe(1);
      expect(retrieved?.name).toBe("test");
    });

    it("should handle null values", () => {
      cache.set("null-key", null);
      const retrieved = cache.get("null-key");
      expect(retrieved).toBeNull();
    });

    it("should handle undefined values", () => {
      cache.set("undefined-key", undefined);
      const retrieved = cache.get("undefined-key");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty string keys", () => {
      cache.set("", "empty-key-value");
      expect(cache.get("")).toBe("empty-key-value");
    });

    it("should handle special characters in keys", () => {
      const specialKey = "key:with:colons:and/slashes";
      cache.set(specialKey, "special-value");
      expect(cache.get(specialKey)).toBe("special-value");
    });

    it("should handle large objects", () => {
      const largeObject = {
        data: "x".repeat(1000),
        nested: {
          deep: {
            value: "deep-value",
          },
        },
      };

      cache.set("large-key", largeObject);
      const retrieved = cache.get("large-key");
      expect(retrieved).toEqual(largeObject);
    });

    it("should handle zero TTL", () => {
      cache.set("zero-ttl", "value", 0);
      // Small delay to ensure timestamp difference
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      return delay(10).then(() => {
        const retrieved = cache.get("zero-ttl");
        // Zero TTL items are immediately expired on next get
        expect(retrieved).toBeNull();
      });
    });

    it("should handle negative TTL", () => {
      cache.set("negative-ttl", "value", -1000);
      const retrieved = cache.get("negative-ttl");
      expect(retrieved).toBeNull();
    });
  });
});
