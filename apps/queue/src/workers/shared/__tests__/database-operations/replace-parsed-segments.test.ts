import { describe, it, expect, beforeEach, vi } from "vitest";
import { DatabaseOperations } from "../../database-operations";
import { PrismaClient } from "@peas/database";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

describe("DatabaseOperations - replaceParsedSegments", () => {
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
    await expect(dbOps.replaceParsedSegments("", mockSegments)).rejects.toThrow(
      "ingredientLineId is required for replaceParsedSegments"
    );
  });
});
