import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompletionStatusAction } from "../../completion-status-action";
import { ActionContext } from "../../../types";

describe("CompletionStatusAction - error handling", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDeps: any;
  let mockContext: ActionContext;

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
  });

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
