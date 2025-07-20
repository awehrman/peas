import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStatusAction } from "../../broadcast-status";
import { createMockActionContext } from "../../../__tests__/test-utils";
import type { ActionContext } from "../../../core/types";

// Helper for common deps
function makeDeps() {
  return {
    addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createStatusAction", () => {
  let context: ActionContext;

  beforeEach(() => {
    context = createMockActionContext();
  });

  it("creates a custom status action with static message", async () => {
    const CustomAction = createStatusAction("ARCHIVED", "archived!");
    const action = new CustomAction();
    const deps = makeDeps();
    const data = {
      importId: "import-5",
      noteId: "note-5",
      status: "ARCHIVED",
      message: "archived!",
    };

    await action.execute(data, deps, context);

    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-5",
      noteId: "note-5",
      status: "ARCHIVED",
      message: "archived!",
      context: context.operation,
    });
  });

  it("creates a custom status action with dynamic message function", async () => {
    const CustomAction = createStatusAction(
      "ARCHIVED",
      (data, ctx) => `archived by ${ctx.operation}`
    );
    const action = new CustomAction();
    const deps = makeDeps();
    const data = {
      importId: "import-6",
      noteId: "note-6",
      status: "ARCHIVED",
      message: "archived!",
    };

    await action.execute(data, deps, context);

    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-6",
      noteId: "note-6",
      status: "ARCHIVED",
      message: expect.stringContaining("archived by"),
      context: context.operation,
    });
  });
});
