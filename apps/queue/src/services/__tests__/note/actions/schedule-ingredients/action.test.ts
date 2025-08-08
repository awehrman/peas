import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import { ActionContext } from "../../../../../workers/core/types";
import { BaseAction } from "../../../../../workers/core/base-action";
import { ScheduleIngredientsAction } from "../../../../note/actions/schedule-ingredients/action";

// Mock the service module
vi.mock("../../../../note/actions/schedule-ingredients/service", () => ({
  processIngredients: vi.fn(),
}));

// Import the mocked function
import { processIngredients } from "../../../../note/actions/schedule-ingredients/service";

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
      // Mock the service to return successfully
      (processIngredients as any).mockResolvedValue(mockData);

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.noteId).toBe(mockData.noteId);
      expect(processIngredients).toHaveBeenCalledWith(
        mockData,
        mockDependencies.logger,
        mockDependencies.queues
      );
    });

    it("should handle service errors gracefully", async () => {
      const mockData: NotePipelineData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        content: "Test content",
      };

      const mockLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      const mockQueues = {
        ingredient: {
          add: vi.fn().mockRejectedValue(new Error("Queue error")),
        },
      };

      const mockDeps: NoteWorkerDependencies = {
        logger: mockLogger,
        queues: mockQueues,
        statusBroadcaster: null,
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        attempt: 1,
        maxAttempts: 3,
      };

      const action = new ScheduleIngredientsAction();

      // Mock the service to throw an error
      (processIngredients as any).mockRejectedValue(
        new Error("Service error")
      );

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });

    it("should execute with suppressDefaultBroadcast option", async () => {
      const mockData: NotePipelineData = {
        noteId: "test-note-123",
        importId: "test-import-123",
        content: "Test content",
        file: {
          ingredients: [
            { id: "ing1", text: "ingredient 1" },
            { id: "ing2", text: "ingredient 2" },
          ],
        },
      };

      const mockLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      const mockQueues = {
        ingredient: {
          add: vi.fn().mockResolvedValue(undefined),
        },
      };

      const mockStatusBroadcaster = {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      };

      const mockDeps: NoteWorkerDependencies = {
        logger: mockLogger,
        queues: mockQueues,
        statusBroadcaster: mockStatusBroadcaster,
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        attempt: 1,
        maxAttempts: 3,
      };

      const action = new ScheduleIngredientsAction();

      // Mock the service to return successfully
      (processIngredients as any).mockResolvedValue(mockData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toEqual(mockData);
      // Verify that the service was called with the correct parameters
      expect(processIngredients).toHaveBeenCalledWith(
        mockData,
        mockLogger,
        mockQueues
      );
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
