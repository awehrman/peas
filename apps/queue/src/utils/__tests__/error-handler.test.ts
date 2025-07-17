import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorHandler, QueueError } from "../error-handler";
import { ErrorType, ErrorSeverity } from "../../types";
import type { JobError, ValidationError, RetryConfig } from "../../types";
import { validateJobData as validateJobDataFn } from "../error-handler";

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
});

describe("ErrorHandler", () => {
  describe("createJobError", () => {
    it("should create a JobError from a string", () => {
      const jobError = ErrorHandler.createJobError(
        "msg",
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.LOW,
        { foo: 1 }
      );
      expect(jobError.message).toBe("msg");
      expect(jobError.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.LOW);
      expect(jobError.context).toEqual({ foo: 1 });
      expect(jobError.timestamp).toBeInstanceOf(Date);
      expect(jobError.originalError).toBeUndefined();
    });
    it("should create a JobError from an Error", () => {
      const err = new Error("err");
      const jobError = ErrorHandler.createJobError(
        err,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH
      );
      expect(jobError.message).toBe("err");
      expect(jobError.type).toBe(ErrorType.DATABASE_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
      expect(jobError.originalError).toBe(err);
    });
  });

  describe("createValidationError", () => {
    it("should create a ValidationError", () => {
      const valErr = ErrorHandler.createValidationError("bad", "field", 42, {
        bar: 2,
      });
      expect(valErr.message).toBe("bad");
      expect(valErr.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(valErr.severity).toBe(ErrorSeverity.LOW);
      expect(valErr.field).toBe("field");
      expect(valErr.value).toBe(42);
      expect(valErr.context).toEqual({ bar: 2 });
    });
  });

  describe("createDatabaseError", () => {
    it("should create a DatabaseError", () => {
      const err = new Error("dbfail");
      const dbErr = ErrorHandler.createDatabaseError(err, "insert", "users", {
        baz: 3,
      });
      expect(dbErr.message).toBe("dbfail");
      expect(dbErr.type).toBe(ErrorType.DATABASE_ERROR);
      expect(dbErr.severity).toBe(ErrorSeverity.HIGH);
      expect(dbErr.operation).toBe("insert");
      expect(dbErr.table).toBe("users");
      expect(dbErr.context).toEqual({ baz: 3 });
    });
  });

  describe("shouldRetry", () => {
    const baseError: JobError = {
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: "msg",
      timestamp: new Date(),
    };
    it("should return false if retryCount >= maxRetries", () => {
      expect(ErrorHandler.shouldRetry(baseError, 3, { maxRetries: 3 })).toBe(
        false
      );
    });
    it("should return false for validation errors", () => {
      const err = { ...baseError, type: ErrorType.VALIDATION_ERROR };
      expect(ErrorHandler.shouldRetry(err, 0)).toBe(false);
    });
    it("should return false for critical errors", () => {
      const err = { ...baseError, severity: ErrorSeverity.CRITICAL };
      expect(ErrorHandler.shouldRetry(err, 0)).toBe(false);
    });
    it("should return true for retryable errors", () => {
      expect(ErrorHandler.shouldRetry(baseError, 0)).toBe(true);
    });
  });

  describe("calculateBackoff", () => {
    it("should calculate exponential backoff and cap at maxBackoffMs", () => {
      const config: Partial<RetryConfig> = {
        backoffMs: 100,
        backoffMultiplier: 2,
        maxBackoffMs: 500,
      };
      expect(ErrorHandler.calculateBackoff(0, config)).toBe(100);
      expect(ErrorHandler.calculateBackoff(1, config)).toBe(200);
      expect(ErrorHandler.calculateBackoff(2, config)).toBe(400);
      expect(ErrorHandler.calculateBackoff(3, config)).toBe(500); // capped
    });
  });

  describe("logError", () => {
    let error: JobError;
    beforeEach(() => {
      error = {
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: "msg",
        timestamp: new Date(),
      };
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });
    it("should log critical errors with console.error", () => {
      error.severity = ErrorSeverity.CRITICAL;
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      ErrorHandler.logError(error);
      expect(spy).toHaveBeenCalled();
    });
    it("should log high severity errors with console.error", () => {
      error.severity = ErrorSeverity.HIGH;
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      ErrorHandler.logError(error);
      expect(spy).toHaveBeenCalled();
    });
    it("should log medium severity errors with console.warn", () => {
      error.severity = ErrorSeverity.MEDIUM;
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      ErrorHandler.logError(error);
      expect(spy).toHaveBeenCalled();
    });
    it("should log low severity errors with console.info", () => {
      error.severity = ErrorSeverity.LOW;
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      ErrorHandler.logError(error);
      expect(spy).toHaveBeenCalled();
    });
    it("should merge additionalContext into context", () => {
      error.severity = ErrorSeverity.LOW;
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      ErrorHandler.logError(error, { extra: 1 });
      if (spy.mock.calls[0]) {
        const callArg = spy.mock.calls[0][1];
        expect(callArg).toContain("extra");
      }
    });
  });

  describe("classifyError", () => {
    it("should classify database errors", () => {
      const err = new Error("Prisma database SQL error");
      const jobError = ErrorHandler.classifyError(err);
      expect(jobError.type).toBe(ErrorType.DATABASE_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
    });
    it("should classify redis errors", () => {
      const err = new Error("Redis connection failed");
      const jobError = ErrorHandler.classifyError(err);
      expect(jobError.type).toBe(ErrorType.REDIS_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.HIGH);
    });
    it("should classify network errors", () => {
      const err = new Error("Network timeout econnrefused");
      const jobError = ErrorHandler.classifyError(err);
      expect(jobError.type).toBe(ErrorType.NETWORK_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });
    it("should classify timeout errors", () => {
      const err = new Error("timed out");
      const jobError = ErrorHandler.classifyError(err);
      expect(jobError.type).toBe(ErrorType.TIMEOUT_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });
    it("should classify external service errors", () => {
      const err = new Error("API service HTTP error");
      const jobError = ErrorHandler.classifyError(err);
      expect(jobError.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });
    it("should classify unknown errors", () => {
      const err = new Error("something else");
      const jobError = ErrorHandler.classifyError(err);
      expect(jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
      expect(jobError.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe("withErrorHandling", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });
    it("should return result if operation succeeds", async () => {
      const result = await ErrorHandler.withErrorHandling(async () => 42);
      expect(result).toBe(42);
    });
    it("should log and throw QueueError if operation fails", async () => {
      vi.spyOn(ErrorHandler, "logError").mockImplementation(() => {});
      const op = async () => {
        throw new Error("fail");
      };
      await expect(ErrorHandler.withErrorHandling(op)).rejects.toBeInstanceOf(
        QueueError
      );
    });
  });

  describe("validateJobData", () => {
    it("should return null if all required fields are present", () => {
      const data = { a: 1, b: 2 };
      expect(
        ErrorHandler.validateJobData<typeof data>(data, ["a", "b"])
      ).toBeNull();
    });
    it("should return ValidationError if a field is missing", () => {
      const data = { a: 1 };
      // Use a generic object type to avoid type error
      const err = ErrorHandler.validateJobData<{ [key: string]: unknown }>(
        data,
        ["a", "b"]
      );
      expect(err).not.toBeNull();
      if (err) {
        expect((err as ValidationError).field).toBe("b");
      }
    });
  });
});

describe("validateJobData (function)", () => {
  it("should return error if note is missing", () => {
    expect(validateJobDataFn({})).toMatchObject({
      message: expect.any(String),
    });
    expect(validateJobDataFn(null)).toMatchObject({
      message: expect.any(String),
    });
  });
  it("should return null if note is present", () => {
    expect(validateJobDataFn({ note: 1 })).toBeNull();
  });
});
