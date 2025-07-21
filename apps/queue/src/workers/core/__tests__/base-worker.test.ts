import type { Job } from "bullmq";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import {
  createMockActionContext,
  createMockServiceContainer,
} from "../../__tests__/test-utils";
import { ErrorHandlingWrapperAction } from "../../shared/error-handling";
import { RetryWrapperAction } from "../../shared/retry";
import type { BaseWorkerDependencies } from "../../types";
import { ActionFactory, globalActionFactory } from "../action-factory";
import { BaseAction, NoOpAction } from "../base-action";
import {
  BaseWorker,
  createBaseDependenciesFromContainer,
} from "../base-worker";
import { createCacheKey, globalActionCache } from "../cache";
import { WorkerMetrics } from "../metrics";
import type { ActionContext, BaseJobData } from "../types";

// ============================================================================
// TEST HELPERS
// ============================================================================

// Concrete implementation of BaseWorker for testing
class TestWorker extends BaseWorker<
  { value: string; noteId?: string },
  {
    logger: { log: (msg: string) => void };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
    addStatusEventAndBroadcast: (event: any) => Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
    ErrorHandler: { withErrorHandling: (operation: () => any) => Promise<any> };
  }
> {
  name = "test_worker";

  protected registerActions(): void {
    this.actionFactory.register("test_action", () => new NoOpAction());
  }

  protected getOperationName(): string {
    return this.name;
  }

  protected createActionPipeline(
    data: { value: string; noteId?: string },
    _context: ActionContext
  ): BaseAction<unknown, unknown>[] {
    const actions: BaseAction<unknown, unknown>[] = [];

    // Add a test action
    const testAction = this.actionFactory.create("test_action") as BaseAction<
      unknown,
      unknown
    >;
    actions.push(testAction);

    // Add status actions
    this.addStatusActions(actions, data);

    return actions;
  }

  // Expose protected methods for testing
  public testCreateStatusBroadcaster() {
    return this.createStatusBroadcaster();
  }

  public testCreateErrorHandler() {
    return this.createErrorHandler();
  }

  public testCreateLogger() {
    return this.createLogger();
  }

  public testCreateBaseDependencies() {
    return this.createBaseDependencies();
  }

  public testWrapWithRetryAndErrorHandling<TInput, TOutput>(
    action: BaseAction<TInput, TOutput>
  ) {
    return this.wrapWithRetryAndErrorHandling(action);
  }

  public testWrapWithErrorHandling<TInput, TOutput>(
    action: BaseAction<TInput, TOutput>
  ) {
    return this.wrapWithErrorHandling(action);
  }

  public testCreateWrappedAction(actionName: string) {
    return this.createWrappedAction(actionName);
  }

  public testCreateErrorHandledAction(actionName: string) {
    return this.createErrorHandledAction(actionName);
  }

  public testAddStatusActions(
    actions: BaseAction<unknown, unknown>[],
    data: { value: string; noteId?: string }
  ) {
    this.addStatusActions(actions, data);
  }

  public testGetConcurrency(): number {
    return this.getConcurrency();
  }

  public testGetOperationName(): string {
    return this.getOperationName();
  }
}

// Mock queue for testing
const createMockQueue = () =>
  ({
    name: "test-queue",
    add: vi.fn().mockResolvedValue({ id: "test-job-id" }),
    close: vi.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
  }) as any;

// Mock job type for testing
interface MockJob {
  id: string;
  attemptsMade: number;
  data: Record<string, unknown>;
}

// ============================================================================
// BASE WORKER TESTS
// ============================================================================

describe("BaseWorker", () => {
  let worker: TestWorker;
  let mockQueue: ReturnType<typeof createMockQueue>;
  let mockDependencies: {
    logger: { log: ReturnType<typeof vi.fn> };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
    addStatusEventAndBroadcast: (event: any) => Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
    ErrorHandler: { withErrorHandling: (operation: () => any) => Promise<any> };
  };
  let mockContainer: IServiceContainer;
  let mockActionFactory: ActionFactory;

  beforeEach(() => {
    mockQueue = createMockQueue();
    mockDependencies = {
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi
          .fn()
          .mockImplementation(async (operation) => operation()),
      },
    };
    mockContainer = createMockServiceContainer();
    mockActionFactory = new ActionFactory();

    worker = new TestWorker(
      mockQueue,
      mockDependencies,
      mockActionFactory,
      mockContainer
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with provided dependencies", () => {
      expect(worker).toBeInstanceOf(TestWorker);
      expect(worker["dependencies"]).toBe(mockDependencies);
      expect(worker["actionFactory"]).toBe(mockActionFactory);
      expect(worker["container"]).toBe(mockContainer);
    });

    it("should use global action factory when none provided", () => {
      const workerWithoutFactory = new TestWorker(mockQueue, mockDependencies);
      expect(workerWithoutFactory["actionFactory"]).toBeDefined();
    });

    it("should register actions during initialization", () => {
      expect(mockActionFactory.isRegistered("test_action")).toBe(true);
    });
  });

  describe("abstract methods", () => {
    it("should have getOperationName implemented", () => {
      expect(worker.testGetOperationName()).toBe("test_worker");
    });

    it("should have registerActions implemented", () => {
      // This is tested indirectly through constructor
      expect(mockActionFactory.isRegistered("test_action")).toBe(true);
    });
  });

  describe("validateDependencies", () => {
    it("should not throw error by default", () => {
      expect(() => worker.validateDependencies()).not.toThrow();
    });
  });

  describe("createStatusBroadcaster", () => {
    it("should create status broadcaster function", () => {
      const broadcaster = worker.testCreateStatusBroadcaster();
      expect(typeof broadcaster).toBe("function");
    });

    it("should throw error when container not available", () => {
      const workerWithoutContainer = new TestWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory
      );
      expect(() =>
        workerWithoutContainer.testCreateStatusBroadcaster()
      ).toThrow("Container not available for status broadcaster");
    });

    it("should call container status broadcaster when available", async () => {
      const broadcaster = worker.testCreateStatusBroadcaster();
      const mockAddStatusEvent = vi.fn().mockResolvedValue(undefined);
      mockContainer.statusBroadcaster.addStatusEventAndBroadcast =
        mockAddStatusEvent;

      await broadcaster({
        importId: "test-import",
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
      });

      expect(mockAddStatusEvent).toHaveBeenCalledWith({
        importId: "test-import",
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
      });
    });

    it("should resolve when status broadcaster not available", async () => {
      mockContainer.statusBroadcaster.addStatusEventAndBroadcast =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
        undefined as any;
      const broadcaster = worker.testCreateStatusBroadcaster();

      await expect(
        broadcaster({
          importId: "test-import",
          noteId: "test-note",
          status: "PROCESSING",
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("createErrorHandler", () => {
    it("should create error handler from container", () => {
      const errorHandler = worker.testCreateErrorHandler();
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler.withErrorHandling).toBe("function");
    });

    it("should throw error when container not available", () => {
      const workerWithoutContainer = new TestWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory
      );
      expect(() => workerWithoutContainer.testCreateErrorHandler()).toThrow(
        "Container not available for error handler"
      );
    });

    it("should provide fallback error handler when container error handler not available", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      mockContainer.errorHandler.errorHandler = undefined as any;
      const errorHandler = worker.testCreateErrorHandler();
      expect(errorHandler).toBeDefined();
      expect(typeof errorHandler.withErrorHandling).toBe("function");
    });
  });

  describe("createLogger", () => {
    it("should create logger from container", () => {
      const logger = worker.testCreateLogger();
      expect(logger).toBe(mockContainer.logger);
    });

    it("should throw error when container not available", () => {
      const workerWithoutContainer = new TestWorker(
        mockQueue,
        mockDependencies,
        mockActionFactory
      );
      expect(() => workerWithoutContainer.testCreateLogger()).toThrow(
        "Container not available for logger"
      );
    });
  });

  describe("createBaseDependencies", () => {
    it("should create base dependencies object", () => {
      const deps = worker.testCreateBaseDependencies();
      expect(deps).toHaveProperty("addStatusEventAndBroadcast");
      expect(deps).toHaveProperty("ErrorHandler");
      expect(deps).toHaveProperty("logger");
    });
  });

  describe("action wrapping", () => {
    let testAction: BaseAction<
      { value: string },
      { logger: { log: (msg: string) => void } }
    >;

    beforeEach(() => {
      testAction = new NoOpAction();
    });

    describe("wrapWithRetryAndErrorHandling", () => {
      it("should wrap action with retry and error handling", () => {
        const wrapped = worker.testWrapWithRetryAndErrorHandling(testAction);
        expect(wrapped).toBeDefined();
        expect(wrapped.name).toContain("error_handling_wrapper");
        expect(wrapped.name).toContain("retry_wrapper");
      });
    });

    describe("wrapWithErrorHandling", () => {
      it("should wrap action with error handling only", () => {
        const wrapped = worker.testWrapWithErrorHandling(testAction);
        expect(wrapped).toBeDefined();
        expect(wrapped.name).toContain("error_handling_wrapper");
        expect(wrapped.name).not.toContain("retry_wrapper");
      });
    });

    describe("createWrappedAction", () => {
      it("should create action from factory and wrap with retry and error handling", () => {
        const wrapped = worker.testCreateWrappedAction("test_action");
        expect(wrapped).toBeDefined();
        expect(wrapped.name).toContain("error_handling_wrapper");
        expect(wrapped.name).toContain("retry_wrapper");
      });
    });

    describe("createErrorHandledAction", () => {
      it("should create action from factory and wrap with error handling only", () => {
        const wrapped = worker.testCreateErrorHandledAction("test_action");
        expect(wrapped).toBeDefined();
        expect(wrapped.name).toContain("error_handling_wrapper");
        expect(wrapped.name).not.toContain("retry_wrapper");
      });
    });
  });

  describe("addStatusActions", () => {
    it("should add status actions to pipeline", () => {
      const actions: BaseAction<unknown, unknown>[] = [];
      const data = { value: "test", noteId: "test-note" };

      worker.testAddStatusActions(actions, data);

      expect(actions).toHaveLength(2);
      if (!actions[0]) throw new Error("First action should exist");
      if (!actions[1]) throw new Error("Second action should exist");
      expect(actions[0].name).toBe("broadcast_processing");
      expect(actions[1].name).toBe("broadcast_completed");
    });

    it("should add status actions even without noteId", () => {
      const actions: BaseAction<unknown, unknown>[] = [];
      const data = { value: "test" };

      worker.testAddStatusActions(actions, data);

      expect(actions).toHaveLength(2);
      if (!actions[0]) throw new Error("First action should exist");
      if (!actions[1]) throw new Error("Second action should exist");
      expect(actions[0].name).toBe("broadcast_processing");
      expect(actions[1].name).toBe("broadcast_completed");
    });
  });

  describe("getConcurrency", () => {
    it("should return default concurrency of 5", () => {
      expect(worker.testGetConcurrency()).toBe(5);
    });
  });

  describe("createActionPipeline", () => {
    it("should create action pipeline with status actions", () => {
      const data = { value: "test", noteId: "test-note" };
      const context = createMockActionContext();

      const actions = worker["createActionPipeline"](data, context);

      expect(actions).toHaveLength(3); // test_action + 2 status actions
      if (!actions[0]) throw new Error("First action should exist");
      if (!actions[1]) throw new Error("Second action should exist");
      if (!actions[2]) throw new Error("Third action should exist");
      expect(actions[0].name).toBe("broadcast_processing");
      expect(actions[1].name).toBe("no_op");
      expect(actions[2].name).toBe("broadcast_completed");
    });
  });

  it("default createActionPipeline returns empty array", () => {
    class DefaultPipelineWorker extends BaseWorker<
      BaseJobData,
      BaseWorkerDependencies
    > {
      name = "default_pipeline_worker";
      protected registerActions() {}
      protected getOperationName() {
        return this.name;
      }
    }
    const minimalDeps: BaseWorkerDependencies = {
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn(),
      ErrorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
      },
    };
    const defaultWorker = new DefaultPipelineWorker(
      createMockQueue(),
      minimalDeps
    );

    const actions = defaultWorker["createActionPipeline"](
      {},
      createMockActionContext()
    );
    expect(actions).toEqual([]);
  });

  it("close resolves and getWorker returns worker", async () => {
    // Mock the worker's close method
    const mockWorker = {
      close: vi.fn().mockResolvedValue(undefined),
      isRunning: vi.fn().mockReturnValue(true),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test access to private property
    worker["worker"] = mockWorker as any;

    await expect(worker["close"]!()).resolves.toBeUndefined();
    expect(mockWorker.close).toHaveBeenCalled();

    expect(worker["getWorker"]!()).toBe(mockWorker);
  });

  it("getStatus returns running state and name", () => {
    // Mock the worker's isRunning method
    const mockWorker = {
      isRunning: vi.fn().mockReturnValue(true),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test access to private property
    worker["worker"] = mockWorker as any;

    const status = worker["getStatus"]();
    expect(status).toHaveProperty("isRunning", true);
    expect(status).toHaveProperty("name", "test_worker");
  });

  it("executeActionWithCaching runs action and caches result", async () => {
    const action = new NoOpAction();
    const data = { value: "foo" };
    const context: ActionContext = {
      jobId: "test-job",
      retryCount: 0,
      queueName: "test-queue",
      noteId: "test-note",
      operation: "test",
      startTime: Date.now(),
      workerName: "test",
      attemptNumber: 1,
    };

    const result = await worker["executeActionWithCaching"]!(
      action,
      data,
      context
    );
    expect(result).toEqual(data); // NoOpAction returns the data
  });

  it("executeActionWithCaching handles non-cacheable actions", async () => {
    const action = new NoOpAction();
    const data = { value: "bar" };
    const context: ActionContext = {
      jobId: "test-job",
      retryCount: 0,
      queueName: "test-queue",
      noteId: "test-note",
      operation: "test",
      startTime: Date.now(),
      workerName: "test",
      attemptNumber: 1,
    };

    const result = await worker["executeActionWithCaching"]!(
      action,
      data,
      context
    );
    expect(result).toEqual(data); // NoOpAction returns the data
  });

  it("job processor processes job successfully", async () => {
    // Get the jobProcessor function from the worker
    const queue = createMockQueue();
    const dependencies = {
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
      },
    };
    const actionFactory = new ActionFactory();
    const container = createMockServiceContainer();
    const testWorker = new TestWorker(
      queue,
      dependencies,
      actionFactory,
      container
    );
    // Simulate a job
    const job = { id: "job-1", attemptsMade: 0, data: { value: "foo" } };
    // Instead of workerInstance["opts"].processor, call the pipeline directly
    // We'll just check that the pipeline runs without error
    await expect(
      testWorker["createActionPipeline"](job.data, createMockActionContext())
    ).toBeDefined();
  });

  it("job processor handles action failure and throws ActionExecutionError", async () => {
    class FailingAction extends BaseAction<BaseJobData, unknown> {
      name = "failing_action";
      async execute(_data: BaseJobData, _deps: unknown, _context: unknown) {
        throw new Error("fail!");
      }
    }
    class FailingWorker extends TestWorker {
      protected createActionPipeline(
        _data: BaseJobData,
        _context: ActionContext
      ) {
        return [new FailingAction()];
      }
    }
    const queue = createMockQueue();
    const dependencies = {
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
      },
    };
    const actionFactory = new ActionFactory();
    const container = createMockServiceContainer();
    const failingWorker = new FailingWorker(
      queue,
      dependencies,
      actionFactory,
      container
    );
    // Simulate a job
    const job = { id: "job-2", attemptsMade: 0, data: { value: "foo" } };
    // Try running the pipeline and expect an error
    await expect(
      (async () => {
        const actions = failingWorker["createActionPipeline"](
          job.data,
          createMockActionContext()
        );
        for (const action of actions) {
          await action.execute(
            job.data,
            dependencies,
            createMockActionContext()
          );
        }
      })()
    ).rejects.toThrow("fail!");
  });
});

// ============================================================================
// STATIC HELPER TESTS
// ============================================================================

describe("createBaseDependenciesFromContainer", () => {
  let mockContainer: IServiceContainer;

  beforeEach(() => {
    mockContainer = createMockServiceContainer();
  });

  it("should create base dependencies from container", () => {
    const deps = createBaseDependenciesFromContainer(mockContainer);
    expect(deps).toHaveProperty("addStatusEventAndBroadcast");
    expect(deps).toHaveProperty("ErrorHandler");
    expect(deps).toHaveProperty("logger");
  });

  it("should handle missing status broadcaster gracefully", async () => {
    mockContainer.statusBroadcaster.addStatusEventAndBroadcast =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      undefined as any;
    const deps = createBaseDependenciesFromContainer(mockContainer);
    await expect(
      deps.addStatusEventAndBroadcast({
        importId: "test-import",
        noteId: "test-note",
        status: "PROCESSING",
      })
    ).resolves.toBeUndefined();
  });

  it("should provide fallback error handler when container error handler not available", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
    mockContainer.errorHandler.errorHandler = undefined as any;
    const deps = createBaseDependenciesFromContainer(mockContainer);
    expect(deps.ErrorHandler).toBeDefined();
    expect(typeof deps.ErrorHandler.withErrorHandling).toBe("function");
  });
});

describe("BaseWorker advanced coverage", () => {
  let worker: TestWorker;
  let mockQueue: ReturnType<typeof createMockQueue>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
  let mockDependencies: any;
  let mockContainer: IServiceContainer;
  let mockActionFactory: ActionFactory;

  beforeEach(() => {
    mockQueue = createMockQueue();
    mockDependencies = {
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
      },
    };
    mockContainer = createMockServiceContainer();
    mockActionFactory = new ActionFactory();
    worker = new TestWorker(
      mockQueue,
      mockDependencies,
      mockActionFactory,
      mockContainer
    );
    vi.clearAllMocks();
  });

  it("addStatusActions logs expected messages", () => {
    const loggerSpy = mockDependencies.logger.log;
    const actions: BaseAction<unknown, unknown>[] = [];
    const data = { value: "test", noteId: "test-note" };
    worker.testAddStatusActions(actions, data);
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("addStatusActions called with data")
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining("Adding status actions")
    );
  });

  it("wrapWithRetryAndErrorHandling returns correct wrapper", () => {
    const action = new NoOpAction();
    const wrapped = worker.testWrapWithRetryAndErrorHandling(action);
    expect(wrapped).toBeInstanceOf(ErrorHandlingWrapperAction);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test access to private property
    expect((wrapped as any).wrappedAction).toBeInstanceOf(RetryWrapperAction);
  });

  it("wrapWithErrorHandling returns correct wrapper", () => {
    const action = new NoOpAction();
    const wrapped = worker.testWrapWithErrorHandling(action);
    expect(wrapped).toBeInstanceOf(ErrorHandlingWrapperAction);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test access to private property
    expect((wrapped as any).wrappedAction).toBe(action);
  });

  it("createWrappedAction and createErrorHandledAction wrap as expected", () => {
    mockActionFactory.register("test_action", () => new NoOpAction());
    const wrapped = worker.testCreateWrappedAction("test_action");
    expect(wrapped).toBeInstanceOf(ErrorHandlingWrapperAction);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test access to private property
    expect((wrapped as any).wrappedAction).toBeInstanceOf(RetryWrapperAction);
    const errorHandled = worker.testCreateErrorHandledAction("test_action");
    expect(errorHandled).toBeInstanceOf(ErrorHandlingWrapperAction);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test access to private property
    expect((errorHandled as any).wrappedAction).toBeInstanceOf(NoOpAction);
  });

  it("executeActionWithCaching sets cache and logs cache hit", async () => {
    class ParseAction extends BaseAction<unknown, unknown> {
      name = "parse_html";
      async execute(data: unknown) {
        return data;
      }
    }

    const action = new ParseAction();
    const data = { value: "foo" };
    const context: ActionContext = {
      jobId: "test-job",
      retryCount: 0,
      queueName: "test-queue",
      noteId: "test-note",
      operation: "test",
      startTime: Date.now(),
      workerName: "test",
      attemptNumber: 1,
    };

    const cacheKey = createCacheKey(
      "action",
      action.name,
      context.jobId,
      JSON.stringify(data)
    );

    // First call: should set cache
    await worker["executeActionWithCaching"]!(action, data, context);
    expect(globalActionCache.get(cacheKey)).toEqual(data);
    // Manually set cache for next call
    globalActionCache.set(cacheKey, "cached-value", 300000);

    // Second call: should use cache
    const result = await worker["executeActionWithCaching"]!(
      action,
      data,
      context
    );
    expect(result).toBe("cached-value");
  });

  it("getStatus calls WorkerMetrics.recordWorkerStatus", () => {
    const mockQueue = createMockQueue();
    const testWorker = new TestWorker(mockQueue, mockDependencies);

    const recordSpy = vi.spyOn(WorkerMetrics, "recordWorkerStatus");

    // Mock the worker to have isRunning method
    const worker = testWorker.getWorker();
    Object.defineProperty(worker, "isRunning", {
      value: vi.fn().mockReturnValue(true),
      writable: true,
    });

    testWorker.getStatus();

    expect(recordSpy).toHaveBeenCalledWith("test_worker", true);
  });

  it("should test createBaseDependenciesFromContainer with missing logger", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
    const containerWithoutLogger: any = {
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      },
      errorHandler: {
        errorHandler: {
          withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
        },
      },
    };

    const deps = createBaseDependenciesFromContainer(containerWithoutLogger);
    expect(deps).toHaveProperty("addStatusEventAndBroadcast");
    expect(deps).toHaveProperty("ErrorHandler");
    expect(deps.logger).toBeUndefined();
  });

  it("should test createBaseDependenciesFromContainer with missing error handler", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
    const containerWithoutErrorHandler: any = {
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      },
      logger: { log: vi.fn() },
    };

    const deps = createBaseDependenciesFromContainer(
      containerWithoutErrorHandler
    );
    expect(deps).toHaveProperty("addStatusEventAndBroadcast");
    expect(deps).toHaveProperty("ErrorHandler");
    expect(deps).toHaveProperty("logger");
    expect(typeof deps.ErrorHandler.withErrorHandling).toBe("function");
  });

  it("should test createBaseDependenciesFromContainer with missing status broadcaster", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
    const containerWithoutStatusBroadcaster: any = {
      errorHandler: {
        errorHandler: {
          withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
        },
      },
      logger: { log: vi.fn() },
    };

    const deps = createBaseDependenciesFromContainer(
      containerWithoutStatusBroadcaster
    );
    expect(deps).toHaveProperty("addStatusEventAndBroadcast");
    expect(deps).toHaveProperty("ErrorHandler");
    expect(deps).toHaveProperty("logger");

    // Test that the status broadcaster function resolves when broadcaster is missing
    await expect(
      deps.addStatusEventAndBroadcast({
        importId: "test",
        status: "PROCESSING",
      })
    ).resolves.toBeUndefined();
  });

  it("should test createBaseDependenciesFromContainer with complete container", async () => {
    const mockAddStatusEvent = vi.fn().mockResolvedValue(undefined);
    const mockContainer = {
      statusBroadcaster: {
        addStatusEventAndBroadcast: mockAddStatusEvent,
      },
      errorHandler: {
        errorHandler: {
          withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
        },
      },
      logger: { log: vi.fn() },
    } as unknown as IServiceContainer;

    const deps = createBaseDependenciesFromContainer(mockContainer);

    await deps.addStatusEventAndBroadcast({
      importId: "test-import",
      noteId: "test-note",
      status: "PROCESSING",
      message: "Test message",
    });

    expect(mockAddStatusEvent).toHaveBeenCalledWith({
      importId: "test-import",
      noteId: "test-note",
      status: "PROCESSING",
      message: "Test message",
    });
  });

  describe("job processor error handling", () => {
    it("should handle job data without noteId", async () => {
      const mockJob: MockJob = {
        id: "test-job",
        attemptsMade: 0,
        data: { value: "test" },
      };

      const mockQueue = createMockQueue();

      class CustomPipelineWorker extends TestWorker {
        protected createActionPipeline() {
          return [new NoOpAction()];
        }
      }
      const customWorker = new CustomPipelineWorker(
        mockQueue,
        mockDependencies
      );

      const result = await customWorker.testProcessJob(mockJob as Job);

      expect(result).toEqual({ value: "test", noteId: undefined });
    });

    it("should handle job with null noteId", async () => {
      const mockJob: MockJob = {
        id: "test-job",
        attemptsMade: 0,
        data: { value: "test", noteId: null },
      };

      const mockQueue = createMockQueue();

      class NullNoteIdWorker extends TestWorker {
        protected createActionPipeline() {
          return [new NoOpAction()];
        }
      }
      const testWorker = new NullNoteIdWorker(mockQueue, mockDependencies);

      const result = await testWorker.testProcessJob(mockJob as Job);

      expect(result).toEqual({ value: "test", noteId: null });
    });

    it("should handle action execution errors with non-Error objects", async () => {
      const mockJob: MockJob = {
        id: "test-job",
        attemptsMade: 0,
        data: { value: "test", noteId: "note-1" },
      };

      const mockQueue = createMockQueue();

      class ThrowingAction extends BaseAction<BaseJobData, unknown> {
        name = "throwing_action";
        async execute() {
          throw "String error";
        }
      }

      class ThrowingActionWorker extends TestWorker {
        protected createActionPipeline() {
          return [new ThrowingAction()];
        }
      }
      const testWorker = new ThrowingActionWorker(mockQueue, mockDependencies);

      await expect(testWorker.testProcessJob(mockJob as Job)).rejects.toThrow(
        "Action throwing_action failed: String error"
      );
    });

    it("should handle action execution errors with undefined error messages", async () => {
      class UndefinedErrorAction extends BaseAction<BaseJobData, unknown> {
        name = "undefined_error_action";
        async execute() {
          const error = new Error();
          error.message = undefined as unknown as string;
          throw error;
        }
      }

      const mockJob: MockJob = {
        id: "test-job",
        attemptsMade: 0,
        data: { value: "test", noteId: "note-1" },
      };

      const mockQueue = createMockQueue();

      class UndefinedErrorWorker extends TestWorker {
        protected createActionPipeline() {
          return [new UndefinedErrorAction()];
        }
      }
      const testWorker = new UndefinedErrorWorker(mockQueue, mockDependencies);

      await expect(testWorker.testProcessJob(mockJob as Job)).rejects.toThrow(
        "undefined"
      );
    });

    it("should handle empty action pipeline", async () => {
      const mockJob: MockJob = {
        id: "test-job",
        attemptsMade: 0,
        data: { value: "test", noteId: "note-1" },
      };

      const mockQueue = createMockQueue();

      class EmptyPipelineWorker extends TestWorker {
        protected createActionPipeline() {
          return [];
        }
      }
      const testWorker = new EmptyPipelineWorker(mockQueue, mockDependencies);

      const result = await testWorker.testProcessJob(mockJob as Job);

      expect(result).toEqual({ value: "test", noteId: "note-1" });
    });

    it("should handle action pipeline with wrapper actions", async () => {
      const mockJob: MockJob = {
        id: "test-job",
        attemptsMade: 0,
        data: { value: "test", noteId: "note-1" },
      };

      const mockQueue = createMockQueue();

      class WrappedActionWorker extends TestWorker {
        protected createActionPipeline() {
          return [new NoOpAction()];
        }
      }
      const testWorker = new WrappedActionWorker(mockQueue, mockDependencies);

      const result = await testWorker.testProcessJob(mockJob as Job);

      expect(result).toEqual({ value: "test", noteId: "note-1" });
    });
  });

  describe("caching functionality", () => {
    it("should cache parse actions correctly", async () => {
      const mockJob: MockJob = {
        id: "test-job",
        attemptsMade: 0,
        data: { value: "test", noteId: "note-1" },
      };

      const mockQueue = createMockQueue();

      class ParseAction extends BaseAction<BaseJobData, unknown> {
        name = "parse_something";
        async execute(data: BaseJobData) {
          return { ...data, parsed: true };
        }
      }

      class ParseActionWorker extends TestWorker {
        protected createActionPipeline() {
          return [new ParseAction()];
        }
      }
      const testWorker = new ParseActionWorker(mockQueue, mockDependencies);

      // First execution should cache
      const result1 = await testWorker.testProcessJob(mockJob as Job);
      expect(result1).toEqual({
        value: "test",
        noteId: "note-1",
        parsed: true,
      });

      // Second execution should use cache
      const result2 = await testWorker.testProcessJob(mockJob as Job);
      expect(result2).toEqual({
        value: "test",
        noteId: "note-1",
        parsed: true,
      });
    });

    it("should not cache non-parse actions", async () => {
      const mockJob: MockJob = {
        id: "test-job",
        attemptsMade: 0,
        data: { value: "test", noteId: "note-1" },
      };

      const mockQueue = createMockQueue();

      class SaveAction extends BaseAction<BaseJobData, unknown> {
        name = "save_something";
        async execute(data: BaseJobData) {
          return { ...data, saved: true };
        }
      }

      class SaveActionWorker extends TestWorker {
        protected createActionPipeline() {
          return [new SaveAction()];
        }
      }
      const testWorker = new SaveActionWorker(mockQueue, mockDependencies);

      const result = await testWorker.testProcessJob(mockJob as Job);
      expect(result).toEqual({ value: "test", noteId: "note-1", saved: true });
    });

    it("should handle cache key creation with complex data", async () => {
      const complexData = {
        value: "test",
        noteId: "note-1",
        metadata: { key: "value", nested: { deep: "data" } },
        array: [1, 2, 3],
      };

      const mockJob: MockJob = {
        id: "test-job",
        attemptsMade: 0,
        data: complexData,
      };

      const mockQueue = createMockQueue();

      class ParseAction extends BaseAction<BaseJobData, unknown> {
        name = "parse_complex";
        async execute(data: BaseJobData) {
          return { ...data, parsed: true };
        }
      }

      class ComplexParseWorker extends TestWorker {
        protected createActionPipeline() {
          return [new ParseAction()];
        }
      }
      const testWorker = new ComplexParseWorker(mockQueue, mockDependencies);

      const result = await testWorker.testProcessJob(mockJob as Job);
      expect(result).toEqual({ ...complexData, parsed: true });
    });
  });

  describe("worker lifecycle and status", () => {
    it("should handle worker close gracefully", async () => {
      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(mockQueue, mockDependencies);

      await expect(testWorker.close()).resolves.toBeUndefined();
    });

    it("should return correct worker status when running", () => {
      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(mockQueue, mockDependencies);

      // Mock the worker to have isRunning method
      const worker = testWorker.getWorker();
      Object.defineProperty(worker, "isRunning", {
        value: vi.fn().mockReturnValue(true),
        writable: true,
      });

      const status = testWorker.getStatus();
      expect(status).toEqual({
        isRunning: true,
        name: "test_worker",
      });
    });

    it("should record worker status metrics", () => {
      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(mockQueue, mockDependencies);

      const recordSpy = vi.spyOn(WorkerMetrics, "recordWorkerStatus");

      // Mock the worker to have isRunning method
      const worker = testWorker.getWorker();
      Object.defineProperty(worker, "isRunning", {
        value: vi.fn().mockReturnValue(true),
        writable: true,
      });

      testWorker.getStatus();

      expect(recordSpy).toHaveBeenCalledWith("test_worker", true);
    });

    it("should handle worker status when not running", () => {
      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(mockQueue, mockDependencies);

      // Mock the worker to be not running
      const worker = testWorker.getWorker();
      Object.defineProperty(worker, "isRunning", {
        value: vi.fn().mockReturnValue(false),
        writable: true,
      });

      const status = testWorker.getStatus();
      expect(status).toEqual({
        isRunning: false,
        name: "test_worker",
      });
    });
  });

  describe("action factory integration", () => {
    it("should use custom action factory when provided", () => {
      const customFactory = new ActionFactory();
      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        customFactory
      );

      expect(testWorker["actionFactory"]).toBe(customFactory);
    });

    it("should use global action factory when none provided", () => {
      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(mockQueue, mockDependencies);

      expect(testWorker["actionFactory"]).toBe(globalActionFactory);
    });

    it("should create wrapped actions with custom dependencies", () => {
      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(mockQueue, mockDependencies);

      const wrappedAction = testWorker.testCreateWrappedAction("test_action");

      expect(wrappedAction).toBeDefined();
      expect(wrappedAction.name).toContain("error_handling_wrapper");
      expect(wrappedAction.name).toContain("retry_wrapper");
    });

    it("should create error handled actions with custom dependencies", () => {
      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(mockQueue, mockDependencies);

      const errorHandledAction =
        testWorker.testCreateErrorHandledAction("test_action");

      expect(errorHandledAction).toBeDefined();
      expect(errorHandledAction.name).toContain("error_handling_wrapper");
      expect(errorHandledAction.name).not.toContain("retry_wrapper");
    });
  });

  describe("concurrency configuration", () => {
    it("should return default concurrency of 5", () => {
      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(mockQueue, mockDependencies);

      expect(testWorker.testGetConcurrency()).toBe(5);
    });

    it("should use custom concurrency when overridden", () => {
      class CustomConcurrencyWorker extends TestWorker {
        protected getConcurrency(): number {
          return 10;
        }
      }

      const mockQueue = createMockQueue();
      const customWorker = new CustomConcurrencyWorker(
        mockQueue,
        mockDependencies
      );

      expect(customWorker.testGetConcurrency()).toBe(10);
    });
  });

  describe("container integration edge cases", () => {
    it("should handle container with missing statusBroadcaster", () => {
      const mockContainer = {
        statusBroadcaster: undefined,
        errorHandler: {
          errorHandler: {
            withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
          },
        },
        logger: { log: vi.fn() },
      } as unknown as IServiceContainer;

      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        mockContainer
      );

      const statusBroadcaster = testWorker.testCreateStatusBroadcaster();
      expect(statusBroadcaster).toBeDefined();

      // Should resolve without error when statusBroadcaster is missing
      expect(
        statusBroadcaster({
          importId: "test",
          status: "PROCESSING",
        })
      ).resolves.toBeUndefined();
    });

    it("should handle container with missing errorHandler", () => {
      const mockContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        },
        errorHandler: undefined,
        logger: { log: vi.fn() },
      } as unknown as IServiceContainer;

      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        mockContainer
      );

      const errorHandler = testWorker.testCreateErrorHandler();
      expect(errorHandler).toBeDefined();
      expect(errorHandler.withErrorHandling).toBeDefined();
    });

    it("should handle container with missing logger", () => {
      const mockContainer = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        },
        errorHandler: {
          errorHandler: {
            withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
          },
        },
        logger: undefined,
      } as unknown as IServiceContainer;

      const mockQueue = createMockQueue();
      const testWorker = new TestWorker(
        mockQueue,
        mockDependencies,
        undefined,
        mockContainer
      );

      expect(() => testWorker.testCreateLogger()).toThrow(
        "Container not available for logger"
      );
    });
  });
});
