import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ImageActionsIndex from "../index";
import { ActionFactory } from "../../../core/action-factory";
import { ProcessImageAction } from "../process-image";
import { SaveImageAction } from "../save-image";
import * as ActionRegistry from "../../../shared/action-registry";

// Mocks for shared action registry
vi.mock("../../../shared/action-registry", () => {
  return {
    registerActions: vi.fn(),
    createActionRegistration: vi.fn((name, action) => ({ name, action })),
  };
});

describe("image/actions/index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export ProcessImageAction and SaveImageAction", () => {
    expect(ImageActionsIndex).toHaveProperty("ProcessImageAction");
    expect(ImageActionsIndex).toHaveProperty("SaveImageAction");
    expect(ImageActionsIndex.ProcessImageAction).toBe(ProcessImageAction);
    expect(ImageActionsIndex.SaveImageAction).toBe(SaveImageAction);
  });

  it("should register both image actions with the factory", () => {
    const factory = new ActionFactory();
    ImageActionsIndex.registerImageActions(factory);

    expect(ActionRegistry.createActionRegistration).toHaveBeenCalledWith(
      "process_image",
      ProcessImageAction
    );
    expect(ActionRegistry.createActionRegistration).toHaveBeenCalledWith(
      "save_image",
      SaveImageAction
    );
    expect(ActionRegistry.registerActions).toHaveBeenCalledWith(factory, [
      { name: "process_image", action: ProcessImageAction },
      { name: "save_image", action: SaveImageAction },
    ]);
  });

  it("should not throw if called with a valid factory", () => {
    const factory = new ActionFactory();
    expect(() => ImageActionsIndex.registerImageActions(factory)).not.toThrow();
  });

  it("should handle empty factory gracefully", () => {
    // This is a bit artificial, but we can pass a minimal object
    const fakeFactory = {} as unknown as ActionFactory;
    expect(() =>
      ImageActionsIndex.registerImageActions(fakeFactory)
    ).not.toThrow();
  });
});
