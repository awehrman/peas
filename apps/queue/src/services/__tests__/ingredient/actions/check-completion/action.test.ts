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

// Mock the track completion service
vi.mock("../../../../note/actions/track-completion/service", () => ({
  markWorkerCompleted: vi.fn(),
  getIngredientCompletionStatus: vi.fn(),
  markNoteAsFailed: vi.fn(),
}));

describe("CheckIngredientCompletionAction", () => {
  let action: CheckIngredientCompletionAction;
  let mockDependencies: IngredientWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: IngredientJobData;
  let mockMarkWorkerCompleted: ReturnType<typeof vi.fn>;
  let mockGetIngredientCompletionStatus: ReturnType<typeof vi.fn>;

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

    // Get the mocked functions
    const { 
      markWorkerCompleted, 
      getIngredientCompletionStatus
    } = await import(
      "../../../../note/actions/track-completion/service"
    );

    mockMarkWorkerCompleted = vi.mocked(markWorkerCompleted);
    mockGetIngredientCompletionStatus = vi.mocked(getIngredientCompletionStatus);
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.CHECK_INGREDIENT_COMPLETION);
    });
  });

  describe("execute", () => {
    it("should mark worker as completed when all ingredients are completed", async () => {
      // Mock that all ingredients are completed
      mockGetIngredientCompletionStatus.mockReturnValue({
        completedIngredients: 5,
        totalIngredients: 5,
        progress: "5/5",
        isComplete: true,
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockGetIngredientCompletionStatus).toHaveBeenCalledWith(
        "test-note-id"
      );
      expect(mockMarkWorkerCompleted).toHaveBeenCalledWith(
        "test-note-id",
        "ingredient",
        mockDependencies.logger,
        mockDependencies.statusBroadcaster
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] Attempt 1/3 - Completion status for note test-note-id: 5/5 (isComplete: true)"
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] All ingredients completed for note test-note-id, marked ingredient worker as completed"
      );

      expect(result).toBe(mockData);
    });

    it("should not mark worker as completed when not all ingredients are completed", async () => {
      // Mock that not all ingredients are completed
      mockGetIngredientCompletionStatus.mockReturnValue({
        completedIngredients: 3,
        totalIngredients: 5,
        progress: "3/5",
        isComplete: false,
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockGetIngredientCompletionStatus).toHaveBeenCalledWith(
        "test-note-id"
      );
      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] All retries exhausted for note test-note-id. Marking as failed."
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] All retries exhausted for note test-note-id. Marking as failed."
      );

      expect(result).toBe(mockData);
    });

    it("should skip completion check when noteId is missing", async () => {
      const testData = {
        ...mockData,
        noteId: undefined as unknown as string, // Use unknown as intermediate type to avoid any
      };

      const result = await action.execute(
        testData,
        mockDependencies,
        mockContext
      );

      expect(result).toEqual(testData);
      expect(mockGetIngredientCompletionStatus).not.toHaveBeenCalled();
      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] No note ID available for completion check"
      );
    });

    it("should skip completion check when noteId is empty string", async () => {
      const testData = {
        ...mockData,
        noteId: "",
      };

      const result = await action.execute(
        testData,
        mockDependencies,
        mockContext
      );

      expect(result).toEqual(testData);
      expect(mockGetIngredientCompletionStatus).not.toHaveBeenCalled();
      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] No note ID available for completion check"
      );
    });

    it("should handle errors from getIngredientCompletionStatus gracefully", async () => {
      const error = new Error("Database connection failed");
      mockGetIngredientCompletionStatus.mockImplementation(() => {
        throw error;
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] All retries exhausted for note test-note-id. Marking as failed."
      );

      expect(result).toBe(mockData);
    });

    it("should handle non-Error exceptions from getIngredientCompletionStatus", async () => {
      mockGetIngredientCompletionStatus.mockImplementation(() => {
        throw "String error";
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INGREDIENT_COMPLETION] All retries exhausted for note test-note-id. Marking as failed."
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
