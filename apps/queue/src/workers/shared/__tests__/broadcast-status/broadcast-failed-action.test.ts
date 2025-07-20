import { describe, it, expect, vi, beforeEach } from "vitest";
import { BroadcastFailedAction } from "../../broadcast-status";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";

// Helper for common deps
function makeDeps() {
  return {
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
  };
}

describe("BroadcastFailedAction", () => {
  let action: BroadcastFailedAction;
  let deps: ReturnType<typeof makeDeps>;
  let context: ActionContext;
  let data: { importId: string; noteId?: string; error?: string };

  beforeEach(() => {
    action = new BroadcastFailedAction();
    deps = makeDeps();
    context = createMockActionContext();
    data = { importId: "import-4", noteId: "note-4", error: "fail msg" };
  });

  it("broadcasts failed status with error message", async () => {
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-4",
      noteId: "note-4",
      status: "FAILED",
      message: "fail msg",
      context: context.operation,
    });
  });

  it("uses default message if error not provided", async () => {
    delete data.error;
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        importId: "import-4",
        message: expect.stringContaining("failed"),
      })
    );
  });
});
