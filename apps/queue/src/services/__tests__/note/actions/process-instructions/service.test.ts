import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import { processInstructions } from "../../../../note/actions/schedule-instructions/service";

describe("processInstructions", () => {
  let mockLogger: StructuredLogger;
  let mockData: NotePipelineData;

  beforeEach(() => {
    mockLogger = {
      log: vi.fn(),
    };

    mockData = {
      noteId: "test-note-id",
      content: "Test content",
      file: {
        contents: "Test content",
        title: "Test Recipe",
        ingredients: [
          { reference: "1 cup flour", blockIndex: 0, lineIndex: 0 },
        ],
        instructions: [
          { reference: "Mix ingredients", lineIndex: 0 },
          { reference: "Bake at 350F", lineIndex: 1 },
        ],
        evernoteMetadata: {
          source: "https://example.com/recipe",
          tags: ["recipe", "baking"],
          originalCreatedAt: new Date("2023-01-01"),
        },
      },
    };
  });

  describe("basic functionality", () => {
    it("should process instructions and return data", async () => {
      const result = await processInstructions(mockData, mockLogger);

      expect(result).toBe(mockData);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Starting instruction processing for note: test-note-id"
        )
      );
    });

    it("should handle data without instructions", async () => {
      const dataWithoutInstructions = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [],
        },
      };

      const result = await processInstructions(
        dataWithoutInstructions,
        mockLogger
      );

      expect(result).toBe(dataWithoutInstructions);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("No instructions found for note: test-note-id")
      );
    });

    it("should handle data without file", async () => {
      const dataWithoutFile = {
        ...mockData,
        file: undefined,
      };

      const result = await processInstructions(dataWithoutFile, mockLogger);

      expect(result).toBe(dataWithoutFile);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("No instructions found for note: test-note-id")
      );
    });
  });

  describe("whitespace trimming", () => {
    it("should trim leading and trailing whitespace", async () => {
      const dataWithWhitespace = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            { reference: "  Mix ingredients  ", lineIndex: 0 },
            { reference: "\tBake at 350F\n", lineIndex: 1 },
          ],
        },
      };

      const result = await processInstructions(dataWithWhitespace, mockLogger);

      expect(result.file!.instructions).toEqual([
        { reference: "Mix ingredients.", lineIndex: 0 },
        { reference: "Bake at 350F.", lineIndex: 1 },
      ]);
    });

    it("should remove instructions that are only whitespace", async () => {
      const dataWithEmptyInstructions = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            { reference: "Mix ingredients", lineIndex: 0 },
            { reference: "   ", lineIndex: 1 },
            { reference: "\t\n", lineIndex: 2 },
            { reference: "Bake at 350F", lineIndex: 3 },
          ],
        },
      };

      const result = await processInstructions(
        dataWithEmptyInstructions,
        mockLogger
      );

      expect(result.file!.instructions).toEqual([
        { reference: "Mix ingredients.", lineIndex: 0 },
        { reference: "Bake at 350F.", lineIndex: 3 },
      ]);
    });
  });

  describe("punctuation handling", () => {
    it("should add period to instructions without punctuation", async () => {
      const dataWithoutPunctuation = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            { reference: "Mix ingredients", lineIndex: 0 },
            { reference: "Bake at 350F", lineIndex: 1 },
            { reference: "Let cool", lineIndex: 2 },
          ],
        },
      };

      const result = await processInstructions(
        dataWithoutPunctuation,
        mockLogger
      );

      expect(result.file!.instructions).toEqual([
        { reference: "Mix ingredients.", lineIndex: 0 },
        { reference: "Bake at 350F.", lineIndex: 1 },
        { reference: "Let cool.", lineIndex: 2 },
      ]);
    });

    it("should not add period to instructions that already have punctuation", async () => {
      const dataWithPunctuation = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            { reference: "Mix ingredients.", lineIndex: 0 },
            { reference: "Bake at 350F!", lineIndex: 1 },
            { reference: "Let cool?", lineIndex: 2 },
            { reference: "Serve immediately;", lineIndex: 3 },
            { reference: "Enjoy:", lineIndex: 4 },
          ],
        },
      };

      const result = await processInstructions(dataWithPunctuation, mockLogger);

      expect(result.file!.instructions).toEqual([
        { reference: "Mix ingredients.", lineIndex: 0 },
        { reference: "Bake at 350F!", lineIndex: 1 },
        { reference: "Let cool?", lineIndex: 2 },
        { reference: "Serve immediately;", lineIndex: 3 },
        { reference: "Enjoy:", lineIndex: 4 },
      ]);
    });

    it("should handle mixed punctuation scenarios", async () => {
      const dataWithMixedPunctuation = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            { reference: "Mix ingredients", lineIndex: 0 },
            { reference: "Bake at 350F!", lineIndex: 1 },
            { reference: "Let cool", lineIndex: 2 },
            { reference: "Serve immediately;", lineIndex: 3 },
          ],
        },
      };

      const result = await processInstructions(
        dataWithMixedPunctuation,
        mockLogger
      );

      expect(result.file!.instructions).toEqual([
        { reference: "Mix ingredients.", lineIndex: 0 },
        { reference: "Bake at 350F!", lineIndex: 1 },
        { reference: "Let cool.", lineIndex: 2 },
        { reference: "Serve immediately;", lineIndex: 3 },
      ]);
    });
  });

  describe("error handling", () => {
    it("should throw error when noteId is missing", async () => {
      const dataWithoutNoteId = {
        ...mockData,
        noteId: undefined,
      };

      await expect(
        processInstructions(dataWithoutNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for instruction processing");
    });

    it("should throw error when noteId is empty string", async () => {
      const dataWithEmptyNoteId = {
        ...mockData,
        noteId: "",
      };

      await expect(
        processInstructions(dataWithEmptyNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for instruction processing");
    });

    it("should handle processing errors gracefully", async () => {
      // Mock a scenario where processing might fail
      const invalidData = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            { reference: "Valid instruction", lineIndex: 0 },
            // This would cause an error if we tried to access a non-existent property
            { reference: null as unknown as string, lineIndex: 1 },
          ],
        },
      };

      await expect(
        processInstructions(invalidData, mockLogger)
      ).rejects.toThrow();
    });
  });

  describe("logging", () => {
    it("should log processing start and completion", async () => {
      await processInstructions(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Starting instruction processing for note: test-note-id"
        )
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Successfully processed instructions for note: test-note-id"
        )
      );
    });

    it("should log instruction processing details", async () => {
      await processInstructions(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Processing 2 instructions for note: test-note-id"
        )
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Processing instruction 1: Mix ingredients")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Processing instruction 2: Bake at 350F")
      );
    });

    it("should log when instructions are removed", async () => {
      const dataWithEmptyInstructions = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            { reference: "Mix ingredients", lineIndex: 0 },
            { reference: "   ", lineIndex: 1 },
            { reference: "Bake at 350F", lineIndex: 2 },
          ],
        },
      };

      await processInstructions(dataWithEmptyInstructions, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Removing empty instruction 2")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Processed 2 instructions (removed 1 empty ones)"
        )
      );
    });

    it("should log when periods are added", async () => {
      await processInstructions(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Added period to instruction 1")
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("Added period to instruction 2")
      );
    });
  });

  describe("data preservation", () => {
    it("should preserve all other data properties", async () => {
      const result = await processInstructions(mockData, mockLogger);

      expect(result.noteId).toBe(mockData.noteId);
      expect(result.file!.contents).toBe(mockData.file!.contents);
      expect(result.file!.title).toBe(mockData.file!.title);
      expect(result.file!.ingredients).toEqual(mockData.file!.ingredients);
      expect(result.file!.evernoteMetadata).toEqual(
        mockData.file!.evernoteMetadata
      );
    });

    it("should preserve instruction properties other than reference", async () => {
      const dataWithComplexInstructions = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            {
              reference: "Mix ingredients",
              lineIndex: 5,
              someOtherProp: "value",
            },
            {
              reference: "Bake at 350F",
              lineIndex: 10,
              someOtherProp: "another",
            },
          ],
        },
      };

      const result = await processInstructions(
        dataWithComplexInstructions,
        mockLogger
      );

      expect(result.file!.instructions).toEqual([
        { reference: "Mix ingredients.", lineIndex: 5, someOtherProp: "value" },
        { reference: "Bake at 350F.", lineIndex: 10, someOtherProp: "another" },
      ]);
    });
  });
});
