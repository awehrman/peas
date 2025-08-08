import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import { ActionFactory } from "../../core/action-factory";
import type { ActionContext } from "../../core/types";
import {
  type PatternTrackingJobData,
  type PatternTrackingWorkerDependencies,
} from "../../pattern-tracking/dependencies";
import { createPatternTrackingPipeline as createPipeline } from "../../pattern-tracking/pipeline";
import type { WorkerAction } from "../../types";

describe("PatternTrackingPipeline", () => {
  let mockActionFactory: ActionFactory<
    PatternTrackingJobData,
    PatternTrackingWorkerDependencies,
    PatternTrackingJobData
  >;
  let mockDependencies: PatternTrackingWorkerDependencies;
  let mockJobData: PatternTrackingJobData;
  let mockContext: ActionContext;

  beforeEach(() => {
    mockActionFactory = {
      create: vi.fn(),
      register: vi.fn(),
    } as unknown as ActionFactory<
      PatternTrackingJobData,
      PatternTrackingWorkerDependencies,
      PatternTrackingJobData
    >;

    mockDependencies = {
      logger: {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
    } as unknown as PatternTrackingWorkerDependencies;

    mockJobData = {
      jobId: "test-job-id",
      patternRules: [
        { ruleId: "rule1", ruleNumber: 1 },
        { ruleId: "rule2", ruleNumber: 2 },
      ],
      exampleLine: "test example line",
      noteId: "note-id",
      importId: "import-id",
      metadata: { key: "value" },
    };

    mockContext = {
      jobId: "test-job-id",
      attemptNumber: 1,
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
    };
  });

  describe("createPatternTrackingPipeline", () => {
    it("should create a pipeline with track pattern action", () => {
      // Arrange
      const mockAction = {
        name: ActionName.TRACK_PATTERN,
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      } as WorkerAction<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      vi.mocked(mockActionFactory.create).mockReturnValue(mockAction);

      // Act
      const pipeline = createPipeline(
        mockActionFactory,
        mockDependencies,
        mockJobData,
        mockContext
      );

      // Assert
      expect(pipeline).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.TRACK_PATTERN,
        mockDependencies
      );
      expect(mockActionFactory.create).toHaveBeenCalledTimes(1);
    });

    it("should return array of worker actions", () => {
      // Arrange
      const mockAction = {
        name: ActionName.TRACK_PATTERN,
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      } as WorkerAction<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      vi.mocked(mockActionFactory.create).mockReturnValue(mockAction);

      // Act
      const pipeline = createPipeline(
        mockActionFactory,
        mockDependencies,
        mockJobData,
        mockContext
      );

      // Assert
      expect(Array.isArray(pipeline)).toBe(true);
      expect(pipeline[0]).toBe(mockAction);
      expect(pipeline[0]?.name).toBe(ActionName.TRACK_PATTERN);
    });

    it("should work with minimal job data", () => {
      // Arrange
      const minimalJobData: PatternTrackingJobData = {
        jobId: "minimal-job-id",
        patternRules: [{ ruleId: "rule1", ruleNumber: 1 }],
      };

      const mockAction = {
        name: ActionName.TRACK_PATTERN,
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      } as WorkerAction<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      vi.mocked(mockActionFactory.create).mockReturnValue(mockAction);

      // Act
      const pipeline = createPipeline(
        mockActionFactory,
        mockDependencies,
        minimalJobData,
        mockContext
      );

      // Assert
      expect(pipeline).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.TRACK_PATTERN,
        mockDependencies
      );
    });

    it("should work with empty pattern rules", () => {
      // Arrange
      const emptyRulesJobData: PatternTrackingJobData = {
        jobId: "empty-rules-job-id",
        patternRules: [],
      };

      const mockAction = {
        name: ActionName.TRACK_PATTERN,
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      } as WorkerAction<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      vi.mocked(mockActionFactory.create).mockReturnValue(mockAction);

      // Act
      const pipeline = createPipeline(
        mockActionFactory,
        mockDependencies,
        emptyRulesJobData,
        mockContext
      );

      // Assert
      expect(pipeline).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.TRACK_PATTERN,
        mockDependencies
      );
    });

    it("should handle different contexts", () => {
      // Arrange
      const differentContext: ActionContext = {
        jobId: "different-job-id",
        attemptNumber: 3,
        retryCount: 2,
        queueName: "different-queue",
        operation: "different-operation",
        startTime: Date.now(),
        workerName: "different-worker",
      };

      const mockAction = {
        name: ActionName.TRACK_PATTERN,
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      } as WorkerAction<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      vi.mocked(mockActionFactory.create).mockReturnValue(mockAction);

      // Act
      const pipeline = createPipeline(
        mockActionFactory,
        mockDependencies,
        mockJobData,
        differentContext
      );

      // Assert
      expect(pipeline).toHaveLength(1);
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.TRACK_PATTERN,
        mockDependencies
      );
    });

    it("should pass dependencies correctly to action factory", () => {
      // Arrange
      const specificDependencies: PatternTrackingWorkerDependencies = {
        logger: {
          log: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
        },
      } as unknown as PatternTrackingWorkerDependencies;

      const mockAction = {
        name: ActionName.TRACK_PATTERN,
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      } as WorkerAction<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      vi.mocked(mockActionFactory.create).mockReturnValue(mockAction);

      // Act
      createPipeline(
        mockActionFactory,
        specificDependencies,
        mockJobData,
        mockContext
      );

      // Assert
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.TRACK_PATTERN,
        specificDependencies
      );
    });

    it("should create pipeline without modifying input parameters", () => {
      // Arrange
      const originalJobData = { ...mockJobData };
      const originalContext = { ...mockContext };
      const originalDependencies = { ...mockDependencies };

      const mockAction = {
        name: ActionName.TRACK_PATTERN,
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      } as WorkerAction<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      vi.mocked(mockActionFactory.create).mockReturnValue(mockAction);

      // Act
      createPipeline(
        mockActionFactory,
        mockDependencies,
        mockJobData,
        mockContext
      );

      // Assert
      expect(mockJobData).toEqual(originalJobData);
      expect(mockContext).toEqual(originalContext);
      expect(mockDependencies).toEqual(originalDependencies);
    });
  });

  describe("pipeline structure", () => {
    it("should always return exactly one action", () => {
      // Arrange
      const mockAction = {
        name: ActionName.TRACK_PATTERN,
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      } as WorkerAction<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      vi.mocked(mockActionFactory.create).mockReturnValue(mockAction);

      // Act & Assert - Test with various job data configurations
      const configurations = [
        { jobId: "1", patternRules: [] },
        { jobId: "2", patternRules: [{ ruleId: "r1", ruleNumber: 1 }] },
        {
          jobId: "3",
          patternRules: [
            { ruleId: "r1", ruleNumber: 1 },
            { ruleId: "r2", ruleNumber: 2 },
          ],
          exampleLine: "example",
          noteId: "note",
          metadata: { test: true },
        },
      ];

      configurations.forEach((config) => {
        const pipeline = createPipeline(
          mockActionFactory,
          mockDependencies,
          config as PatternTrackingJobData,
          mockContext
        );
        expect(pipeline).toHaveLength(1);
      });
    });

    it("should create actions using correct action name", () => {
      // Arrange
      const mockAction = {
        name: ActionName.TRACK_PATTERN,
        execute: vi.fn(),
        executeWithTiming: vi.fn(),
      } as WorkerAction<
        PatternTrackingJobData,
        PatternTrackingWorkerDependencies,
        PatternTrackingJobData
      >;

      vi.mocked(mockActionFactory.create).mockReturnValue(mockAction);

      // Act
      createPipeline(
        mockActionFactory,
        mockDependencies,
        mockJobData,
        mockContext
      );

      // Assert
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.TRACK_PATTERN,
        expect.any(Object)
      );
    });
  });
});
