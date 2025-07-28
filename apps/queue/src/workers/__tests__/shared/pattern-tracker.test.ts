import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogLevel } from "../../../types";
import { type PatternRule, PatternTracker } from "../../shared/pattern-tracker";

describe("PatternTracker", () => {
  let mockPrisma: {
    uniqueLinePattern: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockLogger: {
    log: ReturnType<typeof vi.fn>;
  };
  let patternTracker: PatternTracker;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      uniqueLinePattern: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
    };

    mockLogger = {
      log: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patternTracker = new PatternTracker(mockPrisma as any, mockLogger);
  });

  describe("constructor", () => {
    it("should create instance with prisma client", () => {
      expect(patternTracker).toBeInstanceOf(PatternTracker);
    });

    it("should create instance without logger", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trackerWithoutLogger = new PatternTracker(mockPrisma as any);
      expect(trackerWithoutLogger).toBeInstanceOf(PatternTracker);
    });
  });

  describe("trackPattern", () => {
    const testRules: PatternRule[] = [
      { rule: "ingredient", ruleNumber: 1 },
      { rule: "amount", ruleNumber: 2 },
    ];

    it("should create new pattern when pattern does not exist", async () => {
      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({
        patternCode: "1:ingredient_2:amount",
        ruleSequence: testRules,
        exampleLine: "2 cups flour",
        occurrenceCount: 1,
      });

      await patternTracker.trackPattern(testRules, "2 cups flour");

      expect(mockPrisma.uniqueLinePattern.findUnique).toHaveBeenCalledWith({
        where: { patternCode: "1:ingredient_2:amount" },
      });

      expect(mockPrisma.uniqueLinePattern.create).toHaveBeenCalledWith({
        data: {
          patternCode: "1:ingredient_2:amount",
          ruleSequence: testRules,
          exampleLine: "2 cups flour",
          occurrenceCount: 1,
        },
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Tracking pattern: 1:ingredient_2:amount",
        LogLevel.DEBUG
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Created new pattern: 1:ingredient_2:amount",
        LogLevel.DEBUG
      );
    });

    it("should update existing pattern when pattern exists", async () => {
      const existingPattern = {
        patternCode: "1:ingredient_2:amount",
        ruleSequence: testRules,
        exampleLine: "2 cups flour",
        occurrenceCount: 5,
      };

      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(
        existingPattern
      );
      mockPrisma.uniqueLinePattern.update.mockResolvedValue({
        ...existingPattern,
        occurrenceCount: 6,
      });

      await patternTracker.trackPattern(testRules, "3 cups sugar");

      expect(mockPrisma.uniqueLinePattern.findUnique).toHaveBeenCalledWith({
        where: { patternCode: "1:ingredient_2:amount" },
      });

      expect(mockPrisma.uniqueLinePattern.update).toHaveBeenCalledWith({
        where: { patternCode: "1:ingredient_2:amount" },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: expect.any(Date),
          exampleLine: "3 cups sugar",
        },
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Updated existing pattern: 1:ingredient_2:amount (count: 6)",
        LogLevel.DEBUG
      );
    });

    it("should not update example line if it is the same", async () => {
      const existingPattern = {
        patternCode: "1:ingredient_2:amount",
        ruleSequence: testRules,
        exampleLine: "2 cups flour",
        occurrenceCount: 5,
      };

      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(
        existingPattern
      );
      mockPrisma.uniqueLinePattern.update.mockResolvedValue({
        ...existingPattern,
        occurrenceCount: 6,
      });

      await patternTracker.trackPattern(testRules, "2 cups flour");

      expect(mockPrisma.uniqueLinePattern.update).toHaveBeenCalledWith({
        where: { patternCode: "1:ingredient_2:amount" },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: expect.any(Date),
        },
      });
    });

    it("should handle pattern tracking without example line", async () => {
      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({
        patternCode: "1:ingredient_2:amount",
        ruleSequence: testRules,
        exampleLine: null,
        occurrenceCount: 1,
      });

      await patternTracker.trackPattern(testRules);

      expect(mockPrisma.uniqueLinePattern.create).toHaveBeenCalledWith({
        data: {
          patternCode: "1:ingredient_2:amount",
          ruleSequence: testRules,
          exampleLine: undefined,
          occurrenceCount: 1,
        },
      });
    });

    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.uniqueLinePattern.findUnique.mockRejectedValue(dbError);

      await expect(patternTracker.trackPattern(testRules)).rejects.toThrow(
        "Database connection failed"
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Error tracking pattern: Error: Database connection failed",
        LogLevel.ERROR
      );
    });

    it("should handle complex rule sequences", async () => {
      const complexRules: PatternRule[] = [
        { rule: "ingredient", ruleNumber: 1 },
        { rule: "amount", ruleNumber: 2 },
        { rule: "unit", ruleNumber: 3 },
        { rule: "preparation", ruleNumber: 4 },
      ];

      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({
        patternCode: "1:ingredient_2:amount_3:unit_4:preparation",
        ruleSequence: complexRules,
        exampleLine: "2 cups flour, sifted",
        occurrenceCount: 1,
      });

      await patternTracker.trackPattern(complexRules, "2 cups flour, sifted");

      expect(mockPrisma.uniqueLinePattern.findUnique).toHaveBeenCalledWith({
        where: { patternCode: "1:ingredient_2:amount_3:unit_4:preparation" },
      });
    });

    it("should work without logger", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trackerWithoutLogger = new PatternTracker(mockPrisma as any);
      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({
        patternCode: "1:ingredient_2:amount",
        ruleSequence: testRules,
        exampleLine: "2 cups flour",
        occurrenceCount: 1,
      });

      await trackerWithoutLogger.trackPattern(testRules, "2 cups flour");

      expect(mockPrisma.uniqueLinePattern.create).toHaveBeenCalled();
    });
  });

  describe("getPatterns", () => {
    it("should return patterns ordered by occurrence count", async () => {
      const mockPatterns = [
        {
          patternCode: "1:ingredient_2:amount",
          ruleSequence: [
            { rule: "ingredient", ruleNumber: 1 },
            { rule: "amount", ruleNumber: 2 },
          ],
          exampleLine: "2 cups flour",
          occurrenceCount: 10,
        },
        {
          patternCode: "1:ingredient",
          ruleSequence: [{ rule: "ingredient", ruleNumber: 1 }],
          exampleLine: "flour",
          occurrenceCount: 5,
        },
      ];

      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

      const result = await patternTracker.getPatterns();

      expect(mockPrisma.uniqueLinePattern.findMany).toHaveBeenCalledWith({
        orderBy: { occurrenceCount: "desc" },
      });

      expect(result).toEqual([
        {
          patternCode: "1:ingredient_2:amount",
          ruleSequence: [
            { rule: "ingredient", ruleNumber: 1 },
            { rule: "amount", ruleNumber: 2 },
          ],
          exampleLine: "2 cups flour",
        },
        {
          patternCode: "1:ingredient",
          ruleSequence: [{ rule: "ingredient", ruleNumber: 1 }],
          exampleLine: "flour",
        },
      ]);
    });

    it("should handle patterns without example lines", async () => {
      const mockPatterns = [
        {
          patternCode: "1:ingredient_2:amount",
          ruleSequence: [
            { rule: "ingredient", ruleNumber: 1 },
            { rule: "amount", ruleNumber: 2 },
          ],
          exampleLine: null,
          occurrenceCount: 10,
        },
      ];

      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

      const result = await patternTracker.getPatterns();

      expect(result).toEqual([
        {
          patternCode: "1:ingredient_2:amount",
          ruleSequence: [
            { rule: "ingredient", ruleNumber: 1 },
            { rule: "amount", ruleNumber: 2 },
          ],
          exampleLine: undefined,
        },
      ]);
    });

    it("should handle empty patterns result", async () => {
      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue([]);

      const result = await patternTracker.getPatterns();

      expect(result).toEqual([]);
    });

    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.uniqueLinePattern.findMany.mockRejectedValue(dbError);

      await expect(patternTracker.getPatterns()).rejects.toThrow(
        "Database connection failed"
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Error getting patterns: Error: Database connection failed",
        LogLevel.ERROR
      );
    });

    it("should work without logger", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trackerWithoutLogger = new PatternTracker(mockPrisma as any);
      const mockPatterns = [
        {
          patternCode: "1:ingredient",
          ruleSequence: [{ rule: "ingredient", ruleNumber: 1 }],
          exampleLine: "flour",
          occurrenceCount: 5,
        },
      ];

      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

      const result = await trackerWithoutLogger.getPatterns();

      expect(result).toEqual([
        {
          patternCode: "1:ingredient",
          ruleSequence: [{ rule: "ingredient", ruleNumber: 1 }],
          exampleLine: "flour",
        },
      ]);
    });
  });

  describe("pattern code generation", () => {
    it("should generate correct pattern codes", async () => {
      const rules: PatternRule[] = [
        { rule: "ingredient", ruleNumber: 1 },
        { rule: "amount", ruleNumber: 2 },
        { rule: "unit", ruleNumber: 3 },
      ];

      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({
        patternCode: "1:ingredient_2:amount_3:unit",
        ruleSequence: rules,
        exampleLine: "test",
        occurrenceCount: 1,
      });

      await patternTracker.trackPattern(rules, "test");

      expect(mockPrisma.uniqueLinePattern.findUnique).toHaveBeenCalledWith({
        where: { patternCode: "1:ingredient_2:amount_3:unit" },
      });
    });

    it("should handle single rule patterns", async () => {
      const rules: PatternRule[] = [{ rule: "ingredient", ruleNumber: 1 }];

      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({
        patternCode: "1:ingredient",
        ruleSequence: rules,
        exampleLine: "test",
        occurrenceCount: 1,
      });

      await patternTracker.trackPattern(rules, "test");

      expect(mockPrisma.uniqueLinePattern.findUnique).toHaveBeenCalledWith({
        where: { patternCode: "1:ingredient" },
      });
    });
  });
});
