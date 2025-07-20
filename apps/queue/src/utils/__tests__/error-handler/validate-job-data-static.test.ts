import { describe, it, expect } from "vitest";
import { ErrorHandler } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.validateJobData (static method)", () => {
  describe("Valid Data", () => {
    it("should return null for valid data with all required fields", () => {
      const data = {
        id: "test-123",
        name: "test job",
        status: "pending",
        priority: 1,
      };
      const requiredFields: (keyof typeof data)[] = [
        "id",
        "name",
        "status",
        "priority",
      ];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should return null for valid data with single required field", () => {
      const data = { id: "test-123" };
      const requiredFields: (keyof typeof data)[] = ["id"];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should return null for valid data with zero required fields", () => {
      const data = { id: "test-123", name: "test" };
      const requiredFields: (keyof typeof data)[] = [];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should return validation error for data with falsy but defined values", () => {
      const data = {
        id: "",
        count: 0,
        active: false,
        items: [],
        metadata: null,
      };
      const requiredFields = [
        "id",
        "count",
        "active",
        "items",
        "metadata",
      ] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Missing required field: metadata");
      expect(result?.field).toBe("metadata");
      expect(result?.value).toBeNull();
    });
  });

  describe("Missing Required Fields", () => {
    it("should return validation error for missing field", () => {
      const data = { id: "test-123", name: "test job" };
      const requiredFields = ["id", "name", "status"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result?.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(result?.severity).toBe(ErrorSeverity.LOW);
      expect(result?.message).toBe("Missing required field: status");
      expect(result?.field).toBe("status");
      expect(result?.value).toBeUndefined();
    });

    it("should return validation error for first missing field", () => {
      const data = { id: "test-123" };
      const requiredFields = ["id", "name", "status"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Missing required field: name");
      expect(result?.field).toBe("name");
    });

    it("should return validation error for undefined field", () => {
      const data = { id: "test-123", name: undefined };
      const requiredFields = ["id", "name"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Missing required field: name");
      expect(result?.field).toBe("name");
      expect(result?.value).toBeUndefined();
    });

    it("should return validation error for null field", () => {
      const data = { id: "test-123", name: null };
      const requiredFields = ["id", "name"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Missing required field: name");
      expect(result?.field).toBe("name");
      expect(result?.value).toBeNull();
    });
  });

  describe("Field Types and Values", () => {
    it("should handle string fields", () => {
      const data = { name: "test" };
      const requiredFields = ["name"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle number fields", () => {
      const data = { count: 42 };
      const requiredFields = ["count"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle boolean fields", () => {
      const data = { active: true };
      const requiredFields = ["active"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle array fields", () => {
      const data = { items: [1, 2, 3] };
      const requiredFields = ["items"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle object fields", () => {
      const data = { metadata: { key: "value" } };
      const requiredFields = ["metadata"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle function fields", () => {
      const data = { callback: () => "test" };
      const requiredFields = ["callback"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle symbol fields", () => {
      const data = { symbol: Symbol("test") };
      const requiredFields = ["symbol"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });
  });

  describe("Complex Data Structures", () => {
    it("should handle nested objects", () => {
      const data = {
        user: {
          id: "user-123",
          profile: {
            name: "John Doe",
            email: "john@example.com",
          },
        },
      };
      const requiredFields = ["user"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle arrays of objects", () => {
      const data = {
        items: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
        ],
      };
      const requiredFields = ["items"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle mixed data types", () => {
      const data = {
        id: "test-123",
        count: 42,
        active: true,
        tags: ["tag1", "tag2"],
        metadata: { key: "value" },
        callback: () => "test",
      };
      const requiredFields = [
        "id",
        "count",
        "active",
        "tags",
        "metadata",
        "callback",
      ] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty object with no required fields", () => {
      const data = {};
      const requiredFields = [] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle empty object with required fields", () => {
      const data = {};
      const requiredFields = ["id", "name"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Missing required field: id");
      expect(result?.field).toBe("id");
    });

    it("should handle object with extra fields", () => {
      const data = { id: "test-123", name: "test", extra: "value" };
      const requiredFields = ["id", "name"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle required fields that don't exist in data", () => {
      const data = { id: "test-123" };
      const requiredFields = ["id", "nonexistent"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Missing required field: nonexistent");
      expect(result?.field).toBe("nonexistent");
    });

    it("should handle duplicate required fields", () => {
      const data = { id: "test-123" };
      const requiredFields = ["id", "id"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull(); // First occurrence is valid, second is ignored
    });

    it("should handle very long field names", () => {
      const longFieldName = "a".repeat(1000);
      const data = { [longFieldName]: "value" };
      const requiredFields = [longFieldName] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle field names with special characters", () => {
      const data = { "field-name": "value", field_name: "value2" };
      const requiredFields = [
        "field-name",
        "field_name",
      ] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should handle field names with unicode characters", () => {
      const data = { "field🚨": "value", "field❌": "value2" };
      const requiredFields = ["field🚨", "field❌"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });
  });

  describe("Error Object Properties", () => {
    it("should create validation error with correct properties", () => {
      const data = { id: "test-123" };
      const requiredFields = ["id", "name"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.type).toBe(ErrorType.VALIDATION_ERROR);
        expect(result.severity).toBe(ErrorSeverity.LOW);
        expect(result.message).toBe("Missing required field: name");
        expect(result.field).toBe("name");
        expect(result.value).toBeUndefined();
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.originalError).toBeUndefined();
      }
    });

    it("should include the actual value in validation error", () => {
      const data = { id: "test-123", name: null };
      const requiredFields = ["id", "name"] as (keyof typeof data)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result?.value).toBeNull();
    });

    it("should set current timestamp", () => {
      const data = { id: "test-123" };
      const requiredFields = ["id", "name"] as (keyof typeof data)[];
      const beforeCall = new Date();

      const result = ErrorHandler.validateJobData(data, requiredFields);

      const afterCall = new Date();
      expect(result?.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime()
      );
      expect(result?.timestamp.getTime()).toBeLessThanOrEqual(
        afterCall.getTime()
      );
    });
  });

  describe("TypeScript Generic Behavior", () => {
    it("should work with generic type constraints", () => {
      interface TestData extends Record<string, unknown> {
        id: string;
        name: string;
        count?: number;
      }

      const data: TestData = { id: "test-123", name: "test" };
      const requiredFields = ["id", "name"] as (keyof TestData)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).toBeNull();
    });

    it("should work with partial data", () => {
      interface TestData extends Record<string, unknown> {
        id: string;
        name: string;
        count: number;
      }

      const data: Partial<TestData> = { id: "test-123" };
      const requiredFields = ["id", "name"] as (keyof TestData)[];

      const result = ErrorHandler.validateJobData(data, requiredFields);

      expect(result).not.toBeNull();
      expect(result?.message).toBe("Missing required field: name");
    });
  });
});
