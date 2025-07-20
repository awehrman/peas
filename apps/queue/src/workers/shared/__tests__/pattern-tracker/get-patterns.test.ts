import { describe, it, expect, beforeEach, vi } from "vitest";
import { PatternTracker } from "../../pattern-tracker";
import { PrismaClient } from "@peas/database";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

describe("PatternTracker - getPatterns", () => {
  let patternTracker: PatternTracker;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      uniqueLinePattern: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PrismaClient as any).mockImplementation(() => mockPrisma);
    patternTracker = new PatternTracker(mockPrisma);
  });

  it("should return patterns ordered by occurrence count", async () => {
    const mockPatterns = [
      {
        patternCode: "0:rule1_1:rule2",
        ruleSequence: [
          { rule: "rule1", ruleNumber: 0 },
          { rule: "rule2", ruleNumber: 1 },
        ],
        exampleLine: "example 1",
        occurrenceCount: 10,
        firstSeenAt: new Date("2023-01-01"),
        lastSeenAt: new Date("2023-01-10"),
      },
      {
        patternCode: "0:rule3",
        ruleSequence: [{ rule: "rule3", ruleNumber: 0 }],
        exampleLine: "example 2",
        occurrenceCount: 5,
        firstSeenAt: new Date("2023-01-02"),
        lastSeenAt: new Date("2023-01-09"),
      },
    ];

    mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

    const result = await patternTracker.getPatterns();

    expect(mockPrisma.uniqueLinePattern.findMany).toHaveBeenCalledWith({
      orderBy: { occurrenceCount: "desc" },
    });

    expect(result).toEqual([
      {
        patternCode: "0:rule1_1:rule2",
        ruleSequence: [
          { rule: "rule1", ruleNumber: 0 },
          { rule: "rule2", ruleNumber: 1 },
        ],
        exampleLine: "example 1",
      },
      {
        patternCode: "0:rule3",
        ruleSequence: [{ rule: "rule3", ruleNumber: 0 }],
        exampleLine: "example 2",
      },
    ]);
  });

  it("should handle patterns without example lines", async () => {
    const mockPatterns = [
      {
        patternCode: "0:rule1",
        ruleSequence: [{ rule: "rule1", ruleNumber: 0 }],
        exampleLine: null,
        occurrenceCount: 1,
      },
    ];

    mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

    const result = await patternTracker.getPatterns();

    expect(result).toEqual([
      {
        patternCode: "0:rule1",
        ruleSequence: [{ rule: "rule1", ruleNumber: 0 }],
        exampleLine: undefined,
      },
    ]);
  });

  it("should handle errors and throw them", async () => {
    mockPrisma.uniqueLinePattern.findMany.mockRejectedValue(
      new Error("Database error")
    );

    await expect(patternTracker.getPatterns()).rejects.toThrow(
      "Database error"
    );
  });
});
