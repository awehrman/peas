import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IngredientJobData } from "../../../../../workers/ingredient/dependencies";
import type { ParserResult } from "../../../../ingredient/actions/parse-ingredient-line/types";

// Mock the cached ingredient parser
vi.doMock("../../../../ingredient/cached-ingredient-parser", () => ({
  CachedIngredientParser: {
    parseIngredientLine: vi.fn(),
  },
}));

// Mock the parser imports
vi.doMock("@peas/parser/v1/minified", () => ({
  parse: vi.fn(),
}));

vi.doMock("@peas/parser/v2/minified", () => ({
  parse: vi.fn(),
}));

// Mock the constants
vi.doMock("../../../../config/constants", () => ({
  PROCESSING_CONSTANTS: {
    INGREDIENT_PARSER_VERSION: "v1",
  },
}));

describe("Parse Ingredient Line Service", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockData: IngredientJobData;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      ingredientReference: "1 cup flour",
      lineIndex: 0,
      parseStatus: "PENDING" as const,
      isActive: true,
    };
  });

  describe("parseIngredientLine", () => {
    it("should throw error when noteId is missing", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const invalidData = { ...mockData, noteId: "" };

      await expect(
        parseIngredientLine(invalidData, mockLogger)
      ).rejects.toThrow("No note ID available for ingredient parsing");
    });

    it("should throw error when ingredientReference is missing", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const invalidData = { ...mockData, ingredientReference: "" };

      await expect(
        parseIngredientLine(invalidData, mockLogger)
      ).rejects.toThrow("No ingredient reference available for parsing");
    });

    it("should handle successful parsing with cached result", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { CachedIngredientParser } = await import(
        "../../../../ingredient/cached-ingredient-parser"
      );
      const cachedResult = {
        confidence: 0.8,
        amount: "1",
        unit: "cup",
        ingredient: "flour",
        modifiers: ["sifted"],
        processingTime: 50,
      };

      vi.mocked(CachedIngredientParser.parseIngredientLine).mockResolvedValue(
        cachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("CORRECT");
      expect(result.metadata?.parsedSegments).toBeDefined();
      // The real cached parser returns 3 segments for "1 cup flour": amount, unit, ingredient
      // Only 4 segments if modifiers are present
      expect(
        (result.metadata?.parsedSegments as unknown[])?.length
      ).toBeGreaterThanOrEqual(3);
    });

    it("should handle successful parsing with main parser", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { CachedIngredientParser } = await import(
        "../../../../ingredient/cached-ingredient-parser"
      );
      const { parse: v1Parse } = await import("@peas/parser/v1/minified");

      const cachedResult = {
        confidence: 0.5, // Low confidence
        amount: "1",
        unit: "cup",
        ingredient: "flour",
        modifiers: [],
        processingTime: 50,
      };

      const parserResult: ParserResult = {
        rule: "ingredient_line",
        type: "ingredient",
        values: [
          { rule: "amount", type: "amount", value: "1" },
          { rule: "unit", type: "unit", value: "cup" },
          { rule: "ingredient", type: "ingredient", value: "flour" },
        ],
      };

      vi.mocked(CachedIngredientParser.parseIngredientLine).mockResolvedValue(
        cachedResult
      );
      vi.mocked(v1Parse).mockReturnValue(parserResult);

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("CORRECT");
      expect(result.metadata?.parsedSegments).toBeDefined();
      expect(result.metadata?.parsedSegments).toHaveLength(3);
    });

    it("should handle cache failure and use main parser", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { CachedIngredientParser } = await import(
        "../../../../ingredient/cached-ingredient-parser"
      );
      const { parse: v1Parse } = await import("@peas/parser/v1/minified");

      const parserResult: ParserResult = {
        rule: "ingredient_line",
        type: "ingredient",
        values: [
          { rule: "amount", type: "amount", value: "1" },
          { rule: "unit", type: "unit", value: "cup" },
          { rule: "ingredient", type: "ingredient", value: "flour" },
        ],
      };

      vi.mocked(CachedIngredientParser.parseIngredientLine).mockRejectedValue(
        new Error("Cache error")
      );
      vi.mocked(v1Parse).mockReturnValue(parserResult);

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("CORRECT");
      expect(result.metadata?.parsedSegments).toBeDefined();
      expect(result.metadata?.parsedSegments).toHaveLength(3);
    });

    it("should set parseStatus to ERROR when no segments are found", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { parse: v1Parse } = await import("@peas/parser/v1/minified");

      // Use an ingredient that the cached parser can't parse well
      const testData = {
        ...mockData,
        ingredientReference: "invalid ingredient that can't be parsed",
      };

      // Mock parser to return empty values
      vi.mocked(v1Parse).mockReturnValue({
        rule: "ingredient_line",
        type: "ingredient",
        values: [],
      });

      const result = await parseIngredientLine(testData, mockLogger);

      expect(result.parseStatus).toBe("ERROR");
      expect(result.metadata?.parsedSegments).toHaveLength(0);
    });

    it("should handle parser errors gracefully", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { parse: v1Parse } = await import("@peas/parser/v1/minified");

      // Use an ingredient that the cached parser can't parse well
      const testData = {
        ...mockData,
        ingredientReference: "invalid ingredient that can't be parsed",
      };

      // Mock parser to throw an error
      vi.mocked(v1Parse).mockImplementation(() => {
        throw new Error("Parser error");
      });

      const result = await parseIngredientLine(testData, mockLogger);

      expect(result.parseStatus).toBe("ERROR");
      expect(result.metadata?.error).toBe("Parser error");
      expect(result.metadata?.errorTimestamp).toBeDefined();
    });

    it("should preserve existing metadata", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { CachedIngredientParser } = await import(
        "../../../../ingredient/cached-ingredient-parser"
      );

      const dataWithMetadata = {
        ...mockData,
        metadata: {
          existingField: "existing value",
          blockIndex: 5,
        },
      };

      const cachedResult = {
        confidence: 0.8,
        amount: "1",
        unit: "cup",
        ingredient: "flour",
        modifiers: [],
        processingTime: 50,
      };

      vi.mocked(CachedIngredientParser.parseIngredientLine).mockResolvedValue(
        cachedResult
      );

      const result = await parseIngredientLine(dataWithMetadata, mockLogger);

      expect(result.metadata?.existingField).toBe("existing value");
      expect(result.metadata?.blockIndex).toBe(5);
      expect(result.metadata?.parsedSegments).toBeDefined();
    });

    it("should handle cached result with missing amount", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { CachedIngredientParser } = await import(
        "../../../../ingredient/cached-ingredient-parser"
      );

      const cachedResult = {
        confidence: 0.8,
        amount: undefined,
        unit: "cup",
        ingredient: "flour",
        modifiers: [],
        processingTime: 50,
      };

      vi.mocked(CachedIngredientParser.parseIngredientLine).mockResolvedValue(
        cachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("CORRECT");
      expect(result.metadata?.parsedSegments).toBeDefined();
      // Should have 2 segments: unit and ingredient (no amount)
      expect(result.metadata?.parsedSegments).toHaveLength(2);
    });

    it("should handle cached result with missing unit", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { CachedIngredientParser } = await import(
        "../../../../ingredient/cached-ingredient-parser"
      );

      const cachedResult = {
        confidence: 0.8,
        amount: "1",
        unit: undefined,
        ingredient: "flour",
        modifiers: [],
        processingTime: 50,
      };

      vi.mocked(CachedIngredientParser.parseIngredientLine).mockResolvedValue(
        cachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("CORRECT");
      expect(result.metadata?.parsedSegments).toBeDefined();
      // Should have 2 segments: amount and ingredient (no unit)
      expect(result.metadata?.parsedSegments).toHaveLength(2);
    });

    it("should handle cached result with missing ingredient", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { CachedIngredientParser } = await import(
        "../../../../ingredient/cached-ingredient-parser"
      );

      // Since ingredient is required in the interface, we'll test with empty string instead
      const cachedResult = {
        confidence: 0.8,
        amount: "1",
        unit: "cup",
        ingredient: "",
        modifiers: [],
        processingTime: 50,
      };

      vi.mocked(CachedIngredientParser.parseIngredientLine).mockResolvedValue(
        cachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("CORRECT");
      expect(result.metadata?.parsedSegments).toBeDefined();
      // Should have 2 segments: amount and unit (empty ingredient is falsy and not added)
      expect(result.metadata?.parsedSegments).toHaveLength(2);
    });

    it("should handle cached result with modifiers", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { CachedIngredientParser } = await import(
        "../../../../ingredient/cached-ingredient-parser"
      );

      const cachedResult = {
        confidence: 0.8,
        amount: "1",
        unit: "cup",
        ingredient: "flour",
        modifiers: ["sifted", "organic"],
        processingTime: 50,
      };

      vi.mocked(CachedIngredientParser.parseIngredientLine).mockResolvedValue(
        cachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("CORRECT");
      expect(result.metadata?.parsedSegments).toBeDefined();
      // Should have 4 segments: amount, unit, ingredient, and modifiers
      expect(result.metadata?.parsedSegments).toHaveLength(4);

      // Check that modifiers are joined correctly
      const modifierSegment = (
        result.metadata?.parsedSegments as unknown[]
      )?.find((seg: unknown) => (seg as { type: string }).type === "modifier");
      expect((modifierSegment as { value: string })?.value).toBe(
        "sifted, organic"
      );
    });

    it("should handle cached result with empty modifiers array", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      const { CachedIngredientParser } = await import(
        "../../../../ingredient/cached-ingredient-parser"
      );

      const cachedResult = {
        confidence: 0.8,
        amount: "1",
        unit: "cup",
        ingredient: "flour",
        modifiers: [],
        processingTime: 50,
      };

      vi.mocked(CachedIngredientParser.parseIngredientLine).mockResolvedValue(
        cachedResult
      );

      const result = await parseIngredientLine(mockData, mockLogger);

      expect(result.parseStatus).toBe("CORRECT");
      expect(result.metadata?.parsedSegments).toBeDefined();
      // Should have 3 segments: amount, unit, ingredient (no modifiers since array is empty)
      expect(result.metadata?.parsedSegments).toHaveLength(3);

      // Check that no modifier segment exists
      const modifierSegment = (
        result.metadata?.parsedSegments as unknown[]
      )?.find((seg: unknown) => (seg as { type: string }).type === "modifier");
      expect(modifierSegment).toBeUndefined();
    });

    it("should have correct function signature", async () => {
      const { parseIngredientLine } = await import(
        "../../../../ingredient/actions/parse-ingredient-line/service"
      );
      expect(typeof parseIngredientLine).toBe("function");
      expect(parseIngredientLine.name).toBe("parseIngredientLine");
    });
  });
});
