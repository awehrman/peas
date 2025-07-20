import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorHandlingWrapperAction } from "../../error-handling";
import { BaseAction } from "../../../core/base-action";
import { createMockActionContext } from "../../../__tests__/test-utils";
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
