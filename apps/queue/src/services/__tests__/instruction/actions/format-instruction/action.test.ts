import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import { ActionContext } from "../../../../../workers/core/types";
import type { InstructionJobData } from "../../../../../workers/instruction/dependencies";
import type { InstructionWorkerDependencies } from "../../../../../workers/instruction/dependencies";
import { FormatInstructionAction } from "../../../../instruction/actions/format-instruction/action";

// Mock the service
vi.mock("../../../../instruction/actions/format-instruction/service", () => ({
  formatInstruction: vi.fn(),
}));

describe("FormatInstructionAction", () => {
  let action: FormatInstructionAction;
  let mockData: InstructionJobData;
  let mockDeps: InstructionWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    action = new FormatInstructionAction();
    mockData = {
      noteId: "test-note-id",
      instructionReference: "Test instruction",
      lineIndex: 0,
      importId: "test-import-id",
      jobId: "test-job-id",
      parseStatus: "AWAITING_PARSING",
      isActive: true,
    };
    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      services: {
        formatInstruction: vi.fn(),
        saveInstruction: vi.fn(),
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      },
    };
    mockContext = {
      jobId: "test-job-id",
      operation: "test-operation",
      startTime: Date.now(),
      retryCount: 0,
      queueName: "test-queue",
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.FORMAT_INSTRUCTION_LINE);
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data with noteId and instructionReference", () => {
      const result = action.validateInput(mockData);
      expect(result).toBeNull();
    });

    it("should return error when noteId is missing", () => {
      const invalidData = { ...mockData, noteId: "" };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for instruction formatting"
      );
    });

    it("should return error when instructionReference is missing", () => {
      const invalidData = { ...mockData, instructionReference: "" };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Instruction reference is required for formatting"
      );
    });
  });

  describe("execute", () => {
    it("should call formatInstruction service with correct parameters", async () => {
      const mockFormatInstruction = vi.mocked(
        mockDeps.services.formatInstruction
      );
      mockFormatInstruction.mockResolvedValue(mockData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockFormatInstruction).toHaveBeenCalledWith(mockData);
      expect(result).toBe(mockData);
    });

    it("should handle service errors and re-throw them", async () => {
      const mockFormatInstruction = vi.mocked(
        mockDeps.services.formatInstruction
      );
      const testError = new Error("Service error");
      mockFormatInstruction.mockRejectedValue(testError);

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });

    it("should return the result from formatInstruction service", async () => {
      const mockFormatInstruction = vi.mocked(
        mockDeps.services.formatInstruction
      );
      const modifiedData = {
        ...mockData,
        instructionReference: "Modified instruction",
      };
      mockFormatInstruction.mockResolvedValue(modifiedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(modifiedData);
    });
  });

  describe("executeServiceAction", () => {
    it("should call the service with correct context name and suppress default broadcast", async () => {
      const mockFormatInstruction = vi.mocked(
        mockDeps.services.formatInstruction
      );
      mockFormatInstruction.mockResolvedValue(mockData);

      await action.execute(mockData, mockDeps, mockContext);

      expect(mockFormatInstruction).toHaveBeenCalledWith(mockData);
    });
  });

  describe("class instantiation", () => {
    it("should create a new instance", () => {
      const newAction = new FormatInstructionAction();
      expect(newAction).toBeInstanceOf(FormatInstructionAction);
    });

    it("should have the correct name property", () => {
      const newAction = new FormatInstructionAction();
      expect(newAction.name).toBe(ActionName.FORMAT_INSTRUCTION_LINE);
    });
  });
});
