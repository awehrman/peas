import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompletionStatusAction } from "../../completion-status-action";
import { ActionContext } from "../../../types";

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

describe("CompletionStatusAction - integration with BaseAction", () => {
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
