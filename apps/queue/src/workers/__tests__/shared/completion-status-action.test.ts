import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName, type BaseJobData } from "../../../types";
import { ActionContext } from "../../core/types";
import {
  CompletionStatusAction,
  type StatusBroadcasterDeps,
} from "../../shared/completion-status-action";

// Create a concrete implementation for testing
class TestCompletionStatusAction extends CompletionStatusAction<
  BaseJobData,
  StatusBroadcasterDeps
> {
  name = ActionName.COMPLETION_STATUS;

  protected getCompletionMessage(data: BaseJobData): string {
    return `Test completion for job ${data.jobId}`;
  }

  protected getCompletionContext(): string {
    return "test-context";
  }

  protected getImportId(data: BaseJobData): string {
    return data.importId || "default-import-id";
  }

  protected getNoteId(data: BaseJobData): string | undefined {
    return data.noteId;
  }

  protected getCompletionMetadata(data: BaseJobData): Record<string, unknown> {
    return {
      jobId: data.jobId,
      customField: "test-value",
      ...data.metadata,
    };
  }
}

// Create another implementation with different behavior for edge case testing
class EdgeCaseCompletionStatusAction extends CompletionStatusAction<
  BaseJobData,
  StatusBroadcasterDeps
> {
  name = ActionName.COMPLETION_STATUS;

  protected getCompletionMessage(data: BaseJobData): string {
    return (data.metadata?.message as string) || "Default message";
  }

  protected getCompletionContext(): string {
    return "edge-case-context";
  }

  protected getImportId(data: BaseJobData): string {
    if (!data.importId) {
      throw new Error("Import ID is required");
    }
    return data.importId;
  }

  protected getNoteId(data: BaseJobData): string | undefined {
    return data.noteId || undefined;
  }

  protected getCompletionMetadata(data: BaseJobData): Record<string, unknown> {
    return {
      hasNoteId: !!data.noteId,
      hasImportId: !!data.importId,
      metadataKeys: Object.keys(data.metadata || {}),
    };
  }
}

describe("CompletionStatusAction", () => {
  let mockDeps: StatusBroadcasterDeps;
  let mockContext: ActionContext;
  let testData: BaseJobData;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeps = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    };

    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      noteId: "test-note-456",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    testData = {
      jobId: "test-job-123",
      noteId: "test-note-456",
      importId: "test-import-789",
      userId: "test-user-123",
      metadata: {
        source: "test-source",
        priority: "high",
      },
    };
  });

  describe("TestCompletionStatusAction", () => {
    let action: TestCompletionStatusAction;

    beforeEach(() => {
      action = new TestCompletionStatusAction();
    });

    describe("basic functionality", () => {
      it("should have correct action name", () => {
        expect(action.name).toBe(ActionName.COMPLETION_STATUS);
      });

      it("should execute successfully and return input data", async () => {
        const result = await action.execute(testData, mockDeps, mockContext);

        expect(result).toBe(testData);
        expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(1);
      });

      it("should call addStatusEventAndBroadcast with correct parameters", async () => {
        await action.execute(testData, mockDeps, mockContext);

        expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledWith({
          importId: "test-import-789",
          noteId: "test-note-456",
          status: "COMPLETED",
          message: "Test completion for job test-job-123",
          context: "test-context",
          indentLevel: 0,
          metadata: {
            jobId: "test-job-123",
            customField: "test-value",
            source: "test-source",
            priority: "high",
          },
        });
      });
    });

    describe("abstract method implementations", () => {
      it("should implement getCompletionMessage correctly", async () => {
        await action.execute(testData, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.message).toBe("Test completion for job test-job-123");
      });

      it("should implement getCompletionContext correctly", async () => {
        await action.execute(testData, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.context).toBe("test-context");
      });

      it("should implement getImportId correctly", async () => {
        await action.execute(testData, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.importId).toBe("test-import-789");
      });

      it("should implement getNoteId correctly", async () => {
        await action.execute(testData, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.noteId).toBe("test-note-456");
      });

      it("should implement getCompletionMetadata correctly", async () => {
        await action.execute(testData, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.metadata).toEqual({
          jobId: "test-job-123",
          customField: "test-value",
          source: "test-source",
          priority: "high",
        });
      });
    });

    describe("edge cases", () => {
      it("should handle missing importId", async () => {
        const dataWithoutImportId = { ...testData, importId: undefined };

        await action.execute(dataWithoutImportId, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.importId).toBe("default-import-id");
      });

      it("should handle missing noteId", async () => {
        const dataWithoutNoteId = { ...testData, noteId: undefined };

        await action.execute(dataWithoutNoteId, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.noteId).toBeUndefined();
      });

      it("should handle missing metadata", async () => {
        const dataWithoutMetadata = { ...testData, metadata: undefined };

        await action.execute(dataWithoutMetadata, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.metadata).toEqual({
          jobId: "test-job-123",
          customField: "test-value",
        });
      });

      it("should handle empty metadata", async () => {
        const dataWithEmptyMetadata = { ...testData, metadata: {} };

        await action.execute(dataWithEmptyMetadata, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.metadata).toEqual({
          jobId: "test-job-123",
          customField: "test-value",
        });
      });
    });

    describe("error handling", () => {
      it("should propagate errors from addStatusEventAndBroadcast", async () => {
        const error = new Error("Broadcast failed");
        mockDeps.addStatusEventAndBroadcast = vi.fn().mockRejectedValue(error);

        await expect(
          action.execute(testData, mockDeps, mockContext)
        ).rejects.toThrow("Broadcast failed");
      });

      it("should handle async errors properly", async () => {
        const error = new Error("Async error");
        mockDeps.addStatusEventAndBroadcast = vi.fn().mockRejectedValue(error);

        await expect(
          action.execute(testData, mockDeps, mockContext)
        ).rejects.toThrow("Async error");
        expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("EdgeCaseCompletionStatusAction", () => {
    let action: EdgeCaseCompletionStatusAction;

    beforeEach(() => {
      action = new EdgeCaseCompletionStatusAction();
    });

    describe("edge case handling", () => {
      it("should handle missing importId by throwing error", async () => {
        const dataWithoutImportId = { ...testData, importId: undefined };

        await expect(
          action.execute(dataWithoutImportId, mockDeps, mockContext)
        ).rejects.toThrow("Import ID is required");
      });

      it("should handle missing noteId gracefully", async () => {
        const dataWithoutNoteId = { ...testData, noteId: undefined };

        await action.execute(dataWithoutNoteId, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.noteId).toBeUndefined();
        expect(callArgs.metadata.hasNoteId).toBe(false);
      });

      it("should handle custom message from metadata", async () => {
        const dataWithCustomMessage = {
          ...testData,
          metadata: { message: "Custom completion message" },
        };

        await action.execute(dataWithCustomMessage, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.message).toBe("Custom completion message");
      });

      it("should use default message when metadata.message is missing", async () => {
        const dataWithoutMessage = { ...testData, metadata: {} };

        await action.execute(dataWithoutMessage, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.message).toBe("Default message");
      });

      it("should provide metadata about data structure", async () => {
        await action.execute(testData, mockDeps, mockContext);

        const callArgs = (
          mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
        ).mock.calls[0]![0];
        expect(callArgs.metadata).toEqual({
          hasNoteId: true,
          hasImportId: true,
          metadataKeys: ["source", "priority"],
        });
      });
    });
  });

  describe("abstract class structure", () => {
    it("should extend BaseAction", () => {
      const action = new TestCompletionStatusAction();
      expect(action).toBeInstanceOf(CompletionStatusAction);
    });

    it("should have abstract methods that must be implemented", () => {
      // This test verifies that the abstract methods are properly defined
      // TypeScript will catch missing implementations at compile time
      expect(() => {
        // This would fail at compile time if abstract methods weren't properly defined
        new TestCompletionStatusAction();
      }).not.toThrow();
    });

    it("should have correct generic type constraints", () => {
      interface CustomData extends BaseJobData {
        customField: string;
      }

      interface CustomDeps extends StatusBroadcasterDeps {
        logger: { log: (msg: string) => void };
      }

      class CustomCompletionAction extends CompletionStatusAction<
        CustomData,
        CustomDeps
      > {
        name = ActionName.COMPLETION_STATUS;

        protected getCompletionMessage(data: CustomData): string {
          return `Custom: ${data.customField}`;
        }

        protected getCompletionContext(): string {
          return "custom-context";
        }

        protected getImportId(data: CustomData): string {
          return data.importId || "custom-import";
        }

        protected getNoteId(data: CustomData): string | undefined {
          return data.noteId;
        }

        protected getCompletionMetadata(
          data: CustomData
        ): Record<string, unknown> {
          return { customField: data.customField };
        }
      }

      const action = new CustomCompletionAction();
      expect(action).toBeInstanceOf(CompletionStatusAction);
    });
  });

  describe("StatusBroadcasterDeps interface", () => {
    it("should have correct structure", () => {
      const deps: StatusBroadcasterDeps = {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      };

      expect(deps).toHaveProperty("addStatusEventAndBroadcast");
      expect(typeof deps.addStatusEventAndBroadcast).toBe("function");
    });

    it("should work with async functions", async () => {
      const deps: StatusBroadcasterDeps = {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue("success"),
      };

      const result = await deps.addStatusEventAndBroadcast({ test: "data" });
      expect(result).toBe("success");
    });
  });

  describe("integration scenarios", () => {
    it("should work with different data types", async () => {
      const action = new TestCompletionStatusAction();
      const differentData: BaseJobData = {
        jobId: "different-job",
        noteId: "different-note",
        importId: "different-import",
        userId: "different-user",
        metadata: { type: "different" },
      };

      await action.execute(differentData, mockDeps, mockContext);

      const callArgs = (
        mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
      ).mock.calls[0]![0];
      expect(callArgs.importId).toBe("different-import");
      expect(callArgs.noteId).toBe("different-note");
      expect(callArgs.message).toBe("Test completion for job different-job");
    });

    it("should handle multiple executions", async () => {
      const action = new TestCompletionStatusAction();
      const data1 = { ...testData, jobId: "job-1" };
      const data2 = { ...testData, jobId: "job-2" };

      await action.execute(data1, mockDeps, mockContext);
      await action.execute(data2, mockDeps, mockContext);

      expect(mockDeps.addStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      const call1 = (
        mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
      ).mock.calls[0]![0];
      const call2 = (
        mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
      ).mock.calls[1]![0];

      expect(call1.message).toBe("Test completion for job job-1");
      expect(call2.message).toBe("Test completion for job job-2");
    });

    it("should maintain consistent status format", async () => {
      const action = new TestCompletionStatusAction();

      await action.execute(testData, mockDeps, mockContext);

      const callArgs = (
        mockDeps.addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
      ).mock.calls[0]![0];
      expect(callArgs.status).toBe("COMPLETED");
      expect(callArgs.indentLevel).toBe(0);
      expect(typeof callArgs.message).toBe("string");
      expect(typeof callArgs.context).toBe("string");
      expect(typeof callArgs.importId).toBe("string");
      expect(typeof callArgs.metadata).toBe("object");
    });
  });
});
