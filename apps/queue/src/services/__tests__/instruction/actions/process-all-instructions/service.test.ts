import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import { processAllInstructions } from "../../../../instruction/actions/process-all-instructions/service";

// Mock the database repository
vi.mock("@peas/database", () => ({
  deleteInstructionLine: vi.fn(),
  reindexInstructionLines: vi.fn(),
}));

describe("processAllInstructions", () => {
  let mockLogger: StructuredLogger;
  let mockData: {
    noteId: string;
    instructionLines: Array<{
      lineIndex: number;
      originalText: string;
    }>;
  };
  let mockDeleteInstructionLine: ReturnType<typeof vi.fn>;
  let mockReindexInstructionLines: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockLogger = {
      log: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      instructionLines: [
        { lineIndex: 0, originalText: "Mix ingredients thoroughly" },
        { lineIndex: 1, originalText: "Hi" }, // Short instruction
        { lineIndex: 2, originalText: "Bake at 350F for 30 minutes" },
        { lineIndex: 3, originalText: "  " }, // Whitespace only
        { lineIndex: 4, originalText: "Cool completely" },
      ],
    };

    // Get the mocked functions
    const { deleteInstructionLine, reindexInstructionLines } = await import("@peas/database");
    mockDeleteInstructionLine = vi.mocked(deleteInstructionLine);
    mockReindexInstructionLines = vi.mocked(reindexInstructionLines);
    
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe("basic functionality", () => {
    it("should process all instructions and delete short ones", async () => {
      // Mock successful deletions
      mockDeleteInstructionLine
        .mockResolvedValueOnce({ id: "deleted-1", lineIndex: 1, originalText: "Hi" })
        .mockResolvedValueOnce({ id: "deleted-3", lineIndex: 3, originalText: "  " });

      // Mock reindexing result
      mockReindexInstructionLines.mockResolvedValue({
        reindexedCount: 3,
        updatedLines: [
          { id: "line-0", oldLineIndex: 0, newLineIndex: 0 },
          { id: "line-2", oldLineIndex: 2, newLineIndex: 1 },
          { id: "line-4", oldLineIndex: 4, newLineIndex: 2 },
        ],
      });

      const result = await processAllInstructions(mockData, mockLogger);

      expect(result).toEqual({
        noteId: "test-note-id",
        processedCount: 5,
        deletedCount: 2,
        reindexedCount: 3,
        finalInstructionCount: 3,
      });

      // Verify deletions were called for short instructions
      expect(mockDeleteInstructionLine).toHaveBeenCalledWith("test-note-id", 1);
      expect(mockDeleteInstructionLine).toHaveBeenCalledWith("test-note-id", 3);
      expect(mockDeleteInstructionLine).toHaveBeenCalledTimes(2);

      // Verify reindexing was called
      expect(mockReindexInstructionLines).toHaveBeenCalledWith("test-note-id");
    });

    it("should handle case with no short instructions", async () => {
      const dataWithNoShortInstructions = {
        noteId: "test-note-id",
        instructionLines: [
          { lineIndex: 0, originalText: "Mix ingredients thoroughly" },
          { lineIndex: 1, originalText: "Bake at 350F for 30 minutes" },
          { lineIndex: 2, originalText: "Cool completely" },
        ],
      };

      mockReindexInstructionLines.mockResolvedValue({
        reindexedCount: 3,
        updatedLines: [],
      });

      const result = await processAllInstructions(dataWithNoShortInstructions, mockLogger);

      expect(result).toEqual({
        noteId: "test-note-id",
        processedCount: 3,
        deletedCount: 0,
        reindexedCount: 3,
        finalInstructionCount: 3,
      });

      expect(mockDeleteInstructionLine).not.toHaveBeenCalled();
      expect(mockReindexInstructionLines).toHaveBeenCalledWith("test-note-id");
    });

    it("should handle case with all short instructions", async () => {
      const dataWithAllShortInstructions = {
        noteId: "test-note-id",
        instructionLines: [
          { lineIndex: 0, originalText: "Hi" },
          { lineIndex: 1, originalText: "  " },
          { lineIndex: 2, originalText: "A" },
        ],
      };

      mockDeleteInstructionLine
        .mockResolvedValueOnce({ id: "deleted-0", lineIndex: 0, originalText: "Hi" })
        .mockResolvedValueOnce({ id: "deleted-1", lineIndex: 1, originalText: "  " })
        .mockResolvedValueOnce({ id: "deleted-2", lineIndex: 2, originalText: "A" });

      mockReindexInstructionLines.mockResolvedValue({
        reindexedCount: 0,
        updatedLines: [],
      });

      const result = await processAllInstructions(dataWithAllShortInstructions, mockLogger);

      expect(result).toEqual({
        noteId: "test-note-id",
        processedCount: 3,
        deletedCount: 3,
        reindexedCount: 0,
        finalInstructionCount: 0,
      });

      expect(mockDeleteInstructionLine).toHaveBeenCalledTimes(3);
      expect(mockReindexInstructionLines).toHaveBeenCalledWith("test-note-id");
    });
  });

  describe("error handling", () => {
    it("should handle deletion errors gracefully", async () => {
      mockDeleteInstructionLine
        .mockResolvedValueOnce({ id: "deleted-1", lineIndex: 1, originalText: "Hi" })
        .mockRejectedValueOnce(new Error("Database error"));

      mockReindexInstructionLines.mockResolvedValue({
        reindexedCount: 3,
        updatedLines: [],
      });

      const result = await processAllInstructions(mockData, mockLogger);

      expect(result.deletedCount).toBe(1); // Only one successful deletion
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete instruction line 3")
      );
    });

    it("should handle reindexing errors", async () => {
      mockDeleteInstructionLine.mockResolvedValue({ id: "deleted-1", lineIndex: 1, originalText: "Hi" });
      mockReindexInstructionLines.mockRejectedValue(new Error("Reindexing failed"));

      await expect(
        processAllInstructions(mockData, mockLogger)
      ).rejects.toThrow("Reindexing failed");
    });
  });

  describe("logging", () => {
    it("should log processing start and completion", async () => {
      mockDeleteInstructionLine.mockResolvedValue({ id: "deleted-1", lineIndex: 1, originalText: "Hi" });
      mockReindexInstructionLines.mockResolvedValue({
        reindexedCount: 3,
        updatedLines: [],
      });

      await processAllInstructions(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting processing for note: test-note-id")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Completed processing for note test-note-id: 5 processed, 2 deleted, 3 remaining")
      );
    });

    it("should log deletion details", async () => {
      mockDeleteInstructionLine.mockResolvedValue({ id: "deleted-1", lineIndex: 1, originalText: "Hi" });
      mockReindexInstructionLines.mockResolvedValue({
        reindexedCount: 3,
        updatedLines: [],
      });

      await processAllInstructions(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Instruction too short (2 chars), deleting: \"Hi\"")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Deleted instruction line 1 (ID: deleted-1)")
      );
    });

    it("should log reindexing details", async () => {
      mockDeleteInstructionLine.mockResolvedValue({ id: "deleted-1", lineIndex: 1, originalText: "Hi" });
      mockReindexInstructionLines.mockResolvedValue({
        reindexedCount: 3,
        updatedLines: [
          { id: "line-2", oldLineIndex: 2, newLineIndex: 1 },
          { id: "line-4", oldLineIndex: 4, newLineIndex: 2 },
        ],
      });

      await processAllInstructions(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Reindexing instruction lines after deleting 2 short instructions")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Reindexed 3 instruction lines")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Updated 2 line indexes")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Line 2 → 1")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Line 4 → 2")
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty instruction lines array", async () => {
      const emptyData = {
        noteId: "test-note-id",
        instructionLines: [],
      };

      mockReindexInstructionLines.mockResolvedValue({
        reindexedCount: 0,
        updatedLines: [],
      });

      const result = await processAllInstructions(emptyData, mockLogger);

      expect(result).toEqual({
        noteId: "test-note-id",
        processedCount: 0,
        deletedCount: 0,
        reindexedCount: 0,
        finalInstructionCount: 0,
      });
    });

    it("should handle instructions with exactly 3 characters", async () => {
      const dataWithThreeCharInstructions = {
        noteId: "test-note-id",
        instructionLines: [
          { lineIndex: 0, originalText: "Mix" },
          { lineIndex: 1, originalText: "Bake" },
        ],
      };

      mockReindexInstructionLines.mockResolvedValue({
        reindexedCount: 2,
        updatedLines: [],
      });

      const result = await processAllInstructions(dataWithThreeCharInstructions, mockLogger);

      expect(result.deletedCount).toBe(0); // 3-character instructions should not be deleted
      expect(mockDeleteInstructionLine).not.toHaveBeenCalled();
    });
  });
}); 