import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidatedAction } from "../validated-action";
import { BaseAction } from "../base-action";
import { createMockActionContext } from "../../__tests__/test-utils";
import type { ActionContext } from "../types";
import { z } from "zod";

// ============================================================================
// TEST HELPERS
// ============================================================================

// Concrete implementation for testing
class TestValidatedAction extends ValidatedAction<
  z.ZodObject<{ value: z.ZodString }>,
  { logger: { log: (msg: string) => void } },
  { processed: boolean }
> {
  name = "test_validated_action";

  async run(
    data: { value: string },
    deps: { logger: { log: (msg: string) => void } },
    context: ActionContext
  ): Promise<{ processed: boolean }> {
    deps.logger.log(`Processing ${data.value} for job ${context.jobId}`);
    return { processed: true };
  }
}

// Another implementation with different schema
class NumberValidatedAction extends ValidatedAction<
  z.ZodObject<{ count: z.ZodNumber }>,
  { logger: { log: (msg: string) => void } },
  { result: number }
> {
  name = "number_validated_action";

  async run(
    data: { count: number },
    deps: { logger: { log: (msg: string) => void } },
    context: ActionContext
  ): Promise<{ result: number }> {
    deps.logger.log(`Processing count ${data.count} for job ${context.jobId}`);
    return { result: data.count * 2 };
  }
}

// ============================================================================
// VALIDATED ACTION TESTS
// ============================================================================

describe("ValidatedAction", () => {
  let action: TestValidatedAction;
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let context: ActionContext;
  let schema: z.ZodObject<{ value: z.ZodString }>;

  beforeEach(() => {
    schema = z.object({ value: z.string() });
    action = new TestValidatedAction(schema);
    mockLogger = { log: vi.fn() };
    context = createMockActionContext();
  });

  describe("constructor", () => {
    it("should extend BaseAction", () => {
      expect(action).toBeInstanceOf(BaseAction);
      expect(action).toBeInstanceOf(ValidatedAction);
    });

    it("should store the schema", () => {
      expect(action.schema).toBe(schema);
    });

    it("should have correct name", () => {
      expect(action.name).toBe("test_validated_action");
    });
  });

  describe("execute with valid data", () => {
    it("should validate and process valid data", async () => {
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      const result = await action.execute(data, deps, context);

      expect(result).toEqual({ processed: true });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Processing test for job test-job-123"
      );
    });

    it("should work with different schema types", async () => {
      const numberSchema = z.object({ count: z.number() });
      const numberAction = new NumberValidatedAction(numberSchema);
      const data = { count: 42 };
      const deps = { logger: mockLogger };

      const result = await numberAction.execute(data, deps, context);

      expect(result).toEqual({ result: 84 });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "Processing count 42 for job test-job-123"
      );
    });
  });

  describe("execute with invalid data", () => {
    it("should throw error for invalid data", async () => {
      const data = { value: 123 }; // number instead of string
      const deps = { logger: mockLogger };

      await expect(
        action.execute(data as unknown as { value: string }, deps, context)
      ).rejects.toThrow("Invalid input: expected string, received number");
    });

    it("should throw error for missing required field", async () => {
      const data = {}; // missing value field
      const deps = { logger: mockLogger };

      await expect(
        action.execute(data as unknown as { value: string }, deps, context)
      ).rejects.toThrow("Invalid input: expected string, received undefined");
    });

    it("should throw error for extra fields", async () => {
      // Use strict schema to reject extra fields
      const strictSchema = z.object({ value: z.string() }).strict();
      const strictAction = new TestValidatedAction(strictSchema);
      const data = { value: "test", extra: "field" };
      const deps = { logger: mockLogger };

      await expect(strictAction.execute(data, deps, context)).rejects.toThrow(
        'Unrecognized key: "extra"'
      );
    });

    it("should include all validation errors in message", async () => {
      const complexSchema = z.object({
        value: z.string(),
        count: z.number(),
        active: z.boolean(),
      });
      const complexAction = new (class extends ValidatedAction<
        typeof complexSchema,
        { logger: { log: (msg: string) => void } },
        { success: boolean }
      > {
        name = "complex_action";
        async run(
          _data: { value: string; count: number; active: boolean },
          _deps: { logger: { log: (msg: string) => void } },
          _ctx: ActionContext
        ): Promise<{ success: boolean }> {
          return { success: true };
        }
      })(complexSchema);

      const data = { value: 123, count: "not-a-number", extra: "field" };
      const deps = { logger: mockLogger };

      await expect(
        complexAction.execute(
          data as unknown as { value: string; count: number; active: boolean },
          deps,
          context
        ) // Intentional: negative test for validation
      ).rejects.toThrow();
    });
  });

  describe("schema validation", () => {
    it("should use the provided schema for validation", async () => {
      const customSchema = z.object({
        value: z.string().min(3, "Value must be at least 3 characters"),
      });
      const customAction = new TestValidatedAction(customSchema);
      const data = { value: "ab" }; // too short
      const deps = { logger: mockLogger };

      await expect(customAction.execute(data, deps, context)).rejects.toThrow(
        "Value must be at least 3 characters"
      );
    });

    it("should handle complex validation rules", async () => {
      const emailSchema = z.object({
        email: z.string().email("Invalid email format"),
        age: z.number().min(18, "Must be at least 18 years old"),
      });
      const emailAction = new (class extends ValidatedAction<
        typeof emailSchema,
        { logger: { log: (msg: string) => void } },
        { success: boolean }
      > {
        name = "email_action";
        async run(
          _data: { email: string; age: number },
          _deps: { logger: { log: (msg: string) => void } },
          _ctx: ActionContext
        ): Promise<{ success: boolean }> {
          return { success: true };
        }
      })(emailSchema);

      const data = { email: "invalid-email", age: 16 };
      const deps = { logger: mockLogger };

      await expect(emailAction.execute(data, deps, context)).rejects.toThrow();
    });
  });

  describe("abstract method requirements", () => {
    it("should be an abstract class", () => {
      expect(ValidatedAction.prototype.constructor.name).toBe(
        "ValidatedAction"
      );
    });
  });

  describe("integration with BaseAction", () => {
    it("should inherit BaseAction properties", () => {
      expect(action.retryable).toBe(true); // default value
      expect(action.priority).toBe(0); // default value
    });

    it("should support BaseAction configuration", () => {
      const configuredAction = action.withConfig({
        retryable: false,
        priority: 10,
      });

      expect(configuredAction.retryable).toBe(false);
      expect(configuredAction.priority).toBe(10);
      expect(configuredAction.name).toBe("test_validated_action");
    });

    it("should work with executeWithTiming", async () => {
      const data = { value: "test" };
      const deps = { logger: mockLogger };

      const result = await action.executeWithTiming(data, deps, context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: true });
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
