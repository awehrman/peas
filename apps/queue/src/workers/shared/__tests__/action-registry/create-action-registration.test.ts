import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createActionRegistration,
  type ActionRegistration,
} from "../../action-registry";
import { BaseAction } from "../../../core/base-action";
import type { ActionContext } from "../../../core/types";

describe("Action Registry - createActionRegistration", () => {
  // Create a concrete test action class
  class TestAction extends BaseAction<{ input: string }, { output: string }> {
    name = "test-action";

    async execute(
      data: { input: string },
      _deps: unknown,
      _context: ActionContext
    ): Promise<{ output: string }> {
      return { output: `processed: ${data.input}` };
    }
  }

  class AnotherTestAction extends BaseAction<
    { value: number },
    { result: number }
  > {
    name = "another-test-action";

    async execute(
      data: { value: number },
      _deps: unknown,
      _context: ActionContext
    ): Promise<{ result: number }> {
      return { result: data.value * 2 };
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create action registration with correct name and factory", () => {
    // Act
    const registration = createActionRegistration("my-action", TestAction);

    // Assert
    expect(registration).toEqual({
      name: "my-action",
      factory: expect.any(Function),
    });

    // Verify factory creates correct instance
    const action = registration.factory();
    expect(action).toBeInstanceOf(TestAction);
    expect(action.name).toBe("test-action");
  });

  it("should create action registration with different action class", () => {
    // Act
    const registration = createActionRegistration(
      "another-action",
      AnotherTestAction
    );

    // Assert
    expect(registration).toEqual({
      name: "another-action",
      factory: expect.any(Function),
    });

    // Verify factory creates correct instance
    const action = registration.factory();
    expect(action).toBeInstanceOf(AnotherTestAction);
    expect(action.name).toBe("another-test-action");
  });

  it("should create action registration with empty name", () => {
    // Act
    const registration = createActionRegistration("", TestAction);

    // Assert
    expect(registration.name).toBe("");
    expect(registration.factory).toBeInstanceOf(Function);

    // Verify factory still works
    const action = registration.factory();
    expect(action).toBeInstanceOf(TestAction);
  });

  it("should create action registration with special characters in name", () => {
    // Act
    const registration = createActionRegistration(
      "action-with-special-chars-123!@#",
      TestAction
    );

    // Assert
    expect(registration.name).toBe("action-with-special-chars-123!@#");
    expect(registration.factory).toBeInstanceOf(Function);

    // Verify factory still works
    const action = registration.factory();
    expect(action).toBeInstanceOf(TestAction);
  });

  it("should create multiple registrations with same action class", () => {
    // Act
    const registration1 = createActionRegistration("action-1", TestAction);
    const registration2 = createActionRegistration("action-2", TestAction);

    // Assert
    expect(registration1.name).toBe("action-1");
    expect(registration2.name).toBe("action-2");

    // Verify both factories create instances of the same class
    const action1 = registration1.factory();
    const action2 = registration2.factory();

    expect(action1).toBeInstanceOf(TestAction);
    expect(action2).toBeInstanceOf(TestAction);
    expect(action1).not.toBe(action2); // Different instances
  });

  it("should create factory that returns new instances each time", () => {
    // Act
    const registration = createActionRegistration(
      "reusable-action",
      TestAction
    );

    // Assert
    const action1 = registration.factory();
    const action2 = registration.factory();

    expect(action1).toBeInstanceOf(TestAction);
    expect(action2).toBeInstanceOf(TestAction);
    expect(action1).not.toBe(action2); // Different instances
  });

  it("should work with action classes that have default constructor", () => {
    // Create action class with default constructor
    class ActionWithDefaultConstructor extends BaseAction<
      { input: string },
      { output: string }
    > {
      name = "default-constructor-action";

      async execute(
        data: { input: string },
        _deps: unknown,
        _context: ActionContext
      ): Promise<{ output: string }> {
        return { output: `processed: ${data.input}` };
      }
    }

    // Act
    const registration = createActionRegistration(
      "default-action",
      ActionWithDefaultConstructor
    );

    // Assert
    expect(registration.name).toBe("default-action");

    // Verify factory creates instance
    const action = registration.factory();
    expect(action).toBeInstanceOf(ActionWithDefaultConstructor);
    expect(action.name).toBe("default-constructor-action");
  });

  it("should maintain type safety for action registration", () => {
    // Act
    const registration: ActionRegistration = createActionRegistration(
      "typed-action",
      TestAction
    );

    // Assert
    expect(registration).toHaveProperty("name");
    expect(registration).toHaveProperty("factory");
    expect(typeof registration.name).toBe("string");
    expect(typeof registration.factory).toBe("function");

    // Verify factory returns BaseAction
    const action = registration.factory();
    expect(action).toBeInstanceOf(BaseAction);
  });
});
