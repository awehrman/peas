import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.createWorkerError", () => {
  describe("Basic Functionality", () => {
    it("should create worker error with all required parameters", () => {
      const error = new Error("Worker processing failed");
      const workerName = "ingredient-worker";
      const jobId = "test-job-123";
      const operation = "process-ingredient";
      const additionalContext = { userId: 123, noteId: "note-456" };

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        jobId,
        operation,
        additionalContext
      );

      expect(result.type).toBe(ErrorType.WORKER_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.message).toBe("Worker processing failed");
      expect(result.originalError).toBe(error);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.context).toEqual({
        workerName: "ingredient-worker",
        jobId: "test-job-123",
        operation: "process-ingredient",
        userId: 123,
        noteId: "note-456",
      });
    });

    it("should create worker error with minimal parameters", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.type).toBe(ErrorType.WORKER_ERROR);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.message).toBe("Worker error");
      expect(result.originalError).toBe(error);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.context).toEqual({
        workerName: "test-worker",
      });
    });

    it("should preserve original error properties", () => {
      const originalError = new Error("Test error");
      originalError.name = "TestError";
      originalError.stack = "test stack";
      const workerName = "test-worker";

      const result = ErrorHandler.createWorkerError(originalError, workerName);

      expect(result.originalError).toBe(originalError);
      expect(result.originalError?.name).toBe("TestError");
      expect(result.originalError?.stack).toBe("test stack");
    });
  });

  describe("Parameter Handling", () => {
    it("should handle undefined jobId", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const operation = "test-operation";

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        undefined,
        operation
      );

      expect(result.context).toEqual({
        workerName: "test-worker",
        jobId: undefined,
        operation: "test-operation",
      });
    });

    it("should handle undefined operation", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const jobId = "test-job-123";

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        jobId,
        undefined
      );

      expect(result.context).toEqual({
        workerName: "test-worker",
        jobId: "test-job-123",
        operation: undefined,
      });
    });

    it("should handle undefined additional context", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const jobId = "test-job-123";
      const operation = "test-operation";

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        jobId,
        operation,
        undefined
      );

      expect(result.context).toEqual({
        workerName: "test-worker",
        jobId: "test-job-123",
        operation: "test-operation",
      });
    });

    it("should handle empty additional context", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const jobId = "test-job-123";
      const operation = "test-operation";

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        jobId,
        operation,
        {}
      );

      expect(result.context).toEqual({
        workerName: "test-worker",
        jobId: "test-job-123",
        operation: "test-operation",
      });
    });
  });

  describe("Context Merging", () => {
    it("should merge additional context with worker context", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const jobId = "test-job-123";
      const operation = "test-operation";
      const additionalContext = { userId: 123, noteId: "note-456" };

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        jobId,
        operation,
        additionalContext
      );

      expect(result.context).toEqual({
        workerName: "test-worker",
        jobId: "test-job-123",
        operation: "test-operation",
        userId: 123,
        noteId: "note-456",
      });
    });

    it("should handle additional context overriding worker context", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const jobId = "test-job-123";
      const operation = "test-operation";
      const additionalContext = {
        workerName: "overridden-worker",
        jobId: "overridden-job",
        operation: "overridden-operation",
        extra: "value",
      };

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        jobId,
        operation,
        additionalContext
      );

      expect(result.context).toEqual({
        workerName: "overridden-worker",
        jobId: "overridden-job",
        operation: "overridden-operation",
        extra: "value",
      });
    });

    it("should handle complex additional context", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const additionalContext = {
        nested: { key: "value" },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      };

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        undefined,
        undefined,
        additionalContext
      );

      expect(result.context).toEqual({
        workerName: "test-worker",
        nested: { key: "value" },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      });
    });
  });

  describe("Error Message Handling", () => {
    it("should handle error with empty message", () => {
      const error = new Error("");
      const workerName = "test-worker";

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.message).toBe("");
    });

    it("should handle error with very long message", () => {
      const longMessage = "a".repeat(1000);
      const error = new Error(longMessage);
      const workerName = "test-worker";

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.message).toBe(longMessage);
    });

    it("should handle error with special characters in message", () => {
      const specialMessage = "Error with special chars: \n\t\r\"'\\";
      const error = new Error(specialMessage);
      const workerName = "test-worker";

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.message).toBe(specialMessage);
    });

    it("should handle error with unicode characters in message", () => {
      const unicodeMessage = "Error with unicode: 🚨❌⚠️ℹ️";
      const error = new Error(unicodeMessage);
      const workerName = "test-worker";

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.message).toBe(unicodeMessage);
    });
  });

  describe("Worker Name Handling", () => {
    it("should handle empty worker name", () => {
      const error = new Error("Worker error");
      const workerName = "";

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.context?.workerName).toBe("");
    });

    it("should handle very long worker name", () => {
      const error = new Error("Worker error");
      const workerName = "a".repeat(1000);

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.context?.workerName).toBe("a".repeat(1000));
    });

    it("should handle worker name with special characters", () => {
      const error = new Error("Worker error");
      const workerName = "worker-name_with.special@chars";

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.context?.workerName).toBe("worker-name_with.special@chars");
    });
  });

  describe("Job ID Handling", () => {
    it("should handle empty job ID", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const jobId = "";

      const result = ErrorHandler.createWorkerError(error, workerName, jobId);

      expect(result.context?.jobId).toBe("");
    });

    it("should handle very long job ID", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const jobId = "a".repeat(1000);

      const result = ErrorHandler.createWorkerError(error, workerName, jobId);

      expect(result.context?.jobId).toBe("a".repeat(1000));
    });

    it("should handle job ID with special characters", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const jobId = "job-id_with.special@chars";

      const result = ErrorHandler.createWorkerError(error, workerName, jobId);

      expect(result.context?.jobId).toBe("job-id_with.special@chars");
    });
  });

  describe("Operation Handling", () => {
    it("should handle empty operation", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const operation = "";

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        undefined,
        operation
      );

      expect(result.context?.operation).toBe("");
    });

    it("should handle very long operation", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const operation = "a".repeat(1000);

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        undefined,
        operation
      );

      expect(result.context?.operation).toBe("a".repeat(1000));
    });

    it("should handle operation with special characters", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const operation = "operation-name_with.special@chars";

      const result = ErrorHandler.createWorkerError(
        error,
        workerName,
        undefined,
        operation
      );

      expect(result.context?.operation).toBe(
        "operation-name_with.special@chars"
      );
    });
  });

  describe("Timestamp Handling", () => {
    it("should set current timestamp", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const beforeCall = new Date();

      const result = ErrorHandler.createWorkerError(error, workerName);

      const afterCall = new Date();
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime()
      );
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(
        afterCall.getTime()
      );
    });

    it("should create unique timestamps for different calls", async () => {
      const error1 = new Error("Worker error 1");
      const error2 = new Error("Worker error 2");
      const workerName = "test-worker";

      const result1 = ErrorHandler.createWorkerError(error1, workerName);
      await new Promise((r) => setTimeout(r, 2));
      const result2 = ErrorHandler.createWorkerError(error2, workerName);

      expect(result1.timestamp).not.toEqual(result2.timestamp);
    });
  });

  describe("Error Type and Severity", () => {
    it("should always set correct error type", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.type).toBe(ErrorType.WORKER_ERROR);
    });

    it("should always set correct severity", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";

      const result = ErrorHandler.createWorkerError(error, workerName);

      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it("should maintain consistent type and severity across different parameters", () => {
      const error = new Error("Worker error");
      const workerName = "test-worker";
      const jobId = "test-job-123";
      const operation = "test-operation";
      const additionalContext = { extra: "value" };

      const result1 = ErrorHandler.createWorkerError(error, workerName);
      const result2 = ErrorHandler.createWorkerError(error, workerName, jobId);
      const result3 = ErrorHandler.createWorkerError(
        error,
        workerName,
        jobId,
        operation
      );
      const result4 = ErrorHandler.createWorkerError(
        error,
        workerName,
        jobId,
        operation,
        additionalContext
      );

      expect(result1.type).toBe(ErrorType.WORKER_ERROR);
      expect(result1.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result2.type).toBe(ErrorType.WORKER_ERROR);
      expect(result2.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result3.type).toBe(ErrorType.WORKER_ERROR);
      expect(result3.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result4.type).toBe(ErrorType.WORKER_ERROR);
      expect(result4.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });
});
