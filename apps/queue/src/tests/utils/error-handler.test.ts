import { describe, it, expect, vi } from "vitest";
import { ErrorHandler, QueueError } from "../../utils/error-handler";
import { ErrorType, ErrorSeverity } from "../../types";

describe("QueueError", () => {
  it("should set name and jobError", () => {
    const jobError = {
      message: "fail",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    };
    const err = new QueueError(jobError as any);
    expect(err.name).toBe("QueueError");
    expect(err.jobError).toBe(jobError);
    expect(err.message).toBe("fail");
  });
});

describe("ErrorHandler", () => {
  it("createJobError with string", () => {
    const err = ErrorHandler.createJobError("msg");
    expect(err.message).toBe("msg");
    expect(err.type).toBe(ErrorType.UNKNOWN_ERROR);
    expect(err.severity).toBe(ErrorSeverity.MEDIUM);
    expect(err.timestamp).toBeInstanceOf(Date);
    expect(err.originalError).toBeUndefined();
  });

  it("createJobError with Error", () => {
    const e = new Error("err");
    const err = ErrorHandler.createJobError(
      e,
      ErrorType.DATABASE_ERROR,
      ErrorSeverity.HIGH,
      { foo: 1 }
    );
    expect(err.message).toBe("err");
    expect(err.type).toBe(ErrorType.DATABASE_ERROR);
    expect(err.severity).toBe(ErrorSeverity.HIGH);
    expect(err.context).toEqual({ foo: 1 });
    expect(err.originalError).toBe(e);
  });

  it("createValidationError", () => {
    const err = ErrorHandler.createValidationError("bad", "field", 42, {
      bar: 2,
    });
    expect(err.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(err.severity).toBe(ErrorSeverity.LOW);
    expect(err.field).toBe("field");
    expect(err.value).toBe(42);
    expect(err.context).toEqual({ bar: 2 });
  });

  it("createDatabaseError", () => {
    const e = new Error("db");
    const err = ErrorHandler.createDatabaseError(e, "op", "tbl", { baz: 3 });
    expect(err.type).toBe(ErrorType.DATABASE_ERROR);
    expect(err.severity).toBe(ErrorSeverity.HIGH);
    expect(err.operation).toBe("op");
    expect(err.table).toBe("tbl");
    expect(err.context).toEqual({ baz: 3 });
  });

  describe("shouldRetry", () => {
    const baseError = ErrorHandler.createJobError("fail");
    it("returns false if retryCount >= maxRetries", () => {
      expect(ErrorHandler.shouldRetry(baseError, 3)).toBe(false);
      expect(ErrorHandler.shouldRetry(baseError, 4, { maxRetries: 4 })).toBe(
        false
      );
    });
    it("returns false for validation error", () => {
      const err = ErrorHandler.createValidationError("bad");
      expect(ErrorHandler.shouldRetry(err, 0)).toBe(false);
    });
    it("returns false for critical error", () => {
      const err = ErrorHandler.createJobError(
        "fail",
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.CRITICAL
      );
      expect(ErrorHandler.shouldRetry(err, 0)).toBe(false);
    });
    it("returns true for normal error", () => {
      expect(ErrorHandler.shouldRetry(baseError, 0)).toBe(true);
    });
  });

  describe("calculateBackoff", () => {
    it("calculates exponential backoff", () => {
      expect(ErrorHandler.calculateBackoff(0)).toBe(1000);
      expect(ErrorHandler.calculateBackoff(1)).toBe(2000);
      expect(ErrorHandler.calculateBackoff(2)).toBe(4000);
    });
    it("respects maxBackoffMs", () => {
      expect(ErrorHandler.calculateBackoff(10)).toBe(30000);
      expect(ErrorHandler.calculateBackoff(10, { maxBackoffMs: 5000 })).toBe(
        5000
      );
    });
  });

  describe("logError", () => {
    const baseError = ErrorHandler.createJobError(
      "fail",
      ErrorType.UNKNOWN_ERROR,
      ErrorSeverity.MEDIUM,
      { foo: 1 }
    );
    it("logs CRITICAL", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      ErrorHandler.logError({ ...baseError, severity: ErrorSeverity.CRITICAL });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("CRITICAL ERROR:"),
        expect.any(String)
      );
      spy.mockRestore();
    });
    it("logs HIGH", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      ErrorHandler.logError({ ...baseError, severity: ErrorSeverity.HIGH });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("HIGH SEVERITY ERROR:"),
        expect.any(String)
      );
      spy.mockRestore();
    });
    it("logs MEDIUM", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      ErrorHandler.logError({ ...baseError, severity: ErrorSeverity.MEDIUM });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("MEDIUM SEVERITY ERROR:"),
        expect.any(String)
      );
      spy.mockRestore();
    });
    it("logs LOW", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      ErrorHandler.logError({ ...baseError, severity: ErrorSeverity.LOW });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("LOW SEVERITY ERROR:"),
        expect.any(String)
      );
      spy.mockRestore();
    });
    it("merges additionalContext", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      ErrorHandler.logError(
        { ...baseError, severity: ErrorSeverity.MEDIUM, context: { foo: 1 } },
        { bar: 2 }
      );
      const call = spy?.mock?.calls?.[0]?.[1] as string;
      expect(call).toContain("bar");
      spy.mockRestore();
    });
  });

  describe("classifyError", () => {
    it("classifies database errors", () => {
      const e = new Error("prisma database sql");
      const err = ErrorHandler.classifyError(e);
      expect(err.type).toBe(ErrorType.DATABASE_ERROR);
    });
    it("classifies redis errors", () => {
      const e = new Error("redis connection");
      const err = ErrorHandler.classifyError(e);
      expect(err.type).toBe(ErrorType.REDIS_ERROR);
    });
    it("classifies network errors", () => {
      const e = new Error("network econnrefused");
      const err = ErrorHandler.classifyError(e);
      expect(err.type).toBe(ErrorType.NETWORK_ERROR);
    });
    it("classifies timeout errors", () => {
      const e = new Error("timed out");
      const err = ErrorHandler.classifyError(e);
      expect(err.type).toBe(ErrorType.TIMEOUT_ERROR);
    });
    it("classifies external service errors", () => {
      const e = new Error("api service http");
      const err = ErrorHandler.classifyError(e);
      expect(err.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
    });
    it("classifies unknown errors", () => {
      const e = new Error("something else");
      const err = ErrorHandler.classifyError(e);
      expect(err.type).toBe(ErrorType.UNKNOWN_ERROR);
    });
  });

  describe("withErrorHandling", () => {
    it("returns result on success", async () => {
      const result = await ErrorHandler.withErrorHandling(async () => 42);
      expect(result).toBe(42);
    });
    it("throws QueueError and logs", async () => {
      const spy = vi
        .spyOn(ErrorHandler, "logError")
        .mockImplementation(() => {});
      await expect(
        ErrorHandler.withErrorHandling(
          () => Promise.reject(new Error("fail")),
          { foo: 1 }
        )
      ).rejects.toThrow(QueueError);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("validateJobData", () => {
    it("returns null if all fields present", () => {
      const data = { a: 1, b: 2 };
      expect(ErrorHandler.validateJobData(data, ["a", "b"])).toBeNull();
    });
    it("returns ValidationError if missing field", () => {
      const data = { a: 1 };
      const err = ErrorHandler.validateJobData(data, ["a", "b"]);
      expect(err).not.toBeNull();
      expect(err!.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(err!.field).toBe("b");
    });
  });
});
