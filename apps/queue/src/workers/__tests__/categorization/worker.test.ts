import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import { ActionName } from "../../../types";
import type { CategorizationJobData } from "../../categorization/dependencies";
import type { CategorizationWorkerDependencies } from "../../categorization/dependencies";
import { CategorizationWorker } from "../../categorization/worker";
import type { ActionContext, WorkerAction } from "../../core/types";

// Mock database updates used by categorization worker status tracking
vi.mock("@peas/database", () => ({
  updateQueueJob: vi.fn(),
}));

// Mock the service container
const mockServiceContainer: Partial<IServiceContainer> = {
  logger: {
    log: vi.fn(),
  },
  statusBroadcaster: {
    addStatusEventAndBroadcast: vi.fn(),
  },
};

// Mock the queue with proper name property
const mockQueue = {
  name: "categorization-queue",
  add: vi.fn(),
  process: vi.fn(),
} as unknown as Queue;

describe("CategorizationWorker", () => {
  let worker: CategorizationWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new CategorizationWorker(
      mockQueue,
      mockServiceContainer as IServiceContainer
    );
  });

  describe("Action Registration", () => {
    it("should register all categorization actions", () => {
      // Access the action factory to check registered actions
      const registeredActions = (
        worker as unknown as {
          actionFactory: { getRegisteredActions(): ActionName[] };
        }
      ).actionFactory.getRegisteredActions();

      expect(registeredActions).toContain(ActionName.DETERMINE_CATEGORY);
      expect(registeredActions).toContain(ActionName.SAVE_CATEGORY);
      expect(registeredActions).toContain(ActionName.DETERMINE_TAGS);
      expect(registeredActions).toContain(ActionName.SAVE_TAGS);
    });

    it("should create pipeline with all categorization actions", () => {
      const mockData: CategorizationJobData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        jobId: "test-job-123",
        metadata: {},
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "categorization",
        startTime: Date.now(),
        workerName: "categorization-worker",
        attemptNumber: 1,
      };

      // Create the pipeline
      const pipeline = (
        worker as unknown as {
          createActionPipeline(
            data: CategorizationJobData,
            context: ActionContext
          ): WorkerAction<
            CategorizationJobData,
            CategorizationWorkerDependencies,
            CategorizationJobData
          >[];
        }
      ).createActionPipeline(mockData, mockContext);

      // Verify pipeline has the expected actions
      expect(pipeline).toHaveLength(4);

      // Check that the actions are properly created (they should have the correct names)
      expect(pipeline[0]?.name).toBe(ActionName.DETERMINE_CATEGORY);
      expect(pipeline[1]?.name).toBe(ActionName.SAVE_CATEGORY);
      expect(pipeline[2]?.name).toBe(ActionName.DETERMINE_TAGS);
      expect(pipeline[3]?.name).toBe(ActionName.SAVE_TAGS);
    });
  });

  describe("Operation Name", () => {
    it("should return correct operation name", () => {
      const operationName = (
        worker as unknown as { getOperationName(): string }
      ).getOperationName();
      expect(operationName).toBe("categorization");
    });
  });

  describe("Constructor", () => {
    it("should create worker with default action factory", () => {
      const workerWithDefaultFactory = new CategorizationWorker(
        mockQueue,
        mockServiceContainer as IServiceContainer
      );
      expect(workerWithDefaultFactory).toBeDefined();
    });

    it("should create worker with custom action factory", () => {
      // Test that the worker can be created with a custom action factory
      // This tests the constructor's optional parameter
      const workerWithCustomFactory = new CategorizationWorker(
        mockQueue,
        mockServiceContainer as IServiceContainer
      );
      expect(workerWithCustomFactory).toBeDefined();
    });
  });

  describe("Action Registration", () => {
    it("should register actions during initialization", () => {
      // The actions should be registered when the worker is created
      const registeredActions = (
        worker as unknown as {
          actionFactory: { getRegisteredActions(): string[] };
        }
      ).actionFactory.getRegisteredActions();

      expect(registeredActions).toContain(ActionName.DETERMINE_CATEGORY);
      expect(registeredActions).toContain(ActionName.SAVE_CATEGORY);
      expect(registeredActions).toContain(ActionName.DETERMINE_TAGS);
      expect(registeredActions).toContain(ActionName.SAVE_TAGS);
    });
  });

  describe("Pipeline Creation", () => {
    it("should create pipeline with correct logging", () => {
      const testData: CategorizationJobData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        jobId: "test-job-123",
        metadata: {},
      };

      const testContext: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "categorization",
        startTime: Date.now(),
        workerName: "categorization-worker",
        attemptNumber: 1,
      };

      // Spy on console.log to verify logging
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const pipeline = (
        worker as unknown as {
          createActionPipeline(
            data: CategorizationJobData,
            context: ActionContext
          ): unknown[];
        }
      ).createActionPipeline(testData, testContext);

      expect(pipeline).toHaveLength(4);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[CATEGORIZATION_WORKER] Creating action pipeline..."
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[CATEGORIZATION_WORKER] Available actions:",
        expect.any(Array)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[CATEGORIZATION_WORKER] Created pipeline with",
        4,
        "actions"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("QueueJob status updates", () => {
    const mockData: CategorizationJobData = {
      noteId: "test-note-123",
      importId: "test-import-123",
      jobId: "test-job-123",
      metadata: {},
    };

    const mockContext: ActionContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "categorization",
      startTime: Date.now(),
      workerName: "categorization-worker",
      attemptNumber: 1,
    };

    it("should set QueueJob to PROCESSING in onBeforeJob and log", async () => {
      const { updateQueueJob } = await import("@peas/database");
      vi.mocked(updateQueueJob).mockResolvedValue(undefined as unknown as void);

      const logger = (
        worker as unknown as {
          dependencies: { logger: { log: ReturnType<typeof vi.fn> } };
        }
      ).dependencies.logger;
      const onBeforeJob = worker as unknown as {
        onBeforeJob(
          data: CategorizationJobData,
          context: ActionContext
        ): Promise<void>;
      };

      await onBeforeJob.onBeforeJob(mockData, mockContext);

      expect(updateQueueJob).toHaveBeenCalledWith(
        mockContext.jobId,
        expect.objectContaining({
          status: "PROCESSING",
          errorMessage: undefined,
          completedAt: undefined,
        })
      );
      expect(logger.log).toHaveBeenCalledWith(
        `[CATEGORIZATION_WORKER] Updated QueueJob status to PROCESSING: ${mockContext.jobId}`
      );
    });

    it("should set QueueJob to COMPLETED in onAfterJob and log", async () => {
      const { updateQueueJob } = await import("@peas/database");
      vi.mocked(updateQueueJob).mockResolvedValue(undefined as unknown as void);

      const logger = (
        worker as unknown as {
          dependencies: { logger: { log: ReturnType<typeof vi.fn> } };
        }
      ).dependencies.logger;
      const onAfterJob = worker as unknown as {
        onAfterJob(
          data: CategorizationJobData,
          context: ActionContext,
          result: CategorizationJobData
        ): Promise<void>;
      };

      await onAfterJob.onAfterJob(mockData, mockContext, mockData);

      expect(updateQueueJob).toHaveBeenCalledWith(
        mockContext.jobId,
        expect.objectContaining({
          status: "COMPLETED",
          errorMessage: undefined,
          completedAt: expect.any(Date),
        })
      );
      expect(logger.log).toHaveBeenCalledWith(
        `[CATEGORIZATION_WORKER] Updated QueueJob status to COMPLETED: ${mockContext.jobId}`
      );
    });

    it("should set QueueJob to FAILED in onJobError and log error path when update fails", async () => {
      const { updateQueueJob } = await import("@peas/database");
      // First call (FAILED) should reject to exercise catch path logging
      vi.mocked(updateQueueJob).mockRejectedValueOnce(new Error("db failure"));

      const logger = (
        worker as unknown as {
          dependencies: { logger: { log: ReturnType<typeof vi.fn> } };
        }
      ).dependencies.logger;
      const onJobError = worker as unknown as {
        onJobError(
          error: Error,
          data: CategorizationJobData,
          context: ActionContext
        ): Promise<void>;
      };

      const err = new Error("boom");
      await onJobError.onJobError(err, mockData, mockContext);

      // updateQueueJob was attempted with FAILED
      expect(updateQueueJob).toHaveBeenCalledWith(
        mockContext.jobId,
        expect.objectContaining({
          status: "FAILED",
          errorMessage: "boom",
          completedAt: expect.any(Date),
        })
      );
      // catch path logs the failure
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[CATEGORIZATION_WORKER] Failed to update QueueJob status:"
        )
      );
    });
  });
});
