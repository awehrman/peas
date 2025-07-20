import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CaptureErrorAction } from "../../error-handling";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";

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
