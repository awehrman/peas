import { describe, it, expect, vi } from "vitest";
import {
  withErrorHandling,
  ErrorHandlingWrapperAction,
} from "../../error-handling";
import { BaseAction } from "../../../core/base-action";
import type { ActionContext } from "../../../core/types";

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
