import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.createJobError", () => {
  describe("String Input", () => {
    it("should create a JobError from a string with default values", () => {
      const jobError = ErrorHandler.createJobError("Test error message");

      expect(jobError.message).toBe("Test error message");
      expect(jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(jobError.context).toBeUndefined();
      expect(jobError.timestamp).toBeInstanceOf(Date);
      expect(jobError.originalError).toBeUndefined();
    });

    it("should create a JobError from a string with custom type and severity", () => {
      const jobError = ErrorHandler.createJobError(
        "Validation failed",
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.LOW,
        { field: "email", value: "invalid" }
      );

      expect(jobError.message).toBe("Validation failed");
      expect(jobError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.LOW);
      expect(jobError.context).toEqual({ field: "email", value: "invalid" });
      expect(jobError.timestamp).toBeInstanceOf(Date);
      expect(jobError.originalError).toBeUndefined();
    });

    it("should create a JobError from empty string", () => {
      const jobError = ErrorHandler.createJobError("");

      expect(jobError.message).toBe("");
      expect(jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should create a JobError from string with special characters", () => {
      const message =
        "Error with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
      const jobError = ErrorHandler.createJobError(message);

      expect(jobError.message).toBe(message);
    });

    it("should create a JobError from string with unicode characters", () => {
      const message = "Error with unicode: 🍕🍔🌮 中文 Español Français";
      const jobError = ErrorHandler.createJobError(message);

      expect(jobError.message).toBe(message);
    });
  });

  describe("Error Object Input", () => {
    it("should create a JobError from an Error object with default values", () => {
      const originalError = new Error("Database connection failed");
      const jobError = ErrorHandler.createJobError(originalError);

      expect(jobError.message).toBe("Database connection failed");
      expect(jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
      expect(jobError.context).toBeUndefined();
      expect(jobError.timestamp).toBeInstanceOf(Date);
      expect(jobError.originalError).toBe(originalError);
    });

    it("should create a JobError from an Error object with custom type and severity", () => {
      const originalError = new Error("Network timeout");
      const jobError = ErrorHandler.createJobError(
        originalError,
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.HIGH,
        { endpoint: "/api/users", timeout: 5000 }
      );

      expect(jobError.message).toBe("Network timeout");
      expect(jobError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
      expect(jobError.context).toEqual({
        endpoint: "/api/users",
        timeout: 5000,
      });
      expect(jobError.originalError).toBe(originalError);
    });

    it("should create a JobError from Error with stack trace", () => {
      const originalError = new Error("Test error");
      originalError.stack = "Error: Test error\n    at test.js:1:1";
      const jobError = ErrorHandler.createJobError(originalError);

      expect(jobError.originalError).toBe(originalError);
      expect(jobError.originalError?.stack).toBe(
        "Error: Test error\n    at test.js:1:1"
      );
    });

    it("should create a JobError from Error with custom name", () => {
      const originalError = new Error("Custom error");
      originalError.name = "CustomError";
      const jobError = ErrorHandler.createJobError(originalError);

      expect(jobError.originalError).toBe(originalError);
      expect(jobError.originalError?.name).toBe("CustomError");
    });

    it("should create a JobError from Error with empty message", () => {
      const originalError = new Error("");
      const jobError = ErrorHandler.createJobError(originalError);

      expect(jobError.message).toBe("");
      expect(jobError.originalError).toBe(originalError);
    });
  });

  describe("Error Types", () => {
    it("should handle all error types", () => {
      const errorTypes = [
        ErrorType.VALIDATION_ERROR,
        ErrorType.DATABASE_ERROR,
        ErrorType.REDIS_ERROR,
        ErrorType.PARSING_ERROR,
        ErrorType.EXTERNAL_SERVICE_ERROR,
        ErrorType.NETWORK_ERROR,
        ErrorType.TIMEOUT_ERROR,
        ErrorType.WORKER_ERROR,
        ErrorType.UNKNOWN_ERROR,
      ];

      errorTypes.forEach((type) => {
        const jobError = ErrorHandler.createJobError("Test error", type);
        expect(jobError.type).toBe(type);
      });
    });
  });

  describe("Error Severities", () => {
    it("should handle all error severities", () => {
      const severities = [
        ErrorSeverity.LOW,
        ErrorSeverity.MEDIUM,
        ErrorSeverity.HIGH,
        ErrorSeverity.CRITICAL,
      ];

      severities.forEach((severity) => {
        const jobError = ErrorHandler.createJobError(
          "Test error",
          ErrorType.UNKNOWN_ERROR,
          severity
        );
        expect(jobError.severity).toBe(severity);
      });
    });
  });

  describe("Context Handling", () => {
    it("should handle undefined context", () => {
      const jobError = ErrorHandler.createJobError(
        "Test error",
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.MEDIUM,
        undefined
      );
      expect(jobError.context).toBeUndefined();
    });

    it("should handle null context", () => {
      const jobError = ErrorHandler.createJobError(
        "Test error",
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.MEDIUM,
        null as unknown as Record<string, unknown>
      );
      expect(jobError.context).toBeNull();
    });

    it("should handle empty context object", () => {
      const jobError = ErrorHandler.createJobError(
        "Test error",
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.MEDIUM,
        {}
      );
      expect(jobError.context).toEqual({});
    });

    it("should handle complex context object", () => {
      const context = {
        userId: 123,
        operation: "create",
        metadata: {
          source: "api",
          version: "1.0.0",
        },
        array: [1, 2, 3],
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
      };
      const jobError = ErrorHandler.createJobError(
        "Test error",
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.MEDIUM,
        context
      );
      expect(jobError.context).toEqual(context);
    });

    it("should handle context with nested objects", () => {
      const context = {
        request: {
          method: "POST",
          url: "/api/users",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer token",
          },
        },
        response: {
          status: 500,
          body: "Internal Server Error",
        },
      };
      const jobError = ErrorHandler.createJobError(
        "Test error",
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.MEDIUM,
        context
      );
      expect(jobError.context).toEqual(context);
    });
  });

  describe("Timestamp Handling", () => {
    it("should create timestamp when called", () => {
      const before = new Date();
      const jobError = ErrorHandler.createJobError("Test error");
      const after = new Date();

      expect(jobError.timestamp).toBeInstanceOf(Date);
      expect(jobError.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(jobError.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should create unique timestamps for different calls", async () => {
      const jobError1 = ErrorHandler.createJobError("Error 1");
      await new Promise((r) => setTimeout(r, 2));
      const jobError2 = ErrorHandler.createJobError("Error 2");

      expect(jobError1.timestamp).not.toEqual(jobError2.timestamp);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long error messages", () => {
      const longMessage = "A".repeat(10000);
      const jobError = ErrorHandler.createJobError(longMessage);

      expect(jobError.message).toBe(longMessage);
    });

    it("should handle error with only whitespace", () => {
      const jobError = ErrorHandler.createJobError("   \n\t   ");

      expect(jobError.message).toBe("   \n\t   ");
    });

    it("should handle error with newlines and special characters", () => {
      const message = "Error with\nnewlines\r\nand\ttabs";
      const jobError = ErrorHandler.createJobError(message);

      expect(jobError.message).toBe(message);
    });
  });
});
