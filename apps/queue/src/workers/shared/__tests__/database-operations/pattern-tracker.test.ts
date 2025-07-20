import { describe, it, expect, beforeEach, vi } from "vitest";
import { DatabaseOperations } from "../../database-operations";
import { PrismaClient } from "@peas/database";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

describe("DatabaseOperations - patternTracker", () => {
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

  it("should return a PatternTracker instance", () => {
    const tracker = dbOps.patternTracker;
    expect(tracker).toBeDefined();
    expect(typeof tracker.trackPattern).toBe("function");
  });
});
