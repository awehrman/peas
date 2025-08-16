import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import {
  cleanupNoteCompletion,
  getIngredientCompletionStatus,
  getNoteCompletionStatus,
  initializeNoteCompletion,
  markImageJobCompleted,
  markImageWorkerCompleted,
  markIngredientLineCompleted,
  markInstructionWorkerCompleted,
  markWorkerCompleted,
  setTotalImageJobs,
  setTotalIngredientLines,
} from "../../../../note/actions/track-completion/service";

// Mock the @peas/database module
vi.mock("@peas/database", () => ({
  updateNote: vi.fn(),
}));

describe("Track Completion Service", () => {
  let mockLogger: StructuredLogger;
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as StructuredLogger;

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
    };
  });

  describe("initializeNoteCompletion", () => {
    it("should initialize completion status for a note", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);

      const status = getNoteCompletionStatus(noteId);
      expect(status).toEqual({
        noteId,
        importId,
        noteWorkerCompleted: false,
        instructionWorkerCompleted: false,
        ingredientWorkerCompleted: false,
        imageWorkerCompleted: false,
        allCompleted: false,
        totalImageJobs: 0,
        completedImageJobs: 0,
        totalIngredientLines: 0,
        completedIngredientLines: new Set(),
      });
    });

    it("should overwrite existing completion status", () => {
      const noteId = "test-note-123";
      const importId1 = "test-import-456";
      const importId2 = "test-import-789";

      initializeNoteCompletion(noteId, importId1);
      initializeNoteCompletion(noteId, importId2);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.importId).toBe(importId2);
    });
  });

  describe("setTotalImageJobs", () => {
    it("should set total image jobs for a note", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalImageJobs(noteId, 5, mockLogger);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.totalImageJobs).toBe(5);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Set total image jobs for note test-note-123: 5"
      );
    });

    it("should handle non-existent note ID", () => {
      setTotalImageJobs("non-existent", 3, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] No completion status found for note: non-existent, creating new status"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Set total image jobs for note non-existent: 3"
      );
    });
  });

  describe("markImageJobCompleted", () => {
    it("should mark individual image job as completed", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalImageJobs(noteId, 3, mockLogger);
      vi.clearAllMocks(); // Clear the setup logs

      // Mark first image job as completed
      await markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.completedImageJobs).toBe(1);
      expect(status?.imageWorkerCompleted).toBe(false); // Not all jobs completed yet
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] ✅ Image job completed for note test-note-123: 1/3"
      );
    });

    it("should mark image worker as completed when all jobs are done", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalImageJobs(noteId, 2, mockLogger);

      // Complete first job
      await markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);

      // Complete second job - should mark image worker as completed
      await markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.completedImageJobs).toBe(2);
      expect(status?.imageWorkerCompleted).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] 🎉 All image jobs completed for note test-note-123, marking image worker as completed"
      );
    });

    it("should handle non-existent note ID", async () => {
      await markImageJobCompleted(
        "non-existent",
        mockLogger,
        mockStatusBroadcaster
      );

      // The behavior has changed - now creates a new status instead of returning error
      const status = getNoteCompletionStatus("non-existent");
      expect(status).toBeDefined();
      expect(status?.noteId).toBe("non-existent");
      expect(status?.completedImageJobs).toBe(1);
    });
  });

  describe("markWorkerCompleted", () => {
    it("should mark note worker as completed", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.noteWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);
    });

    it("should mark instruction worker as completed", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markWorkerCompleted(
        noteId,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );

      const status = getNoteCompletionStatus(noteId);
      expect(status?.instructionWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);
    });

    it("should mark ingredient worker as completed", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );

      const status = getNoteCompletionStatus(noteId);
      expect(status?.ingredientWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);
    });

    it("should mark image worker as completed", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markWorkerCompleted(noteId, "image", mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.imageWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);
    });

    it("should log completion message", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      await markWorkerCompleted(
        noteId,
        "note",
        mockLogger,
        mockStatusBroadcaster
      );

      const status = getNoteCompletionStatus(noteId);
      expect(status?.noteWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);
      // The function doesn't log individual worker completions anymore
      // It only logs when all workers are completed or on errors
    });

    it("should handle non-existent note ID", async () => {
      await markWorkerCompleted(
        "non-existent",
        "note",
        mockLogger,
        mockStatusBroadcaster
      );

      // The behavior has changed - now creates a new status instead of returning error
      const status = getNoteCompletionStatus("non-existent");
      expect(status).toBeDefined();
      expect(status?.noteId).toBe("non-existent");
      expect(status?.noteWorkerCompleted).toBe(true);
    });

    it("should mark all workers as completed when all workers finish", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(
        noteId,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );
      markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );
      markWorkerCompleted(noteId, "image", mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.allCompleted).toBe(true);
    });

    it("should broadcast completion when all workers are completed", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      // Mock the database update to succeed
      const { updateNote } = await import("@peas/database");
      vi.mocked(updateNote).mockResolvedValue(undefined);

      // Initialize and mark all workers as completed
      initializeNoteCompletion(noteId, importId);
      await markWorkerCompleted(
        noteId,
        "note",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "image",
        mockLogger,
        mockStatusBroadcaster
      );

      // Wait for the async broadcast to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have called the broadcaster with completion event
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          importId,
          noteId,
          status: "COMPLETED",
          message: "Note processing completed successfully",
          context: "note_completion",
        })
      );
    });

    it("should handle broadcast errors gracefully", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      // Mock the status broadcaster to throw an error
      mockStatusBroadcaster.addStatusEventAndBroadcast.mockRejectedValue(
        new Error("Broadcast failed")
      );

      // Initialize and mark all workers as completed
      initializeNoteCompletion(noteId, importId);
      await markWorkerCompleted(
        noteId,
        "note",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "image",
        mockLogger,
        mockStatusBroadcaster
      );

      // Wait for the async error handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The error should be logged but not thrown
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "❌ Failed to update note status or broadcast completion"
        )
      );
    });

    it("should not broadcast when statusBroadcaster is not provided", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markWorkerCompleted(noteId, "note", mockLogger);
      markWorkerCompleted(noteId, "instruction", mockLogger);
      markWorkerCompleted(noteId, "ingredient", mockLogger);
      markWorkerCompleted(noteId, "image", mockLogger);

      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
    });

    it("should handle non-Error exceptions in broadcast", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      // Mock the status broadcaster to throw a string error
      mockStatusBroadcaster.addStatusEventAndBroadcast.mockRejectedValue(
        "String error"
      );

      // Initialize and mark all workers as completed
      initializeNoteCompletion(noteId, importId);
      await markWorkerCompleted(
        noteId,
        "note",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "image",
        mockLogger,
        mockStatusBroadcaster
      );

      // Wait for the async error handling
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The error should be logged but not thrown
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "❌ Failed to update note status or broadcast completion"
        )
      );
    });
  });

  describe("getNoteCompletionStatus", () => {
    it("should return completion status for existing note", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      const status = getNoteCompletionStatus(noteId);

      expect(status).toEqual({
        noteId,
        importId,
        noteWorkerCompleted: false,
        instructionWorkerCompleted: false,
        ingredientWorkerCompleted: false,
        imageWorkerCompleted: false,
        allCompleted: false,
        totalImageJobs: 0,
        completedImageJobs: 0,
        totalIngredientLines: 0,
        completedIngredientLines: new Set(),
      });
    });

    it("should return undefined for non-existent note", () => {
      // Clear any existing status that might have been created by previous tests
      cleanupNoteCompletion("non-existent");

      const status = getNoteCompletionStatus("non-existent");
      expect(status).toBeUndefined();
    });
  });

  describe("cleanupNoteCompletion", () => {
    it("should remove completion status for a note", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      expect(getNoteCompletionStatus(noteId)).toBeDefined();

      cleanupNoteCompletion(noteId);
      expect(getNoteCompletionStatus(noteId)).toBeUndefined();
    });

    it("should handle cleanup of non-existent note", () => {
      expect(() => cleanupNoteCompletion("non-existent")).not.toThrow();
    });
  });

  describe("markInstructionWorkerCompleted", () => {
    it("should mark instruction worker as completed", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      await markInstructionWorkerCompleted(
        noteId,
        mockLogger,
        mockStatusBroadcaster
      );

      const status = getNoteCompletionStatus(noteId);
      expect(status?.instructionWorkerCompleted).toBe(true);
      // The function doesn't log individual worker completions anymore
      // It only logs when all workers are completed or on errors
    });
  });

  describe("markIngredientWorkerCompleted", () => {
    it("should mark ingredient worker as completed", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      await markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );

      const status = getNoteCompletionStatus(noteId);
      expect(status?.ingredientWorkerCompleted).toBe(true);
      // The function doesn't log individual worker completions anymore
      // It only logs when all workers are completed or on errors
    });
  });

  describe("markImageWorkerCompleted", () => {
    it("should mark image worker as completed", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      // Mock the database update to succeed
      const { updateNote } = await import("@peas/database");
      vi.mocked(updateNote).mockResolvedValue(undefined);

      // Initialize completion status to simulate all other workers being completed
      initializeNoteCompletion(noteId, importId);
      await markWorkerCompleted(
        noteId,
        "note",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );

      // Act
      await markImageWorkerCompleted(noteId, mockLogger, mockStatusBroadcaster);

      // Assert - should broadcast the completion message since all workers are now completed
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          importId: importId,
          noteId,
          status: "COMPLETED",
          message: "Note processing completed successfully",
          context: "note_completion",
          metadata: expect.objectContaining({
            noteId: noteId,
            htmlFileName: undefined,
            totalImageJobs: 0,
            completedImageJobs: 0,
            totalIngredientLines: 0,
            completedIngredientLines: 0,
          }),
        })
      );
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple notes simultaneously", () => {
      const note1 = "test-note-1";
      const note2 = "test-note-2";
      const import1 = "test-import-1";
      const import2 = "test-import-2";

      initializeNoteCompletion(note1, import1);
      initializeNoteCompletion(note2, import2);

      markWorkerCompleted(note1, "note", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(
        note2,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );

      const status1 = getNoteCompletionStatus(note1);
      const status2 = getNoteCompletionStatus(note2);

      expect(status1?.noteWorkerCompleted).toBe(true);
      expect(status1?.instructionWorkerCompleted).toBe(false);
      expect(status2?.noteWorkerCompleted).toBe(false);
      expect(status2?.instructionWorkerCompleted).toBe(true);
    });

    it("should handle complete workflow for a single note", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      // Mock the database update to succeed
      const { updateNote } = await import("@peas/database");
      vi.mocked(updateNote).mockResolvedValue(undefined);

      // Initialize completion status
      initializeNoteCompletion(noteId, importId);
      let status = getNoteCompletionStatus(noteId);
      expect(status?.noteWorkerCompleted).toBe(false);
      expect(status?.allCompleted).toBe(false);

      // Mark note worker completed
      await markWorkerCompleted(
        noteId,
        "note",
        mockLogger,
        mockStatusBroadcaster
      );
      status = getNoteCompletionStatus(noteId);
      expect(status?.noteWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);

      // Mark instruction worker completed
      await markWorkerCompleted(
        noteId,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );
      status = getNoteCompletionStatus(noteId);
      expect(status?.instructionWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);

      // Mark ingredient worker completed
      await markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );
      status = getNoteCompletionStatus(noteId);
      expect(status?.ingredientWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);

      // Mark image worker completed - should trigger all completed
      await markWorkerCompleted(
        noteId,
        "image",
        mockLogger,
        mockStatusBroadcaster
      );

      // Wait for the async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The status should be cleaned up after completion, so we check that it's undefined
      status = getNoteCompletionStatus(noteId);
      expect(status).toBeUndefined();
    });

    it("should handle partial completion scenarios", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalImageJobs(noteId, 3, mockLogger);

      // Complete some image jobs but not all
      await markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);
      await markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.completedImageJobs).toBe(2);
      expect(status?.imageWorkerCompleted).toBe(false);

      // Complete the last image job
      await markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);
      expect(status?.completedImageJobs).toBe(3);
      expect(status?.imageWorkerCompleted).toBe(true);
    });

    it("should handle broadcast completion error", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      // Mock the status broadcaster to throw an error
      mockStatusBroadcaster.addStatusEventAndBroadcast.mockRejectedValue(
        new Error("Broadcast failed")
      );

      // Initialize and mark all workers as completed
      initializeNoteCompletion(noteId, importId);
      await markWorkerCompleted(
        noteId,
        "note",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );
      await markWorkerCompleted(
        noteId,
        "image",
        mockLogger,
        mockStatusBroadcaster
      );

      // Wait for the async broadcast to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The error should be logged but not thrown
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "❌ Failed to update note status or broadcast completion"
        )
      );
    });
  });

  it("should mark image worker as completed", async () => {
    // Arrange
    const noteId = "test-note-123";
    const importId = "test-import-456";
    const mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as StructuredLogger;
    const mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
    };

    // Mock the database update to succeed
    const { updateNote } = await import("@peas/database");
    vi.mocked(updateNote).mockResolvedValue(undefined);

    // Initialize completion status to simulate all other workers being completed
    initializeNoteCompletion(noteId, importId);
    await markWorkerCompleted(
      noteId,
      "note",
      mockLogger,
      mockStatusBroadcaster
    );
    await markWorkerCompleted(
      noteId,
      "instruction",
      mockLogger,
      mockStatusBroadcaster
    );
    await markWorkerCompleted(
      noteId,
      "ingredient",
      mockLogger,
      mockStatusBroadcaster
    );

    // Act
    await markImageWorkerCompleted(noteId, mockLogger, mockStatusBroadcaster);

    // Assert - should broadcast the completion message since all workers are now completed
    expect(
      mockStatusBroadcaster.addStatusEventAndBroadcast
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        importId: importId,
        noteId,
        status: "COMPLETED",
        message: "Note processing completed successfully",
        context: "note_completion",
        metadata: expect.objectContaining({
          noteId: noteId,
          totalImageJobs: 0,
          completedImageJobs: 0,
          totalIngredientLines: 0,
          completedIngredientLines: 0,
        }),
      })
    );
  });

  describe("ingredient tracking functions", () => {
    it("should set total ingredient lines for a note", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalIngredientLines(noteId, 5, mockLogger);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.totalIngredientLines).toBe(5);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Set total ingredient lines for note test-note-123: 5"
      );
    });

    it("should handle setting total ingredient lines for non-existent note", () => {
      setTotalIngredientLines("non-existent", 3, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] No completion status found for note: non-existent"
      );
    });

    it("should mark ingredient line as completed", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalIngredientLines(noteId, 3, mockLogger);

      markIngredientLineCompleted(noteId, 1, 2, mockLogger);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.completedIngredientLines.has("1:2")).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Marked ingredient line 1:2 as completed for note test-note-123. Progress: 1/3"
      );
    });

    it("should handle marking ingredient line for non-existent note", () => {
      markIngredientLineCompleted("non-existent", 1, 2, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] No completion status found for note: non-existent"
      );
    });

    it("should get ingredient completion status for existing note", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalIngredientLines(noteId, 4, mockLogger);
      markIngredientLineCompleted(noteId, 1, 1, mockLogger);
      markIngredientLineCompleted(noteId, 1, 2, mockLogger);

      const status = getIngredientCompletionStatus(noteId);
      expect(status).toEqual({
        completedIngredients: 2,
        totalIngredients: 4,
        progress: "2/4",
        isComplete: false,
      });
    });

    it("should get ingredient completion status for non-existent note", () => {
      const status = getIngredientCompletionStatus("non-existent");
      expect(status).toEqual({
        completedIngredients: 0,
        totalIngredients: 0,
        progress: "0/0",
        isComplete: false,
      });
    });

    it("should indicate completion when all ingredient lines are done", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalIngredientLines(noteId, 2, mockLogger);
      markIngredientLineCompleted(noteId, 1, 1, mockLogger);
      markIngredientLineCompleted(noteId, 1, 2, mockLogger);

      const status = getIngredientCompletionStatus(noteId);
      expect(status).toEqual({
        completedIngredients: 2,
        totalIngredients: 2,
        progress: "2/2",
        isComplete: true,
      });
    });
  });
});
