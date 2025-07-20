import { describe, it, expect, beforeEach, vi } from "vitest";
import { DatabaseOperations } from "../../database-operations";
import { PrismaClient } from "@peas/database";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

describe("DatabaseOperations - createIngredientReference", () => {
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

  const mockData = {
    ingredientId: "ingredient-123",
    parsedLineId: "line-123",
    segmentIndex: 0,
    reference: "2 cups flour",
    noteId: "note-123",
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
    ).rejects.toThrow("ingredientId is required for createIngredientReference");
  });

  it("should throw error when parsedLineId is empty", async () => {
    const dataWithoutParsedLineId = { ...mockData, parsedLineId: "" };

    await expect(
      dbOps.createIngredientReference(dataWithoutParsedLineId)
    ).rejects.toThrow("parsedLineId is required for createIngredientReference");
  });
});
