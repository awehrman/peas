import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockQueue } from "../../../../../test-utils/helpers";
import { ActionName } from "../../../../../types";
import type { StructuredLogger } from "../../../../../types";
import type { NotePipelineData } from "../../../../../types/notes";
import { processInstructions } from "../../../../note/actions/schedule-instructions/service";

describe("processInstructions", () => {
  let mockData: NotePipelineData;
  let mockLogger: StructuredLogger;
  let mockQueues: {
    instructionQueue: ReturnType<typeof createMockQueue>;
  };
  let mockInstructionQueue: ReturnType<typeof createMockQueue>;

  beforeEach(() => {
    mockData = {
      noteId: "test-note-id",
      importId: "test-import-id",
      content: "<html><body>Test content</body></html>",
      file: {
        title: "Test Recipe",
        contents: "<html><body>Test content</body></html>",
        ingredients: [],
        instructions: [
          { reference: "ref1", lineIndex: 0 },
          { reference: "ref2", lineIndex: 1 },
          { reference: "ref3", lineIndex: 2 },
        ],
      },
    };

    mockInstructionQueue = createMockQueue("instruction-queue");

    mockQueues = {
      instructionQueue: mockInstructionQueue,
    };

    mockLogger = {
      log: vi.fn(),
    };
  });

  describe("successful processing", () => {
    it("should schedule jobs for all instructions", async () => {
      const result = await processInstructions(
        mockData,
        mockLogger,
        mockQueues
      );

      expect(result).toBe(mockData);
      expect(mockInstructionQueue.add).toHaveBeenCalledTimes(4); // 3 instruction jobs + 1 completion check job
      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        expect.objectContaining({
          noteId: "test-note-id",
          importId: "test-import-id",
          instructionReference: "ref1",
          lineIndex: 0,
          jobId: "test-note-id-instruction-0",
        })
      );
      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        expect.objectContaining({
          noteId: "test-note-id",
          importId: "test-import-id",
          instructionReference: "ref2",
          lineIndex: 1,
          jobId: "test-note-id-instruction-1",
        })
      );
      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        expect.objectContaining({
          noteId: "test-note-id",
          importId: "test-import-id",
          instructionReference: "ref3",
          lineIndex: 2,
          jobId: "test-note-id-instruction-2",
        })
      );
      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.CHECK_INSTRUCTION_COMPLETION,
        expect.objectContaining({
          noteId: "test-note-id",
          importId: "test-import-id",
          jobId: "test-note-id-instruction-completion-check",
        })
      );
    });

    it("should handle data without importId", async () => {
      const dataWithoutImportId = { ...mockData, importId: undefined };

      const result = await processInstructions(
        dataWithoutImportId,
        mockLogger,
        mockQueues
      );

      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        {
          noteId: "test-note-id",
          importId: undefined,
          instructionReference: "ref1",
          lineIndex: 0,
          jobId: "test-note-id-instruction-0",
        }
      );

      expect(result).toBe(dataWithoutImportId);
    });

    it("should return data when no instructions are present", async () => {
      const dataWithoutInstructions = {
        ...mockData,
        file: { ...mockData.file!, instructions: [] },
      };

      const result = await processInstructions(
        dataWithoutInstructions,
        mockLogger,
        mockQueues
      );

      expect(mockInstructionQueue.add).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] No instructions found for note: test-note-id"
      );
      expect(result).toBe(dataWithoutInstructions);
    });

    it("should return data when file is undefined", async () => {
      const dataWithoutFile = { ...mockData, file: undefined };

      const result = await processInstructions(
        dataWithoutFile,
        mockLogger,
        mockQueues
      );

      expect(mockInstructionQueue.add).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] No instructions found for note: test-note-id"
      );
      expect(result).toBe(dataWithoutFile);
    });

    it("should return data when file.instructions is undefined", async () => {
      const dataWithoutInstructions = {
        ...mockData,
        file: { ...mockData.file!, instructions: undefined },
      } as unknown as NotePipelineData;

      const result = await processInstructions(
        dataWithoutInstructions,
        mockLogger,
        mockQueues
      );

      expect(mockInstructionQueue.add).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] No instructions found for note: test-note-id"
      );
      expect(result).toBe(dataWithoutInstructions);
    });
  });

  describe("error handling", () => {
    it("should throw error when noteId is missing", async () => {
      const dataWithoutNoteId = { ...mockData, noteId: undefined };

      await expect(
        processInstructions(dataWithoutNoteId, mockLogger, mockQueues)
      ).rejects.toThrow("No note ID available for instruction processing");
    });

    it("should throw error when instruction queue is not available", async () => {
      const queuesWithoutInstructionQueue = {
        ...mockQueues,
        instructionQueue: undefined,
      };

      await expect(
        processInstructions(mockData, mockLogger, queuesWithoutInstructionQueue)
      ).rejects.toThrow("Instruction queue not available in dependencies");
    });

    it("should handle queue.add errors and re-throw them", async () => {
      const queueError = new Error("Queue error");
      (mockInstructionQueue.add as ReturnType<typeof vi.fn>).mockRejectedValue(
        queueError
      );

      await expect(
        processInstructions(mockData, mockLogger, mockQueues)
      ).rejects.toThrow("Queue error");

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] Failed to schedule instructions: Error: Queue error"
      );
    });

    it("should log error message when queue operation fails", async () => {
      const queueError = new Error("Queue operation failed");
      (mockInstructionQueue.add as ReturnType<typeof vi.fn>).mockRejectedValue(
        queueError
      );

      try {
        await processInstructions(mockData, mockLogger, mockQueues);
      } catch {
        // Expected to throw
      }

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[SCHEDULE_INSTRUCTIONS] Failed to schedule instructions: Error: Queue operation failed"
      );
    });
  });

  describe("edge cases", () => {
    it("should handle single instruction", async () => {
      const singleInstructionData = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            {
              reference: "Mix ingredients",
              lineIndex: 0,
              blockIndex: 0,
            },
          ],
        },
      };

      const result = await processInstructions(
        singleInstructionData,
        mockLogger,
        mockQueues
      );

      expect(result).toBe(singleInstructionData);
      expect(mockInstructionQueue.add).toHaveBeenCalledTimes(2); // 1 instruction job + 1 completion check job
      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        expect.objectContaining({
          noteId: "test-note-id",
          importId: "test-import-id",
          instructionReference: "Mix ingredients",
          lineIndex: 0,
          jobId: "test-note-id-instruction-0",
        })
      );
      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.CHECK_INSTRUCTION_COMPLETION,
        expect.objectContaining({
          noteId: "test-note-id",
          importId: "test-import-id",
          jobId: "test-note-id-instruction-completion-check",
        })
      );
    });

    it("should handle instructions with different line indices", async () => {
      const dataWithGaps = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            { reference: "ref1", lineIndex: 5 },
            { reference: "ref2", lineIndex: 10 },
            { reference: "ref3", lineIndex: 15 },
          ],
        },
      };

      await processInstructions(dataWithGaps, mockLogger, mockQueues);

      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        {
          noteId: "test-note-id",
          importId: "test-import-id",
          instructionReference: "ref1",
          lineIndex: 5,
          jobId: "test-note-id-instruction-5",
        }
      );
      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        {
          noteId: "test-note-id",
          importId: "test-import-id",
          instructionReference: "ref2",
          lineIndex: 10,
          jobId: "test-note-id-instruction-10",
        }
      );
      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        {
          noteId: "test-note-id",
          importId: "test-import-id",
          instructionReference: "ref3",
          lineIndex: 15,
          jobId: "test-note-id-instruction-15",
        }
      );
    });

    it("should handle instructions with different reference formats", async () => {
      const dataWithDifferentRefs = {
        ...mockData,
        file: {
          ...mockData.file!,
          instructions: [
            { reference: "step-1", lineIndex: 0 },
            { reference: "instruction-2", lineIndex: 1 },
            { reference: "directions-3", lineIndex: 2 },
          ],
        },
      };

      await processInstructions(dataWithDifferentRefs, mockLogger, mockQueues);

      expect(mockInstructionQueue.add).toHaveBeenCalledWith(
        ActionName.FORMAT_INSTRUCTION_LINE,
        {
          noteId: "test-note-id",
          importId: "test-import-id",
          instructionReference: "step-1",
          lineIndex: 0,
          jobId: "test-note-id-instruction-0",
        }
      );
    });
  });
});
