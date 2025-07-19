import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompletionStatusAction } from "../completion-status-action";
import { ActionContext } from "../../types";

// Create a concrete implementation for testing
class TestCompletionStatusAction extends CompletionStatusAction<{
  importId: string;
  noteId?: string;
  message: string;
  metadata: Record<string, unknown>;
}> {
  name = "test_completion_status";

  protected getCompletionMessage(data: { message: string }): string {
    return data.message;
  }

  protected getCompletionContext(): string {
    return "test_context";
  }

  protected getImportId(data: { importId: string }): string {
    return data.importId;
  }

  protected getNoteId(data: { noteId?: string }): string | undefined {
    return data.noteId;
  }

  protected getCompletionMetadata(data: {
    metadata: Record<string, unknown>;
  }): Record<string, unknown> {
    return data.metadata;
  }
}

describe("CompletionStatusAction", () => {
  let action: TestCompletionStatusAction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDeps: any;
  let mockContext: ActionContext;
  const mockData = {
    importId: "test-import-123",
    noteId: "test-note-456",
    message: "Test completion message",
    metadata: {
      processedItems: 5,
      success: true,
    },
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock dependencies
    mockDeps = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      ErrorHandler: {
        withErrorHandling: vi.fn(async (operation) => operation()),
      },
      logger: {
        log: vi.fn(),
      },
    };

    // Create mock context
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    action = new TestCompletionStatusAction();
  });

  describe("execute", () => {
    it("should execute completion status action successfully", async () => {
      const result = await action.execute(mockData, mockDeps, mockContext);

      // Should return the input data unchanged
      expect(result).toEqual(mockData);

      // Should call addStatusEventAndBroadcast with correct parameters
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: mockData.importId,
        noteId: mockData.noteId,
        status: "COMPLETED",
        message: mockData.message,
        context: "test_context",
        indentLevel: 0,
        metadata: mockData.metadata,
      });
    });

    it("should handle undefined noteId", async () => {
      const dataWithoutNoteId = {
        ...mockData,
        noteId: undefined,
      };

      const result = await action.execute(
        dataWithoutNoteId,
        mockDeps,
        mockContext
      );

      expect(result).toEqual(dataWithoutNoteId);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: mockData.importId,
        noteId: undefined,
        status: "COMPLETED",
        message: mockData.message,
        context: "test_context",
        indentLevel: 0,
        metadata: mockData.metadata,
      });
    });

    it("should handle empty metadata", async () => {
      const dataWithEmptyMetadata = {
        ...mockData,
        metadata: {},
      };

      const result = await action.execute(
        dataWithEmptyMetadata,
        mockDeps,
        mockContext
      );

      expect(result).toEqual(dataWithEmptyMetadata);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: mockData.importId,
        noteId: mockData.noteId,
        status: "COMPLETED",
        message: mockData.message,
        context: "test_context",
        indentLevel: 0,
        metadata: {},
      });
    });

    it("should handle complex metadata", async () => {
      const complexMetadata = {
        processedItems: 10,
        failedItems: 2,
        successRate: 0.8,
        processingTime: 1500,
        errors: ["Error 1", "Error 2"],
        warnings: ["Warning 1"],
      };

      const dataWithComplexMetadata = {
        ...mockData,
        metadata: complexMetadata,
      };

      const result = await action.execute(
        dataWithComplexMetadata,
        mockDeps,
        mockContext
      );

      expect(result).toEqual(dataWithComplexMetadata);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: mockData.importId,
        noteId: mockData.noteId,
        status: "COMPLETED",
        message: mockData.message,
        context: "test_context",
        indentLevel: 0,
        metadata: complexMetadata,
      });
    });

    it("should throw broadcast errors", async () => {
      const broadcastError = new Error("Broadcast failed");
      mockDeps.addStatusEventAndBroadcast.mockRejectedValue(broadcastError);

      // Should throw the broadcast error
      await expect(
        action.execute(mockData, mockDeps, mockContext)
      ).rejects.toThrow("Broadcast failed");
      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalled();
    });
  });

  describe("action properties", () => {
    it("should have correct name", () => {
      expect(action.name).toBe("test_completion_status");
    });

    it("should be retryable by default", () => {
      expect(action.retryable).toBe(true);
    });

    it("should have default priority", () => {
      expect(action.priority).toBe(0);
    });
  });

  describe("abstract method implementations", () => {
    it("should implement getCompletionMessage", () => {
      const testData = { message: "Custom message" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (action as any).getCompletionMessage(testData);
      expect(message).toBe("Custom message");
    });

    it("should implement getCompletionContext", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const context = (action as any).getCompletionContext();
      expect(context).toBe("test_context");
    });

    it("should implement getImportId", () => {
      const testData = { importId: "custom-import-123" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const importId = (action as any).getImportId(testData);
      expect(importId).toBe("custom-import-123");
    });

    it("should implement getNoteId", () => {
      const testData = { noteId: "custom-note-456" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const noteId = (action as any).getNoteId(testData);
      expect(noteId).toBe("custom-note-456");
    });

    it("should implement getCompletionMetadata", () => {
      const testData = { metadata: { custom: "data" } };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = (action as any).getCompletionMetadata(testData);
      expect(metadata).toEqual({ custom: "data" });
    });
  });

  describe("error handling", () => {
    it("should handle errors in abstract method implementations", async () => {
      // Create an action that throws errors in its abstract methods
      class ErrorThrowingAction extends CompletionStatusAction<{
        error: string;
      }> {
        name = "error_throwing_action";

        protected getCompletionMessage(): string {
          throw new Error("Message error");
        }

        protected getCompletionContext(): string {
          return "error_context";
        }

        protected getImportId(): string {
          return "error-import";
        }

        protected getNoteId(): string | undefined {
          return undefined;
        }

        protected getCompletionMetadata(): Record<string, unknown> {
          return {};
        }
      }

      const errorAction = new ErrorThrowingAction();
      const testData = { error: "test" };

      await expect(
        errorAction.execute(testData, mockDeps, mockContext)
      ).rejects.toThrow("Message error");
    });
  });

  describe("integration with BaseAction", () => {
    it("should work with executeWithTiming", async () => {
      // Add a small delay to ensure duration > 0
      mockDeps.addStatusEventAndBroadcast.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
      });

      const result = await action.executeWithTiming(
        mockData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should handle timing errors", async () => {
      // Create an action that throws an error
      class ErrorAction extends CompletionStatusAction<{ error: string }> {
        name = "error_action";

        protected getCompletionMessage(): string {
          throw new Error("Test error");
        }

        protected getCompletionContext(): string {
          return "error_context";
        }

        protected getImportId(): string {
          return "error-import";
        }

        protected getNoteId(): string | undefined {
          return undefined;
        }

        protected getCompletionMetadata(): Record<string, unknown> {
          return {};
        }
      }

      const errorAction = new ErrorAction();
      const testData = { error: "test" };

      const result = await errorAction.executeWithTiming(
        testData,
        mockDeps,
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Test error");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
