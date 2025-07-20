import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionFactory } from "../../../core/action-factory";
import {
  ProcessCategorizationAction,
  SaveCategorizationAction,
  registerCategorizationActions,
} from "../index";

describe("Categorization Actions Index", () => {
  let mockFactory: ActionFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFactory = new ActionFactory();
  });

  describe("exports", () => {
    it("should export ProcessCategorizationAction", () => {
      expect(ProcessCategorizationAction).toBeDefined();
      expect(typeof ProcessCategorizationAction).toBe("function");
    });

    it("should export SaveCategorizationAction", () => {
      expect(SaveCategorizationAction).toBeDefined();
      expect(typeof SaveCategorizationAction).toBe("function");
    });

    it("should export registerCategorizationActions function", () => {
      expect(registerCategorizationActions).toBeDefined();
      expect(typeof registerCategorizationActions).toBe("function");
    });
  });

  describe("registerCategorizationActions", () => {
    it("should register process_categorization action", () => {
      // Spy on the factory's register method
      const registerSpy = vi.spyOn(mockFactory, "register");

      registerCategorizationActions(mockFactory);

      expect(registerSpy).toHaveBeenCalledWith(
        "process_categorization",
        expect.any(Function)
      );
    });

    it("should register save_categorization action", () => {
      const registerSpy = vi.spyOn(mockFactory, "register");

      registerCategorizationActions(mockFactory);

      expect(registerSpy).toHaveBeenCalledWith(
        "save_categorization",
        expect.any(Function)
      );
    });

    it("should register exactly two actions", () => {
      const registerSpy = vi.spyOn(mockFactory, "register");

      registerCategorizationActions(mockFactory);

      expect(registerSpy).toHaveBeenCalledTimes(2);
    });

    it("should register actions with correct names", () => {
      const registerSpy = vi.spyOn(mockFactory, "register");

      registerCategorizationActions(mockFactory);

      const calls = registerSpy.mock.calls;
      const registeredNames = calls.map((call) => call[0]);

      expect(registeredNames).toContain("process_categorization");
      expect(registeredNames).toContain("save_categorization");
    });

    it("should register action factories that create correct instances", () => {
      registerCategorizationActions(mockFactory);

      // Test process_categorization action creation
      const processAction = mockFactory.create("process_categorization");
      expect(processAction).toBeInstanceOf(ProcessCategorizationAction);

      // Test save_categorization action creation
      const saveAction = mockFactory.create("save_categorization");
      expect(saveAction).toBeInstanceOf(SaveCategorizationAction);
    });

    it("should allow re-registration of actions", () => {
      const registerSpy = vi.spyOn(mockFactory, "register");

      // Register actions twice
      registerCategorizationActions(mockFactory);
      registerCategorizationActions(mockFactory);

      // Should not throw and should register 4 times total (2 actions × 2 calls)
      expect(registerSpy).toHaveBeenCalledTimes(4);
    });

    it("should register actions that can be listed", () => {
      registerCategorizationActions(mockFactory);

      const registeredActions = mockFactory.list();

      expect(registeredActions).toContain("process_categorization");
      expect(registeredActions).toContain("save_categorization");
      expect(registeredActions).toHaveLength(2);
    });

    it("should register actions that can be checked for existence", () => {
      registerCategorizationActions(mockFactory);

      expect(mockFactory.isRegistered("process_categorization")).toBe(true);
      expect(mockFactory.isRegistered("save_categorization")).toBe(true);
      expect(mockFactory.isRegistered("nonexistent_action")).toBe(false);
    });

    it("should create actions with correct names", () => {
      registerCategorizationActions(mockFactory);

      const processAction = mockFactory.create("process_categorization");
      const saveAction = mockFactory.create("save_categorization");

      expect(processAction.name).toBe("process-categorization");
      expect(saveAction.name).toBe("save-categorization");
    });

    it("should handle factory with existing registrations", () => {
      // Pre-register some other actions
      mockFactory.register(
        "existing_action",
        () =>
          ({
            name: "existing_action",
            execute: vi.fn(),
          }) as unknown as import("../../../core/types").WorkerAction
      );

      registerCategorizationActions(mockFactory);

      const allActions = mockFactory.list();
      expect(allActions).toContain("existing_action");
      expect(allActions).toContain("process_categorization");
      expect(allActions).toContain("save_categorization");
      expect(allActions).toHaveLength(3);
    });

    it("should throw error when trying to create unregistered action", () => {
      registerCategorizationActions(mockFactory);

      expect(() => {
        mockFactory.create("nonexistent_action");
      }).toThrow(
        "Action 'nonexistent_action' is not registered in the ActionFactory."
      );
    });
  });

  describe("action factory functions", () => {
    it("should create process_categorization action with factory function", () => {
      registerCategorizationActions(mockFactory);

      const action = mockFactory.create("process_categorization");

      expect(action).toBeDefined();
      expect(action.name).toBe("process-categorization");
      expect(typeof action.execute).toBe("function");
    });

    it("should create save_categorization action with factory function", () => {
      registerCategorizationActions(mockFactory);

      const action = mockFactory.create("save_categorization");

      expect(action).toBeDefined();
      expect(action.name).toBe("save-categorization");
      expect(typeof action.execute).toBe("function");
    });

    it("should create different instances for each call", () => {
      registerCategorizationActions(mockFactory);

      const action1 = mockFactory.create("process_categorization");
      const action2 = mockFactory.create("process_categorization");

      expect(action1).not.toBe(action2);
      expect(action1).toBeInstanceOf(ProcessCategorizationAction);
      expect(action2).toBeInstanceOf(ProcessCategorizationAction);
    });
  });
});
