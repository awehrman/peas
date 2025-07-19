import { describe, it, expect, beforeEach, vi } from "vitest";
import { PatternTracker, ParsedSegment } from "../pattern-tracker";
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
    it("should generate correct pattern code for AMOUNT_UNIT_INGREDIENT", () => {
      const segments: ParsedSegment[] = [
        {
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
          type: "amount",
          value: "2",
        },
        {
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
          type: "unit",
          value: "tbsp",
        },
        {
          rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
          type: "ingredient",
          value: "olive oil",
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (patternTracker as any).generatePatternCode(
        segments.map((s) => s.rule)
      );
      expect(result).toBe("AMOUNT_UNIT_INGREDIENT");
    });

    it("should generate correct pattern code for AMOUNT_INGREDIENT", () => {
      const segments: ParsedSegment[] = [
        {
          rule: "#1_ingredientLine >> #2_quantities >> #2_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
          type: "amount",
          value: "1",
        },
        {
          rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
          type: "ingredient",
          value: "egg",
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (patternTracker as any).generatePatternCode(
        segments.map((s) => s.rule)
      );
      expect(result).toBe("AMOUNT_INGREDIENT");
    });

    it("should handle unknown rule types", () => {
      const segments: ParsedSegment[] = [
        {
          rule: "#1_ingredientLine >> #4_unknown >> #1_unknownType",
          type: "unknown",
          value: "something",
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (patternTracker as any).generatePatternCode(
        segments.map((s) => s.rule)
      );
      expect(result).toBe("UNKNOWN");
    });
  });

  describe("generateDescription", () => {
    it("should return known description for AMOUNT_UNIT_INGREDIENT", () => {
      const ruleSequence = ["rule1", "rule2", "rule3"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (patternTracker as any).generateDescription(
        ruleSequence,
        "AMOUNT_UNIT_INGREDIENT"
      );
      expect(result).toBe("Standard ingredient with amount and unit");
    });

    it("should return generic description for unknown pattern", () => {
      const ruleSequence = ["rule1", "rule2"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (patternTracker as any).generateDescription(
        ruleSequence,
        "UNKNOWN_PATTERN"
      );
      expect(result).toBe("Pattern: UNKNOWN_PATTERN");
    });
  });

  describe("trackPattern", () => {
    const mockSegments: ParsedSegment[] = [
      {
        rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
        type: "amount",
        value: "1.5",
      },
      {
        rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #4_unit",
        type: "unit",
        value: "lbs",
      },
      {
        rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
        type: "ingredient",
        value: "skirt steak",
      },
    ];

    const exampleLine = "1.5 lbs skirt steak";

    it("should create new pattern when it does not exist", async () => {
      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({ id: "test-id" });

      await patternTracker.trackPattern(mockSegments, exampleLine);

      expect(mockPrisma.uniqueLinePattern.findUnique).toHaveBeenCalledWith({
        where: { patternCode: "AMOUNT_UNIT_INGREDIENT" },
      });

      expect(mockPrisma.uniqueLinePattern.create).toHaveBeenCalledWith({
        data: {
          patternCode: "AMOUNT_UNIT_INGREDIENT",
          ruleSequence: mockSegments.map((s) => s.rule),
          description: "Standard ingredient with amount and unit",
          exampleLine: exampleLine,
          exampleValues: mockSegments.map((s) => ({
            rule: s.rule,
            type: s.type,
            value: s.value,
          })),
          occurrenceCount: 1,
        },
      });
    });

    it("should update existing pattern when it exists", async () => {
      const existingPattern = {
        id: "existing-id",
        patternCode: "AMOUNT_UNIT_INGREDIENT",
        occurrenceCount: 5,
      };

      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(
        existingPattern
      );
      mockPrisma.uniqueLinePattern.update.mockResolvedValue({
        ...existingPattern,
        occurrenceCount: 6,
      });

      await patternTracker.trackPattern(mockSegments, exampleLine);

      expect(mockPrisma.uniqueLinePattern.update).toHaveBeenCalledWith({
        where: { patternCode: "AMOUNT_UNIT_INGREDIENT" },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: expect.any(Date),
        },
      });
    });

    it("should handle errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockPrisma.uniqueLinePattern.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      await patternTracker.trackPattern(mockSegments, exampleLine);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Error tracking pattern:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should work without example line", async () => {
      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({ id: "test-id" });

      await patternTracker.trackPattern(mockSegments);

      expect(mockPrisma.uniqueLinePattern.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          exampleLine: null,
        }),
      });
    });
  });

  describe("getPatterns", () => {
    it("should return patterns ordered by occurrence count", async () => {
      const mockPatterns = [
        {
          patternCode: "AMOUNT_UNIT_INGREDIENT",
          description: "Standard ingredient with amount and unit",
          occurrenceCount: 10,
          firstSeenAt: new Date("2023-01-01"),
          lastSeenAt: new Date("2023-01-10"),
        },
        {
          patternCode: "AMOUNT_INGREDIENT",
          description: "Ingredient with amount but no unit",
          occurrenceCount: 5,
          firstSeenAt: new Date("2023-01-02"),
          lastSeenAt: new Date("2023-01-09"),
        },
      ];

      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

      const result = await patternTracker.getPatterns(10);

      expect(mockPrisma.uniqueLinePattern.findMany).toHaveBeenCalledWith({
        select: {
          patternCode: true,
          description: true,
          occurrenceCount: true,
          firstSeenAt: true,
          lastSeenAt: true,
        },
        orderBy: { occurrenceCount: "desc" },
        take: 10,
      });

      expect(result).toEqual(mockPatterns);
    });

    it("should use default limit of 50", async () => {
      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue([]);

      await patternTracker.getPatterns();

      expect(mockPrisma.uniqueLinePattern.findMany).toHaveBeenCalledWith({
        select: expect.any(Object),
        orderBy: { occurrenceCount: "desc" },
        take: 50,
      });
    });
  });
});
