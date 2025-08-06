import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { InstructionJobData } from "../../../../../workers/instruction/dependencies";
import { formatInstruction } from "../../../../instruction/actions/format-instruction/service";

describe("formatInstruction", () => {
  let mockData: InstructionJobData;
  let mockLogger: StructuredLogger;

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
  });

  describe("successful formatting", () => {
    it("should format instruction with proper punctuation", async () => {
      const result = await formatInstruction(mockData, mockLogger);

      expect(result.instructionReference).toBe("Test instruction.");
      expect(result.isActive).toBe(true);
      expect(result.noteId).toBe(mockData.noteId);
      expect(result.lineIndex).toBe(mockData.lineIndex);
    });

    it("should not add punctuation if already present", async () => {
      const dataWithPunctuation = {
        ...mockData,
        instructionReference: "Test instruction!",
      };

      const result = await formatInstruction(dataWithPunctuation, mockLogger);

      expect(result.instructionReference).toBe("Test instruction!");
      expect(result.isActive).toBe(true);
    });

    it("should handle different punctuation marks", async () => {
      const testCases = [
        { input: "Test instruction", expected: "Test instruction." },
        { input: "Test instruction!", expected: "Test instruction!" },
        { input: "Test instruction?", expected: "Test instruction?" },
        { input: "Test instruction;", expected: "Test instruction;" },
        { input: "Test instruction:", expected: "Test instruction:" },
      ];

      for (const testCase of testCases) {
        const data = { ...mockData, instructionReference: testCase.input };
        const result = await formatInstruction(data, mockLogger);
        expect(result.instructionReference).toBe(testCase.expected);
      }
    });

    it("should trim whitespace from instruction reference", async () => {
      const dataWithWhitespace = {
        ...mockData,
        instructionReference: "  Test instruction  ",
      };

      const result = await formatInstruction(dataWithWhitespace, mockLogger);

      expect(result.instructionReference).toBe("Test instruction.");
      expect(result.isActive).toBe(true);
    });
  });

  describe("inactive instruction handling", () => {
    it("should mark instruction as inactive when empty after trimming", async () => {
      const dataWithEmptyReference = {
        ...mockData,
        instructionReference: "   ",
      };

      const result = await formatInstruction(
        dataWithEmptyReference,
        mockLogger
      );

      expect(result.instructionReference).toBe("");
      expect(result.isActive).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[FORMAT_INSTRUCTION_LINE] Marking instruction as inactive: empty after trimming"
      );
    });

    it("should mark instruction as inactive when too short", async () => {
      const dataWithShortReference = {
        ...mockData,
        instructionReference: "Hi",
      };

      const result = await formatInstruction(
        dataWithShortReference,
        mockLogger
      );

      expect(result.instructionReference).toBe("Hi");
      expect(result.isActive).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[FORMAT_INSTRUCTION_LINE] Marking instruction as inactive: too short "Hi" (minimum 3 characters required)'
      );
    });

    it("should mark instruction as inactive when exactly 2 characters", async () => {
      const dataWithShortReference = {
        ...mockData,
        instructionReference: "Hi",
      };

      const result = await formatInstruction(
        dataWithShortReference,
        mockLogger
      );

      expect(result.instructionReference).toBe("Hi");
      expect(result.isActive).toBe(false);
    });

    it("should keep instruction active when exactly 3 characters", async () => {
      const dataWithThreeChars = {
        ...mockData,
        instructionReference: "Hi!",
      };

      const result = await formatInstruction(dataWithThreeChars, mockLogger);

      expect(result.instructionReference).toBe("Hi!");
      expect(result.isActive).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should throw error when noteId is missing", async () => {
      const dataWithoutNoteId = { ...mockData, noteId: "" };

      await expect(
        formatInstruction(dataWithoutNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for instruction formatting");
    });

    it("should throw error when instructionReference is missing", async () => {
      const dataWithoutReference = { ...mockData, instructionReference: "" };

      await expect(
        formatInstruction(dataWithoutReference, mockLogger)
      ).rejects.toThrow("No instruction reference available for formatting");
    });

    it("should log and re-throw other errors", async () => {
      const testError = new Error("Test error");
      const mockLog = vi.mocked(mockLogger.log);

      // Make the logger throw an error during the formatting process
      mockLog.mockImplementation((message: string) => {
        if (message.includes("Marking instruction as inactive")) {
          throw testError;
        }
      });

      const dataWithEmptyReference = {
        ...mockData,
        instructionReference: "   ",
      };

      await expect(
        formatInstruction(dataWithEmptyReference, mockLogger)
      ).rejects.toThrow("Test error");
    });
  });

  describe("edge cases", () => {
    it("should handle instruction with only punctuation", async () => {
      const dataWithOnlyPunctuation = {
        ...mockData,
        instructionReference: "!",
      };

      const result = await formatInstruction(
        dataWithOnlyPunctuation,
        mockLogger
      );

      expect(result.instructionReference).toBe("!");
      expect(result.isActive).toBe(false);
    });

    it("should handle instruction with mixed whitespace and punctuation", async () => {
      const dataWithMixedContent = {
        ...mockData,
        instructionReference: "  Test!  ",
      };

      const result = await formatInstruction(dataWithMixedContent, mockLogger);

      expect(result.instructionReference).toBe("Test!");
      expect(result.isActive).toBe(true);
    });

    it("should preserve all other data properties", async () => {
      const result = await formatInstruction(mockData, mockLogger);

      expect(result.noteId).toBe(mockData.noteId);
      expect(result.lineIndex).toBe(mockData.lineIndex);
      expect(result.importId).toBe(mockData.importId);
      expect(result.jobId).toBe(mockData.jobId);
      expect(result.parseStatus).toBe(mockData.parseStatus);
    });
  });
});
