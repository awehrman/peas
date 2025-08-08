import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import { BaseAction } from "../../../../../workers/core/base-action";
import { ActionContext } from "../../../../../workers/core/types";
import type {
  PatternTrackingJobData,
  PatternTrackingWorkerDependencies,
} from "../../../../../workers/pattern-tracking/dependencies";
import { TrackPatternAction } from "../../../../pattern-tracking/actions/track-pattern/action";

// Mock the trackPattern service
vi.mock("../../../../pattern-tracking/actions/track-pattern/service", () => ({
  trackPattern: vi.fn(),
}));

describe("TrackPatternAction", () => {
  let action: TrackPatternAction;
  let mockDependencies: PatternTrackingWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: PatternTrackingJobData;
  let mockTrackPattern: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    action = new TrackPatternAction();

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
    };

    mockContext = {
      jobId: "test-job-id",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    mockData = {
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

    // Get the mocked trackPattern function
    const { trackPattern } = await import(
      "../../../../pattern-tracking/actions/track-pattern/service"
    );
    mockTrackPattern = vi.mocked(trackPattern);
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.TRACK_PATTERN);
    });
  });

  describe("execute", () => {
    it("should execute trackPattern successfully", async () => {
      const expectedResult = {
        ...mockData,
        metadata: {
          ...mockData.metadata,
          patternId: "pattern-123",
          trackedAt: "2023-01-01T00:00:00.000Z",
        },
      };

      mockTrackPattern.mockResolvedValue(expectedResult);

      const result = await action.execute(mockData, mockDependencies, mockContext);

      expect(mockTrackPattern).toHaveBeenCalledWith(mockData, mockDependencies.logger);
      expect(result).toEqual(expectedResult);

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN_ACTION] Starting execution for job test-job-123"
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN_ACTION] Processing completed for job test-job-123"
      );
    });

    it("should handle errors from trackPattern", async () => {
      const error = new Error("Pattern tracking failed");
      mockTrackPattern.mockRejectedValue(error);

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toThrow("Pattern tracking failed");

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN_ACTION] Starting execution for job test-job-123"
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN_ACTION] Error processing job test-job-123: Error: Pattern tracking failed"
      );
    });

    it("should handle non-Error exceptions from trackPattern", async () => {
      const error = "String error";
      mockTrackPattern.mockRejectedValue(error);

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toBe("String error");

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN_ACTION] Error processing job test-job-123: String error"
      );
    });

    it("should handle null error from trackPattern", async () => {
      mockTrackPattern.mockRejectedValue(null);

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toBeNull();

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN_ACTION] Error processing job test-job-123: null"
      );
    });

    it("should handle undefined error from trackPattern", async () => {
      mockTrackPattern.mockRejectedValue(undefined);

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toBeUndefined();

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[TRACK_PATTERN_ACTION] Error processing job test-job-123: undefined"
      );
    });

    it("should handle data with minimal required fields", async () => {
      const minimalData: PatternTrackingJobData = {
        jobId: "minimal-job",
        patternRules: [{ ruleId: "rule-1", ruleNumber: 1 }],
      };

      const expectedResult = {
        ...minimalData,
        metadata: {
          patternId: "pattern-456",
        },
      };

      mockTrackPattern.mockResolvedValue(expectedResult);

      const result = await action.execute(minimalData, mockDependencies, mockContext);

      expect(mockTrackPattern).toHaveBeenCalledWith(minimalData, mockDependencies.logger);
      expect(result).toEqual(expectedResult);
    });

    it("should handle data with empty pattern rules", async () => {
      const dataWithEmptyRules: PatternTrackingJobData = {
        jobId: "empty-rules-job",
        patternRules: [],
      };

      const expectedResult = {
        ...dataWithEmptyRules,
        metadata: {
          patternId: "pattern-789",
        },
      };

      mockTrackPattern.mockResolvedValue(expectedResult);

      const result = await action.execute(dataWithEmptyRules, mockDependencies, mockContext);

      expect(mockTrackPattern).toHaveBeenCalledWith(dataWithEmptyRules, mockDependencies.logger);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("inheritance", () => {
    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(BaseAction);
    });

    it("should have correct generic types", () => {
      expect(action).toBeInstanceOf(TrackPatternAction);
    });
  });
});
