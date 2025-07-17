import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ErrorHandlingWrapperAction,
  LogErrorAction,
  CaptureErrorAction,
  ErrorRecoveryAction,
  withErrorHandling,
  createErrorHandlingChain,
} from "../error-handling";
import { BaseAction } from "../../core/base-action";
import { createMockActionContext } from "../../__tests__/test-utils";
import type { ActionContext } from "../../core/types";

// ============================================================================
// TEST HELPERS
// ============================================================================

class DummyAction extends BaseAction<
  { value: string; noteId?: string },
  { logger: { log: (msg: string) => void } }
> {
  name = "dummy_action";
  async execute(
    data: { value: string },
    deps: { logger: { log: (msg: string) => void } },
    context: ActionContext
  ) {
    deps.logger.log(`DummyAction executed for job ${context.jobId}`);
    return { ...data, processed: true };
  }
}

// ============================================================================
// ErrorHandlingWrapperAction
// ============================================================================

describe("ErrorHandlingWrapperAction", () => {
  let dummyAction: DummyAction;
  let wrapper: ErrorHandlingWrapperAction;
  let mockErrorHandler: { withErrorHandling: ReturnType<typeof vi.fn> };
  let context: ActionContext;
  let data: { value: string; noteId?: string };
  let deps: {
    ErrorHandler: { withErrorHandling: ReturnType<typeof vi.fn> };
    logger: { log: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    dummyAction = new DummyAction();
    wrapper = new ErrorHandlingWrapperAction(dummyAction);
    mockErrorHandler = {
      withErrorHandling: vi.fn().mockImplementation(async (op) => op()),
    };
    context = createMockActionContext();
    data = { value: "test", noteId: "note-123" };
    deps = { ErrorHandler: mockErrorHandler, logger: { log: vi.fn() } };
  });

  it("should wrap the action and delegate execution", async () => {
    const result = await wrapper.execute(data, deps, context);
    expect(result).toEqual({
      value: "test",
      noteId: "note-123",
      processed: true,
    });
    expect(mockErrorHandler.withErrorHandling).toHaveBeenCalled();
    expect(deps.logger.log).toHaveBeenCalledWith(
      `DummyAction executed for job test-job-123`
    );
  });

  it("should pass correct context to error handler", async () => {
    await wrapper.execute(data, deps, context);
    const call = mockErrorHandler.withErrorHandling.mock.calls[0];
    expect(call?.[1]).toMatchObject({
      jobId: context.jobId,
      operation: expect.stringContaining("dummy_action"),
      noteId: data.noteId,
    });
  });

  it("should propagate errors from wrapped action", async () => {
    dummyAction.execute = vi.fn().mockRejectedValue(new Error("fail!"));
    mockErrorHandler.withErrorHandling = vi
      .fn()
      .mockImplementation(async (op) => {
        return await op();
      });
    await expect(wrapper.execute(data, deps, context)).rejects.toThrow("fail!");
  });
});

// ============================================================================
// LogErrorAction
// ============================================================================

describe("LogErrorAction", () => {
  let action: LogErrorAction;
  let context: ActionContext;
  let error: Error;
  let data: { error: Error; noteId?: string };
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    action = new LogErrorAction();
    context = createMockActionContext();
    error = new Error("Something went wrong");
    data = { error, noteId: "note-123" };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log error to console and return data", async () => {
    const result = await action.execute(data, {}, context);
    expect(result).toBe(data);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error in"),
      "Something went wrong"
    );
  });

  it("should not be retryable", () => {
    expect(action.retryable).toBe(false);
  });
});

// ============================================================================
// CaptureErrorAction
// ============================================================================

describe("CaptureErrorAction", () => {
  let action: CaptureErrorAction;
  let context: ActionContext;
  let error: Error;
  let data: { error: Error; noteId?: string };
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    action = new CaptureErrorAction();
    context = createMockActionContext();
    error = new Error("Capture this!");
    data = { error, noteId: "note-123" };
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log captured error info and return data", async () => {
    const result = await action.execute(data, {}, context);
    expect(result).toBe(data);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Captured error:"),
      expect.stringContaining("Capture this!")
    );
  });

  it("should not be retryable", () => {
    expect(action.retryable).toBe(false);
  });
});

// ============================================================================
// ErrorRecoveryAction
// ============================================================================

describe("ErrorRecoveryAction", () => {
  let action: ErrorRecoveryAction;
  let context: ActionContext;
  let data: { error: Error; noteId?: string };
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    action = new ErrorRecoveryAction();
    context = createMockActionContext();
    data = { error: new Error("fail"), noteId: "note-123" };
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should log recovery for validation error", async () => {
    data.error.name = "ValidationError";
    await action.execute(data, {}, context);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Recovering from validation error in test_operation"
    );
  });

  it("should log recovery for network error", async () => {
    data.error.name = "NetworkError";
    await action.execute(data, {}, context);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Recovering from network error in test_operation"
    );
  });

  it("should log no recovery for unknown error type", async () => {
    data.error.name = "OtherError";
    await action.execute(data, {}, context);
    expect(consoleSpy).toHaveBeenCalledWith(
      "No recovery strategy for error type: OtherError"
    );
  });

  it("should be retryable", () => {
    expect(action.retryable).toBe(true);
  });
});

// ============================================================================
// withErrorHandling helper
// ============================================================================

describe("withErrorHandling", () => {
  it("should attach custom error handler if provided", () => {
    const dummy = new DummyAction();
    const customHandler = vi.fn();
    const wrapped = withErrorHandling(dummy, customHandler);
    expect(wrapped).toBeInstanceOf(ErrorHandlingWrapperAction);
    expect(dummy.onError).toBe(customHandler);
  });

  it("should return an ErrorHandlingWrapperAction", () => {
    const dummy = new DummyAction();
    const wrapped = withErrorHandling(dummy);
    expect(wrapped).toBeInstanceOf(ErrorHandlingWrapperAction);
  });
});

// ============================================================================
// createErrorHandlingChain helper
// ============================================================================

describe("createErrorHandlingChain", () => {
  it("should return a chain of LogErrorAction, CaptureErrorAction, ErrorRecoveryAction", () => {
    const chain = createErrorHandlingChain("note-123");
    expect(chain).toHaveLength(3);
    expect(chain[0]).toBeInstanceOf(LogErrorAction);
    expect(chain[1]).toBeInstanceOf(CaptureErrorAction);
    expect(chain[2]).toBeInstanceOf(ErrorRecoveryAction);
  });
});
