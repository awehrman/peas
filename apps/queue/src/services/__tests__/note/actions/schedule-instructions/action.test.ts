import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import type { NotePipelineData } from "../../../../../types/notes";
import { ScheduleInstructionsAction } from "../../../../note/actions/schedule-instructions/action";
import { processInstructions } from "../../../../note/actions/schedule-instructions/service";

// Mock the service
vi.mock("../../../../note/actions/schedule-instructions/service", () => ({
  processInstructions: vi.fn(),
}));

describe("ScheduleInstructionsAction", () => {
  let action: ScheduleInstructionsAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: {
    jobId: string;
    operation: string;
    startTime: number;
    retryCount: number;
    queueName: string;
    workerName: string;
    attemptNumber: number;
  };

  beforeEach(() => {
    action = new ScheduleInstructionsAction();
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
        ],
      },
    };
    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      queues: {
        instructionQueue: {
          add: vi.fn(),
        } as unknown as NonNullable<
          NoteWorkerDependencies["queues"]
        >["instructionQueue"],
      },
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn(),
      } as unknown as NonNullable<NoteWorkerDependencies["statusBroadcaster"]>,
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
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
      expect(action.name).toBe(ActionName.SCHEDULE_INSTRUCTION_LINES);
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data with noteId", () => {
      const result = action.validateInput(mockData);
      expect(result).toBeNull();
    });

    it("should return error when noteId is missing", () => {
      const invalidData = { ...mockData, noteId: undefined };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for scheduling instructions"
      );
    });

    it("should return error when noteId is empty string", () => {
      const invalidData = { ...mockData, noteId: "" };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for scheduling instructions"
      );
    });
  });

  describe("execute", () => {
    it("should call processInstructions with correct parameters", async () => {
      const mockProcessInstructions = vi.mocked(processInstructions);
      mockProcessInstructions.mockResolvedValue(mockData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(mockProcessInstructions).toHaveBeenCalledWith(
        mockData,
        mockDeps.logger,
        mockDeps.queues
      );
      expect(result).toBe(mockData);
    });

    it("should handle service errors and re-throw them", async () => {
      const mockProcessInstructions = vi.mocked(processInstructions);
      const testError = new Error("Service error");
      mockProcessInstructions.mockRejectedValue(testError);

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });

    it("should return the result from processInstructions", async () => {
      const mockProcessInstructions = vi.mocked(processInstructions);
      const modifiedData = { ...mockData, someAdditionalProperty: "value" };
      mockProcessInstructions.mockResolvedValue(modifiedData);

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(modifiedData);
    });
  });

  describe("executeServiceAction", () => {
    it("should call the service with correct context name", async () => {
      const mockProcessInstructions = vi.mocked(processInstructions);
      mockProcessInstructions.mockResolvedValue(mockData);

      await action.execute(mockData, mockDeps, mockContext);

      expect(mockProcessInstructions).toHaveBeenCalledWith(
        mockData,
        mockDeps.logger,
        mockDeps.queues
      );
    });
  });

  describe("class instantiation", () => {
    it("should create a new instance", () => {
      expect(action).toBeInstanceOf(ScheduleInstructionsAction);
    });

    it("should have the correct name property", () => {
      expect(action.name).toBe(ActionName.SCHEDULE_INSTRUCTION_LINES);
    });
  });
});
