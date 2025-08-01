import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { InstructionJobData } from "../../../../../workers/instruction/dependencies";
import { saveInstruction } from "../../../../instruction/actions/save-instruction/service";

// Mock the database repository
vi.mock("@peas/database", () => ({
  updateInstructionLine: vi.fn(),
}));

describe("saveInstruction", () => {
  let mockLogger: StructuredLogger;
  let mockData: InstructionJobData;
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
  let mockUpdateInstructionLine: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockLogger = {
      log: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      instructionReference: "Mix ingredients thoroughly",
      lineIndex: 0,
    };

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
    };

    // Get the mocked function
    const { updateInstructionLine } = await import("@peas/database");
    mockUpdateInstructionLine = vi.mocked(updateInstructionLine);
  });

  describe("basic functionality", () => {
    it("should save instruction and return data", async () => {
      const mockUpdatedInstruction = {
        id: "instruction-123",
        lineIndex: 0,
        originalText: "Mix ingredients thoroughly",
        normalizedText: "Mix ingredients thoroughly",
        parseStatus: "CORRECT",
      };

      mockUpdateInstructionLine.mockResolvedValue(mockUpdatedInstruction);

      const result = await saveInstruction(
        mockData,
        mockLogger,
        mockStatusBroadcaster
      );

      expect(result).toEqual(mockData);
      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        mockData.noteId,
        mockData.lineIndex,
        mockData.instructionReference,
        mockStatusBroadcaster,
        "CORRECT"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting instruction save")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Successfully saved instruction")
      );
    });

    it("should handle missing note ID", async () => {
      const dataWithoutNoteId = {
        ...mockData,
        noteId: "",
      };

      await expect(
        saveInstruction(dataWithoutNoteId, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("No note ID available for instruction saving");
    });

    it("should handle missing instruction reference", async () => {
      const dataWithoutReference = {
        ...mockData,
        instructionReference: "",
      };

      await expect(
        saveInstruction(dataWithoutReference, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("No instruction reference available for saving");
    });

    it("should work without status broadcaster", async () => {
      const mockUpdatedInstruction = {
        id: "instruction-123",
        lineIndex: 0,
        originalText: "Mix ingredients thoroughly",
        normalizedText: "Mix ingredients thoroughly",
        parseStatus: "CORRECT",
      };

      mockUpdateInstructionLine.mockResolvedValue(mockUpdatedInstruction);

      const result = await saveInstruction(mockData, mockLogger);

      expect(result).toEqual(mockData);
      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        mockData.noteId,
        mockData.lineIndex,
        mockData.instructionReference,
        undefined,
        "CORRECT"
      );
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database connection failed");
      mockUpdateInstructionLine.mockRejectedValue(dbError);

      await expect(
        saveInstruction(mockData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("Database connection failed");

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save instruction")
      );
    });

    it("should handle validation errors", async () => {
      const validationError = new Error("Instruction too short");
      mockUpdateInstructionLine.mockRejectedValue(validationError);

      await expect(
        saveInstruction(mockData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow("Instruction too short");

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save instruction")
      );
    });
  });

  describe("logging", () => {
    it("should log processing start and completion", async () => {
      const mockUpdatedInstruction = {
        id: "instruction-123",
        lineIndex: 0,
        originalText: "Mix ingredients thoroughly",
        normalizedText: "Mix ingredients thoroughly",
        parseStatus: "CORRECT",
      };

      mockUpdateInstructionLine.mockResolvedValue(mockUpdatedInstruction);

      await saveInstruction(mockData, mockLogger, mockStatusBroadcaster);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Starting instruction save for note: test-note-id"
        )
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Saving instruction: "Mix ingredients thoroughly"'
        )
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Successfully saved instruction: "Mix ingredients thoroughly" (ID: instruction-123)'
        )
      );
    });

    it("should log error details when save fails", async () => {
      const dbError = new Error("Database connection failed");
      mockUpdateInstructionLine.mockRejectedValue(dbError);

      await expect(
        saveInstruction(mockData, mockLogger, mockStatusBroadcaster)
      ).rejects.toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to save instruction: Error: Database connection failed"
        )
      );
    });
  });

  describe("status broadcasting", () => {
    it("should call status broadcaster when provided", async () => {
      const mockUpdatedInstruction = {
        id: "instruction-123",
        lineIndex: 0,
        originalText: "Mix ingredients thoroughly",
        normalizedText: "Mix ingredients thoroughly",
        parseStatus: "CORRECT",
      };

      mockUpdateInstructionLine.mockResolvedValue(mockUpdatedInstruction);

      await saveInstruction(mockData, mockLogger, mockStatusBroadcaster);

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        mockData.noteId,
        mockData.lineIndex,
        mockData.instructionReference,
        mockStatusBroadcaster,
        "CORRECT"
      );
    });

    it("should not call status broadcaster when not provided", async () => {
      const mockUpdatedInstruction = {
        id: "instruction-123",
        lineIndex: 0,
        originalText: "Mix ingredients thoroughly",
        normalizedText: "Mix ingredients thoroughly",
        parseStatus: "CORRECT",
      };

      mockUpdateInstructionLine.mockResolvedValue(mockUpdatedInstruction);

      await saveInstruction(mockData, mockLogger);

      expect(mockUpdateInstructionLine).toHaveBeenCalledWith(
        mockData.noteId,
        mockData.lineIndex,
        mockData.instructionReference,
        undefined,
        "CORRECT"
      );
    });
  });
});
