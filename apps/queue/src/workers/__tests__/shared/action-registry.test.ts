import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import { ActionFactory } from "../../core/action-factory";
import {
  BaseAction,
  LoggingAction,
  NoOpAction,
  ValidationAction,
} from "../../core/base-action";
import type { ActionContext } from "../../core/types";
import {
  type ActionRegistration,
  createActionRegistration,
  registerActions,
} from "../../shared/action-registry";
import type { BaseJobData } from "../../types";

// Mock the core ActionFactory
vi.mock("../../core/action-factory", () => {
  const MockActionFactory = vi.fn();

  // Create a simple mock that doesn't cause circular references
  MockActionFactory.mockImplementation(() => ({
    register: vi.fn(),
    has: vi.fn(),
    create: vi.fn(),
    getRegisteredActions: vi.fn(),
    clear: vi.fn(),
  }));

  return { ActionFactory: MockActionFactory };
});

describe("ActionRegistry", () => {
  let mockFactory: ActionFactory<BaseJobData, object, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFactory = new ActionFactory<BaseJobData, object, unknown>();
  });

  describe("registerActions", () => {
    it("should register multiple actions with the factory", () => {
      const actions: ActionRegistration<BaseJobData, object, unknown>[] = [
        {
          name: ActionName.NO_OP,
          factory: () => new NoOpAction(),
        },
        {
          name: ActionName.LOGGING,
          factory: () => new LoggingAction("test message"),
        },
      ];

      registerActions(mockFactory, actions);

      expect(mockFactory.register).toHaveBeenCalledTimes(2);
      expect(mockFactory.register).toHaveBeenCalledWith(
        ActionName.NO_OP,
        actions[0]!.factory
      );
      expect(mockFactory.register).toHaveBeenCalledWith(
        ActionName.LOGGING,
        actions[1]!.factory
      );
    });

    it("should handle empty actions array", () => {
      const actions: ActionRegistration<BaseJobData, object, unknown>[] = [];

      registerActions(mockFactory, actions);

      expect(mockFactory.register).not.toHaveBeenCalled();
    });

    it("should work with different generic types", () => {
      interface CustomData extends BaseJobData {
        customField: string;
      }

      interface CustomDeps {
        logger: { log: (msg: string) => void };
      }

      const customFactory = new ActionFactory<
        CustomData,
        CustomDeps,
        unknown
      >();
      const actions: ActionRegistration<CustomData, CustomDeps, unknown>[] = [
        {
          name: ActionName.NO_OP,
          factory: () => new NoOpAction<CustomData>(),
        },
      ];

      registerActions(customFactory, actions);

      expect(customFactory.register).toHaveBeenCalledWith(
        ActionName.NO_OP,
        actions[0]!.factory
      );
    });

    it("should register actions in order", () => {
      const actionNames = [
        ActionName.NO_OP,
        ActionName.LOGGING,
        ActionName.VALIDATION,
      ];

      const actions: ActionRegistration<BaseJobData, object, unknown>[] =
        actionNames.map((name) => ({
          name,
          factory: () => new NoOpAction(),
        }));

      registerActions(mockFactory, actions);

      expect(mockFactory.register).toHaveBeenCalledTimes(3);
      actionNames.forEach((name, index) => {
        expect(mockFactory.register).toHaveBeenNthCalledWith(
          index + 1,
          name,
          actions[index]!.factory
        );
      });
    });

    it("should handle actions with different result types", () => {
      const actions: ActionRegistration<BaseJobData, object, unknown>[] = [
        {
          name: ActionName.NO_OP,
          factory: () => new NoOpAction(),
        },
        {
          name: ActionName.LOGGING,
          factory: () => new LoggingAction("test"),
        },
      ];

      expect(() => {
        registerActions(mockFactory, actions);
      }).not.toThrow();
    });
  });

  describe("createActionRegistration", () => {
    it("should create action registration with class constructor", () => {
      const registration = createActionRegistration(
        ActionName.NO_OP,
        NoOpAction
      );

      expect(registration).toEqual({
        name: ActionName.NO_OP,
        factory: expect.any(Function),
      });

      // Test that the factory creates a new instance
      const action = registration.factory();
      expect(action).toBeInstanceOf(NoOpAction);
      expect(action.name).toBe(ActionName.NO_OP);
    });

    it("should create action registration with validation action", () => {
      const validator = (data: BaseJobData) =>
        data.jobId ? null : new Error("Missing jobId");

      const registration = createActionRegistration(
        ActionName.VALIDATION,
        class extends ValidationAction<BaseJobData> {
          constructor() {
            super(validator);
          }
        }
      );

      expect(registration.name).toBe(ActionName.VALIDATION);

      const action = registration.factory();
      expect(action).toBeInstanceOf(ValidationAction);
      expect(action.name).toBe(ActionName.VALIDATION);
    });

    it("should create action registration with logging action", () => {
      const registration = createActionRegistration(
        ActionName.LOGGING,
        class extends LoggingAction<BaseJobData> {
          constructor() {
            super("test log message");
          }
        }
      );

      expect(registration.name).toBe(ActionName.LOGGING);

      const action = registration.factory();
      expect(action).toBeInstanceOf(LoggingAction);
      expect(action.name).toBe(ActionName.LOGGING);
    });

    it("should work with custom action classes", () => {
      class CustomAction extends NoOpAction<BaseJobData> {
        name = ActionName.NO_OP;
        customProperty = "test";
      }

      const registration = createActionRegistration(
        ActionName.NO_OP,
        CustomAction
      );

      const action = registration.factory();
      expect(action).toBeInstanceOf(CustomAction);
      expect((action as CustomAction).customProperty).toBe("test");
    });

    it("should create independent action instances", () => {
      const registration = createActionRegistration(
        ActionName.NO_OP,
        NoOpAction
      );

      const action1 = registration.factory();
      const action2 = registration.factory();

      expect(action1).not.toBe(action2);
      expect(action1).toBeInstanceOf(NoOpAction);
      expect(action2).toBeInstanceOf(NoOpAction);
    });
  });

  describe("integration", () => {
    it("should work with both functions together", () => {
      const registrations = [
        createActionRegistration(ActionName.NO_OP, NoOpAction),
        createActionRegistration(
          ActionName.LOGGING,
          class extends LoggingAction<BaseJobData> {
            constructor() {
              super("integration test");
            }
          }
        ),
      ];

      registerActions(mockFactory, registrations);

      expect(mockFactory.register).toHaveBeenCalledTimes(2);
      expect(mockFactory.register).toHaveBeenCalledWith(
        ActionName.NO_OP,
        registrations[0]!.factory
      );
      expect(mockFactory.register).toHaveBeenCalledWith(
        ActionName.LOGGING,
        registrations[1]!.factory
      );
    });

    it("should handle complex action registration scenarios", () => {
      const actions: ActionRegistration<BaseJobData, object, unknown>[] = [];

      // Add multiple action types
      actions.push(createActionRegistration(ActionName.NO_OP, NoOpAction));
      actions.push(
        createActionRegistration(
          ActionName.VALIDATION,
          class extends ValidationAction<BaseJobData> {
            constructor() {
              super(() => null);
            }
          }
        )
      );
      actions.push(
        createActionRegistration(
          ActionName.LOGGING,
          class extends LoggingAction<BaseJobData> {
            constructor() {
              super("complex scenario");
            }
          }
        )
      );

      registerActions(mockFactory, actions);

      expect(mockFactory.register).toHaveBeenCalledTimes(3);

      // Verify all actions were registered
      const registeredCalls = (mockFactory.register as ReturnType<typeof vi.fn>)
        .mock.calls;
      expect(registeredCalls).toHaveLength(3);

      // Verify action names
      const registeredNames = registeredCalls.map((call) => call[0]);
      expect(registeredNames).toEqual([
        ActionName.NO_OP,
        ActionName.VALIDATION,
        ActionName.LOGGING,
      ]);
    });
  });

  describe("type safety", () => {
    it("should maintain type constraints with custom data types", () => {
      interface CustomData extends BaseJobData {
        customField: string;
      }

      interface CustomDeps {
        logger: { log: (msg: string) => void };
      }

      interface CustomResult {
        success: boolean;
      }

      const registration = createActionRegistration<
        CustomData,
        CustomDeps,
        CustomResult
      >(
        ActionName.NO_OP,
        class extends BaseAction<CustomData, CustomDeps, CustomResult> {
          name = ActionName.NO_OP;

          async execute(
            _data: CustomData,
            _deps: CustomDeps,
            _context: ActionContext
          ): Promise<CustomResult> {
            return { success: true };
          }
        }
      );

      expect(registration.name).toBe(ActionName.NO_OP);
      expect(typeof registration.factory).toBe("function");
    });

    it("should work with minimal generic constraints", () => {
      const registration = createActionRegistration<
        BaseJobData,
        object,
        unknown
      >(ActionName.NO_OP, NoOpAction);

      expect(registration.name).toBe(ActionName.NO_OP);
      expect(typeof registration.factory).toBe("function");
    });
  });

  describe("error handling", () => {
    it("should handle null factory gracefully", () => {
      expect(() => {
        registerActions(
          null as unknown as ActionFactory<BaseJobData, object, unknown>,
          []
        );
      }).not.toThrow();
    });

    it("should handle undefined actions array", () => {
      expect(() => {
        registerActions(
          mockFactory,
          undefined as unknown as ActionRegistration<
            BaseJobData,
            object,
            unknown
          >[]
        );
      }).toThrow();
    });

    it("should handle actions with invalid factory functions", () => {
      const actions: ActionRegistration<BaseJobData, object, unknown>[] = [
        {
          name: ActionName.NO_OP,
          factory: null as unknown as () => NoOpAction,
        },
      ];

      // The function doesn't throw, it just calls the factory which may fail later
      expect(() => {
        registerActions(mockFactory, actions);
      }).not.toThrow();
    });
  });

  describe("ActionRegistration interface", () => {
    it("should have correct structure", () => {
      const registration: ActionRegistration<BaseJobData, object, unknown> = {
        name: ActionName.NO_OP,
        factory: () => new NoOpAction(),
      };

      expect(registration).toHaveProperty("name");
      expect(registration).toHaveProperty("factory");
      expect(typeof registration.name).toBe("string");
      expect(typeof registration.factory).toBe("function");
    });

    it("should work with different action name types", () => {
      const actionNames = [
        ActionName.NO_OP,
        ActionName.LOGGING,
        ActionName.VALIDATION,
      ];

      actionNames.forEach((name) => {
        const registration: ActionRegistration<BaseJobData, object, unknown> = {
          name,
          factory: () => new NoOpAction(),
        };

        expect(registration.name).toBe(name);
        expect(typeof registration.factory).toBe("function");
      });
    });
  });
});
