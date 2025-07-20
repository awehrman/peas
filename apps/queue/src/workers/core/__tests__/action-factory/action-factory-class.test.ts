import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionFactory } from "../../action-factory";
import { NoOpAction, ValidationAction } from "../../base-action";

describe("ActionFactory", () => {
  let factory: ActionFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    factory = new ActionFactory();
  });

  describe("register", () => {
    it("should register an action creator", () => {
      const creator = () => new NoOpAction();

      factory.register("test_action", creator);

      expect(factory.isRegistered("test_action")).toBe(true);
    });

    it("should allow re-registration of actions", () => {
      const creator1 = () => new NoOpAction();
      const creator2 = () => new ValidationAction(() => null);

      factory.register("test_action", creator1);
      factory.register("test_action", creator2);

      expect(factory.isRegistered("test_action")).toBe(true);
      const action = factory.create("test_action");
      expect(action).toBeInstanceOf(ValidationAction);
    });

    it("should register actions with dependencies", () => {
      const creator = (_deps?: { logger: { log: (msg: string) => void } }) =>
        new ValidationAction(() => null);

      factory.register(
        "test_action",
        creator as unknown as import("../../action-factory").ActionCreator
      );

      expect(factory.isRegistered("test_action")).toBe(true);
    });

    it("should handle multiple action registrations", () => {
      const creator1 = () => new NoOpAction();
      const creator2 = () => new ValidationAction(() => null);

      factory.register("action1", creator1);
      factory.register("action2", creator2);

      expect(factory.isRegistered("action1")).toBe(true);
      expect(factory.isRegistered("action2")).toBe(true);
      expect(factory.list()).toContain("action1");
      expect(factory.list()).toContain("action2");
    });
  });

  describe("create", () => {
    it("should create an action by name", () => {
      const creator = () => new NoOpAction();
      factory.register("test_action", creator);

      const action = factory.create("test_action");

      expect(action).toBeInstanceOf(NoOpAction);
      expect(action.name).toBe("no_op");
    });

    it("should create action with dependencies", () => {
      const mockLogger = { log: vi.fn() };
      const creator = (_deps?: { logger: { log: (msg: string) => void } }) =>
        new ValidationAction(() => null);

      factory.register(
        "test_action",
        creator as unknown as import("../../action-factory").ActionCreator
      );

      const action = factory.create("test_action", mockLogger);

      expect(action).toBeInstanceOf(ValidationAction);
    });

    it("should throw error for unregistered action", () => {
      expect(() => factory.create("unregistered_action")).toThrow(
        "Action 'unregistered_action' is not registered in the ActionFactory."
      );
    });

    it("should create different instances for each call", () => {
      const creator = () => new NoOpAction();
      factory.register("test_action", creator);

      const action1 = factory.create("test_action");
      const action2 = factory.create("test_action");

      expect(action1).not.toBe(action2);
      expect(action1).toBeInstanceOf(NoOpAction);
      expect(action2).toBeInstanceOf(NoOpAction);
    });

    it("should handle complex action creators", () => {
      const creator = (deps?: {
        logger: { log: (msg: string) => void };
        config: { retryCount: number };
      }) => {
        const action = new ValidationAction(() => null);
        return action.withConfig({
          retryable: deps?.config?.retryCount
            ? deps.config.retryCount > 0
            : false,
        });
      };

      factory.register(
        "complex_action",
        creator as unknown as import("../../action-factory").ActionCreator
      );

      const action = factory.create("complex_action", {
        logger: { log: vi.fn() },
        config: { retryCount: 3 },
      });

      expect(action).toBeInstanceOf(ValidationAction);
      expect(action.retryable).toBe(true);
    });
  });

  describe("isRegistered", () => {
    it("should return true for registered actions", () => {
      const creator = () => new NoOpAction();
      factory.register("test_action", creator);

      expect(factory.isRegistered("test_action")).toBe(true);
    });

    it("should return false for unregistered actions", () => {
      expect(factory.isRegistered("unregistered_action")).toBe(false);
    });

    it("should be case sensitive", () => {
      const creator = () => new NoOpAction();
      factory.register("TestAction", creator);

      expect(factory.isRegistered("TestAction")).toBe(true);
      expect(factory.isRegistered("testaction")).toBe(false);
      expect(factory.isRegistered("test_action")).toBe(false);
    });
  });

  describe("list", () => {
    it("should return empty array for new factory", () => {
      expect(factory.list()).toEqual([]);
    });

    it("should return all registered action names", () => {
      const creator1 = () => new NoOpAction();
      const creator2 = () => new ValidationAction(() => null);

      factory.register("action1", creator1);
      factory.register("action2", creator2);

      const actions = factory.list();
      expect(actions).toContain("action1");
      expect(actions).toContain("action2");
      expect(actions).toHaveLength(2);
    });

    it("should return names in registration order", () => {
      const creator = () => new NoOpAction();

      factory.register("first", creator);
      factory.register("second", creator);
      factory.register("third", creator);

      const actions = factory.list();
      expect(actions[0]).toBe("first");
      expect(actions[1]).toBe("second");
      expect(actions[2]).toBe("third");
    });

    it("should handle re-registration in list", () => {
      const creator = () => new NoOpAction();

      factory.register("test_action", creator);
      factory.register("test_action", creator); // Re-register

      const actions = factory.list();
      expect(actions).toEqual(["test_action"]);
      expect(actions).toHaveLength(1);
    });
  });

  describe("type safety", () => {
    it("should maintain type safety for action creators", () => {
      interface TestDeps {
        logger: { log: (msg: string) => void };
        config: { retryCount: number };
      }

      const creator = (_deps?: TestDeps) => new ValidationAction(() => null);
      factory.register(
        "typed_action",
        creator as unknown as import("../../action-factory").ActionCreator
      );

      const action = factory.create("typed_action", {
        logger: { log: vi.fn() },
        config: { retryCount: 3 },
      });

      expect(action).toBeInstanceOf(ValidationAction);
    });

    it("should handle generic action types", () => {
      const creator = <T>(_deps?: T) => new NoOpAction();
      factory.register(
        "generic_action",
        creator as unknown as import("../../action-factory").ActionCreator
      );

      const action = factory.create("generic_action", { test: "data" });

      expect(action).toBeInstanceOf(NoOpAction);
    });
  });

  describe("edge cases", () => {
    it("should handle null dependencies", () => {
      const creator = (_deps?: unknown) => new NoOpAction();
      factory.register(
        "null_deps_action",
        creator as unknown as import("../../action-factory").ActionCreator
      );

      const action = factory.create("null_deps_action", null);

      expect(action).toBeInstanceOf(NoOpAction);
    });

    it("should handle undefined dependencies", () => {
      const creator = (_deps?: unknown) => new NoOpAction();
      factory.register(
        "undefined_deps_action",
        creator as unknown as import("../../action-factory").ActionCreator
      );

      const action = factory.create("undefined_deps_action", undefined);

      expect(action).toBeInstanceOf(NoOpAction);
    });

    it("should handle empty string action names", () => {
      const creator = () => new NoOpAction();
      factory.register("", creator);

      expect(factory.isRegistered("")).toBe(true);
      expect(factory.list()).toContain("");

      const action = factory.create("");
      expect(action).toBeInstanceOf(NoOpAction);
    });

    it("should handle action creators that return null", () => {
      const creator = () =>
        null as unknown as import("../../types").WorkerAction;
      factory.register(
        "null_action",
        creator as unknown as import("../../action-factory").ActionCreator
      );

      expect(() => factory.create("null_action")).not.toThrow();
    });
  });

  describe("integration with action types", () => {
    it("should work with NoOpAction", () => {
      const creator = () => new NoOpAction();
      factory.register("noop", creator);

      const action = factory.create("noop");
      expect(action).toBeInstanceOf(NoOpAction);
      expect(action.name).toBe("no_op");
    });

    it("should work with ValidationAction", () => {
      const creator = () => new ValidationAction(() => null);
      factory.register("validation", creator);

      const action = factory.create("validation");
      expect(action).toBeInstanceOf(ValidationAction);
      expect(action.name).toBe("validation");
    });

    it("should work with custom actions", () => {
      class CustomAction extends NoOpAction {
        name = "custom_action";
      }

      const creator = () => new CustomAction();
      factory.register("custom", creator);

      const action = factory.create("custom");
      expect(action).toBeInstanceOf(CustomAction);
      expect(action.name).toBe("custom_action");
    });
  });
});
