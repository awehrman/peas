/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import {
  createOrFindSourceWithBook,
  createOrFindSourceWithUrl,
  extractSiteName,
  isValidUrl,
} from "../../../../note/actions/process-source/helpers";

// Mock the database
vi.mock("@peas/database", () => ({
  prisma: {
    source: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("process-source helpers", () => {
  let mockLogger: StructuredLogger;

  let mockPrisma: any;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
    };

    // Get mocked database
    const dbModule = await import("@peas/database");
    mockPrisma = dbModule.prisma;

    // Setup default mock implementations
    mockPrisma.source.findFirst.mockResolvedValue(null);
    mockPrisma.source.create.mockResolvedValue({
      id: "new-source-id",
    });
  });

  describe("isValidUrl", () => {
    it("should return true for valid HTTP URLs", () => {
      expect(isValidUrl("http://example.com")).toBe(true);
      expect(isValidUrl("http://www.example.com")).toBe(true);
      expect(isValidUrl("http://example.com/path")).toBe(true);
      expect(isValidUrl("http://example.com/path?param=value")).toBe(true);
    });

    it("should return true for valid HTTPS URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("https://www.example.com")).toBe(true);
      expect(isValidUrl("https://example.com/path")).toBe(true);
      expect(isValidUrl("https://example.com/path?param=value#fragment")).toBe(
        true
      );
    });

    it("should return true for valid URLs with subdomains", () => {
      expect(isValidUrl("https://api.example.com")).toBe(true);
      expect(isValidUrl("https://blog.example.co.uk")).toBe(true);
      expect(isValidUrl("https://sub1.sub2.example.com")).toBe(true);
    });

    it("should return true for valid URLs with ports", () => {
      expect(isValidUrl("http://example.com:8080")).toBe(true);
      expect(isValidUrl("https://example.com:3000/path")).toBe(true);
    });

    it("should return true for valid URLs with special characters", () => {
      expect(isValidUrl("https://example.com/path with spaces")).toBe(true);
      expect(isValidUrl("https://example.com/path%20with%20encoding")).toBe(
        true
      );
      expect(isValidUrl("https://example.com/path-with-dashes")).toBe(true);
      expect(isValidUrl("https://example.com/path_with_underscores")).toBe(
        true
      );
    });

    it("should return false for invalid URLs", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("example.com")).toBe(false);
    });

    it("should return true for valid protocol URLs including mailto", () => {
      expect(isValidUrl("mailto:test@example.com")).toBe(true);
      expect(isValidUrl("ftp://example.com")).toBe(true);
      expect(isValidUrl("http://example.com")).toBe(true);
      expect(isValidUrl("https://example.com")).toBe(true);
    });

    it("should return true for valid protocol URLs", () => {
      expect(isValidUrl("ftp://example.com")).toBe(true);
      expect(isValidUrl("http://example.com")).toBe(true);
      expect(isValidUrl("https://example.com")).toBe(true);
    });

    it("should return false for empty or whitespace strings", () => {
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl("   ")).toBe(false);
      expect(isValidUrl("\t\n")).toBe(false);
    });

    it("should return false for null or undefined", () => {
      expect(isValidUrl(null as any)).toBe(false);
      expect(isValidUrl(undefined as any)).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isValidUrl(123 as any)).toBe(false);
      expect(isValidUrl({} as any)).toBe(false);
      expect(isValidUrl([] as any)).toBe(false);
    });

    it("should return false for malformed URLs", () => {
      expect(isValidUrl("http://")).toBe(false);
      expect(isValidUrl("https://")).toBe(false);
      expect(isValidUrl("://example.com")).toBe(false);
      expect(isValidUrl("http://:8080")).toBe(false);
    });
  });

  describe("createOrFindSourceWithUrl", () => {
    it("should find existing source with URL", async () => {
      const existingSource = {
        id: "existing-source-id",
        urls: [
          { id: "url-1", url: "https://example.com", siteName: "example.com" },
        ],
      };
      mockPrisma.source.findFirst.mockResolvedValue(existingSource);

      const result = await createOrFindSourceWithUrl(
        "https://example.com",
        mockLogger
      );

      expect(result).toBe("existing-source-id");
      expect(mockPrisma.source.findFirst).toHaveBeenCalledWith({
        where: {
          urls: {
            some: {
              url: "https://example.com",
            },
          },
        },
        include: {
          urls: true,
        },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Found existing source with URL: https://example.com, source ID: existing-source-id"
      );
    });

    it("should create new source when URL not found", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-source-id",
      });

      const result = await createOrFindSourceWithUrl(
        "https://example.com",
        mockLogger
      );

      expect(result).toBe("new-source-id");
      expect(mockPrisma.source.create).toHaveBeenCalledWith({
        data: {
          urls: {
            create: {
              url: "https://example.com",
              siteName: "example.com",
            },
          },
        },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Created new source with URL: https://example.com, source ID: new-source-id"
      );
    });

    it("should handle different URL formats", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-source-id",
      });

      const result = await createOrFindSourceWithUrl(
        "https://www.example.com/path",
        mockLogger
      );

      expect(result).toBe("new-source-id");
      expect(mockPrisma.source.create).toHaveBeenCalledWith({
        data: {
          urls: {
            create: {
              url: "https://www.example.com/path",
              siteName: "example.com",
            },
          },
        },
      });
    });

    it("should handle URLs with subdomains", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-source-id",
      });

      const result = await createOrFindSourceWithUrl(
        "https://api.example.com",
        mockLogger
      );

      expect(result).toBe("new-source-id");
      expect(mockPrisma.source.create).toHaveBeenCalledWith({
        data: {
          urls: {
            create: {
              url: "https://api.example.com",
              siteName: "api.example.com",
            },
          },
        },
      });
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.source.findFirst.mockRejectedValue(dbError);

      await expect(
        createOrFindSourceWithUrl("https://example.com", mockLogger)
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle source creation errors", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      const createError = new Error("Source creation failed");
      mockPrisma.source.create.mockRejectedValue(createError);

      await expect(
        createOrFindSourceWithUrl("https://example.com", mockLogger)
      ).rejects.toThrow("Source creation failed");
    });
  });

  describe("createOrFindSourceWithBook", () => {
    it("should find existing source with book", async () => {
      const existingSource = {
        id: "existing-book-source-id",
        book: {
          id: "book-1",
          title: "The Joy of Cooking",
        },
      };
      mockPrisma.source.findFirst.mockResolvedValue(existingSource);

      const result = await createOrFindSourceWithBook(
        "The Joy of Cooking",
        mockLogger
      );

      expect(result).toBe("existing-book-source-id");
      expect(mockPrisma.source.findFirst).toHaveBeenCalledWith({
        where: {
          book: {
            title: "The Joy of Cooking",
          },
        },
        include: {
          book: true,
        },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Found existing source with book: The Joy of Cooking, source ID: existing-book-source-id"
      );
    });

    it("should create new source when book not found", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-book-source-id",
      });

      const result = await createOrFindSourceWithBook(
        "The Joy of Cooking",
        mockLogger
      );

      expect(result).toBe("new-book-source-id");
      expect(mockPrisma.source.create).toHaveBeenCalledWith({
        data: {
          book: {
            create: {
              title: "The Joy of Cooking",
            },
          },
        },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Created new source with book: The Joy of Cooking, source ID: new-book-source-id"
      );
    });

    it("should handle different book titles", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-book-source-id",
      });

      const result = await createOrFindSourceWithBook(
        "Mastering the Art of French Cooking",
        mockLogger
      );

      expect(result).toBe("new-book-source-id");
      expect(mockPrisma.source.create).toHaveBeenCalledWith({
        data: {
          book: {
            create: {
              title: "Mastering the Art of French Cooking",
            },
          },
        },
      });
    });

    it("should handle book titles with special characters", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-book-source-id",
      });

      const result = await createOrFindSourceWithBook(
        "Cooking 101: A Beginner's Guide",
        mockLogger
      );

      expect(result).toBe("new-book-source-id");
      expect(mockPrisma.source.create).toHaveBeenCalledWith({
        data: {
          book: {
            create: {
              title: "Cooking 101: A Beginner's Guide",
            },
          },
        },
      });
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.source.findFirst.mockRejectedValue(dbError);

      await expect(
        createOrFindSourceWithBook("The Joy of Cooking", mockLogger)
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle source creation errors", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      const createError = new Error("Source creation failed");
      mockPrisma.source.create.mockRejectedValue(createError);

      await expect(
        createOrFindSourceWithBook("The Joy of Cooking", mockLogger)
      ).rejects.toThrow("Source creation failed");
    });
  });

  describe("extractSiteName", () => {
    it("should extract site name from valid URLs", () => {
      expect(extractSiteName("https://example.com")).toBe("example.com");
      expect(extractSiteName("http://example.com")).toBe("example.com");
      expect(extractSiteName("https://www.example.com")).toBe("example.com");
      expect(extractSiteName("https://api.example.com")).toBe(
        "api.example.com"
      );
      expect(extractSiteName("https://sub1.sub2.example.com")).toBe(
        "sub1.sub2.example.com"
      );
    });

    it("should handle URLs with paths and parameters", () => {
      expect(extractSiteName("https://example.com/path")).toBe("example.com");
      expect(extractSiteName("https://example.com/path?param=value")).toBe(
        "example.com"
      );
      expect(extractSiteName("https://example.com/path#fragment")).toBe(
        "example.com"
      );
      expect(
        extractSiteName("https://example.com/path?param=value#fragment")
      ).toBe("example.com");
    });

    it("should handle URLs with ports", () => {
      expect(extractSiteName("https://example.com:8080")).toBe("example.com");
      expect(extractSiteName("http://example.com:3000/path")).toBe(
        "example.com"
      );
    });

    it("should handle URLs with different TLDs", () => {
      expect(extractSiteName("https://example.co.uk")).toBe("example.co.uk");
      expect(extractSiteName("https://example.org")).toBe("example.org");
      expect(extractSiteName("https://example.net")).toBe("example.net");
    });

    it("should return null for invalid URLs", () => {
      expect(extractSiteName("not-a-url")).toBe(null);
      expect(extractSiteName("example.com")).toBe(null);
      expect(extractSiteName("")).toBe(null);
      expect(extractSiteName("   ")).toBe(null);
    });

    it("should return null for null or undefined", () => {
      expect(extractSiteName(null as any)).toBe(null);
      expect(extractSiteName(undefined as any)).toBe(null);
    });

    it("should return null for non-string values", () => {
      expect(extractSiteName(123 as any)).toBe(null);
      expect(extractSiteName({} as any)).toBe(null);
      expect(extractSiteName([] as any)).toBe(null);
    });

    it("should handle malformed URLs", () => {
      expect(extractSiteName("http://")).toBe(null);
      expect(extractSiteName("https://")).toBe(null);
      expect(extractSiteName("://example.com")).toBe(null);
    });

    it("should handle URLs with IP addresses", () => {
      expect(extractSiteName("http://192.168.1.1")).toBe("192.168.1.1");
      expect(extractSiteName("https://127.0.0.1:3000")).toBe("127.0.0.1");
    });

    it("should handle URLs with localhost", () => {
      expect(extractSiteName("http://localhost")).toBe("localhost");
      expect(extractSiteName("https://localhost:3000")).toBe("localhost");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle logger without log method", async () => {
      const invalidLogger = {} as StructuredLogger;
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-source-id",
      });

      await expect(
        createOrFindSourceWithUrl("https://example.com", invalidLogger)
      ).rejects.toThrow();
    });

    it("should handle null or undefined logger", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-source-id",
      });

      await expect(
        createOrFindSourceWithUrl("https://example.com", null as any)
      ).rejects.toThrow();
    });

    it("should handle empty URL strings", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-source-id",
      });

      const result = await createOrFindSourceWithUrl("", mockLogger);

      expect(result).toBe("new-source-id");
    });

    it("should handle empty book titles", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-book-source-id",
      });

      const result = await createOrFindSourceWithBook("", mockLogger);

      expect(result).toBe("new-book-source-id");
    });

    it("should handle whitespace-only strings", async () => {
      mockPrisma.source.findFirst.mockResolvedValue(null);
      mockPrisma.source.create.mockResolvedValue({
        id: "new-source-id",
      });

      const result = await createOrFindSourceWithUrl("   ", mockLogger);

      expect(result).toBe("new-source-id");
    });
  });

  describe("performance characteristics", () => {
    it("should handle large URL strings efficiently", () => {
      const largeUrl = "https://example.com/" + "x".repeat(10000);

      const startTime = Date.now();
      const result = isValidUrl(largeUrl);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it("should handle many URL validations efficiently", () => {
      const urls = Array.from(
        { length: 1000 },
        (_, i) => `https://example${i}.com`
      );

      const startTime = Date.now();
      const results = urls.map((url) => isValidUrl(url));
      const endTime = Date.now();

      expect(results.every((result) => result === true)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle many site name extractions efficiently", () => {
      const urls = Array.from(
        { length: 1000 },
        (_, i) => `https://example${i}.com/path`
      );

      const startTime = Date.now();
      const results = urls.map((url) => extractSiteName(url));
      const endTime = Date.now();

      expect(results.every((result) => result?.includes("example"))).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
