import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotePipelineData } from "../../../../../types/notes";
import type { NoteWorkerDependencies } from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import { CheckDuplicatesAction } from "../../../../note/actions/check-duplicates/action";

// Mock the service
vi.mock("../../../../note/actions/check-duplicates/service", () => ({
  checkForDuplicates: vi.fn(),
}));

describe("CheckDuplicatesAction", () => {
  let action: CheckDuplicatesAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    action = new CheckDuplicatesAction();
    mockData = {
      noteId: "test-note-id",
      content: "<html>test</html>",
      file: {
        title: "Test Recipe",
        contents: "<html>test</html>",
        ingredients: [],
        instructions: [],
      },
    };
    mockDeps = {
      logger: {
        log: vi.fn(),
      },
      queues: {
        noteQueue: undefined,
        imageQueue: undefined,
        ingredientQueue: undefined,
        instructionQueue: undefined,
        categorizationQueue: undefined,
        sourceQueue: undefined,
      },
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
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
  });

  describe("validateInput", () => {
    it("should return null for valid data", () => {
      const result = action.validateInput(mockData);
      expect(result).toBeNull();
    });

    it("should return error for missing noteId", () => {
      const invalidData = { ...mockData, noteId: undefined };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for duplicate checking"
      );
    });

    it("should return error for null noteId", () => {
      const invalidData = {
        ...mockData,
        noteId: null as unknown as string | undefined,
      };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for duplicate checking"
      );
    });
  });

  describe("execute", () => {
    it("should call executeServiceAction with correct parameters", async () => {
      // Mock the service call
      const { checkForDuplicates } = await import(
        "../../../../note/actions/check-duplicates/service"
      );
      vi.mocked(checkForDuplicates).mockResolvedValue({
        data: mockData,
        hasDuplicates: false,
      });

      await action.execute(mockData, mockDeps, mockContext);

      expect(checkForDuplicates).toHaveBeenCalledWith(
        mockData,
        mockDeps.logger
      );
    });

    it("should throw validation error for invalid data", async () => {
      const invalidData = { ...mockData, noteId: undefined };

      await expect(
        action.execute(invalidData, mockDeps, mockContext)
      ).rejects.toThrow("Note ID is required for duplicate checking");
    });

    it("should broadcast status events when statusBroadcaster is available", async () => {
      // Mock the service call
      const { checkForDuplicates } = await import(
        "../../../../note/actions/check-duplicates/service"
      );
      vi.mocked(checkForDuplicates).mockResolvedValue({
        data: mockData,
        hasDuplicates: true,
      });

      // Add statusBroadcaster to mockDeps
      const mockDepsWithBroadcaster = {
        ...mockDeps,
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        },
      };

      await action.execute(mockData, mockDepsWithBroadcaster, mockContext);

      // Verify status events were broadcast
      expect(
        mockDepsWithBroadcaster.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(2);

      // Check start event
      expect(
        mockDepsWithBroadcaster.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(1, {
        importId: mockData.importId,
        status: "PROCESSING",
        message: "Checking for duplicate notes...",
        context: "CHECK_DUPLICATES",
        noteId: mockData.noteId,
      });

      // Check completion event with duplicate message (now includes duplicateCount metadata)
      expect(
        mockDepsWithBroadcaster.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: mockData.importId,
        status: "COMPLETED",
        message: "Duplicate note identified!",
        context: "CHECK_DUPLICATES",
        noteId: mockData.noteId,
        metadata: { duplicateCount: 1 },
      });
    });

    it("should broadcast no duplicates message when no duplicates found", async () => {
      // Mock the service call
      const { checkForDuplicates } = await import(
        "../../../../note/actions/check-duplicates/service"
      );
      vi.mocked(checkForDuplicates).mockResolvedValue({
        data: mockData,
        hasDuplicates: false,
      });

      // Add statusBroadcaster to mockDeps
      const mockDepsWithBroadcaster = {
        ...mockDeps,
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
        },
      };

      await action.execute(mockData, mockDepsWithBroadcaster, mockContext);

      // Check completion event with no duplicates message (now includes duplicateCount metadata)
      expect(
        mockDepsWithBroadcaster.statusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: mockData.importId,
        status: "COMPLETED",
        message: "Verified no duplicates!",
        context: "CHECK_DUPLICATES",
        noteId: mockData.noteId,
        metadata: { duplicateCount: 0 },
      });
    });
  });

  describe("name", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe("check_duplicates");
    });
  });
});
