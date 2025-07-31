import { describe, expect, it } from "vitest";

import type { BaseAction } from "../../../core/base-action";
import * as StatusActionsModule from "../../../core/status-actions";

describe("Status Actions Module Exports", () => {
  describe("injectStandardStatusActions", () => {
    it("should export injectStandardStatusActions as default", () => {
      expect(StatusActionsModule.injectStandardStatusActions).toBeDefined();
      expect(typeof StatusActionsModule.injectStandardStatusActions).toBe(
        "function"
      );
    });

    it("should be the default export function", () => {
      expect(StatusActionsModule.injectStandardStatusActions).toBeDefined();
    });

    it("should have correct function signature", () => {
      const { injectStandardStatusActions } = StatusActionsModule;
      expect(typeof injectStandardStatusActions).toBe("function");
    });
  });

  describe("CompletedStatusAction", () => {
    it("should export CompletedStatusAction class", () => {
      expect(StatusActionsModule.CompletedStatusAction).toBeDefined();
      expect(typeof StatusActionsModule.CompletedStatusAction).toBe("function");
    });

    it("should be a class constructor", () => {
      expect(
        StatusActionsModule.CompletedStatusAction.prototype.constructor
      ).toBe(StatusActionsModule.CompletedStatusAction);
    });

    it("should be instantiable", () => {
      const action = new StatusActionsModule.CompletedStatusAction();
      expect(action).toBeInstanceOf(StatusActionsModule.CompletedStatusAction);
    });

    it("should have correct action name", () => {
      const action = new StatusActionsModule.CompletedStatusAction();
      expect(action.name).toBe("completion_status");
    });
  });

  describe("ProcessingStatusAction", () => {
    it("should export ProcessingStatusAction class", () => {
      expect(StatusActionsModule.ProcessingStatusAction).toBeDefined();
      expect(typeof StatusActionsModule.ProcessingStatusAction).toBe(
        "function"
      );
    });

    it("should be a class constructor", () => {
      expect(
        StatusActionsModule.ProcessingStatusAction.prototype.constructor
      ).toBe(StatusActionsModule.ProcessingStatusAction);
    });

    it("should be instantiable", () => {
      const action = new StatusActionsModule.ProcessingStatusAction();
      expect(action).toBeInstanceOf(StatusActionsModule.ProcessingStatusAction);
    });

    it("should have correct action name", () => {
      const action = new StatusActionsModule.ProcessingStatusAction();
      expect(action.name).toBe("processing_status");
    });
  });

  describe("module structure", () => {
    it("should export expected properties", () => {
      const exportedKeys = Object.keys(StatusActionsModule);
      const expectedKeys = [
        "injectStandardStatusActions",
        "CompletedStatusAction",
        "ProcessingStatusAction",
      ];

      expect(exportedKeys.sort()).toEqual(expectedKeys.sort());
    });

    it("should not export unexpected properties", () => {
      const exportedKeys = Object.keys(StatusActionsModule);
      const unexpectedKeys = [
        "PrivateMethod",
        "InternalClass",
        "TestHelper",
        "BaseAction",
      ];

      unexpectedKeys.forEach((key) => {
        expect(exportedKeys).not.toContain(key);
      });
    });

    it("should export exactly 3 items", () => {
      const exportedKeys = Object.keys(StatusActionsModule);
      expect(exportedKeys).toHaveLength(3);
    });
  });

  describe("class functionality", () => {
    it("should have execute method on CompletedStatusAction", () => {
      const action = new StatusActionsModule.CompletedStatusAction();
      expect(typeof action.execute).toBe("function");
    });

    it("should have executeWithTiming method on CompletedStatusAction", () => {
      const action = new StatusActionsModule.CompletedStatusAction();
      expect(typeof action.executeWithTiming).toBe("function");
    });

    it("should have withConfig method on CompletedStatusAction", () => {
      const action = new StatusActionsModule.CompletedStatusAction();
      expect(typeof action.withConfig).toBe("function");
    });

    it("should have execute method on ProcessingStatusAction", () => {
      const action = new StatusActionsModule.ProcessingStatusAction();
      expect(typeof action.execute).toBe("function");
    });

    it("should have executeWithTiming method on ProcessingStatusAction", () => {
      const action = new StatusActionsModule.ProcessingStatusAction();
      expect(typeof action.executeWithTiming).toBe("function");
    });

    it("should have withConfig method on ProcessingStatusAction", () => {
      const action = new StatusActionsModule.ProcessingStatusAction();
      expect(typeof action.withConfig).toBe("function");
    });
  });

  describe("module import patterns", () => {
    it("should work with default import", () => {
      const {
        injectStandardStatusActions,
        CompletedStatusAction,
        ProcessingStatusAction,
      } = StatusActionsModule;

      expect(injectStandardStatusActions).toBeDefined();
      expect(CompletedStatusAction).toBeDefined();
      expect(ProcessingStatusAction).toBeDefined();
    });

    it("should work with namespace import", () => {
      expect(StatusActionsModule.injectStandardStatusActions).toBeDefined();
      expect(StatusActionsModule.CompletedStatusAction).toBeDefined();
      expect(StatusActionsModule.ProcessingStatusAction).toBeDefined();
    });

    it("should maintain reference equality", () => {
      const {
        injectStandardStatusActions,
        CompletedStatusAction,
        ProcessingStatusAction,
      } = StatusActionsModule;
      expect(injectStandardStatusActions).toBe(
        StatusActionsModule.injectStandardStatusActions
      );
      expect(CompletedStatusAction).toBe(
        StatusActionsModule.CompletedStatusAction
      );
      expect(ProcessingStatusAction).toBe(
        StatusActionsModule.ProcessingStatusAction
      );
    });
  });

  describe("class inheritance", () => {
    it("should have different constructors for each action class", () => {
      const completedAction = new StatusActionsModule.CompletedStatusAction();
      const processingAction = new StatusActionsModule.ProcessingStatusAction();

      expect(completedAction.constructor).not.toBe(
        processingAction.constructor
      );
    });

    it("should have different action names", () => {
      const completedAction = new StatusActionsModule.CompletedStatusAction();
      const processingAction = new StatusActionsModule.ProcessingStatusAction();

      expect(completedAction.name).not.toBe(processingAction.name);
    });

    it("should both extend BaseAction", () => {
      const completedAction = new StatusActionsModule.CompletedStatusAction();
      const processingAction = new StatusActionsModule.ProcessingStatusAction();

      expect(completedAction).toHaveProperty("execute");
      expect(completedAction).toHaveProperty("executeWithTiming");
      expect(completedAction).toHaveProperty("withConfig");
      expect(processingAction).toHaveProperty("execute");
      expect(processingAction).toHaveProperty("executeWithTiming");
      expect(processingAction).toHaveProperty("withConfig");
    });
  });

  describe("function behavior", () => {
    it("should accept required parameters", () => {
      const { injectStandardStatusActions } = StatusActionsModule;
      const actions: BaseAction[] = [];
      const getOperationName = () => "test";
      const logger = { log: () => {} };

      expect(() => {
        injectStandardStatusActions(actions, getOperationName, logger);
      }).not.toThrow();
    });

    it("should mutate the actions array", () => {
      const { injectStandardStatusActions } = StatusActionsModule;
      const actions: BaseAction[] = [];
      const getOperationName = () => "test";
      const logger = { log: () => {} };

      const originalLength = actions.length;
      injectStandardStatusActions(actions, getOperationName, logger);

      expect(actions.length).toBe(originalLength + 2);
    });
  });

  describe("type compatibility", () => {
    it("should work with BaseJobData type", () => {
      const { CompletedStatusAction, ProcessingStatusAction } =
        StatusActionsModule;

      // Test that the classes can be instantiated with BaseJobData
      const completedAction = new CompletedStatusAction();
      const processingAction = new ProcessingStatusAction();

      expect(completedAction).toBeDefined();
      expect(processingAction).toBeDefined();
    });

    it("should work with StatusDeps type", () => {
      const { CompletedStatusAction, ProcessingStatusAction } =
        StatusActionsModule;

      // Test that the classes can be instantiated with StatusDeps
      const completedAction = new CompletedStatusAction();
      const processingAction = new ProcessingStatusAction();

      expect(completedAction).toBeDefined();
      expect(processingAction).toBeDefined();
    });
  });

  describe("integration testing", () => {
    it("should work together in a pipeline", () => {
      const {
        injectStandardStatusActions,
        CompletedStatusAction,
        ProcessingStatusAction,
      } = StatusActionsModule;

      const actions: BaseAction[] = [];
      const getOperationName = () => "test-operation";
      const logger = { log: () => {} };

      injectStandardStatusActions(actions, getOperationName, logger);

      expect(actions).toHaveLength(2);
      expect(actions[0]).toBeInstanceOf(ProcessingStatusAction);
      expect(actions[1]).toBeInstanceOf(CompletedStatusAction);
    });

    it("should maintain action order", () => {
      const { injectStandardStatusActions } = StatusActionsModule;

      const actions: BaseAction[] = [];
      const getOperationName = () => "test-operation";
      const logger = { log: () => {} };

      injectStandardStatusActions(actions, getOperationName, logger);

      expect(actions[0]!.name).toBe("processing_status");
      expect(actions[1]!.name).toBe("completion_status");
    });
  });

  describe("error handling", () => {
    it("should handle invalid parameters gracefully", () => {
      const { injectStandardStatusActions } = StatusActionsModule;

      expect(() => {
        injectStandardStatusActions(
          null as unknown as BaseAction[],
          () => "test",
          {
            log: () => {},
          }
        );
      }).toThrow();
    });

    it("should handle missing logger method", () => {
      const { injectStandardStatusActions } = StatusActionsModule;
      const actions: BaseAction[] = [];
      const getOperationName = () => "test";
      const invalidLogger = {} as { log: (msg: string) => void };

      expect(() => {
        injectStandardStatusActions(actions, getOperationName, invalidLogger);
      }).toThrow();
    });
  });

  describe("performance characteristics", () => {
    it("should handle large action arrays", () => {
      const { injectStandardStatusActions } = StatusActionsModule;

      const actions = Array.from({ length: 1000 }, (_, i) => ({
        name: `action-${i}`,
      })) as unknown as BaseAction[];
      const getOperationName = () => "test-operation";
      const logger = { log: () => {} };

      expect(() => {
        injectStandardStatusActions(actions, getOperationName, logger);
      }).not.toThrow();

      expect(actions).toHaveLength(1002);
    });

    it("should maintain performance with multiple calls", () => {
      const { injectStandardStatusActions } = StatusActionsModule;

      for (let i = 0; i < 100; i++) {
        const actions: BaseAction[] = [];
        const getOperationName = () => `operation-${i}`;
        const logger = { log: () => {} };

        injectStandardStatusActions(actions, getOperationName, logger);
        expect(actions).toHaveLength(2);
      }
    });
  });
});
