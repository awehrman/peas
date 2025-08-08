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

describe("CheckInstructionCompletionAction", () => {
  let action: CheckInstructionCompletionAction;
  let mockDependencies: InstructionWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: InstructionJobData;
  let mockMarkWorkerCompleted: ReturnType<typeof vi.fn>;

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
      instructionReference: "Mix flour and water",
      lineIndex: 0,
      parseStatus: "COMPLETED_SUCCESSFULLY" as const,
      isActive: true,
      importId: "test-import-id",
    };

    // Get the mocked markWorkerCompleted function
    const { markWorkerCompleted } = await import(
      "../../../../note/actions/track-completion/service"
    );
    mockMarkWorkerCompleted = vi.mocked(markWorkerCompleted);
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.CHECK_INSTRUCTION_COMPLETION);
    });
  });

  describe("execute", () => {
    it("should mark worker as completed when noteId is provided", async () => {
      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockMarkWorkerCompleted).toHaveBeenCalledWith(
        "test-note-id",
        "instruction",
        mockDependencies.logger,
        mockDependencies.statusBroadcaster
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] Marked instruction worker as completed for note test-note-id"
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

      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] No note ID available, skipping completion check"
      );

      expect(result).toBe(dataWithEmptyNoteId);
    });

    it("should handle errors from markWorkerCompleted gracefully", async () => {
      const error = new Error("Database connection failed");
      mockMarkWorkerCompleted.mockImplementation(() => {
        throw error;
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] Error marking completion: Error: Database connection failed"
      );

      expect(result).toBe(mockData);
    });

    it("should handle non-Error exceptions from markWorkerCompleted", async () => {
      mockMarkWorkerCompleted.mockImplementation(() => {
        throw "String error";
      });

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] Error marking completion: String error"
      );

      expect(result).toBe(mockData);
    });

    it("should handle null noteId", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithNullNoteId = { ...mockData, noteId: null as any };

      const result = await action.execute(
        dataWithNullNoteId,
        mockDependencies,
        mockContext
      );

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

      expect(mockMarkWorkerCompleted).not.toHaveBeenCalled();
      expect(mockDependencies.logger.log).toHaveBeenCalledWith(
        "[CHECK_INSTRUCTION_COMPLETION] No note ID available, skipping completion check"
      );

      expect(result).toBe(dataWithUndefinedNoteId);
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
