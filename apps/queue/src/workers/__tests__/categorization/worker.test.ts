import { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type { CategorizationJobData } from "../../categorization/dependencies";
import { CategorizationWorker } from "../../categorization/worker";
import type { IServiceContainer } from "../../../services/container";
import type { ActionContext, WorkerAction } from "../../core/types";
import type { CategorizationWorkerDependencies } from "../../categorization/dependencies";

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
    worker = new CategorizationWorker(mockQueue, mockServiceContainer as IServiceContainer);
  });

  describe("Action Registration", () => {
    it("should register all categorization actions", () => {
      // Access the action factory to check registered actions
      const registeredActions = (
        worker as unknown as { actionFactory: { getRegisteredActions(): ActionName[] } }
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
      const pipeline = (worker as unknown as { 
        createActionPipeline(
          data: CategorizationJobData, 
          context: ActionContext
        ): WorkerAction<CategorizationJobData, CategorizationWorkerDependencies, CategorizationJobData>[] 
      }).createActionPipeline(mockData, mockContext);

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
      const operationName = (worker as unknown as { getOperationName(): string }).getOperationName();
      expect(operationName).toBe("categorization");
    });
  });
});
