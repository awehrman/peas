import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ErrorSeverity,
  ErrorType,
  type JobError,
  type RetryConfig,
} from "../../types";
import { ErrorHandler, QueueError, validateJobData } from "../error-handler";

// Mock console methods to capture output
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  log: vi.fn(),
};

// Replace console methods with mocks
Object.defineProperty(global, "console", {
  value: mockConsole,
  writable: true,
});

describe("QueueError", () => {
  it("should create QueueError with job error", () => {
    const jobError: JobError = {
      type: ErrorType.DATABASE_ERROR,
      severity: ErrorSeverity.HIGH,
      message: "Database connection failed",
      timestamp: new Date(),
    };

    const queueError = new QueueError(jobError);

    expect(queueError).toBeInstanceOf(QueueError);
    expect(queueError).toBeInstanceOf(Error);
    expect(queueError.name).toBe("QueueError");
    expect(queueError.message).toBe("Database connection failed");
    expect(queueError.jobError).toBe(jobError);
  });
});

describe("ErrorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createJobError", () => {
    it("should create job error from Error object", () => {
      const error = new Error("Test error");
      const jobError = ErrorHandler.createJobError(
        error,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH,
        { operation: "test" }
      );

      expect(jobError.type).toBe(ErrorType.DATABASE_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
      expect(jobError.message).toBe("Test error");
      expect(jobError.context).toEqual({ operation: "test" });
      expect(jobError.originalError).toBe(error);
      expect(jobError.timestamp).toBeInstanceOf(Date);
    });

    it("should create job error from string", () => {
      const jobError = ErrorHandler.createJobError(
        "String error",
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.LOW
      );

      expect(jobError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.LOW);
      expect(jobError.message).toBe("String error");
      expect(jobError.originalError).toBeUndefined();
    });

    it("should handle undefined error", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobError = ErrorHandler.createJobError(undefined as any);

      expect(jobError.message).toBe("undefined");
      expect(jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should handle null error", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const jobError = ErrorHandler.createJobError(null as any);

      expect(jobError.message).toBe("null");
      expect(jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should use default type and severity when not provided", () => {
      const jobError = ErrorHandler.createJobError("Test message");

      expect(jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe("createValidationError", () => {
    it("should create validation error with all parameters", () => {
      const validationError = ErrorHandler.createValidationError(
        "Invalid field",
        "email",
        "invalid-email",
        { form: "registration" }
      );

      expect(validationError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(validationError.severity).toBe(ErrorSeverity.LOW);
      expect(validationError.message).toBe("Invalid field");
      expect(validationError.field).toBe("email");
      expect(validationError.value).toBe("invalid-email");
      expect(validationError.context).toEqual({ form: "registration" });
    });

    it("should create validation error with minimal parameters", () => {
      const validationError =
        ErrorHandler.createValidationError("Invalid field");

      expect(validationError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(validationError.severity).toBe(ErrorSeverity.LOW);
      expect(validationError.message).toBe("Invalid field");
      expect(validationError.field).toBeUndefined();
      expect(validationError.value).toBeUndefined();
    });
  });

  describe("createDatabaseError", () => {
    it("should create database error with all parameters", () => {
      const error = new Error("Connection failed");
      const databaseError = ErrorHandler.createDatabaseError(
        error,
        "SELECT",
        "users",
        { userId: "123" }
      );

      expect(databaseError.type).toBe(ErrorType.DATABASE_ERROR);
      expect(databaseError.severity).toBe(ErrorSeverity.HIGH);
      expect(databaseError.message).toBe("Connection failed");
      expect(databaseError.operation).toBe("SELECT");
      expect(databaseError.table).toBe("users");
      expect(databaseError.context).toEqual({ userId: "123" });
      expect(databaseError.originalError).toBe(error);
    });

    it("should create database error with minimal parameters", () => {
      const error = new Error("Query failed");
      const databaseError = ErrorHandler.createDatabaseError(error);

      expect(databaseError.type).toBe(ErrorType.DATABASE_ERROR);
      expect(databaseError.severity).toBe(ErrorSeverity.HIGH);
      expect(databaseError.message).toBe("Query failed");
      expect(databaseError.operation).toBeUndefined();
      expect(databaseError.table).toBeUndefined();
    });
  });

  describe("shouldRetry", () => {
    it("should return false when retry count exceeds max attempts", () => {
      const jobError: JobError = {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
        message: "Test error",
        timestamp: new Date(),
      };

      const shouldRetry = ErrorHandler.shouldRetry(jobError, 3);

      expect(shouldRetry).toBe(false);
    });

    it("should return false for validation errors", () => {
      const jobError: JobError = {
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: "Validation failed",
        timestamp: new Date(),
      };

      const shouldRetry = ErrorHandler.shouldRetry(jobError, 0);

      expect(shouldRetry).toBe(false);
    });

    it("should return false for critical errors", () => {
      const jobError: JobError = {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.CRITICAL,
        message: "Critical error",
        timestamp: new Date(),
      };

      const shouldRetry = ErrorHandler.shouldRetry(jobError, 0);

      expect(shouldRetry).toBe(false);
    });

    it("should return true for retryable errors", () => {
      const jobError: JobError = {
        type: ErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: "Network timeout",
        timestamp: new Date(),
      };

      const shouldRetry = ErrorHandler.shouldRetry(jobError, 0);

      expect(shouldRetry).toBe(true);
    });

    it("should use custom retry config", () => {
      const jobError: JobError = {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
        message: "Test error",
        timestamp: new Date(),
      };

      const customConfig: Partial<RetryConfig> = {
        maxAttempts: 5,
      };

      const shouldRetry = ErrorHandler.shouldRetry(jobError, 3, customConfig);

      expect(shouldRetry).toBe(true);
    });
  });

  describe("calculateBackoff", () => {
    it("should calculate exponential backoff", () => {
      const delay1 = ErrorHandler.calculateBackoff(0);
      const delay2 = ErrorHandler.calculateBackoff(1);
      const delay3 = ErrorHandler.calculateBackoff(2);

      expect(delay1).toBe(1000); // baseDelay
      expect(delay2).toBe(2000); // baseDelay * backoffMultiplier
      expect(delay3).toBe(4000); // baseDelay * backoffMultiplier^2
    });

    it("should respect max delay limit", () => {
      const delay = ErrorHandler.calculateBackoff(10);

      expect(delay).toBe(30000); // maxDelay
    });

    it("should use custom retry config", () => {
      const customConfig: Partial<RetryConfig> = {
        baseDelay: 500,
        backoffMultiplier: 3,
        maxDelay: 10000,
      };

      const delay = ErrorHandler.calculateBackoff(2, customConfig);

      expect(delay).toBe(4500); // 500 * 3^2
    });
  });

  describe("logError", () => {
    it("should log critical error", () => {
      const jobError: JobError = {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.CRITICAL,
        message: "Critical database failure",
        timestamp: new Date("2023-01-01T00:00:00Z"),
        jobId: "job-123",
        queueName: "test-queue",
        retryCount: 2,
        context: { operation: "save" },
      };

      ErrorHandler.logError(jobError, { additional: "context" });

      expect(mockConsole.error).toHaveBeenCalledWith(
        "🚨 CRITICAL ERROR:",
        expect.stringContaining("Critical database failure")
      );
    });

    it("should log high severity error", () => {
      const jobError: JobError = {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
        message: "High severity error",
        timestamp: new Date(),
      };

      ErrorHandler.logError(jobError);

      expect(mockConsole.error).toHaveBeenCalledWith(
        "❌ HIGH SEVERITY ERROR:",
        expect.stringContaining("High severity error")
      );
    });

    it("should log medium severity error", () => {
      const jobError: JobError = {
        type: ErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: "Medium severity error",
        timestamp: new Date(),
      };

      ErrorHandler.logError(jobError);

      expect(mockConsole.warn).toHaveBeenCalledWith(
        "⚠️ MEDIUM SEVERITY ERROR:",
        expect.stringContaining("Medium severity error")
      );
    });

    it("should log low severity error", () => {
      const jobError: JobError = {
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: "Low severity error",
        timestamp: new Date(),
      };

      ErrorHandler.logError(jobError);

      expect(mockConsole.info).toHaveBeenCalledWith(
        "ℹ️ LOW SEVERITY ERROR:",
        expect.stringContaining("Low severity error")
      );
    });

    it("should merge additional context", () => {
      const jobError: JobError = {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
        message: "Test error",
        timestamp: new Date(),
        context: { original: "context" },
      };

      ErrorHandler.logError(jobError, { additional: "context" });

      const callArgs = mockConsole.error.mock.calls[0]!;
      expect(callArgs[0]).toBe("❌ HIGH SEVERITY ERROR:");
      expect(callArgs[1]).toContain('"original": "context"');
      expect(callArgs[1]).toContain('"additional": "context"');
    });
  });

  describe("classifyError", () => {
    it("should classify database errors", () => {
      const error = new Error("Database connection failed");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.DATABASE_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should classify Prisma errors", () => {
      const error = new Error("Prisma query failed");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.DATABASE_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should classify SQL errors", () => {
      const error = new Error("SQL syntax error");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.DATABASE_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should classify Redis errors", () => {
      const error = new Error("Redis connection failed");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.REDIS_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should classify connection errors", () => {
      const error = new Error("Connection refused");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.REDIS_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should classify network errors", () => {
      const error = new Error("Network timeout");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should classify timeout errors", () => {
      const error = new Error("Request timed out");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should classify external service errors", () => {
      const error = new Error("API service unavailable");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should classify HTTP errors", () => {
      const error = new Error("HTTP 500 error");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should classify unknown errors", () => {
      const error = new Error("Unknown error type");
      const jobError = ErrorHandler.classifyError(error);

      expect(jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe("withErrorHandling", () => {
    it("should return result when operation succeeds", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const result = await ErrorHandler.withErrorHandling(operation, {
        context: "test",
      });

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalled();
    });

    it("should handle and classify errors", async () => {
      const error = new Error("Database error");
      const operation = vi.fn().mockRejectedValue(error);

      await expect(
        ErrorHandler.withErrorHandling(operation, { context: "test" })
      ).rejects.toThrow(QueueError);

      expect(mockConsole.error).toHaveBeenCalled();
    });

    it("should merge context with error", async () => {
      const error = new Error("Test error");
      const operation = vi.fn().mockRejectedValue(error);

      try {
        await ErrorHandler.withErrorHandling(operation, {
          additional: "context",
        });
      } catch (e) {
        expect(e).toBeInstanceOf(QueueError);
        expect((e as QueueError).jobError.context).toEqual({
          additional: "context",
        });
      }
    });
  });

  describe("createHttpErrorResponse", () => {
    it("should create HTTP error response", () => {
      const jobError: JobError = {
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: "Validation failed",
        code: "VALIDATION_FAILED",
        timestamp: new Date("2023-01-01T00:00:00Z"),
        context: { field: "email" },
      };

      const response = ErrorHandler.createHttpErrorResponse(jobError, {
        additional: "context",
      });

      expect(response).toEqual({
        success: false,
        error: {
          message: "Validation failed",
          type: ErrorType.VALIDATION_ERROR,
          code: "VALIDATION_FAILED",
        },
        context: { field: "email", additional: "context" },
        timestamp: "2023-01-01T00:00:00.000Z",
      });
    });
  });

  describe("createHttpSuccessResponse", () => {
    it("should create HTTP success response with all parameters", () => {
      const data = { id: "123", name: "test" };
      const response = ErrorHandler.createHttpSuccessResponse(
        data,
        "Operation successful",
        { additional: "context" }
      );

      expect(response).toEqual({
        success: true,
        message: "Operation successful",
        data: { id: "123", name: "test" },
        context: { additional: "context" },
        timestamp: expect.any(String),
      });
    });

    it("should create HTTP success response with minimal parameters", () => {
      const data = { id: "123" };
      const response = ErrorHandler.createHttpSuccessResponse(data);

      expect(response).toEqual({
        success: true,
        message: undefined,
        data: { id: "123" },
        context: undefined,
        timestamp: expect.any(String),
      });
    });
  });

  describe("handleRouteError", () => {
    it("should handle QueueError", () => {
      const jobError: JobError = {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
        message: "Database error",
        timestamp: new Date(),
      };
      const queueError = new QueueError(jobError);

      const response = ErrorHandler.handleRouteError(
        queueError,
        "test-operation",
        { additional: "context" }
      );

      expect(response.success).toBe(false);
      expect(response.error.message).toBe("Database error");
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it("should handle regular Error", () => {
      const error = new Error("Unknown error");

      const response = ErrorHandler.handleRouteError(error, "test-operation", {
        additional: "context",
      });

      expect(response.success).toBe(false);
      expect(response.error.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it("should merge operation context", () => {
      const error = new Error("Test error");

      const response = ErrorHandler.handleRouteError(error, "test-operation", {
        additional: "context",
      });

      expect(response.context).toEqual({
        operation: "test-operation",
        additional: "context",
      });
    });
  });

  describe("createWorkerError", () => {
    it("should create worker error with all parameters", () => {
      const error = new Error("Worker failed");
      const jobError = ErrorHandler.createWorkerError(
        error,
        "test-worker",
        "job-123",
        "process",
        { additional: "context" }
      );

      expect(jobError.type).toBe(ErrorType.WORKER_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(jobError.message).toBe("Worker failed");
      expect(jobError.context).toEqual({
        workerName: "test-worker",
        jobId: "job-123",
        operation: "process",
        additional: "context",
      });
      expect(jobError.originalError).toBe(error);
    });

    it("should create worker error with minimal parameters", () => {
      const error = new Error("Worker failed");
      const jobError = ErrorHandler.createWorkerError(error, "test-worker");

      expect(jobError.type).toBe(ErrorType.WORKER_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(jobError.context).toEqual({
        workerName: "test-worker",
      });
    });
  });

  describe("validateJobData", () => {
    it("should return null for valid data", () => {
      const data = {
        field1: "value1",
        field2: "value2",
        field3: 123,
      };
      const requiredFields: (keyof typeof data)[] = ["field1", "field2"];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should return validation error for missing field", () => {
      const data = {
        field1: "value1",
        field2: undefined,
        field3: "value3",
      };
      const requiredFields: (keyof typeof data)[] = [
        "field1",
        "field2",
        "field3",
      ];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result!.severity).toBe(ErrorSeverity.LOW);
      expect(result!.field).toBe("field2");
      expect(result!.value).toBeUndefined();
    });

    it("should return validation error for null field", () => {
      const data = {
        field1: "value1",
        field2: null,
      };
      const requiredFields: (keyof typeof data)[] = ["field1", "field2"];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result!.field).toBe("field2");
      expect(result!.value).toBeNull();
    });

    it("should return validation error for first missing field", () => {
      const data = {
        field1: undefined,
        field2: null,
        field3: "value3",
      };
      const requiredFields: (keyof typeof data)[] = [
        "field1",
        "field2",
        "field3",
      ];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result!.field).toBe("field1");
    });
  });
});

describe("validateJobData function", () => {
  it("should return null for valid job data", () => {
    const data = { note: "test-note" };
    const result = validateJobData(data);

    expect(result).toBeNull();
  });

  it("should return error for missing note", () => {
    const data = { otherField: "value" };
    const result = validateJobData(data);

    expect(result).toEqual({
      message: "Invalid job data: missing note",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: expect.any(Date),
    });
  });

  it("should return error for null data", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validateJobData(null as any);

    expect(result).toEqual({
      message: "Invalid job data: missing note",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: expect.any(Date),
    });
  });

  it("should return error for undefined data", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = validateJobData(undefined as any);

    expect(result).toEqual({
      message: "Invalid job data: missing note",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: expect.any(Date),
    });
  });

  it("should return error for empty object", () => {
    const result = validateJobData({});

    expect(result).toEqual({
      message: "Invalid job data: missing note",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: expect.any(Date),
    });
  });
});
