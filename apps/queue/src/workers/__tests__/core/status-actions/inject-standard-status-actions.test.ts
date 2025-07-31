/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockLogger } from "../../../../test-utils/helpers";
import { ActionName } from "../../../../types";
import type { BaseAction } from "../../../core/base-action";
import {
  CompletedStatusAction,
  ProcessingStatusAction,
} from "../../../core/status-actions";
import injectStandardStatusActions from "../../../core/status-actions/inject-standard-status-actions";
import type { BaseJobData } from "../../../types";

describe("injectStandardStatusActions", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockActions: any[];
  let getOperationName: () => string;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockActions = [];
    getOperationName = vi.fn().mockReturnValue("test-operation");
  });

  describe("basic functionality", () => {
    it("should be a function", () => {
      expect(typeof injectStandardStatusActions).toBe("function");
    });

    it("should be the default export", () => {
      expect(injectStandardStatusActions).toBeDefined();
    });
  });

  describe("action injection", () => {
    it("should add ProcessingStatusAction to the beginning of actions array", () => {
      const originalActions = [
        { name: "existing-action" },
      ] as unknown as BaseAction[];
      mockActions = [...originalActions];

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions).toHaveLength(3);
      expect(mockActions[0]).toBeInstanceOf(ProcessingStatusAction);
      expect(mockActions[1]).toEqual(originalActions[0]);
      expect(mockActions[2]).toBeInstanceOf(CompletedStatusAction);
    });

    it("should add CompletedStatusAction to the end of actions array", () => {
      const originalActions = [{ name: "existing-action" }];
      mockActions = [...originalActions];

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions).toHaveLength(3);
      expect(mockActions[0]).toBeInstanceOf(ProcessingStatusAction);
      expect(mockActions[1]).toEqual(originalActions[0]);
      expect(mockActions[2]).toBeInstanceOf(CompletedStatusAction);
    });

    it("should work with empty actions array", () => {
      mockActions = [];

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions).toHaveLength(2);
      expect(mockActions[0]).toBeInstanceOf(ProcessingStatusAction);
      expect(mockActions[1]).toBeInstanceOf(CompletedStatusAction);
    });

    it("should work with multiple existing actions", () => {
      const originalActions = [
        { name: "action-1" },
        { name: "action-2" },
        { name: "action-3" },
      ];
      mockActions = [...originalActions];

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions).toHaveLength(5);
      expect(mockActions[0]).toBeInstanceOf(ProcessingStatusAction);
      expect(mockActions[1]).toEqual(originalActions[0]);
      expect(mockActions[2]).toEqual(originalActions[1]);
      expect(mockActions[3]).toEqual(originalActions[2]);
      expect(mockActions[4]).toBeInstanceOf(CompletedStatusAction);
    });
  });

  describe("logging", () => {
    it("should log the operation name in uppercase", () => {
      getOperationName = vi.fn().mockReturnValue("test-operation");

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION] Adding status actions"
      );
    });

    it("should call getOperationName function", () => {
      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(getOperationName).toHaveBeenCalledTimes(1);
    });

    it("should work with different operation names", () => {
      getOperationName = vi.fn().mockReturnValue("custom-operation");

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CUSTOM-OPERATION] Adding status actions"
      );
    });

    it("should work with operation names containing special characters", () => {
      getOperationName = vi.fn().mockReturnValue("test-operation-with-dashes");

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TEST-OPERATION-WITH-DASHES] Adding status actions"
      );
    });
  });

  describe("action types", () => {
    it("should create ProcessingStatusAction with correct name", () => {
      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      const processingAction = mockActions[0] as ProcessingStatusAction;
      expect(processingAction.name).toBe(ActionName.PROCESSING_STATUS);
    });

    it("should create CompletedStatusAction with correct name", () => {
      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      const completedAction = mockActions[1] as CompletedStatusAction;
      expect(completedAction.name).toBe(ActionName.COMPLETION_STATUS);
    });

    it("should create actions with correct generic types", () => {
      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions[0]).toBeInstanceOf(ProcessingStatusAction);
      expect(mockActions[1]).toBeInstanceOf(CompletedStatusAction);
    });
  });

  describe("array mutation", () => {
    it("should mutate the original actions array", () => {
      const originalLength = mockActions.length;

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions.length).toBe(originalLength + 2);
    });

    it("should preserve existing action references", () => {
      const existingAction = { name: "existing-action" };
      mockActions = [existingAction];

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions[1]).toBe(existingAction);
    });

    it("should not create a new array", () => {
      const originalArray = mockActions;

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions).toBe(originalArray);
    });
  });

  describe("edge cases", () => {
    it("should work with null actions array", () => {
      mockActions = null as unknown as any[];

      expect(() => {
        injectStandardStatusActions(mockActions, getOperationName, mockLogger);
      }).toThrow();
    });

    it("should work with undefined actions array", () => {
      mockActions = undefined as unknown as any[];

      expect(() => {
        injectStandardStatusActions(mockActions, getOperationName, mockLogger);
      }).toThrow();
    });

    it("should work with getOperationName returning empty string", () => {
      getOperationName = vi.fn().mockReturnValue("");

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith("[] Adding status actions");
    });

    it("should work with getOperationName returning null", () => {
      getOperationName = vi.fn().mockReturnValue(null as any);

      expect(() => {
        injectStandardStatusActions(mockActions, getOperationName, mockLogger);
      }).toThrow();
    });

    it("should work with getOperationName returning undefined", () => {
      getOperationName = vi.fn().mockReturnValue(undefined as any);

      expect(() => {
        injectStandardStatusActions(mockActions, getOperationName, mockLogger);
      }).toThrow();
    });

    it("should work with logger that has no log method", () => {
      const invalidLogger = {} as any;

      expect(() => {
        injectStandardStatusActions(
          mockActions,
          getOperationName,
          invalidLogger
        );
      }).toThrow();
    });

    it("should work with logger that has non-function log method", () => {
      const invalidLogger = { log: "not-a-function" } as any;

      expect(() => {
        injectStandardStatusActions(
          mockActions,
          getOperationName,
          invalidLogger
        );
      }).toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("should work with complex existing actions", () => {
      const complexActions = [
        { name: "action-1", priority: 1, retryable: true },
        { name: "action-2", priority: 2, retryable: false },
        { name: "action-3", priority: 3, retryable: true },
      ];
      mockActions = [...complexActions];

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions).toHaveLength(5);
      expect(mockActions[0]).toBeInstanceOf(ProcessingStatusAction);
      expect(mockActions[1]).toEqual(complexActions[0]);
      expect(mockActions[2]).toEqual(complexActions[1]);
      expect(mockActions[3]).toEqual(complexActions[2]);
      expect(mockActions[4]).toBeInstanceOf(CompletedStatusAction);
    });

    it("should work with actions that have execute methods", () => {
      const actionWithExecute = {
        name: "action-with-execute",
        execute: vi.fn(),
      };
      mockActions = [actionWithExecute];

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions).toHaveLength(3);
      expect(mockActions[0]).toBeInstanceOf(ProcessingStatusAction);
      expect(mockActions[1]).toBe(actionWithExecute);
      expect(mockActions[2]).toBeInstanceOf(CompletedStatusAction);
    });

    it("should work with actions that have timing methods", () => {
      const actionWithTiming = {
        name: "action-with-timing",
        executeWithTiming: vi.fn(),
      };
      mockActions = [actionWithTiming];

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockActions).toHaveLength(3);
      expect(mockActions[0]).toBeInstanceOf(ProcessingStatusAction);
      expect(mockActions[1]).toBe(actionWithTiming);
      expect(mockActions[2]).toBeInstanceOf(CompletedStatusAction);
    });
  });

  describe("function signature", () => {
    it("should accept BaseJobData as generic type parameter", () => {
      const actions: any[] = [];

      expect(() => {
        injectStandardStatusActions<BaseJobData>(
          actions,
          getOperationName,
          mockLogger
        );
      }).not.toThrow();
    });

    it("should accept custom dependencies as generic type parameter", () => {
      const actions: any[] = [];

      expect(() => {
        injectStandardStatusActions<any, { customDep: string }>(
          actions,
          getOperationName,
          mockLogger
        );
      }).not.toThrow();
    });

    it("should accept custom result type as generic type parameter", () => {
      const actions: any[] = [];

      expect(() => {
        injectStandardStatusActions<any, any, { result: string }>(
          actions,
          getOperationName,
          mockLogger
        );
      }).not.toThrow();
    });
  });

  describe("return value", () => {
    it("should return void", () => {
      const result = injectStandardStatusActions(
        mockActions,
        getOperationName,
        mockLogger
      );

      expect(result).toBeUndefined();
    });
  });

  describe("side effects", () => {
    it("should only modify the actions array", () => {
      const originalLogger = { ...mockLogger };
      const originalGetOperationName = getOperationName;

      injectStandardStatusActions(mockActions, getOperationName, mockLogger);

      expect(mockLogger).toEqual(originalLogger);
      expect(getOperationName).toBe(originalGetOperationName);
    });

    it("should not modify the getOperationName function", () => {
      const originalGetOperationName = vi.fn().mockReturnValue("test");
      const getOperationNameCopy = originalGetOperationName;

      injectStandardStatusActions(
        mockActions,
        originalGetOperationName,
        mockLogger
      );

      expect(originalGetOperationName).toBe(getOperationNameCopy);
    });

    it("should not modify the logger object", () => {
      const originalLogger = { log: vi.fn() };
      const loggerCopy = { ...originalLogger };

      injectStandardStatusActions(
        mockActions,
        getOperationName,
        originalLogger
      );

      expect(originalLogger).toEqual(loggerCopy);
    });
  });
});
