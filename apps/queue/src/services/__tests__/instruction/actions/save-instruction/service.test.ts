import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InstructionJobData } from "../../../../../workers/instruction/dependencies";
import { saveInstruction } from "../../../../instruction/actions/save-instruction/service.js";

// Mock the database module
vi.mock("@peas/database", () => ({
  updateInstructionLine: vi.fn(),
  getInstructionCompletionStatus: vi.fn(),
}));

describe("saveInstruction", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
  };
  let mockData: InstructionJobData;
  let mockUpdateInstructionLine: ReturnType<typeof vi.fn>;
  let mockGetInstructionCompletionStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockLogger = {
      log: vi.fn(),
    };

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      lineIndex: 0,
      instructionReference: "Mix ingredients thoroughly",
      parseStatus: "PENDING" as const,
      isActive: true,
    };

    // Import the mocked functions
    const { updateInstructionLine, getInstructionCompletionStatus } =
      await import("@peas/database");
    mockUpdateInstructionLine = vi.mocked(updateInstructionLine);
    mockGetInstructionCompletionStatus = vi.mocked(
      getInstructionCompletionStatus
    );

    // Default mock implementations
    mockUpdateInstructionLine.mockResolvedValue({
      id: "instruction-123",
      lineIndex: 0,
      originalText: "Mix ingredients thoroughly",
      normalizedText: "Mix ingredients thoroughly",
      parseStatus: "CORRECT",
      isActive: true,
    });

    mockGetInstructionCompletionStatus.mockResolvedValue({
      completedInstructions: 1,
      totalInstructions: 5,
      progress: 0.2,
      isComplete: false,
    });
  });

  describe("successful operations", () => {
    it("should save instruction successfully with status broadcaster", async () => {
      const mockUpdatedInstruction = {
        id: "instruction-123",
        lineIndex: 0,
        originalText: "Mix ingredients thoroughly",
        normalizedText: "Mix ingredients thoroughly",
        parseStatus: "CORRECT",
        isActive: true,
      };

      mockUpdateInstructionLine.mockResolvedValue(mockUpdatedInstruction);

      await saveInstruction(mockData, mockLogger, mockStatusBroadcaster);

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        mockData.noteId,
        mockData.lineIndex,
        mockData.instructionReference,
        "CORRECT",
        mockData.isActive
      );

      expect(mockGetInstructionCompletionStatus).toHaveBeenCalledWith(
        mockData.noteId
      );
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        type: "instruction_processed",
        noteId: mockData.noteId,
        lineIndex: mockData.lineIndex,
        processedText: mockData.instructionReference,
        completedInstructions: 1,
        totalInstructions: 5,
        progress: 0.2,
        isComplete: false,
        timestamp: expect.any(String),
      });
    });

    it("should save instruction successfully without status broadcaster", async () => {
      await saveInstruction(mockData, mockLogger);

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        mockData.noteId,
        mockData.lineIndex,
        mockData.instructionReference,
        "CORRECT",
        mockData.isActive
      );

      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
    });

    it("should handle inactive instructions", async () => {
      const inactiveData = {
        ...mockData,
        isActive: false,
      };

      await saveInstruction(inactiveData, mockLogger, mockStatusBroadcaster);

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        inactiveData.noteId,
        inactiveData.lineIndex,
        inactiveData.instructionReference,
        "CORRECT",
        false
      );
    });
  });

  describe("error handling", () => {
    it("should throw error for missing note ID", async () => {
      const dataWithoutNoteId = {
        ...mockData,
        noteId: "",
      };

      await expect(
        saveInstruction(dataWithoutNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for instruction saving");
    });

    it("should throw error for missing instruction reference", async () => {
      const dataWithoutReference = {
        ...mockData,
        instructionReference: "",
      };

      await expect(
        saveInstruction(dataWithoutReference, mockLogger)
      ).rejects.toThrow("No instruction reference available for saving");
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      mockUpdateInstructionLine.mockRejectedValue(dbError);

      await expect(saveInstruction(mockData, mockLogger)).rejects.toThrow(
        "Database connection failed"
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("[SAVE_INSTRUCTION] Failed to save instruction")
      );
    });

    it("should handle completion status errors", async () => {
      const statusError = new Error("Status check failed");
      mockGetInstructionCompletionStatus.mockRejectedValue(statusError);

      await expect(
        saveInstruction(mockData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("Status check failed");
    });
  });

  describe("logging", () => {
    it("should log start of instruction save", async () => {
      await saveInstruction(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("[SAVE_INSTRUCTION] Starting instruction save")
      );
    });

    it("should log successful save", async () => {
      await saveInstruction(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "[SAVE_INSTRUCTION] Successfully saved instruction"
        )
      );
    });

    it("should log instruction content", async () => {
      await saveInstruction(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Saving instruction: "Mix ingredients thoroughly"'
        )
      );
    });
  });
});
