import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorRecoveryAction } from "../../error-handling";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";

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
