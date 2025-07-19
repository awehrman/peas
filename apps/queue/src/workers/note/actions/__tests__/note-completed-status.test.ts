import { describe, it, expect, beforeEach, vi } from "vitest";
import { ActionFactory } from "../../../core/action-factory";
import { registerNoteActions } from "../index";
import type { NoteWorkerDependencies, NotePipelineStage3 } from "../../types";
import type { ActionContext } from "../../../core/types";
import type { Queue } from "bullmq";

describe("NoteCompletedStatusAction", () => {
  let factory: ActionFactory;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    factory = new ActionFactory();
    mockDeps = {
      parseHTML: vi.fn(),
      createNote: vi.fn(),
      ingredientQueue: {} as Queue,
      instructionQueue: {} as Queue,
      imageQueue: {} as Queue,
      categorizationQueue: {} as Queue,
      sourceQueue: {} as Queue,
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn(),
      },
      logger: {
        log: vi.fn(),
      },
    };
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "note-queue",
      operation: "note_completed_status",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("execute", () => {
    it("should broadcast completion with note title when available", async () => {
      registerNoteActions(factory);
      const action = factory.create("note_completed_status", mockDeps);

      const data: NotePipelineStage3 = {
        importId: "import-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "note-456",
          title: "My Cool Recipe",
          content: "test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      await action.execute(data, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-123",
        noteId: "note-456",
        status: "COMPLETED",
        message: "Imported My Cool Recipe",
        context: "import_complete",
        indentLevel: 0,
        metadata: {
          noteTitle: "My Cool Recipe",
        },
      });
    });

    it("should fall back to import ID when note title is not available", async () => {
      registerNoteActions(factory);
      const action = factory.create("note_completed_status", mockDeps);

      const data: NotePipelineStage3 = {
        importId: "import-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "note-456",
          title: "", // Empty title
          content: "test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      await action.execute(data, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-123",
        noteId: "note-456",
        status: "COMPLETED",
        message: "Import import-1... completed",
        context: "import_complete",
        indentLevel: 0,
        metadata: {
          noteTitle: "",
        },
      });
    });

    it("should handle missing note gracefully", async () => {
      registerNoteActions(factory);
      const action = factory.create("note_completed_status", mockDeps);

      const data: NotePipelineStage3 = {
        importId: "import-123",
        content: "test content",
        file: {
          title: "Test Recipe",
          contents: "test content",
          ingredients: [],
          instructions: [],
        },
        note: {
          id: "note-456",
          title: null, // Simulate missing title
          content: "test content",
          createdAt: new Date(),
          updatedAt: new Date(),
          parsedIngredientLines: [],
          parsedInstructionLines: [],
        },
      };

      await action.execute(data, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-123",
        noteId: "note-456",
        status: "COMPLETED",
        message: "Import import-1... completed",
        context: "import_complete",
        indentLevel: 0,
        metadata: {
          noteTitle: null,
        },
      });
    });
  });
});
