import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorHandler } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.logError", () => {
  const baseJobError = {
    type: ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: "Test error message",
    code: "TEST_ERROR",
    jobId: "test-job-123",
    queueName: "test-queue",
    retryCount: 2,
    timestamp: new Date("2024-01-01T00:00:00.000Z"),
    context: { testKey: "testValue" },
  };

  let consoleSpy: {
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Severity Level Logging", () => {
    it("should log critical errors with error level and emoji", () => {
      const jobError = { ...baseJobError, severity: ErrorSeverity.CRITICAL };

      ErrorHandler.logError(jobError);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "🚨 CRITICAL ERROR:",
        expect.stringContaining("Test error message")
      );
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it("should log high severity errors with error level and emoji", () => {
      const jobError = { ...baseJobError, severity: ErrorSeverity.HIGH };

      ErrorHandler.logError(jobError);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ HIGH SEVERITY ERROR:",
        expect.stringContaining("Test error message")
      );
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it("should log medium severity errors with warn level and emoji", () => {
      const jobError = { ...baseJobError, severity: ErrorSeverity.MEDIUM };

      ErrorHandler.logError(jobError);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        "⚠️ MEDIUM SEVERITY ERROR:",
        expect.stringContaining("Test error message")
      );
      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it("should log low severity errors with info level and emoji", () => {
      const jobError = { ...baseJobError, severity: ErrorSeverity.LOW };

      ErrorHandler.logError(jobError);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        "ℹ️ LOW SEVERITY ERROR:",
        expect.stringContaining("Test error message")
      );
      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });
  });

  describe("Log Data Structure", () => {
    it("should include all error fields in log data", () => {
      const jobError = { ...baseJobError };

      ErrorHandler.logError(jobError);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData).toMatchObject({
        timestamp: "2024-01-01T00:00:00.000Z",
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: "Test error message",
        code: "TEST_ERROR",
        jobId: "test-job-123",
        queueName: "test-queue",
        retryCount: 2,
        context: { testKey: "testValue" },
      });
    });

    it("should handle missing optional fields", () => {
      const jobError = {
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: "Test error message",
        timestamp: new Date("2024-01-01T00:00:00.000Z"),
      };

      ErrorHandler.logError(jobError);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData).toMatchObject({
        timestamp: "2024-01-01T00:00:00.000Z",
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: "Test error message",
        context: {},
      });
    });
  });

  describe("Additional Context", () => {
    it("should merge additional context with error context", () => {
      const jobError = { ...baseJobError };
      const additionalContext = { extraKey: "extraValue", operation: "test" };

      ErrorHandler.logError(jobError, additionalContext);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData.context).toEqual({
        testKey: "testValue",
        extraKey: "extraValue",
        operation: "test",
      });
    });

    it("should handle additional context overriding error context", () => {
      const jobError = { ...baseJobError };
      const additionalContext = { testKey: "overriddenValue" };

      ErrorHandler.logError(jobError, additionalContext);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData.context).toEqual({
        testKey: "overriddenValue",
      });
    });

    it("should handle undefined additional context", () => {
      const jobError = { ...baseJobError };

      ErrorHandler.logError(jobError, undefined);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData.context).toEqual({ testKey: "testValue" });
    });

    it("should handle empty additional context", () => {
      const jobError = { ...baseJobError };

      ErrorHandler.logError(jobError, {});

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData.context).toEqual({ testKey: "testValue" });
    });
  });

  describe("JSON Formatting", () => {
    it("should format log data as pretty JSON", () => {
      const jobError = { ...baseJobError };

      ErrorHandler.logError(jobError);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logString = logCall[1] as string;

      // Should be valid JSON with proper formatting
      expect(() => JSON.parse(logString)).not.toThrow();
      expect(logString).toContain('\n  "timestamp"');
      expect(logString).toContain('\n  "type"');
    });

    it("should handle complex context objects", () => {
      const jobError = {
        ...baseJobError,
        context: {
          nested: { key: "value" },
          array: [1, 2, 3],
          nullValue: null,
          undefinedValue: undefined,
        },
      };

      ErrorHandler.logError(jobError);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData.context).toEqual({
        nested: { key: "value" },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle error with empty message", () => {
      const jobError = { ...baseJobError, message: "" };

      ErrorHandler.logError(jobError);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData.message).toBe("");
    });

    it("should handle error with very long message", () => {
      const longMessage = "a".repeat(1000);
      const jobError = { ...baseJobError, message: longMessage };

      ErrorHandler.logError(jobError);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData.message).toBe(longMessage);
    });

    it("should handle error with special characters in message", () => {
      const specialMessage = "Error with special chars: \n\t\r\"'\\";
      const jobError = { ...baseJobError, message: specialMessage };

      ErrorHandler.logError(jobError);

      const logCall = consoleSpy.warn.mock.calls[0]!;
      const logData = JSON.parse(logCall[1] as string);

      expect(logData.message).toBe(specialMessage);
    });

    it("should handle error with circular references in context", () => {
      const circularObj: Record<string, unknown> = { key: "value" };
      circularObj.self = circularObj;

      const jobError = { ...baseJobError, context: circularObj };

      // Note: JSON.stringify throws when encountering circular references
      // This is expected behavior as the logError function uses JSON.stringify
      expect(() => ErrorHandler.logError(jobError)).toThrow(
        "Converting circular structure to JSON"
      );
    });
  });
});
