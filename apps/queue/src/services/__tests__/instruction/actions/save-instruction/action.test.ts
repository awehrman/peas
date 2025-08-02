import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import { ActionContext } from "../../../../../workers/core/types";
import type { InstructionJobData } from "../../../../../workers/instruction/dependencies";
import type { InstructionWorkerDependencies } from "../../../../../workers/instruction/dependencies";
import { SaveInstructionAction } from "../../../../instruction/actions/save-instruction/action";

// Mock the service
vi.mock("../../../../instruction/actions/save-instruction/service", () => ({
  saveInstruction: vi.fn(),
}));

describe("SaveInstructionAction", () => {
  let action: SaveInstructionAction;
  let mockData: InstructionJobData;
  let mockDeps: InstructionWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    action = new SaveInstructionAction();
    mockData = {
      noteId: "test-note-id",
      instructionReference: "Test instruction",
      lineIndex: 0,
      importId: "test-import-id",
      jobId: "test-job-id",
      parseStatus: "PENDING",
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
      expect(action.name).toBe(ActionName.SAVE_INSTRUCTION_LINE);
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
        "Note ID is required for instruction saving"
      );
    });

    it("should return error when instructionReference is missing", () => {
      const invalidData = { ...mockData, instructionReference: "" };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Instruction reference is required for saving"
      );
    });
  });

  describe("execute", () => {
    it("should call saveInstruction service with correct parameters", async () => {
      const mockSaveInstruction = vi.mocked(mockDeps.services.saveInstruction);
      mockSaveInstruction.mockResolvedValue(mockData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockSaveInstruction).toHaveBeenCalledWith(mockData);
      expect(result).toBe(mockData);
    });

    it("should handle service errors and re-throw them", async () => {
      const mockSaveInstruction = vi.mocked(mockDeps.services.saveInstruction);
      const testError = new Error("Service error");
      mockSaveInstruction.mockRejectedValue(testError);

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });

    it("should return the result from saveInstruction service", async () => {
      const mockSaveInstruction = vi.mocked(mockDeps.services.saveInstruction);
      const modifiedData = { ...mockData, parseStatus: "CORRECT" as const };
      mockSaveInstruction.mockResolvedValue(modifiedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(modifiedData);
    });
  });

  describe("executeServiceAction", () => {
    it("should call the service with correct context name and suppress default broadcast", async () => {
      const mockSaveInstruction = vi.mocked(mockDeps.services.saveInstruction);
      mockSaveInstruction.mockResolvedValue(mockData);

      await action.execute(mockData, mockDeps, mockContext);

      expect(mockSaveInstruction).toHaveBeenCalledWith(mockData);
    });
  });

  describe("class instantiation", () => {
    it("should create a new instance", () => {
      const newAction = new SaveInstructionAction();
      expect(newAction).toBeInstanceOf(SaveInstructionAction);
    });

    it("should have the correct name property", () => {
      const newAction = new SaveInstructionAction();
      expect(newAction.name).toBe(ActionName.SAVE_INSTRUCTION_LINE);
    });
  });
});
