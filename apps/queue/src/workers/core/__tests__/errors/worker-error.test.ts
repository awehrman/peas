import { describe, it, expect } from "vitest";
import { WorkerError } from "../../errors";

describe("WorkerError", () => {
  describe("constructor", () => {
    it("should create a worker error with message", () => {
      const error = new WorkerError("Test error message", "test_operation");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(WorkerError);
      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("WorkerError");
      expect(error.operation).toBe("test_operation");
      expect(error.jobId).toBeUndefined();
    });

    it("should create a worker error with message and operation", () => {
      const error = new WorkerError("Test error message", "parse_ingredient");

      expect(error.message).toBe("Test error message");
      expect(error.operation).toBe("parse_ingredient");
      expect(error.jobId).toBeUndefined();
    });

    it("should create a worker error with message, operation, and jobId", () => {
      const error = new WorkerError(
        "Test error message",
        "test_operation",
        "job-123"
      );

      expect(error.message).toBe("Test error message");
      expect(error.operation).toBe("test_operation");
      expect(error.jobId).toBe("job-123");
    });

    it("should set readonly properties correctly", () => {
      const error = new WorkerError("Test message", "test_op", "job-456");

      // Verify properties are set correctly
      expect(error.operation).toBe("test_op");
      expect(error.jobId).toBe("job-456");

      // Note: readonly is a TypeScript compile-time check, not runtime
      // The properties are actually writable at runtime
    });
  });

  describe("inheritance", () => {
    it("should inherit from Error", () => {
      const error = new WorkerError("Test message", "test_operation");

      expect(error).toBeInstanceOf(Error);
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe("string");
    });

    it("should have proper prototype chain", () => {
      const error = new WorkerError("Test message", "test_operation");

      expect(Object.getPrototypeOf(error)).toBe(WorkerError.prototype);
      expect(Object.getPrototypeOf(WorkerError.prototype)).toBe(
        Error.prototype
      );
    });
  });

  describe("error properties", () => {
    it("should have correct name property", () => {
      const error = new WorkerError("Test message", "test_operation");
      expect(error.name).toBe("WorkerError");
    });

    it("should have stack trace", () => {
      const error = new WorkerError("Test message", "test_operation");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("WorkerError");
      expect(error.stack).toContain("Test message");
    });

    it("should preserve message in stack trace", () => {
      const error = new WorkerError("Custom error message", "test_operation");
      expect(error.stack).toContain("Custom error message");
    });
  });

  describe("operation property", () => {
    it("should store operation name", () => {
      const operations = [
        "parse_ingredient",
        "fetch_recipe",
        "validate_note",
        "process_image",
        "categorize_content",
      ];

      operations.forEach((operation) => {
        const error = new WorkerError("Test message", operation);
        expect(error.operation).toBe(operation);
      });
    });

    it("should handle empty operation string", () => {
      const error = new WorkerError("Test message", "");
      expect(error.operation).toBe("");
    });

    it("should handle special characters in operation name", () => {
      const error = new WorkerError("Test message", "operation:with:colons");
      expect(error.operation).toBe("operation:with:colons");
    });
  });

  describe("jobId property", () => {
    it("should store job ID when provided", () => {
      const jobIds = [
        "job-123",
        "job-456",
        "job-789",
        "job-abc-def",
        "job_with_underscores",
      ];

      jobIds.forEach((jobId) => {
        const error = new WorkerError("Test message", "test_operation", jobId);
        expect(error.jobId).toBe(jobId);
      });
    });

    it("should be undefined when job ID not provided", () => {
      const error = new WorkerError("Test message", "test_operation");
      expect(error.jobId).toBeUndefined();
    });

    it("should handle empty job ID string", () => {
      const error = new WorkerError("Test message", "test_operation", "");
      expect(error.jobId).toBe("");
    });

    it("should handle special characters in job ID", () => {
      const error = new WorkerError(
        "Test message",
        "test_operation",
        "job:with:colons"
      );
      expect(error.jobId).toBe("job:with:colons");
    });
  });

  describe("error message formatting", () => {
    it("should preserve original message", () => {
      const messages = [
        "Simple error message",
        "Error with numbers: 123",
        "Error with special chars: !@#$%^&*()",
        "Error with newlines:\nline1\nline2",
        "Error with quotes: 'single' and \"double\"",
        "Error with unicode: 🚀 📝 ✨",
      ];

      messages.forEach((message) => {
        const error = new WorkerError(message, "test_operation");
        expect(error.message).toBe(message);
      });
    });

    it("should handle very long messages", () => {
      const longMessage = "a".repeat(1000);
      const error = new WorkerError(longMessage, "test_operation");
      expect(error.message).toBe(longMessage);
    });

    it("should handle empty message", () => {
      const error = new WorkerError("", "test_operation");
      expect(error.message).toBe("");
    });
  });

  describe("error serialization", () => {
    it("should be JSON serializable", () => {
      const error = new WorkerError(
        "Test message",
        "test_operation",
        "job-123"
      );

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      // Error.message is not included in JSON.stringify by default
      expect(parsed.name).toBe("WorkerError");
      expect(parsed.operation).toBe("test_operation");
      expect(parsed.jobId).toBe("job-123");
    });

    it("should include all properties in serialization", () => {
      const error = new WorkerError(
        "Test message",
        "test_operation",
        "job-123"
      );

      const serialized = JSON.stringify(error);
      // Error.message is not included in JSON.stringify by default
      expect(serialized).toContain("WorkerError");
      expect(serialized).toContain("test_operation");
      expect(serialized).toContain("job-123");
    });
  });

  describe("error comparison", () => {
    it("should not be equal to other error instances", () => {
      const error1 = new WorkerError("Message 1", "operation1", "job1");
      const error2 = new WorkerError("Message 1", "operation1", "job1");

      expect(error1).not.toBe(error2);
      expect(error1.message).toBe(error2.message);
      expect(error1.operation).toBe(error2.operation);
      expect(error1.jobId).toBe(error2.jobId);
    });

    it("should be equal to itself", () => {
      const error = new WorkerError("Test message", "test_operation");
      expect(error).toBe(error);
    });
  });

  describe("edge cases", () => {
    it("should handle null and undefined parameters", () => {
      // @ts-expect-error - testing with null message
      const error1 = new WorkerError(null, "test_operation");
      expect(error1.message).toBe("null");

      // @ts-expect-error - testing with undefined message
      const error2 = new WorkerError(undefined, "test_operation");
      expect(error2.message).toBe("");
    });

    it("should handle non-string message", () => {
      // @ts-expect-error - testing with number message
      const error1 = new WorkerError(123, "test_operation");
      expect(error1.message).toBe("123");

      // @ts-expect-error - testing with boolean message
      const error2 = new WorkerError(true, "test_operation");
      expect(error2.message).toBe("true");
    });

    it("should handle non-string operation", () => {
      // @ts-expect-error - testing with number operation
      const error1 = new WorkerError("Test message", 123);
      expect(error1.operation).toBe(123);

      // @ts-expect-error - testing with boolean operation
      const error2 = new WorkerError("Test message", true);
      expect(error2.operation).toBe(true);
    });

    it("should handle non-string jobId", () => {
      // @ts-expect-error - testing with number jobId
      const error1 = new WorkerError("Test message", "test_operation", 123);
      expect(error1.jobId).toBe(123);

      // @ts-expect-error - testing with boolean jobId
      const error2 = new WorkerError("Test message", "test_operation", true);
      expect(error2.jobId).toBe(true);
    });
  });
});
