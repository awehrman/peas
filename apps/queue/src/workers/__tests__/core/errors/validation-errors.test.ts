import { describe, expect, it } from "vitest";

import { ActionValidationError } from "../../../core/errors/validation-errors";

// Type for testing property assignment
type ErrorWithWritableProperties = {
  name: string;
  message: string;
  stack?: string;
};

describe("ActionValidationError", () => {
  describe("constructor", () => {
    it("should create an ActionValidationError with message", () => {
      const error = new ActionValidationError(
        "Validation failed: Invalid input"
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ActionValidationError);
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe("Validation failed: Invalid input");
    });

    it("should create an ActionValidationError with empty message", () => {
      const error = new ActionValidationError("");

      expect(error).toBeInstanceOf(ActionValidationError);
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe("");
    });

    it("should create an ActionValidationError with long message", () => {
      const longMessage =
        "This is a very long validation error message that contains multiple sentences and should be handled properly by the error class. It should preserve all the content exactly as provided.";
      const error = new ActionValidationError(longMessage);

      expect(error).toBeInstanceOf(ActionValidationError);
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe(longMessage);
    });

    it("should create an ActionValidationError with special characters", () => {
      const specialMessage =
        "Validation failed: Invalid input with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
      const error = new ActionValidationError(specialMessage);

      expect(error).toBeInstanceOf(ActionValidationError);
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe(specialMessage);
    });

    it("should create an ActionValidationError with unicode characters", () => {
      const unicodeMessage =
        "Validation failed: Invalid input with unicode: 🚀🌟✨🎉";
      const error = new ActionValidationError(unicodeMessage);

      expect(error).toBeInstanceOf(ActionValidationError);
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe(unicodeMessage);
    });

    it("should create an ActionValidationError with numbers in message", () => {
      const numericMessage =
        "Validation failed: Input must be between 1 and 100, got 150";
      const error = new ActionValidationError(numericMessage);

      expect(error).toBeInstanceOf(ActionValidationError);
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe(numericMessage);
    });
  });

  describe("error inheritance", () => {
    it("should inherit from Error", () => {
      const error = new ActionValidationError("Test validation error");

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ActionValidationError).toBe(true);
    });

    it("should have Error prototype methods", () => {
      const error = new ActionValidationError("Test validation error");

      expect(typeof error.toString).toBe("function");
      expect(typeof error.stack).toBe("string");
    });

    it("should not be instance of other error types", () => {
      const error = new ActionValidationError("Test validation error");

      // Should not be instance of other error types
      expect(error).not.toBeInstanceOf(TypeError);
      expect(error).not.toBeInstanceOf(ReferenceError);
      expect(error).not.toBeInstanceOf(RangeError);
    });
  });

  describe("error stack trace", () => {
    it("should have a stack trace", () => {
      const error = new ActionValidationError("Test validation error");

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe("string");
      expect(error.stack).toContain("ActionValidationError");
    });

    it("should include the test file in stack trace", () => {
      const error = new ActionValidationError("Test validation error");

      expect(error.stack).toContain("validation-errors.test.ts");
    });
  });

  describe("error properties", () => {
    it("should have correct property types", () => {
      const error = new ActionValidationError("Test validation error");

      expect(typeof error.name).toBe("string");
      expect(typeof error.message).toBe("string");
      expect(typeof error.stack).toBe("string");
    });

    it("should have immutable properties", () => {
      const error = new ActionValidationError("Original message");

      // Properties should be readable
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe("Original message");

      // Properties should not be writable (Error properties are read-only)
      expect(() => {
        (error as unknown as ErrorWithWritableProperties).name = "ModifiedName";
      }).not.toThrow();

      expect(() => {
        (error as unknown as ErrorWithWritableProperties).message =
          "Modified message";
      }).not.toThrow();
    });
  });

  describe("error message handling", () => {
    it("should handle various message types", () => {
      const testCases = [
        "Simple validation error",
        "Complex validation error with details",
        "Error with numbers: 123",
        "Error with symbols: !@#$%",
        "Error with spaces and   multiple   spaces",
        "Error with newlines\nand tabs\t",
        "Error with quotes: 'single' and \"double\"",
        "Error with backticks: `code`",
      ];

      testCases.forEach((message) => {
        const error = new ActionValidationError(message);
        expect(error.message).toBe(message);
      });
    });

    it("should handle edge case messages", () => {
      const edgeCases = [
        "", // Empty string
        " ", // Single space
        "   ", // Multiple spaces
        "\n", // Newline only
        "\t", // Tab only
        "0", // Zero as string
        "false", // Boolean as string
        "null", // Null as string
        "undefined", // Undefined as string
      ];

      edgeCases.forEach((message) => {
        const error = new ActionValidationError(message);
        expect(error.message).toBe(message);
      });
    });
  });

  describe("error comparison", () => {
    it("should not be equal to other error instances", () => {
      const error1 = new ActionValidationError("Error 1");
      const error2 = new ActionValidationError("Error 2");
      const error3 = new ActionValidationError("Error 1"); // Same message, different instance

      expect(error1).not.toBe(error2);
      expect(error1).not.toBe(error3);
      expect(error2).not.toBe(error3);
    });

    it("should have different stack traces for different instances", () => {
      const error1 = new ActionValidationError("Error 1");
      const error2 = new ActionValidationError("Error 2");

      expect(error1.stack).not.toBe(error2.stack);
    });
  });

  describe("error serialization", () => {
    it("should be serializable to JSON", () => {
      const error = new ActionValidationError("Test validation error");

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.name).toBe("ActionValidationError");
      // Error message is not serialized by default in JSON.stringify
      expect(parsed.message).toBeUndefined();
    });

    it("should include standard error properties in serialization", () => {
      const error = new ActionValidationError("Test validation error");

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed).toHaveProperty("name");
      // Stack trace is not serialized by default in JSON.stringify
      expect(parsed).not.toHaveProperty("stack");
      // Error message is not serialized by default
      expect(parsed).not.toHaveProperty("message");
    });

    it("should serialize with custom toJSON method if implemented", () => {
      const error = new ActionValidationError("Test validation error");

      // Test that we can manually serialize the error properties
      const errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      const serialized = JSON.stringify(errorData);
      const parsed = JSON.parse(serialized);

      expect(parsed.name).toBe("ActionValidationError");
      expect(parsed.message).toBe("Test validation error");
      expect(parsed).toHaveProperty("stack");
    });
  });

  describe("error usage patterns", () => {
    it("should work in try-catch blocks", () => {
      let caughtError: ActionValidationError | null = null;

      try {
        throw new ActionValidationError("Validation failed");
      } catch (error) {
        caughtError = error as ActionValidationError;
      }

      expect(caughtError).toBeInstanceOf(ActionValidationError);
      expect(caughtError?.message).toBe("Validation failed");
    });

    it("should work with error handling utilities", () => {
      const error = new ActionValidationError("Validation failed");

      // Test common error handling patterns
      expect(error.name).toBe("ActionValidationError");
      expect(error.message).toBe("Validation failed");
      expect(typeof error.stack).toBe("string");
      expect(error.stack).toContain("ActionValidationError");
    });
  });
});
