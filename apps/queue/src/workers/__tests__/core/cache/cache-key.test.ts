import { describe, expect, it } from "vitest";

import { createCacheKey } from "../../../core/cache/cache-key";

describe("createCacheKey", () => {
  describe("basic functionality", () => {
    it("should join string parts with colons", () => {
      const result = createCacheKey("user", "profile", "123");
      expect(result).toBe("user:profile:123");
    });

    it("should handle single part", () => {
      const result = createCacheKey("user");
      expect(result).toBe("user");
    });

    it("should handle empty array", () => {
      const result = createCacheKey();
      expect(result).toBe("");
    });

    it("should handle mixed string and number types", () => {
      const result = createCacheKey("user", 123, "profile");
      expect(result).toBe("user:123:profile");
    });
  });

  describe("undefined handling", () => {
    it("should filter out undefined values", () => {
      const result = createCacheKey("user", undefined, "profile");
      expect(result).toBe("user:profile");
    });

    it("should filter out multiple undefined values", () => {
      const result = createCacheKey("user", undefined, undefined, "profile");
      expect(result).toBe("user:profile");
    });

    it("should handle all undefined values", () => {
      const result = createCacheKey(undefined, undefined, undefined);
      expect(result).toBe("");
    });

    it("should handle undefined at start", () => {
      const result = createCacheKey(undefined, "user", "profile");
      expect(result).toBe("user:profile");
    });

    it("should handle undefined at end", () => {
      const result = createCacheKey("user", "profile", undefined);
      expect(result).toBe("user:profile");
    });
  });

  describe("edge cases", () => {
    it("should filter out empty strings", () => {
      const result = createCacheKey("user", "", "profile");
      expect(result).toBe("user:profile");
    });

    it("should filter out zero values", () => {
      const result = createCacheKey("user", 0, "profile");
      expect(result).toBe("user:profile");
    });

    it("should handle negative numbers", () => {
      const result = createCacheKey("user", -123, "profile");
      expect(result).toBe("user:-123:profile");
    });

    it("should handle complex mixed types", () => {
      const result = createCacheKey(
        "user",
        123,
        undefined,
        "profile",
        456,
        undefined
      );
      expect(result).toBe("user:123:profile:456");
    });
  });

  describe("real-world scenarios", () => {
    it("should create note metadata key", () => {
      const result = createCacheKey("note", "metadata", "note-123");
      expect(result).toBe("note:metadata:note-123");
    });

    it("should create database query key", () => {
      const result = createCacheKey("db", "query", "abc123hash");
      expect(result).toBe("db:query:abc123hash");
    });

    it("should create action result key", () => {
      const result = createCacheKey("action", "parse", "input-hash-456");
      expect(result).toBe("action:parse:input-hash-456");
    });

    it("should create file processing key", () => {
      const result = createCacheKey("file", "processed", "/path/to/file.txt");
      expect(result).toBe("file:processed:/path/to/file.txt");
    });
  });
});
