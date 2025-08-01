import { describe, it, expect, beforeEach, vi } from "vitest";
import { formatInstruction } from "../../../../instruction/actions/format-instruction/service.js";
import type { InstructionJobData } from "../../../../../workers/instruction/dependencies";

describe("formatInstruction", () => {
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockData: InstructionJobData;

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      lineIndex: 0,
      instructionReference: "Mix ingredients",
      parseStatus: "PENDING" as const,
      isActive: true,
    };
  });

  describe("basic functionality", () => {
    it("should format instruction and return data", async () => {
      const result = await formatInstruction(mockData, mockLogger);

      expect(result).toEqual({
        ...mockData,
        instructionReference: "Mix ingredients.",
        isActive: true,
      });
    });

    it("should handle data without instruction reference", async () => {
      const dataWithoutReference = {
        ...mockData,
        instructionReference: "",
      };

      await expect(
        formatInstruction(dataWithoutReference, mockLogger)
      ).rejects.toThrow("No instruction reference available for formatting");
    });

    it("should handle data without note ID", async () => {
      const dataWithoutNoteId = {
        ...mockData,
        noteId: "",
      };

      await expect(
        formatInstruction(dataWithoutNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for instruction formatting");
    });
  });

  describe("whitespace trimming", () => {
    it("should trim leading and trailing whitespace", async () => {
      const dataWithWhitespace = {
        ...mockData,
        instructionReference: "  Mix ingredients  ",
      };

      const result = await formatInstruction(dataWithWhitespace, mockLogger);

      expect(result).toEqual({
        ...mockData,
        instructionReference: "Mix ingredients.",
        isActive: true,
      });
    });

    it("should mark instructions that are only whitespace as inactive", async () => {
      const dataWithOnlyWhitespace = {
        ...mockData,
        instructionReference: "   \n\t   ",
      };

      const result = await formatInstruction(dataWithOnlyWhitespace, mockLogger);

      expect(result).toEqual({
        ...mockData,
        instructionReference: "",
        isActive: false,
      });
    });
  });

  describe("length validation", () => {
    it("should mark instructions shorter than 3 characters as inactive", async () => {
      const shortInstruction = {
        ...mockData,
        instructionReference: "Hi",
      };

      const result = await formatInstruction(shortInstruction, mockLogger);

      expect(result).toEqual({
        ...mockData,
        instructionReference: "Hi",
        isActive: false,
      });
    });

    it("should mark instructions with exactly 3 characters as active", async () => {
      const threeCharInstruction = {
        ...mockData,
        instructionReference: "Mix",
      };

      const result = await formatInstruction(threeCharInstruction, mockLogger);

      expect(result).toEqual({
        ...mockData,
        instructionReference: "Mix.",
        isActive: true,
      });
    });
  });

  describe("punctuation handling", () => {
    it("should add period to instructions without punctuation", async () => {
      const result = await formatInstruction(mockData, mockLogger);

      expect(result.instructionReference).toBe("Mix ingredients.");
    });

    it("should not add period to instructions that already end with punctuation", async () => {
      const dataWithPunctuation = {
        ...mockData,
        instructionReference: "Mix ingredients!",
      };

      const result = await formatInstruction(dataWithPunctuation, mockLogger);

      expect(result.instructionReference).toBe("Mix ingredients!");
    });

    it("should not add period to instructions ending with semicolon", async () => {
      const dataWithSemicolon = {
        ...mockData,
        instructionReference: "Mix ingredients;",
      };

      const result = await formatInstruction(dataWithSemicolon, mockLogger);

      expect(result.instructionReference).toBe("Mix ingredients;");
    });

    it("should not add period to instructions ending with colon", async () => {
      const dataWithColon = {
        ...mockData,
        instructionReference: "Mix ingredients:",
      };

      const result = await formatInstruction(dataWithColon, mockLogger);

      expect(result.instructionReference).toBe("Mix ingredients:");
    });
  });

  describe("error handling", () => {
    it("should log errors and re-throw them", async () => {
      const invalidData = {
        ...mockData,
        noteId: "",
      };

      await expect(
        formatInstruction(invalidData, mockLogger)
      ).rejects.toThrow("No note ID available for instruction formatting");

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("[FORMAT_INSTRUCTION] Failed to format instruction")
      );
    });
  });
});
