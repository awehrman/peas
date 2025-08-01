import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { InstructionJobData } from "../../../../../workers/instruction/dependencies";
import { formatInstruction } from "../../../../instruction/actions/format-instruction/service";

describe("formatInstruction", () => {
  let mockLogger: StructuredLogger;
  let mockData: InstructionJobData;

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      instructionReference: "Mix ingredients",
      lineIndex: 0,
    };
  });

  describe("basic functionality", () => {
    it("should format instruction and return data", async () => {
      const result = await formatInstruction(mockData, mockLogger);

      expect(result).toEqual({
        ...mockData,
        instructionReference: "Mix ingredients.",
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting instruction formatting")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Successfully formatted instruction")
      );
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

      expect(result.instructionReference).toBe("Mix ingredients.");
    });

    it("should remove instructions that are only whitespace", async () => {
      const dataWithOnlyWhitespace = {
        ...mockData,
        instructionReference: "   ",
      };

      await expect(
        formatInstruction(dataWithOnlyWhitespace, mockLogger)
      ).rejects.toThrow("Instruction is empty after trimming");
    });
  });

  describe("length validation", () => {
    it("should reject instructions shorter than 3 characters", async () => {
      const shortInstruction = {
        ...mockData,
        instructionReference: "Hi",
      };

      await expect(
        formatInstruction(shortInstruction, mockLogger)
      ).rejects.toThrow(
        'Instruction too short: "Hi" (minimum 3 characters required)'
      );
    });

    it("should accept instructions exactly 3 characters long", async () => {
      const threeCharInstruction = {
        ...mockData,
        instructionReference: "Mix",
      };

      const result = await formatInstruction(threeCharInstruction, mockLogger);

      expect(result.instructionReference).toBe("Mix.");
    });

    it("should accept instructions longer than 3 characters", async () => {
      const longInstruction = {
        ...mockData,
        instructionReference: "Mix all ingredients thoroughly",
      };

      const result = await formatInstruction(longInstruction, mockLogger);

      expect(result.instructionReference).toBe(
        "Mix all ingredients thoroughly."
      );
    });

    it("should handle short instructions with whitespace", async () => {
      const shortWithWhitespace = {
        ...mockData,
        instructionReference: "  Hi  ",
      };

      await expect(
        formatInstruction(shortWithWhitespace, mockLogger)
      ).rejects.toThrow(
        'Instruction too short: "Hi" (minimum 3 characters required)'
      );
    });
  });

  describe("punctuation handling", () => {
    it("should add period to instructions without punctuation", async () => {
      const result = await formatInstruction(mockData, mockLogger);

      expect(result.instructionReference).toBe("Mix ingredients.");
    });

    it("should not add period to instructions that already have punctuation", async () => {
      const dataWithPunctuation = {
        ...mockData,
        instructionReference: "Mix ingredients!",
      };

      const result = await formatInstruction(dataWithPunctuation, mockLogger);

      expect(result.instructionReference).toBe("Mix ingredients!");
    });

    it("should handle mixed punctuation scenarios", async () => {
      const dataWithQuestion = {
        ...mockData,
        instructionReference: "Mix ingredients?",
      };

      const result = await formatInstruction(dataWithQuestion, mockLogger);

      expect(result.instructionReference).toBe("Mix ingredients?");
    });

    it("should handle instructions ending with semicolon", async () => {
      const dataWithSemicolon = {
        ...mockData,
        instructionReference: "Mix ingredients;",
      };

      const result = await formatInstruction(dataWithSemicolon, mockLogger);

      expect(result.instructionReference).toBe("Mix ingredients;");
    });

    it("should handle instructions ending with colon", async () => {
      const dataWithColon = {
        ...mockData,
        instructionReference: "Mix ingredients:",
      };

      const result = await formatInstruction(dataWithColon, mockLogger);

      expect(result.instructionReference).toBe("Mix ingredients:");
    });
  });

  describe("error handling", () => {
    it("should handle processing errors gracefully", async () => {
      const invalidData = {
        ...mockData,
        instructionReference: null as unknown as string,
      };

      await expect(
        formatInstruction(invalidData, mockLogger)
      ).rejects.toThrow();
    });
  });

  describe("logging", () => {
    it("should log processing start and completion", async () => {
      await formatInstruction(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting instruction formatting")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Successfully formatted instruction")
      );
    });

    it("should log when instruction is too short", async () => {
      const shortInstruction = {
        ...mockData,
        instructionReference: "Hi",
      };

      await expect(
        formatInstruction(shortInstruction, mockLogger)
      ).rejects.toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Instruction too short (2 chars)")
      );
    });

    it("should log when period is added", async () => {
      await formatInstruction(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Added period to instruction")
      );
    });
  });

  describe("data preservation", () => {
    it("should preserve all other data properties", async () => {
      const result = await formatInstruction(mockData, mockLogger);

      expect(result.noteId).toBe(mockData.noteId);
      expect(result.lineIndex).toBe(mockData.lineIndex);
      expect(result.jobId).toBe(mockData.jobId);
      expect(result.metadata).toEqual(mockData.metadata);
    });
  });
});
