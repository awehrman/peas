import {
  getInstructionCompletionStatus,
  updateInstructionLine,
} from "@peas/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { InstructionJobData } from "../../../../../workers/instruction/dependencies";
import { saveInstruction } from "../../../../instruction/actions/save-instruction/service";

// Mock the database functions
vi.mock("@peas/database", () => ({
  updateInstructionLine: vi.fn(),
  getInstructionCompletionStatus: vi.fn(),
}));

describe("saveInstruction", () => {
  let mockData: InstructionJobData;
  let mockLogger: StructuredLogger;
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };

  beforeEach(() => {
    mockData = {
      noteId: "test-note-id",
      instructionReference: "Test instruction",
      lineIndex: 0,
      importId: "test-import-id",
      jobId: "test-job-id",
      parseStatus: "AWAITING_PARSING",
      isActive: true,
    };

    mockLogger = {
      log: vi.fn(),
    };

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
    };

    vi.clearAllMocks();
  });

  describe("successful saving", () => {
    it("should save instruction and broadcast completion", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);
      const mockGetInstructionCompletionStatus = vi.mocked(
        getInstructionCompletionStatus
      );

      mockUpdateInstructionLine.mockResolvedValue({
        id: "instruction-1",
        lineIndex: 0,
        originalText: "Original instruction",
        normalizedText: "Test instruction",
        parseStatus: "COMPLETED_SUCCESSFULLY",
      });

      mockGetInstructionCompletionStatus.mockResolvedValue({
        totalInstructions: 5,
        completedInstructions: 3,
        progress: "3/5",
        isComplete: false,
      });

      const result = await saveInstruction(
        mockData,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        "test-note-id",
        0,
        "Test instruction",
        "COMPLETED_SUCCESSFULLY",
        true
      );

      expect(mockGetInstructionCompletionStatus).toHaveBeenCalledWith(
        "test-note-id"
      );

      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-id",
        noteId: "test-note-id",
        status: "PROCESSING",
        message: "Processing 3/5 instructions",
        context: "instruction_processing",
        currentCount: 3,
        totalCount: 5,
        indentLevel: 1,
        metadata: {
          totalInstructions: 5,
          completedInstructions: 3,
          savedInstructionId: "instruction-1",
          lineIndex: 0,
        },
      });

      expect(result).toBe(mockData);
    });

    it("should handle inactive instruction", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);

      const inactiveData = { ...mockData, isActive: false };

      mockUpdateInstructionLine.mockResolvedValue({
        id: "instruction-1",
        lineIndex: 0,
        originalText: "Original instruction",
        normalizedText: "Test instruction",
        parseStatus: "COMPLETED_SUCCESSFULLY",
      });

      const result = await saveInstruction(
        inactiveData,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        "test-note-id",
        0,
        "Test instruction",
        "COMPLETED_SUCCESSFULLY",
        false
      );

      expect(result).toBe(inactiveData);
    });

    it("should work without statusBroadcaster", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);

      mockUpdateInstructionLine.mockResolvedValue({
        id: "instruction-1",
        lineIndex: 0,
        originalText: "Original instruction",
        normalizedText: "Test instruction",
        parseStatus: "COMPLETED_SUCCESSFULLY",
      });

      const result = await saveInstruction(mockData, mockLogger);

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        "test-note-id",
        0,
        "Test instruction",
        "COMPLETED_SUCCESSFULLY",
        true
      );

      expect(result).toBe(mockData);
    });

    it("should handle data without importId", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);
      const mockGetInstructionCompletionStatus = vi.mocked(getInstructionCompletionStatus);

      const dataWithoutImportId = { ...mockData, importId: undefined };

      mockUpdateInstructionLine.mockResolvedValue({
        id: "instruction-1",
        lineIndex: 0,
        originalText: "Original instruction",
        normalizedText: "Test instruction",
        parseStatus: "COMPLETED_SUCCESSFULLY",
      });

      mockGetInstructionCompletionStatus.mockResolvedValue({
        totalInstructions: 5,
        completedInstructions: 3,
        progress: "3/5",
        isComplete: false,
      });

      const result = await saveInstruction(
        dataWithoutImportId,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: undefined,
        noteId: "test-note-id",
        status: "PROCESSING",
        message: "Processing 3/5 instructions",
        context: "instruction_processing",
        currentCount: 3,
        totalCount: 5,
        indentLevel: 1,
        metadata: {
          totalInstructions: 5,
          completedInstructions: 3,
          savedInstructionId: "instruction-1",
          lineIndex: 0,
        },
      });

      expect(result).toBe(dataWithoutImportId);
    });
  });

  describe("error handling", () => {
    it("should throw error when noteId is missing", async () => {
      const dataWithoutNoteId = { ...mockData, noteId: "" };

      await expect(
        saveInstruction(dataWithoutNoteId, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("No note ID available for instruction saving");
    });

    it("should throw error when instructionReference is missing", async () => {
      const dataWithoutReference = { ...mockData, instructionReference: "" };

      await expect(
        saveInstruction(dataWithoutReference, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("No instruction reference available for saving");
    });

    it("should handle updateInstructionLine errors", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);
      const dbError = new Error("Database error");
      mockUpdateInstructionLine.mockRejectedValue(dbError);

      await expect(
        saveInstruction(mockData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("Database error");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_INSTRUCTION_LINE] Failed to save instruction: Error: Database error"
      );
    });

    it("should handle statusBroadcaster errors", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);

      mockUpdateInstructionLine.mockResolvedValue({
        id: "instruction-1",
        lineIndex: 0,
        originalText: "Original instruction",
        normalizedText: "Test instruction",
        parseStatus: "COMPLETED_SUCCESSFULLY",
      });

      const broadcasterError = new Error("Broadcaster error");
      const mockAddStatusEventAndBroadcast = vi.mocked(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      );
      mockAddStatusEventAndBroadcast.mockRejectedValue(broadcasterError);

      await expect(
        saveInstruction(mockData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("Broadcaster error");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_INSTRUCTION_LINE] Failed to save instruction: Error: Broadcaster error"
      );
    });

    it("should handle broadcast error and rethrow it", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);
      const mockGetInstructionCompletionStatus = vi.mocked(getInstructionCompletionStatus);

      mockUpdateInstructionLine.mockResolvedValue({
        id: "instruction-1",
        lineIndex: 0,
        originalText: "Original instruction",
        normalizedText: "Test instruction",
        parseStatus: "COMPLETED_SUCCESSFULLY",
      });

      mockGetInstructionCompletionStatus.mockResolvedValue({
        totalInstructions: 5,
        completedInstructions: 3,
        progress: "3/5",
        isComplete: false,
      });

      const broadcastError = new Error("Broadcast failed");
      (mockStatusBroadcaster.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>).mockRejectedValue(broadcastError);

      await expect(
        saveInstruction(mockData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("Broadcast failed");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SAVE_INSTRUCTION_LINE] Failed to broadcast instruction completion: Error: Broadcast failed"
      );
    });
  });

  describe("edge cases", () => {
    it("should handle different line indices", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);
      const dataWithDifferentLineIndex = { ...mockData, lineIndex: 5 };

      mockUpdateInstructionLine.mockResolvedValue({
        id: "instruction-1",
        lineIndex: 5,
        originalText: "Original instruction",
        normalizedText: "Test instruction",
        parseStatus: "COMPLETED_SUCCESSFULLY",
      });

      await saveInstruction(
        dataWithDifferentLineIndex,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        "test-note-id",
        5,
        "Test instruction",
        "COMPLETED_SUCCESSFULLY",
        true
      );
    });

    it("should handle different instruction references", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);
      const dataWithDifferentReference = {
        ...mockData,
        instructionReference: "Different instruction",
      };

      mockUpdateInstructionLine.mockResolvedValue({
        id: "instruction-1",
        lineIndex: 0,
        originalText: "Original instruction",
        normalizedText: "Different instruction",
        parseStatus: "COMPLETED_SUCCESSFULLY",
      });

      await saveInstruction(
        dataWithDifferentReference,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        "test-note-id",
        0,
        "Different instruction",
        "COMPLETED_SUCCESSFULLY",
        true
      );
    });

    it("should preserve all other data properties", async () => {
      const mockUpdateInstructionLine = vi.mocked(updateInstructionLine);

      mockUpdateInstructionLine.mockResolvedValue({
        id: "instruction-1",
        lineIndex: 0,
        originalText: "Original instruction",
        normalizedText: "Test instruction",
        parseStatus: "COMPLETED_SUCCESSFULLY",
      });

      const result = await saveInstruction(
        mockData,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(result.noteId).toBe(mockData.noteId);
      expect(result.instructionReference).toBe(mockData.instructionReference);
      expect(result.lineIndex).toBe(mockData.lineIndex);
      expect(result.importId).toBe(mockData.importId);
      expect(result.jobId).toBe(mockData.jobId);
      expect(result.parseStatus).toBe(mockData.parseStatus);
      expect(result.isActive).toBe(mockData.isActive);
    });
  });
});
