import { describe, it, expect, vi, beforeEach } from "vitest";
import { BroadcastStatusAction } from "../../broadcast-status";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";

// Helper for common deps
function makeDeps() {
  return {
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
  };
}

describe("BroadcastStatusAction", () => {
  let action: BroadcastStatusAction;
  let deps: ReturnType<typeof makeDeps>;
  let context: ActionContext;
  let data: {
    importId: string;
    noteId?: string;
    status: string;
    message: string;
    context?: string;
  };

  beforeEach(() => {
    action = new BroadcastStatusAction();
    deps = makeDeps();
    context = createMockActionContext();
    data = {
      importId: "import-1",
      noteId: "note-1",
      status: "CUSTOM",
      message: "A message",
      context: "custom-context",
    };
  });

  it("calls addStatusEventAndBroadcast with correct args", async () => {
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-1",
      noteId: "note-1",
      status: "CUSTOM",
      message: "A message",
      context: "custom-context",
    });
  });

  it("uses context.operation if context missing in data", async () => {
    delete data.context;
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ context: context.operation })
    );
  });
});
