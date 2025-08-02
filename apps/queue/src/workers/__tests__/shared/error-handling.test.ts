import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../types";
import { ActionFactory } from "../../core/action-factory";
import { BaseAction } from "../../core/base-action";
import type { ActionContext } from "../../core/types";
import {
  CaptureErrorAction,
  type ErrorHandlingDeps,
  ErrorHandlingWrapperAction,
  type ErrorJobData,
  ErrorRecoveryAction,
  LogErrorAction,
  createErrorHandlingChain,
  withErrorHandling,
} from "../../shared/error-handling";
import type { BaseJobData } from "../../types";

describe("ErrorHandling", () => {
  let mockErrorHandler: {
    withErrorHandling: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    log: ReturnType<typeof vi.fn>;
  };
  let mockActionFactory: ActionFactory<ErrorJobData, object>;
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockErrorHandler = {
      withErrorHandling: vi.fn(),
    };

    mockLogger = {
      log: vi.fn(),
    };

    mockActionFactory = {
      create: vi.fn(),
    } as unknown as ActionFactory<ErrorJobData, object>;

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

  describe("ErrorHandlingWrapperAction", () => {
    let mockWrappedAction: BaseAction<BaseJobData, object>;
    let wrapperAction: ErrorHandlingWrapperAction<
      BaseJobData,
      ErrorHandlingDeps
    >;

    beforeEach(() => {
      mockWrappedAction = {
        name: ActionName.NO_OP,
        execute: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as BaseAction<BaseJobData, object>;

      wrapperAction = new ErrorHandlingWrapperAction(mockWrappedAction);
    });

    it("should have correct name", () => {
      expect(wrapperAction.name).toBe(ActionName.ERROR_HANDLING);
    });

    it("should wrap action execution with error handling", async () => {
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps: ErrorHandlingDeps = { ErrorHandler: mockErrorHandler };

      mockErrorHandler.withErrorHandling.mockImplementation(
        async (operation) => {
          return await operation();
        }
      );

      const result = await wrapperAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(mockErrorHandler.withErrorHandling).toHaveBeenCalledWith(
        expect.any(Function),
        {
          jobId: "test-job-123",
          operation: "test-operation (no_op)",
          noteId: undefined,
        }
      );

      expect(mockWrappedAction.execute).toHaveBeenCalledWith(
        testData,
        testDeps,
        mockContext
      );
      expect(result).toEqual({ success: true });
    });

    it("should handle data with noteId in metadata", async () => {
      const testData: BaseJobData = {
        jobId: "test-job-123",
        metadata: { noteId: "note-123" },
      };
      const testDeps: ErrorHandlingDeps = { ErrorHandler: mockErrorHandler };

      mockErrorHandler.withErrorHandling.mockImplementation(
        async (operation) => {
          return await operation();
        }
      );

      await wrapperAction.execute(testData, testDeps, mockContext);

      expect(mockErrorHandler.withErrorHandling).toHaveBeenCalledWith(
        expect.any(Function),
        {
          jobId: "test-job-123",
          operation: "test-operation (no_op)",
          noteId: undefined, // The implementation looks for data.noteId, not metadata.noteId
        }
      );
    });

    it("should propagate errors from wrapped action", async () => {
      const testData: BaseJobData = { jobId: "test-job-123" };
      const testDeps: ErrorHandlingDeps = { ErrorHandler: mockErrorHandler };
      const testError = new Error("Wrapped action failed");

      mockWrappedAction.execute = vi.fn().mockRejectedValue(testError);
      mockErrorHandler.withErrorHandling.mockImplementation(
        async (operation) => {
          return await operation();
        }
      );

      await expect(
        wrapperAction.execute(testData, testDeps, mockContext)
      ).rejects.toThrow("Wrapped action failed");
    });
  });

  describe("LogErrorAction", () => {
    let logErrorAction: LogErrorAction;

    beforeEach(() => {
      logErrorAction = new LogErrorAction();
    });

    it("should have correct name", () => {
      expect(logErrorAction.name).toBe(ActionName.LOG_ERROR);
    });

    it("should not be retryable", () => {
      expect(logErrorAction.retryable).toBe(false);
    });

    it("should log error with logger when available", async () => {
      const testData: ErrorJobData = {
        error: new Error("Test error"),
        noteId: "note-123",
      };
      const testDeps = { logger: mockLogger };

      const result = await logErrorAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Error in test-operation for job test-job-123 (note: note-123): Test error",
        "error",
        { error: testData.error, noteId: "note-123", jobId: "test-job-123" }
      );

      expect(result).toEqual(testData);
    });

    it("should log error without noteId", async () => {
      const testData: ErrorJobData = {
        error: new Error("Test error"),
      };
      const testDeps = { logger: mockLogger };

      const result = await logErrorAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "Error in test-operation for job test-job-123: Test error",
        "error",
        { error: testData.error, noteId: undefined, jobId: "test-job-123" }
      );

      expect(result).toEqual(testData);
    });

    it("should use console.error when logger is not available", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const testData: ErrorJobData = {
        error: new Error("Test error"),
        noteId: "note-123",
      };
      const testDeps = {};

      const result = await logErrorAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in test-operation for job test-job-123 (note: note-123):",
        "Test error"
      );

      expect(result).toEqual(testData);
      consoleSpy.mockRestore();
    });

    it("should use console.error when logger is undefined", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const testData: ErrorJobData = {
        error: new Error("Test error"),
      };
      const testDeps = { logger: undefined };

      const result = await logErrorAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in test-operation for job test-job-123:",
        "Test error"
      );

      expect(result).toEqual(testData);
      consoleSpy.mockRestore();
    });
  });

  describe("CaptureErrorAction", () => {
    let captureErrorAction: CaptureErrorAction;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      captureErrorAction = new CaptureErrorAction();
      consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should have correct name", () => {
      expect(captureErrorAction.name).toBe(ActionName.CAPTURE_ERROR);
    });

    it("should not be retryable", () => {
      expect(captureErrorAction.retryable).toBe(false);
    });

    it("should capture error information", async () => {
      const testError = new Error("Test error");
      testError.stack = "Error stack trace";
      const testData: ErrorJobData = {
        error: testError,
        noteId: "note-123",
      };
      const testDeps = {};

      const result = await captureErrorAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Captured error:",
        expect.stringContaining('"timestamp":')
      );

      expect(result).toEqual(testData);
    });

    it("should handle error without noteId", async () => {
      const testError = new Error("Test error");
      const testData: ErrorJobData = {
        error: testError,
      };
      const testDeps = {};

      const result = await captureErrorAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Captured error:",
        expect.stringContaining('"timestamp":')
      );

      expect(result).toEqual(testData);
    });

    it("should handle custom error types", async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const testError = new CustomError("Custom error message");
      const testData: ErrorJobData = {
        error: testError,
      };
      const testDeps = {};

      const result = await captureErrorAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Captured error:",
        expect.stringContaining('"timestamp":')
      );

      expect(result).toEqual(testData);
    });

    it("should log captured error to console", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const action = new CaptureErrorAction();
      const data: ErrorJobData = {
        noteId: "test-note",
        error: new Error("Test error"),
      };
      const context: ActionContext = {
        jobId: "test-job",
        operation: "test-operation",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "test-queue",
        workerName: "test-worker",
        attemptNumber: 1,
      };

      await action.execute(data, {}, context);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Captured error:",
        expect.stringContaining('"jobId": "test-job"')
      );

      consoleSpy.mockRestore();
    });

    it("should call console.error with properly formatted JSON for line 161 coverage", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const action = new CaptureErrorAction();
      const data: ErrorJobData = {
        noteId: "test-note-161",
        error: new Error("Test error for line 161"),
      };
      const context: ActionContext = {
        jobId: "test-job-161",
        operation: "test-operation-161",
        startTime: Date.now(),
        retryCount: 0,
        queueName: "test-queue",
        workerName: "test-worker",
        attemptNumber: 1,
      };

      await action.execute(data, {}, context);

      // Verify that console.error was called with the exact format expected
      expect(consoleSpy).toHaveBeenCalledWith(
        "Captured error:",
        expect.stringContaining('"jobId": "test-job-161"')
      );

      // Verify the JSON structure contains all expected fields
      const callArgs = consoleSpy.mock.calls[0];
      const jsonString = callArgs?.[1] as string;
      const parsed = JSON.parse(jsonString);

      expect(parsed).toHaveProperty("timestamp");
      expect(parsed).toHaveProperty("jobId", "test-job-161");
      expect(parsed).toHaveProperty("operation", "test-operation-161");
      expect(parsed).toHaveProperty("noteId", "test-note-161");
      expect(parsed).toHaveProperty("error");
      expect(parsed.error).toHaveProperty("message", "Test error for line 161");
      expect(parsed.error).toHaveProperty("stack");
      expect(parsed.error).toHaveProperty("name", "Error");

      consoleSpy.mockRestore();
    });
  });

  describe("ErrorRecoveryAction", () => {
    let errorRecoveryAction: ErrorRecoveryAction;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errorRecoveryAction = new ErrorRecoveryAction();
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should have correct name", () => {
      expect(errorRecoveryAction.name).toBe(ActionName.ERROR_RECOVERY);
    });

    it("should be retryable", () => {
      expect(errorRecoveryAction.retryable).toBe(true);
    });

    it("should handle ValidationError", async () => {
      class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "ValidationError";
        }
      }

      const testData: ErrorJobData = {
        error: new ValidationError("Validation failed"),
      };
      const testDeps = {};

      const result = await errorRecoveryAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Recovering from validation error in test-operation"
      );

      expect(result).toEqual(testData);
    });

    it("should handle NetworkError", async () => {
      class NetworkError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "NetworkError";
        }
      }

      const testData: ErrorJobData = {
        error: new NetworkError("Network timeout"),
      };
      const testDeps = {};

      const result = await errorRecoveryAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Recovering from network error in test-operation"
      );

      expect(result).toEqual(testData);
    });

    it("should handle unknown error types", async () => {
      const testData: ErrorJobData = {
        error: new Error("Unknown error"),
      };
      const testDeps = {};

      const result = await errorRecoveryAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "No recovery strategy for error type: Error"
      );

      expect(result).toEqual(testData);
    });

    it("should handle custom error types", async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const testData: ErrorJobData = {
        error: new CustomError("Custom error"),
      };
      const testDeps = {};

      const result = await errorRecoveryAction.execute(
        testData,
        testDeps,
        mockContext
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "No recovery strategy for error type: CustomError"
      );

      expect(result).toEqual(testData);
    });
  });

  describe("withErrorHandling", () => {
    let mockAction: BaseAction<BaseJobData, object>;

    beforeEach(() => {
      mockAction = {
        name: ActionName.NO_OP,
        execute: vi.fn(),
        onError: undefined,
      } as unknown as BaseAction<BaseJobData, object>;
    });

    it("should create ErrorHandlingWrapperAction without custom error handler", () => {
      const result = withErrorHandling(mockAction);

      expect(result).toBeInstanceOf(ErrorHandlingWrapperAction);
      expect(result.name).toBe(ActionName.ERROR_HANDLING);
    });

    it("should create ErrorHandlingWrapperAction with custom error handler", () => {
      const customErrorHandler = vi.fn();
      const result = withErrorHandling(mockAction, customErrorHandler);

      expect(result).toBeInstanceOf(ErrorHandlingWrapperAction);
      expect(result.name).toBe(ActionName.ERROR_HANDLING);
      expect(mockAction.onError).toBeDefined();
      expect(typeof mockAction.onError).toBe("function");
    });
  });

  describe("createErrorHandlingChain", () => {
    let mockLogErrorAction: BaseAction<ErrorJobData, object>;
    let mockCaptureErrorAction: BaseAction<ErrorJobData, object>;
    let mockErrorRecoveryAction: BaseAction<ErrorJobData, object>;

    beforeEach(() => {
      mockLogErrorAction = {
        name: ActionName.LOG_ERROR,
        execute: vi.fn(),
      } as unknown as BaseAction<ErrorJobData, object>;

      mockCaptureErrorAction = {
        name: ActionName.CAPTURE_ERROR,
        execute: vi.fn(),
      } as unknown as BaseAction<ErrorJobData, object>;

      mockErrorRecoveryAction = {
        name: ActionName.ERROR_RECOVERY,
        execute: vi.fn(),
      } as unknown as BaseAction<ErrorJobData, object>;

      const mockCreate = vi
        .fn()
        .mockReturnValueOnce(mockLogErrorAction)
        .mockReturnValueOnce(mockCaptureErrorAction)
        .mockReturnValueOnce(mockErrorRecoveryAction);

      mockActionFactory = {
        create: mockCreate,
      } as unknown as ActionFactory<ErrorJobData, object>;
    });

    it("should create chain of error handling actions", () => {
      const testDeps = {};
      const result = createErrorHandlingChain(mockActionFactory, testDeps);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(mockLogErrorAction);
      expect(result[1]).toBe(mockCaptureErrorAction);
      expect(result[2]).toBe(mockErrorRecoveryAction);

      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.LOG_ERROR,
        testDeps
      );
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.CAPTURE_ERROR,
        testDeps
      );
      expect(mockActionFactory.create).toHaveBeenCalledWith(
        ActionName.ERROR_RECOVERY,
        testDeps
      );
    });

    it("should create chain without noteId", () => {
      const testDeps = {};
      const result = createErrorHandlingChain(mockActionFactory, testDeps);

      expect(result).toHaveLength(3);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(3);
    });

    it("should create chain with noteId", () => {
      const testDeps = {};
      const noteId = "note-123";
      const result = createErrorHandlingChain(
        mockActionFactory,
        testDeps,
        noteId
      );

      expect(result).toHaveLength(3);
      expect(mockActionFactory.create).toHaveBeenCalledTimes(3);
      // Note: The noteId parameter is currently unused in the implementation
    });
  });
});
