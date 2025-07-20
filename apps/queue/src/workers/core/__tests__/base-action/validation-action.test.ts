import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationAction } from "../../base-action";
import type { ActionContext } from "../../types";

describe("ValidationAction", () => {
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      jobId: "test-job-123",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("basic functionality", () => {
    it("should have correct name", () => {
      const validator = (data: string) =>
        data.length > 0 ? null : new Error("Empty string");
      const action = new ValidationAction(validator);
      expect(action.name).toBe("validation");
    });

    it("should pass through valid data", async () => {
      const validator = (data: string) =>
        data.length > 0 ? null : new Error("Empty string");
      const action = new ValidationAction(validator);
      const data = "valid data";

      const result = await action.execute(data);

      expect(result).toBe(data);
    });

    it("should throw error for invalid data", async () => {
      const validator = (data: string) =>
        data.length > 0 ? null : new Error("Empty string");
      const action = new ValidationAction(validator);
      const data = "";

      await expect(action.execute(data)).rejects.toThrow("Empty string");
    });

    it("should work with complex data types", async () => {
      interface ComplexData {
        id: number;
        name: string;
        active: boolean;
      }

      const validator = (data: ComplexData) => {
        if (!data.id || data.id <= 0) return new Error("Invalid ID");
        if (!data.name || data.name.trim().length === 0)
          return new Error("Invalid name");
        if (typeof data.active !== "boolean")
          return new Error("Invalid active status");
        return null;
      };

      const action = new ValidationAction(validator);
      const validData: ComplexData = { id: 1, name: "Test", active: true };

      const result = await action.execute(validData);
      expect(result).toBe(validData);
    });
  });

  describe("validation scenarios", () => {
    it("should handle null validation result", async () => {
      const validator = (_data: string) => null;
      const action = new ValidationAction(validator);
      const data = "any data";

      const result = await action.execute(data);
      expect(result).toBe(data);
    });

    it("should handle complex validation logic", async () => {
      const validator = (data: { value: number; threshold: number }) => {
        if (data.value < data.threshold) {
          return new Error(
            `Value ${data.value} is below threshold ${data.threshold}`
          );
        }
        return null;
      };

      const action = new ValidationAction(validator);

      // Valid data
      const validData = { value: 10, threshold: 5 };
      const result = await action.execute(validData);
      expect(result).toBe(validData);

      // Invalid data
      const invalidData = { value: 3, threshold: 5 };
      await expect(action.execute(invalidData)).rejects.toThrow(
        "Value 3 is below threshold 5"
      );
    });

    it("should handle async-like validation patterns", async () => {
      const validator = (data: { items: (string | number)[] }) => {
        if (!Array.isArray(data.items))
          return new Error("Items must be an array");
        if (data.items.length === 0) return new Error("Items cannot be empty");
        if (data.items.some((item) => typeof item !== "string")) {
          return new Error("All items must be strings");
        }
        return null;
      };

      const action = new ValidationAction(validator);

      // Valid data
      const validData = { items: ["item1", "item2"] };
      const result = await action.execute(validData);
      expect(result).toBe(validData);

      // Invalid data - empty array
      const invalidData1 = { items: [] };
      await expect(action.execute(invalidData1)).rejects.toThrow(
        "Items cannot be empty"
      );

      // Invalid data - wrong types
      const invalidData2 = { items: ["item1", 123, "item3"] };
      await expect(action.execute(invalidData2)).rejects.toThrow(
        "All items must be strings"
      );
    });
  });

  describe("executeWithTiming", () => {
    it("should return success result for valid data", async () => {
      const validator = (data: string) =>
        data.length > 0 ? null : new Error("Empty string");
      const action = new ValidationAction(validator);
      const data = "valid data";
      const deps = {};

      const result = await action.executeWithTiming(data, deps, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.error).toBeUndefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should return error result for invalid data", async () => {
      const validator = (data: string) =>
        data.length > 0 ? null : new Error("Empty string");
      const action = new ValidationAction(validator);
      const data = "";
      const deps = {};

      const result = await action.executeWithTiming(data, deps, mockContext);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe("Empty string");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("configuration", () => {
    it("should have correct default configuration", () => {
      const validator = (_data: string) => null;
      const action = new ValidationAction(validator);

      expect(action.retryable).toBe(false);
      expect(action.priority).toBe(0);
    });

    it("should allow configuration changes", () => {
      const validator = (_data: string) => null;
      const action = new ValidationAction(validator);
      const configuredAction = action.withConfig({
        retryable: true,
        priority: 5,
      });

      expect(configuredAction.retryable).toBe(true);
      expect(configuredAction.priority).toBe(5);
      expect(configuredAction.name).toBe("validation");
    });
  });

  describe("error handling", () => {
    it("should not have custom error handler by default", () => {
      const validator = (_data: string) => null;
      const action = new ValidationAction(validator);
      expect(action.onError).toBeUndefined();
    });

    it("should not have input validation by default", () => {
      const validator = (_data: string) => null;
      const action = new ValidationAction(validator);
      expect(action.validateInput).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle validator that throws errors", async () => {
      const validator = (_data: string) => {
        throw new Error("Validator error");
      };
      const action = new ValidationAction(validator);
      const data = "test";

      await expect(action.execute(data)).rejects.toThrow("Validator error");
    });

    it("should handle validator that returns undefined", async () => {
      const validator = (_data: string) => undefined as unknown as Error | null;
      const action = new ValidationAction(validator);
      const data = "test";

      const result = await action.execute(data);
      expect(result).toBe(data);
    });

    it("should handle validator that returns non-Error objects", async () => {
      const validator = (_data: string) =>
        "Not an error" as unknown as Error | null;
      const action = new ValidationAction(validator);
      const data = "test";

      await expect(action.execute(data)).rejects.toThrow("Not an error");
    });
  });
});
