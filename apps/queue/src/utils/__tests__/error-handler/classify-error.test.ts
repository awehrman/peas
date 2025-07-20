import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.classifyError", () => {
  describe("Database Errors", () => {
    it("should classify database errors", () => {
      const error = new Error("Database connection failed");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.DATABASE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.message).toBe("Database connection failed");
    });

    it("should classify Prisma errors", () => {
      const error = new Error("Prisma client error");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.DATABASE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should classify SQL errors", () => {
      const error = new Error("SQL syntax error");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.DATABASE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should handle case insensitive database error messages", () => {
      const error = new Error("DATABASE TIMEOUT");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.DATABASE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe("Redis Errors", () => {
    it("should classify Redis errors", () => {
      const error = new Error("Redis connection failed");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.REDIS_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.message).toBe("Redis connection failed");
    });

    it("should classify connection errors as Redis errors", () => {
      const error = new Error("Connection refused");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.REDIS_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should handle case insensitive Redis error messages", () => {
      const error = new Error("REDIS TIMEOUT");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.REDIS_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe("Network Errors", () => {
    it("should classify network errors", () => {
      const error = new Error("Network timeout");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.message).toBe("Network timeout");
    });

    it("should classify timeout errors as network errors", () => {
      const error = new Error("Request timeout");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should classify ECONNREFUSED errors", () => {
      const error = new Error("ECONNREFUSED");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should handle case insensitive network error messages", () => {
      const error = new Error("NETWORK ERROR");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe("Timeout Errors", () => {
    it("should classify timeout errors", () => {
      const error = new Error("Operation timed out");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.message).toBe("Operation timed out");
    });

    it("should classify 'timed out' errors", () => {
      const error = new Error("Request timed out");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should handle case insensitive timeout error messages", () => {
      const error = new Error("TIMEOUT occurred during operation");

      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe("External Service Errors", () => {
    it("should classify API errors", () => {
      const error = new Error("API rate limit exceeded");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.message).toBe("API rate limit exceeded");
    });

    it("should classify service errors", () => {
      const error = new Error("External service unavailable");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should classify HTTP errors", () => {
      const error = new Error("HTTP 500 error");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should handle case insensitive external service error messages", () => {
      const error = new Error("API ERROR");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe("Unknown Errors", () => {
    it("should classify unknown errors as default", () => {
      const error = new Error("Some random error");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.message).toBe("Some random error");
    });

    it("should classify errors with no matching patterns", () => {
      const error = new Error("Custom application error");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should handle empty error messages", () => {
      const error = new Error("");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.message).toBe("");
    });
  });

  describe("Error Priority and Overlap", () => {
    it("should prioritize database errors over network errors", () => {
      const error = new Error("Database network timeout");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.DATABASE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should prioritize Redis errors over connection errors", () => {
      const error = new Error("Redis connection timeout");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.REDIS_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
    });

    it("should prioritize timeout errors over network errors", () => {
      const error = new Error("Network timeout error");

      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should prioritize external service errors over generic errors", () => {
      const error = new Error("API service error");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe("Error Object Properties", () => {
    it("should preserve original error object", () => {
      const originalError = new Error("Test error");
      originalError.name = "TestError";
      originalError.stack = "test stack";

      const result = ErrorHandler.classifyError(originalError);

      expect(result.originalError).toBe(originalError);
      expect(result.originalError?.name).toBe("TestError");
      expect(result.originalError?.stack).toBe("test stack");
    });

    it("should set timestamp", () => {
      const error = new Error("Test error");
      const result = ErrorHandler.classifyError(error);

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    it("should not set context by default", () => {
      const error = new Error("Test error");
      const result = ErrorHandler.classifyError(error);

      expect(result.context).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle errors with special characters", () => {
      const error = new Error("Error with special chars: \n\t\r\"'\\");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe("Error with special chars: \n\t\r\"'\\");
    });

    it("should handle very long error messages", () => {
      const longMessage = "a".repeat(1000);
      const error = new Error(longMessage);
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe(longMessage);
    });

    it("should handle errors with unicode characters", () => {
      const error = new Error("Error with unicode: 🚨❌⚠️ℹ️");
      const result = ErrorHandler.classifyError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(result.message).toBe("Error with unicode: 🚨❌⚠️ℹ️");
    });
  });
});
