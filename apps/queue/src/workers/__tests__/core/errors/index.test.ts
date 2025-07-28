import { describe, expect, it } from "vitest";

import * as ErrorModule from "../../../core/errors";

describe("Errors Module Exports", () => {
  describe("ActionExecutionError", () => {
    it("should export ActionExecutionError class", () => {
      expect(ErrorModule.ActionExecutionError).toBeDefined();
      expect(typeof ErrorModule.ActionExecutionError).toBe("function");
    });

    it("should be able to create ActionExecutionError instance", () => {
      const originalError = new Error("Original error");
      const error = new ErrorModule.ActionExecutionError(
        "Test error",
        "test-operation",
        "TestAction",
        originalError,
        "job-123"
      );

      expect(error).toBeInstanceOf(ErrorModule.ActionExecutionError);
      expect(error.name).toBe("ActionExecutionError");
      expect(error.message).toBe("Test error");
      expect(error.operation).toBe("test-operation");
      expect(error.action).toBe("TestAction");
      expect(error.originalError).toBe(originalError);
      expect(error.jobId).toBe("job-123");
    });

    it("should inherit from Error", () => {
      const originalError = new Error("Original error");
      const error = new ErrorModule.ActionExecutionError(
        "Test error",
        "test-operation",
        "TestAction",
        originalError
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ErrorModule.ActionExecutionError).toBe(true);
    });
  });

  describe("ActionNotRegisteredError", () => {
    it("should export ActionNotRegisteredError class", () => {
      expect(ErrorModule.ActionNotRegisteredError).toBeDefined();
      expect(typeof ErrorModule.ActionNotRegisteredError).toBe("function");
    });

    it("should be able to create ActionNotRegisteredError instance", () => {
      const error = new ErrorModule.ActionNotRegisteredError("TestAction");

      expect(error).toBeInstanceOf(ErrorModule.ActionNotRegisteredError);
      expect(error.name).toBe("ActionNotRegisteredError");
      expect(error.message).toBe(
        "Action 'TestAction' is not registered in the ActionFactory."
      );
    });

    it("should inherit from Error", () => {
      const error = new ErrorModule.ActionNotRegisteredError("TestAction");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ErrorModule.ActionNotRegisteredError).toBe(true);
    });
  });

  describe("ActionValidationError", () => {
    it("should export ActionValidationError class", () => {
      expect(ErrorModule.ActionValidationError).toBeDefined();
      expect(typeof ErrorModule.ActionValidationError).toBe("function");
    });

    it("should be able to create ActionValidationError instance", () => {
      const error = new ErrorModule.ActionValidationError("Validation failed");

      expect(error).toBeInstanceOf(ErrorModule.ActionValidationError);
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe("Validation failed");
    });

    it("should inherit from Error", () => {
      const error = new ErrorModule.ActionValidationError("Validation failed");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ErrorModule.ActionValidationError).toBe(true);
    });
  });

  describe("Module Structure", () => {
    it("should export exactly 3 error classes", () => {
      const exportedKeys = Object.keys(ErrorModule);
      expect(exportedKeys).toHaveLength(3);
    });

    it("should export all expected error classes", () => {
      expect(ErrorModule).toHaveProperty("ActionExecutionError");
      expect(ErrorModule).toHaveProperty("ActionNotRegisteredError");
      expect(ErrorModule).toHaveProperty("ActionValidationError");
    });

    it("should not export unexpected properties", () => {
      const exportedKeys = Object.keys(ErrorModule);
      const expectedKeys = [
        "ActionExecutionError",
        "ActionNotRegisteredError",
        "ActionValidationError",
      ];

      expect(exportedKeys.sort()).toEqual(expectedKeys.sort());
    });
  });

  describe("Error Class Relationships", () => {
    it("should have distinct error classes", () => {
      const originalError = new Error("Original error");
      const executionError = new ErrorModule.ActionExecutionError(
        "Execution failed",
        "test",
        "TestAction",
        originalError
      );
      const notRegisteredError = new ErrorModule.ActionNotRegisteredError(
        "TestAction"
      );
      const validationError = new ErrorModule.ActionValidationError(
        "Validation failed"
      );

      expect(executionError).toBeInstanceOf(ErrorModule.ActionExecutionError);
      expect(notRegisteredError).toBeInstanceOf(
        ErrorModule.ActionNotRegisteredError
      );
      expect(validationError).toBeInstanceOf(ErrorModule.ActionValidationError);

      expect(executionError).not.toBeInstanceOf(
        ErrorModule.ActionNotRegisteredError
      );
      expect(executionError).not.toBeInstanceOf(
        ErrorModule.ActionValidationError
      );
      expect(notRegisteredError).not.toBeInstanceOf(
        ErrorModule.ActionExecutionError
      );
      expect(notRegisteredError).not.toBeInstanceOf(
        ErrorModule.ActionValidationError
      );
      expect(validationError).not.toBeInstanceOf(
        ErrorModule.ActionExecutionError
      );
      expect(validationError).not.toBeInstanceOf(
        ErrorModule.ActionNotRegisteredError
      );
    });

    it("should have different error names", () => {
      const originalError = new Error("Original error");
      const executionError = new ErrorModule.ActionExecutionError(
        "Execution failed",
        "test",
        "TestAction",
        originalError
      );
      const notRegisteredError = new ErrorModule.ActionNotRegisteredError(
        "TestAction"
      );
      const validationError = new ErrorModule.ActionValidationError(
        "Validation failed"
      );

      expect(executionError.name).toBe("ActionExecutionError");
      expect(notRegisteredError.name).toBe("ActionNotRegisteredError");
      expect(validationError.name).toBe("ActionValidationError");

      expect(executionError.name).not.toBe(notRegisteredError.name);
      expect(executionError.name).not.toBe(validationError.name);
      expect(notRegisteredError.name).not.toBe(validationError.name);
    });
  });

  describe("Error Usage Patterns", () => {
    it("should work with destructuring imports", () => {
      const {
        ActionExecutionError,
        ActionNotRegisteredError,
        ActionValidationError,
      } = ErrorModule;

      expect(ActionExecutionError).toBeDefined();
      expect(ActionNotRegisteredError).toBeDefined();
      expect(ActionValidationError).toBeDefined();

      const originalError = new Error("Original error");
      const executionError = new ActionExecutionError(
        "Test",
        "test",
        "TestAction",
        originalError
      );
      const notRegisteredError = new ActionNotRegisteredError("TestAction");
      const validationError = new ActionValidationError("Test");

      expect(executionError).toBeInstanceOf(ActionExecutionError);
      expect(notRegisteredError).toBeInstanceOf(ActionNotRegisteredError);
      expect(validationError).toBeInstanceOf(ActionValidationError);
    });

    it("should work with try-catch blocks", () => {
      let caughtExecutionError: ErrorModule.ActionExecutionError | null = null;
      let caughtNotRegisteredError: ErrorModule.ActionNotRegisteredError | null =
        null;
      let caughtValidationError: ErrorModule.ActionValidationError | null =
        null;

      try {
        throw new ErrorModule.ActionExecutionError(
          "Execution failed",
          "test",
          "TestAction",
          new Error("Original error")
        );
      } catch (error) {
        caughtExecutionError = error as ErrorModule.ActionExecutionError;
      }

      try {
        throw new ErrorModule.ActionNotRegisteredError("TestAction");
      } catch (error) {
        caughtNotRegisteredError =
          error as ErrorModule.ActionNotRegisteredError;
      }

      try {
        throw new ErrorModule.ActionValidationError("Validation failed");
      } catch (error) {
        caughtValidationError = error as ErrorModule.ActionValidationError;
      }

      expect(caughtExecutionError).toBeInstanceOf(
        ErrorModule.ActionExecutionError
      );
      expect(caughtNotRegisteredError).toBeInstanceOf(
        ErrorModule.ActionNotRegisteredError
      );
      expect(caughtValidationError).toBeInstanceOf(
        ErrorModule.ActionValidationError
      );
    });
  });

  describe("Error Serialization", () => {
    it("should serialize all error types correctly", () => {
      const originalError = new Error("Original error");
      const executionError = new ErrorModule.ActionExecutionError(
        "Execution failed",
        "test",
        "TestAction",
        originalError,
        "job-123"
      );
      const notRegisteredError = new ErrorModule.ActionNotRegisteredError(
        "TestAction"
      );
      const validationError = new ErrorModule.ActionValidationError(
        "Validation failed"
      );

      const serializedExecution = JSON.stringify(executionError);
      const serializedNotRegistered = JSON.stringify(notRegisteredError);
      const serializedValidation = JSON.stringify(validationError);

      expect(serializedExecution).toContain("ActionExecutionError");
      expect(serializedNotRegistered).toContain("ActionNotRegisteredError");
      expect(serializedValidation).toContain("ActionValidationError");
    });
  });
});
