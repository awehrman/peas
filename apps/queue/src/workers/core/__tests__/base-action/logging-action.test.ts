import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoggingAction } from "../../base-action";
import type { ActionContext } from "../../types";

describe("LoggingAction", () => {
  let mockContext: ActionContext;
  let mockLogger: { log: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
    mockLogger = { log: vi.fn() };
  });

  describe("basic functionality", () => {
    it("should have correct name", () => {
      const action = new LoggingAction("Test message");
      expect(action.name).toBe("logging");
    });

    it("should log static message when logger is available", async () => {
      const action = new LoggingAction("Processing job");
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBe(data);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[test-job-123] Processing job"
      );
    });

    it("should log to console when logger is not available", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const action = new LoggingAction("Processing job");
      const data = { value: "test" };
      const deps = {};

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBe(data);
      expect(consoleSpy).toHaveBeenCalledWith("[test-job-123] Processing job");
      consoleSpy.mockRestore();
    });

    it("should pass through data unchanged", async () => {
      const action = new LoggingAction("Processing job");
      const data = { complex: "data", nested: { value: 123 } };
      const deps = { logger: mockLogger };

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBe(data);
      expect(result).toEqual({ complex: "data", nested: { value: 123 } });
    });
  });

  describe("dynamic message function", () => {
    it("should call message function with data and context", async () => {
      const messageFn = vi.fn(
        (data: unknown, context: ActionContext) =>
          `Processing ${typeof data} for job ${context.jobId}`
      );
      const action = new LoggingAction(messageFn);
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBe(data);
      expect(messageFn).toHaveBeenCalledWith(data, mockContext);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[test-job-123] Processing object for job test-job-123"
      );
    });

    it("should handle message function that returns complex strings", async () => {
      const messageFn = (data: unknown, context: ActionContext) =>
        `Job ${context.jobId} on queue ${context.queueName} processing ${JSON.stringify(data)}`;
      const action = new LoggingAction(messageFn);
      const data = { id: 123, name: "test" };
      const deps = { logger: mockLogger };

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBe(data);
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[test-job-123] Job test-job-123 on queue test-queue processing {"id":123,"name":"test"}'
      );
    });

    it("should handle message function that throws errors", async () => {
      const messageFn = vi.fn(() => {
        throw new Error("Message function error");
      });
      const action = new LoggingAction(messageFn);
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      await expect(action.execute(data, deps, mockContext)).rejects.toThrow(
        "Message function error"
      );
    });
  });

  describe("executeWithTiming", () => {
    it("should return success result with timing", async () => {
      const action = new LoggingAction("Processing job");
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      const result = await action.executeWithTiming(data, deps, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.error).toBeUndefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should handle errors in message function", async () => {
      const messageFn = () => {
        throw new Error("Message error");
      };
      const action = new LoggingAction(messageFn);
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      const result = await action.executeWithTiming(data, deps, mockContext);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Message error");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("configuration", () => {
    it("should have correct default configuration", () => {
      const action = new LoggingAction("Test message");
      expect(action.retryable).toBe(false);
      expect(action.priority).toBe(0);
    });

    it("should allow configuration changes", () => {
      const action = new LoggingAction("Test message");
      const configuredAction = action.withConfig({
        retryable: true,
        priority: 5,
      });

      expect(configuredAction.retryable).toBe(true);
      expect(configuredAction.priority).toBe(5);
      expect(configuredAction.name).toBe("logging");
    });
  });

  describe("error handling", () => {
    it("should not have custom error handler by default", () => {
      const action = new LoggingAction("Test message");
      expect(action.onError).toBeUndefined();
    });

    it("should not have input validation by default", () => {
      const action = new LoggingAction("Test message");
      expect(action.validateInput).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle null data", async () => {
      const action = new LoggingAction("Processing null data");
      const data = null;
      const deps = { logger: mockLogger };

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBeNull();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[test-job-123] Processing null data"
      );
    });

    it("should handle undefined data", async () => {
      const action = new LoggingAction("Processing undefined data");
      const data = undefined;
      const deps = { logger: mockLogger };

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[test-job-123] Processing undefined data"
      );
    });

    it("should handle empty string message", async () => {
      const action = new LoggingAction("");
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBe(data);
      expect(mockLogger.log).toHaveBeenCalledWith("[test-job-123] ");
    });

    it("should handle logger with missing log method", async () => {
      const action = new LoggingAction("Processing job");
      const data = { value: "test" };
      const deps = {
        logger: {} as unknown as { log: (message: string) => void },
      };

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBe(data);
      // Should fall back to console.log
    });

    it("should handle logger with non-function log method", async () => {
      const action = new LoggingAction("Processing job");
      const data = { value: "test" };
      const deps = {
        logger: { log: "not a function" } as unknown as {
          log: (message: string) => void;
        },
      };

      const result = await action.execute(data, deps, mockContext);

      expect(result).toBe(data);
      // Should fall back to console.log
    });
  });

  describe("message formatting", () => {
    it("should include job ID in log message", async () => {
      const action = new LoggingAction("Processing job");
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      await action.execute(data, deps, mockContext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining("[test-job-123]")
      );
    });

    it("should handle different job IDs", async () => {
      const action = new LoggingAction("Processing job");
      const data = { value: "test" };
      const deps = { logger: mockLogger };
      const differentContext = { ...mockContext, jobId: "different-job-456" };

      await action.execute(data, deps, differentContext);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[different-job-456] Processing job"
      );
    });
  });
});
