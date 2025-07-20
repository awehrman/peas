import { describe, it, expect, vi, beforeEach } from "vitest";
import { Queue } from "bullmq";
import { BaseWorker } from "../../base-worker";
import { BaseAction } from "../../base-action";
import { ActionFactory } from "../../action-factory";
import type {
  BaseWorkerDependencies,
  BaseJobData,
  ActionContext,
} from "../../../types";
import type { IServiceContainer } from "../../../../services/container";

// Mock dependencies
const mockQueue = {
  name: "test-queue",
} as Queue;

const mockDependencies: BaseWorkerDependencies = {
  logger: {
    log: vi.fn(),
  },
  addStatusEventAndBroadcast: vi.fn(),
  ErrorHandler: {
    withErrorHandling: vi.fn(async (operation) => {
      return await operation();
    }),
  },
};

const mockContainer = {
  logger: mockDependencies.logger,
  statusBroadcaster: {
    addStatusEventAndBroadcast: vi.fn(),
  },
  errorHandler: {
    errorHandler: mockDependencies.ErrorHandler,
  },
} as unknown as IServiceContainer;

// Test action implementation
class TestAction extends BaseAction<string, BaseWorkerDependencies> {
  name = "test_action";

  async execute(
    data: string,
    _deps: BaseWorkerDependencies,
    _context: ActionContext
  ): Promise<string> {
    return `processed: ${data}`;
  }
}

// Test implementation of BaseWorker
class TestWorker extends BaseWorker<BaseJobData, BaseWorkerDependencies> {
  protected registerActions(): void {
    // No actions to register for this test
  }

  protected getOperationName(): string {
    return "test-worker";
  }
}

describe("BaseWorker Action Wrapping", () => {
  let worker: TestWorker;
  let actionFactory: ActionFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    actionFactory = new ActionFactory();
    actionFactory.register("test_action", () => new TestAction());
    worker = new TestWorker(
      mockQueue,
      mockDependencies,
      actionFactory,
      mockContainer
    );
  });

  describe("wrapWithRetryAndErrorHandling", () => {
    it("should wrap action with retry and error handling", () => {
      const originalAction = new TestAction();
      const wrappedAction =
        worker["wrapWithRetryAndErrorHandling"](originalAction);

      expect(wrappedAction.name).toContain("error_handling_wrapper");
      expect(wrappedAction.name).toContain("retry_wrapper");
    });

    it("should preserve action functionality", async () => {
      const originalAction = new TestAction();
      const wrappedAction =
        worker["wrapWithRetryAndErrorHandling"](originalAction);

      const result = await wrappedAction.execute("test", mockDependencies, {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      });

      expect(result).toBe("processed: test");
    });
  });

  describe("wrapWithErrorHandling", () => {
    it("should wrap action with error handling only", () => {
      const originalAction = new TestAction();
      const wrappedAction = worker["wrapWithErrorHandling"](originalAction);

      expect(wrappedAction.name).toContain("error_handling_wrapper");
      expect(wrappedAction.name).not.toContain("retry_wrapper");
    });

    it("should preserve action functionality", async () => {
      const originalAction = new TestAction();
      const wrappedAction = worker["wrapWithErrorHandling"](originalAction);

      const result = await wrappedAction.execute("test", mockDependencies, {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      });

      expect(result).toBe("processed: test");
    });
  });

  describe("createWrappedAction", () => {
    it("should create action from factory and wrap with retry and error handling", () => {
      const wrappedAction = worker["createWrappedAction"]("test_action");

      expect(wrappedAction.name).toContain("error_handling_wrapper");
      expect(wrappedAction.name).toContain("retry_wrapper");
      expect(wrappedAction.name).toContain("test_action");
    });

    it("should use custom dependencies when provided", () => {
      const customDeps = { ...mockDependencies };
      const wrappedAction = worker["createWrappedAction"](
        "test_action",
        customDeps
      );

      expect(wrappedAction).toBeDefined();
    });

    it("should throw error when action not found in factory", () => {
      expect(() =>
        worker["createWrappedAction"]("nonexistent_action")
      ).toThrow();
    });
  });

  describe("createErrorHandledAction", () => {
    it("should create action from factory and wrap with error handling only", () => {
      const wrappedAction = worker["createErrorHandledAction"]("test_action");

      expect(wrappedAction.name).toContain("error_handling_wrapper");
      expect(wrappedAction.name).not.toContain("retry_wrapper");
      expect(wrappedAction.name).toContain("test_action");
    });

    it("should use custom dependencies when provided", () => {
      const customDeps = { ...mockDependencies };
      const wrappedAction = worker["createErrorHandledAction"](
        "test_action",
        customDeps
      );

      expect(wrappedAction).toBeDefined();
    });

    it("should throw error when action not found in factory", () => {
      expect(() =>
        worker["createErrorHandledAction"]("nonexistent_action")
      ).toThrow();
    });
  });

  describe("addStatusActions", () => {
    it("should add status actions to the beginning and end of action array", () => {
      const actions: BaseAction<unknown, unknown>[] = [];
      const data = { noteId: "test-note" } as BaseJobData;

      worker["addStatusActions"](actions, data);

      expect(actions.length).toBe(2);
      expect(actions[0]?.name).toContain("broadcast_processing");
      expect(actions[1]?.name).toContain("broadcast_completed");
    });

    it("should log status action addition", () => {
      const actions: BaseAction<unknown, unknown>[] = [];
      const data = { noteId: "test-note" } as BaseJobData;

      worker["addStatusActions"](actions, data);

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("addStatusActions called with data")
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        expect.stringContaining("Adding status actions")
      );
    });

    it("should add status actions even without noteId", () => {
      const actions: BaseAction<unknown, unknown>[] = [];
      const data = {} as BaseJobData;

      worker["addStatusActions"](actions, data);

      expect(actions.length).toBe(2);
    });
  });
});
