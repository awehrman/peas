import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  registerActions,
  type ActionRegistration,
} from "../../action-registry";
import { ActionFactory } from "../../../core/action-factory";
import { BaseAction } from "../../../core/base-action";

// Mock ActionFactory
vi.mock("../../../core/action-factory");

describe("Action Registry - registerActions", () => {
  let mockActionFactory: ActionFactory;
  let mockAction1: BaseAction<unknown, unknown>;
  let mockAction2: BaseAction<unknown, unknown>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock actions
    mockAction1 = {
      name: "test-action-1",
      execute: vi.fn(),
    } as unknown as BaseAction<unknown, unknown>;

    mockAction2 = {
      name: "test-action-2",
      execute: vi.fn(),
    } as unknown as BaseAction<unknown, unknown>;

    // Create mock ActionFactory
    mockActionFactory = {
      register: vi.fn(),
    } as unknown as ActionFactory;
  });

  it("should register multiple actions successfully", () => {
    // Arrange
    const actions: ActionRegistration[] = [
      {
        name: "action1",
        factory: () => mockAction1,
      },
      {
        name: "action2",
        factory: () => mockAction2,
      },
    ];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledTimes(2);
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "action1",
      expect.any(Function)
    );
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "action2",
      expect.any(Function)
    );

    // Verify factory functions return correct actions
    const firstCall = vi.mocked(mockActionFactory.register).mock.calls[0];
    const secondCall = vi.mocked(mockActionFactory.register).mock.calls[1];

    expect(firstCall?.[1]()).toBe(mockAction1);
    expect(secondCall?.[1]()).toBe(mockAction2);
  });

  it("should register a single action successfully", () => {
    // Arrange
    const actions: ActionRegistration[] = [
      {
        name: "single-action",
        factory: () => mockAction1,
      },
    ];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledTimes(1);
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "single-action",
      expect.any(Function)
    );

    // Verify factory function returns correct action
    const call = vi.mocked(mockActionFactory.register).mock.calls[0];
    expect(call?.[1]()).toBe(mockAction1);
  });

  it("should handle empty actions array", () => {
    // Arrange
    const actions: ActionRegistration[] = [];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).not.toHaveBeenCalled();
  });

  it("should handle actions with special characters in names", () => {
    // Arrange
    const actions: ActionRegistration[] = [
      {
        name: "action-with-special-chars-123!@#",
        factory: () => mockAction1,
      },
    ];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "action-with-special-chars-123!@#",
      expect.any(Function)
    );
  });

  it("should handle actions with empty names", () => {
    // Arrange
    const actions: ActionRegistration[] = [
      {
        name: "",
        factory: () => mockAction1,
      },
    ];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "",
      expect.any(Function)
    );
  });

  it("should handle duplicate action names (last one wins)", () => {
    // Arrange
    const actions: ActionRegistration[] = [
      {
        name: "duplicate-action",
        factory: () => mockAction1,
      },
      {
        name: "duplicate-action",
        factory: () => mockAction2,
      },
    ];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledTimes(2);
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "duplicate-action",
      expect.any(Function)
    );

    // Verify both factory functions are called
    const calls = vi.mocked(mockActionFactory.register).mock.calls;
    expect(calls[0]?.[1]()).toBe(mockAction1);
    expect(calls[1]?.[1]()).toBe(mockAction2);
  });

  it("should handle factory functions that create new instances", () => {
    // Arrange
    let instanceCount = 0;
    const actions: ActionRegistration[] = [
      {
        name: "dynamic-action",
        factory: () => {
          instanceCount++;
          return {
            name: `dynamic-action-${instanceCount}`,
            execute: vi.fn(),
          } as unknown as BaseAction<unknown, unknown>;
        },
      },
    ];

    // Act
    registerActions(mockActionFactory, actions);

    // Assert
    expect(mockActionFactory.register).toHaveBeenCalledWith(
      "dynamic-action",
      expect.any(Function)
    );

    // Verify factory creates new instances
    const call = vi.mocked(mockActionFactory.register).mock.calls[0];
    const instance1 = call?.[1]?.();
    const instance2 = call?.[1]?.();

    expect(instance1).not.toBe(instance2);
    expect(instance1?.name).toBe("dynamic-action-1");
    expect(instance2?.name).toBe("dynamic-action-2");
  });
});
