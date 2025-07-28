import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLogger } from "../../../test-utils/helpers";
import { ActionName } from "../../../types";
import {
  ActionFactory,
  BaseAction,
  BaseWorker,
  LoggingAction,
  NoOpAction,
  ValidationAction,
} from "../../core";
import type { ActionContext } from "../../core/types";
import type { BaseJobData } from "../../types";

// Mock dependencies
vi.mock("../../../monitoring/system-monitor", () => ({
  systemMonitor: {
    trackJobMetrics: vi.fn(),
    logWorkerEvent: vi.fn(),
  },
}));

vi.mock("bullmq", () => ({
  Worker: vi.fn().mockImplementation(() => ({
    isRunning: () => true,
  })),
}));

vi.mock("../../config/redis", () => ({
  redisConfig: {
    host: "localhost",
    port: 6379,
  },
}));

// Test action implementation
class TestAction extends BaseAction {
  name = ActionName.NO_OP;

  async execute(data: BaseJobData): Promise<BaseJobData> {
    return { ...data, metadata: { ...data.metadata, processed: true } };
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

// Test worker implementation
class TestWorker extends BaseWorker {
  protected registerActions(): void {
    this.actionFactory.register(ActionName.NO_OP, () => new TestAction());
  }

  protected getOperationName(): string {
    return "test-worker";
  }

  protected createActionPipeline(
    _data: BaseJobData,
    _context: ActionContext
  ): ReturnType<BaseWorker["createActionPipeline"]> {
    return [this.actionFactory.create(ActionName.NO_OP, this.dependencies)];
  }

  // Expose protected properties for testing
  public get testActionFactory() {
    return this.actionFactory;
  }

  public get testDependencies() {
    return this.dependencies;
  }

  public get testConfig() {
    return this.config;
  }
}

describe("Core Module Integration", () => {
  let mockQueue: { name: string };
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockDependencies: { logger: { log: ReturnType<typeof vi.fn> } };
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = { name: "test-queue" };
    mockLogger = createMockLogger();
    mockDependencies = { logger: mockLogger };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("Module Exports", () => {
    it("should export ActionFactory", () => {
      expect(ActionFactory).toBeDefined();
      expect(typeof ActionFactory).toBe("function");
    });

    it("should export BaseAction", () => {
      expect(BaseAction).toBeDefined();
      expect(typeof BaseAction).toBe("function");
    });

    it("should export BaseWorker", () => {
      expect(BaseWorker).toBeDefined();
      expect(typeof BaseWorker).toBe("function");
    });

    it("should export concrete action classes", () => {
      expect(NoOpAction).toBeDefined();
      expect(ValidationAction).toBeDefined();
      expect(LoggingAction).toBeDefined();
    });
  });

  describe("ActionFactory Integration", () => {
    it("should work with BaseAction instances", () => {
      const factory = new ActionFactory<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      >();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      factory.register(ActionName.NO_OP, () => new TestAction() as any);

      expect(factory.has(ActionName.NO_OP)).toBe(true);

      const action = factory.create(ActionName.NO_OP, mockDependencies);
      expect(action).toBeInstanceOf(TestAction);
    });

    it("should work with concrete action classes", () => {
      const factory = new ActionFactory<
        BaseJobData,
        { logger?: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      >();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      factory.register(ActionName.NO_OP, () => new NoOpAction() as any);
      factory.register(
        ActionName.VALIDATION,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => new ValidationAction(() => null) as any
      );
      factory.register(
        ActionName.LOGGING,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => new LoggingAction("Test message") as any
      );

      expect(factory.getRegisteredActions()).toHaveLength(3);
      expect(factory.getRegisteredActions()).toContain(ActionName.NO_OP);
      expect(factory.getRegisteredActions()).toContain(ActionName.VALIDATION);
      expect(factory.getRegisteredActions()).toContain(ActionName.LOGGING);
    });
  });

  describe("BaseWorker Integration", () => {
    it("should work with ActionFactory", () => {
      const worker = new TestWorker(mockQueue, mockDependencies);

      expect(worker.testActionFactory).toBeInstanceOf(ActionFactory);
      expect(worker.testActionFactory.has(ActionName.NO_OP)).toBe(true);
    });

    it("should create and execute actions", async () => {
      const worker = new TestWorker(mockQueue, mockDependencies);
      const testData = { jobId: "test-123" } as BaseJobData;

      const action = worker.testActionFactory.create(
        ActionName.NO_OP,
        mockDependencies
      );
      const result = await action.execute(
        testData,
        mockDependencies,
        mockContext
      );

      expect(result).toEqual({
        jobId: "test-123",
        metadata: { processed: true },
      });
    });
  });

  describe("Concrete Action Classes", () => {
    it("should execute NoOpAction correctly", async () => {
      const action = new NoOpAction();
      const testData = { jobId: "test-123", someData: "value" } as BaseJobData;

      const result = await action.execute(testData);

      expect(result).toEqual(testData);
      expect(action.name).toBe(ActionName.NO_OP);
    });

    it("should execute ValidationAction correctly", async () => {
      const validator = vi.fn().mockReturnValue(null);
      const action = new ValidationAction(validator);
      const testData = { jobId: "test-123" } as BaseJobData;

      const result = await action.execute(testData);

      expect(result).toEqual(testData);
      expect(validator).toHaveBeenCalledWith(testData);
      expect(action.name).toBe(ActionName.VALIDATION);
      expect(action.retryable).toBe(false);
    });

    it("should execute LoggingAction correctly", async () => {
      const action = new LoggingAction("Test message");
      const testData = { jobId: "test-123" } as BaseJobData;

      const result = await action.execute(
        testData,
        mockDependencies,
        mockContext
      );

      expect(result).toEqual(testData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[test-job-123] Test message"
      );
      expect(action.name).toBe(ActionName.LOGGING);
      expect(action.retryable).toBe(false);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle action execution errors", async () => {
      const action = new ValidationAction(() => new Error("Validation failed"));
      const testData = { jobId: "test-123" } as BaseJobData;

      await expect(action.execute(testData)).rejects.toThrow(
        "Validation failed"
      );
    });

    it("should handle timing and error reporting", async () => {
      const action = new TestAction();
      const testData = { jobId: "test-123" } as BaseJobData;

      const result = await action.executeWithTiming(
        testData,
        mockDependencies,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Configuration Integration", () => {
    it("should handle action configuration", () => {
      const action = new TestAction();
      const configuredAction = action.withConfig({
        retryable: false,
        priority: 10,
      });

      expect(configuredAction.retryable).toBe(false);
      expect(configuredAction.priority).toBe(10);
      expect(configuredAction).not.toBe(action); // New instance
    });

    it("should handle worker configuration", () => {
      const customConfig = { concurrency: 15 };
      const worker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        undefined,
        customConfig
      );

      expect(worker.testConfig.concurrency).toBe(15);
    });
  });

  describe("Dependency Injection", () => {
    it("should inject dependencies correctly", () => {
      const worker = new TestWorker(mockQueue, mockDependencies);

      expect(worker.testDependencies.logger).toBe(mockLogger);
      expect(typeof worker.testDependencies.logger.log).toBe("function");
    });

    it("should work with different dependency types", () => {
      const customLogger = { log: vi.fn() };
      const customDeps = { logger: customLogger };
      const worker = new TestWorker(mockQueue, customDeps);

      expect(worker.testDependencies.logger).toBe(customLogger);
    });
  });

  describe("End-to-End Workflow", () => {
    it("should complete a full workflow", async () => {
      // Create factory and register actions
      const factory = new ActionFactory<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      >();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      factory.register(ActionName.NO_OP, () => new TestAction() as any);

      // Create worker with factory
      const worker = new TestWorker(
        mockQueue,
        mockDependencies,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        factory as any
      );

      // Wait for worker to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create and execute action
      const action = worker.testActionFactory.create(
        ActionName.NO_OP,
        mockDependencies
      );
      const testData = { jobId: "test-123" } as BaseJobData;

      const result = await action.execute(
        testData,
        mockDependencies,
        mockContext
      );

      // Verify results
      expect(result).toEqual({
        jobId: "test-123",
        metadata: { processed: true },
      });
      expect(worker.getStatus().name).toBe("test-worker");
    });
  });
});
