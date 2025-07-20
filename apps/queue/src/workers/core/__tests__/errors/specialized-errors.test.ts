import { describe, it, expect } from "vitest";
import {
  NoteProcessingError,
  ActionValidationError,
  ActionExecutionError,
  MissingDependencyError,
  ServiceUnhealthyError,
} from "../../errors";

describe("Specialized Worker Errors", () => {
  describe("NoteProcessingError", () => {
    it("should create a note processing error", () => {
      const error = new NoteProcessingError(
        "Failed to process note",
        "parse_note",
        "note-123"
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("NoteProcessingError");
      expect(error.message).toBe("Failed to process note");
      expect(error.operation).toBe("parse_note");
      expect(error.noteId).toBe("note-123");
      expect(error.jobId).toBeUndefined();
    });

    it("should create error with job ID", () => {
      const error = new NoteProcessingError(
        "Failed to process note",
        "parse_note",
        "note-123",
        "job-456"
      );

      expect(error.noteId).toBe("note-123");
      expect(error.jobId).toBe("job-456");
    });

    it("should handle undefined note ID", () => {
      const error = new NoteProcessingError(
        "Failed to process note",
        "parse_note",
        undefined
      );

      expect(error.noteId).toBeUndefined();
    });

    it("should handle empty note ID", () => {
      const error = new NoteProcessingError(
        "Failed to process note",
        "parse_note",
        ""
      );

      expect(error.noteId).toBe("");
    });
  });

  describe("ActionValidationError", () => {
    it("should create an action validation error", () => {
      const error = new ActionValidationError(
        "Action validation failed",
        "parse_ingredient",
        "validate_ingredient_action"
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe("Action validation failed");
      expect(error.operation).toBe("parse_ingredient");
      expect(error.actionName).toBe("validate_ingredient_action");
      expect(error.jobId).toBeUndefined();
    });

    it("should create error with job ID", () => {
      const error = new ActionValidationError(
        "Action validation failed",
        "parse_ingredient",
        "validate_ingredient_action",
        "job-123"
      );

      expect(error.actionName).toBe("validate_ingredient_action");
      expect(error.jobId).toBe("job-123");
    });

    it("should handle special characters in action name", () => {
      const error = new ActionValidationError(
        "Action validation failed",
        "parse_ingredient",
        "action:with:colons"
      );

      expect(error.actionName).toBe("action:with:colons");
    });
  });

  describe("ActionExecutionError", () => {
    it("should create an action execution error", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Action execution failed",
        "parse_ingredient",
        "fetch_ingredient_action",
        originalError
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ActionExecutionError");
      expect(error.message).toBe("Action execution failed");
      expect(error.operation).toBe("parse_ingredient");
      expect(error.actionName).toBe("fetch_ingredient_action");
      expect(error.originalError).toBe(originalError);
      expect(error.jobId).toBeUndefined();
    });

    it("should create error with job ID", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Action execution failed",
        "parse_ingredient",
        "fetch_ingredient_action",
        originalError,
        "job-123"
      );

      expect(error.originalError).toBe(originalError);
      expect(error.jobId).toBe("job-123");
    });

    it("should handle undefined original error", () => {
      const error = new ActionExecutionError(
        "Action execution failed",
        "parse_ingredient",
        "fetch_ingredient_action",
        undefined
      );

      expect(error.originalError).toBeUndefined();
    });

    it("should preserve original error stack trace", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Action execution failed",
        "parse_ingredient",
        "fetch_ingredient_action",
        originalError
      );

      expect(error.originalError).toBe(originalError);
      expect(error.originalError?.stack).toBeDefined();
    });
  });

  describe("MissingDependencyError", () => {
    it("should create a missing dependency error", () => {
      const error = new MissingDependencyError(
        "Required dependency not found",
        "parse_ingredient",
        "database_connection"
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("MissingDependencyError");
      expect(error.message).toBe("Required dependency not found");
      expect(error.operation).toBe("parse_ingredient");
      expect(error.dependencyName).toBe("database_connection");
      expect(error.jobId).toBeUndefined();
    });

    it("should create error with job ID", () => {
      const error = new MissingDependencyError(
        "Required dependency not found",
        "parse_ingredient",
        "database_connection",
        "job-123"
      );

      expect(error.dependencyName).toBe("database_connection");
      expect(error.jobId).toBe("job-123");
    });

    it("should handle special characters in dependency name", () => {
      const error = new MissingDependencyError(
        "Required dependency not found",
        "parse_ingredient",
        "dependency:with:colons"
      );

      expect(error.dependencyName).toBe("dependency:with:colons");
    });
  });

  describe("ServiceUnhealthyError", () => {
    it("should create a service unhealthy error", () => {
      const error = new ServiceUnhealthyError(
        "Service health check failed",
        "parse_ingredient",
        "database_health_check"
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ServiceUnhealthyError");
      expect(error.message).toBe("Service health check failed");
      expect(error.operation).toBe("parse_ingredient");
      expect(error.healthCheck).toBe("database_health_check");
      expect(error.jobId).toBeUndefined();
    });

    it("should create error with job ID", () => {
      const error = new ServiceUnhealthyError(
        "Service health check failed",
        "parse_ingredient",
        "database_health_check",
        "job-123"
      );

      expect(error.healthCheck).toBe("database_health_check");
      expect(error.jobId).toBe("job-123");
    });

    it("should handle special characters in health check name", () => {
      const error = new ServiceUnhealthyError(
        "Service health check failed",
        "parse_ingredient",
        "health:check:with:colons"
      );

      expect(error.healthCheck).toBe("health:check:with:colons");
    });
  });

  describe("error inheritance", () => {
    it("should all inherit from WorkerError", () => {
      const errors = [
        new NoteProcessingError("Test", "test_op", "note-123"),
        new ActionValidationError("Test", "test_op", "action_name"),
        new ActionExecutionError(
          "Test",
          "test_op",
          "action_name",
          new Error("Original")
        ),
        new MissingDependencyError("Test", "test_op", "dependency_name"),
        new ServiceUnhealthyError("Test", "test_op", "health_check"),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.operation).toBe("test_op");
      });
    });

    it("should have correct prototype chain", () => {
      const noteError = new NoteProcessingError("Test", "test_op", "note-123");
      const validationError = new ActionValidationError(
        "Test",
        "test_op",
        "action_name"
      );
      const executionError = new ActionExecutionError(
        "Test",
        "test_op",
        "action_name",
        new Error("Original")
      );
      const dependencyError = new MissingDependencyError(
        "Test",
        "test_op",
        "dependency_name"
      );
      const healthError = new ServiceUnhealthyError(
        "Test",
        "test_op",
        "health_check"
      );

      expect(Object.getPrototypeOf(noteError)).toBe(
        NoteProcessingError.prototype
      );
      expect(Object.getPrototypeOf(validationError)).toBe(
        ActionValidationError.prototype
      );
      expect(Object.getPrototypeOf(executionError)).toBe(
        ActionExecutionError.prototype
      );
      expect(Object.getPrototypeOf(dependencyError)).toBe(
        MissingDependencyError.prototype
      );
      expect(Object.getPrototypeOf(healthError)).toBe(
        ServiceUnhealthyError.prototype
      );
    });
  });

  describe("error serialization", () => {
    it("should serialize NoteProcessingError correctly", () => {
      const error = new NoteProcessingError(
        "Test message",
        "test_op",
        "note-123",
        "job-456"
      );
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized) as unknown as {
        message: string;
        name: string;
        operation: string;
        noteId: string;
        jobId: string;
      };

      expect(parsed.message).toBe("Test message");
      expect(parsed.name).toBe("NoteProcessingError");
      expect(parsed.operation).toBe("test_op");
      expect(parsed.noteId).toBe("note-123");
      expect(parsed.jobId).toBe("job-456");
    });

    it("should serialize ActionValidationError correctly", () => {
      const error = new ActionValidationError(
        "Test message",
        "test_op",
        "action_name",
        "job-456"
      );
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe("Test message");
      expect(parsed.name).toBe("ActionValidationError");
      expect(parsed.operation).toBe("test_op");
      expect(parsed.actionName).toBe("action_name");
      expect(parsed.jobId).toBe("job-456");
    });

    it("should serialize ActionExecutionError correctly", () => {
      const originalError = new Error("Original message");
      const error = new ActionExecutionError(
        "Test message",
        "test_op",
        "action_name",
        originalError,
        "job-456"
      );
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe("Test message");
      expect(parsed.name).toBe("ActionExecutionError");
      expect(parsed.operation).toBe("test_op");
      expect(parsed.actionName).toBe("action_name");
      expect(parsed.jobId).toBe("job-456");
    });

    it("should serialize MissingDependencyError correctly", () => {
      const error = new MissingDependencyError(
        "Test message",
        "test_op",
        "dependency_name",
        "job-456"
      );
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe("Test message");
      expect(parsed.name).toBe("MissingDependencyError");
      expect(parsed.operation).toBe("test_op");
      expect(parsed.dependencyName).toBe("dependency_name");
      expect(parsed.jobId).toBe("job-456");
    });

    it("should serialize ServiceUnhealthyError correctly", () => {
      const error = new ServiceUnhealthyError(
        "Test message",
        "test_op",
        "health_check",
        "job-456"
      );
      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.message).toBe("Test message");
      expect(parsed.name).toBe("ServiceUnhealthyError");
      expect(parsed.operation).toBe("test_op");
      expect(parsed.healthCheck).toBe("health_check");
      expect(parsed.jobId).toBe("job-456");
    });
  });

  describe("error message patterns", () => {
    it("should handle common error message patterns", () => {
      const messages = [
        "Failed to process note: Invalid format",
        "Action validation failed: Missing required field",
        "Action execution failed: Network timeout",
        "Required dependency not found: Database connection",
        "Service health check failed: High latency detected",
      ];

      const errors = [
        new NoteProcessingError(messages[0], "test_op", "note-123"),
        new ActionValidationError(messages[1], "test_op", "action_name"),
        new ActionExecutionError(
          messages[2],
          "test_op",
          "action_name",
          new Error("Original")
        ),
        new MissingDependencyError(messages[3], "test_op", "dependency_name"),
        new ServiceUnhealthyError(messages[4], "test_op", "health_check"),
      ];

      errors.forEach((error, index) => {
        expect(error.message).toBe(messages[index]);
      });
    });
  });
});
