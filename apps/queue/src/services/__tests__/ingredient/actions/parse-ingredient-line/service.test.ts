import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IngredientJobData } from "../../../../../workers/ingredient/dependencies";
import { parseIngredientLine } from "../../../../ingredient/actions/parse-ingredient-line/service";

// Mock the cached ingredient parser
vi.mock("../../../../cached-ingredient-parser", () => ({
  CachedIngredientParser: {
    parseIngredientLine: vi.fn(),
  },
}));

// Mock the parser imports
vi.mock("@peas/parser/v1/minified", () => ({
  parse: vi.fn(),
}));

vi.mock("@peas/parser/v2/minified", () => ({
  parse: vi.fn(),
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
      const invalidData = { ...mockData, noteId: "" };

      await expect(
        parseIngredientLine(invalidData, mockLogger)
      ).rejects.toThrow("No note ID available for ingredient parsing");
    });

    it("should throw error when ingredientReference is missing", async () => {
      const invalidData = { ...mockData, ingredientReference: "" };

      await expect(
        parseIngredientLine(invalidData, mockLogger)
      ).rejects.toThrow("No ingredient reference available for parsing");
    });

    it("should have correct function signature", () => {
      expect(typeof parseIngredientLine).toBe("function");
      expect(parseIngredientLine.name).toBe("parseIngredientLine");
    });
  });
});
