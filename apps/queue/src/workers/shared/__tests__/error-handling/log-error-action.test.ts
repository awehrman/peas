import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LogErrorAction } from "../../error-handling";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";

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
