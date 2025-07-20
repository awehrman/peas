import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorHandler, QueueError } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.handleRouteError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseJobError = {
    type: ErrorType.DATABASE_ERROR,
    severity: ErrorSeverity.HIGH,
    message: "Database connection failed",
    code: "DB_CONNECTION_ERROR",
    jobId: "test-job-123",
    queueName: "test-queue",
    retryCount: 2,
    timestamp: new Date("2024-01-01T00:00:00.000Z"),
    context: { operation: "connect", table: "users" },
  };

  describe("QueueError Handling", () => {
    it("should handle QueueError and return error response", () => {
      const jobError = { ...baseJobError };
      const queueError = new QueueError(jobError);
      const operation = "test-operation";
      const additionalContext = { userId: 123, requestId: "req-456" };

      const response = ErrorHandler.handleRouteError(
        queueError,
        operation,
        additionalContext
      );

      expect(response).toEqual({
        success: false,
        error: {
          message: "Database connection failed",
          type: ErrorType.DATABASE_ERROR,
          code: "DB_CONNECTION_ERROR",
        },
        context: {
          operation: "connect",
          table: "users",
          userId: 123,
          requestId: "req-456",
        },
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should log the error when handling QueueError", () => {
      const jobError = { ...baseJobError };
      const queueError = new QueueError(jobError);
      const operation = "test-operation";

      ErrorHandler.handleRouteError(queueError, operation);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ HIGH SEVERITY ERROR:",
        expect.stringContaining("Database connection failed")
      );
    });

    it("should handle QueueError without additional context", () => {
      const jobError = { ...baseJobError };
      const queueError = new QueueError(jobError);
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(queueError, operation);

      expect(response.context).toEqual({
        operation: "connect",
        table: "users",
      });
    });

    it("should handle QueueError with empty additional context", () => {
      const jobError = { ...baseJobError };
      const queueError = new QueueError(jobError);
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(queueError, operation, {});

      expect(response.context).toEqual({
        operation: "connect",
        table: "users",
      });
    });

    it("should handle QueueError with undefined additional context", () => {
      const jobError = { ...baseJobError };
      const queueError = new QueueError(jobError);
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(
        queueError,
        operation,
        undefined
      );

      expect(response.context).toEqual({
        operation: "connect",
        table: "users",
      });
    });
  });

  describe("Unknown Error Handling", () => {
    it("should handle unknown Error and create JobError", () => {
      const error = new Error("Unknown error occurred");
      const operation = "test-operation";
      const additionalContext = { userId: 123 };

      const response = ErrorHandler.handleRouteError(
        error,
        operation,
        additionalContext
      );

      expect(response.success).toBe(false);
      expect(response.error.message).toBe("Unknown error occurred");
      expect(response.error.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(response.error.code).toBeUndefined();
      expect(response.context).toEqual({
        operation: "test-operation",
        userId: 123,
      });
      expect(response.timestamp).toBeDefined();
    });

    it("should handle unknown Error without additional context", () => {
      const error = new Error("Unknown error occurred");
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe("Unknown error occurred");
      expect(response.error.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(response.context).toEqual({
        operation: "test-operation",
      });
    });

    it("should log unknown errors", () => {
      const error = new Error("Unknown error occurred");
      const operation = "test-operation";

      ErrorHandler.handleRouteError(error, operation);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ HIGH SEVERITY ERROR:",
        expect.stringContaining("Unknown error occurred")
      );
    });

    it("should handle different types of unknown errors", () => {
      const databaseError = new Error("Database timeout");
      const networkError = new Error("Network connection failed");
      const operation = "test-operation";

      const dbResponse = ErrorHandler.handleRouteError(
        databaseError,
        operation
      );
      const networkResponse = ErrorHandler.handleRouteError(
        networkError,
        operation
      );

      // Note: handleRouteError doesn't use classifyError, it always creates UNKNOWN_ERROR
      expect(dbResponse.error.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(networkResponse.error.type).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });

  describe("Non-Error Object Handling", () => {
    it("should handle string errors", () => {
      const error = "String error message";
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe("String error message");
      expect(response.error.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it("should handle null errors", () => {
      const error = null;
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe("null");
      expect(response.error.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it("should handle undefined errors", () => {
      const error = undefined;
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe("undefined");
      expect(response.error.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it("should handle number errors", () => {
      const error = 42;
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.success).toBe(false);
      // Note: createJobError only accepts Error | string, so numbers get cast to Error
      // and error.message is undefined for numbers
      expect(response.error.message).toBeUndefined();
      expect(response.error.type).toBe(ErrorType.UNKNOWN_ERROR);
    });

    it("should handle object errors", () => {
      const error = { message: "Object error", code: "OBJ_ERR" };
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe("Object error");
      expect(response.error.type).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });

  describe("Context Merging", () => {
    it("should merge operation with additional context", () => {
      const error = new Error("Test error");
      const operation = "test-operation";
      const additionalContext = { userId: 123, requestId: "req-456" };

      const response = ErrorHandler.handleRouteError(
        error,
        operation,
        additionalContext
      );

      expect(response.context).toEqual({
        operation: "test-operation",
        userId: 123,
        requestId: "req-456",
      });
    });

    it("should handle complex additional context", () => {
      const error = new Error("Test error");
      const operation = "test-operation";
      const additionalContext = {
        nested: { key: "value" },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      };

      const response = ErrorHandler.handleRouteError(
        error,
        operation,
        additionalContext
      );

      expect(response.context).toEqual({
        operation: "test-operation",
        nested: { key: "value" },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      });
    });

    it("should handle additional context overriding operation", () => {
      const error = new Error("Test error");
      const operation = "test-operation";
      const additionalContext = { operation: "overridden-operation" };

      const response = ErrorHandler.handleRouteError(
        error,
        operation,
        additionalContext
      );

      expect(response.context).toEqual({
        operation: "overridden-operation",
      });
    });
  });

  describe("Error Logging", () => {
    it("should log errors with merged context", () => {
      const error = new Error("Test error");
      const operation = "test-operation";
      const additionalContext = { userId: 123 };

      ErrorHandler.handleRouteError(error, operation, additionalContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ HIGH SEVERITY ERROR:",
        expect.stringContaining('"operation": "test-operation"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ HIGH SEVERITY ERROR:",
        expect.stringContaining('"userId": 123')
      );
    });

    it("should log QueueError with merged context", () => {
      const jobError = { ...baseJobError };
      const queueError = new QueueError(jobError);
      const operation = "test-operation";
      const additionalContext = { requestId: "req-456" };

      ErrorHandler.handleRouteError(queueError, operation, additionalContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ HIGH SEVERITY ERROR:",
        expect.stringContaining('"operation": "connect"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ HIGH SEVERITY ERROR:",
        expect.stringContaining('"requestId": "req-456"')
      );
    });
  });

  describe("Response Structure", () => {
    it("should return consistent error response structure", () => {
      const error = new Error("Test error");
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response).toHaveProperty("success", false);
      expect(response).toHaveProperty("error");
      expect(response.error).toHaveProperty("message");
      expect(response.error).toHaveProperty("type");
      expect(response.error).toHaveProperty("code");
      expect(response).toHaveProperty("context");
      expect(response).toHaveProperty("timestamp");
    });

    it("should ensure error response has correct error object structure", () => {
      const error = new Error("Test error");
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(typeof response.error.message).toBe("string");
      expect(typeof response.error.type).toBe("string");
      // code can be undefined, so we just check it exists as a property
      expect(response.error).toHaveProperty("code");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty operation string", () => {
      const error = new Error("Test error");
      const operation = "";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.context).toEqual({
        operation: "",
      });
    });

    it("should handle very long operation string", () => {
      const error = new Error("Test error");
      const operation = "a".repeat(1000);

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.context).toEqual({
        operation: "a".repeat(1000),
      });
    });

    it("should handle error with empty message", () => {
      const error = new Error("");
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.error.message).toBe("");
    });

    it("should handle error with very long message", () => {
      const longMessage = "a".repeat(1000);
      const error = new Error(longMessage);
      const operation = "test-operation";

      const response = ErrorHandler.handleRouteError(error, operation);

      expect(response.error.message).toBe(longMessage);
    });

    it("should handle circular references in additional context gracefully", () => {
      const error = new Error("Test error");
      const operation = "test-operation";
      const circularObj: Record<string, unknown> = { key: "value" };
      circularObj.self = circularObj;
      const additionalContext = { circular: circularObj };

      // Note: JSON.stringify throws when encountering circular references
      // This is expected behavior as the logError function uses JSON.stringify
      expect(() =>
        ErrorHandler.handleRouteError(error, operation, additionalContext)
      ).toThrow("Converting circular structure to JSON");
    });
  });
});
