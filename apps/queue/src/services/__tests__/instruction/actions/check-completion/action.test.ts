import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import { BaseAction } from "../../../../../workers/core/base-action";
import { ActionContext } from "../../../../../workers/core/types";
import type {
  InstructionJobData,
  InstructionWorkerDependencies,
} from "../../../../../workers/instruction/dependencies";
import { CheckInstructionCompletionAction } from "../../../../instruction/actions/check-completion/action";

// Mock the markWorkerCompleted function
vi.mock("../../../../note/actions/track-completion/service", () => ({
  markWorkerCompleted: vi.fn(),
}));

// Mock the database function
vi.mock("@peas/database", () => ({
  getInstructionCompletionStatus: vi.fn(),
}));

describe("CheckInstructionCompletionAction", () => {
  let action: CheckInstructionCompletionAction;
  let mockDependencies: InstructionWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: InstructionJobData;
  let mockMarkWorkerCompleted: ReturnType<typeof vi.fn>;
  let mockGetInstructionCompletionStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    action = new CheckInstructionCompletionAction();

    mockDependencies = {
      logger: {
        log: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
      services: {
        formatInstruction: vi.fn() as ReturnType<typeof vi.fn>,
        saveInstruction: vi.fn() as ReturnType<typeof vi.fn>,
      },
    };

    mockContext = {
      jobId: "test-job-id",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    mockData = {
      noteId: "test-note-id",
      instructionReference: "Test instruction",
      lineIndex: 0,
      parseStatus: "COMPLETED_SUCCESSFULLY" as const,
      isActive: true,
    };

    // Get the mocked functions
    const { markWorkerCompleted } = await import(
      "../../../../note/actions/track-completion/service"
    );
    const { getInstructionCompletionStatus } = await import("@peas/database");
    
    mockMarkWorkerCompleted = vi.mocked(markWorkerCompleted);
    mockGetInstructionCompletionStatus = vi.mocked(getInstructionCompletionStatus);
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.CHECK_INSTRUCTION_COMPLETION);
    });
  });

  describe("execute", () => {
    it("should mark worker as completed when all instructions are completed", async () => {
      // Mock that all instructions are completed
      mockGetInstructionCompletionStatus.mockResolvedValue({
        completedInstructions: 7,
        totalInstructions: 7,
        progress: "7/7",
        isComplete: true,
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockGetInstructionCompletionStatus).toHaveBeenCalledWith("test-note-id");
      expect(mockMarkWorkerCompleted).toHaveBeenCalledWith(
        "test-note-id",
        "instruction",
        mockDependencies.logger,
        mockDependencies.statusBroadcaster
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] Completion status for note test-note-id: 7/7"
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] All instructions completed for note test-note-id, marked instruction worker as completed"
      );

      expect(result).toBe(mockData);
    });

    it("should not mark worker as completed when not all instructions are completed", async () => {
      // Mock that not all instructions are completed
      mockGetInstructionCompletionStatus.mockResolvedValue({
        completedInstructions: 4,
        totalInstructions: 7,
        progress: "4/7",
        isComplete: false,
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockGetInstructionCompletionStatus).toHaveBeenCalledWith("test-note-id");
      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] Completion status for note test-note-id: 4/7"
      );
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] Not all instructions completed yet for note test-note-id, skipping worker completion"
      );

      expect(result).toBe(mockData);
    });

    it("should skip completion check when noteId is missing", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithoutNoteId = { ...mockData, noteId: undefined as any };

      const result = await action.execute(
        dataWithoutNoteId,
        mockDependencies,
        mockContext
      );

      expect(mockGetInstructionCompletionStatus).not.toHaveBeenCalled();
      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] No note ID available, skipping completion check"
      );

      expect(result).toBe(dataWithoutNoteId);
    });

    it("should skip completion check when noteId is empty string", async () => {
      const dataWithEmptyNoteId = { ...mockData, noteId: "" };

      const result = await action.execute(
        dataWithEmptyNoteId,
        mockDependencies,
        mockContext
      );

      expect(mockGetInstructionCompletionStatus).not.toHaveBeenCalled();
      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] No note ID available, skipping completion check"
      );

      expect(result).toBe(dataWithEmptyNoteId);
    });

    it("should handle null noteId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithNullNoteId = { ...mockData, noteId: null as any };

      const result = await action.execute(
        dataWithNullNoteId,
        mockDependencies,
        mockContext
      );

      expect(mockGetInstructionCompletionStatus).not.toHaveBeenCalled();
      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] No note ID available, skipping completion check"
      );

      expect(result).toBe(dataWithNullNoteId);
    });

    it("should handle undefined noteId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithUndefinedNoteId = { ...mockData, noteId: undefined as any };

      const result = await action.execute(
        dataWithUndefinedNoteId,
        mockDependencies,
        mockContext
      );

      expect(mockGetInstructionCompletionStatus).not.toHaveBeenCalled();
      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] No note ID available, skipping completion check"
      );

      expect(result).toBe(dataWithUndefinedNoteId);
    });

    it("should handle errors from getInstructionCompletionStatus gracefully", async () => {
      const error = new Error("Database connection failed");
      mockGetInstructionCompletionStatus.mockRejectedValue(error);

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] Error checking completion: Error: Database connection failed"
      );

      expect(result).toBe(mockData);
    });

    it("should handle non-Error exceptions from getInstructionCompletionStatus", async () => {
      mockGetInstructionCompletionStatus.mockRejectedValue("String error");

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] Error checking completion: String error"
      );

      expect(result).toBe(mockData);
    });
  });

  describe("inheritance", () => {
    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(BaseAction);
    });

    it("should have correct generic types", () => {
      expect(action).toBeInstanceOf(CheckInstructionCompletionAction);
    });
  });
});
