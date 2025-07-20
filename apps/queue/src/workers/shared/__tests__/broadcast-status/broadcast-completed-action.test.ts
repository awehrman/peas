import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BroadcastCompletedAction } from "../../broadcast-status";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";

// Helper for common deps
function makeDeps() {
  return {
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
  };
}

describe("BroadcastCompletedAction", () => {
  let action: BroadcastCompletedAction;
  let deps: ReturnType<typeof makeDeps>;
  let context: ActionContext;
  let data: { importId: string; noteId?: string; message?: string };
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    action = new BroadcastCompletedAction();
    deps = makeDeps();
    context = createMockActionContext();
    data = { importId: "import-3", noteId: "note-3", message: "Done!" };
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("broadcasts completed status if noteId present", async () => {
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-3",
      noteId: "note-3",
      status: "COMPLETED",
      message: "Done!",
      context: context.operation,
    });
  });

  it("uses default message if not provided", async () => {
    delete data.message;
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        importId: "import-3",
        message: expect.stringContaining("completed successfully"),
      })
    );
  });

  it("always broadcasts with importId", async () => {
    delete data.noteId;
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-3",
      noteId: undefined,
      status: "COMPLETED",
      message: "Done!",
      context: context.operation,
    });
  });
});
