import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.createValidationError", () => {
  describe("Basic Validation Error Creation", () => {
    it("should create a ValidationError with required message", () => {
      const valErr = ErrorHandler.createValidationError("Field is required");

      expect(valErr.message).toBe("Field is required");
      expect(valErr.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(valErr.severity).toBe(ErrorSeverity.LOW);
      expect(valErr.field).toBeUndefined();
      expect(valErr.value).toBeUndefined();
      expect(valErr.context).toBeUndefined();
      expect(valErr.timestamp).toBeInstanceOf(Date);
    });

    it("should create a ValidationError with field and value", () => {
      const valErr = ErrorHandler.createValidationError(
        "Invalid email format",
        "email",
        "invalid-email"
      );

      expect(valErr.message).toBe("Invalid email format");
      expect(valErr.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(valErr.severity).toBe(ErrorSeverity.LOW);
      expect(valErr.field).toBe("email");
      expect(valErr.value).toBe("invalid-email");
      expect(valErr.context).toBeUndefined();
    });

    it("should create a ValidationError with context", () => {
      const context = { form: "user-registration", step: "email-validation" };
      const valErr = ErrorHandler.createValidationError(
        "Email already exists",
        "email",
        "user@example.com",
        context
      );

      expect(valErr.message).toBe("Email already exists");
      expect(valErr.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(valErr.severity).toBe(ErrorSeverity.LOW);
      expect(valErr.field).toBe("email");
      expect(valErr.value).toBe("user@example.com");
      expect(valErr.context).toEqual(context);
    });
  });

  describe("Field Validation", () => {
    it("should handle empty string field", () => {
      const valErr = ErrorHandler.createValidationError(
        "Empty field",
        "",
        "value"
      );
      expect(valErr.field).toBe("");
    });

    it("should handle field with special characters", () => {
      const valErr = ErrorHandler.createValidationError(
        "Special field",
        "user.email",
        "value"
      );
      expect(valErr.field).toBe("user.email");
    });

    it("should handle field with spaces", () => {
      const valErr = ErrorHandler.createValidationError(
        "Field with spaces",
        "user name",
        "value"
      );
      expect(valErr.field).toBe("user name");
    });

    it("should handle field with unicode characters", () => {
      const valErr = ErrorHandler.createValidationError(
        "Unicode field",
        "用户名",
        "value"
      );
      expect(valErr.field).toBe("用户名");
    });

    it("should handle very long field name", () => {
      const longField = "a".repeat(1000);
      const valErr = ErrorHandler.createValidationError(
        "Long field",
        longField,
        "value"
      );
      expect(valErr.field).toBe(longField);
    });
  });

  describe("Value Validation", () => {
    it("should handle null value", () => {
      const valErr = ErrorHandler.createValidationError(
        "Null value",
        "field",
        null
      );
      expect(valErr.value).toBeNull();
    });

    it("should handle undefined value", () => {
      const valErr = ErrorHandler.createValidationError(
        "Undefined value",
        "field",
        undefined
      );
      expect(valErr.value).toBeUndefined();
    });

    it("should handle empty string value", () => {
      const valErr = ErrorHandler.createValidationError(
        "Empty value",
        "field",
        ""
      );
      expect(valErr.value).toBe("");
    });

    it("should handle number value", () => {
      const valErr = ErrorHandler.createValidationError(
        "Number value",
        "age",
        25
      );
      expect(valErr.value).toBe(25);
    });

    it("should handle boolean value", () => {
      const valErr = ErrorHandler.createValidationError(
        "Boolean value",
        "active",
        true
      );
      expect(valErr.value).toBe(true);
    });

    it("should handle object value", () => {
      const objectValue = { id: 1, name: "test" };
      const valErr = ErrorHandler.createValidationError(
        "Object value",
        "user",
        objectValue
      );
      expect(valErr.value).toEqual(objectValue);
    });

    it("should handle array value", () => {
      const arrayValue = [1, 2, 3];
      const valErr = ErrorHandler.createValidationError(
        "Array value",
        "numbers",
        arrayValue
      );
      expect(valErr.value).toEqual(arrayValue);
    });

    it("should handle function value", () => {
      const functionValue = () => "test";
      const valErr = ErrorHandler.createValidationError(
        "Function value",
        "callback",
        functionValue
      );
      expect(valErr.value).toBe(functionValue);
    });

    it("should handle very long value", () => {
      const longValue = "a".repeat(10000);
      const valErr = ErrorHandler.createValidationError(
        "Long value",
        "field",
        longValue
      );
      expect(valErr.value).toBe(longValue);
    });

    it("should handle value with special characters", () => {
      const specialValue = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const valErr = ErrorHandler.createValidationError(
        "Special value",
        "field",
        specialValue
      );
      expect(valErr.value).toBe(specialValue);
    });

    it("should handle value with unicode characters", () => {
      const unicodeValue = "🍕🍔🌮 中文 Español Français";
      const valErr = ErrorHandler.createValidationError(
        "Unicode value",
        "field",
        unicodeValue
      );
      expect(valErr.value).toBe(unicodeValue);
    });
  });

  describe("Context Validation", () => {
    it("should handle undefined context", () => {
      const valErr = ErrorHandler.createValidationError(
        "Test",
        "field",
        "value",
        undefined
      );
      expect(valErr.context).toBeUndefined();
    });

    it("should handle null context", () => {
      const valErr = ErrorHandler.createValidationError(
        "Test",
        "field",
        "value",
        null as unknown as Record<string, unknown>
      );
      expect(valErr.context).toBeNull();
    });

    it("should handle empty context object", () => {
      const valErr = ErrorHandler.createValidationError(
        "Test",
        "field",
        "value",
        {}
      );
      expect(valErr.context).toEqual({});
    });

    it("should handle complex context object", () => {
      const context = {
        form: "user-registration",
        step: "email-validation",
        metadata: {
          source: "web-form",
          version: "1.0.0",
        },
        validationRules: ["required", "email", "unique"],
        array: [1, 2, 3],
        boolean: true,
        nullValue: null,
        undefinedValue: undefined,
      };
      const valErr = ErrorHandler.createValidationError(
        "Test",
        "field",
        "value",
        context
      );
      expect(valErr.context).toEqual(context);
    });

    it("should handle context with nested objects", () => {
      const context = {
        request: {
          method: "POST",
          url: "/api/users",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer token",
          },
        },
        validation: {
          rules: ["required", "email"],
          messages: {
            required: "Field is required",
            email: "Invalid email format",
          },
        },
      };
      const valErr = ErrorHandler.createValidationError(
        "Test",
        "field",
        "value",
        context
      );
      expect(valErr.context).toEqual(context);
    });
  });

  describe("Message Validation", () => {
    it("should handle empty message", () => {
      const valErr = ErrorHandler.createValidationError("");
      expect(valErr.message).toBe("");
    });

    it("should handle message with only whitespace", () => {
      const valErr = ErrorHandler.createValidationError("   \n\t   ");
      expect(valErr.message).toBe("   \n\t   ");
    });

    it("should handle message with newlines", () => {
      const valErr = ErrorHandler.createValidationError(
        "Error\nwith\nnewlines"
      );
      expect(valErr.message).toBe("Error\nwith\nnewlines");
    });

    it("should handle message with special characters", () => {
      const message =
        "Error with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
      const valErr = ErrorHandler.createValidationError(message);
      expect(valErr.message).toBe(message);
    });

    it("should handle message with unicode characters", () => {
      const message = "Error with unicode: 🍕🍔🌮 中文 Español Français";
      const valErr = ErrorHandler.createValidationError(message);
      expect(valErr.message).toBe(message);
    });

    it("should handle very long message", () => {
      const longMessage = "A".repeat(10000);
      const valErr = ErrorHandler.createValidationError(longMessage);
      expect(valErr.message).toBe(longMessage);
    });
  });

  describe("Type Safety", () => {
    it("should return ValidationError type", () => {
      const valErr = ErrorHandler.createValidationError("Test");
      expect(valErr).toMatchObject({
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
      });
    });

    it("should have correct ValidationError structure", () => {
      const valErr = ErrorHandler.createValidationError(
        "Test",
        "field",
        "value"
      );

      // Check that it has all required JobError properties
      expect(valErr).toHaveProperty("type");
      expect(valErr).toHaveProperty("severity");
      expect(valErr).toHaveProperty("message");
      expect(valErr).toHaveProperty("timestamp");

      // Check that it has ValidationError specific properties
      expect(valErr).toHaveProperty("field");
      expect(valErr).toHaveProperty("value");
    });
  });

  describe("Timestamp Handling", () => {
    it("should create timestamp when called", () => {
      const before = new Date();
      const valErr = ErrorHandler.createValidationError("Test");
      const after = new Date();

      expect(valErr.timestamp).toBeInstanceOf(Date);
      expect(valErr.timestamp.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(valErr.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("should create unique timestamps for different calls", async () => {
      const valErr1 = ErrorHandler.createValidationError("Error 1");
      await new Promise((r) => setTimeout(r, 2));
      const valErr2 = ErrorHandler.createValidationError("Error 2");

      expect(valErr1.timestamp).not.toEqual(valErr2.timestamp);
    });
  });

  describe("Edge Cases", () => {
    it("should handle all parameters as undefined", () => {
      const valErr = ErrorHandler.createValidationError(
        undefined as unknown as string
      );
      expect(valErr.message).toBe("undefined");
    });

    it("should handle all parameters as null", () => {
      const valErr = ErrorHandler.createValidationError(
        null as unknown as string
      );
      expect(valErr.message).toBe("null");
    });

    it("should handle field with null value", () => {
      const valErr = ErrorHandler.createValidationError(
        "Test",
        null as unknown as string,
        "value"
      );
      expect(valErr.field).toBeNull();
    });

    it("should handle value with null field", () => {
      const valErr = ErrorHandler.createValidationError("Test", "field", null);
      expect(valErr.value).toBeNull();
    });
  });
});
