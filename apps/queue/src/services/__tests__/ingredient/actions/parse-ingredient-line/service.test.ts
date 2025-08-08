import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { IngredientJobData } from "../../../../../workers/ingredient/dependencies";
import { parseIngredientLine } from "../../../../ingredient/actions/parse-ingredient-line/service";

// Define types that match the actual service implementation
interface CachedParserSegment {
  index: number;
  rule: string;
  type: string;
  value: string;
  processingTime: number;
}

interface CachedParserResult {
  rule: string;
  type: string;
  values: CachedParserSegment[];
  processingTime: number;
}

interface V1ParserSegment {
  rule: string;
  type: string;
  value: string | number;
}

interface V1ParserResult {
  rule: string;
  type: string;
  values: V1ParserSegment[];
}

// Mock the CachedIngredientParser
vi.mock("../../../../ingredient/cached-ingredient-parser", () => ({
  CachedIngredientParser: {
    parseIngredientLine: vi.fn(),
    invalidateIngredientCache: vi.fn(),
  },
}));

// Mock the v1 parser module
vi.mock("@peas/parser/v1/minified", () => ({
  parse: vi.fn(),
}));

describe("Parse Ingredient Line Service", () => {
  let mockLogger: StructuredLogger;
  let mockCachedIngredientParser: {
    parseIngredientLine: ReturnType<typeof vi.fn>;
    invalidateIngredientCache: ReturnType<typeof vi.fn>;
  };
  let mockV1Parser: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    // Get the mocked modules
    const cachedParserModule = await import(
      "../../../../ingredient/cached-ingredient-parser"
    );
    mockCachedIngredientParser = vi.mocked(
      cachedParserModule.CachedIngredientParser
    );

    const v1ParserModule = await import("@peas/parser/v1/minified");
    mockV1Parser = vi.mocked(v1ParserModule.parse);
  });

  describe("parseIngredientLine", () => {
    it("should parse ingredient line successfully with cached result", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
      };

      const mockCachedResult: CachedParserResult = {
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

      mockCachedIngredientParser.parseIngredientLine.mockResolvedValue(
        mockCachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(
        mockCachedIngredientParser.parseIngredientLine
      ).toHaveBeenCalledWith("1 cup flour", { cacheResults: true }, mockLogger);

      expect(result).toEqual({
        ...mockData,
        parseStatus: "COMPLETED_SUCCESSFULLY",
        metadata: {
          ...mockData.metadata,
          parsedSegments: [
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
          parseResult: mockCachedResult,
          rule: "ingredient",
          usedCache: true,
          parserVersion: "cached",
        },
      });
    });

    it("should parse ingredient line with v1 parser when cache fails", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: "2 tbsp butter",
        lineIndex: 1,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
      };

      const mockV1Result: V1ParserResult = {
        rule: "ingredient",
        type: "ingredient",
        values: [
          { type: "quantity", value: 2, rule: "quantity" },
          { type: "unit", value: "tbsp", rule: "unit" },
          { type: "ingredient", value: "butter", rule: "ingredient" },
        ],
      };

      mockCachedIngredientParser.parseIngredientLine.mockRejectedValue(
        new Error("Cache failed")
      );
      mockV1Parser.mockReturnValue(mockV1Result);

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(mockV1Parser).toHaveBeenCalledWith("2 tbsp butter");
      expect(result).toEqual({
        ...mockData,
        parseStatus: "COMPLETED_SUCCESSFULLY",
        metadata: {
          ...mockData.metadata,
          parsedSegments: [
            {
              index: 0,
              rule: "quantity",
              type: "quantity",
              value: "2",
              processingTime: expect.any(Number),
            },
            {
              index: 1,
              rule: "unit",
              type: "unit",
              value: "tbsp",
              processingTime: expect.any(Number),
            },
            {
              index: 2,
              rule: "ingredient",
              type: "ingredient",
              value: "butter",
              processingTime: expect.any(Number),
            },
          ],
          parseResult: mockV1Result,
          rule: "ingredient",
          usedCache: false,
          parserVersion: "v1",
        },
      });
    });

    it("should clear cache when requested", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: "3 eggs",
        lineIndex: 2,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
        metadata: {
          clearCache: true,
        },
      };

      const mockCachedResult: CachedParserResult = {
        rule: "ingredient",
        type: "ingredient",
        values: [
          {
            index: 0,
            rule: "quantity",
            type: "quantity",
            value: "3",
            processingTime: 10,
          },
          {
            index: 1,
            rule: "ingredient",
            type: "ingredient",
            value: "eggs",
            processingTime: 15,
          },
        ],
        processingTime: 25,
      };

      mockCachedIngredientParser.invalidateIngredientCache.mockResolvedValue(5);
      mockCachedIngredientParser.parseIngredientLine.mockResolvedValue(
        mockCachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(
        mockCachedIngredientParser.invalidateIngredientCache
      ).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_INGREDIENT_LINE] Clearing ingredient cache as requested"
      );
      expect(result.parseStatus).toBe("COMPLETED_SUCCESSFULLY");
    });

    it("should handle empty parsed segments", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: "invalid ingredient",
        lineIndex: 3,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
      };

      const mockCachedResult: CachedParserResult = {
        rule: "ingredient",
        type: "ingredient",
        values: [],
        processingTime: 10,
      };

      mockCachedIngredientParser.parseIngredientLine.mockResolvedValue(
        mockCachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("COMPLETED_WITH_ERROR");
      expect(result.metadata?.parsedSegments).toEqual([]);
    });

    it("should handle v1 parser failure", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: "invalid ingredient",
        lineIndex: 4,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
      };

      mockCachedIngredientParser.parseIngredientLine.mockRejectedValue(
        new Error("Cache failed")
      );
      mockV1Parser.mockImplementation(() => {
        throw new Error("Parser failed");
      });

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("COMPLETED_WITH_ERROR");
      expect(result.metadata?.error).toBe("Parser failed");
      expect(result.metadata?.errorTimestamp).toBeDefined();
    });

    it("should throw error when noteId is missing", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: undefined as unknown as string,
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
      };

      await expect(parseIngredientLine(mockData, mockLogger)).rejects.toThrow(
        "No note ID available for ingredient parsing"
      );
    });

    it("should throw error when ingredientReference is missing", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: undefined as unknown as string,
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
      };

      await expect(parseIngredientLine(mockData, mockLogger)).rejects.toThrow(
        "No ingredient reference available for parsing"
      );
    });

    it("should handle v1 parser module import failure", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
      };

      mockCachedIngredientParser.parseIngredientLine.mockRejectedValue(
        new Error("Cache failed")
      );

      // Mock the v1 parser to throw an error
      mockV1Parser.mockImplementation(() => {
        throw new Error(
          "Failed to load v1 ingredient parser: Error: Module not found"
        );
      });

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("COMPLETED_WITH_ERROR");
      expect(result.metadata?.error).toContain(
        "Failed to load v1 ingredient parser: Error: Module not found"
      );
    });

    it("should handle non-string values from v1 parser", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: "1.5 cups flour",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
      };

      const mockV1Result: V1ParserResult = {
        rule: "ingredient",
        type: "ingredient",
        values: [
          { type: "quantity", value: 1.5, rule: "quantity" },
          { type: "unit", value: "cups", rule: "unit" },
          { type: "ingredient", value: "flour", rule: "ingredient" },
        ],
      };

      mockCachedIngredientParser.parseIngredientLine.mockRejectedValue(
        new Error("Cache failed")
      );
      mockV1Parser.mockReturnValue(mockV1Result);

      const result = await parseIngredientLine(mockData, mockLogger);

      const parsedSegments = result.metadata?.parsedSegments as Array<{
        value: string;
      }>;
      expect(parsedSegments?.[0]?.value).toBe("1.5");
      expect(parsedSegments?.[1]?.value).toBe("cups");
      expect(parsedSegments?.[2]?.value).toBe("flour");
    });

    it("should preserve existing metadata", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
        metadata: {
          customField: "custom-value",
          existingData: { key: "value" },
        },
      };

      const mockCachedResult: CachedParserResult = {
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
      };

      mockCachedIngredientParser.parseIngredientLine.mockResolvedValue(
        mockCachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.metadata?.customField).toBe("custom-value");
      expect(result.metadata?.existingData).toEqual({ key: "value" });
      expect(result.metadata?.parsedSegments).toBeDefined();
      expect(result.metadata?.usedCache).toBe(true);
    });

    it("should handle cache check failure gracefully", async () => {
      const mockData: IngredientJobData = {
        jobId: "test-job-123",
        noteId: "test-note-123",
        ingredientReference: "1 cup flour",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING",
        isActive: true,
        importId: "test-import-123",
      };

      const mockV1Result: V1ParserResult = {
        rule: "ingredient",
        type: "ingredient",
        values: [{ type: "ingredient", value: "flour", rule: "ingredient" }],
      };

      mockCachedIngredientParser.parseIngredientLine.mockRejectedValue(
        new Error("Cache check failed")
      );
      mockV1Parser.mockReturnValue(mockV1Result);

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_INGREDIENT_LINE] Cache check failed: Error: Cache check failed"
      );
      expect(result.metadata?.usedCache).toBe(false);
      expect(result.metadata?.parserVersion).toBe("v1");
    });
  });
});
