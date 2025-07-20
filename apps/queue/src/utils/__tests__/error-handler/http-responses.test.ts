import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler HTTP Response Functions", () => {
  const baseJobError = {
    type: ErrorType.DATABASE_ERROR,
    severity: ErrorSeverity.HIGH,
    message: "Database connection failed",
    code: "DB_CONNECTION_ERROR",
    jobId: "test-job-123",
    queueName: "test-queue",
    retryCount: 2,
    timestamp: new Date("2024-01-01T00:00:00.000Z"),
    context: { operation: "connect", table: "users" },
  };

  describe("createHttpErrorResponse", () => {
    it("should create error response with all error fields", () => {
      const jobError = { ...baseJobError };
      const additionalContext = { userId: 123, requestId: "req-456" };

      const response = ErrorHandler.createHttpErrorResponse(
        jobError,
        additionalContext
      );

      expect(response).toEqual({
        success: false,
        error: {
          message: "Database connection failed",
          type: ErrorType.DATABASE_ERROR,
          code: "DB_CONNECTION_ERROR",
        },
        context: {
          operation: "connect",
          table: "users",
          userId: 123,
          requestId: "req-456",
        },
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should create error response without additional context", () => {
      const jobError = { ...baseJobError };

      const response = ErrorHandler.createHttpErrorResponse(jobError);

      expect(response).toEqual({
        success: false,
        error: {
          message: "Database connection failed",
          type: ErrorType.DATABASE_ERROR,
          code: "DB_CONNECTION_ERROR",
        },
        context: {
          operation: "connect",
          table: "users",
        },
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should handle error without optional fields", () => {
      const jobError = {
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: "Unknown error",
        timestamp: new Date("2024-01-01T00:00:00.000Z"),
      };

      const response = ErrorHandler.createHttpErrorResponse(jobError);

      expect(response).toEqual({
        success: false,
        error: {
          message: "Unknown error",
          type: ErrorType.UNKNOWN_ERROR,
          code: undefined,
        },
        context: {},
        timestamp: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should merge additional context with error context", () => {
      const jobError = { ...baseJobError };
      const additionalContext = { operation: "overridden", newField: "value" };

      const response = ErrorHandler.createHttpErrorResponse(
        jobError,
        additionalContext
      );

      expect(response.context).toEqual({
        operation: "overridden",
        table: "users",
        newField: "value",
      });
    });

    it("should handle empty additional context", () => {
      const jobError = { ...baseJobError };

      const response = ErrorHandler.createHttpErrorResponse(jobError, {});

      expect(response.context).toEqual({
        operation: "connect",
        table: "users",
      });
    });

    it("should handle undefined additional context", () => {
      const jobError = { ...baseJobError };

      const response = ErrorHandler.createHttpErrorResponse(
        jobError,
        undefined
      );

      expect(response.context).toEqual({
        operation: "connect",
        table: "users",
      });
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
      const additionalContext = { extra: "data" };

      const response = ErrorHandler.createHttpErrorResponse(
        jobError,
        additionalContext
      );

      expect(response.context).toEqual({
        nested: { key: "value" },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
        extra: "data",
      });
    });
  });

  describe("createHttpSuccessResponse", () => {
    it("should create success response with data", () => {
      const data = { id: 123, name: "test", items: [1, 2, 3] };
      const message = "Operation completed successfully";
      const additionalContext = { userId: 123, operation: "create" };

      const response = ErrorHandler.createHttpSuccessResponse(
        data,
        message,
        additionalContext
      );

      expect(response).toEqual({
        success: true,
        message: "Operation completed successfully",
        data: { id: 123, name: "test", items: [1, 2, 3] },
        context: { userId: 123, operation: "create" },
        timestamp: expect.any(String),
      });
    });

    it("should create success response without message", () => {
      const data = { result: "success" };

      const response = ErrorHandler.createHttpSuccessResponse(data);

      expect(response).toEqual({
        success: true,
        message: undefined,
        data: { result: "success" },
        context: undefined,
        timestamp: expect.any(String),
      });
    });

    it("should create success response without additional context", () => {
      const data = { id: 456 };
      const message = "Item created";

      const response = ErrorHandler.createHttpSuccessResponse(data, message);

      expect(response).toEqual({
        success: true,
        message: "Item created",
        data: { id: 456 },
        context: undefined,
        timestamp: expect.any(String),
      });
    });

    it("should handle primitive data types", () => {
      const stringData = "success";
      const numberData = 42;
      const booleanData = true;
      const nullData = null;

      const stringResponse = ErrorHandler.createHttpSuccessResponse(stringData);
      const numberResponse = ErrorHandler.createHttpSuccessResponse(numberData);
      const booleanResponse =
        ErrorHandler.createHttpSuccessResponse(booleanData);
      const nullResponse = ErrorHandler.createHttpSuccessResponse(nullData);

      expect(stringResponse.data).toBe("success");
      expect(numberResponse.data).toBe(42);
      expect(booleanResponse.data).toBe(true);
      expect(nullResponse.data).toBeNull();
    });

    it("should handle complex data structures", () => {
      const complexData = {
        nested: { key: "value" },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
        function: () => "test",
      };

      const response = ErrorHandler.createHttpSuccessResponse(complexData);

      expect(response.data).toEqual({
        nested: { key: "value" },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
        function: expect.any(Function),
      });
    });

    it("should handle empty additional context", () => {
      const data = { id: 789 };

      const response = ErrorHandler.createHttpSuccessResponse(
        data,
        "Success",
        {}
      );

      expect(response.context).toEqual({});
    });

    it("should handle undefined additional context", () => {
      const data = { id: 789 };

      const response = ErrorHandler.createHttpSuccessResponse(
        data,
        "Success",
        undefined
      );

      expect(response.context).toBeUndefined();
    });

    it("should set current timestamp", () => {
      const data = { id: 123 };
      const beforeCall = new Date();

      const response = ErrorHandler.createHttpSuccessResponse(data);

      const afterCall = new Date();
      const responseTimestamp = new Date(response.timestamp);

      expect(responseTimestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime()
      );
      expect(responseTimestamp.getTime()).toBeLessThanOrEqual(
        afterCall.getTime()
      );
    });
  });

  describe("Response Structure Validation", () => {
    it("should ensure error response has correct structure", () => {
      const jobError = { ...baseJobError };

      const response = ErrorHandler.createHttpErrorResponse(jobError);

      expect(response).toHaveProperty("success", false);
      expect(response).toHaveProperty("error");
      expect(response.error).toHaveProperty("message");
      expect(response.error).toHaveProperty("type");
      expect(response.error).toHaveProperty("code");
      expect(response).toHaveProperty("context");
      expect(response).toHaveProperty("timestamp");
    });

    it("should ensure success response has correct structure", () => {
      const data = { id: 123 };

      const response = ErrorHandler.createHttpSuccessResponse(data, "Success");

      expect(response).toHaveProperty("success", true);
      expect(response).toHaveProperty("message");
      expect(response).toHaveProperty("data");
      expect(response).toHaveProperty("context");
      expect(response).toHaveProperty("timestamp");
    });

    it("should ensure error response error object has required fields", () => {
      const jobError = { ...baseJobError };

      const response = ErrorHandler.createHttpErrorResponse(jobError);

      expect(typeof response.error.message).toBe("string");
      expect(typeof response.error.type).toBe("string");
      expect(response.error.code).toBeDefined(); // Can be undefined
    });

    it("should ensure success response data is preserved", () => {
      const originalData = { id: 123, name: "test" };

      const response = ErrorHandler.createHttpSuccessResponse(originalData);

      expect(response.data).toBe(originalData);
      expect(response.data).toEqual(originalData);
    });
  });

  describe("Edge Cases", () => {
    it("should handle error with empty message", () => {
      const jobError = { ...baseJobError, message: "" };

      const response = ErrorHandler.createHttpErrorResponse(jobError);

      expect(response.error.message).toBe("");
    });

    it("should handle error with very long message", () => {
      const longMessage = "a".repeat(1000);
      const jobError = { ...baseJobError, message: longMessage };

      const response = ErrorHandler.createHttpErrorResponse(jobError);

      expect(response.error.message).toBe(longMessage);
    });

    it("should handle success response with empty message", () => {
      const data = { id: 123 };

      const response = ErrorHandler.createHttpSuccessResponse(data, "");

      expect(response.message).toBe("");
    });

    it("should handle success response with very long message", () => {
      const longMessage = "a".repeat(1000);
      const data = { id: 123 };

      const response = ErrorHandler.createHttpSuccessResponse(
        data,
        longMessage
      );

      expect(response.message).toBe(longMessage);
    });

    it("should handle circular references in context gracefully", () => {
      const circularObj: Record<string, unknown> = { key: "value" };
      circularObj.self = circularObj;
      const jobError = { ...baseJobError, context: circularObj };

      // Should not throw when creating response
      expect(() =>
        ErrorHandler.createHttpErrorResponse(jobError)
      ).not.toThrow();
    });

    it("should handle circular references in success data gracefully", () => {
      const circularObj: Record<string, unknown> = { key: "value" };
      circularObj.self = circularObj;

      // Should not throw when creating response
      expect(() =>
        ErrorHandler.createHttpSuccessResponse(circularObj)
      ).not.toThrow();
    });
  });
});
