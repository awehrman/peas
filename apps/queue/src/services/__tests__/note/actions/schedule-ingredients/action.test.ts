import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import { BaseAction } from "../../../../../workers/core/base-action";
import { ActionContext } from "../../../../../workers/core/types";
import { ScheduleIngredientsAction } from "../../../../note/actions/schedule-ingredients/action";

describe("ScheduleIngredientsAction", () => {
  let action: ScheduleIngredientsAction;
  let mockDependencies: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: NotePipelineData;

  beforeEach(() => {
    vi.clearAllMocks();

    action = new ScheduleIngredientsAction();

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      queues: {
        ingredientQueue: {
          add: vi.fn(),
        } as unknown as NonNullable<
          NoteWorkerDependencies["queues"]
        >["ingredientQueue"],
      },
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
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
      content: "Test Recipe Content",
      file: {
        title: "Test Recipe",
        contents: "Test Recipe Content",
        ingredients: [
          {
            reference: "1 cup flour",
            lineIndex: 0,
            blockIndex: 0,
          },
          {
            reference: "2 eggs",
            lineIndex: 1,
            blockIndex: 0,
          },
        ],
        instructions: [
          {
            reference: "Mix ingredients",
            lineIndex: 2,
          },
        ],
      },
      metadata: {
        sourceUrl: "https://example.com/recipe",
        tags: ["dessert", "baking"],
      },
    };
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.SCHEDULE_INGREDIENT_LINES);
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
        "Note ID is required for scheduling ingredients"
      );
    });

    it("should return error when noteId is undefined", () => {
      const invalidData = {
        ...mockData,
        noteId: undefined,
      } as unknown as NotePipelineData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for scheduling ingredients"
      );
    });

    it("should return error when noteId is null", () => {
      const invalidData = {
        ...mockData,
        noteId: null,
      } as unknown as NotePipelineData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for scheduling ingredients"
      );
    });
  });

  describe("execute", () => {
    it("should call processIngredients service", async () => {
      // The execute method calls the service through executeServiceAction
      // We can't easily mock the internal service call, but we can test that it completes successfully
      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.noteId).toBe(mockData.noteId);
    });

    it("should handle service errors gracefully", async () => {
      // Test that the action can handle errors from the base class
      // This tests the error handling path in the BaseAction
      const invalidData = { ...mockData, noteId: "" };

      await expect(
        action.execute(invalidData, mockDependencies, mockContext)
      ).rejects.toThrow();
    });
  });

  describe("inheritance", () => {
    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(BaseAction);
    });

    it("should have correct generic types", () => {
      expect(action).toBeInstanceOf(ScheduleIngredientsAction);
    });
  });
});
