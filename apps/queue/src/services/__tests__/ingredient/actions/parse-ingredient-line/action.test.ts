import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import { BaseAction } from "../../../../../workers/core/base-action";
import { ActionContext } from "../../../../../workers/core/types";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../../../../workers/ingredient/dependencies";
import { ParseIngredientLineAction } from "../../../../ingredient/actions/parse-ingredient-line/action";

// Don't mock BaseAction to test actual behavior

describe("ParseIngredientLineAction", () => {
  let action: ParseIngredientLineAction;
  let mockDependencies: IngredientWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: IngredientJobData;

  beforeEach(() => {
    vi.clearAllMocks();

    action = new ParseIngredientLineAction();

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      services: {
        parseIngredient: vi.fn() as ReturnType<typeof vi.fn>,
        saveIngredient: vi.fn() as ReturnType<typeof vi.fn>,
      },
    };

    mockContext = {
      jobId: "test-job-id",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    mockData = {
      noteId: "test-note-id",
      ingredientReference: "1 cup flour",
      lineIndex: 0,
      parseStatus: "PENDING" as const,
      isActive: true,
    };
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.PARSE_INGREDIENT_LINE);
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data", () => {
      const result = action.validateInput(mockData);
      expect(result).toBeNull();
    });

    it("should return error when noteId is missing", () => {
      const invalidData = { ...mockData, noteId: "" };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for parsing ingredient line"
      );
    });

    it("should return error when noteId is undefined", () => {
      const invalidData = {
        ...mockData,
        noteId: undefined,
      } as unknown as IngredientJobData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for parsing ingredient line"
      );
    });

    it("should return error when ingredientReference is missing", () => {
      const invalidData = { ...mockData, ingredientReference: "" };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Ingredient reference is required for parsing ingredient line"
      );
    });

    it("should return error when ingredientReference is undefined", () => {
      const invalidData = {
        ...mockData,
        ingredientReference: undefined,
      } as unknown as IngredientJobData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Ingredient reference is required for parsing ingredient line"
      );
    });
  });

  describe("execute", () => {
    it("should call parseIngredient service", async () => {
      (
        mockDependencies.services.parseIngredient as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockData);

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.services.parseIngredient).toHaveBeenCalledWith(
        mockData
      );
      expect(result).toBe(mockData);
    });

    it("should handle service errors", async () => {
      const serviceError = new Error("Service error");
      (
        mockDependencies.services.parseIngredient as ReturnType<typeof vi.fn>
      ).mockRejectedValue(serviceError);

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toThrow("Service error");
    });
  });

  describe("inheritance", () => {
    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(BaseAction);
    });

    it("should have correct generic types", () => {
      expect(action).toBeInstanceOf(ParseIngredientLineAction);
    });
  });
});
