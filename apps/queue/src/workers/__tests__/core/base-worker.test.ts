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
}

describe("BaseWorker", () => {
  let mockQueue: { name: string };
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockDependencies: TestDependencies;
  let worker: TestWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueue = { name: "test-queue" };
    mockLogger = createMockLogger();
    mockDependencies = { logger: mockLogger };
    worker = new TestWorker(mockQueue, mockDependencies);
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
});
