import { describe, it, expect, beforeEach, vi } from "vitest";
import { DatabaseOperations } from "../../database-operations";
import { PrismaClient } from "@peas/database";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

describe("DatabaseOperations - updateParsedIngredientLine", () => {
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
