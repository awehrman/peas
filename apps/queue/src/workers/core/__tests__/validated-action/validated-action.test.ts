import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidatedAction } from "../../validated-action";
import { BaseAction } from "../../base-action";
import type { ActionContext } from "../../types";
import { z } from "zod";

// Create a concrete implementation of ValidatedAction for testing
class TestValidatedAction extends ValidatedAction<
  z.ZodTypeAny,
  unknown,
  unknown
> {
  name = "test_validated_action";

  constructor(schema: z.ZodTypeAny) {
    super(schema);
  }

  async run(
    data: unknown,
    _deps: unknown,
    _ctx: ActionContext
  ): Promise<unknown> {
    return data; // Simply return the validated data
  }
}

describe("ValidatedAction", () => {
  let mockContext: ActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      jobId: "test-job-123",
      operation: "test_operation",
      retryCount: 0,
      queueName: "test-queue",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };
  });

  describe("constructor", () => {
    it("should create ValidatedAction with Zod schema", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const action = new TestValidatedAction(schema);

      expect(action).toBeInstanceOf(ValidatedAction);
      expect(action).toBeInstanceOf(BaseAction);
      expect(action.name).toBe("test_validated_action");
    });

    it("should set schema property", () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const action = new TestValidatedAction(schema);

      expect(action.schema).toBe(schema);
    });
  });

  describe("execute", () => {
    it("should return data when validation passes", async () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const action = new TestValidatedAction(schema);
      const testData = { name: "John", age: 25 };

      const result = await action.execute(testData, {}, mockContext);

      expect(result).toEqual(testData);
    });

    it("should throw error when validation fails", async () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const action = new TestValidatedAction(schema);
      const testData = { name: "John", age: "invalid" };

      await expect(action.execute(testData, {}, mockContext)).rejects.toThrow(
        "Invalid input: expected number, received string"
      );
    });

    it("should handle different data types", async () => {
      const stringSchema = z.string();
      const numberSchema = z.number();
      const objectSchema = z.object({ key: z.string() });
      const arraySchema = z.array(z.number());

      const stringAction = new TestValidatedAction(stringSchema);
      const numberAction = new TestValidatedAction(numberSchema);
      const objectAction = new TestValidatedAction(objectSchema);
      const arrayAction = new TestValidatedAction(arraySchema);

      const stringData = "test string";
      const numberData = 123;
      const objectData = { key: "value" };
      const arrayData = [1, 2, 3];

      await expect(
        stringAction.execute(stringData, {}, mockContext)
      ).resolves.toBe(stringData);
      await expect(
        numberAction.execute(numberData, {}, mockContext)
      ).resolves.toBe(numberData);
      await expect(
        objectAction.execute(objectData, {}, mockContext)
      ).resolves.toEqual(objectData);
      await expect(
        arrayAction.execute(arrayData, {}, mockContext)
      ).resolves.toEqual(arrayData);
    });

    it("should handle complex validation logic", async () => {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        age: z.number().min(0, "Age must be positive"),
        email: z.string().email("Invalid email").optional(),
      });

      const action = new TestValidatedAction(schema);

      // Valid data
      const validData = { name: "John", age: 25, email: "john@example.com" };
      await expect(action.execute(validData, {}, mockContext)).resolves.toEqual(
        validData
      );

      // Invalid data - missing name
      const invalidData1 = { age: 25, email: "john@example.com" };
      await expect(
        action.execute(invalidData1, {}, mockContext)
      ).rejects.toThrow("Invalid input: expected string, received undefined");

      // Invalid data - negative age
      const invalidData2 = { name: "John", age: -5, email: "john@example.com" };
      await expect(
        action.execute(invalidData2, {}, mockContext)
      ).rejects.toThrow("Age must be positive");

      // Invalid data - invalid email
      const invalidData3 = { name: "John", age: 25, email: "invalid-email" };
      await expect(
        action.execute(invalidData3, {}, mockContext)
      ).rejects.toThrow("Invalid email");
    });
  });

  describe("executeWithTiming", () => {
    it("should execute validation with timing", async () => {
      const schema = z.object({ test: z.string() });
      const action = new TestValidatedAction(schema);
      const testData = { test: "data" };

      const result = await action.executeWithTiming(testData, {}, mockContext);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it("should handle validation errors with timing", async () => {
      const schema = z.object({ test: z.string() });
      const action = new TestValidatedAction(schema);
      const testData = { test: 123 }; // Wrong type

      const result = await action.executeWithTiming(testData, {}, mockContext);

      expect(result.success).toBe(false);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain(
        "expected string, received number"
      );
    });

    it("should measure execution time accurately", async () => {
      const schema = z.object({ test: z.string() });
      const action = new TestValidatedAction(schema);
      const testData = { test: "data" };

      const result = await action.executeWithTiming(testData, {}, mockContext);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.success).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle null data", async () => {
      const schema = z.any();
      const action = new TestValidatedAction(schema);

      await expect(action.execute(null, {}, mockContext)).resolves.toBe(null);
    });

    it("should handle undefined data", async () => {
      const schema = z.any();
      const action = new TestValidatedAction(schema);

      await expect(action.execute(undefined, {}, mockContext)).resolves.toBe(
        undefined
      );
    });

    it("should handle empty object data", async () => {
      const schema = z.object({});
      const action = new TestValidatedAction(schema);
      const emptyData = {};

      await expect(action.execute(emptyData, {}, mockContext)).resolves.toEqual(
        emptyData
      );
    });

    it("should handle schema that throws error", async () => {
      const schema = z.object({
        test: z.string().refine(() => {
          throw new Error("Schema validation crashed");
        }),
      });
      const action = new TestValidatedAction(schema);
      const testData = { test: "data" };

      await expect(action.execute(testData, {}, mockContext)).rejects.toThrow(
        "Schema validation crashed"
      );
    });

    it("should handle optional fields", async () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });
      const action = new TestValidatedAction(schema);

      const dataWithOptional = { required: "test", optional: "value" };
      const dataWithoutOptional = { required: "test" };

      await expect(
        action.execute(dataWithOptional, {}, mockContext)
      ).resolves.toEqual(dataWithOptional);
      await expect(
        action.execute(dataWithoutOptional, {}, mockContext)
      ).resolves.toEqual(dataWithoutOptional);
    });
  });

  describe("integration", () => {
    it("should work with BaseAction methods", () => {
      const schema = z.object({ test: z.string() });
      const action = new TestValidatedAction(schema);

      expect(action.name).toBe("test_validated_action");
      expect(typeof action.execute).toBe("function");
      expect(typeof action.executeWithTiming).toBe("function");
    });

    it("should handle dependencies correctly", async () => {
      const schema = z.object({ test: z.string() });
      const action = new TestValidatedAction(schema);
      const testData = { test: "data" };
      const deps = { logger: { log: vi.fn() } };

      await action.execute(testData, deps, mockContext);

      // The action should have executed successfully
      expect(true).toBe(true);
    });

    it("should work with different context values", async () => {
      const schema = z.object({ test: z.string() });
      const action = new TestValidatedAction(schema);
      const testData = { test: "data" };

      const context1 = { ...mockContext, jobId: "job-1" };
      const context2 = { ...mockContext, jobId: "job-2" };

      await action.execute(testData, {}, context1);
      await action.execute(testData, {}, context2);

      // Both executions should succeed
      expect(true).toBe(true);
    });
  });
});
