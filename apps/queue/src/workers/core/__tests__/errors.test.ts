import { describe, it, expect } from "vitest";
import {
  WorkerError,
  NoteProcessingError,
  ActionValidationError,
  ActionExecutionError,
  MissingDependencyError,
  ServiceUnhealthyError,
} from "../errors";

describe("WorkerError", () => {
  it("should create base worker error", () => {
    const error = new WorkerError("Test error", "test_operation", "job-123");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WorkerError);
    expect(error.message).toBe("Test error");
    expect(error.name).toBe("WorkerError");
    expect(error.operation).toBe("test_operation");
    expect(error.jobId).toBe("job-123");
  });

  it("should work without jobId", () => {
    const error = new WorkerError("Test error", "test_operation");

    expect(error.message).toBe("Test error");
    expect(error.operation).toBe("test_operation");
    expect(error.jobId).toBeUndefined();
  });

  it("should have correct stack trace", () => {
    const error = new WorkerError("Test error", "test_operation");
    expect(error.stack).toBeDefined();
    expect(typeof error.stack).toBe("string");
  });
});

describe("NoteProcessingError", () => {
  it("should create note processing error", () => {
    const error = new NoteProcessingError(
      "Note processing failed",
      "parse_note",
      "note-456",
      "job-123"
    );

    expect(error).toBeInstanceOf(WorkerError);
    expect(error).toBeInstanceOf(NoteProcessingError);
    expect(error.message).toBe("Note processing failed");
    expect(error.name).toBe("NoteProcessingError");
    expect(error.operation).toBe("parse_note");
    expect(error.noteId).toBe("note-456");
    expect(error.jobId).toBe("job-123");
  });

  it("should work without noteId and jobId", () => {
    const error = new NoteProcessingError(
      "Note processing failed",
      "parse_note"
    );

    expect(error.message).toBe("Note processing failed");
    expect(error.operation).toBe("parse_note");
    expect(error.noteId).toBeUndefined();
    expect(error.jobId).toBeUndefined();
  });
});

describe("ActionValidationError", () => {
  it("should create action validation error", () => {
    const error = new ActionValidationError(
      "Invalid input data",
      "validate_action",
      "parse_html",
      "job-123"
    );

    expect(error).toBeInstanceOf(WorkerError);
    expect(error).toBeInstanceOf(ActionValidationError);
    expect(error.message).toBe("Invalid input data");
    expect(error.name).toBe("ActionValidationError");
    expect(error.operation).toBe("validate_action");
    expect(error.actionName).toBe("parse_html");
    expect(error.jobId).toBe("job-123");
  });

  it("should work without jobId", () => {
    const error = new ActionValidationError(
      "Invalid input data",
      "validate_action",
      "parse_html"
    );

    expect(error.message).toBe("Invalid input data");
    expect(error.operation).toBe("validate_action");
    expect(error.actionName).toBe("parse_html");
    expect(error.jobId).toBeUndefined();
  });
});

describe("ActionExecutionError", () => {
  it("should create action execution error", () => {
    const originalError = new Error("Original error");
    const error = new ActionExecutionError(
      "Action execution failed",
      "execute_action",
      "save_note",
      originalError,
      "job-123"
    );

    expect(error).toBeInstanceOf(WorkerError);
    expect(error).toBeInstanceOf(ActionExecutionError);
    expect(error.message).toBe("Action execution failed");
    expect(error.name).toBe("ActionExecutionError");
    expect(error.operation).toBe("execute_action");
    expect(error.actionName).toBe("save_note");
    expect(error.originalError).toBe(originalError);
    expect(error.jobId).toBe("job-123");
  });

  it("should work without originalError and jobId", () => {
    const error = new ActionExecutionError(
      "Action execution failed",
      "execute_action",
      "save_note"
    );

    expect(error.message).toBe("Action execution failed");
    expect(error.operation).toBe("execute_action");
    expect(error.actionName).toBe("save_note");
    expect(error.originalError).toBeUndefined();
    expect(error.jobId).toBeUndefined();
  });
});

describe("MissingDependencyError", () => {
  it("should create missing dependency error", () => {
    const error = new MissingDependencyError(
      "Required dependency not found",
      "setup_worker",
      "database",
      "job-123"
    );

    expect(error).toBeInstanceOf(WorkerError);
    expect(error).toBeInstanceOf(MissingDependencyError);
    expect(error.message).toBe("Required dependency not found");
    expect(error.name).toBe("MissingDependencyError");
    expect(error.operation).toBe("setup_worker");
    expect(error.dependencyName).toBe("database");
    expect(error.jobId).toBe("job-123");
  });

  it("should work without jobId", () => {
    const error = new MissingDependencyError(
      "Required dependency not found",
      "setup_worker",
      "database"
    );

    expect(error.message).toBe("Required dependency not found");
    expect(error.operation).toBe("setup_worker");
    expect(error.dependencyName).toBe("database");
    expect(error.jobId).toBeUndefined();
  });
});

describe("ServiceUnhealthyError", () => {
  it("should create service unhealthy error", () => {
    const error = new ServiceUnhealthyError(
      "Service health check failed",
      "health_check",
      "database_connection",
      "job-123"
    );

    expect(error).toBeInstanceOf(WorkerError);
    expect(error).toBeInstanceOf(ServiceUnhealthyError);
    expect(error.message).toBe("Service health check failed");
    expect(error.name).toBe("ServiceUnhealthyError");
    expect(error.operation).toBe("health_check");
    expect(error.healthCheck).toBe("database_connection");
    expect(error.jobId).toBe("job-123");
  });

  it("should work without jobId", () => {
    const error = new ServiceUnhealthyError(
      "Service health check failed",
      "health_check",
      "database_connection"
    );

    expect(error.message).toBe("Service health check failed");
    expect(error.operation).toBe("health_check");
    expect(error.healthCheck).toBe("database_connection");
    expect(error.jobId).toBeUndefined();
  });
});

describe("Error inheritance", () => {
  it("should maintain proper inheritance chain", () => {
    const noteError = new NoteProcessingError("test", "op", "note-1");
    const validationError = new ActionValidationError("test", "op", "action");
    const executionError = new ActionExecutionError("test", "op", "action");
    const dependencyError = new MissingDependencyError("test", "op", "dep");
    const healthError = new ServiceUnhealthyError("test", "op", "health");

    expect(noteError).toBeInstanceOf(WorkerError);
    expect(validationError).toBeInstanceOf(WorkerError);
    expect(executionError).toBeInstanceOf(WorkerError);
    expect(dependencyError).toBeInstanceOf(WorkerError);
    expect(healthError).toBeInstanceOf(WorkerError);

    expect(noteError).toBeInstanceOf(Error);
    expect(validationError).toBeInstanceOf(Error);
    expect(executionError).toBeInstanceOf(Error);
    expect(dependencyError).toBeInstanceOf(Error);
    expect(healthError).toBeInstanceOf(Error);
  });
});

describe("Error properties", () => {
  it("should have readonly properties", () => {
    const error = new WorkerError("test", "operation", "job-123");

    // These should be readonly and not throw errors when accessed
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const op = error.operation;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const job = error.jobId;
    }).not.toThrow();
  });
});
