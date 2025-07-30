/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import { cleanHtmlFile } from "../../../../note/actions/clean-html/service";

// Mock the html-cleaner utility functions
vi.mock("../../../../../utils/html-cleaner", () => ({
  logCleaningStats: vi.fn(),
  removeIconsTags: vi.fn(),
  removeStyleTags: vi.fn(),
  resolveTitle: vi.fn(),
}));

describe("cleanHtmlFile", () => {
  let mockData: NotePipelineData;
  let mockLogger: StructuredLogger;
  let mockLogCleaningStats: ReturnType<typeof vi.fn>;
  let mockRemoveIconsTags: ReturnType<typeof vi.fn>;
  let mockRemoveStyleTags: ReturnType<typeof vi.fn>;
  let mockResolveTitle: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock data
    mockData = {
      content:
        "<html><body><h1>Test Recipe</h1><style>body { color: red; }</style><icons>icon1</icons></body></html>",
      jobId: "test-job-123",
      noteId: "test-note-456",
      importId: "test-import-789",
      metadata: { source: "test" },
    };

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
    };

    // Get mocked functions
    const htmlCleanerModule = await import("../../../../../utils/html-cleaner");
    mockLogCleaningStats = vi.mocked(htmlCleanerModule.logCleaningStats);
    mockRemoveIconsTags = vi.mocked(htmlCleanerModule.removeIconsTags);
    mockRemoveStyleTags = vi.mocked(htmlCleanerModule.removeStyleTags);
    mockResolveTitle = vi.mocked(htmlCleanerModule.resolveTitle);

    // Setup default mock implementations
    mockResolveTitle.mockReturnValue("Test Recipe");
    mockRemoveStyleTags.mockReturnValue(
      "<html><body><h1>Test Recipe</h1><icons>icon1</icons></body></html>"
    );
    mockRemoveIconsTags.mockReturnValue(
      "<html><body><h1>Test Recipe</h1></body></html>"
    );
  });

  describe("basic functionality", () => {
    it("should clean HTML content by removing style and icons tags", async () => {
      const result = await cleanHtmlFile(mockData, mockLogger);

      expect(result).toEqual({
        ...mockData,
        content: "<html><body><h1>Test Recipe</h1></body></html>",
      });
    });

    it("should call resolveTitle with correct parameters", async () => {
      await cleanHtmlFile(mockData, mockLogger);

      expect(mockResolveTitle).toHaveBeenCalledWith(mockData, mockData.content);
    });

    it("should call removeStyleTags with original content", async () => {
      await cleanHtmlFile(mockData, mockLogger);

      expect(mockRemoveStyleTags).toHaveBeenCalledWith(mockData.content);
    });

    it("should call removeIconsTags with content after style removal", async () => {
      const afterStyleRemoval =
        "<html><body><h1>Test Recipe</h1><icons>icon1</icons></body></html>";
      mockRemoveStyleTags.mockReturnValue(afterStyleRemoval);

      await cleanHtmlFile(mockData, mockLogger);

      expect(mockRemoveIconsTags).toHaveBeenCalledWith(afterStyleRemoval);
    });

    it("should call logCleaningStats with correct parameters", async () => {
      const originalLength = mockData.content.length;
      const afterStyleRemoval =
        "<html><body><h1>Test Recipe</h1><icons>icon1</icons></body></html>";
      const afterIconsRemoval =
        "<html><body><h1>Test Recipe</h1></body></html>";

      mockRemoveStyleTags.mockReturnValue(afterStyleRemoval);
      mockRemoveIconsTags.mockReturnValue(afterIconsRemoval);

      await cleanHtmlFile(mockData, mockLogger);

      expect(mockLogCleaningStats).toHaveBeenCalledWith(
        mockLogger,
        "Test Recipe",
        originalLength,
        afterIconsRemoval.length,
        originalLength,
        afterStyleRemoval.length,
        afterStyleRemoval.length,
        afterIconsRemoval.length
      );
    });
  });

  describe("content processing", () => {
    it("should handle content with only style tags", async () => {
      const dataWithOnlyStyles = {
        ...mockData,
        content:
          "<html><style>body { color: red; }</style><body>Content</body></html>",
      };
      const afterStyleRemoval = "<html><body>Content</body></html>";
      mockRemoveStyleTags.mockReturnValue(afterStyleRemoval);
      mockRemoveIconsTags.mockReturnValue(afterStyleRemoval);

      const result = await cleanHtmlFile(dataWithOnlyStyles, mockLogger);

      expect(result.content).toBe(afterStyleRemoval);
    });

    it("should handle content with only icons tags", async () => {
      const dataWithOnlyIcons = {
        ...mockData,
        content: "<html><body><icons>icon1</icons>Content</body></html>",
      };
      const afterStyleRemoval =
        "<html><body><icons>icon1</icons>Content</body></html>";
      const afterIconsRemoval = "<html><body>Content</body></html>";

      mockRemoveStyleTags.mockReturnValue(afterStyleRemoval);
      mockRemoveIconsTags.mockReturnValue(afterIconsRemoval);

      const result = await cleanHtmlFile(dataWithOnlyIcons, mockLogger);

      expect(result.content).toBe(afterIconsRemoval);
    });

    it("should handle content with no style or icons tags", async () => {
      const cleanData = {
        ...mockData,
        content: "<html><body><h1>Clean Content</h1></body></html>",
      };
      mockRemoveStyleTags.mockReturnValue(cleanData.content);
      mockRemoveIconsTags.mockReturnValue(cleanData.content);

      const result = await cleanHtmlFile(cleanData, mockLogger);

      expect(result.content).toBe(cleanData.content);
    });

    it("should handle empty content", async () => {
      const emptyData = {
        ...mockData,
        content: "",
      };
      mockRemoveStyleTags.mockReturnValue("");
      mockRemoveIconsTags.mockReturnValue("");

      const result = await cleanHtmlFile(emptyData, mockLogger);

      expect(result.content).toBe("");
    });

    it("should handle very long content", async () => {
      const longContent = "a".repeat(100000);
      const dataWithLongContent = {
        ...mockData,
        content: longContent,
      };
      const cleanedContent = "b".repeat(95000);

      mockRemoveStyleTags.mockReturnValue(cleanedContent);
      mockRemoveIconsTags.mockReturnValue(cleanedContent);

      const result = await cleanHtmlFile(dataWithLongContent, mockLogger);

      expect(result.content).toBe(cleanedContent);
      expect(mockLogCleaningStats).toHaveBeenCalledWith(
        mockLogger,
        "Test Recipe",
        longContent.length,
        cleanedContent.length,
        longContent.length,
        cleanedContent.length,
        cleanedContent.length,
        cleanedContent.length
      );
    });
  });

  describe("title resolution", () => {
    it("should use resolved title in logging", async () => {
      mockResolveTitle.mockReturnValue("Custom Recipe Title");

      await cleanHtmlFile(mockData, mockLogger);

      expect(mockLogCleaningStats).toHaveBeenCalledWith(
        mockLogger,
        "Custom Recipe Title",
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it("should handle different title resolutions", async () => {
      const titles = ["Recipe 1", "Recipe 2", "Recipe 3"];

      for (const title of titles) {
        mockResolveTitle.mockReturnValue(title);

        await cleanHtmlFile(mockData, mockLogger);

        expect(mockLogCleaningStats).toHaveBeenCalledWith(
          mockLogger,
          title,
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number)
        );
      }
    });
  });

  describe("data preservation", () => {
    it("should preserve all original data properties", async () => {
      const complexData = {
        ...mockData,
        source: {
          filename: "test.html",
          url: "https://example.com/test.html",
        },
        options: {
          parseIngredients: true,
          parseInstructions: true,
        },
        file: {
          title: "Test File",
          contents: "original content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "note-123",
          title: "Test Note",
          content: "note content",
          html: "note html",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      const result = await cleanHtmlFile(complexData, mockLogger);

      expect(result.jobId).toBe(complexData.jobId);
      expect(result.noteId).toBe(complexData.noteId);
      expect(result.importId).toBe(complexData.importId);
      expect(result.metadata).toEqual(complexData.metadata);
      expect(result.source).toEqual(complexData.source);
      expect(result.options).toEqual(complexData.options);
      expect(result.file).toEqual(complexData.file);
      expect(result.note).toEqual(complexData.note);
    });

    it("should only modify the content property", async () => {
      const originalContent = mockData.content;
      const cleanedContent = "<html><body>Cleaned</body></html>";
      mockRemoveStyleTags.mockReturnValue(cleanedContent);
      mockRemoveIconsTags.mockReturnValue(cleanedContent);

      const result = await cleanHtmlFile(mockData, mockLogger);

      expect(result.content).toBe(cleanedContent);
      expect(result.content).not.toBe(originalContent);
    });
  });

  describe("error handling", () => {
    it("should handle errors in resolveTitle", async () => {
      mockResolveTitle.mockImplementation(() => {
        throw new Error("Title resolution failed");
      });

      await expect(cleanHtmlFile(mockData, mockLogger)).rejects.toThrow(
        "Title resolution failed"
      );
    });

    it("should handle errors in removeStyleTags", async () => {
      mockRemoveStyleTags.mockImplementation(() => {
        throw new Error("Style removal failed");
      });

      await expect(cleanHtmlFile(mockData, mockLogger)).rejects.toThrow(
        "Style removal failed"
      );
    });

    it("should handle errors in removeIconsTags", async () => {
      mockRemoveIconsTags.mockImplementation(() => {
        throw new Error("Icons removal failed");
      });

      await expect(cleanHtmlFile(mockData, mockLogger)).rejects.toThrow(
        "Icons removal failed"
      );
    });

    it("should handle errors in logCleaningStats", async () => {
      mockLogCleaningStats.mockImplementation(() => {
        throw new Error("Logging failed");
      });

      await expect(cleanHtmlFile(mockData, mockLogger)).rejects.toThrow(
        "Logging failed"
      );
    });
  });

  describe("edge cases", () => {
    it("should handle null or undefined data", async () => {
      await expect(cleanHtmlFile(null as any, mockLogger)).rejects.toThrow();
    });

    it("should handle null or undefined logger", async () => {
      await expect(cleanHtmlFile(mockData, null as any)).rejects.toThrow();
    });

    it("should handle data without content property", async () => {
      const dataWithoutContent = {
        jobId: "test-job-123",
        noteId: "test-note-456",
        importId: "test-import-789",
        metadata: { source: "test" },
      } as unknown as NotePipelineData;

      await expect(
        cleanHtmlFile(dataWithoutContent, mockLogger)
      ).rejects.toThrow();
    });

    it("should handle logger without log method", async () => {
      const invalidLogger = {} as StructuredLogger;

      await expect(cleanHtmlFile(mockData, invalidLogger)).rejects.toThrow();
    });
  });

  describe("performance characteristics", () => {
    it("should process content efficiently", async () => {
      const startTime = Date.now();
      const largeContent = "x".repeat(1000000);
      const dataWithLargeContent = {
        ...mockData,
        content: largeContent,
      };
      const cleanedContent = "y".repeat(950000);

      // Reset mocks to ensure no previous error state
      mockRemoveStyleTags.mockReturnValue(cleanedContent);
      mockRemoveIconsTags.mockReturnValue(cleanedContent);
      mockLogCleaningStats.mockImplementation(() => {}); // Reset to no-op

      const result = await cleanHtmlFile(dataWithLargeContent, mockLogger);
      const endTime = Date.now();

      expect(result.content).toBe(cleanedContent);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
