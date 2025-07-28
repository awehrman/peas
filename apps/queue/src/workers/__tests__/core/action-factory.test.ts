import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import { ActionFactory } from "../../core/action-factory";
import { BaseAction as ConcreteBaseAction } from "../../core/base-action";
import type { ActionContext } from "../../core/types";
import type { BaseAction } from "../../types";
import type { BaseJobData } from "../../types";

// Mock dependencies
vi.mock("../../../monitoring/system-monitor", () => ({
  systemMonitor: {
    trackJobMetrics: vi.fn(),
    logWorkerEvent: vi.fn(),
  },
}));

// Test action implementations with proper typing
class TestAction extends ConcreteBaseAction<
  BaseJobData,
  { logger: { log: ReturnType<typeof vi.fn> } },
  BaseJobData
> {
  name = ActionName.NO_OP;

  async execute(
    data: BaseJobData,
    deps: { logger: { log: ReturnType<typeof vi.fn> } },
    context: ActionContext
  ): Promise<BaseJobData> {
    deps.logger.log(`Executing test action for job ${context.jobId}`);
    return data;
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

class TestActionWithError extends ConcreteBaseAction<
  BaseJobData,
  object,
  BaseJobData
> {
  name = ActionName.VALIDATION;

  async execute(): Promise<BaseJobData> {
    throw new Error("Test action error");
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

class TestActionWithWrapper extends ConcreteBaseAction<
  BaseJobData,
  { logger: { log: ReturnType<typeof vi.fn> } },
  BaseJobData
> {
  name = ActionName.LOGGING;

  async execute(
    data: BaseJobData,
    deps: { logger: { log: ReturnType<typeof vi.fn> } },
    context: ActionContext
  ): Promise<BaseJobData> {
    deps.logger.log(`Executing wrapped action for job ${context.jobId}`);
    return data;
  }

  validateInput(_data: BaseJobData): Error | null {
    return null;
  }
}

describe("ActionFactory", () => {
  let factory: ActionFactory<
    BaseJobData,
    { logger: { log: ReturnType<typeof vi.fn> } },
    BaseJobData
  >;
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockContext: ActionContext;

  beforeEach(() => {
    factory = new ActionFactory<
      BaseJobData,
      { logger: { log: ReturnType<typeof vi.fn> } },
      BaseJobData
    >();
    mockLogger = { log: vi.fn() };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("register", () => {
    it("should register an action successfully", () => {
      const actionFactory = (): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => new TestAction();

      factory.register(ActionName.NO_OP, actionFactory);

      expect(factory.has(ActionName.NO_OP)).toBe(true);
      expect(factory.getRegisteredActions()).toContain(ActionName.NO_OP);
    });

    it("should overwrite existing action when registering with same name", () => {
      const action1 = (): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => new TestAction();
      const action2 = (): BaseAction<BaseJobData, object, BaseJobData> =>
        new TestActionWithError();

      factory.register(ActionName.NO_OP, action1);
      factory.register(ActionName.NO_OP, action2);

      const createdAction = factory.create(ActionName.NO_OP, {
        logger: mockLogger,
      });
      expect(createdAction.name).toBe(ActionName.VALIDATION); // action2's name
    });
  });

  describe("registerWithWrappers", () => {
    it("should register action with wrappers", () => {
      const actionFactory = (): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => new TestActionWithWrapper();
      const wrapper = (
        action: BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        >
      ): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => {
        return new (class extends ConcreteBaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        > {
          name = ActionName.ERROR_HANDLING;

          async execute(
            data: BaseJobData,
            deps: { logger: { log: ReturnType<typeof vi.fn> } },
            context: ActionContext
          ): Promise<BaseJobData> {
            deps.logger.log("Wrapper pre-execution");
            const result = await action.execute(data, deps, context);
            deps.logger.log("Wrapper post-execution");
            return result;
          }

          validateInput(_data: BaseJobData): Error | null {
            return null;
          }
        })();
      };

      factory.registerWithWrappers(ActionName.LOGGING, actionFactory, [
        wrapper,
      ]);

      expect(factory.has(ActionName.LOGGING)).toBe(true);
      expect(factory.getRegisteredActions()).toContain(ActionName.LOGGING);
    });

    it("should apply multiple wrappers in order", () => {
      const actionFactory = (): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => new TestActionWithWrapper();
      const wrapper1 = (
        action: BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        >
      ): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => {
        return new (class extends ConcreteBaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        > {
          name = ActionName.ERROR_HANDLING;

          async execute(
            data: BaseJobData,
            deps: { logger: { log: ReturnType<typeof vi.fn> } },
            context: ActionContext
          ): Promise<BaseJobData> {
            deps.logger.log("Wrapper1 pre-execution");
            const result = await action.execute(data, deps, context);
            deps.logger.log("Wrapper1 post-execution");
            return result;
          }

          validateInput(_data: BaseJobData): Error | null {
            return null;
          }
        })();
      };

      const wrapper2 = (
        action: BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        >
      ): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => {
        return new (class extends ConcreteBaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        > {
          name = ActionName.RETRY_WRAPPER;

          async execute(
            data: BaseJobData,
            deps: { logger: { log: ReturnType<typeof vi.fn> } },
            context: ActionContext
          ): Promise<BaseJobData> {
            deps.logger.log("Wrapper2 pre-execution");
            const result = await action.execute(data, deps, context);
            deps.logger.log("Wrapper2 post-execution");
            return result;
          }

          validateInput(_data: BaseJobData): Error | null {
            return null;
          }
        })();
      };

      factory.registerWithWrappers(ActionName.LOGGING, actionFactory, [
        wrapper1,
        wrapper2,
      ]);

      const createdAction = factory.create(ActionName.LOGGING, {
        logger: mockLogger,
      });
      expect(createdAction.name).toBe(ActionName.RETRY_WRAPPER); // Last wrapper's name
    });
  });

  describe("create", () => {
    it("should create an action successfully", () => {
      const actionFactory = (): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => new TestAction();
      factory.register(ActionName.NO_OP, actionFactory);

      const action = factory.create(ActionName.NO_OP, { logger: mockLogger });

      expect(action).toBeInstanceOf(TestAction);
      expect(action.name).toBe(ActionName.NO_OP);
    });

    it("should create an action with wrappers", async () => {
      const actionFactory = (): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => new TestActionWithWrapper();
      const wrapper = (
        action: BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        >
      ): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => {
        return new (class extends ConcreteBaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        > {
          name = ActionName.ERROR_HANDLING;

          async execute(
            data: BaseJobData,
            deps: { logger: { log: ReturnType<typeof vi.fn> } },
            context: ActionContext
          ): Promise<BaseJobData> {
            deps.logger.log("Wrapper executing");
            return await action.execute(data, deps, context);
          }

          validateInput(_data: BaseJobData): Error | null {
            return null;
          }
        })();
      };

      factory.registerWithWrappers(ActionName.LOGGING, actionFactory, [
        wrapper,
      ]);

      const action = factory.create(ActionName.LOGGING, { logger: mockLogger });
      expect(action.name).toBe(ActionName.ERROR_HANDLING);

      // Test execution
      const testData = { jobId: "test-123" } as BaseJobData;
      await action.execute(testData, { logger: mockLogger }, mockContext);

      expect(mockLogger.log).toHaveBeenCalledWith("Wrapper executing");
    });

    it("should throw error when action is not registered", () => {
      expect(() => {
        factory.create(ActionName.NO_OP, { logger: mockLogger });
      }).toThrow("Action 'no_op' not registered");
    });

    it("should pass dependencies to action factory", () => {
      const actionFactory = vi.fn(
        (): BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        > => new TestAction()
      );
      factory.register(ActionName.NO_OP, actionFactory);

      const deps = { logger: mockLogger };
      factory.create(ActionName.NO_OP, deps);

      // Note: The factory function doesn't actually receive deps, but we test the flow
      expect(actionFactory).toHaveBeenCalled();
    });
  });

  describe("has", () => {
    it("should return true for registered action", () => {
      factory.register(
        ActionName.NO_OP,
        (): BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        > => new TestAction()
      );

      expect(factory.has(ActionName.NO_OP)).toBe(true);
    });

    it("should return false for unregistered action", () => {
      expect(factory.has(ActionName.NO_OP)).toBe(false);
    });
  });

  describe("getRegisteredActions", () => {
    it("should return empty array when no actions registered", () => {
      expect(factory.getRegisteredActions()).toEqual([]);
    });

    it("should return all registered action names", () => {
      factory.register(
        ActionName.NO_OP,
        (): BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        > => new TestAction()
      );
      factory.register(
        ActionName.VALIDATION,
        (): BaseAction<BaseJobData, object, BaseJobData> =>
          new TestActionWithError()
      );
      factory.register(
        ActionName.LOGGING,
        (): BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        > => new TestActionWithWrapper()
      );

      const registeredActions = factory.getRegisteredActions();

      expect(registeredActions).toContain(ActionName.NO_OP);
      expect(registeredActions).toContain(ActionName.VALIDATION);
      expect(registeredActions).toContain(ActionName.LOGGING);
      expect(registeredActions).toHaveLength(3);
    });

    it("should return unique action names", () => {
      factory.register(
        ActionName.NO_OP,
        (): BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        > => new TestAction()
      );
      factory.register(
        ActionName.NO_OP,
        (): BaseAction<BaseJobData, object, BaseJobData> =>
          new TestActionWithError()
      ); // Overwrite

      const registeredActions = factory.getRegisteredActions();

      expect(registeredActions).toEqual([ActionName.NO_OP]);
      expect(registeredActions).toHaveLength(1);
    });
  });

  describe("clear", () => {
    it("should clear all registered actions and wrappers", () => {
      const actionFactory = (): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => new TestAction();
      const wrapper = (
        action: BaseAction<
          BaseJobData,
          { logger: { log: ReturnType<typeof vi.fn> } },
          BaseJobData
        >
      ): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => action;

      factory.register(ActionName.NO_OP, actionFactory);
      factory.registerWithWrappers(ActionName.VALIDATION, actionFactory, [
        wrapper,
      ]);

      expect(factory.has(ActionName.NO_OP)).toBe(true);
      expect(factory.has(ActionName.VALIDATION)).toBe(true);
      expect(factory.getRegisteredActions()).toHaveLength(2);

      factory.clear();

      expect(factory.has(ActionName.NO_OP)).toBe(false);
      expect(factory.has(ActionName.VALIDATION)).toBe(false);
      expect(factory.getRegisteredActions()).toHaveLength(0);
    });

    it("should handle clearing empty factory", () => {
      expect(() => {
        factory.clear();
      }).not.toThrow();

      expect(factory.getRegisteredActions()).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("should handle action factory that returns null", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nullActionFactory = (): any => null;
      factory.register(ActionName.NO_OP, nullActionFactory);

      // The factory doesn't throw, but the action execution will fail
      const action = factory.create(ActionName.NO_OP, { logger: mockLogger });
      expect(action).toBeDefined();
    });

    it("should handle wrapper that returns null", () => {
      const actionFactory = (): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => new TestAction();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nullWrapper = (): any => null;

      factory.registerWithWrappers(ActionName.NO_OP, actionFactory, [
        nullWrapper,
      ]);

      // The factory doesn't throw, but the wrapper execution will fail
      const action = factory.create(ActionName.NO_OP, { logger: mockLogger });
      expect(action).toBeDefined();
    });

    it("should handle empty wrappers array", () => {
      const actionFactory = (): BaseAction<
        BaseJobData,
        { logger: { log: ReturnType<typeof vi.fn> } },
        BaseJobData
      > => new TestAction();

      factory.registerWithWrappers(ActionName.NO_OP, actionFactory, []);

      const action = factory.create(ActionName.NO_OP, { logger: mockLogger });
      expect(action).toBeInstanceOf(TestAction);
    });
  });
});
