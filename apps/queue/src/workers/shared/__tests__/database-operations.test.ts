import { describe, it, expect, beforeEach, vi } from "vitest";
import { DatabaseOperations } from "../database-operations";
import { PrismaClient } from "@peas/database";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

// Mock pluralize
vi.mock("pluralize", () => ({
  default: {
    singular: vi.fn((word: string) => {
      if (word.endsWith("s")) {
        return word.slice(0, -1);
      }
      return word;
    }),
    plural: vi.fn((word: string) => {
      if (word.endsWith("s")) {
        return word;
      }
      return word + "s";
    }),
  },
}));

describe("DatabaseOperations", () => {
  let dbOps: DatabaseOperations;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      parsedIngredientLine: {
        update: vi.fn(),
        create: vi.fn(),
      },
      parsedSegment: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      ingredientReference: {
        create: vi.fn(),
      },
      ingredient: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PrismaClient as any).mockImplementation(() => mockPrisma);
    dbOps = new DatabaseOperations(mockPrisma);
  });

  describe("patternTracker", () => {
    it("should return a PatternTracker instance", () => {
      const tracker = dbOps.patternTracker;
      expect(tracker).toBeDefined();
      expect(typeof tracker.trackPattern).toBe("function");
    });
  });

  describe("createOrUpdateParsedIngredientLine", () => {
    const mockData = {
      blockIndex: 0,
      lineIndex: 1,
      reference: "2 cups flour",
      noteId: "test-note-123",
      parseStatus: "CORRECT" as const,
      parsedAt: new Date("2023-01-01"),
    };

    it("should update existing line when it exists", async () => {
      const lineId = "existing-line-123";
      mockPrisma.parsedIngredientLine.update.mockResolvedValue({ id: lineId });

      await dbOps.createOrUpdateParsedIngredientLine(lineId, mockData);

      expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalledWith({
        where: { id: lineId },
        data: {
          parseStatus: mockData.parseStatus,
          parsedAt: mockData.parsedAt,
        },
      });
      expect(mockPrisma.parsedIngredientLine.create).not.toHaveBeenCalled();
    });

    it("should create new line when it does not exist", async () => {
      const lineId = "new-line-123";
      const updateError = new Error("No record was found for an update");
      mockPrisma.parsedIngredientLine.update.mockRejectedValue(updateError);
      mockPrisma.parsedIngredientLine.create.mockResolvedValue({ id: lineId });

      await dbOps.createOrUpdateParsedIngredientLine(lineId, mockData);

      expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalled();
      expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
        data: {
          id: lineId,
          blockIndex: mockData.blockIndex,
          lineIndex: mockData.lineIndex,
          reference: mockData.reference,
          noteId: mockData.noteId,
          parseStatus: mockData.parseStatus,
          parsedAt: mockData.parsedAt,
        },
      });
    });

    it("should create new line with null noteId when noteId is not provided", async () => {
      const lineId = "new-line-123";
      const dataWithoutNoteId = { ...mockData, noteId: undefined };
      const updateError = new Error("No record was found for an update");
      mockPrisma.parsedIngredientLine.update.mockRejectedValue(updateError);
      mockPrisma.parsedIngredientLine.create.mockResolvedValue({ id: lineId });

      await dbOps.createOrUpdateParsedIngredientLine(lineId, dataWithoutNoteId);

      expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          noteId: null,
        }),
      });
    });

    it("should use current date when parsedAt is not provided", async () => {
      const lineId = "new-line-123";
      const dataWithoutParsedAt = { ...mockData, parsedAt: undefined };
      const updateError = new Error("No record was found for an update");
      mockPrisma.parsedIngredientLine.update.mockRejectedValue(updateError);
      mockPrisma.parsedIngredientLine.create.mockResolvedValue({ id: lineId });

      await dbOps.createOrUpdateParsedIngredientLine(
        lineId,
        dataWithoutParsedAt
      );

      expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parsedAt: expect.any(Date),
        }),
      });
    });

    it("should throw error when lineId is empty", async () => {
      await expect(
        dbOps.createOrUpdateParsedIngredientLine("", mockData)
      ).rejects.toThrow(
        "lineId is required for createOrUpdateParsedIngredientLine"
      );
    });

    it("should rethrow non-record-not-found errors", async () => {
      const lineId = "test-line-123";
      const otherError = new Error("Database connection failed");
      mockPrisma.parsedIngredientLine.update.mockRejectedValue(otherError);

      await expect(
        dbOps.createOrUpdateParsedIngredientLine(lineId, mockData)
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("updateParsedIngredientLine", () => {
    const mockData = {
      parseStatus: "CORRECT" as const,
      parsedAt: new Date("2023-01-01"),
    };

    it("should update parsed ingredient line", async () => {
      const lineId = "test-line-123";
      mockPrisma.parsedIngredientLine.update.mockResolvedValue({ id: lineId });

      await dbOps.updateParsedIngredientLine(lineId, mockData);

      expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalledWith({
        where: { id: lineId },
        data: {
          parseStatus: mockData.parseStatus,
          parsedAt: mockData.parsedAt,
        },
      });
    });

    it("should use current date when parsedAt is not provided", async () => {
      const lineId = "test-line-123";
      const dataWithoutParsedAt = { parseStatus: "CORRECT" as const };
      mockPrisma.parsedIngredientLine.update.mockResolvedValue({ id: lineId });

      await dbOps.updateParsedIngredientLine(lineId, dataWithoutParsedAt);

      expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalledWith({
        where: { id: lineId },
        data: {
          parseStatus: "CORRECT",
          parsedAt: expect.any(Date),
        },
      });
    });

    it("should throw error when lineId is empty", async () => {
      await expect(
        dbOps.updateParsedIngredientLine("", mockData)
      ).rejects.toThrow("lineId is required for updateParsedIngredientLine");
    });
  });

  describe("replaceParsedSegments", () => {
    const mockSegments = [
      { index: 0, rule: "rule1", type: "amount", value: "2" },
      { index: 1, rule: "rule2", type: "unit", value: "cups" },
      { index: 2, rule: "rule3", type: "ingredient", value: "flour" },
    ];

    it("should replace segments for ingredient line", async () => {
      const ingredientLineId = "test-line-123";
      mockPrisma.parsedSegment.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.parsedSegment.createMany.mockResolvedValue({ count: 3 });

      await dbOps.replaceParsedSegments(ingredientLineId, mockSegments);

      expect(mockPrisma.parsedSegment.deleteMany).toHaveBeenCalledWith({
        where: { ingredientLineId },
      });

      expect(mockPrisma.parsedSegment.createMany).toHaveBeenCalledWith({
        data: mockSegments.map((segment) => ({
          ...segment,
          ingredientLineId,
          processingTime: null,
        })),
      });
    });

    it("should handle empty segments array", async () => {
      const ingredientLineId = "test-line-123";
      mockPrisma.parsedSegment.deleteMany.mockResolvedValue({ count: 0 });

      await dbOps.replaceParsedSegments(ingredientLineId, []);

      expect(mockPrisma.parsedSegment.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.parsedSegment.createMany).not.toHaveBeenCalled();
    });

    it("should throw error when ingredientLineId is empty", async () => {
      await expect(
        dbOps.replaceParsedSegments("", mockSegments)
      ).rejects.toThrow(
        "ingredientLineId is required for replaceParsedSegments"
      );
    });
  });

  describe("createIngredientReference", () => {
    const mockData = {
      ingredientId: "ingredient-123",
      parsedLineId: "line-123",
      segmentIndex: 0,
      reference: "2 cups flour",
      noteId: "note-123",
      confidence: 0.95,
      context: "main_ingredient",
    };

    it("should create ingredient reference", async () => {
      mockPrisma.ingredientReference.create.mockResolvedValue({
        id: "ref-123",
      });

      await dbOps.createIngredientReference(mockData);

      expect(mockPrisma.ingredientReference.create).toHaveBeenCalledWith({
        data: {
          ingredientId: mockData.ingredientId,
          parsedLineId: mockData.parsedLineId,
          segmentIndex: mockData.segmentIndex,
          reference: mockData.reference,
          noteId: mockData.noteId,
          confidence: mockData.confidence,
          context: mockData.context,
        },
      });
    });

    it("should use default values when optional fields are not provided", async () => {
      const dataWithoutOptionals = {
        ingredientId: "ingredient-123",
        parsedLineId: "line-123",
        segmentIndex: 0,
        reference: "2 cups flour",
      };

      mockPrisma.ingredientReference.create.mockResolvedValue({
        id: "ref-123",
      });

      await dbOps.createIngredientReference(dataWithoutOptionals);

      expect(mockPrisma.ingredientReference.create).toHaveBeenCalledWith({
        data: {
          ingredientId: dataWithoutOptionals.ingredientId,
          parsedLineId: dataWithoutOptionals.parsedLineId,
          segmentIndex: dataWithoutOptionals.segmentIndex,
          reference: dataWithoutOptionals.reference,
          noteId: undefined,
          confidence: 1.0,
          context: "main_ingredient",
        },
      });
    });

    it("should handle unique constraint violations gracefully", async () => {
      const uniqueConstraintError = new Error("Unique constraint failed");
      mockPrisma.ingredientReference.create.mockRejectedValue(
        uniqueConstraintError
      );

      // Should not throw error
      await expect(
        dbOps.createIngredientReference(mockData)
      ).resolves.toBeUndefined();
    });

    it("should rethrow non-unique constraint errors", async () => {
      const otherError = new Error("Database connection failed");
      mockPrisma.ingredientReference.create.mockRejectedValue(otherError);

      await expect(dbOps.createIngredientReference(mockData)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should throw error when ingredientId is empty", async () => {
      const dataWithoutIngredientId = { ...mockData, ingredientId: "" };

      await expect(
        dbOps.createIngredientReference(dataWithoutIngredientId)
      ).rejects.toThrow(
        "ingredientId is required for createIngredientReference"
      );
    });

    it("should throw error when parsedLineId is empty", async () => {
      const dataWithoutParsedLineId = { ...mockData, parsedLineId: "" };

      await expect(
        dbOps.createIngredientReference(dataWithoutParsedLineId)
      ).rejects.toThrow(
        "parsedLineId is required for createIngredientReference"
      );
    });
  });

  describe("findOrCreateIngredient", () => {
    const ingredientName = "tomatoes";
    const reference = "2 cups tomatoes";

    it("should find existing ingredient by singular name", async () => {
      const existingIngredient = {
        id: "ingredient-123",
        name: "tomato",
        plural: "tomatoes",
      };

      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

      const result = await dbOps.findOrCreateIngredient(
        ingredientName,
        reference
      );

      expect(result).toEqual({
        id: existingIngredient.id,
        name: existingIngredient.name,
        isNew: false,
      });

      expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: "tomatoe" }, // singular (mocked)
            { name: "tomatoes" }, // plural (mocked)
            { name: "tomatoes" }, // original
            {
              aliases: {
                some: { name: { in: ["tomatoe", "tomatoes", "tomatoes"] } },
              },
            },
          ],
        },
      });
    });

    it("should find existing ingredient by plural name", async () => {
      const existingIngredient = {
        id: "ingredient-123",
        name: "tomato",
        plural: "tomatoes",
      };

      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

      const result = await dbOps.findOrCreateIngredient("tomato", reference);

      expect(result).toEqual({
        id: existingIngredient.id,
        name: existingIngredient.name,
        isNew: false,
      });
    });

    it("should create new ingredient when not found", async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(null);

      const newIngredient = {
        id: "new-ingredient-123",
        name: "tomato",
        plural: "tomatoes",
      };

      mockPrisma.ingredient.create.mockResolvedValue(newIngredient);

      const result = await dbOps.findOrCreateIngredient(
        ingredientName,
        reference
      );

      expect(result).toEqual({
        id: newIngredient.id,
        name: newIngredient.name,
        isNew: true,
      });

      expect(mockPrisma.ingredient.create).toHaveBeenCalledWith({
        data: {
          name: "tomatoe", // singular (mocked)
          plural: "tomatoes", // plural (mocked)
          description: `Ingredient found in recipe: ${reference}`,
        },
      });
    });

    it("should handle ingredients that are already singular", async () => {
      const existingIngredient = {
        id: "ingredient-123",
        name: "salt",
        plural: "salts",
      };

      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

      const result = await dbOps.findOrCreateIngredient("salt", "1 tsp salt");

      expect(result).toEqual({
        id: existingIngredient.id,
        name: existingIngredient.name,
        isNew: false,
      });
    });
  });
});
