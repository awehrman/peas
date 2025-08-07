import type { PrismaClient } from "@peas/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../types";
import { type PatternRule, PatternTracker } from "../../shared/pattern-tracker";

describe("PatternTracker", () => {
  let mockPrisma: {
    uniqueLinePattern: {
      upsert: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    parsedIngredientLine: {
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    log: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      uniqueLinePattern: {
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
      parsedIngredientLine: {
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    mockLogger = {
      log: vi.fn(),
    };
  });

  describe("constructor", () => {
    it("should create instance with prisma client", () => {
      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      expect(patternTracker).toBeInstanceOf(PatternTracker);
    });

    it("should create instance without logger", () => {
      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient
      );
      expect(patternTracker).toBeInstanceOf(PatternTracker);
    });
  });

  describe("trackPattern", () => {
    it("should create new pattern when pattern does not exist", async () => {
      // Mock the transaction to simulate the new pattern creation flow
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const tx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockResolvedValue({
                id: "pattern-123",
                ruleIds: ["rule1", "rule2"],
                exampleLine: "test ingredient",
                occurrenceCount: 1,
              }),
            },
            parsedIngredientLine: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(tx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        "test ingredient",
        "ingredient-line-123"
      );

      expect(result).toBe("pattern-123");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should update existing pattern when pattern exists", async () => {
      // Mock the transaction to simulate the existing pattern update flow
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const tx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockResolvedValue({
                id: "pattern-123",
                ruleIds: ["rule1", "rule2"],
                exampleLine: "test ingredient",
                occurrenceCount: 2,
              }),
            },
            parsedIngredientLine: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(tx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        "test ingredient",
        "ingredient-line-123"
      );

      expect(result).toBe("pattern-123");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should not update example line if it is the same", async () => {
      // Mock the transaction to simulate the existing pattern update flow
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const tx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockResolvedValue({
                id: "pattern-123",
                ruleIds: ["rule1", "rule2"],
                exampleLine: "existing ingredient",
                occurrenceCount: 2,
              }),
            },
            parsedIngredientLine: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(tx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        "existing ingredient",
        "ingredient-line-123"
      );

      expect(result).toBe("pattern-123");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should handle pattern tracking without example line", async () => {
      // Mock the transaction to simulate the new pattern creation flow without example line
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const tx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockResolvedValue({
                id: "pattern-123",
                ruleIds: ["rule1", "rule2"],
                exampleLine: null,
                occurrenceCount: 1,
              }),
            },
            parsedIngredientLine: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(tx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        undefined,
        "ingredient-line-123"
      );

      expect(result).toBe("pattern-123");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      // Mock the transaction to simulate database error

      // Mock the transaction to simulate the complex pattern creation flow
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const tx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockRejectedValue(new Error("Database error")),
            },
            parsedIngredientLine: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(tx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
        { ruleId: "rule3", ruleNumber: 3 },
        { ruleId: "rule4", ruleNumber: 4 },
        { ruleId: "rule5", ruleNumber: 5 },
      ];

      await expect(
        patternTracker.trackPattern(
          rules,
          "complex ingredient",
          "ingredient-line-123"
        )
      ).rejects.toThrow("Database error");
    });

    it("should handle complex rule sequences", async () => {
      // Mock the transaction to simulate the new pattern creation flow
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const tx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockResolvedValue({
                id: "pattern-456",
                ruleIds: ["rule1", "rule2", "rule3", "rule4", "rule5"],
                exampleLine: "complex ingredient",
                occurrenceCount: 1,
              }),
            },
            parsedIngredientLine: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(tx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
        { ruleId: "rule3", ruleNumber: 3 },
        { ruleId: "rule4", ruleNumber: 4 },
        { ruleId: "rule5", ruleNumber: 5 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        "complex ingredient",
        "ingredient-line-123"
      );

      expect(result).toBe("pattern-456");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should work without logger", async () => {
      // Mock the transaction to simulate the new pattern creation flow
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const tx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockResolvedValue({
                id: "pattern-789",
                ruleIds: ["rule1"],
                exampleLine: "simple ingredient",
                occurrenceCount: 1,
              }),
            },
            parsedIngredientLine: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(tx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient
      );
      const rules: PatternRule[] = [{ ruleId: "rule1", ruleNumber: 1 }];
      const result = await patternTracker.trackPattern(
        rules,
        "simple ingredient",
        "ingredient-line-123"
      );

      expect(result).toBe("pattern-789");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("trackPattern with ingredient line linking", () => {
    it("should link pattern to ingredient line within transaction", async () => {
      // Mock the transaction to simulate successful pattern creation and linking
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const mockTx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockResolvedValue({
                id: "pattern-123",
                ruleIds: ["rule1", "rule2"],
                exampleLine: "test ingredient",
                occurrenceCount: 1,
              }),
            },
            parsedIngredientLine: {
              update: vi.fn().mockResolvedValue({
                id: "ingredient-line-123",
                uniqueLinePatternId: "pattern-123",
              }),
            },
          };
          return callback(mockTx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        "test ingredient",
        "ingredient-line-123"
      );

      expect(result).toBe("pattern-123");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should handle linking errors gracefully without failing transaction", async () => {
      // Mock the transaction to simulate pattern creation success but linking failure
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const mockTx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockResolvedValue({
                id: "pattern-123",
                ruleIds: ["rule1", "rule2"],
                exampleLine: "test ingredient",
                occurrenceCount: 1,
              }),
            },
            parsedIngredientLine: {
              update: vi.fn().mockRejectedValue(new Error("Linking failed")),
            },
          };
          return callback(mockTx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        "test ingredient",
        "ingredient-line-123"
      );

      // Should still succeed even if linking fails
      expect(result).toBe("pattern-123");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should not attempt linking when no ingredient line ID provided", async () => {
      // Mock the transaction to simulate pattern creation without linking
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
          const mockTx = {
            uniqueLinePattern: {
              upsert: vi.fn().mockResolvedValue({
                id: "pattern-123",
                ruleIds: ["rule1", "rule2"],
                exampleLine: "test ingredient",
                occurrenceCount: 1,
              }),
            },
            parsedIngredientLine: {
              update: vi.fn(),
            },
          };
          return callback(mockTx as unknown as typeof mockPrisma);
        }
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        "test ingredient"
      );

      expect(result).toBe("pattern-123");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should handle unique constraint violations with retry", async () => {
      // Mock the transaction to simulate unique constraint violation on first attempt, success on retry
      mockPrisma.$transaction
        .mockImplementationOnce(
          async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
            const mockTx = {
              uniqueLinePattern: {
                upsert: vi.fn().mockRejectedValue({
                  name: "PrismaClientKnownRequestError",
                  code: "P2002",
                  message:
                    "Unique constraint failed on the fields: (`ruleIds`)",
                }),
              },
              parsedIngredientLine: {
                update: vi.fn(),
              },
            };
            return callback(mockTx as unknown as typeof mockPrisma);
          }
        )
        .mockImplementationOnce(
          async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
            const mockTx = {
              uniqueLinePattern: {
                upsert: vi.fn().mockResolvedValue({
                  id: "pattern-123",
                  ruleIds: ["rule1", "rule2"],
                  exampleLine: "test ingredient",
                  occurrenceCount: 2,
                }),
              },
              parsedIngredientLine: {
                update: vi.fn().mockResolvedValue({}),
              },
            };
            return callback(mockTx as unknown as typeof mockPrisma);
          }
        );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        "test ingredient",
        "ingredient-line-123"
      );

      expect(result).toBe("pattern-123");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it("should handle transaction abort errors with retry", async () => {
      // Mock the transaction to simulate transaction abort on first attempt, success on retry
      mockPrisma.$transaction
        .mockImplementationOnce(
          async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
            const mockTx = {
              uniqueLinePattern: {
                upsert: vi.fn().mockRejectedValue({
                  message:
                    "current transaction is aborted, commands ignored until end of transaction block",
                }),
              },
              parsedIngredientLine: {
                update: vi.fn(),
              },
            };
            return callback(mockTx as unknown as typeof mockPrisma);
          }
        )
        .mockImplementationOnce(
          async (callback: (tx: typeof mockPrisma) => Promise<string>) => {
            const mockTx = {
              uniqueLinePattern: {
                upsert: vi.fn().mockResolvedValue({
                  id: "pattern-123",
                  ruleIds: ["rule1", "rule2"],
                  exampleLine: "test ingredient",
                  occurrenceCount: 1,
                }),
              },
              parsedIngredientLine: {
                update: vi.fn().mockResolvedValue({}),
              },
            };
            return callback(mockTx as unknown as typeof mockPrisma);
          }
        );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const rules: PatternRule[] = [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ];
      const result = await patternTracker.trackPattern(
        rules,
        "test ingredient",
        "ingredient-line-123"
      );

      expect(result).toBe("pattern-123");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });
  });

  describe("getPatterns", () => {
    it("should return patterns ordered by occurrence count", async () => {
      const mockPatterns = [
        {
          id: "pattern1",
          ruleIds: ["rule1"],
          exampleLine: "test1",
          occurrenceCount: 5,
        },
        {
          id: "pattern2",
          ruleIds: ["rule2"],
          exampleLine: "test2",
          occurrenceCount: 3,
        },
        {
          id: "pattern3",
          ruleIds: ["rule3"],
          exampleLine: "test3",
          occurrenceCount: 1,
        },
      ];

      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const result = await patternTracker.getPatterns();

      expect(result).toEqual([
        {
          patternCode: "pattern1",
          ruleSequence: [{ ruleId: "rule1", ruleNumber: 1 }],
          exampleLine: "test1",
        },
        {
          patternCode: "pattern2",
          ruleSequence: [{ ruleId: "rule2", ruleNumber: 1 }],
          exampleLine: "test2",
        },
        {
          patternCode: "pattern3",
          ruleSequence: [{ ruleId: "rule3", ruleNumber: 1 }],
          exampleLine: "test3",
        },
      ]);
      expect(mockPrisma.uniqueLinePattern.findMany).toHaveBeenCalledWith({
        orderBy: { occurrenceCount: "desc" },
      });
    });

    it("should handle patterns without example lines", async () => {
      const mockPatterns = [
        {
          id: "pattern1",
          ruleIds: ["rule1"],
          exampleLine: null,
          occurrenceCount: 5,
        },
        {
          id: "pattern2",
          ruleIds: ["rule2"],
          exampleLine: null,
          occurrenceCount: 3,
        },
      ];

      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const result = await patternTracker.getPatterns();

      expect(result).toEqual([
        {
          patternCode: "pattern1",
          ruleSequence: [{ ruleId: "rule1", ruleNumber: 1 }],
          exampleLine: undefined,
        },
        {
          patternCode: "pattern2",
          ruleSequence: [{ ruleId: "rule2", ruleNumber: 1 }],
          exampleLine: undefined,
        },
      ]);
    });

    it("should handle empty patterns result", async () => {
      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue([]);

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );
      const result = await patternTracker.getPatterns();

      expect(result).toEqual([]);
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.uniqueLinePattern.findMany.mockRejectedValue(
        new Error("Database error")
      );

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient,
        mockLogger as StructuredLogger
      );

      await expect(patternTracker.getPatterns()).rejects.toThrow(
        "Database error"
      );
    });

    it("should work without logger", async () => {
      const mockPatterns = [
        {
          id: "pattern1",
          ruleIds: ["rule1"],
          exampleLine: "test1",
          occurrenceCount: 1,
        },
      ];

      mockPrisma.uniqueLinePattern.findMany.mockResolvedValue(mockPatterns);

      const patternTracker = new PatternTracker(
        mockPrisma as unknown as PrismaClient
      );
      const result = await patternTracker.getPatterns();

      expect(result).toEqual([
        {
          patternCode: "pattern1",
          ruleSequence: [{ ruleId: "rule1", ruleNumber: 1 }],
          exampleLine: "test1",
        },
      ]);
    });
  });
});
