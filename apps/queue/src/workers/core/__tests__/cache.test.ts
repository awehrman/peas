import { describe, it, expect, beforeEach, vi } from "vitest";
import { ActionResultCache, globalActionCache, createCacheKey } from "../cache";

describe("ActionResultCache", () => {
  let cache: ActionResultCache;

  beforeEach(() => {
    cache = new ActionResultCache();
  });

  describe("set and get", () => {
    it("should set and retrieve a value", () => {
      cache.set("test-key", "test-value");
      expect(cache.get("test-key")).toBe("test-value");
    });

    it("should return null for non-existent key", () => {
      expect(cache.get("non-existent")).toBeNull();
    });

    it("should handle different data types", () => {
      cache.set("string", "hello");
      cache.set("number", 42);
      cache.set("object", { foo: "bar" });
      cache.set("array", [1, 2, 3]);

      expect(cache.get("string")).toBe("hello");
      expect(cache.get("number")).toBe(42);
      expect(cache.get("object")).toEqual({ foo: "bar" });
      expect(cache.get("array")).toEqual([1, 2, 3]);
    });

    it("should use default TTL of 5 minutes", () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      cache.set("test-key", "test-value");

      // Should still be valid
      expect(cache.get("test-key")).toBe("test-value");

      // Mock time to be after TTL
      vi.spyOn(Date, "now").mockReturnValue(now + 300001); // 5 minutes + 1ms
      expect(cache.get("test-key")).toBeNull();
    });

    it("should respect custom TTL", () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      cache.set("test-key", "test-value", 1000); // 1 second TTL

      // Should still be valid
      expect(cache.get("test-key")).toBe("test-value");

      // Mock time to be after TTL
      vi.spyOn(Date, "now").mockReturnValue(now + 1001); // 1 second + 1ms
      expect(cache.get("test-key")).toBeNull();
    });
  });

  describe("delete", () => {
    it("should delete existing key", () => {
      cache.set("test-key", "test-value");
      expect(cache.delete("test-key")).toBe(true);
      expect(cache.get("test-key")).toBeNull();
    });

    it("should return false for non-existent key", () => {
      expect(cache.delete("non-existent")).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear all cached values", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      expect(cache.getStats().size).toBe(2);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
    });
  });

  describe("getStats", () => {
    it("should return correct statistics", () => {
      expect(cache.getStats()).toEqual({ size: 0, keys: [] });

      cache.set("key1", "value1");
      cache.set("key2", "value2");

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain("key1");
      expect(stats.keys).toContain("key2");
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      cache.set("expired", "value1", 1000); // 1 second TTL
      cache.set("valid", "value2", 10000); // 10 second TTL

      // Mock time to be after first TTL but before second
      vi.spyOn(Date, "now").mockReturnValue(now + 2000);

      const cleaned = cache.cleanup();

      expect(cleaned).toBe(1);
      expect(cache.get("expired")).toBeNull();
      expect(cache.get("valid")).toBe("value2");
      expect(cache.getStats().size).toBe(1);
    });

    it("should return 0 when no entries are expired", () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      cache.set("key1", "value1", 10000);
      cache.set("key2", "value2", 10000);

      const cleaned = cache.cleanup();

      expect(cleaned).toBe(0);
      expect(cache.getStats().size).toBe(2);
    });
  });

  describe("automatic cleanup on get", () => {
    it("should automatically remove expired entries when accessed", () => {
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      cache.set("expired", "value1", 1000);
      cache.set("valid", "value2", 10000);

      // Mock time to be after first TTL
      vi.spyOn(Date, "now").mockReturnValue(now + 2000);

      // Accessing expired key should remove it
      expect(cache.get("expired")).toBeNull();
      expect(cache.get("valid")).toBe("value2");

      // Expired key should be removed from cache
      expect(cache.getStats().size).toBe(1);
      expect(cache.getStats().keys).not.toContain("expired");
    });
  });
});

describe("globalActionCache", () => {
  beforeEach(() => {
    globalActionCache.clear();
  });

  it("should be an ActionResultCache instance", () => {
    expect(globalActionCache).toBeInstanceOf(ActionResultCache);
  });

  it("should work as a singleton", () => {
    globalActionCache.set("test-key", "test-value");
    expect(globalActionCache.get("test-key")).toBe("test-value");
  });
});

describe("createCacheKey", () => {
  it("should create key with prefix and parts", () => {
    expect(createCacheKey("user", "123", "profile")).toBe("user:123:profile");
  });

  it("should handle different data types", () => {
    expect(createCacheKey("note", "456", 789, "status")).toBe(
      "note:456:789:status"
    );
  });

  it("should handle single part", () => {
    expect(createCacheKey("session", "abc123")).toBe("session:abc123");
  });

  it("should handle empty parts", () => {
    expect(createCacheKey("cache")).toBe("cache:");
  });
});
