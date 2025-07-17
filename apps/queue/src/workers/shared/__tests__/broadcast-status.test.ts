import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  BroadcastStatusAction,
  BroadcastProcessingAction,
  BroadcastCompletedAction,
  BroadcastFailedAction,
  createStatusAction,
} from "../broadcast-status";
import { createMockActionContext } from "../../__tests__/test-utils";
import type { ActionContext } from "../../core/types";

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
    noteId: string;
    status: string;
    message: string;
    context?: string;
  };

  beforeEach(() => {
    action = new BroadcastStatusAction();
    deps = makeDeps();
    context = createMockActionContext();
    data = {
      noteId: "note-1",
      status: "CUSTOM",
      message: "A message",
      context: "custom-context",
    };
  });

  it("calls addStatusEventAndBroadcast with correct args", async () => {
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
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

describe("BroadcastProcessingAction", () => {
  let action: BroadcastProcessingAction;
  let deps: ReturnType<typeof makeDeps>;
  let context: ActionContext;
  let data: { noteId?: string; message?: string };
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    action = new BroadcastProcessingAction();
    deps = makeDeps();
    context = createMockActionContext();
    data = { noteId: "note-2", message: "Processing..." };
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("broadcasts processing status if noteId present", async () => {
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
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
        message: expect.stringContaining("in progress"),
      })
    );
  });

  it("logs and skips if noteId missing", async () => {
    delete data.noteId;
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skipping processing broadcast")
      // message may be split, so just check substring
    );
  });
});

describe("BroadcastCompletedAction", () => {
  let action: BroadcastCompletedAction;
  let deps: ReturnType<typeof makeDeps>;
  let context: ActionContext;
  let data: { noteId?: string; message?: string };
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    action = new BroadcastCompletedAction();
    deps = makeDeps();
    context = createMockActionContext();
    data = { noteId: "note-3", message: "Done!" };
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("broadcasts completed status if noteId present", async () => {
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
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
        message: expect.stringContaining("completed successfully"),
      })
    );
  });

  it("logs and skips if noteId missing", async () => {
    delete data.noteId;
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Skipping completed broadcast")
    );
  });
});

describe("BroadcastFailedAction", () => {
  let action: BroadcastFailedAction;
  let deps: ReturnType<typeof makeDeps>;
  let context: ActionContext;
  let data: { noteId: string; error?: string };

  beforeEach(() => {
    action = new BroadcastFailedAction();
    deps = makeDeps();
    context = createMockActionContext();
    data = { noteId: "note-4", error: "fail msg" };
  });

  it("broadcasts failed status with error message", async () => {
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
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
      expect.objectContaining({ message: expect.stringContaining("failed") })
    );
  });
});

describe("createStatusAction", () => {
  it("creates a custom status action with static message", async () => {
    const CustomAction = createStatusAction("ARCHIVED", "archived!");
    const action = new CustomAction();
    const deps = makeDeps();
    const context = createMockActionContext();
    const data = { noteId: "note-5", status: "ARCHIVED", message: "archived!" };
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
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
    const context = createMockActionContext();
    const data = { noteId: "note-6", status: "ARCHIVED", message: "archived!" };
    await action.execute(data, deps, context);
    expect(deps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
      noteId: "note-6",
      status: "ARCHIVED",
      message: expect.stringContaining("archived by"),
      context: context.operation,
    });
  });
});
