import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import {
  cleanupNoteCompletion,
  getNoteCompletionStatus,
  initializeNoteCompletion,
  markImageWorkerCompleted,
  markIngredientWorkerCompleted,
  markInstructionWorkerCompleted,
  markWorkerCompleted,
} from "../../../../note/actions/track-completion/service";

describe("Track Completion Service", () => {
  let mockLogger: StructuredLogger;
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn(),
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
      markWorkerCompleted(noteId, "instruction", mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.instructionWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);
    });

    it("should mark ingredient worker as completed", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markWorkerCompleted(noteId, "ingredient", mockLogger, mockStatusBroadcaster);

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
      markWorkerCompleted(noteId, "instruction", mockLogger, mockStatusBroadcaster);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Worker instruction completed for note test-note-123. All completed: false"
      );
    });

    it("should handle non-existent note ID", () => {
      const nonExistentNoteId = "non-existent-note";

      markWorkerCompleted(nonExistentNoteId, "instruction", mockLogger, mockStatusBroadcaster);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] No completion status found for note: non-existent-note"
      );
    });

    it("should mark all workers as completed when all workers finish", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);

      // Mark all workers as completed
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "instruction", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "ingredient", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "image", mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.allCompleted).toBe(true);
    });

    it("should broadcast completion when all workers are completed", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      mockStatusBroadcaster.addStatusEventAndBroadcast.mockResolvedValue({});

      initializeNoteCompletion(noteId, importId);

      // Mark all workers as completed
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "instruction", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "ingredient", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "image", mockLogger, mockStatusBroadcaster);

      expect(mockStatusBroadcaster.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId,
        noteId,
        status: "COMPLETED",
        message: `Import ${importId} Completed!`,
        context: "note_completion",
        indentLevel: 0,
        metadata: {
          noteId,
          importId,
        },
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Broadcasted completion for note test-note-123"
      );
    });

    it("should handle broadcast errors gracefully", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      const broadcastError = new Error("Broadcast failed");
      mockStatusBroadcaster.addStatusEventAndBroadcast.mockImplementation(() => {
        throw broadcastError;
      });

      initializeNoteCompletion(noteId, importId);

      // Mark all workers as completed
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "instruction", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "ingredient", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "image", mockLogger, mockStatusBroadcaster);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[TRACK_COMPLETION] Failed to broadcast completion: Error: Broadcast failed"
      );
    });

    it("should not broadcast when statusBroadcaster is not provided", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);

      // Mark all workers as completed without statusBroadcaster
      markWorkerCompleted(noteId, "note", mockLogger);
      markWorkerCompleted(noteId, "instruction", mockLogger);
      markWorkerCompleted(noteId, "ingredient", mockLogger);
      markWorkerCompleted(noteId, "image", mockLogger);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.allCompleted).toBe(true);
      expect(mockStatusBroadcaster.addStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle non-Error exceptions in broadcast", async () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      mockStatusBroadcaster.addStatusEventAndBroadcast.mockImplementation(() => {
        throw "String error";
      });

      initializeNoteCompletion(noteId, importId);

      // Mark all workers as completed
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "instruction", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "ingredient", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "image", mockLogger, mockStatusBroadcaster);

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
      });
    });

    it("should return undefined for non-existent note", () => {
      const nonExistentNoteId = "non-existent-note";
      const status = getNoteCompletionStatus(nonExistentNoteId);

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
      const nonExistentNoteId = "non-existent-note";

      // Should not throw an error
      expect(() => cleanupNoteCompletion(nonExistentNoteId)).not.toThrow();
    });
  });

  describe("markInstructionWorkerCompleted", () => {
    it("should mark instruction worker as completed", () => {
      const noteId = "test-note-123";
      const importId = "test-import-456";

      initializeNoteCompletion(noteId, importId);
      markInstructionWorkerCompleted(noteId, mockLogger, mockStatusBroadcaster);

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
      markIngredientWorkerCompleted(noteId, mockLogger, mockStatusBroadcaster);

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
      markWorkerCompleted(note2, "instruction", mockLogger, mockStatusBroadcaster);

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
      markWorkerCompleted(noteId, "instruction", mockLogger, mockStatusBroadcaster);
      status = getNoteCompletionStatus(noteId);
      expect(status?.instructionWorkerCompleted).toBe(true);
      expect(status?.allCompleted).toBe(false);

      // Mark ingredient worker completed
      markWorkerCompleted(noteId, "ingredient", mockLogger, mockStatusBroadcaster);
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

      // Mark only some workers as completed
      markWorkerCompleted(noteId, "note", mockLogger, mockStatusBroadcaster);
      markWorkerCompleted(noteId, "instruction", mockLogger, mockStatusBroadcaster);

      const status = getNoteCompletionStatus(noteId);
      expect(status?.noteWorkerCompleted).toBe(true);
      expect(status?.instructionWorkerCompleted).toBe(true);
      expect(status?.ingredientWorkerCompleted).toBe(false);
      expect(status?.imageWorkerCompleted).toBe(false);
      expect(status?.allCompleted).toBe(false);
    });
  });
});
