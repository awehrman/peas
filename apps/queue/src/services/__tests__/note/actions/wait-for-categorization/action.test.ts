import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import type { StructuredLogger } from "../../../../../types";
import { WaitForCategorizationAction } from "../../../../note/actions/wait-for-categorization/action";

// Mock dependencies
vi.mock("../../../../note/actions/wait-for-categorization/service", () => ({
  waitForCategorization: vi.fn(),
}));

describe("WaitForCategorizationAction", () => {
  let action: WaitForCategorizationAction;
  let mockData: NotePipelineData;
  let mockDeps: NoteWorkerDependencies;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    action = new WaitForCategorizationAction();

    mockData = {
      content: "test content",
      noteId: "test-note-id",
      importId: "test-import-id",
    };

    mockDeps = {
      logger: {
        log: vi.fn(),
      } as unknown as StructuredLogger,
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
      } as unknown as { addStatusEventAndBroadcast: (event: Record<string, unknown>) => Promise<Record<string, unknown>> },
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
    };

    mockContext = {
      jobId: "test-job-id",
      operation: "wait_for_categorization",
      retryCount: 0,
      queueName: "test-queue",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("name", () => {
    it("should return WAIT_FOR_CATEGORIZATION", () => {
      expect(action.name).toBe("wait_for_categorization");
    });
  });

  it("should validate input correctly", () => {
    // Arrange
    const action = new WaitForCategorizationAction();
    const validData = {
      noteId: "test-note-123",
      importId: "test-import-456",
    } as NotePipelineData;

    // Act
    const result = action.validateInput(validData);

    // Assert
    expect(result).toBeNull();
  });

  it("should handle validation with missing noteId", () => {
    // Arrange
    const action = new WaitForCategorizationAction();
    const dataWithoutNoteId = {
      importId: "test-import-456",
    } as NotePipelineData;

    // Act
    const result = action.validateInput(dataWithoutNoteId);

    // Assert
    expect(result).toBeNull(); // noteId is optional for this action
  });

  describe("execute", () => {
    it("should execute wait for categorization successfully with success result", async () => {
      const { waitForCategorization } = await import(
        "../../../../note/actions/wait-for-categorization/service"
      );
      vi.mocked(waitForCategorization).mockResolvedValue({
        success: true,
        categorizationScheduled: true,
        retryCount: 1,
        maxRetries: 30,
        hasCategorization: true,
        hasTags: true,
        categoriesCount: 2,
        tagsCount: 3,
      });

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(waitForCategorization).toHaveBeenCalledWith(
        "test-note-id",
        "test-import-id",
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(2);

      // Check start message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(1, {
        importId: "test-import-id",
        status: "PROCESSING",
        message: "Waiting for categorization to complete...",
        context: "wait_for_categorization",
        noteId: "test-note-id",
        indentLevel: 1,
      });

      // Check completion message for success
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "COMPLETED",
        message: "Categorization completed (2 categories, 3 tags)",
        context: "wait_for_categorization_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          success: true,
          categorizationScheduled: true,
          retryCount: 1,
          hasCategorization: true,
          hasTags: true,
          categoriesCount: 2,
          tagsCount: 3,
        },
      });
    });

    it("should execute wait for categorization with timeout result", async () => {
      const { waitForCategorization } = await import(
        "../../../../note/actions/wait-for-categorization/service"
      );
      vi.mocked(waitForCategorization).mockResolvedValue({
        success: false,
        categorizationScheduled: true,
        retryCount: 30,
        maxRetries: 30,
        hasCategorization: false,
        hasTags: false,
        categoriesCount: 0,
        tagsCount: 0,
      });

      const result = await action.execute(mockData, mockDeps, mockContext);

      expect(result).toBe(mockData);
      expect(waitForCategorization).toHaveBeenCalledWith(
        "test-note-id",
        "test-import-id",
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );

      // Check completion message for timeout
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenNthCalledWith(2, {
        importId: "test-import-id",
        status: "FAILED",
        message: "Categorization timeout - continuing anyway",
        context: "wait_for_categorization_complete",
        noteId: "test-note-id",
        indentLevel: 1,
        metadata: {
          success: false,
          categorizationScheduled: true,
          retryCount: 30,
          hasCategorization: false,
          hasTags: false,
          categoriesCount: 0,
          tagsCount: 0,
        },
      });
    });

    it("should handle missing status broadcaster", async () => {
      const depsWithoutBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      const { waitForCategorization } = await import(
        "../../../../note/actions/wait-for-categorization/service"
      );
      vi.mocked(waitForCategorization).mockResolvedValue({
        success: true,
        categorizationScheduled: true,
        retryCount: 1,
        maxRetries: 30,
        hasCategorization: true,
        hasTags: false,
        categoriesCount: 1,
        tagsCount: 0,
      });

      const result = await action.execute(
        mockData,
        depsWithoutBroadcaster,
        mockContext
      );

      expect(result).toBe(mockData);
      expect(waitForCategorization).toHaveBeenCalledWith(
        "test-note-id",
        "test-import-id",
        mockDeps.logger,
        undefined
      );
    });

    it("should handle missing noteId gracefully", async () => {
      const dataWithoutNoteId = { ...mockData, noteId: undefined };
      const { waitForCategorization } = await import(
        "../../../../note/actions/wait-for-categorization/service"
      );
      vi.mocked(waitForCategorization).mockResolvedValue({
        success: false,
        categorizationScheduled: false,
        retryCount: 0,
        maxRetries: 30,
        hasCategorization: false,
        hasTags: false,
        categoriesCount: 0,
        tagsCount: 0,
      });

      const result = await action.execute(
        dataWithoutNoteId,
        mockDeps,
        mockContext
      );

      expect(result).toBe(dataWithoutNoteId);
      expect(waitForCategorization).toHaveBeenCalledWith(
        "",
        "test-import-id",
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
    });

    it("should handle missing importId gracefully", async () => {
      const dataWithoutImportId = { ...mockData, importId: undefined };
      const { waitForCategorization } = await import(
        "../../../../note/actions/wait-for-categorization/service"
      );
      vi.mocked(waitForCategorization).mockResolvedValue({
        success: true,
        categorizationScheduled: true,
        retryCount: 1,
        maxRetries: 30,
        hasCategorization: true,
        hasTags: true,
        categoriesCount: 1,
        tagsCount: 1,
      });

      const result = await action.execute(
        dataWithoutImportId,
        mockDeps,
        mockContext
      );

      expect(result).toBe(dataWithoutImportId);
      expect(waitForCategorization).toHaveBeenCalledWith(
        "test-note-id",
        "",
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
    });

    it("should handle service errors gracefully", async () => {
      const { waitForCategorization } = await import(
        "../../../../note/actions/wait-for-categorization/service"
      );
      vi.mocked(waitForCategorization).mockRejectedValue(
        new Error("Service error")
      );

      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Service error");
    });
  });
});
