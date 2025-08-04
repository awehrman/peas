import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IngredientJobData } from "../../../../../workers/ingredient/dependencies";
import { saveIngredientLine } from "../../../../ingredient/actions/save-ingredient-line/service";

// Mock the database repository
vi.mock("@peas/database", () => ({
  upsertParsedIngredientLine: vi.fn(),
  replaceParsedSegments: vi.fn(),
  findOrCreateIngredient: vi.fn(),
  createIngredientReference: vi.fn(),
}));

describe("Save Ingredient Line Service", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
  };
  let mockData: IngredientJobData;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      ingredientReference: "1 cup flour",
      lineIndex: 0,
      parseStatus: "PENDING" as const,
      isActive: true,
    };
  });

  describe("saveIngredientLine", () => {
    it("should throw error when noteId is missing", async () => {
      const invalidData = { ...mockData, noteId: "" };

      await expect(
        saveIngredientLine(invalidData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("No note ID available for ingredient saving");
    });

    it("should throw error when ingredientReference is missing", async () => {
      const invalidData = { ...mockData, ingredientReference: "" };

      await expect(
        saveIngredientLine(invalidData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("No ingredient reference available for saving");
    });

    it("should have correct function signature", () => {
      expect(typeof saveIngredientLine).toBe("function");
      expect(saveIngredientLine.name).toBe("saveIngredientLine");
    });
  });
});
