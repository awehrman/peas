import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerActions,
  createActionRegistration,
  type ActionRegistration,
} from "../../action-registry";
import { ActionFactory } from "../../../core/action-factory";
import { BaseAction } from "../../../core/base-action";
import type { ActionContext } from "../../../core/types";

// Mock ActionFactory
vi.mock("../../../core/action-factory");

describe("Action Registry - Integration", () => {
  let mockActionFactory: ActionFactory;

  // Create test action classes
  class TestAction1 extends BaseAction<{ input: string }, { output: string }> {
    name = "test-action-1";

    async execute(
      data: { input: string },
      _deps: unknown,
      _context: ActionContext
    ): Promise<{ output: string }> {
      return { output: `processed-1: ${data.input}` };
    }
  }

  class TestAction2 extends BaseAction<{ value: number }, { result: number }> {
    name = "test-action-2";

    async execute(
      data: { value: number },
      _deps: unknown,
      _context: ActionContext
    ): Promise<{ result: number }> {
      return { result: data.value * 2 };
    }
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock ActionFactory
    mockActionFactory = {
      register: vi.fn(),
    } as unknown as ActionFactory;
  });

  it("should integrate createActionRegistration with registerActions", () => {
    // Arrange
    const registration1 = createActionRegistration("action-1", TestAction1);
    const registration2 = createActionRegistration("action-2", TestAction2);
    const actions: ActionRegistration[] = [registration1, registration2];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledTimes(2);
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "action-1",
      expect.any(Function)
    );
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "action-2",
      expect.any(Function)
    );

    // Verify factory functions create correct instances
    const firstCall = vi.mocked(mockActionFactory.register).mock.calls[0];
    const secondCall = vi.mocked(mockActionFactory.register).mock.calls[1];

    const action1 = firstCall?.[1]?.();
    const action2 = secondCall?.[1]?.();

    expect(action1).toBeInstanceOf(TestAction1);
    expect(action2).toBeInstanceOf(TestAction2);
    expect(action1?.name).toBe("test-action-1");
    expect(action2?.name).toBe("test-action-2");
  });

  it("should handle multiple registrations of the same action class", () => {
    // Arrange
    const registration1 = createActionRegistration("action-1", TestAction1);
    const registration2 = createActionRegistration(
      "action-1-alias",
      TestAction1
    );
    const actions: ActionRegistration[] = [registration1, registration2];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledTimes(2);
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "action-1",
      expect.any(Function)
    );
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "action-1-alias",
      expect.any(Function)
    );

    // Verify both factories create instances of the same class
    const calls = vi.mocked(mockActionFactory.register).mock.calls;
    const action1 = calls[0]?.[1]?.();
    const action2 = calls[1]?.[1]?.();

    expect(action1).toBeInstanceOf(TestAction1);
    expect(action2).toBeInstanceOf(TestAction1);
    expect(action1).not.toBe(action2); // Different instances
  });

  it("should handle empty registrations array", () => {
    // Arrange
    const actions: ActionRegistration[] = [];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).not.toHaveBeenCalled();
  });

  it("should handle single registration", () => {
    // Arrange
    const registration = createActionRegistration("single-action", TestAction1);
    const actions: ActionRegistration[] = [registration];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledTimes(1);
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "single-action",
      expect.any(Function)
    );

    // Verify factory creates correct instance
    const call = vi.mocked(mockActionFactory.register).mock.calls[0];
    const action = call?.[1]?.();
    expect(action).toBeInstanceOf(TestAction1);
  });

  it("should handle registrations with special characters in names", () => {
    // Arrange
    const registration1 = createActionRegistration(
      "action-with-special-chars-123!@#",
      TestAction1
    );
    const registration2 = createActionRegistration(
      "another-action",
      TestAction2
    );
    const actions: ActionRegistration[] = [registration1, registration2];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "action-with-special-chars-123!@#",
      expect.any(Function)
    );
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "another-action",
      expect.any(Function)
    );

    // Verify factories work correctly
    const calls = vi.mocked(mockActionFactory.register).mock.calls;
    const action1 = calls[0]?.[1]?.();
    const action2 = calls[1]?.[1]?.();

    expect(action1).toBeInstanceOf(TestAction1);
    expect(action2).toBeInstanceOf(TestAction2);
  });

  it("should handle registrations with empty names", () => {
    // Arrange
    const registration = createActionRegistration("", TestAction1);
    const actions: ActionRegistration[] = [registration];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "",
      expect.any(Function)
    );

    // Verify factory still works
    const call = vi.mocked(mockActionFactory.register).mock.calls[0];
    const action = call?.[1]?.();
    expect(action).toBeInstanceOf(TestAction1);
  });

  it("should maintain type safety throughout the integration", () => {
    // Arrange
    const registration1: ActionRegistration = createActionRegistration(
      "typed-action-1",
      TestAction1
    );
    const registration2: ActionRegistration = createActionRegistration(
      "typed-action-2",
      TestAction2
    );
    const actions: ActionRegistration[] = [registration1, registration2];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(registration1).toHaveProperty("name");
    expect(registration1).toHaveProperty("factory");
    expect(registration2).toHaveProperty("name");
    expect(registration2).toHaveProperty("factory");

    // Verify factories return BaseAction instances
    const calls = vi.mocked(mockActionFactory.register).mock.calls;
    const action1 = calls[0]?.[1]?.();
    const action2 = calls[1]?.[1]?.();

    expect(action1).toBeInstanceOf(BaseAction);
    expect(action2).toBeInstanceOf(BaseAction);
  });

  it("should handle large number of registrations", () => {
    // Arrange
    const actions: ActionRegistration[] = [];

    for (let i = 0; i < 50; i++) {
      const registration = createActionRegistration(`action-${i}`, TestAction1);
      actions.push(registration);
    }

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledTimes(50);

    // Verify all registrations work
    const calls = vi.mocked(mockActionFactory.register).mock.calls;
    for (let i = 0; i < 50; i++) {
      expect(calls[i]?.[0]).toBe(`action-${i}`);
      const action = calls[i]?.[1]?.();
      expect(action).toBeInstanceOf(TestAction1);
    }
  });
});
