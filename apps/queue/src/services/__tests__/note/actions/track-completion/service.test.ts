import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import {
  cleanupNoteCompletion,
  getNoteCompletionStatus,
  initializeNoteCompletion,
  markImageJobCompleted,
  markImageWorkerCompleted,
  markWorkerCompleted,
  setTotalImageJobs,
} from "../../../../note/actions/track-completion/service";

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
        "[TRACK_COMPLETION] No completion status found for note: non-existent"
      );
    });
  });

  describe("markImageJobCompleted", () => {
    it("should mark individual image job as completed", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalImageJobs(noteId, 3, mockLogger);
      markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.completedImageJobs).toBe(1);
      expect(status?.imageWorkerCompleted).toBe(false); // Not all jobs completed yet
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Image job completed for note test-note-123: 1/3"
      );
    });

    it("should mark image worker as completed when all jobs are done", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalImageJobs(noteId, 2, mockLogger);

      // Complete first job
      markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);

      // Complete second job - should mark image worker as completed
      markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.completedImageJobs).toBe(2);
      expect(status?.imageWorkerCompleted).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] All image jobs completed for note test-note-123, marking image worker as completed"
      );
    });

    it("should handle non-existent note ID", () => {
      markImageJobCompleted("non-existent", mockLogger, mockStatusBroadcaster);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] No completion status found for note: non-existent"
      );
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

    it("should log completion message", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Worker note completed for note test-note-123. All completed: false"
      );
    });

    it("should handle non-existent note ID", () => {
      markWorkerCompleted(
        "non-existent",
        "note",
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] No completion status found for note: non-existent"
      );
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

    it("should broadcast completion when all workers are completed", () => {
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

      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId,
        noteId,
        status: "COMPLETED",
        message: `Import ${importId} Completed!`,
        context: "import_complete",
        indentLevel: 0,
        metadata: {
          noteId,
          importId,
        },
      });
    });

    it("should handle broadcast errors gracefully", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";
      const mockError = new Error("Broadcast failed");

      mockStatusBroadcaster.addStatusEventAndBroadcast.mockRejectedValueOnce(
        mockError
      );

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

      // Wait for the async error handling
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Failed to broadcast completion: Error: Broadcast failed"
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

      mockStatusBroadcaster.addStatusEventAndBroadcast.mockRejectedValueOnce(
        "String error"
      );

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

      // Wait for the async error handling
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Failed to broadcast completion: String error"
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
      });
    });

    it("should return undefined for non-existent note", () => {
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
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Worker instruction completed for note test-note-123. All completed: false"
      );
    });
  });

  describe("markIngredientWorkerCompleted", () => {
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
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Worker ingredient completed for note test-note-123. All completed: false"
      );
    });
  });

  describe("markImageWorkerCompleted", () => {
    it("should mark image worker as completed", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markImageWorkerCompleted(noteId, mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.imageWorkerCompleted).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Worker image completed for note test-note-123. All completed: false"
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

    it("should handle complete workflow for a single note", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      // Initialize
      initializeNoteCompletion(noteId, importId);
      let status = getNoteCompletionStatus(noteId);
      expect(status?.allCompleted).toBe(false);

      // Mark note worker completed
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);
      status = getNoteCompletionStatus(noteId);
      expect(status?.noteWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);

      // Mark instruction worker completed
      markWorkerCompleted(
        noteId,
        "instruction",
        mockLogger,
        mockStatusBroadcaster
      );
      status = getNoteCompletionStatus(noteId);
      expect(status?.instructionWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);

      // Mark ingredient worker completed
      markWorkerCompleted(
        noteId,
        "ingredient",
        mockLogger,
        mockStatusBroadcaster
      );
      status = getNoteCompletionStatus(noteId);
      expect(status?.ingredientWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);

      // Mark image worker completed - should trigger all completed
      markWorkerCompleted(noteId, "image", mockLogger, mockStatusBroadcaster);
      status = getNoteCompletionStatus(noteId);
      expect(status?.imageWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(true);

      // Cleanup
      cleanupNoteCompletion(noteId);
      expect(getNoteCompletionStatus(noteId)).toBeUndefined();
    });

    it("should handle partial completion scenarios", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      setTotalImageJobs(noteId, 3, mockLogger);

      // Complete some image jobs but not all
      markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);
      markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.completedImageJobs).toBe(2);
      expect(status?.imageWorkerCompleted).toBe(false);

      // Complete the last image job
      markImageJobCompleted(noteId, mockLogger, mockStatusBroadcaster);
      expect(status?.completedImageJobs).toBe(3);
      expect(status?.imageWorkerCompleted).toBe(true);
    });

    it("should handle broadcast completion error", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      // Mock the broadcast to reject
      mockStatusBroadcaster.addStatusEventAndBroadcast.mockRejectedValue(
        new Error("Broadcast failed")
      );

      // Initialize and mark all workers as completed
      initializeNoteCompletion(noteId, importId);
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "instruction", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "ingredient", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "image", mockLogger, mockStatusBroadcaster);

      // Wait for the async broadcast to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // The error should be logged but not thrown
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Failed to broadcast completion: Error: Broadcast failed"
      );
    });
  });
});
