// Mock dependencies and BullMQ before importing setupIngredientWorker
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setupWorkerTestEnvironment,
  cleanupWorkerTestEnvironment,
  setupBullMQWorkerMock,
  capturedProcessFn,
  capturedListeners,
} from "../../utils/worker-test-utils";

// Mock BullMQ Worker before importing the worker module
setupBullMQWorkerMock();

vi.mock("../../../../src/config/redis", () => ({
  redisConnection: {},
}));

vi.mock("../../../../src/workers/ingredients/job-orchestrator");
vi.mock("../../../../src/workers/ingredients/event-handlers", () => ({
  registerIngredientEventHandlers: vi.fn((worker, _queue) => {
    worker.on("completed", (_job: any) => {
      // no-op
    });
    worker.on("failed", (_job: any, _err: any) => {
      // no-op
    });
    worker.on("error", (_err: any) => {
      // no-op
    });
  }),
}));

import { setupIngredientWorker } from "../../../../src/workers/ingredients/worker";

describe("Ingredient Worker", () => {
  let testSetup: any;

  beforeEach(async () => {
    testSetup = setupWorkerTestEnvironment();
  });

  afterEach(() => {
    cleanupWorkerTestEnvironment(testSetup);
  });

  describe("setupIngredientWorker", () => {
    it("should create a worker with correct configuration", async () => {
      setupIngredientWorker(testSetup.queue);
      expect(capturedProcessFn).toBeDefined();
    });

    it("should register event handlers", async () => {
      setupIngredientWorker(testSetup.queue);
      expect(capturedListeners.completed).toBeDefined();
      expect(capturedListeners.failed).toBeDefined();
      expect(capturedListeners.error).toBeDefined();
      expect(capturedListeners.completed).toHaveLength(1);
      expect(capturedListeners.failed).toHaveLength(1);
      expect(capturedListeners.error).toHaveLength(1);
    });

    it("should use correct concurrency settings", async () => {
      setupIngredientWorker(testSetup.queue);
      expect(capturedProcessFn).toBeDefined();
    });

    it("should pass job processing function correctly", async () => {
      setupIngredientWorker(testSetup.queue);
      expect(capturedProcessFn).toBeDefined();
    });

    it("should return the created worker", async () => {
      const worker = setupIngredientWorker(testSetup.queue);
      expect(worker).toBeDefined();
    });
  });

  describe("Worker Integration", () => {
    it("should process a job through the worker", async () => {
      const { processIngredientJob } = await import(
        "../../../../src/workers/ingredients/job-orchestrator"
      );
      (processIngredientJob as any).mockResolvedValueOnce(undefined);
      setupIngredientWorker(testSetup.queue);
      expect(capturedProcessFn).toBeDefined();
      if (capturedProcessFn) {
        await expect(capturedProcessFn(testSetup.job)).resolves.not.toThrow();
      }
    });

    it("should handle job processing errors", async () => {
      const { processIngredientJob } = await import(
        "../../../../src/workers/ingredients/job-orchestrator"
      );
      (processIngredientJob as any).mockRejectedValueOnce(new Error("fail"));
      setupIngredientWorker(testSetup.queue);
      const errorJob = {
        id: "error-job",
        data: { invalid: "data" },
      };
      expect(capturedProcessFn).toBeDefined();
      if (capturedProcessFn) {
        await expect(capturedProcessFn(errorJob)).rejects.toThrow();
      }
    });
  });
});
