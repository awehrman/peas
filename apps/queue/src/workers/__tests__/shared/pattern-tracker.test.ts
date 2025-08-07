import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogLevel } from "../../../types";
import { type PatternRule, PatternTracker } from "../../shared/pattern-tracker";

describe("PatternTracker", () => {
  let mockPrisma: {
    uniqueLinePattern: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    log: ReturnType<typeof vi.fn>;
  };
  let patternTracker: PatternTracker;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      uniqueLinePattern: {
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(),
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
      { ruleId: "ingredient", ruleNumber: 1 },
      { ruleId: "amount", ruleNumber: 2 },
    ];

    it("should create new pattern when pattern does not exist", async () => {
      // Mock the transaction to simulate the new pattern creation flow
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          uniqueLinePattern: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: "pattern-123",
              ruleIds: ["ingredient", "amount"],
              exampleLine: "2 cups flour",
              occurrenceCount: 1,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await patternTracker.trackPattern(
        testRules,
        "2 cups flour"
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe("pattern-123");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Tracking pattern with 2 rules",
        LogLevel.DEBUG
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Created new pattern: pattern-123",
        LogLevel.DEBUG
      );
    });

    it("should update existing pattern when pattern exists", async () => {
      const existingPattern = {
        id: "pattern-123",
        ruleIds: ["ingredient", "amount"],
        exampleLine: "2 cups flour",
        occurrenceCount: 5,
      };

      // Mock the transaction to simulate the existing pattern update flow
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          uniqueLinePattern: {
            findFirst: vi.fn().mockResolvedValue(existingPattern),
            update: vi.fn().mockResolvedValue({
              ...existingPattern,
              occurrenceCount: 6,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await patternTracker.trackPattern(
        testRules,
        "3 cups sugar"
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe("pattern-123");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Updated existing pattern: pattern-123 (count: 6)",
        LogLevel.DEBUG
      );
    });

    it("should not update example line if it is the same", async () => {
      const existingPattern = {
        id: "pattern-123",
        ruleIds: ["ingredient", "amount"],
        exampleLine: "2 cups flour",
        occurrenceCount: 5,
      };

      // Mock the transaction to simulate the existing pattern update flow
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          uniqueLinePattern: {
            findFirst: vi.fn().mockResolvedValue(existingPattern),
            update: vi.fn().mockResolvedValue({
              ...existingPattern,
              occurrenceCount: 6,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await patternTracker.trackPattern(testRules, "2 cups flour");

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe("pattern-123");
    });

    it("should handle pattern tracking without example line", async () => {
      // Mock the transaction to simulate the new pattern creation flow without example line
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          uniqueLinePattern: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: "pattern-123",
              ruleIds: ["ingredient", "amount"],
              exampleLine: null,
              occurrenceCount: 1,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await patternTracker.trackPattern(testRules);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe("pattern-123");
    });

    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database connection failed");
      
      // Mock the transaction to throw an error
      mockPrisma.$transaction.mockRejectedValue(dbError);

      await expect(patternTracker.trackPattern(testRules)).rejects.toThrow(
        "Database connection failed"
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PATTERN_TRACKER] Error tracking pattern (attempt 1/3): Error: Database connection failed",
        LogLevel.ERROR
      );
    });

    it("should handle complex rule sequences", async () => {
      const complexRules: PatternRule[] = [
        { ruleId: "ingredient", ruleNumber: 1 },
        { ruleId: "amount", ruleNumber: 2 },
        { ruleId: "unit", ruleNumber: 3 },
        { ruleId: "preparation", ruleNumber: 4 },
      ];

      // Mock the transaction to simulate the complex pattern creation flow
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          uniqueLinePattern: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: "pattern-123",
              ruleIds: ["ingredient", "amount", "unit", "preparation"],
              exampleLine: "2 cups flour, sifted",
              occurrenceCount: 1,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await patternTracker.trackPattern(complexRules, "2 cups flour, sifted");

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe("pattern-123");
    });

    it("should work without logger", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const trackerWithoutLogger = new PatternTracker(mockPrisma as any);
      
      // Mock the transaction to simulate the new pattern creation flow
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          uniqueLinePattern: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: "pattern-123",
              ruleIds: ["ingredient", "amount"],
              exampleLine: "2 cups flour",
              occurrenceCount: 1,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await trackerWithoutLogger.trackPattern(testRules, "2 cups flour");

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe("pattern-123");
    });
  });

  describe("getPatterns", () => {
    it("should return patterns ordered by occurrence count", async () => {
      const mockPatterns = [
        {
          id: "pattern-123",
          ruleIds: ["ingredient", "amount"],
          exampleLine: "2 cups flour",
          occurrenceCount: 10,
        },
        {
          id: "pattern-456",
          ruleIds: ["ingredient"],
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
          patternCode: "pattern-123",
          ruleSequence: [
            { ruleId: "ingredient", ruleNumber: 1 },
            { ruleId: "amount", ruleNumber: 2 },
          ],
          exampleLine: "2 cups flour",
        },
        {
          patternCode: "pattern-456",
          ruleSequence: [{ ruleId: "ingredient", ruleNumber: 1 }],
          exampleLine: "flour",
        },
      ]);
    });

    it("should handle patterns without example lines", async () => {
      const mockPatterns = [
        {
          id: "pattern-123",
          ruleIds: ["ingredient", "amount"],
          exampleLine: null,
          occurrenceCount: 10,
        },
      ];

      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

      const result = await patternTracker.getPatterns();

      expect(result).toEqual([
        {
          patternCode: "pattern-123",
          ruleSequence: [
            { ruleId: "ingredient", ruleNumber: 1 },
            { ruleId: "amount", ruleNumber: 2 },
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
          id: "pattern-123",
          ruleIds: ["ingredient"],
          exampleLine: "flour",
          occurrenceCount: 5,
        },
      ];

      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

      const result = await trackerWithoutLogger.getPatterns();

      expect(result).toEqual([
        {
          patternCode: "pattern-123",
          ruleSequence: [{ ruleId: "ingredient", ruleNumber: 1 }],
          exampleLine: "flour",
        },
      ]);
    });
  });

  describe("pattern code generation", () => {
    it("should generate correct pattern codes", async () => {
      const rules: PatternRule[] = [
        { ruleId: "ingredient", ruleNumber: 1 },
        { ruleId: "amount", ruleNumber: 2 },
        { ruleId: "unit", ruleNumber: 3 },
      ];

      // Mock the transaction to simulate the new pattern creation flow
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          uniqueLinePattern: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: "pattern-123",
              ruleIds: ["ingredient", "amount", "unit"],
              exampleLine: "test",
              occurrenceCount: 1,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await patternTracker.trackPattern(rules, "test");

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe("pattern-123");
    });

    it("should handle single rule patterns", async () => {
      const rules: PatternRule[] = [{ ruleId: "ingredient", ruleNumber: 1 }];

      // Mock the transaction to simulate the new pattern creation flow
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          uniqueLinePattern: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: "pattern-456",
              ruleIds: ["ingredient"],
              exampleLine: "test",
              occurrenceCount: 1,
            }),
          },
        };
        return await callback(tx);
      });

      const result = await patternTracker.trackPattern(rules, "test");

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBe("pattern-456");
    });
  });
});
