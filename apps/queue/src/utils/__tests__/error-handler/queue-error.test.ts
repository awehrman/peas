import { describe, it, expect } from "vitest";
import { QueueError } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";
import type { JobError } from "../../../types";

describe("QueueError", () => {
  it("should instantiate with a JobError and expose it", () => {
    const jobError: JobError = {
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: "Test error",
      timestamp: new Date(),
    };
    const err = new QueueError(jobError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("QueueError");
    expect(err.jobError).toBe(jobError);
    expect(err.message).toBe("Test error");
  });

  it("should handle JobError with all properties", () => {
    const jobError: JobError = {
      type: ErrorType.DATABASE_ERROR,
      severity: ErrorSeverity.HIGH,
      message: "Database connection failed",
      code: "DB_CONN_001",
      context: { table: "users", operation: "select" },
      originalError: new Error("Connection timeout"),
      timestamp: new Date(),
      jobId: "job-123",
      queueName: "note-queue",
      retryCount: 2,
    };
    const err = new QueueError(jobError);
    expect(err.jobError).toBe(jobError);
    expect(err.message).toBe("Database connection failed");
  });

  it("should handle JobError with minimal properties", () => {
    const jobError: JobError = {
      type: ErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.LOW,
      message: "Invalid input",
      timestamp: new Date(),
    };
    const err = new QueueError(jobError);
    expect(err.jobError).toBe(jobError);
    expect(err.message).toBe("Invalid input");
  });

  it("should maintain error stack trace", () => {
    const jobError: JobError = {
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: "Test error",
      timestamp: new Date(),
    };
    const err = new QueueError(jobError);
    expect(err.stack).toBeDefined();
    expect(typeof err.stack).toBe("string");
  });

  it("should handle different error types", () => {
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
      const jobError: JobError = {
        type,
        severity: ErrorSeverity.MEDIUM,
        message: `Test ${type}`,
        timestamp: new Date(),
      };
      const err = new QueueError(jobError);
      expect(err.jobError.type).toBe(type);
    });
  });

  it("should handle different error severities", () => {
    const severities = [
      ErrorSeverity.LOW,
      ErrorSeverity.MEDIUM,
      ErrorSeverity.HIGH,
      ErrorSeverity.CRITICAL,
    ];

    severities.forEach((severity) => {
      const jobError: JobError = {
        type: ErrorType.UNKNOWN_ERROR,
        severity,
        message: `Test ${severity}`,
        timestamp: new Date(),
      };
      const err = new QueueError(jobError);
      expect(err.jobError.severity).toBe(severity);
    });
  });
});
