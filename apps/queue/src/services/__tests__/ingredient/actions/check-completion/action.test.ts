import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import { BaseAction } from "../../../../../workers/core/base-action";
import { ActionContext } from "../../../../../workers/core/types";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../../../../workers/ingredient/dependencies";
import { CheckIngredientCompletionAction } from "../../../../ingredient/actions/check-completion/action";

// Mock the markWorkerCompleted function
vi.mock("../../../../note/actions/track-completion/service", () => ({
  markWorkerCompleted: vi.fn(),
}));

describe("CheckIngredientCompletionAction", () => {
  let action: CheckIngredientCompletionAction;
  let mockDependencies: IngredientWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: IngredientJobData;
  let mockMarkWorkerCompleted: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    action = new CheckIngredientCompletionAction();

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
      parseStatus: "COMPLETED_SUCCESSFULLY" as const,
      isActive: true,
    };

    // Get the mocked markWorkerCompleted function
    const { markWorkerCompleted } = await import(
      "../../../../note/actions/track-completion/service"
    );
    mockMarkWorkerCompleted = vi.mocked(markWorkerCompleted);
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.CHECK_INGREDIENT_COMPLETION);
    });
  });

  describe("execute", () => {
    it("should mark worker as completed when noteId is provided", async () => {
      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockMarkWorkerCompleted).toHaveBeenCalledWith(
        "test-note-id",
        "ingredient",
        mockDependencies.logger,
        mockDependencies.statusBroadcaster
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] Marked ingredient worker as completed for note test-note-id"
      );

      expect(result).toBe(mockData);
    });

    it("should skip completion check when noteId is missing", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithoutNoteId = { ...mockData, noteId: undefined as any };

      const result = await action.execute(
        dataWithoutNoteId,
        mockDependencies,
        mockContext
      );

      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] No note ID available, skipping completion check"
      );

      expect(result).toBe(dataWithoutNoteId);
    });

    it("should skip completion check when noteId is empty string", async () => {
      const dataWithEmptyNoteId = { ...mockData, noteId: "" };

      const result = await action.execute(
        dataWithEmptyNoteId,
        mockDependencies,
        mockContext
      );

      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] No note ID available, skipping completion check"
      );

      expect(result).toBe(dataWithEmptyNoteId);
    });

    it("should handle errors from markWorkerCompleted gracefully", async () => {
      const error = new Error("Database connection failed");
      mockMarkWorkerCompleted.mockImplementation(() => {
        throw error;
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] Error marking completion: Error: Database connection failed"
      );

      expect(result).toBe(mockData);
    });

    it("should handle non-Error exceptions from markWorkerCompleted", async () => {
      mockMarkWorkerCompleted.mockImplementation(() => {
        throw "String error";
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] Error marking completion: String error"
      );

      expect(result).toBe(mockData);
    });
  });

  describe("inheritance", () => {
    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(BaseAction);
    });

    it("should have correct generic types", () => {
      expect(action).toBeInstanceOf(CheckIngredientCompletionAction);
    });
  });
});
