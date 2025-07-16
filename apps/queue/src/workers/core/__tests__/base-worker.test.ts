import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  BaseWorker,
  createBaseDependenciesFromContainer,
} from "../base-worker";
import { BaseAction, NoOpAction } from "../base-action";
import { ActionFactory } from "../action-factory";
import {
  createMockServiceContainer,
  createMockActionContext,
} from "../../__tests__/test-utils";
import type { ActionContext } from "../types";
import type { IServiceContainer } from "../../../services/container";

// ============================================================================
// TEST HELPERS
// ============================================================================

// Concrete implementation of BaseWorker for testing
class TestWorker extends BaseWorker<
  { value: string; noteId?: string },
  {
    logger: { log: (msg: string) => void };
    addStatusEventAndBroadcast: (event: any) => Promise<void>;
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
  }) as any;

// ============================================================================
// BASE WORKER TESTS
// ============================================================================

describe("BaseWorker", () => {
  let worker: TestWorker;
  let mockQueue: ReturnType<typeof createMockQueue>;
  let mockDependencies: {
    logger: { log: ReturnType<typeof vi.fn> };
    addStatusEventAndBroadcast: (event: any) => Promise<void>;
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
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
      });

      expect(mockAddStatusEvent).toHaveBeenCalledWith({
        noteId: "test-note",
        status: "PROCESSING",
        message: "Test message",
      });
    });

    it("should resolve when status broadcaster not available", async () => {
      mockContainer.statusBroadcaster.addStatusEventAndBroadcast =
        undefined as any;
      const broadcaster = worker.testCreateStatusBroadcaster();

      await expect(
        broadcaster({
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
      expect(actions[0].name).toBe("broadcast_processing");
      expect(actions[1].name).toBe("broadcast_completed");
    });

    it("should add status actions even without noteId", () => {
      const actions: BaseAction<unknown, unknown>[] = [];
      const data = { value: "test" };

      worker.testAddStatusActions(actions, data);

      expect(actions).toHaveLength(2);
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
      expect(actions[0].name).toBe("broadcast_processing");
      expect(actions[1].name).toBe("no_op");
      expect(actions[2].name).toBe("broadcast_completed");
    });
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
      undefined as any;
    const deps = createBaseDependenciesFromContainer(mockContainer);
    await expect(
      deps.addStatusEventAndBroadcast({
        noteId: "test-note",
        status: "PROCESSING",
      })
    ).resolves.toBeUndefined();
  });

  it("should provide fallback error handler when container error handler not available", () => {
    mockContainer.errorHandler.errorHandler = undefined as any;
    const deps = createBaseDependenciesFromContainer(mockContainer);
    expect(deps.ErrorHandler).toBeDefined();
    expect(typeof deps.ErrorHandler.withErrorHandling).toBe("function");
  });
});
