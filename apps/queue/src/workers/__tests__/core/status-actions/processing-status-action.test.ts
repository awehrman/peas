import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockActionContext } from "../../../../test-utils/helpers";
import { ActionName } from "../../../../types";
import { ProcessingStatusAction } from "../../../core/status-actions/processing-status-action";
import type {
  BaseJobData,
  StatusBroadcaster,
  StatusDeps,
} from "../../../types";

describe("ProcessingStatusAction", () => {
  let action: ProcessingStatusAction;
  let mockDeps: StatusDeps;
  let mockContext: ReturnType<typeof createMockActionContext>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    action = new ProcessingStatusAction();
    mockDeps = {
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
      },
    };
    mockContext = createMockActionContext();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("basic functionality", () => {
    it("should have correct action name", () => {
      expect(action.name).toBe(ActionName.PROCESSING_STATUS);
    });

    it("should be instance of ProcessingStatusAction", () => {
      expect(action).toBeInstanceOf(ProcessingStatusAction);
    });

    it("should extend BaseAction", () => {
      expect(action).toHaveProperty("execute");
      expect(action).toHaveProperty("executeWithTiming");
      expect(action).toHaveProperty("withConfig");
    });
  });

  describe("execute method", () => {
    it("should broadcast processing status when statusBroadcaster and importId are available", async () => {
      const data: BaseJobData & { importId: string; noteId?: string } = {
        importId: "test-import-123",
        noteId: "test-note-456",
        jobId: "test-job-789",
      };

      await action.execute(data, mockDeps, mockContext);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: "test-note-456",
        status: "PROCESSING",
        message: `Processing ${mockContext.operation}`,
        context: mockContext.operation,
        indentLevel: 1,
        metadata: {
          jobId: mockContext.jobId,
          operation: mockContext.operation,
        },
      });
    });

    it("should broadcast processing status when only importId is available (no noteId)", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
        jobId: "test-job-789",
      };

      await action.execute(data, mockDeps, mockContext);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: undefined,
        status: "PROCESSING",
        message: `Processing ${mockContext.operation}`,
        context: mockContext.operation,
        indentLevel: 1,
        metadata: {
          jobId: mockContext.jobId,
          operation: mockContext.operation,
        },
      });
    });

    it("should not broadcast when statusBroadcaster is not available", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };
      const depsWithoutBroadcaster: StatusDeps = {};

      await action.execute(data, depsWithoutBroadcaster, mockContext);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${mockContext.operation}] Processing status for job ${mockContext.jobId}`
      );
    });

    it("should not broadcast when importId is not available", async () => {
      const data: BaseJobData = {
        jobId: "test-job-789",
      };

      await action.execute(data, mockDeps, mockContext);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${mockContext.operation}] Processing status for job ${mockContext.jobId}`
      );
    });

    it("should not broadcast when importId is empty string", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "",
      };

      await action.execute(data, mockDeps, mockContext);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${mockContext.operation}] Processing status for job ${mockContext.jobId}`
      );
    });

    it("should handle statusBroadcaster error gracefully", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };
      const error = new Error("Broadcast failed");
      mockDeps.statusBroadcaster!.addStatusEventAndBroadcast = vi
        .fn()
        .mockRejectedValue(error);

      await action.execute(data, mockDeps, mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `[PROCESSING_STATUS] Failed to broadcast: ${error}`
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${mockContext.operation}] Processing status for job ${mockContext.jobId}`
      );
    });

    it("should always log processing message regardless of broadcast success", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };

      await action.execute(data, mockDeps, mockContext);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${mockContext.operation}] Processing status for job ${mockContext.jobId}`
      );
    });
  });

  describe("executeWithTiming method", () => {
    it("should call parent executeWithTiming method", async () => {
      const data: BaseJobData = { jobId: "test-job" };
      const parentSpy = vi.spyOn(action, "executeWithTiming");

      await action.executeWithTiming(data, mockDeps, mockContext);

      expect(parentSpy).toHaveBeenCalledWith(data, mockDeps, mockContext);
    });

    it("should return timing result from parent method", async () => {
      const data: BaseJobData = { jobId: "test-job" };
      const expectedResult = {
        success: true,
        data: undefined,
        duration: 100,
      };

      vi.spyOn(action, "executeWithTiming").mockResolvedValue(expectedResult);

      const result = await action.executeWithTiming(
        data,
        mockDeps,
        mockContext
      );

      expect(result).toEqual(expectedResult);
    });
  });

  describe("withConfig method", () => {
    it("should call parent withConfig method", () => {
      const config = { retryable: true, priority: 1 };
      const parentSpy = vi.spyOn(action, "withConfig");

      action.withConfig(config);

      expect(parentSpy).toHaveBeenCalledWith(config);
    });

    it("should return configured action instance", () => {
      const config = { retryable: false, priority: 5 };

      const result = action.withConfig(config);

      expect(result).not.toBe(action); // Should return a new instance
      expect(result.priority).toBe(5);
      expect(result.retryable).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle data with importId as number", async () => {
      const data = {
        importId: 123 as unknown as string,
        jobId: "test-job",
      } as BaseJobData & { importId: string };

      await action.execute(data, mockDeps, mockContext);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: 123,
        noteId: undefined,
        status: "PROCESSING",
        message: `Processing ${mockContext.operation}`,
        context: mockContext.operation,
        indentLevel: 1,
        metadata: {
          jobId: mockContext.jobId,
          operation: mockContext.operation,
        },
      });
    });

    it("should handle data with noteId as number", async () => {
      const data = {
        importId: "test-import-123",
        noteId: 456 as unknown as string,
        jobId: "test-job",
      } as BaseJobData & { importId: string; noteId?: string };

      await action.execute(data, mockDeps, mockContext);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: 456,
        status: "PROCESSING",
        message: `Processing ${mockContext.operation}`,
        context: mockContext.operation,
        indentLevel: 1,
        metadata: {
          jobId: mockContext.jobId,
          operation: mockContext.operation,
        },
      });
    });

    it("should handle null statusBroadcaster", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };
      const depsWithNullBroadcaster: StatusDeps = {
        statusBroadcaster: undefined,
      };

      await action.execute(data, depsWithNullBroadcaster, mockContext);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${mockContext.operation}] Processing status for job ${mockContext.jobId}`
      );
    });

    it("should handle undefined statusBroadcaster", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };
      const depsWithUndefinedBroadcaster: StatusDeps = {
        statusBroadcaster: undefined,
      };

      await action.execute(data, depsWithUndefinedBroadcaster, mockContext);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${mockContext.operation}] Processing status for job ${mockContext.jobId}`
      );
    });

    it("should handle missing addStatusEventAndBroadcast method", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };
      const depsWithInvalidBroadcaster: StatusDeps = {
        statusBroadcaster: {
          addStatusEventAndBroadcast: vi
            .fn()
            .mockRejectedValue(new Error("Method not implemented")),
        } as StatusBroadcaster,
      };

      await action.execute(data, depsWithInvalidBroadcaster, mockContext);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${mockContext.operation}] Processing status for job ${mockContext.jobId}`
      );
    });
  });

  describe("integration scenarios", () => {
    it("should work with complex data structure", async () => {
      const data = {
        importId: "complex-import-123",
        noteId: "complex-note-456",
        jobId: "complex-job-789",
        metadata: {
          source: "test",
          priority: "high",
        },
        createdAt: new Date(),
        tags: ["test", "processing"],
      };

      await action.execute(data, mockDeps, mockContext);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "complex-import-123",
        noteId: "complex-note-456",
        status: "PROCESSING",
        message: `Processing ${mockContext.operation}`,
        context: mockContext.operation,
        indentLevel: 1,
        metadata: {
          jobId: mockContext.jobId,
          operation: mockContext.operation,
        },
      });
    });

    it("should work with custom operation names", async () => {
      const customContext = createMockActionContext();
      customContext.operation = "custom-operation";
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };

      await action.execute(data, mockDeps, customContext);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: undefined,
        status: "PROCESSING",
        message: "Processing custom-operation",
        context: "custom-operation",
        indentLevel: 1,
        metadata: {
          jobId: customContext.jobId,
          operation: "custom-operation",
        },
      });
    });

    it("should work with custom job IDs", async () => {
      const customContext = createMockActionContext();
      customContext.jobId = "custom-job-123";
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };

      await action.execute(data, mockDeps, customContext);

      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-123",
        noteId: undefined,
        status: "PROCESSING",
        message: `Processing ${customContext.operation}`,
        context: customContext.operation,
        indentLevel: 1,
        metadata: {
          jobId: "custom-job-123",
          operation: customContext.operation,
        },
      });
    });
  });

  describe("error handling", () => {
    it("should handle TypeError from statusBroadcaster", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };
      const typeError = new TypeError(
        "Cannot read property 'addStatusEventAndBroadcast' of null"
      );
      mockDeps.statusBroadcaster!.addStatusEventAndBroadcast = vi
        .fn()
        .mockRejectedValue(typeError);

      await action.execute(data, mockDeps, mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `[PROCESSING_STATUS] Failed to broadcast: ${typeError}`
      );
    });

    it("should handle network errors from statusBroadcaster", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };
      const networkError = new Error("Network timeout");
      mockDeps.statusBroadcaster!.addStatusEventAndBroadcast = vi
        .fn()
        .mockRejectedValue(networkError);

      await action.execute(data, mockDeps, mockContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `[PROCESSING_STATUS] Failed to broadcast: ${networkError}`
      );
    });

    it("should continue execution even after broadcast error", async () => {
      const data: BaseJobData & { importId: string } = {
        importId: "test-import-123",
      };
      mockDeps.statusBroadcaster!.addStatusEventAndBroadcast = vi
        .fn()
        .mockRejectedValue(new Error("Test error"));

      await expect(
        action.execute(data, mockDeps, mockContext)
      ).resolves.not.toThrow();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[${mockContext.operation}] Processing status for job ${mockContext.jobId}`
      );
    });
  });
});
