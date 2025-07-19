import { describe, it, expect, beforeEach, vi } from "vitest";
import { PatternTracker, PatternRule } from "../pattern-tracker";
import { PrismaClient } from "@peas/database";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

describe("PatternTracker", () => {
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

  describe("generatePatternCode", () => {
    it("should generate correct pattern code with rule numbers", () => {
      const rules: PatternRule[] = [
        {
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
          ruleNumber: 0,
        },
        {
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
          ruleNumber: 1,
        },
        {
          rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
          ruleNumber: 2,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (patternTracker as any).generatePatternCode(rules);
      expect(result).toBe(
        "0:#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount_1:#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit_2:#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient"
      );
    });

    it("should handle single rule", () => {
      const rules: PatternRule[] = [
        {
          rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
          ruleNumber: 0,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (patternTracker as any).generatePatternCode(rules);
      expect(result).toBe(
        "0:#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient"
      );
    });
  });

  describe("trackPattern", () => {
    const mockRules: PatternRule[] = [
      {
        rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
        ruleNumber: 0,
      },
      {
        rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #4_unit",
        ruleNumber: 1,
      },
      {
        rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
        ruleNumber: 2,
      },
    ];

    const exampleLine = "1.5 lbs skirt steak";
    const expectedPatternCode =
      "0:#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount_1:#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #4_unit_2:#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient";

    it("should create new pattern when it does not exist", async () => {
      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({ id: "test-id" });

      await patternTracker.trackPattern(mockRules, exampleLine);

      expect(mockPrisma.uniqueLinePattern.findUnique).toHaveBeenCalledWith({
        where: { patternCode: expectedPatternCode },
      });

      expect(mockPrisma.uniqueLinePattern.create).toHaveBeenCalledWith({
        data: {
          patternCode: expectedPatternCode,
          ruleSequence: mockRules,
          exampleLine: exampleLine,
          occurrenceCount: 1,
        },
      });
    });

    it("should update existing pattern when it exists", async () => {
      const existingPattern = {
        id: "existing-id",
        patternCode: expectedPatternCode,
        occurrenceCount: 5,
        exampleLine: "old example",
      };

      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(
        existingPattern
      );
      mockPrisma.uniqueLinePattern.update.mockResolvedValue({
        ...existingPattern,
        occurrenceCount: 6,
      });

      await patternTracker.trackPattern(mockRules, exampleLine);

      expect(mockPrisma.uniqueLinePattern.update).toHaveBeenCalledWith({
        where: { patternCode: expectedPatternCode },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: expect.any(Date),
          exampleLine: exampleLine, // Should update with new example line
        },
      });
    });

    it("should not update example line if it's the same", async () => {
      const existingPattern = {
        id: "existing-id",
        patternCode: expectedPatternCode,
        occurrenceCount: 5,
        exampleLine: exampleLine, // Same as the one we're passing
      };

      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(
        existingPattern
      );
      mockPrisma.uniqueLinePattern.update.mockResolvedValue({
        ...existingPattern,
        occurrenceCount: 6,
      });

      await patternTracker.trackPattern(mockRules, exampleLine);

      expect(mockPrisma.uniqueLinePattern.update).toHaveBeenCalledWith({
        where: { patternCode: expectedPatternCode },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: expect.any(Date),
          // Should not include exampleLine since it's the same
        },
      });
    });

    it("should handle errors and throw them", async () => {
      mockPrisma.uniqueLinePattern.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        patternTracker.trackPattern(mockRules, exampleLine)
      ).rejects.toThrow("Database error");
    });

    it("should work without example line", async () => {
      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({ id: "test-id" });

      await patternTracker.trackPattern(mockRules);

      expect(mockPrisma.uniqueLinePattern.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          exampleLine: undefined,
        }),
      });
    });
  });

  describe("getPatterns", () => {
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
});
