import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "../../../workers/categorization/dependencies";
import type { ActionFactory } from "../../../workers/core/action-factory";

// Mock the action classes
vi.mock("../../categorization/actions/determine-category/action", () => ({
  DetermineCategoryAction: class MockDetermineCategoryAction {},
}));

vi.mock("../../categorization/actions/save-category/action", () => ({
  SaveCategoryAction: class MockSaveCategoryAction {},
}));

vi.mock("../../categorization/actions/determine-tags/action", () => ({
  DetermineTagsAction: class MockDetermineTagsAction {},
}));

vi.mock("../../categorization/actions/save-tags/action", () => ({
  SaveTagsAction: class MockSaveTagsAction {},
}));

describe("Categorization Register", () => {
  let mockFactory: ActionFactory<
    CategorizationJobData,
    CategorizationWorkerDependencies,
    CategorizationJobData
  >;
  let registerCategorizationActions: (
    factory: ActionFactory<
      CategorizationJobData,
      CategorizationWorkerDependencies,
      CategorizationJobData
    >
  ) => void;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockFactory = {
      create: vi.fn(),
      register: vi.fn(),
    } as unknown as ActionFactory<
      CategorizationJobData,
      CategorizationWorkerDependencies,
      CategorizationJobData
    >;

    // Import the function to test
    const { registerCategorizationActions: importedFunction } = await import(
      "../../categorization/register"
    );
    registerCategorizationActions = importedFunction;
  });

  describe("registerCategorizationActions", () => {
    it("should register all categorization actions successfully", () => {
      // Act
      registerCategorizationActions(mockFactory);

      // Assert
      expect(mockFactory.register).toHaveBeenCalledTimes(4);

      // Check that all four actions are registered
      const registerCalls = vi.mocked(mockFactory.register).mock.calls;
      expect(registerCalls).toHaveLength(4);

      // Verify the action names are registered
      const registeredActionNames = registerCalls.map((call) => call[0]);
      expect(registeredActionNames).toContain(ActionName.DETERMINE_CATEGORY);
      expect(registeredActionNames).toContain(ActionName.SAVE_CATEGORY);
      expect(registeredActionNames).toContain(ActionName.DETERMINE_TAGS);
      expect(registeredActionNames).toContain(ActionName.SAVE_TAGS);
    });

    it("should throw error for null factory", () => {
      // Act & Assert
      expect(() =>
        registerCategorizationActions(
          null as unknown as ActionFactory<
            CategorizationJobData,
            CategorizationWorkerDependencies,
            CategorizationJobData
          >
        )
      ).toThrow("Invalid factory");
    });

    it("should throw error for undefined factory", () => {
      // Act & Assert
      expect(() =>
        registerCategorizationActions(
          undefined as unknown as ActionFactory<
            CategorizationJobData,
            CategorizationWorkerDependencies,
            CategorizationJobData
          >
        )
      ).toThrow("Invalid factory");
    });

    it("should throw error for non-object factory", () => {
      // Act & Assert
      expect(() =>
        registerCategorizationActions(
          "not an object" as unknown as ActionFactory<
            CategorizationJobData,
            CategorizationWorkerDependencies,
            CategorizationJobData
          >
        )
      ).toThrow("Invalid factory");
      expect(() =>
        registerCategorizationActions(
          123 as unknown as ActionFactory<
            CategorizationJobData,
            CategorizationWorkerDependencies,
            CategorizationJobData
          >
        )
      ).toThrow("Invalid factory");
      expect(() =>
        registerCategorizationActions(
          true as unknown as ActionFactory<
            CategorizationJobData,
            CategorizationWorkerDependencies,
            CategorizationJobData
          >
        )
      ).toThrow("Invalid factory");
    });

    it("should register actions in correct order", () => {
      // Act
      registerCategorizationActions(mockFactory);

      // Assert
      const registerCalls = vi.mocked(mockFactory.register).mock.calls;
      expect(registerCalls).toHaveLength(4);

      // Verify order: determine category, save category, determine tags, save tags
      expect(registerCalls[0]?.[0]).toBe(ActionName.DETERMINE_CATEGORY);
      expect(registerCalls[1]?.[0]).toBe(ActionName.SAVE_CATEGORY);
      expect(registerCalls[2]?.[0]).toBe(ActionName.DETERMINE_TAGS);
      expect(registerCalls[3]?.[0]).toBe(ActionName.SAVE_TAGS);
    });

    it("should register actions with correct action classes", async () => {
      // Act
      registerCategorizationActions(mockFactory);

      // Assert
      const registerCalls = vi.mocked(mockFactory.register).mock.calls;

      // Check that action classes are passed (we can't test exact classes due to mocking)
      expect(registerCalls[0]?.[1]).toBeDefined();
      expect(registerCalls[1]?.[1]).toBeDefined();
      expect(registerCalls[2]?.[1]).toBeDefined();
      expect(registerCalls[3]?.[1]).toBeDefined();
      expect(typeof registerCalls[0]?.[1]).toBe("function");
      expect(typeof registerCalls[1]?.[1]).toBe("function");
      expect(typeof registerCalls[2]?.[1]).toBe("function");
      expect(typeof registerCalls[3]?.[1]).toBe("function");
    });

    it("should handle factory with missing register method", () => {
      // Arrange
      const invalidFactory = {
        create: vi.fn(),
        // Missing register method
      } as unknown as ActionFactory<
        CategorizationJobData,
        CategorizationWorkerDependencies,
        CategorizationJobData
      >;

      // Act & Assert
      expect(() => registerCategorizationActions(invalidFactory)).toThrow(
        "factory.register is not a function"
      );
    });

    it("should handle factory with non-function register method", () => {
      // Arrange
      const invalidFactory = {
        create: vi.fn(),
        register: "not a function",
      } as unknown as ActionFactory<
        CategorizationJobData,
        CategorizationWorkerDependencies,
        CategorizationJobData
      >;

      // Act & Assert
      expect(() => registerCategorizationActions(invalidFactory)).toThrow(
        "factory.register is not a function"
      );
    });

    it("should work with factory that has additional properties", () => {
      // Arrange
      const extendedFactory = {
        create: vi.fn(),
        register: vi.fn(),
        additionalProperty: "some value",
        anotherMethod: vi.fn(),
      } as unknown as ActionFactory<
        CategorizationJobData,
        CategorizationWorkerDependencies,
        CategorizationJobData
      >;

      // Act
      registerCategorizationActions(extendedFactory);

      // Assert
      expect(extendedFactory.register).toHaveBeenCalledTimes(4);
    });

    it("should handle factory with async register method", async () => {
      // Arrange
      const asyncFactory = {
        create: vi.fn(),
        register: vi.fn().mockResolvedValue(undefined),
      } as unknown as ActionFactory<
        CategorizationJobData,
        CategorizationWorkerDependencies,
        CategorizationJobData
      >;

      // Act
      registerCategorizationActions(asyncFactory);

      // Assert
      expect(asyncFactory.register).toHaveBeenCalledTimes(4);
    });
  });
});
