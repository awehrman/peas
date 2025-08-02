import type { Queue } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  IConfigService,
  IDatabaseService,
  IErrorHandlerService,
  IHealthMonitorService,
  ILoggerService,
  IQueueService,
  IServiceContainer,
  IStatusBroadcasterService,
  IWebSocketService,
} from "../../../services/container";
import { createMockLogger } from "../../../test-utils/helpers";
import { ActionName, LogLevel } from "../../../types";
import { ActionFactory } from "../../core/action-factory";
import { BaseAction } from "../../core/base-action";
import { BaseWorker } from "../../core/base-worker";
import type { ActionContext } from "../../core/types";
import type { BaseJobData } from "../../types";

// WorkerImpl type is not exported, so we'll define it locally for testing
type WorkerImpl<TData> = (
  queue: { name: string },
  jobProcessor: (job: {
    id?: string;
    attemptsMade?: number;
    data: TData;
  }) => Promise<Record<string, unknown>>,
  concurrency: number
) => { isRunning: () => boolean };

// Mock processJob function
vi.mock("../../core/job-processor/job-processor", () => ({
  processJob: vi
    .fn()
    .mockImplementation(
      async (actions, data, context, logger, operationName, deps) => {
        // Simulate processing the first action
        if (actions.length > 0) {
          const result = await actions[0].execute(data, deps, context);
          return result;
        }
        return data;
      }
    ),
}));

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

// Define the correct dependency type that matches DefaultDeps
type TestDependencies = {
  logger: {
    log: (
      message: string,
      level?: LogLevel | undefined,
      meta?: Record<string, unknown>
    ) => void;
  };
};

// Test action implementation
class TestAction extends BaseAction<BaseJobData, TestDependencies> {
  name = ActionName.NO_OP;

  async execute(
    data: BaseJobData,
    _deps: TestDependencies
  ): Promise<BaseJobData> {
    return { ...data, metadata: { ...data.metadata, processed: true } };
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

// Test worker implementation
class TestWorker extends BaseWorker<BaseJobData, TestDependencies> {
  protected registerActions(): void {
    this.actionFactory.register(ActionName.NO_OP, () => new TestAction());
  }

  protected getOperationName(): string {
    return "test-worker";
  }

  protected createActionPipeline(
    _data: BaseJobData,
    _context: ActionContext
  ): ReturnType<
    BaseWorker<BaseJobData, TestDependencies>["createActionPipeline"]
  > {
    return [this.actionFactory.create(ActionName.NO_OP, this.dependencies)];
  }

  // Expose protected methods for testing
  public testValidateDependencies(): void {
    this.validateDependencies();
  }

  public testInjectStandardStatusActions(
    actions: BaseAction[],
    data: BaseJobData
  ): void {
    this.injectStandardStatusActions(actions, data);
  }

  public testCreateRetryableErrorHandledAction(
    actionName: ActionName
  ): ReturnType<
    BaseWorker<
      BaseJobData,
      TestDependencies
    >["createRetryableErrorHandledAction"]
  > {
    return this.createRetryableErrorHandledAction(actionName);
  }

  public testCreateErrorHandledActionOnly(
    actionName: ActionName
  ): ReturnType<
    BaseWorker<BaseJobData, TestDependencies>["createErrorHandledActionOnly"]
  > {
    return this.createErrorHandledActionOnly(actionName);
  }

  public testBuildBaseWorkerDependencies() {
    return this.buildBaseWorkerDependencies();
  }

  public testGetConcurrency(): number {
    return this.getConcurrency();
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

  public get testContainer() {
    return this.container;
  }

  // Expose protected methods for testing
  public testCreateActionPipeline(data: BaseJobData, context: ActionContext) {
    return this.createActionPipeline(data, context);
  }

  // Expose the createWorker method for testing job processing
  public async testCreateWorker(
    queue: { name: string },
    workerImpl?: WorkerImpl<BaseJobData>
  ) {
    return (
      this as unknown as {
        createWorker: (
          queue: { name: string },
          workerImpl?: WorkerImpl<BaseJobData>
        ) => Promise<unknown>;
      }
    ).createWorker(queue, workerImpl);
  }

  // Expose the job processor directly for testing
  public async testCreateJobProcessor(queue: { name: string }) {
    // Create a mock worker implementation that captures the job processor
    const capturedJobProcessor = vi.fn();
    const mockWorkerImpl = vi
      .fn()
      .mockImplementation((_queue, jobProcessor, _concurrency) => {
        capturedJobProcessor.mockImplementation(jobProcessor);
        return {
          isRunning: () => true,
        };
      });

    await (
      this as unknown as {
        createWorker: (
          queue: { name: string },
          workerImpl?: WorkerImpl<BaseJobData>
        ) => Promise<unknown>;
      }
    ).createWorker(queue, mockWorkerImpl);
    return capturedJobProcessor;
  }

  // Override lifecycle hooks to track calls
  public onBeforeJobCalls: Array<{
    data: BaseJobData;
    context: ActionContext;
  }> = [];
  public onAfterJobCalls: Array<{
    data: BaseJobData;
    context: ActionContext;
    result: unknown;
  }> = [];
  public onJobErrorCalls: Array<{
    error: Error;
    data: BaseJobData;
    context: ActionContext;
  }> = [];

  protected async onBeforeJob(
    data: BaseJobData,
    context: ActionContext
  ): Promise<void> {
    this.onBeforeJobCalls.push({ data, context });
    await super.onBeforeJob(data, context);
  }

  protected async onAfterJob(
    data: BaseJobData,
    context: ActionContext,
    result: unknown
  ): Promise<void> {
    this.onAfterJobCalls.push({ data, context, result });
    await super.onAfterJob(data, context, result as BaseJobData);
  }

  protected async onJobError(
    error: Error,
    data: BaseJobData,
    context: ActionContext
  ): Promise<void> {
    this.onJobErrorCalls.push({ error, data, context });
    await super.onJobError(error, data, context);
  }
}

describe("BaseWorker", () => {
  let mockQueue: { name: string };
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockDependencies: TestDependencies;
  let worker: TestWorker;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockQueue = { name: "test-queue" };
    mockLogger = createMockLogger();
    mockDependencies = { logger: mockLogger };

    // Create worker with mock implementation to avoid async initialization
    const mockWorkerImpl = vi.fn().mockReturnValue({
      isRunning: () => true,
    });

    worker = new TestWorker(
      mockQueue,
      mockDependencies,
      undefined,
      undefined,
      undefined,
      mockWorkerImpl
    );
  });

  describe("constructor", () => {
    it("should initialize with default action factory", () => {
      expect(worker).toBeInstanceOf(BaseWorker);
      expect(worker).toBeInstanceOf(TestWorker);
    });

    it("should initialize with custom action factory", () => {
      const customFactory = new ActionFactory<
        BaseJobData,
        TestDependencies,
        unknown
      >();

      const customWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        customFactory
      );

      expect(customWorker).toBeInstanceOf(TestWorker);
    });

    it("should initialize with custom configuration", () => {
      const customConfig = { concurrency: 10 };
      const customWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        undefined,
        customConfig
      );

      expect(customWorker).toBeInstanceOf(TestWorker);
    });
  });

  describe("validateDependencies", () => {
    it("should not throw when called", () => {
      expect(() => {
        worker.testValidateDependencies();
      }).not.toThrow();
    });
  });

  describe("injectStandardStatusActions", () => {
    it("should inject status actions into pipeline", () => {
      const actions: BaseAction[] = [];
      const data = { jobId: "test-123" } as BaseJobData;

      worker.testInjectStandardStatusActions(actions, data);

      // The method should add status actions to the array
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe("createRetryableErrorHandledAction", () => {
    it("should create action with retry and error handling", () => {
      const action = worker.testCreateRetryableErrorHandledAction(
        ActionName.NO_OP
      );

      expect(action).toBeDefined();
      expect(action.name).toContain("retry_wrapper");
    });
  });

  describe("createErrorHandledActionOnly", () => {
    it("should create action with error handling only", () => {
      const action = worker.testCreateErrorHandledActionOnly(ActionName.NO_OP);

      expect(action).toBeDefined();
      expect(action.name).toContain("error_handling");
    });
  });

  describe("buildBaseWorkerDependencies", () => {
    it("should build base dependencies", () => {
      // Create worker with service container
      const mockServiceContainer: IServiceContainer = {
        logger: {
          log: vi.fn(),
        } as ILoggerService,
        queues: {
          noteQueue: {} as Queue,
          imageQueue: {} as Queue,
          ingredientQueue: {} as Queue,
          instructionQueue: {} as Queue,
          categorizationQueue: {} as Queue,
          sourceQueue: {} as Queue,
        } as IQueueService,
        database: {} as IDatabaseService,
        errorHandler: {} as IErrorHandlerService,
        healthMonitor: {} as IHealthMonitorService,
        webSocket: {} as IWebSocketService,
        statusBroadcaster: {} as IStatusBroadcasterService,
        config: {} as IConfigService,
        close: vi.fn(),
      };

      const workerWithContainer = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        mockServiceContainer
      );
      const deps = workerWithContainer.testBuildBaseWorkerDependencies();

      expect(deps).toBeDefined();
      expect(deps.logger).toBeDefined();
      expect(deps.addStatusEventAndBroadcast).toBeDefined();
      expect(deps.ErrorHandler).toBeDefined();
    });
  });

  describe("getConcurrency", () => {
    it("should return default concurrency", () => {
      const concurrency = worker.testGetConcurrency();
      expect(concurrency).toBe(5);
    });
  });

  describe("getStatus", () => {
    it("should return worker status", async () => {
      // Wait for worker to initialize
      await new Promise((resolve) => setTimeout(resolve, 10));

      const status = worker.getStatus();

      expect(status).toBeDefined();
      expect(status.name).toBe("test-worker");
      expect(typeof status.isRunning).toBe("boolean");
    });
  });

  describe("custom worker implementation", () => {
    it("should use custom worker implementation when provided", async () => {
      const customWorkerImpl = vi.fn().mockReturnValue({
        isRunning: () => false,
      });

      const customWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        undefined,
        undefined,
        customWorkerImpl
      );

      // Wait for worker to initialize
      await new Promise((resolve) => setTimeout(resolve, 10));

      const status = customWorker.getStatus();
      expect(status.isRunning).toBe(false);
      expect(customWorkerImpl).toHaveBeenCalled();
    });
  });

  describe("action factory integration", () => {
    it("should register and create actions", () => {
      const action = worker.testActionFactory.create(
        ActionName.NO_OP,
        mockDependencies
      );

      expect(action).toBeDefined();
      expect(action.name).toBe(ActionName.NO_OP);
    });

    it("should check if action is registered", () => {
      expect(worker.testActionFactory.has(ActionName.NO_OP)).toBe(true);
      expect(worker.testActionFactory.has(ActionName.VALIDATION)).toBe(false);
    });

    it("should get registered actions", () => {
      const registeredActions = worker.testActionFactory.getRegisteredActions();

      expect(registeredActions).toContain(ActionName.NO_OP);
      expect(registeredActions).toHaveLength(1);
    });
  });

  describe("dependencies", () => {
    it("should have logger dependency", () => {
      expect(worker.testDependencies.logger).toBeDefined();
      expect(typeof worker.testDependencies.logger.log).toBe("function");
    });

    it("should use provided dependencies", () => {
      const customLogger = { log: vi.fn() };
      const customDeps: TestDependencies = { logger: customLogger };
      const customWorker = new TestWorker(mockQueue, customDeps);

      expect(customWorker.testDependencies.logger).toBe(customLogger);
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      expect(worker.testConfig).toBeDefined();
    });

    it("should use custom configuration", () => {
      const customConfig = { concurrency: 15 };
      const customWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        undefined,
        customConfig
      );

      expect(customWorker.testConfig.concurrency).toBe(15);
    });
  });

  describe("service container integration", () => {
    it("should store service container when provided", () => {
      const mockServiceContainer: IServiceContainer = {
        logger: {
          log: vi.fn(),
        } as ILoggerService,
        queues: {
          noteQueue: {} as Queue,
          imageQueue: {} as Queue,
          ingredientQueue: {} as Queue,
          instructionQueue: {} as Queue,
          categorizationQueue: {} as Queue,
          sourceQueue: {} as Queue,
        } as IQueueService,
        database: {} as IDatabaseService,
        errorHandler: {} as IErrorHandlerService,
        healthMonitor: {} as IHealthMonitorService,
        webSocket: {} as IWebSocketService,
        statusBroadcaster: {} as IStatusBroadcasterService,
        config: {} as IConfigService,
        close: vi.fn(),
      };

      const workerWithContainer = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        mockServiceContainer
      );

      expect(workerWithContainer.testContainer).toBe(mockServiceContainer);
    });

    it("should handle undefined service container", () => {
      const workerWithoutContainer = new TestWorker(
        mockQueue,
        mockDependencies
      );

      expect(workerWithoutContainer.testContainer).toBeUndefined();
    });
  });

  describe("job processing", () => {
    beforeEach(() => {
      // Clear lifecycle hook call tracking
      worker.onBeforeJobCalls = [];
      worker.onAfterJobCalls = [];
      worker.onJobErrorCalls = [];
    });

    it("should process job successfully and call lifecycle hooks", async () => {
      const jobProcessor = await worker.testCreateJobProcessor(mockQueue);

      const testJob = {
        id: "test-job-123",
        attemptsMade: 0,
        data: { jobId: "test-123", metadata: { test: true } } as BaseJobData,
      };

      const result = await jobProcessor(testJob);

      // Verify lifecycle hooks were called
      expect(worker.onBeforeJobCalls).toHaveLength(1);
      expect(worker.onBeforeJobCalls[0]?.data).toEqual(testJob.data);
      expect(worker.onBeforeJobCalls[0]?.context.jobId).toBe("test-job-123");

      expect(worker.onAfterJobCalls).toHaveLength(1);
      expect(worker.onAfterJobCalls[0]?.data).toEqual(testJob.data);
      expect(worker.onAfterJobCalls[0]?.context.jobId).toBe("test-job-123");
      expect(worker.onAfterJobCalls[0]?.result).toBeDefined();

      // Verify logging calls
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-WORKER] Starting job test-job-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("test-worker completed for job test-job-123"),
        LogLevel.INFO,
        expect.objectContaining({
          duration: expect.any(Number),
          jobId: "test-job-123",
        })
      );

      // Verify system monitoring was called
      const { systemMonitor } = await import(
        "../../../monitoring/system-monitor"
      );
      expect(systemMonitor.trackJobMetrics).toHaveBeenCalledWith(
        "test-job-123",
        expect.any(Number),
        true,
        "test-queue",
        "test-worker"
      );

      expect(result).toBeDefined();
    });

    it("should handle job processing errors and call error lifecycle hook", async () => {
      // Create a worker with a failing action
      class FailingAction extends BaseAction<BaseJobData, TestDependencies> {
        name = ActionName.NO_OP;

        async execute(): Promise<BaseJobData> {
          throw new Error("Action execution failed");
        }

        validateInput(): Error | null {
          return null;
        }
      }

      class FailingWorker extends TestWorker {
        protected createActionPipeline(): ReturnType<
          TestWorker["createActionPipeline"]
        > {
          return [new FailingAction()];
        }
      }

      const failingWorker = new FailingWorker(
        mockQueue,
        mockDependencies,
        undefined,
        undefined,
        undefined,
        vi.fn().mockReturnValue({
          isRunning: () => true,
        })
      );

      const jobProcessor =
        await failingWorker.testCreateJobProcessor(mockQueue);

      const testJob = {
        id: "test-job-456",
        attemptsMade: 1,
        data: { jobId: "test-456", metadata: { test: true } } as BaseJobData,
      };

      await expect(jobProcessor(testJob)).rejects.toThrow(
        "Action execution failed"
      );

      // Verify error lifecycle hook was called
      expect(failingWorker.onJobErrorCalls).toHaveLength(1);
      expect(failingWorker.onJobErrorCalls[0]?.data).toEqual(testJob.data);
      expect(failingWorker.onJobErrorCalls[0]?.context.jobId).toBe(
        "test-job-456"
      );
      expect(failingWorker.onJobErrorCalls[0]?.error.message).toBe(
        "Action execution failed"
      );

      // Verify error logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("test-worker failed for job test-job-456"),
        LogLevel.ERROR,
        expect.objectContaining({
          duration: expect.any(Number),
          jobId: "test-job-456",
          error: expect.any(Error),
        })
      );

      // Verify error system monitoring was called
      const { systemMonitor } = await import(
        "../../../monitoring/system-monitor"
      );
      expect(systemMonitor.trackJobMetrics).toHaveBeenCalledWith(
        "test-job-456",
        expect.any(Number),
        false,
        "test-queue",
        "test-worker",
        "Action execution failed"
      );
    });

    it("should handle jobs with missing job ID", async () => {
      const jobProcessor = await worker.testCreateJobProcessor(mockQueue);

      const testJob = {
        id: undefined,
        attemptsMade: 0,
        data: { jobId: "test-789", metadata: { test: true } } as BaseJobData,
      };

      const result = await jobProcessor(testJob);

      // Verify context was created with fallback job ID
      expect(worker.onBeforeJobCalls[0]?.context.jobId).toBe("unknown");
      expect(worker.onAfterJobCalls[0]?.context.jobId).toBe("unknown");

      expect(result).toBeDefined();
    });

    it("should handle jobs with retry attempts", async () => {
      const jobProcessor = await worker.testCreateJobProcessor(mockQueue);

      const testJob = {
        id: "test-job-retry",
        attemptsMade: 3,
        data: { jobId: "test-retry", metadata: { test: true } } as BaseJobData,
      };

      const result = await jobProcessor(testJob);

      // Verify context includes retry information
      expect(worker.onBeforeJobCalls[0]?.context.retryCount).toBe(3);
      expect(worker.onBeforeJobCalls[0]?.context.attemptNumber).toBe(4);

      expect(result).toBeDefined();
    });

    it("should create worker with custom implementation", async () => {
      const customWorkerImpl = vi.fn().mockReturnValue({
        isRunning: () => true,
        process: vi.fn(),
      });

      const mockWorker = await worker.testCreateWorker(
        mockQueue,
        customWorkerImpl
      );

      expect(customWorkerImpl).toHaveBeenCalledWith(
        mockQueue,
        expect.any(Function), // jobProcessor
        5 // default concurrency
      );

      expect(mockWorker).toBeDefined();
    });

    it("should create worker with custom concurrency", async () => {
      const customConfig = { concurrency: 10 };
      const customWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        undefined,
        customConfig,
        vi.fn().mockReturnValue({
          isRunning: () => true,
          process: vi.fn(),
        })
      );

      const customWorkerImpl = vi.fn().mockReturnValue({
        isRunning: () => true,
        process: vi.fn(),
      });

      await customWorker.testCreateWorker(mockQueue, customWorkerImpl);

      expect(customWorkerImpl).toHaveBeenCalledWith(
        mockQueue,
        expect.any(Function), // jobProcessor
        10 // custom concurrency
      );
    });

    it("should create BullMQ worker with default concurrency when no workerImpl provided", async () => {
      // Create a worker without a custom workerImpl to test the BullMQ path
      const bullMQWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        undefined,
        undefined, // no custom config
        undefined // no custom workerImpl
      );

      const result = await bullMQWorker.testCreateWorker(mockQueue);

      expect(result).toBeDefined();
      expect((result as { isRunning: () => boolean }).isRunning).toBeDefined();
    });
  });

  describe("createActionPipeline", () => {
    it("should create action pipeline with actual actions", () => {
      const data = { jobId: "test-pipeline" } as BaseJobData;
      const context: ActionContext = {
        jobId: "test-pipeline",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-worker",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const pipeline = worker.testCreateActionPipeline(data, context);

      expect(pipeline).toHaveLength(1);
      expect(pipeline[0]?.name).toBe(ActionName.NO_OP);
    });

    it("should return empty array for default implementation", () => {
      // Create a worker that uses the default createActionPipeline implementation
      class DefaultWorker extends BaseWorker<BaseJobData, TestDependencies> {
        protected registerActions(): void {
          // No actions registered
        }

        protected getOperationName(): string {
          return "default-worker";
        }

        // Don't override createActionPipeline to test the default implementation

        // Expose protected method for testing
        public testCreateActionPipeline(
          data: BaseJobData,
          context: ActionContext
        ) {
          return this.createActionPipeline(data, context);
        }
      }

      const defaultWorker = new DefaultWorker(mockQueue, mockDependencies);
      const data = { jobId: "test-default" } as BaseJobData;
      const context: ActionContext = {
        jobId: "test-default",
        retryCount: 0,
        queueName: "test-queue",
        operation: "default-worker",
        startTime: Date.now(),
        workerName: "default-worker",
        attemptNumber: 1,
      };

      const pipeline = defaultWorker.testCreateActionPipeline(data, context);

      expect(pipeline).toEqual([]);
    });
  });
});
