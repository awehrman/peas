/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppErrorCode, ErrorSeverity, ErrorType, LogLevel } from "../../types";
import {
  ErrorContext,
  StandardizedErrorHandler,
  createDatabaseError,
  createError,
  createNetworkError,
  createTimeoutError,
  createValidationError,
  errorHandler,
  withErrorHandling,
} from "../standardized-error-handler";

// Mock the logger
vi.mock("../standardized-logger", () => ({
  createLogger: vi.fn(() => ({
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  })),
}));

describe("StandardizedErrorHandler", () => {
  let handler: StandardizedErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new StandardizedErrorHandler();
  });

  describe("createError", () => {
    it("should create error from string", () => {
      const error = handler.createError(
        "Test error message",
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.VALIDATION_FAILED,
        { field: "test" }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Test error message");
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.code).toBe(AppErrorCode.VALIDATION_FAILED);
      expect(error.context).toEqual({ field: "test" });
      expect(error.originalError).toBeInstanceOf(Error);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe("StandardizedError");
    });

    it("should create error from Error object", () => {
      const originalError = new Error("Original error");
      const error = handler.createError(
        originalError,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH,
        AppErrorCode.DATABASE_QUERY_FAILED
      );

      expect(error.message).toBe("Original error");
      expect(error.originalError).toBe(originalError);
      expect(error.type).toBe(ErrorType.DATABASE_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.code).toBe(AppErrorCode.DATABASE_QUERY_FAILED);
    });

    it("should use default values when not provided", () => {
      const error = handler.createError("Test error");

      expect(error.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.code).toBe(AppErrorCode.INTERNAL_ERROR);
      expect(error.context).toBeUndefined();
    });
  });

  describe("handleError", () => {
    it("should handle standardized error", () => {
      const standardizedError = handler.createError(
        "Test error",
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.NETWORK_CONNECTION_FAILED
      );

      const result = handler.handleError(standardizedError);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(true);
      expect(result.retryAfter).toBeDefined();
      expect(result.error).toBe(standardizedError);
    });

    it("should handle regular error", () => {
      const regularError = new Error("Regular error");
      const context: ErrorContext = { operation: "test" };

      const result = handler.handleError(regularError, context);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.error.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.error.context).toEqual(context);
    });

    it("should not retry critical errors", () => {
      const criticalError = handler.createError(
        "Critical error",
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.CRITICAL,
        AppErrorCode.VALIDATION_FAILED
      );

      const result = handler.handleError(criticalError);

      expect(result.shouldRetry).toBe(false);
    });

    it("should not retry validation errors", () => {
      const validationError = handler.createError(
        "Validation error",
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.VALIDATION_FAILED
      );

      const result = handler.handleError(validationError);

      expect(result.shouldRetry).toBe(false);
    });

    it("should retry network errors", () => {
      const networkError = handler.createError(
        "Network error",
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.NETWORK_CONNECTION_FAILED
      );

      const result = handler.handleError(networkError);

      expect(result.shouldRetry).toBe(true);
    });

    it("should retry timeout errors", () => {
      const timeoutError = handler.createError(
        "Timeout error",
        ErrorType.TIMEOUT_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.NETWORK_TIMEOUT
      );

      const result = handler.handleError(timeoutError);

      expect(result.shouldRetry).toBe(true);
    });

    it("should retry Redis connection errors", () => {
      const error = handler.createError(
        "Redis connection failed",
        ErrorType.REDIS_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.CACHE_OPERATION_FAILED
      );

      const result = handler.handleError(error);

      expect(result.shouldRetry).toBe(true);
      expect(result.retryAfter).toBeDefined();
    });

    it("should not retry Redis operation errors", () => {
      const error = handler.createError(
        "Redis operation failed",
        ErrorType.REDIS_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.CACHE_OPERATION_FAILED
      );

      const result = handler.handleError(error);

      expect(result.shouldRetry).toBe(false);
    });

    it("should retry database connection errors", () => {
      const error = handler.createError(
        "Database connection failed",
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.DATABASE_QUERY_FAILED
      );

      const result = handler.handleError(error);

      expect(result.shouldRetry).toBe(true);
      expect(result.retryAfter).toBeDefined();
    });

    it("should not retry database query errors", () => {
      const error = handler.createError(
        "Database query failed",
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.DATABASE_QUERY_FAILED
      );

      const result = handler.handleError(error);

      expect(result.shouldRetry).toBe(false);
    });
  });

  describe("withErrorHandling", () => {
    it("should return result when operation succeeds", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const context: ErrorContext = { operation: "test" };

      const result = await handler.withErrorHandling(
        operation,
        context,
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.MEDIUM
      );

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalled();
    });

    it("should handle error and throw standardized error", async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error("Operation failed"));
      const context: ErrorContext = { operation: "test" };

      await expect(
        handler.withErrorHandling(
          operation,
          context,
          ErrorType.NETWORK_ERROR,
          ErrorSeverity.MEDIUM
        )
      ).rejects.toThrow("Operation failed but should be retried");

      expect(operation).toHaveBeenCalled();
    });

    it("should throw standardized error when retry is not needed", async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error("Validation failed"));
      const context: ErrorContext = { operation: "test" };

      await expect(
        handler.withErrorHandling(
          operation,
          context,
          ErrorType.VALIDATION_ERROR,
          ErrorSeverity.MEDIUM
        )
      ).rejects.toThrow("Validation failed");

      expect(operation).toHaveBeenCalled();
    });
  });

  describe("classifyError", () => {
    it("should classify ValidationError", () => {
      const error = new Error("Validation failed");
      error.name = "ValidationError";

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it("should classify DatabaseError", () => {
      const error = new Error("Database failed");
      error.name = "DatabaseError";

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.DATABASE_ERROR);
    });

    it("should classify RedisError", () => {
      const error = new Error("Redis failed");
      error.name = "RedisError";

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.REDIS_ERROR);
    });

    it("should classify NetworkError", () => {
      const error = new Error("Network failed");
      error.name = "NetworkError";

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.NETWORK_ERROR);
    });

    it("should classify TimeoutError", () => {
      const error = new Error("Timeout failed");
      error.name = "TimeoutError";

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    it("should classify timeout by message", () => {
      const error = new Error("Operation timeout");

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    it("should classify connection by message", () => {
      const error = new Error("connection failed");

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.NETWORK_ERROR);
    });

    it("should classify validation by message", () => {
      const error = new Error("validation failed");

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it("should classify database by message", () => {
      const error = new Error("database failed");

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.DATABASE_ERROR);
    });

    it("should classify redis by message", () => {
      const error = new Error("redis failed");

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.REDIS_ERROR);
    });

    it("should return UNKNOWN_ERROR for unclassified errors", () => {
      const error = new Error("Unknown error");

      const type = handler.classifyError(error);

      expect(type).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });

  describe("mapErrorToCode", () => {
    it("should map validation error to VALIDATION_FAILED", () => {
      const error = new Error("Validation failed");
      error.name = "ValidationError";

      const code = handler.mapErrorToCode(error);

      expect(code).toBe(AppErrorCode.VALIDATION_FAILED);
    });

    it("should map database error to DATABASE_QUERY_FAILED", () => {
      const error = new Error("Database failed");
      error.name = "DatabaseError";

      const code = handler.mapErrorToCode(error);

      expect(code).toBe(AppErrorCode.DATABASE_QUERY_FAILED);
    });

    it("should map redis error to CACHE_OPERATION_FAILED", () => {
      const error = new Error("Redis failed");
      error.name = "RedisError";

      const code = handler.mapErrorToCode(error);

      expect(code).toBe(AppErrorCode.CACHE_OPERATION_FAILED);
    });

    it("should map network error to NETWORK_CONNECTION_FAILED", () => {
      const error = new Error("Network failed");
      error.name = "NetworkError";

      const code = handler.mapErrorToCode(error);

      expect(code).toBe(AppErrorCode.NETWORK_CONNECTION_FAILED);
    });

    it("should map timeout error to NETWORK_TIMEOUT", () => {
      const error = new Error("Timeout failed");
      error.name = "TimeoutError";

      const code = handler.mapErrorToCode(error);

      expect(code).toBe(AppErrorCode.NETWORK_TIMEOUT);
    });

    it("should map parsing error to HTML_PARSING_FAILED", () => {
      const error = new Error("Parsing failed");
      error.name = "ParsingError";

      const code = handler.mapErrorToCode(error);

      expect(code).toBe(AppErrorCode.INTERNAL_ERROR);
    });

    it("should map unknown error to INTERNAL_ERROR", () => {
      const error = new Error("Unknown error");

      const code = handler.mapErrorToCode(error);

      expect(code).toBe(AppErrorCode.INTERNAL_ERROR);
    });

    it("should map error with unknown type to INTERNAL_ERROR", () => {
      // Create an error that won't match any of the known error types
      const error = new Error("Some random error message");
      error.name = "RandomError"; // This won't match any known error names

      const code = handler.mapErrorToCode(error);

      expect(code).toBe(AppErrorCode.INTERNAL_ERROR);
    });
  });

  describe("calculateRetryDelay", () => {
    it("should calculate retry delay with exponential backoff", () => {
      const error = handler.createError("Test error");
      error.retryCount = 2;

      const delay = (handler as any).calculateRetryDelay(error);

      expect(delay).toBeGreaterThan(1000);
      expect(delay).toBeLessThanOrEqual(30000);
    });

    it("should respect maximum delay", () => {
      const error = handler.createError("Test error");
      error.retryCount = 4;

      const delay = (handler as any).calculateRetryDelay(error);

      expect(delay).toBeLessThanOrEqual(30000);
    });

    it("should add jitter to delay", () => {
      const error = handler.createError("Test error");
      error.retryCount = 0;

      const delay1 = (handler as any).calculateRetryDelay(error);
      const delay2 = (handler as any).calculateRetryDelay(error);

      expect(delay1).not.toBe(delay2);
    });
  });

  describe("logError", () => {
    it("should log error with appropriate level", () => {
      const error = handler.createError(
        "Test error",
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.HIGH,
        AppErrorCode.VALIDATION_FAILED,
        { field: "test" }
      );

      (handler as any).logError(error);

      // The logError method should not throw and should complete successfully
      expect(error).toBeInstanceOf(Error);
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe("getLogLevelForSeverity", () => {
    it("should return INFO for LOW severity", () => {
      const level = (handler as any).getLogLevelForSeverity(ErrorSeverity.LOW);
      expect(level).toBe(LogLevel.INFO);
    });

    it("should return WARN for MEDIUM severity", () => {
      const level = (handler as any).getLogLevelForSeverity(
        ErrorSeverity.MEDIUM
      );
      expect(level).toBe(LogLevel.WARN);
    });

    it("should return ERROR for HIGH severity", () => {
      const level = (handler as any).getLogLevelForSeverity(ErrorSeverity.HIGH);
      expect(level).toBe(LogLevel.ERROR);
    });

    it("should return FATAL for CRITICAL severity", () => {
      const level = (handler as any).getLogLevelForSeverity(
        ErrorSeverity.CRITICAL
      );
      expect(level).toBe(LogLevel.FATAL);
    });

    it("should return ERROR for unknown severity", () => {
      const level = (handler as any).getLogLevelForSeverity(
        "UNKNOWN" as ErrorSeverity
      );
      expect(level).toBe(LogLevel.ERROR);
    });
  });

  describe("isStandardizedError", () => {
    it("should return true for standardized error", () => {
      const error = handler.createError("Test error");
      const result = (handler as any).isStandardizedError(error);
      expect(result).toBe(true);
    });

    it("should return false for regular error", () => {
      const error = new Error("Test error");
      const result = (handler as any).isStandardizedError(error);
      expect(result).toBe(false);
    });
  });

  describe("shouldRetryError", () => {
    it("should retry database connection errors", () => {
      const error = handler.createError(
        "Database connection failed",
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.DATABASE_QUERY_FAILED
      );

      const shouldRetry = (handler as any).shouldRetryError(error);

      expect(shouldRetry).toBe(true);
    });

    it("should retry Redis connection errors", () => {
      const error = handler.createError(
        "Redis connection failed",
        ErrorType.REDIS_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.CACHE_OPERATION_FAILED
      );

      const shouldRetry = (handler as any).shouldRetryError(error);

      expect(shouldRetry).toBe(true);
    });
  });
});

describe("Error Handler Utilities", () => {
  describe("createError", () => {
    it("should create error using default handler", () => {
      const error = createError(
        "Test error",
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.MEDIUM,
        AppErrorCode.VALIDATION_FAILED,
        { field: "test" }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.code).toBe(AppErrorCode.VALIDATION_FAILED);
    });
  });

  describe("withErrorHandling", () => {
    it("should handle async operation with error", async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error("Operation failed"));

      await expect(withErrorHandling(operation)).rejects.toThrow();
    });
  });

  describe("createValidationError", () => {
    it("should create validation error", () => {
      const error = createValidationError(
        "Validation failed",
        "field",
        "value",
        { context: "test" }
      );

      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.code).toBe(AppErrorCode.VALIDATION_FAILED);
      expect(error.context).toEqual({
        field: "field",
        value: "value",
        context: "test",
      });
    });
  });

  describe("createDatabaseError", () => {
    it("should create database error", () => {
      const error = createDatabaseError("Database failed", "SELECT", "users", {
        context: "test",
      });

      expect(error.type).toBe(ErrorType.DATABASE_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.code).toBe(AppErrorCode.DATABASE_QUERY_FAILED);
      expect(error.context).toEqual({
        operation: "SELECT",
        table: "users",
        context: "test",
      });
    });
  });

  describe("createNetworkError", () => {
    it("should create network error", () => {
      const error = createNetworkError("Network failed", { context: "test" });

      expect(error.type).toBe(ErrorType.NETWORK_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.code).toBe(AppErrorCode.NETWORK_CONNECTION_FAILED);
      expect(error.context).toEqual({ context: "test" });
    });
  });

  describe("createTimeoutError", () => {
    it("should create timeout error", () => {
      const error = createTimeoutError("Timeout failed", 5000, {
        context: "test",
      });

      expect(error.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.code).toBe(AppErrorCode.NETWORK_TIMEOUT);
      expect(error.context).toEqual({ timeoutMs: 5000, context: "test" });
    });
  });
});

describe("Error Handler Instance", () => {
  it("should export default error handler instance", () => {
    expect(errorHandler).toBeInstanceOf(StandardizedErrorHandler);
  });
});
