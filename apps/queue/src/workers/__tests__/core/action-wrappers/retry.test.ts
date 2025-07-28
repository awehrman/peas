import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createConsoleSpies,
  createMockActionContext,
  createMockLogger,
} from "../../../../test-utils/helpers";
import { ActionName } from "../../../../types";
import { ActionFactory } from "../../../core/action-factory";
import {
  DEFAULT_RETRY_CONFIG,
  RetryAction,
  type RetryConfig,
  type RetryData,
  type RetryDeps,
  createRetryWrapper,
  wrapActionWithRetryAndErrorHandling,
  wrapActionWithRetryAndErrorHandlingFactory,
} from "../../../core/action-wrappers/retry";
import { BaseAction } from "../../../core/base-action";
import type { ActionContext } from "../../../core/types";
import type { BaseJobData } from "../../../types";

// Test action that succeeds on first try
class SuccessAction extends BaseAction<
  BaseJobData,
  { logger: { log: ReturnType<typeof vi.fn> } }
> {
  name = ActionName.NO_OP;

  async execute(
    data: BaseJobData,
    _deps: { logger: { log: ReturnType<typeof vi.fn> } },
    _context: ActionContext
  ): Promise<BaseJobData> {
    return { ...data, metadata: { ...data.metadata, success: true } };
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

// Test action that fails consistently
class FailureAction extends BaseAction<
  BaseJobData,
  { logger: { log: ReturnType<typeof vi.fn> } }
> {
  name = ActionName.VALIDATION;

  async execute(
    _data: BaseJobData,
    _deps: { logger: { log: ReturnType<typeof vi.fn> } },
    _context: ActionContext
  ): Promise<BaseJobData> {
    throw new Error("Persistent failure");
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

// Test action that succeeds after a few failures
class EventuallySuccessAction extends BaseAction<
  BaseJobData,
  { logger: { log: ReturnType<typeof vi.fn> } }
> {
  name = ActionName.LOGGING;
  private attemptCount = 0;
  private successAfterAttempts: number;

  constructor(successAfterAttempts: number = 2) {
    super();
    this.successAfterAttempts = successAfterAttempts;
  }

  async execute(
    data: BaseJobData,
    _deps: { logger: { log: ReturnType<typeof vi.fn> } },
    _context: ActionContext
  ): Promise<BaseJobData> {
    this.attemptCount++;
    if (this.attemptCount >= this.successAfterAttempts) {
      return {
        ...data,
        metadata: {
          ...data.metadata,
          success: true,
          attempts: this.attemptCount,
        },
      };
    }
    throw new Error(`Attempt ${this.attemptCount} failed`);
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

describe("RetryAction", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockDeps: { logger: { log: ReturnType<typeof vi.fn> } };
  let mockContext: ActionContext;
  let mockData: BaseJobData;
  let consoleSpies: ReturnType<typeof createConsoleSpies>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockDeps = { logger: mockLogger };
    mockContext = createMockActionContext();
    mockData = { jobId: "test-123" } as BaseJobData;
    consoleSpies = createConsoleSpies();
  });

  afterEach(() => {
    consoleSpies.restore();
  });

  describe("constructor", () => {
    it("should create retry action with default configuration", () => {
      const action = new SuccessAction();
      const retryAction = new RetryAction(action);

      expect(retryAction).toBeInstanceOf(RetryAction);
      expect(retryAction.name).toBe(ActionName.RETRY_WRAPPER);
    });

    it("should create retry action with custom configuration", () => {
      const action = new SuccessAction();
      const retryAction = new RetryAction(action, 5, 2000);

      expect(retryAction).toBeInstanceOf(RetryAction);
      expect(retryAction.name).toBe(ActionName.RETRY_WRAPPER);
    });

    it("should wrap the provided action", () => {
      const originalAction = new SuccessAction();
      const retryAction = new RetryAction(originalAction);

      expect(retryAction).toBeInstanceOf(BaseAction);
    });
  });

  describe("execute", () => {
    it("should execute wrapped action successfully on first try", async () => {
      const originalAction = new SuccessAction();
      const retryAction = new RetryAction(originalAction);

      const result = await retryAction.execute(mockData, mockDeps, mockContext);

      expect(result).toEqual({
        jobId: "test-123",
        metadata: { success: true },
      });
    });

    it("should retry failed action and eventually succeed", async () => {
      const originalAction = new EventuallySuccessAction(2);
      const retryAction = new RetryAction(originalAction, 3, 10); // Short delay for testing

      const result = await retryAction.execute(mockData, mockDeps, mockContext);

      expect(result).toEqual({
        jobId: "test-123",
        metadata: { success: true, attempts: 2 },
      });
    });

    it("should throw error after max retries exceeded", async () => {
      const originalAction = new FailureAction();
      const retryAction = new RetryAction(originalAction, 2, 10); // Short delay for testing

      await expect(
        retryAction.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Persistent failure");
    });

    it("should log retry attempts", async () => {
      const originalAction = new EventuallySuccessAction(2);
      const retryAction = new RetryAction(originalAction, 3, 10);

      await retryAction.execute(mockData, mockDeps, mockContext);

      expect(consoleSpies.warnSpy).toHaveBeenCalledWith(
        "Retrying action retry_wrapper for job test-job-id (attempt 1/3) due to error:",
        "Attempt 1 failed"
      );
    });

    it("should handle non-Error objects thrown by action", async () => {
      const throwingAction = new (class extends BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } }
      > {
        name = ActionName.NO_OP;

        async execute(
          _data: BaseJobData,
          _deps: { logger: { log: ReturnType<typeof vi.fn> } },
          _context: ActionContext
        ): Promise<BaseJobData> {
          throw "String error";
        }

        validateInput(_data: BaseJobData): Error | null {
          return null;
        }
      })();

      const retryAction = new RetryAction(throwingAction, 1, 10);

      await expect(
        retryAction.execute(mockData, mockDeps, mockContext)
      ).rejects.toBe("String error");

      expect(consoleSpies.warnSpy).toHaveBeenCalledWith(
        "Retrying action retry_wrapper for job test-job-id (attempt 1/1) due to error:",
        "String error"
      );
    });
  });

  describe("executeWithTiming", () => {
    it("should delegate to wrapped action's executeWithTiming", async () => {
      const originalAction = new SuccessAction();
      const retryAction = new RetryAction(originalAction);

      const result = await retryAction.executeWithTiming(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        jobId: "test-123",
        metadata: { success: true },
      });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should handle errors in executeWithTiming", async () => {
      const originalAction = new FailureAction();
      const retryAction = new RetryAction(originalAction, 1, 10);

      const result = await retryAction.executeWithTiming(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Persistent failure");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("withConfig", () => {
    it("should create new wrapper with configured action", () => {
      const originalAction = new SuccessAction();
      const retryAction = new RetryAction(originalAction);

      const configuredAction = retryAction.withConfig({
        retryable: false,
        priority: 10,
      });

      expect(configuredAction).toBeInstanceOf(RetryAction);
      expect(configuredAction).not.toBe(retryAction);
    });

    it("should preserve retry functionality in configured action", async () => {
      const originalAction = new EventuallySuccessAction(2);
      const retryAction = new RetryAction(originalAction, 3, 10);

      const configuredAction = retryAction.withConfig({ retryable: false });

      const result = await configuredAction.execute(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result).toEqual({
        jobId: "test-123",
        metadata: { success: true, attempts: 2 },
      });
    });
  });
});

describe("wrapActionWithRetryAndErrorHandling", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockDeps: { logger: { log: ReturnType<typeof vi.fn> } };
  let mockContext: ActionContext;
  let mockData: BaseJobData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockDeps = { logger: mockLogger };
    mockContext = createMockActionContext();
    mockData = { jobId: "test-123" } as BaseJobData;
  });

  it("should wrap action with retry and error handling", () => {
    const originalAction = new SuccessAction();
    const wrappedAction = wrapActionWithRetryAndErrorHandling(originalAction);

    expect(wrappedAction).toBeInstanceOf(RetryAction);
    expect(wrappedAction.name).toBe(ActionName.RETRY_WRAPPER);
  });

  it("should preserve original action functionality", async () => {
    const originalAction = new SuccessAction();
    const wrappedAction = wrapActionWithRetryAndErrorHandling(originalAction);

    const result = await wrappedAction.execute(mockData, mockDeps, mockContext);

    expect(result).toEqual({
      jobId: "test-123",
      metadata: { success: true },
    });
  });

  it("should retry failed actions", async () => {
    const originalAction = new EventuallySuccessAction(2);
    const wrappedAction = wrapActionWithRetryAndErrorHandling(originalAction);

    const result = await wrappedAction.execute(mockData, mockDeps, mockContext);

    expect(result).toEqual({
      jobId: "test-123",
      metadata: { success: true, attempts: 2 },
    });
  });
});

describe("wrapActionWithRetryAndErrorHandlingFactory", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockDeps: { logger: { log: ReturnType<typeof vi.fn> } };
  let mockContext: ActionContext;
  let mockData: BaseJobData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockDeps = { logger: mockLogger };
    mockContext = createMockActionContext();
    mockData = { jobId: "test-123" } as BaseJobData;
  });

  it("should create retry wrapper from factory", () => {
    const actionFactory = new ActionFactory<
      BaseJobData,
      { logger: { log: ReturnType<typeof vi.fn> } }
    >();
    actionFactory.register(ActionName.NO_OP, () => new SuccessAction());

    const wrappedAction = wrapActionWithRetryAndErrorHandlingFactory(
      actionFactory,
      ActionName.NO_OP
    );

    expect(wrappedAction).toBeInstanceOf(RetryAction);
  });

  it("should execute wrapped action from factory", async () => {
    const actionFactory = new ActionFactory<
      BaseJobData,
      { logger: { log: ReturnType<typeof vi.fn> } }
    >();
    actionFactory.register(ActionName.NO_OP, () => new SuccessAction());

    const wrappedAction = wrapActionWithRetryAndErrorHandlingFactory(
      actionFactory,
      ActionName.NO_OP
    );

    const result = await wrappedAction.execute(mockData, mockDeps, mockContext);

    expect(result).toEqual({
      jobId: "test-123",
      metadata: { success: true },
    });
  });

  it("should retry failed actions from factory", async () => {
    const actionFactory = new ActionFactory<
      BaseJobData,
      { logger: { log: ReturnType<typeof vi.fn> } }
    >();
    actionFactory.register(
      ActionName.LOGGING,
      () => new EventuallySuccessAction(2)
    );

    const wrappedAction = wrapActionWithRetryAndErrorHandlingFactory(
      actionFactory,
      ActionName.LOGGING
    );

    const result = await wrappedAction.execute(mockData, mockDeps, mockContext);

    expect(result).toEqual({
      jobId: "test-123",
      metadata: { success: true, attempts: 2 },
    });
  });
});

describe("createRetryWrapper", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockDeps: RetryDeps;
  let mockContext: ActionContext;
  let mockData: RetryData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockDeps = { logger: mockLogger };
    mockContext = createMockActionContext();
    mockData = { jobId: "test-123" } as RetryData;
  });

  it("should create retry wrapper with default configuration", () => {
    const action = new SuccessAction();
    const retryWrapper = createRetryWrapper<RetryData, RetryDeps>(
      DEFAULT_RETRY_CONFIG
    );
    const wrappedAction = retryWrapper(action);

    expect(wrappedAction).toBeDefined();
    expect(typeof wrappedAction.execute).toBe("function");
  });

  it("should execute action successfully on first try", async () => {
    const action = new SuccessAction();
    const retryWrapper = createRetryWrapper<RetryData, RetryDeps>(
      DEFAULT_RETRY_CONFIG
    );
    const wrappedAction = retryWrapper(action);

    const result = await wrappedAction.execute(mockData, mockDeps, mockContext);

    expect(result).toEqual({
      jobId: "test-123",
      metadata: { success: true },
    });
  });

  it("should retry failed action with exponential backoff", async () => {
    const action = new EventuallySuccessAction(2);
    const retryConfig: RetryConfig = {
      maxRetries: 3,
      backoffMs: 10,
      backoffMultiplier: 2,
      maxBackoffMs: 100,
    };
    const retryWrapper = createRetryWrapper<RetryData, RetryDeps>(retryConfig);
    const wrappedAction = retryWrapper(action);

    const result = await wrappedAction.execute(mockData, mockDeps, mockContext);

    expect(result).toEqual({
      jobId: "test-123",
      metadata: { success: true, attempts: 2 },
    });
  });

  it("should throw error after max retries exceeded", async () => {
    const action = new FailureAction();
    const retryConfig: RetryConfig = {
      maxRetries: 1,
      backoffMs: 10,
      backoffMultiplier: 2,
      maxBackoffMs: 100,
    };
    const retryWrapper = createRetryWrapper<RetryData, RetryDeps>(retryConfig);
    const wrappedAction = retryWrapper(action);

    await expect(
      wrappedAction.execute(mockData, mockDeps, mockContext)
    ).rejects.toThrow("Persistent failure");
  });

  it("should log retry attempts when logger is available", async () => {
    const action = new EventuallySuccessAction(2);
    const retryConfig: RetryConfig = {
      maxRetries: 3,
      backoffMs: 10,
      backoffMultiplier: 2,
      maxBackoffMs: 100,
    };
    const retryWrapper = createRetryWrapper<RetryData, RetryDeps>(retryConfig);
    const wrappedAction = retryWrapper(action);

    await wrappedAction.execute(mockData, mockDeps, mockContext);

    expect(mockLogger.log).toHaveBeenCalledWith(
      "[RETRY] Action logging failed (attempt 1/4), retrying in 10ms: Attempt 1 failed"
    );
  });

  it("should handle missing logger gracefully", async () => {
    const action = new EventuallySuccessAction(2);
    const retryConfig: RetryConfig = {
      maxRetries: 3,
      backoffMs: 10,
      backoffMultiplier: 2,
      maxBackoffMs: 100,
    };
    const retryWrapper = createRetryWrapper<RetryData, RetryDeps>(retryConfig);
    const wrappedAction = retryWrapper(action);
    const depsWithoutLogger = {} as RetryDeps;

    const result = await wrappedAction.execute(
      mockData,
      depsWithoutLogger,
      mockContext
    );

    expect(result).toEqual({
      jobId: "test-123",
      metadata: { success: true, attempts: 2 },
    });
  });

  it("should respect max backoff limit", async () => {
    const action = new EventuallySuccessAction(3);
    const retryConfig: RetryConfig = {
      maxRetries: 5,
      backoffMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 50, // Should cap at 50ms
    };
    const retryWrapper = createRetryWrapper<RetryData, RetryDeps>(retryConfig);
    const wrappedAction = retryWrapper(action);

    const startTime = Date.now();
    await wrappedAction.execute(mockData, mockDeps, mockContext);
    const endTime = Date.now();

    // Should complete within reasonable time (not waiting full backoff)
    expect(endTime - startTime).toBeLessThan(200);
  });
});

describe("DEFAULT_RETRY_CONFIG", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_RETRY_CONFIG).toEqual({
      maxRetries: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 10000,
    });
  });
});
