import { beforeEach, describe, expect, it, vi } from "vitest";

import { DatabaseOperations } from "../../shared/database-operations";

// Mock PatternTracker
vi.mock("../../shared/pattern-tracker", () => {
  const MockPatternTracker = vi.fn().mockImplementation(() => ({
    trackPattern: vi.fn(),
    getPatterns: vi.fn(),
  }));

  return {
    PatternTracker: MockPatternTracker,
  };
});

// Mock pluralize
vi.mock("pluralize", () => ({
  default: {
    singular: vi.fn((word: string) => word.replace(/s$/, "")),
    plural: vi.fn((word: string) => word + "s"),
  },
}));

describe("DatabaseOperations", () => {
  let mockPrisma: {
    parsedIngredientLine: {
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    parsedSegment: {
      deleteMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
    ingredientReference: {
      create: ReturnType<typeof vi.fn>;
    };
    ingredient: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let dbOps: DatabaseOperations;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a comprehensive mock Prisma client
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

    // Use type assertion for testing - this is acceptable since we're testing the class behavior
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbOps = new DatabaseOperations(mockPrisma as any);
  });

  describe("constructor", () => {
    it("should create instance with prisma client", () => {
      expect(dbOps).toBeInstanceOf(DatabaseOperations);
    });
  });

  describe("patternTracker", () => {
    it("should return new PatternTracker instance", () => {
      const tracker = dbOps.patternTracker;
      expect(tracker).toBeDefined();
      // We can't easily test the constructor call with the current mock setup
      // but we can verify the tracker is created
    });

    it("should create new instance each time", () => {
      const tracker1 = dbOps.patternTracker;
      const tracker2 = dbOps.patternTracker;
      expect(tracker1).not.toBe(tracker2);
    });
  });

  describe("createOrUpdateParsedIngredientLine", () => {
    const validData = {
      blockIndex: 1,
      lineIndex: 2,
      reference: "test reference",
      noteId: "note-123",
      parseStatus: "CORRECT" as const,
      parsedAt: new Date("2023-01-01"),
    };

    it("should update existing line successfully", async () => {
      mockPrisma.parsedIngredientLine.update.mockResolvedValue({
        id: "line-123",
      });

      await dbOps.createOrUpdateParsedIngredientLine("line-123", validData);

      expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalledWith({
        where: { id: "line-123" },
        data: {
          parseStatus: "CORRECT",
          parsedAt: new Date("2023-01-01"),
        },
      });
    });

    it("should create new line when update fails with 'No record was found'", async () => {
      const updateError = new Error("No record was found");
      mockPrisma.parsedIngredientLine.update.mockRejectedValue(updateError);
      mockPrisma.parsedIngredientLine.create.mockResolvedValue({
        id: "line-123",
      });

      await dbOps.createOrUpdateParsedIngredientLine("line-123", validData);

      expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalled();
      expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
        data: {
          id: "line-123",
          blockIndex: 1,
          lineIndex: 2,
          reference: "test reference",
          noteId: "note-123",
          parseStatus: "CORRECT",
          parsedAt: new Date("2023-01-01"),
        },
      });
    });

    it("should create new line with null noteId when noteId is undefined", async () => {
      const updateError = new Error("No record was found");
      mockPrisma.parsedIngredientLine.update.mockRejectedValue(updateError);
      mockPrisma.parsedIngredientLine.create.mockResolvedValue({
        id: "line-123",
      });

      const dataWithoutNoteId = { ...validData, noteId: undefined };
      await dbOps.createOrUpdateParsedIngredientLine(
        "line-123",
        dataWithoutNoteId
      );

      expect(mockPrisma.parsedIngredientLine.create).toHaveBeenCalledWith({
        data: {
          id: "line-123",
          blockIndex: 1,
          lineIndex: 2,
          reference: "test reference",
          noteId: null,
          parseStatus: "CORRECT",
          parsedAt: new Date("2023-01-01"),
        },
      });
    });

    it("should use current date when parsedAt is undefined", async () => {
      const updateError = new Error("No record was found");
      mockPrisma.parsedIngredientLine.update.mockRejectedValue(updateError);
      mockPrisma.parsedIngredientLine.create.mockResolvedValue({
        id: "line-123",
      });

      const dataWithoutParsedAt = { ...validData, parsedAt: undefined };
      await dbOps.createOrUpdateParsedIngredientLine(
        "line-123",
        dataWithoutParsedAt
      );

      const createCall =
        mockPrisma.parsedIngredientLine.create.mock.calls[0]![0];
      expect(createCall.data.parsedAt).toBeInstanceOf(Date);
      expect(createCall.data.parsedAt.getTime()).toBeCloseTo(Date.now(), -2); // Within 100ms
    });

    it("should throw error when lineId is empty", async () => {
      await expect(
        dbOps.createOrUpdateParsedIngredientLine("", validData)
      ).rejects.toThrow(
        "lineId is required for createOrUpdateParsedIngredientLine"
      );
    });

    it("should throw error when lineId is null", async () => {
      await expect(
        dbOps.createOrUpdateParsedIngredientLine(
          null as unknown as string,
          validData
        )
      ).rejects.toThrow(
        "lineId is required for createOrUpdateParsedIngredientLine"
      );
    });

    it("should re-throw non-'No record was found' errors", async () => {
      const otherError = new Error("Database connection failed");
      mockPrisma.parsedIngredientLine.update.mockRejectedValue(otherError);

      await expect(
        dbOps.createOrUpdateParsedIngredientLine("line-123", validData)
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle different parse statuses", async () => {
      mockPrisma.parsedIngredientLine.update.mockResolvedValue({
        id: "line-123",
      });

      const statuses = ["CORRECT", "INCORRECT", "ERROR"] as const;
      for (const status of statuses) {
        await dbOps.createOrUpdateParsedIngredientLine("line-123", {
          ...validData,
          parseStatus: status,
        });

        expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalledWith({
          where: { id: "line-123" },
          data: {
            parseStatus: status,
            parsedAt: new Date("2023-01-01"),
          },
        });
      }
    });
  });

  describe("updateParsedIngredientLine", () => {
    const validData = {
      parseStatus: "CORRECT" as const,
      parsedAt: new Date("2023-01-01"),
    };

    it("should update line successfully", async () => {
      mockPrisma.parsedIngredientLine.update.mockResolvedValue({
        id: "line-123",
      });

      await dbOps.updateParsedIngredientLine("line-123", validData);

      expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalledWith({
        where: { id: "line-123" },
        data: {
          parseStatus: "CORRECT",
          parsedAt: new Date("2023-01-01"),
        },
      });
    });

    it("should use current date when parsedAt is undefined", async () => {
      mockPrisma.parsedIngredientLine.update.mockResolvedValue({
        id: "line-123",
      });

      await dbOps.updateParsedIngredientLine("line-123", {
        parseStatus: "CORRECT",
      });

      const updateCall =
        mockPrisma.parsedIngredientLine.update.mock.calls[0]![0];
      expect(updateCall.data.parsedAt).toBeInstanceOf(Date);
      expect(updateCall.data.parsedAt.getTime()).toBeCloseTo(Date.now(), -2);
    });

    it("should throw error when lineId is empty", async () => {
      await expect(
        dbOps.updateParsedIngredientLine("", validData)
      ).rejects.toThrow("lineId is required for updateParsedIngredientLine");
    });

    it("should throw error when lineId is null", async () => {
      await expect(
        dbOps.updateParsedIngredientLine(null as unknown as string, validData)
      ).rejects.toThrow("lineId is required for updateParsedIngredientLine");
    });

    it("should handle different parse statuses", async () => {
      mockPrisma.parsedIngredientLine.update.mockResolvedValue({
        id: "line-123",
      });

      const statuses = ["CORRECT", "INCORRECT", "ERROR"] as const;
      for (const status of statuses) {
        await dbOps.updateParsedIngredientLine("line-123", {
          parseStatus: status,
        });

        expect(mockPrisma.parsedIngredientLine.update).toHaveBeenCalledWith({
          where: { id: "line-123" },
          data: {
            parseStatus: status,
            parsedAt: expect.any(Date),
          },
        });
      }
    });
  });

  describe("replaceParsedSegments", () => {
    const validSegments = [
      {
        index: 0,
        rule: "ingredient",
        type: "string",
        value: "flour",
        processingTime: 100,
      },
      {
        index: 1,
        rule: "amount",
        type: "number",
        value: "2",
        processingTime: 50,
      },
    ];

    it("should replace segments successfully", async () => {
      mockPrisma.parsedSegment.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.parsedSegment.createMany.mockResolvedValue({ count: 2 });

      await dbOps.replaceParsedSegments("line-123", validSegments);

      expect(mockPrisma.parsedSegment.deleteMany).toHaveBeenCalledWith({
        where: { ingredientLineId: "line-123" },
      });

      expect(mockPrisma.parsedSegment.createMany).toHaveBeenCalledWith({
        data: [
          {
            index: 0,
            rule: "ingredient",
            type: "string",
            value: "flour",
            processingTime: 100,
            ingredientLineId: "line-123",
          },
          {
            index: 1,
            rule: "amount",
            type: "number",
            value: "2",
            processingTime: 50,
            ingredientLineId: "line-123",
          },
        ],
      });
    });

    it("should handle segments without processing time", async () => {
      const segmentsWithoutProcessingTime = [
        {
          index: 0,
          rule: "ingredient",
          type: "string",
          value: "flour",
        },
      ];

      mockPrisma.parsedSegment.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.parsedSegment.createMany.mockResolvedValue({ count: 1 });

      await dbOps.replaceParsedSegments(
        "line-123",
        segmentsWithoutProcessingTime
      );

      expect(mockPrisma.parsedSegment.createMany).toHaveBeenCalledWith({
        data: [
          {
            index: 0,
            rule: "ingredient",
            type: "string",
            value: "flour",
            processingTime: null,
            ingredientLineId: "line-123",
          },
        ],
      });
    });

    it("should handle empty segments array", async () => {
      mockPrisma.parsedSegment.deleteMany.mockResolvedValue({ count: 0 });

      await dbOps.replaceParsedSegments("line-123", []);

      expect(mockPrisma.parsedSegment.deleteMany).toHaveBeenCalledWith({
        where: { ingredientLineId: "line-123" },
      });
      expect(mockPrisma.parsedSegment.createMany).not.toHaveBeenCalled();
    });

    it("should throw error when ingredientLineId is empty", async () => {
      await expect(
        dbOps.replaceParsedSegments("", validSegments)
      ).rejects.toThrow(
        "ingredientLineId is required for replaceParsedSegments"
      );
    });

    it("should throw error when ingredientLineId is null", async () => {
      await expect(
        dbOps.replaceParsedSegments(null as unknown as string, validSegments)
      ).rejects.toThrow(
        "ingredientLineId is required for replaceParsedSegments"
      );
    });
  });

  describe("createIngredientReference", () => {
    const validData = {
      ingredientId: "ingredient-123",
      parsedLineId: "line-123",
      segmentIndex: 0,
      reference: "flour",
      noteId: "note-123",
      context: "main_ingredient",
    };

    it("should create reference successfully", async () => {
      mockPrisma.ingredientReference.create.mockResolvedValue({
        id: "ref-123",
      });

      await dbOps.createIngredientReference(validData);

      expect(mockPrisma.ingredientReference.create).toHaveBeenCalledWith({
        data: {
          ingredientId: "ingredient-123",
          parsedLineId: "line-123",
          segmentIndex: 0,
          reference: "flour",
          noteId: "note-123",
          context: "main_ingredient",
        },
      });
    });

    it("should use default context when context is undefined", async () => {
      mockPrisma.ingredientReference.create.mockResolvedValue({
        id: "ref-123",
      });

      const dataWithoutContext = { ...validData, context: undefined };
      await dbOps.createIngredientReference(dataWithoutContext);

      expect(mockPrisma.ingredientReference.create).toHaveBeenCalledWith({
        data: {
          ingredientId: "ingredient-123",
          parsedLineId: "line-123",
          segmentIndex: 0,
          reference: "flour",
          noteId: "note-123",
          context: "main_ingredient",
        },
      });
    });

    it("should handle unique constraint violations gracefully", async () => {
      const uniqueConstraintError = new Error("Unique constraint failed");
      mockPrisma.ingredientReference.create.mockRejectedValue(
        uniqueConstraintError
      );

      await expect(
        dbOps.createIngredientReference(validData)
      ).resolves.toBeUndefined();
    });

    it("should re-throw non-unique constraint errors", async () => {
      const otherError = new Error("Database connection failed");
      mockPrisma.ingredientReference.create.mockRejectedValue(otherError);

      await expect(dbOps.createIngredientReference(validData)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should throw error when ingredientId is empty", async () => {
      await expect(
        dbOps.createIngredientReference({ ...validData, ingredientId: "" })
      ).rejects.toThrow(
        "ingredientId is required for createIngredientReference"
      );
    });

    it("should throw error when ingredientId is null", async () => {
      await expect(
        dbOps.createIngredientReference({
          ...validData,
          ingredientId: null as unknown as string,
        })
      ).rejects.toThrow(
        "ingredientId is required for createIngredientReference"
      );
    });

    it("should throw error when parsedLineId is empty", async () => {
      await expect(
        dbOps.createIngredientReference({ ...validData, parsedLineId: "" })
      ).rejects.toThrow(
        "parsedLineId is required for createIngredientReference"
      );
    });

    it("should throw error when parsedLineId is null", async () => {
      await expect(
        dbOps.createIngredientReference({
          ...validData,
          parsedLineId: null as unknown as string,
        })
      ).rejects.toThrow(
        "parsedLineId is required for createIngredientReference"
      );
    });
  });

  describe("findOrCreateIngredient", () => {
    it("should find existing ingredient by exact name", async () => {
      const existingIngredient = {
        id: "ingredient-123",
        name: "flour",
        plural: "flours",
      };
      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

      const result = await dbOps.findOrCreateIngredient(
        "flour",
        "test reference"
      );

      expect(result).toEqual({
        id: "ingredient-123",
        name: "flour",
        isNew: false,
      });
    });

    it("should find existing ingredient by singular form", async () => {
      const existingIngredient = {
        id: "ingredient-123",
        name: "flour",
        plural: null,
      };
      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

      const result = await dbOps.findOrCreateIngredient(
        "flours",
        "test reference"
      );

      expect(result).toEqual({
        id: "ingredient-123",
        name: "flour",
        isNew: false,
      });
    });

    it("should find existing ingredient by plural form", async () => {
      const existingIngredient = {
        id: "ingredient-123",
        name: "flour",
        plural: "flours",
      };
      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

      const result = await dbOps.findOrCreateIngredient(
        "flour",
        "test reference"
      );

      expect(result).toEqual({
        id: "ingredient-123",
        name: "flour",
        isNew: false,
      });
    });

    it("should create new ingredient when singular input", async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(null);
      const newIngredient = {
        id: "ingredient-456",
        name: "flour",
        plural: null,
      };
      mockPrisma.ingredient.create.mockResolvedValue(newIngredient);

      const result = await dbOps.findOrCreateIngredient(
        "flour",
        "test reference"
      );

      expect(result).toEqual({
        id: "ingredient-456",
        name: "flour",
        isNew: true,
      });

      expect(mockPrisma.ingredient.create).toHaveBeenCalledWith({
        data: {
          name: "flour",
          plural: null,
        },
      });
    });

    it("should create new ingredient when plural input", async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(null);
      const newIngredient = {
        id: "ingredient-456",
        name: "flour",
        plural: "flours",
      };
      mockPrisma.ingredient.create.mockResolvedValue(newIngredient);

      const result = await dbOps.findOrCreateIngredient(
        "flours",
        "test reference"
      );

      expect(result).toEqual({
        id: "ingredient-456",
        name: "flour",
        isNew: true,
      });

      expect(mockPrisma.ingredient.create).toHaveBeenCalledWith({
        data: {
          name: "flour",
          plural: "flours",
        },
      });
    });

    it("should handle ingredients with aliases", async () => {
      const existingIngredient = {
        id: "ingredient-123",
        name: "all-purpose flour",
        plural: null,
      };
      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

      const result = await dbOps.findOrCreateIngredient(
        "flour",
        "test reference"
      );

      expect(result).toEqual({
        id: "ingredient-123",
        name: "all-purpose flour",
        isNew: false,
      });
    });

    it("should handle case sensitivity in ingredient names", async () => {
      const existingIngredient = {
        id: "ingredient-123",
        name: "Flour",
        plural: null,
      };
      mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

      const result = await dbOps.findOrCreateIngredient(
        "flour",
        "test reference"
      );

      expect(result).toEqual({
        id: "ingredient-123",
        name: "Flour",
        isNew: false,
      });
    });

    it("should handle edge case where singular and plural are the same", async () => {
      mockPrisma.ingredient.findFirst.mockResolvedValue(null);
      const newIngredient = {
        id: "ingredient-456",
        name: "sheep",
        plural: null,
      };
      mockPrisma.ingredient.create.mockResolvedValue(newIngredient);

      const result = await dbOps.findOrCreateIngredient(
        "sheep",
        "test reference"
      );

      expect(result).toEqual({
        id: "ingredient-456",
        name: "sheep",
        isNew: true,
      });

      expect(mockPrisma.ingredient.create).toHaveBeenCalledWith({
        data: {
          name: "sheep",
          plural: null,
        },
      });
    });
  });
});
