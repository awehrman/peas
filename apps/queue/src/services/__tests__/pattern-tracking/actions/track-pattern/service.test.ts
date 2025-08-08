import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { PatternTrackingJobData } from "../../../../../workers/pattern-tracking/dependencies";
import { trackPattern } from "../../../../pattern-tracking/actions/track-pattern/service";

// Mock the database module
vi.mock("@peas/database", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

describe("Track Pattern Service", () => {
  let mockLogger: StructuredLogger;
  let mockPrisma: ReturnType<typeof vi.mocked<typeof import("@peas/database").prisma>>;
  let mockTransaction: {
    uniqueLinePattern: { upsert: ReturnType<typeof vi.fn> };
    parsedIngredientLine: { update: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    // Setup mock transaction
    mockTransaction = {
      uniqueLinePattern: {
        upsert: vi.fn(),
      },
      parsedIngredientLine: {
        update: vi.fn(),
      },
    };

    // Get the mocked prisma
    const { prisma } = await import("@peas/database");
    mockPrisma = vi.mocked(prisma);
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return callback(mockTransaction as unknown as Parameters<typeof callback>[0]);
    });
  });

  describe("trackPattern", () => {
    it("should track pattern successfully with all data", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [
          { ruleId: "rule-1", ruleNumber: 1 },
          { ruleId: "rule-2", ruleNumber: 2 },
        ],
        exampleLine: "1 cup flour",
        noteId: "test-note-id",
        importId: "test-import-id",
        metadata: {
          ingredientLineId: "ingredient-line-123",
        },
      };

      const mockPattern = {
        id: "pattern-123",
        ruleIds: ["rule-1", "rule-2"],
        exampleLine: "1 cup flour",
        occurrenceCount: 1,
      };

      mockTransaction.uniqueLinePattern.upsert.mockResolvedValue(mockPattern);
      mockTransaction.parsedIngredientLine.update.mockResolvedValue({});

      const result = await trackPattern(mockData, mockLogger);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTransaction.uniqueLinePattern.upsert).toHaveBeenCalledWith({
        where: {
          ruleIds: ["rule-1", "rule-2"],
        },
        update: {
          occurrenceCount: { increment: 1 },
          exampleLine: "1 cup flour",
        },
        create: {
          ruleIds: ["rule-1", "rule-2"],
          exampleLine: "1 cup flour",
          occurrenceCount: 1,
        },
      });

      expect(mockTransaction.parsedIngredientLine.update).toHaveBeenCalledWith({
        where: { id: "ingredient-line-123" },
        data: { uniqueLinePatternId: "pattern-123" },
      });

      expect(result).toEqual({
        ...mockData,
        metadata: {
          ...mockData.metadata,
          patternId: "pattern-123",
          trackedAt: expect.any(String),
          linkedToIngredientLine: true,
        },
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Starting pattern tracking for job test-job-123 with 2 rules"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Successfully tracked pattern pattern-123 for job test-job-123"
      );
    });

    it("should handle empty pattern rules", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [],
      };

      const result = await trackPattern(mockData, mockLogger);

      expect(result).toEqual(mockData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] No pattern rules provided for job test-job-123"
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("should handle undefined pattern rules", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules:
          undefined as unknown as PatternTrackingJobData["patternRules"],
      };

      const result = await trackPattern(mockData, mockLogger);

      expect(result).toEqual(mockData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] No pattern rules provided for job test-job-123"
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("should handle pattern tracking without ingredient line ID", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
        exampleLine: "1 cup flour",
      };

      const mockPattern = {
        id: "pattern-456",
        ruleIds: ["rule-1"],
        exampleLine: "1 cup flour",
        occurrenceCount: 1,
      };

      mockTransaction.uniqueLinePattern.upsert.mockResolvedValue(mockPattern);

      const result = await trackPattern(mockData, mockLogger);

      expect(
        mockTransaction.parsedIngredientLine.update
      ).not.toHaveBeenCalled();
      expect(result.metadata?.linkedToIngredientLine).toBe(false);
    });

    it("should handle pattern tracking without example line", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
        metadata: {
          ingredientLineId: "ingredient-line-123",
        },
      };

      const mockPattern = {
        id: "pattern-789",
        ruleIds: ["rule-1"],
        exampleLine: null,
        occurrenceCount: 1,
      };

      mockTransaction.uniqueLinePattern.upsert.mockResolvedValue(mockPattern);
      mockTransaction.parsedIngredientLine.update.mockResolvedValue({});

      const result = await trackPattern(mockData, mockLogger);

      expect(mockTransaction.uniqueLinePattern.upsert).toHaveBeenCalledWith({
        where: {
          ruleIds: ["rule-1"],
        },
        update: {
          occurrenceCount: { increment: 1 },
        },
        create: {
          ruleIds: ["rule-1"],
          exampleLine: undefined,
          occurrenceCount: 1,
        },
      });

      expect(result.metadata?.patternId).toBe("pattern-789");
    });

    it("should handle ingredient line linking failure gracefully", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
        metadata: {
          ingredientLineId: "ingredient-line-123",
        },
      };

      const mockPattern = {
        id: "pattern-999",
        ruleIds: ["rule-1"],
        occurrenceCount: 1,
      };

      mockTransaction.uniqueLinePattern.upsert.mockResolvedValue(mockPattern);
      mockTransaction.parsedIngredientLine.update.mockRejectedValue(
        new Error("Ingredient line not found")
      );

      const result = await trackPattern(mockData, mockLogger);

      expect(result.metadata?.patternId).toBe("pattern-999");
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Successfully tracked pattern pattern-999 for job test-job-123"
      );
    });

    it("should handle database transaction errors", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
      };

      const dbError = new Error("Database connection failed");
      mockPrisma.$transaction.mockRejectedValue(dbError);

      const result = await trackPattern(mockData, mockLogger);

      expect(result).toEqual({
        ...mockData,
        metadata: {
          ...mockData.metadata,
          error: "Database connection failed",
          errorTimestamp: expect.any(String),
        },
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Failed to track pattern for job test-job-123: Error: Database connection failed"
      );
    });

    it("should handle non-Error exceptions", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
      };

      mockPrisma.$transaction.mockRejectedValue("String error");

      const result = await trackPattern(mockData, mockLogger);

      expect(result).toEqual({
        ...mockData,
        metadata: {
          ...mockData.metadata,
          error: "String error",
          errorTimestamp: expect.any(String),
        },
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Failed to track pattern for job test-job-123: String error"
      );
    });

    it("should handle null exceptions", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
      };

      mockPrisma.$transaction.mockRejectedValue(null);

      const result = await trackPattern(mockData, mockLogger);

      expect(result).toEqual({
        ...mockData,
        metadata: {
          ...mockData.metadata,
          error: "null",
          errorTimestamp: expect.any(String),
        },
      });
    });

    it("should handle undefined exceptions", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
      };

      mockPrisma.$transaction.mockRejectedValue(undefined);

      const result = await trackPattern(mockData, mockLogger);

      expect(result).toEqual({
        ...mockData,
        metadata: {
          ...mockData.metadata,
          error: "undefined",
          errorTimestamp: expect.any(String),
        },
      });
    });

    it("should handle existing pattern with increment", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "test-job-123",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
        exampleLine: "1 cup flour",
      };

      const mockPattern = {
        id: "pattern-existing",
        ruleIds: ["rule-1"],
        exampleLine: "1 cup flour",
        occurrenceCount: 5, // Existing pattern with count
      };

      mockTransaction.uniqueLinePattern.upsert.mockResolvedValue(mockPattern);

      const result = await trackPattern(mockData, mockLogger);

      expect(mockTransaction.uniqueLinePattern.upsert).toHaveBeenCalledWith({
        where: {
          ruleIds: ["rule-1"],
        },
        update: {
          occurrenceCount: { increment: 1 },
          exampleLine: "1 cup flour",
        },
        create: {
          ruleIds: ["rule-1"],
          exampleLine: "1 cup flour",
          occurrenceCount: 1,
        },
      });

      expect(result.metadata?.patternId).toBe("pattern-existing");
    });

    it("should handle data with minimal required fields", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "minimal-job",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
      };

      const mockPattern = {
        id: "pattern-minimal",
        ruleIds: ["rule-1"],
        occurrenceCount: 1,
      };

      mockTransaction.uniqueLinePattern.upsert.mockResolvedValue(mockPattern);

      const result = await trackPattern(mockData, mockLogger);

      expect(result).toEqual({
        ...mockData,
        metadata: {
          ...mockData.metadata,
          patternId: "pattern-minimal",
          trackedAt: expect.any(String),
          linkedToIngredientLine: false,
        },
      });
    });

    it("should handle data with complex metadata", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "complex-job",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
        metadata: {
          ingredientLineId: "ingredient-line-123",
          customField: "custom-value",
          nestedObject: { key: "value" },
          arrayField: [1, 2, 3],
        },
      };

      const mockPattern = {
        id: "pattern-complex",
        ruleIds: ["rule-1"],
        occurrenceCount: 1,
      };

      mockTransaction.uniqueLinePattern.upsert.mockResolvedValue(mockPattern);
      mockTransaction.parsedIngredientLine.update.mockResolvedValue({});

      const result = await trackPattern(mockData, mockLogger);

      expect(result.metadata).toEqual({
        ingredientLineId: "ingredient-line-123",
        customField: "custom-value",
        nestedObject: { key: "value" },
        arrayField: [1, 2, 3],
        patternId: "pattern-complex",
        trackedAt: expect.any(String),
        linkedToIngredientLine: true,
      });
    });
  });

  describe("trackPatternInDatabase (internal function)", () => {
    it("should handle unique constraint violations with retries", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "retry-job",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
      };

      const uniqueConstraintError = {
        name: "PrismaClientKnownRequestError",
        code: "P2002",
        message: "Unique constraint violation",
      };

      // First call fails with unique constraint, second succeeds
      mockPrisma.$transaction
        .mockRejectedValueOnce(uniqueConstraintError)
        .mockImplementationOnce(async (callback) => {
          return callback(mockTransaction as unknown as Parameters<typeof callback>[0]);
        });

      const mockPattern = {
        id: "pattern-retry",
        ruleIds: ["rule-1"],
        occurrenceCount: 1,
      };

      mockTransaction.uniqueLinePattern.upsert.mockResolvedValue(mockPattern);

      const result = await trackPattern(mockData, mockLogger);

      expect(result.metadata?.patternId).toBe("pattern-retry");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it("should handle transaction abort errors with retries", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "abort-job",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
      };

      const transactionAbortError = {
        message: "current transaction is aborted",
      };

      // First call fails with transaction abort, second succeeds
      mockPrisma.$transaction
        .mockRejectedValueOnce(transactionAbortError)
        .mockImplementationOnce(async (callback) => {
          return callback(mockTransaction as unknown as Parameters<typeof callback>[0]);
        });

      const mockPattern = {
        id: "pattern-abort",
        ruleIds: ["rule-1"],
        occurrenceCount: 1,
      };

      mockTransaction.uniqueLinePattern.upsert.mockResolvedValue(mockPattern);

      const result = await trackPattern(mockData, mockLogger);

      expect(result.metadata?.patternId).toBe("pattern-abort");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
      const mockData: PatternTrackingJobData = {
        jobId: "max-retries-job",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
      };

      const persistentError = new Error("Persistent database error");

      // All attempts fail
      mockPrisma.$transaction.mockRejectedValue(persistentError);

      const result = await trackPattern(mockData, mockLogger);

      expect(result).toEqual({
        ...mockData,
        metadata: {
          ...mockData.metadata,
          error: "Persistent database error",
          errorTimestamp: expect.any(String),
        },
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN] Failed to track pattern for job max-retries-job: Error: Persistent database error"
      );
    });
  });
});
