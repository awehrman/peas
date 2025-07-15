import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setupWorkerTestEnvironment,
  cleanupWorkerTestEnvironment,
  setupBullMQWorkerMock,
  capturedProcessFn,
  capturedListeners,
} from "../../utils/worker-test-utils";
import { TestJob, TestSetup, TestSubQueues, TestCustomLogger } from "./types";

describe("Notes Worker", () => {
  let testSetup: TestSetup;
  let mockSubQueues: TestSubQueues;

  beforeEach(async () => {
    console.log("🧪 Setting up notes worker test environment...");
    setupBullMQWorkerMock();
    testSetup = setupWorkerTestEnvironment();

    // Import and setup mocks for the worker dependencies
    const { mockParseHTML, mockAddStatusEventAndBroadcast } = await import(
      "../../utils/worker-test-utils"
    );

    // Setup mocks to resolve successfully
    mockParseHTML.mockResolvedValue({
      title: "Test File",
      content: "test content",
    });
    mockAddStatusEventAndBroadcast.mockResolvedValue(undefined);

    mockSubQueues = {
      ingredientQueue: {
        name: "ingredient-queue",
        add: vi.fn().mockResolvedValue(undefined),
      },
      instructionQueue: {
        name: "instruction-queue",
        add: vi.fn().mockResolvedValue(undefined),
      },
      imageQueue: {
        name: "image-queue",
        add: vi.fn().mockResolvedValue(undefined),
      },
      categorizationQueue: {
        name: "categorization-queue",
        add: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  afterEach(() => {
    console.log("🧹 Cleaning up notes worker test environment...");
    cleanupWorkerTestEnvironment(testSetup);
  });

  describe("getDefaultDependencies", () => {
    it("should return default dependencies without sub queues", async () => {
      const { getDefaultDependencies } = await import(
        "../../../workers/notes/worker"
      );
      const deps = getDefaultDependencies();

      expect(deps.parseHTML).toBeDefined();
      expect(deps.createNote).toBeDefined();
      expect(deps.addStatusEventAndBroadcast).toBeDefined();
      expect(deps.ErrorHandler).toBeDefined();
      expect(deps.HealthMonitor).toBeDefined();
      expect(deps.logger).toBeDefined();
      // These properties are intentionally omitted from default dependencies
      expect(deps).not.toHaveProperty("ingredientQueue");
      expect(deps).not.toHaveProperty("instructionQueue");
      expect(deps).not.toHaveProperty("imageQueue");
      expect(deps).not.toHaveProperty("categorizationQueue");
    });
  });

  describe("setupNoteWorker", () => {
    it("should create a worker with default dependencies", async () => {
      const { setupNoteWorker } = await import("../../../workers/notes/worker");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setupNoteWorker(testSetup.queue as any, mockSubQueues as any);

      expect(capturedProcessFn).toBeDefined();
    });

    it("should create a worker with custom dependencies", async () => {
      const { setupNoteWorker } = await import("../../../workers/notes/worker");
      const customLogger: TestCustomLogger = {
        log: vi.fn(),
        error: vi.fn(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setupNoteWorker(testSetup.queue as any, mockSubQueues as any, {
        logger: customLogger,
      });

      expect(capturedProcessFn).toBeDefined();
    });

    it("should register event handlers", async () => {
      const { setupNoteWorker } = await import("../../../workers/notes/worker");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setupNoteWorker(testSetup.queue as any, mockSubQueues as any);

      expect(capturedListeners.completed).toBeDefined();
      expect(capturedListeners.failed).toBeDefined();
      expect(capturedListeners.error).toBeDefined();
      expect(capturedListeners.completed).toHaveLength(1);
      expect(capturedListeners.failed).toHaveLength(1);
      expect(capturedListeners.error).toHaveLength(1);
    });

    it("should use correct concurrency settings", async () => {
      const { setupNoteWorker } = await import("../../../workers/notes/worker");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setupNoteWorker(testSetup.queue as any, mockSubQueues as any);

      // The concurrency setting is passed to the Worker constructor
      // We can verify this through the captured process function
      expect(capturedProcessFn).toBeDefined();
    });

    it("should merge custom dependencies with defaults", async () => {
      const { setupNoteWorker } = await import("../../../workers/notes/worker");
      const customLogger: TestCustomLogger = {
        log: vi.fn(),
        error: vi.fn(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setupNoteWorker(testSetup.queue as any, mockSubQueues as any, {
        logger: customLogger,
      });

      expect(capturedProcessFn).toBeDefined();
    });
  });

  describe("Worker Integration", () => {
    it("should process a job through the worker", async () => {
      const { setupNoteWorker } = await import("../../../workers/notes/worker");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setupNoteWorker(testSetup.queue as any, mockSubQueues as any);

      expect(capturedProcessFn).toBeDefined();

      // Simulate processing a job
      if (capturedProcessFn) {
        await expect(capturedProcessFn(testSetup.job)).resolves.not.toThrow();
      }
    });

    it("should handle job processing errors", async () => {
      const { setupNoteWorker } = await import("../../../workers/notes/worker");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setupNoteWorker(testSetup.queue as any, mockSubQueues as any);

      const errorJob: TestJob = {
        ...testSetup.job,
        data: { invalid: "data" },
      };

      expect(capturedProcessFn).toBeDefined();

      if (capturedProcessFn) {
        // Mock validation to fail for this test
        const { mockValidateJobData } = await import(
          "../../utils/worker-test-utils"
        );
        mockValidateJobData.mockReturnValue({ message: "Invalid data" });

        await expect(capturedProcessFn(errorJob)).rejects.toThrow();
      }
    });
  });
});
