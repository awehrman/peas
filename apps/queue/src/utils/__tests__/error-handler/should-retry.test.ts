import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.shouldRetry", () => {
  const baseJobError = {
    id: "test-error-123",
    type: ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: "Test error",
    code: "TEST_ERROR",
    jobId: "test-job-123",
    queueName: "test-queue",
    retryCount: 0,
    timestamp: new Date(),
    context: {},
  };

  describe("Retry Count Limits", () => {
    it("should return true when retry count is below max", () => {
      const jobError = { ...baseJobError, retryCount: 2 };
      const result = ErrorHandler.shouldRetry(jobError, 2);
      expect(result).toBe(true);
    });

    it("should return false when retry count equals max", () => {
      const jobError = { ...baseJobError, retryCount: 3 };
      const result = ErrorHandler.shouldRetry(jobError, 3);
      expect(result).toBe(false);
    });

    it("should return false when retry count exceeds max", () => {
      const jobError = { ...baseJobError, retryCount: 4 };
      const result = ErrorHandler.shouldRetry(jobError, 4);
      expect(result).toBe(false);
    });

    it("should use custom max retries from config", () => {
      const jobError = { ...baseJobError, retryCount: 5 };
      const result = ErrorHandler.shouldRetry(jobError, 5, { maxRetries: 6 });
      expect(result).toBe(true);
    });
  });

  describe("Error Type Filtering", () => {
    it("should return false for validation errors", () => {
      const jobError = { ...baseJobError, type: ErrorType.VALIDATION_ERROR };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(false);
    });

    it("should return true for other error types", () => {
      const jobError = { ...baseJobError, type: ErrorType.DATABASE_ERROR };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(true);
    });

    it("should return true for unknown errors", () => {
      const jobError = { ...baseJobError, type: ErrorType.UNKNOWN_ERROR };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(true);
    });
  });

  describe("Error Severity Filtering", () => {
    it("should return false for critical errors", () => {
      const jobError = { ...baseJobError, severity: ErrorSeverity.CRITICAL };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(false);
    });

    it("should return true for high severity errors", () => {
      const jobError = { ...baseJobError, severity: ErrorSeverity.HIGH };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(true);
    });

    it("should return true for medium severity errors", () => {
      const jobError = { ...baseJobError, severity: ErrorSeverity.MEDIUM };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(true);
    });

    it("should return true for low severity errors", () => {
      const jobError = { ...baseJobError, severity: ErrorSeverity.LOW };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(true);
    });
  });

  describe("Combined Scenarios", () => {
    it("should return false for validation error even with low retry count", () => {
      const jobError = {
        ...baseJobError,
        type: ErrorType.VALIDATION_ERROR,
        retryCount: 0,
      };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(false);
    });

    it("should return false for critical error even with low retry count", () => {
      const jobError = {
        ...baseJobError,
        severity: ErrorSeverity.CRITICAL,
        retryCount: 0,
      };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(false);
    });

    it("should return true for retryable error with low retry count", () => {
      const jobError = {
        ...baseJobError,
        type: ErrorType.NETWORK_ERROR,
        severity: ErrorSeverity.MEDIUM,
        retryCount: 1,
      };
      const result = ErrorHandler.shouldRetry(jobError, 1);
      expect(result).toBe(true);
    });

    it("should return false when both validation error and max retries reached", () => {
      const jobError = {
        ...baseJobError,
        type: ErrorType.VALIDATION_ERROR,
        retryCount: 3,
      };
      const result = ErrorHandler.shouldRetry(jobError, 3);
      expect(result).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero retry count", () => {
      const jobError = { ...baseJobError, retryCount: 0 };
      const result = ErrorHandler.shouldRetry(jobError, 0);
      expect(result).toBe(true);
    });

    it("should handle negative retry count", () => {
      const jobError = { ...baseJobError, retryCount: -1 };
      const result = ErrorHandler.shouldRetry(jobError, -1);
      expect(result).toBe(true);
    });

    it("should handle very high retry count", () => {
      const jobError = { ...baseJobError, retryCount: 1000 };
      const result = ErrorHandler.shouldRetry(jobError, 1000);
      expect(result).toBe(false);
    });

    it("should handle empty config object", () => {
      const jobError = { ...baseJobError, retryCount: 0 };
      const result = ErrorHandler.shouldRetry(jobError, 0, {});
      expect(result).toBe(true);
    });
  });
});
