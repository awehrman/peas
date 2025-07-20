import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionFactory } from "../../../core/action-factory";
import { registerSourceActions } from "../index";
import { ProcessSourceAction } from "../process-source";
import { SaveSourceAction } from "../save-source";
import { AddProcessingStatusAction } from "../add-processing-status";
import { AddCompletedStatusAction } from "../add-completed-status";
import * as sourceActions from "../index";

describe("Source Actions Index", () => {
  let factory: ActionFactory;

  beforeEach(() => {
    factory = new ActionFactory();
  });

  describe("registerSourceActions", () => {
    it("should register all source actions", () => {
      registerSourceActions(factory);

      expect(factory.isRegistered("process_source")).toBe(true);
      expect(factory.isRegistered("save_source")).toBe(true);
      expect(factory.isRegistered("source_processing_status")).toBe(true);
      expect(factory.isRegistered("source_completed_status")).toBe(true);
    });

    it("should create correct action instances", () => {
      registerSourceActions(factory);

      const processSourceAction = factory.create("process_source");
      const saveSourceAction = factory.create("save_source");
      const addProcessingStatusAction = factory.create(
        "source_processing_status"
      );
      const addCompletedStatusAction = factory.create(
        "source_completed_status"
      );

      expect(processSourceAction).toBeInstanceOf(ProcessSourceAction);
      expect(saveSourceAction).toBeInstanceOf(SaveSourceAction);
      expect(addProcessingStatusAction).toBeInstanceOf(
        AddProcessingStatusAction
      );
      expect(addCompletedStatusAction).toBeInstanceOf(AddCompletedStatusAction);
    });

    it("should create new instances for each factory call", () => {
      registerSourceActions(factory);

      const action1 = factory.create("process_source");
      const action2 = factory.create("process_source");

      expect(action1).not.toBe(action2);
      expect(action1).toBeInstanceOf(ProcessSourceAction);
      expect(action2).toBeInstanceOf(ProcessSourceAction);
    });

    it("should handle multiple registrations gracefully", () => {
      // Register actions multiple times
      registerSourceActions(factory);
      registerSourceActions(factory);

      // Should still work correctly
      const action = factory.create("process_source");
      expect(action).toBeInstanceOf(ProcessSourceAction);
    });

    it("should register actions in the correct order", () => {
      const factory = new ActionFactory();
      const registerSpy = vi.spyOn(factory, "register");

      registerSourceActions(factory);

      expect(registerSpy).toHaveBeenCalledTimes(4);

      // Verify the order of registrations
      const calls = registerSpy.mock.calls;
      expect(calls[0]![0]).toBe("process_source");
      expect(calls[1]![0]).toBe("save_source");
      expect(calls[2]![0]).toBe("source_processing_status");
      expect(calls[3]![0]).toBe("source_completed_status");
    });

    it("should create actions with proper dependencies when needed", () => {
      const factory = new ActionFactory();
      registerSourceActions(factory);

      // Test that we can create an action that requires dependencies
      const mockDeps = {
        logger: { log: vi.fn() },
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        database: {
          createSource: vi.fn().mockResolvedValue({ id: "test-source" }),
        },
      };

      const action = factory.create("save_source", mockDeps);
      expect(action).toBeInstanceOf(SaveSourceAction);
    });

    it("should export all required modules", () => {
      // This test ensures that all the exported modules are available
      expect(typeof registerSourceActions).toBe("function");
    });
  });

  describe("exports", () => {
    it("should export all expected action classes", () => {
      // Test that all the exported modules are available
      expect(sourceActions.ProcessSourceAction).toBeDefined();
      expect(sourceActions.SaveSourceAction).toBeDefined();
      expect(sourceActions.AddProcessingStatusAction).toBeDefined();
      expect(sourceActions.AddCompletedStatusAction).toBeDefined();
      expect(sourceActions.registerSourceActions).toBeDefined();
    });

    it("should export action classes as constructors", () => {
      expect(typeof sourceActions.ProcessSourceAction).toBe("function");
      expect(typeof sourceActions.SaveSourceAction).toBe("function");
      expect(typeof sourceActions.AddProcessingStatusAction).toBe("function");
      expect(typeof sourceActions.AddCompletedStatusAction).toBe("function");
    });
  });
});
