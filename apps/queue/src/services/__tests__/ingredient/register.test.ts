import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import { ActionFactory } from "../../../workers/core/action-factory";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../../workers/ingredient/dependencies";
import {
  createActionRegistration,
  registerActions,
} from "../../../workers/shared/action-registry";
import { ParseIngredientLineAction } from "../../ingredient/actions/parse-ingredient-line/action";
import { SaveIngredientLineAction } from "../../ingredient/actions/save-ingredient-line/action";
import { registerIngredientActions } from "../../ingredient/register";

// Mock the action registry
vi.mock("../../../workers/shared/action-registry", () => ({
  createActionRegistration: vi.fn(),
  registerActions: vi.fn(),
}));

// Mock the action classes
vi.mock("../../ingredient/actions/parse-ingredient-line/action", () => ({
  ParseIngredientLineAction: vi.fn(),
}));

vi.mock("../../ingredient/actions/save-ingredient-line/action", () => ({
  SaveIngredientLineAction: vi.fn(),
}));

describe("Ingredient Service Register", () => {
  let mockFactory: ActionFactory<
    IngredientJobData,
    IngredientWorkerDependencies,
    IngredientJobData
  >;
  let mockCreateActionRegistration: ReturnType<typeof vi.fn>;
  let mockRegisterActions: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFactory = {
      create: vi.fn(),
      register: vi.fn(),
    } as unknown as ActionFactory<
      IngredientJobData,
      IngredientWorkerDependencies,
      IngredientJobData
    >;

    mockCreateActionRegistration = vi.mocked(createActionRegistration);
    mockRegisterActions = vi.mocked(registerActions);

    // Mock the createActionRegistration to return a mock registration
    mockCreateActionRegistration.mockReturnValue({
      name: "test-action",
      actionClass: vi.fn(),
    });
  });

  describe("registerIngredientActions", () => {
    it("should register parse and save ingredient actions", () => {
      registerIngredientActions(mockFactory);

      expect(mockCreateActionRegistration).toHaveBeenCalledTimes(2);
      expect(mockRegisterActions).toHaveBeenCalledTimes(1);
      expect(mockRegisterActions).toHaveBeenCalledWith(
        mockFactory,
        expect.any(Array)
      );
    });

    it("should register PARSE_INGREDIENT_LINE action", () => {
      registerIngredientActions(mockFactory);

      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.PARSE_INGREDIENT_LINE,
        ParseIngredientLineAction
      );
    });

    it("should register SAVE_INGREDIENT_LINE action", () => {
      registerIngredientActions(mockFactory);

      expect(mockCreateActionRegistration).toHaveBeenCalledWith(
        ActionName.SAVE_INGREDIENT_LINE,
        SaveIngredientLineAction
      );
    });

    it("should pass correct array of registrations to registerActions", () => {
      const mockRegistration1 = { name: "parse-action", actionClass: vi.fn() };
      const mockRegistration2 = { name: "save-action", actionClass: vi.fn() };

      mockCreateActionRegistration
        .mockReturnValueOnce(mockRegistration1)
        .mockReturnValueOnce(mockRegistration2);

      registerIngredientActions(mockFactory);

      expect(mockRegisterActions).toHaveBeenCalledWith(mockFactory, [
        mockRegistration1,
        mockRegistration2,
      ]);
    });

    it("should throw error for invalid factory", () => {
      expect(() =>
        registerIngredientActions(
          null as unknown as ActionFactory<
            IngredientJobData,
            IngredientWorkerDependencies,
            IngredientJobData
          >
        )
      ).toThrow("Invalid factory");
      expect(() =>
        registerIngredientActions(
          undefined as unknown as ActionFactory<
            IngredientJobData,
            IngredientWorkerDependencies,
            IngredientJobData
          >
        )
      ).toThrow("Invalid factory");
      expect(() =>
        registerIngredientActions(
          "not-an-object" as unknown as ActionFactory<
            IngredientJobData,
            IngredientWorkerDependencies,
            IngredientJobData
          >
        )
      ).toThrow("Invalid factory");
    });

    it("should accept valid factory object", () => {
      expect(() => registerIngredientActions(mockFactory)).not.toThrow();
    });

    it("should have correct function signature", () => {
      expect(registerIngredientActions.name).toBe("registerIngredientActions");
      expect(typeof registerIngredientActions).toBe("function");
    });
  });
});
