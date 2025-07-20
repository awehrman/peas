import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BroadcastProcessingAction } from "../../broadcast-status";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";

// Helper for common deps
function makeDeps() {
  return {
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
  };
}

describe("BroadcastProcessingAction", () => {
  let action: BroadcastProcessingAction;
  let deps: ReturnType<typeof makeDeps>;
  let context: ActionContext;
  let data: { importId: string; noteId?: string; message?: string };
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    action = new BroadcastProcessingAction();
    deps = makeDeps();
    context = createMockActionContext();
    data = { importId: "import-2", noteId: "note-2", message: "Processing..." };
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("broadcasts processing status if noteId present", async () => {
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-2",
      noteId: "note-2",
      status: "PROCESSING",
      message: "Processing...",
      context: context.operation,
    });
  });

  it("uses default message if not provided", async () => {
    delete data.message;
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        importId: "import-2",
        message: expect.stringContaining("in progress"),
      })
    );
  });

  it("always broadcasts with importId", async () => {
    delete data.noteId;
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-2",
      noteId: undefined,
      status: "PROCESSING",
      message: "Processing...",
      context: context.operation,
    });
  });
});
