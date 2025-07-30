/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import { parseHtmlFile } from "../../../../note/actions/parse-html/service";

describe("parseHtmlFile", () => {
  let mockData: NotePipelineData;
  let mockLogger: StructuredLogger;
  let mockParseHTMLContent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Create mock data
    mockData = {
      content:
        "<html><body><h1>Test Recipe</h1><ul><li>Ingredient 1</li><li>Ingredient 2</li></ul><ol><li>Step 1</li><li>Step 2</li></ol></body></html>",
      jobId: "test-job-123",
      noteId: "test-note-456",
      importId: "test-import-789",
      metadata: { source: "test" },
    };

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
    };

    // Create mock parseHTMLContent function
    mockParseHTMLContent = vi.fn();
  });

  describe("basic functionality", () => {
    it("should parse HTML content and return structured data", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [
          { reference: "Ingredient 1", blockIndex: 0, lineIndex: 0 },
          { reference: "Ingredient 2", blockIndex: 0, lineIndex: 1 },
        ],
        instructions: [
          { reference: "Step 1", lineIndex: 0 },
          { reference: "Step 2", lineIndex: 1 },
        ],
        image: "recipe-image.jpg",
        source: "https://example.com/recipe",
        historicalCreatedAt: new Date("2023-01-01"),
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(mockParseHTMLContent).toHaveBeenCalledWith(mockData.content);
      expect(result).toEqual({
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: mockData.content,
          ingredients: [
            { reference: "Ingredient 1", blockIndex: 0, lineIndex: 0 },
            { reference: "Ingredient 2", blockIndex: 0, lineIndex: 1 },
          ],
          instructions: [
            { reference: "Step 1", lineIndex: 0 },
            { reference: "Step 2", lineIndex: 1 },
          ],
          image: "recipe-image.jpg",
          historicalCreatedAt: new Date("2023-01-01"),
          source: "https://example.com/recipe",
        },
      });
    });

    it("should log start and completion messages", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      await parseHtmlFile(mockData, mockLogger, mockParseHTMLContent);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_HTML] Starting HTML parsing"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[PARSE_HTML] Successfully parsed HTML, title: "Test Recipe", ingredients: 0, instructions: 0"'
      );
    });

    it("should call parseHTMLContent with correct parameters", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      await parseHtmlFile(mockData, mockLogger, mockParseHTMLContent);

      expect(mockParseHTMLContent).toHaveBeenCalledWith(mockData.content);
    });
  });

  describe("title handling", () => {
    it("should use provided title when available", async () => {
      const mockParsedResult = {
        title: "Custom Recipe Title",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.title).toBe("Custom Recipe Title");
    });

    it("should use 'Untitled' when title is missing", async () => {
      const mockParsedResult = {
        title: undefined,
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.title).toBe("Untitled");
    });

    it("should use 'Untitled' when title is empty string", async () => {
      const mockParsedResult = {
        title: "",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.title).toBe("Untitled");
    });

    it("should use 'Untitled' when title is null", async () => {
      const mockParsedResult = {
        title: null,
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.title).toBe("Untitled");
    });
  });

  describe("ingredients handling", () => {
    it("should map ingredients with correct structure", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [
          { reference: "Ingredient 1", blockIndex: 1, lineIndex: 5 },
          { reference: "Ingredient 2", blockIndex: 2, lineIndex: 10 },
        ],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.ingredients).toEqual([
        { reference: "Ingredient 1", blockIndex: 1, lineIndex: 5 },
        { reference: "Ingredient 2", blockIndex: 2, lineIndex: 10 },
      ]);
    });

    it("should handle ingredients with missing blockIndex", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [
          { reference: "Ingredient 1", lineIndex: 5 },
          { reference: "Ingredient 2", blockIndex: 2, lineIndex: 10 },
        ],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.ingredients).toEqual([
        { reference: "Ingredient 1", blockIndex: 0, lineIndex: 5 },
        { reference: "Ingredient 2", blockIndex: 2, lineIndex: 10 },
      ]);
    });

    it("should handle ingredients with missing lineIndex", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [
          { reference: "Ingredient 1", blockIndex: 1 },
          { reference: "Ingredient 2", blockIndex: 2, lineIndex: 10 },
        ],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.ingredients).toEqual([
        { reference: "Ingredient 1", blockIndex: 1, lineIndex: 0 },
        { reference: "Ingredient 2", blockIndex: 2, lineIndex: 10 },
      ]);
    });

    it("should handle empty ingredients array", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.ingredients).toEqual([]);
    });

    it("should handle undefined ingredients", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: undefined,
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.ingredients).toEqual([]);
    });

    it("should handle null ingredients", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: null,
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.ingredients).toEqual([]);
    });
  });

  describe("instructions handling", () => {
    it("should map instructions with correct structure", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [
          { reference: "Step 1", lineIndex: 5 },
          { reference: "Step 2", lineIndex: 10 },
        ],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.instructions).toEqual([
        { reference: "Step 1", lineIndex: 5 },
        { reference: "Step 2", lineIndex: 10 },
      ]);
    });

    it("should handle instructions with missing lineIndex", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [
          { reference: "Step 1" },
          { reference: "Step 2", lineIndex: 10 },
        ],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.instructions).toEqual([
        { reference: "Step 1", lineIndex: 0 },
        { reference: "Step 2", lineIndex: 10 },
      ]);
    });

    it("should handle empty instructions array", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.instructions).toEqual([]);
    });

    it("should handle undefined instructions", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: undefined,
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.instructions).toEqual([]);
    });

    it("should handle null instructions", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: null,
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.instructions).toEqual([]);
    });
  });

  describe("optional fields handling", () => {
    it("should handle image field", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
        image: "recipe-image.jpg",
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.image).toBe("recipe-image.jpg");
    });

    it("should handle missing image field", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.image).toBe("");
    });

    it("should handle undefined image field", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
        image: undefined,
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.image).toBe("");
    });

    it("should handle null image field", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
        image: null,
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.image).toBe("");
    });

    it("should handle source field", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
        source: "https://example.com/recipe",
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.source).toBe("https://example.com/recipe");
    });

    it("should handle missing source field", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.source).toBeUndefined();
    });

    it("should handle historicalCreatedAt field", async () => {
      const historicalDate = new Date("2023-01-01");
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
        historicalCreatedAt: historicalDate,
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.historicalCreatedAt).toBe(historicalDate);
    });

    it("should handle missing historicalCreatedAt field", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.historicalCreatedAt).toBeUndefined();
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

      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        complexData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.jobId).toBe(complexData.jobId);
      expect(result.noteId).toBe(complexData.noteId);
      expect(result.importId).toBe(complexData.importId);
      expect(result.metadata).toEqual(complexData.metadata);
      expect(result.source).toEqual(complexData.source);
      expect(result.options).toEqual(complexData.options);
      expect(result.note).toEqual(complexData.note);
    });

    it("should use original content in file.contents", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        mockData,
        mockLogger,
        mockParseHTMLContent
      );

      expect(result.file?.contents).toBe(mockData.content);
    });
  });

  describe("logging", () => {
    it("should log correct completion message with counts", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [
          { reference: "Ingredient 1" },
          { reference: "Ingredient 2" },
        ],
        instructions: [
          { reference: "Step 1" },
          { reference: "Step 2" },
          { reference: "Step 3" },
        ],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      await parseHtmlFile(mockData, mockLogger, mockParseHTMLContent);

      expect(mockLogger.log).toHaveBeenCalledWith(
        '[PARSE_HTML] Successfully parsed HTML, title: "Test Recipe", ingredients: 2, instructions: 3"'
      );
    });

    it("should log completion message with zero counts", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      await parseHtmlFile(mockData, mockLogger, mockParseHTMLContent);

      expect(mockLogger.log).toHaveBeenCalledWith(
        '[PARSE_HTML] Successfully parsed HTML, title: "Test Recipe", ingredients: 0, instructions: 0"'
      );
    });
  });

  describe("error handling", () => {
    it("should handle errors in parseHTMLContent", async () => {
      const parsingError = new Error("Parsing failed");
      mockParseHTMLContent.mockImplementation(() => {
        throw parsingError;
      });

      await expect(
        parseHtmlFile(mockData, mockLogger, mockParseHTMLContent)
      ).rejects.toThrow("Parsing failed");
    });

    it("should handle errors in logger", async () => {
      const mockParsedResult = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      (mockLogger.log as any).mockImplementation(() => {
        throw new Error("Logging failed");
      });

      await expect(
        parseHtmlFile(mockData, mockLogger, mockParseHTMLContent)
      ).rejects.toThrow("Logging failed");
    });
  });

  describe("edge cases", () => {
    it("should handle null or undefined data", async () => {
      await expect(
        parseHtmlFile(null as any, mockLogger, mockParseHTMLContent)
      ).rejects.toThrow();
    });

    it("should handle null or undefined logger", async () => {
      await expect(
        parseHtmlFile(mockData, null as any, mockParseHTMLContent)
      ).rejects.toThrow();
    });

    it("should handle null or undefined parseHTMLContent", async () => {
      await expect(
        parseHtmlFile(mockData, mockLogger, null as any)
      ).rejects.toThrow();
    });

    it("should handle data without content property", async () => {
      const dataWithoutContent = {
        jobId: "test-job-123",
        noteId: "test-note-456",
        importId: "test-import-789",
        metadata: { source: "test" },
      } as unknown as NotePipelineData;

      await expect(
        parseHtmlFile(dataWithoutContent, mockLogger, mockParseHTMLContent)
      ).rejects.toThrow();
    });

    it("should handle logger without log method", async () => {
      const invalidLogger = {} as StructuredLogger;

      await expect(
        parseHtmlFile(mockData, invalidLogger, mockParseHTMLContent)
      ).rejects.toThrow();
    });
  });

  describe("performance characteristics", () => {
    it("should process large content efficiently", async () => {
      const startTime = Date.now();
      const largeContent = "x".repeat(1000000);
      const dataWithLargeContent = {
        ...mockData,
        content: largeContent,
      };
      const mockParsedResult = {
        title: "Large Recipe",
        ingredients: Array.from({ length: 1000 }, (_, i) => ({
          reference: `Ingredient ${i}`,
          blockIndex: Math.floor(i / 10),
          lineIndex: i % 10,
        })),
        instructions: Array.from({ length: 500 }, (_, i) => ({
          reference: `Step ${i}`,
          lineIndex: i,
        })),
      };

      mockParseHTMLContent.mockReturnValue(mockParsedResult);

      const result = await parseHtmlFile(
        dataWithLargeContent,
        mockLogger,
        mockParseHTMLContent
      );
      const endTime = Date.now();

      expect(result.file?.ingredients).toHaveLength(1000);
      expect(result.file?.instructions).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
