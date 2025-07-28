import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createConsoleSpies,
  createMockActionContext,
  createMockLogger,
} from "../../../../test-utils/helpers";
import { ActionName } from "../../../../types";
import { ActionFactory } from "../../../core/action-factory";
import {
  ErrorHandlingAction,
  wrapActionWithErrorHandlingFactory,
  wrapActionWithErrorHandlingOnly,
} from "../../../core/action-wrappers/error-handling";
import { BaseAction } from "../../../core/base-action";
import type { ActionContext } from "../../../core/types";
import type { BaseJobData } from "../../../types";

// Test action that succeeds
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

// Test action that throws an error
class ErrorAction extends BaseAction<
  BaseJobData,
  { logger: { log: ReturnType<typeof vi.fn> } }
> {
  name = ActionName.VALIDATION;

  async execute(
    _data: BaseJobData,
    _deps: { logger: { log: ReturnType<typeof vi.fn> } },
    _context: ActionContext
  ): Promise<BaseJobData> {
    throw new Error("Test error");
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

// Test action with custom error handler
class CustomErrorAction extends BaseAction<
  BaseJobData,
  { logger: { log: ReturnType<typeof vi.fn> } }
> {
  name = ActionName.LOGGING;
  public errorHandled = false;

  async execute(
    _data: BaseJobData,
    _deps: { logger: { log: ReturnType<typeof vi.fn> } },
    _context: ActionContext
  ): Promise<BaseJobData> {
    throw new Error("Custom error");
  }

  async onError(
    _error: Error,
    _data: BaseJobData,
    _deps: { logger: { log: ReturnType<typeof vi.fn> } },
    _context: ActionContext
  ): Promise<void> {
    this.errorHandled = true;
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

describe("ErrorHandlingAction", () => {
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
    it("should create error handling action with correct name", () => {
      const action = new SuccessAction();
      const errorHandlingAction = new ErrorHandlingAction(action);

      expect(errorHandlingAction).toBeInstanceOf(ErrorHandlingAction);
      expect(errorHandlingAction.name).toBe(ActionName.ERROR_HANDLING);
    });

    it("should wrap the provided action", () => {
      const originalAction = new SuccessAction();
      const errorHandlingAction = new ErrorHandlingAction(originalAction);

      expect(errorHandlingAction).toBeInstanceOf(BaseAction);
    });
  });

  describe("execute", () => {
    it("should execute wrapped action successfully", async () => {
      const originalAction = new SuccessAction();
      const errorHandlingAction = new ErrorHandlingAction(originalAction);

      const result = await errorHandlingAction.execute(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result).toEqual({
        jobId: "test-123",
        metadata: { success: true },
      });
    });

    it("should throw error when wrapped action fails", async () => {
      const originalAction = new ErrorAction();
      const errorHandlingAction = new ErrorHandlingAction(originalAction);

      await expect(
        errorHandlingAction.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Test error");
    });

    it("should call custom onError handler when action fails", async () => {
      const originalAction = new CustomErrorAction();
      const errorHandlingAction = new ErrorHandlingAction(originalAction);

      await expect(
        errorHandlingAction.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Custom error");

      expect(originalAction.errorHandled).toBe(true);
    });

    it("should log error to console when no custom error handler exists", async () => {
      const originalAction = new ErrorAction();
      const errorHandlingAction = new ErrorHandlingAction(originalAction);

      await expect(
        errorHandlingAction.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Test error");

      expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
        "Action error_handling failed for job test-job-id:",
        "Test error"
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

      const errorHandlingAction = new ErrorHandlingAction(throwingAction);

      await expect(
        errorHandlingAction.execute(mockData, mockDeps, mockContext)
      ).rejects.toBe("String error");

      expect(consoleSpies.errorSpy).toHaveBeenCalledWith(
        "Action error_handling failed for job test-job-id:",
        "String error"
      );
    });
  });

  describe("executeWithTiming", () => {
    it("should delegate to wrapped action's executeWithTiming", async () => {
      const originalAction = new SuccessAction();
      const errorHandlingAction = new ErrorHandlingAction(originalAction);

      const result = await errorHandlingAction.executeWithTiming(
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
      const originalAction = new ErrorAction();
      const errorHandlingAction = new ErrorHandlingAction(originalAction);

      const result = await errorHandlingAction.executeWithTiming(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Test error");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("withConfig", () => {
    it("should create new wrapper with configured action", () => {
      const originalAction = new SuccessAction();
      const errorHandlingAction = new ErrorHandlingAction(originalAction);

      const configuredAction = errorHandlingAction.withConfig({
        retryable: false,
        priority: 10,
      });

      expect(configuredAction).toBeInstanceOf(ErrorHandlingAction);
      expect(configuredAction).not.toBe(errorHandlingAction);
    });

    it("should preserve error handling functionality in configured action", async () => {
      const originalAction = new ErrorAction();
      const errorHandlingAction = new ErrorHandlingAction(originalAction);

      const configuredAction = errorHandlingAction.withConfig({
        retryable: false,
      });

      await expect(
        configuredAction.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Test error");

      expect(consoleSpies.errorSpy).toHaveBeenCalled();
    });
  });
});

describe("wrapActionWithErrorHandlingOnly", () => {
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

  it("should wrap action with error handling", () => {
    const originalAction = new SuccessAction();
    const wrappedAction = wrapActionWithErrorHandlingOnly(originalAction);

    expect(wrappedAction).toBeInstanceOf(ErrorHandlingAction);
    expect(wrappedAction.name).toBe(ActionName.ERROR_HANDLING);
  });

  it("should preserve original action functionality", async () => {
    const originalAction = new SuccessAction();
    const wrappedAction = wrapActionWithErrorHandlingOnly(originalAction);

    const result = await wrappedAction.execute(mockData, mockDeps, mockContext);

    expect(result).toEqual({
      jobId: "test-123",
      metadata: { success: true },
    });
  });

  it("should handle errors from wrapped action", async () => {
    const originalAction = new ErrorAction();
    const wrappedAction = wrapActionWithErrorHandlingOnly(originalAction);

    await expect(
      wrappedAction.execute(mockData, mockDeps, mockContext)
    ).rejects.toThrow("Test error");
  });
});

describe("wrapActionWithErrorHandlingFactory", () => {
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

  it("should create error handling wrapper from factory", () => {
    const actionFactory = new ActionFactory<
      BaseJobData,
      { logger: { log: ReturnType<typeof vi.fn> } }
    >();
    actionFactory.register(ActionName.NO_OP, () => new SuccessAction());

    const wrappedAction = wrapActionWithErrorHandlingFactory(
      actionFactory,
      ActionName.NO_OP
    );

    expect(wrappedAction).toBeInstanceOf(ErrorHandlingAction);
  });

  it("should execute wrapped action from factory", async () => {
    const actionFactory = new ActionFactory<
      BaseJobData,
      { logger: { log: ReturnType<typeof vi.fn> } }
    >();
    actionFactory.register(ActionName.NO_OP, () => new SuccessAction());

    const wrappedAction = wrapActionWithErrorHandlingFactory(
      actionFactory,
      ActionName.NO_OP
    );

    const result = await wrappedAction.execute(mockData, mockDeps, mockContext);

    expect(result).toEqual({
      jobId: "test-123",
      metadata: { success: true },
    });
  });

  it("should handle errors from factory-created action", async () => {
    const actionFactory = new ActionFactory<
      BaseJobData,
      { logger: { log: ReturnType<typeof vi.fn> } }
    >();
    actionFactory.register(ActionName.VALIDATION, () => new ErrorAction());

    const wrappedAction = wrapActionWithErrorHandlingFactory(
      actionFactory,
      ActionName.VALIDATION
    );

    await expect(
      wrappedAction.execute(mockData, mockDeps, mockContext)
    ).rejects.toThrow("Test error");
  });
});
