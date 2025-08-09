import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import { BaseAction } from "../../../../../workers/core/base-action";
import { ActionContext } from "../../../../../workers/core/types";
import { ScheduleIngredientsAction } from "../../../../note/actions/schedule-ingredients/action";
// Import the mocked function
import { processIngredients } from "../../../../note/actions/schedule-ingredients/service";

// Mock the service module
vi.mock("../../../../note/actions/schedule-ingredients/service", () => ({
  processIngredients: vi.fn(),
}));

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
      vi.mocked(processIngredients).mockResolvedValue(mockData);

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
        ingredientQueue: {
          add: vi.fn().mockRejectedValue(new Error("Queue error")),
        } as unknown as NonNullable<
          NoteWorkerDependencies["queues"]
        >["ingredientQueue"],
      };

      const mockDeps: NoteWorkerDependencies = {
        logger: mockLogger,
        queues: mockQueues,
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn(),
        },
        services: {
          parseHtml: vi.fn(),
          cleanHtml: vi.fn(),
          saveNote: vi.fn(),
        },
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const action = new ScheduleIngredientsAction();

      // Mock the service to throw an error
      vi.mocked(processIngredients).mockRejectedValue(
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
          title: "Test Recipe",
          contents: "Test recipe content",
          ingredients: [
            {
              reference: "ingredient 1",
              lineIndex: 0,
              blockIndex: 0,
              parseStatus: "AWAITING_PARSING",
            },
            {
              reference: "ingredient 2",
              lineIndex: 1,
              blockIndex: 0,
              parseStatus: "AWAITING_PARSING",
            },
          ],
          instructions: [],
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
        ingredientQueue: {
          add: vi.fn().mockResolvedValue(undefined),
        } as unknown as NonNullable<
          NoteWorkerDependencies["queues"]
        >["ingredientQueue"],
      };

      const mockStatusBroadcaster = {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      };

      const mockDeps: NoteWorkerDependencies = {
        logger: mockLogger,
        queues: mockQueues,
        statusBroadcaster: mockStatusBroadcaster,
        services: {
          parseHtml: vi.fn(),
          cleanHtml: vi.fn(),
          saveNote: vi.fn(),
        },
      };

      const mockContext: ActionContext = {
        jobId: "test-job-123",
        retryCount: 0,
        queueName: "test-queue",
        operation: "test-operation",
        startTime: Date.now(),
        workerName: "test-worker",
        attemptNumber: 1,
      };

      const action = new ScheduleIngredientsAction();

      // Mock the service to return successfully
      vi.mocked(processIngredients).mockResolvedValue(mockData);

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
