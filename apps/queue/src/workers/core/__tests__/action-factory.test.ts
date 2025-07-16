import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionFactory, globalActionFactory } from "../action-factory";
import {
  BaseAction,
  NoOpAction,
  ValidationAction,
  LoggingAction,
} from "../base-action";
import type { ActionContext } from "../types";

// ============================================================================
// TEST HELPERS
// ============================================================================

// Test action for factory testing
class TestAction extends BaseAction<
  { value: string },
  { logger: { log: (msg: string) => void } }
> {
  name = "test_action";

  async execute(
    data: { value: string },
    deps: { logger: { log: (msg: string) => void } },
    context: ActionContext
  ): Promise<{ value: string; processed: boolean }> {
    deps.logger.log(`Processing ${data.value} for job ${context.jobId}`);
    return { ...data, processed: true };
  }
}

// ============================================================================
// ACTION FACTORY TESTS
// ============================================================================

describe("ActionFactory", () => {
  let factory: ActionFactory;

  beforeEach(() => {
    factory = new ActionFactory();
  });

  describe("constructor", () => {
    it("should initialize with empty registry", () => {
      expect(factory).toBeInstanceOf(ActionFactory);
      expect(factory.list()).toHaveLength(0);
    });
  });

  describe("register", () => {
    it("should register action creator", () => {
      const creator = () => new NoOpAction();
      factory.register("no_op", creator);

      expect(factory.isRegistered("no_op")).toBe(true);
      expect(factory.list()).toContain("no_op");
    });

    it("should allow re-registration of existing action", () => {
      const creator1 = () => new NoOpAction();
      const creator2 = () => new ValidationAction(() => null);

      factory.register("test_action", creator1);
      factory.register("test_action", creator2);

      expect(factory.isRegistered("test_action")).toBe(true);
      expect(factory.list()).toContain("test_action");
    });

    it("should register multiple actions", () => {
      factory.register("no_op", () => new NoOpAction());
      factory.register("validation", () => new ValidationAction(() => null));
      factory.register("logging", () => new LoggingAction("test"));

      expect(factory.list()).toHaveLength(3);
      expect(factory.list()).toContain("no_op");
      expect(factory.list()).toContain("validation");
      expect(factory.list()).toContain("logging");
    });
  });

  describe("create", () => {
    it("should create action instance", () => {
      const creator = () => new NoOpAction();
      factory.register("no_op", creator);

      const action = factory.create("no_op");

      expect(action).toBeInstanceOf(NoOpAction);
      expect(action.name).toBe("no_op");
    });

    it("should create action with dependencies", () => {
      const mockLogger = { log: vi.fn() };
      const creator = (_deps?: { logger: { log: (msg: string) => void } }) =>
        new TestAction();
      factory.register("test_action", creator);

      const action = factory.create("test_action", { logger: mockLogger });

      expect(action).toBeInstanceOf(TestAction);
    });

    it("should throw error for unregistered action", () => {
      expect(() => {
        factory.create("unknown_action");
      }).toThrow(
        "Action 'unknown_action' is not registered in the ActionFactory."
      );
    });

    it("should create different instances for each call", () => {
      const creator = () => new NoOpAction();
      factory.register("no_op", creator);

      const action1 = factory.create("no_op");
      const action2 = factory.create("no_op");

      expect(action1).not.toBe(action2);
      expect(action1).toBeInstanceOf(NoOpAction);
      expect(action2).toBeInstanceOf(NoOpAction);
    });
  });

  describe("isRegistered", () => {
    it("should return true for registered actions", () => {
      factory.register("no_op", () => new NoOpAction());

      expect(factory.isRegistered("no_op")).toBe(true);
    });

    it("should return false for unregistered actions", () => {
      expect(factory.isRegistered("unknown_action")).toBe(false);
    });
  });

  describe("list", () => {
    it("should return empty array for new factory", () => {
      expect(factory.list()).toHaveLength(0);
    });

    it("should return all registered action names", () => {
      factory.register("action1", () => new NoOpAction());
      factory.register("action2", () => new ValidationAction(() => null));
      factory.register("action3", () => new LoggingAction("test"));

      const actions = factory.list();
      expect(actions).toHaveLength(3);
      expect(actions).toContain("action1");
      expect(actions).toContain("action2");
      expect(actions).toContain("action3");
    });

    it("should return unique names even after re-registration", () => {
      factory.register("test_action", () => new NoOpAction());
      factory.register("test_action", () => new ValidationAction(() => null));

      const actions = factory.list();
      expect(actions).toHaveLength(1);
      expect(actions).toContain("test_action");
    });
  });

  describe("integration", () => {
    it("should work with custom action classes", () => {
      const creator = () => new TestAction();
      factory.register("custom_test", creator);

      const action = factory.create("custom_test");
      expect(action).toBeInstanceOf(TestAction);
      expect(action.name).toBe("test_action");
    });

    it("should work with action that requires dependencies", async () => {
      const mockLogger = { log: vi.fn() };
      const creator = (_deps?: { logger: { log: (msg: string) => void } }) =>
        new TestAction();
      factory.register("test_action", creator);

      const action = factory.create("test_action", {
        logger: mockLogger,
      }) as TestAction;
      const context = {
        jobId: "test-job",
        retryCount: 0,
        queueName: "test",
        noteId: "test",
        operation: "test",
        startTime: Date.now(),
        workerName: "test",
        attemptNumber: 1,
      };

      const result = await action.executeWithTiming(
        { value: "test" },
        { logger: mockLogger },
        context
      );

      expect(result.success).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Processing test for job test-job"
      );
    });
  });
});

// ============================================================================
// GLOBAL ACTION FACTORY TESTS
// ============================================================================

describe("globalActionFactory", () => {
  it("should be a singleton instance", () => {
    expect(globalActionFactory).toBeInstanceOf(ActionFactory);
  });

  it("should start with empty registry", () => {
    expect(globalActionFactory.list()).toHaveLength(0);
  });
});
