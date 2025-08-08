import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IngredientJobData } from "../../../../../workers/ingredient/dependencies";
import { parseIngredientLine } from "../../../../ingredient/actions/parse-ingredient-line/service";
import type { IngredientParseResult } from "../../../../ingredient/cached-ingredient-parser";

// Mock the CachedIngredientParser
vi.mock("../../../../ingredient/cached-ingredient-parser", () => ({
  CachedIngredientParser: {
    invalidateIngredientCache: vi.fn(),
    parseIngredientLine: vi.fn(),
  },
}));

// Mock the parser module
vi.mock("@peas/parser/v1/minified", () => ({
  parse: vi.fn(),
}));

describe("Parse Ingredient Line Service", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockData: IngredientJobData;
  let mockCachedIngredientParser: ReturnType<
    typeof vi.mocked<
      typeof import("../../../../ingredient/cached-ingredient-parser").CachedIngredientParser
    >
  >;
  let mockParser: ReturnType<
    typeof vi.mocked<typeof import("@peas/parser/v1/minified").parse>
  >;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      ingredientReference: "1 cup flour",
      lineIndex: 0,
      parseStatus: "AWAITING_PARSING" as const,
      isActive: true,
      importId: "test-import-id",
    };

    // Get the mocked modules
    const cachedModule = await import(
      "../../../../ingredient/cached-ingredient-parser"
    );
    mockCachedIngredientParser = vi.mocked(cachedModule.CachedIngredientParser);

    const parserModule = await import("@peas/parser/v1/minified");
    mockParser = vi.mocked(parserModule.parse);
  });

  describe("parseIngredientLine", () => {
    it("should parse ingredient successfully with cached result", async () => {
      const mockCachedResult: IngredientParseResult = {
        rule: "ingredient",
        type: "ingredient",
        processingTime: 30,
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
      };

      mockCachedIngredientParser.parseIngredientLine.mockResolvedValue(
        mockCachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("COMPLETED_SUCCESSFULLY");
      expect(result.metadata?.parsedSegments).toHaveLength(3);
      expect(result.metadata?.usedCache).toBe(true);
      expect(result.metadata?.parserVersion).toBe("cached");
      expect(result.metadata?.rule).toBe("ingredient");
      expect(result.metadata?.parseResult).toEqual(mockCachedResult);

      expect(
        mockCachedIngredientParser.parseIngredientLine
      ).toHaveBeenCalledWith("1 cup flour", { cacheResults: true }, mockLogger);
    });

    it("should parse ingredient successfully with v1 parser when cache fails", async () => {
      const mockParserResult = {
        rule: "ingredient",
        type: "ingredient",
        processingTime: 25,
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
            processingTime: 10,
          },
        ],
      };

      mockCachedIngredientParser.parseIngredientLine.mockRejectedValue(
        new Error("Cache miss")
      );
      mockParser.mockReturnValue(mockParserResult);

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("COMPLETED_SUCCESSFULLY");
      expect(result.metadata?.parsedSegments).toHaveLength(3);
      expect(result.metadata?.usedCache).toBe(false);
      expect(result.metadata?.parserVersion).toBe("v1");
      expect(result.metadata?.rule).toBe("ingredient");
      expect(result.metadata?.parseResult).toEqual(mockParserResult);

      expect(mockParser).toHaveBeenCalledWith("1 cup flour");
    });

    it("should clear cache when clearCache is true", async () => {
      const dataWithClearCache = {
        ...mockData,
        metadata: { clearCache: true },
      };

      const mockCachedResult: IngredientParseResult = {
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
        processingTime: 15,
      };

      mockCachedIngredientParser.parseIngredientLine.mockResolvedValue(
        mockCachedResult
      );

      await parseIngredientLine(dataWithClearCache, mockLogger);

      expect(
        mockCachedIngredientParser.invalidateIngredientCache
      ).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PARSE_INGREDIENT_LINE] Clearing ingredient cache as requested"
      );
    });

    it("should handle empty parsed segments", async () => {
      const mockCachedResult: IngredientParseResult = {
        rule: "unknown",
        type: "unknown",
        values: [],
        processingTime: 5,
      };

      mockCachedIngredientParser.parseIngredientLine.mockResolvedValue(
        mockCachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("COMPLETED_WITH_ERROR");
      expect(result.metadata?.parsedSegments).toHaveLength(0);
    });

    it("should handle v1 parser failure", async () => {
      mockCachedIngredientParser.parseIngredientLine.mockRejectedValue(
        new Error("Cache miss")
      );
      mockParser.mockImplementation(() => {
        throw new Error("Parser failed");
      });

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("COMPLETED_WITH_ERROR");
      expect(result.metadata?.error).toBe("Parser failed");
      expect(result.metadata?.errorTimestamp).toBeDefined();
    });

    it("should handle missing noteId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithoutNoteId = { ...mockData, noteId: undefined as any };

      await expect(
        parseIngredientLine(dataWithoutNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for ingredient parsing");
    });

    it("should handle missing ingredientReference", async () => {
      const dataWithoutReference = {
        ...mockData,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ingredientReference: undefined as any,
      };

      await expect(
        parseIngredientLine(dataWithoutReference, mockLogger)
      ).rejects.toThrow("No ingredient reference available for parsing");
    });

    it("should handle empty ingredientReference", async () => {
      const dataWithEmptyReference = { ...mockData, ingredientReference: "" };

      await expect(
        parseIngredientLine(dataWithEmptyReference, mockLogger)
      ).rejects.toThrow("No ingredient reference available for parsing");
    });

    it("should preserve existing metadata when parsing succeeds", async () => {
      const dataWithMetadata = {
        ...mockData,
        metadata: {
          existingKey: "existingValue",
          clearCache: false,
        },
      };

      const mockCachedResult: IngredientParseResult = {
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
        processingTime: 15,
      };

      mockCachedIngredientParser.parseIngredientLine.mockResolvedValue(
        mockCachedResult
      );

      const result = await parseIngredientLine(dataWithMetadata, mockLogger);

      expect(result.metadata?.existingKey).toBe("existingValue");
      expect(result.metadata?.parsedSegments).toBeDefined();
      expect(result.metadata?.usedCache).toBe(true);
    });

    it("should preserve existing metadata when parsing fails", async () => {
      const dataWithMetadata = {
        ...mockData,
        metadata: {
          existingKey: "existingValue",
        },
      };

      mockCachedIngredientParser.parseIngredientLine.mockRejectedValue(
        new Error("Cache miss")
      );
      mockParser.mockImplementation(() => {
        throw new Error("Parser failed");
      });

      const result = await parseIngredientLine(dataWithMetadata, mockLogger);

      expect(result.metadata?.existingKey).toBe("existingValue");
      expect(result.metadata?.error).toBeDefined();
      expect(result.metadata?.errorTimestamp).toBeDefined();
    });
  });
});
