import { describe, expect, it } from "vitest";

import {
  ActionExecutionError,
  ActionNotRegisteredError,
} from "../../../core/errors/action-errors";

describe("ActionExecutionError", () => {
  describe("constructor", () => {
    it("should create an ActionExecutionError with all properties", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Action execution failed",
        "parse",
        "ParseAction",
        originalError,
        "job-123"
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ActionExecutionError);
      expect(error.name).toBe("ActionExecutionError");
      expect(error.message).toBe("Action execution failed");
      expect(error.operation).toBe("parse");
      expect(error.action).toBe("ParseAction");
      expect(error.originalError).toBe(originalError);
      expect(error.jobId).toBe("job-123");
    });

    it("should create an ActionExecutionError without jobId", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Action execution failed",
        "validate",
        "ValidationAction",
        originalError
      );

      expect(error).toBeInstanceOf(ActionExecutionError);
      expect(error.name).toBe("ActionExecutionError");
      expect(error.message).toBe("Action execution failed");
      expect(error.operation).toBe("validate");
      expect(error.action).toBe("ValidationAction");
      expect(error.originalError).toBe(originalError);
      expect(error.jobId).toBeUndefined();
    });

    it("should create an ActionExecutionError with empty string message", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "",
        "process",
        "ProcessAction",
        originalError,
        "job-456"
      );

      expect(error).toBeInstanceOf(ActionExecutionError);
      expect(error.name).toBe("ActionExecutionError");
      expect(error.message).toBe("");
      expect(error.operation).toBe("process");
      expect(error.action).toBe("ProcessAction");
      expect(error.originalError).toBe(originalError);
      expect(error.jobId).toBe("job-456");
    });

    it("should create an ActionExecutionError with null originalError", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Action execution failed",
        "transform",
        "TransformAction",
        originalError,
        "job-789"
      );

      expect(error).toBeInstanceOf(ActionExecutionError);
      expect(error.name).toBe("ActionExecutionError");
      expect(error.message).toBe("Action execution failed");
      expect(error.operation).toBe("transform");
      expect(error.action).toBe("TransformAction");
      expect(error.originalError).toBe(originalError);
      expect(error.jobId).toBe("job-789");
    });
  });

  describe("error properties", () => {
    it("should have correct property types", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Test error",
        "test-operation",
        "TestAction",
        originalError,
        "test-job-id"
      );

      expect(typeof error.operation).toBe("string");
      expect(typeof error.action).toBe("string");
      expect(error.originalError).toBeInstanceOf(Error);
      expect(typeof error.jobId).toBe("string");
    });

    it("should have undefined jobId when not provided", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Test error",
        "test-operation",
        "TestAction",
        originalError
      );

      expect(error.jobId).toBeUndefined();
    });
  });

  describe("error inheritance", () => {
    it("should inherit from Error", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Test error",
        "test-operation",
        "TestAction",
        originalError
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ActionExecutionError).toBe(true);
    });

    it("should have Error prototype methods", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Test error",
        "test-operation",
        "TestAction",
        originalError
      );

      expect(typeof error.toString).toBe("function");
      expect(typeof error.stack).toBe("string");
    });
  });

  describe("error stack trace", () => {
    it("should have a stack trace", () => {
      const originalError = new Error("Original error message");
      const error = new ActionExecutionError(
        "Test error",
        "test-operation",
        "TestAction",
        originalError
      );

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe("string");
      expect(error.stack).toContain("ActionExecutionError");
    });
  });
});

describe("ActionNotRegisteredError", () => {
  describe("constructor", () => {
    it("should create an ActionNotRegisteredError with action name", () => {
      const error = new ActionNotRegisteredError("ParseAction");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ActionNotRegisteredError);
      expect(error.name).toBe("ActionNotRegisteredError");
      expect(error.message).toBe(
        "Action 'ParseAction' is not registered in the ActionFactory."
      );
    });

    it("should create an ActionNotRegisteredError with empty action name", () => {
      const error = new ActionNotRegisteredError("");

      expect(error).toBeInstanceOf(ActionNotRegisteredError);
      expect(error.name).toBe("ActionNotRegisteredError");
      expect(error.message).toBe(
        "Action '' is not registered in the ActionFactory."
      );
    });

    it("should create an ActionNotRegisteredError with special characters in action name", () => {
      const error = new ActionNotRegisteredError("Action-With-Dashes");

      expect(error).toBeInstanceOf(ActionNotRegisteredError);
      expect(error.name).toBe("ActionNotRegisteredError");
      expect(error.message).toBe(
        "Action 'Action-With-Dashes' is not registered in the ActionFactory."
      );
    });

    it("should create an ActionNotRegisteredError with numbers in action name", () => {
      const error = new ActionNotRegisteredError("Action123");

      expect(error).toBeInstanceOf(ActionNotRegisteredError);
      expect(error.name).toBe("ActionNotRegisteredError");
      expect(error.message).toBe(
        "Action 'Action123' is not registered in the ActionFactory."
      );
    });
  });

  describe("error inheritance", () => {
    it("should inherit from Error", () => {
      const error = new ActionNotRegisteredError("TestAction");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ActionNotRegisteredError).toBe(true);
    });

    it("should have Error prototype methods", () => {
      const error = new ActionNotRegisteredError("TestAction");

      expect(typeof error.toString).toBe("function");
      expect(typeof error.stack).toBe("string");
    });
  });

  describe("error stack trace", () => {
    it("should have a stack trace", () => {
      const error = new ActionNotRegisteredError("TestAction");

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe("string");
      expect(error.stack).toContain("ActionNotRegisteredError");
    });
  });

  describe("error message formatting", () => {
    it("should format message correctly with different action names", () => {
      const testCases = [
        "SimpleAction",
        "Action With Spaces",
        "Action-With-Dashes",
        "Action_With_Underscores",
        "Action123",
        "action123",
        "ACTION123",
      ];

      testCases.forEach((actionName) => {
        const error = new ActionNotRegisteredError(actionName);
        expect(error.message).toBe(
          `Action '${actionName}' is not registered in the ActionFactory.`
        );
      });
    });
  });
});

describe("Error Classes Integration", () => {
  it("should be able to create both error types", () => {
    const originalError = new Error("Original error");
    const executionError = new ActionExecutionError(
      "Execution failed",
      "test",
      "TestAction",
      originalError,
      "job-123"
    );
    const notRegisteredError = new ActionNotRegisteredError("TestAction");

    expect(executionError).toBeInstanceOf(ActionExecutionError);
    expect(notRegisteredError).toBeInstanceOf(ActionNotRegisteredError);
    expect(executionError).not.toBeInstanceOf(ActionNotRegisteredError);
    expect(notRegisteredError).not.toBeInstanceOf(ActionExecutionError);
  });

  it("should have different error names", () => {
    const originalError = new Error("Original error");
    const executionError = new ActionExecutionError(
      "Execution failed",
      "test",
      "TestAction",
      originalError
    );
    const notRegisteredError = new ActionNotRegisteredError("TestAction");

    expect(executionError.name).toBe("ActionExecutionError");
    expect(notRegisteredError.name).toBe("ActionNotRegisteredError");
    expect(executionError.name).not.toBe(notRegisteredError.name);
  });
});
