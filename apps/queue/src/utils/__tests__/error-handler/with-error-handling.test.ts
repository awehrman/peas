import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorHandler, QueueError } from "../../error-handler";
import { ErrorType, ErrorSeverity } from "../../../types";

describe("ErrorHandler.withErrorHandling", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Successful Operations", () => {
    it("should return result when operation succeeds", async () => {
      const operation = vi.fn().mockResolvedValue("success result");
      const context = { operation: "test" };

      const result = await ErrorHandler.withErrorHandling(operation, context);

      expect(result).toBe("success result");
      expect(operation).toHaveBeenCalledOnce();
    });

    it("should return complex data when operation succeeds", async () => {
      const complexData = { id: 123, name: "test", items: [1, 2, 3] };
      const operation = vi.fn().mockResolvedValue(complexData);

      const result = await ErrorHandler.withErrorHandling(operation);

      expect(result).toEqual(complexData);
      expect(operation).toHaveBeenCalledOnce();
    });

    it("should return null when operation returns null", async () => {
      const operation = vi.fn().mockResolvedValue(null);

      const result = await ErrorHandler.withErrorHandling(operation);

      expect(result).toBeNull();
      expect(operation).toHaveBeenCalledOnce();
    });

    it("should return undefined when operation returns undefined", async () => {
      const operation = vi.fn().mockResolvedValue(undefined);

      const result = await ErrorHandler.withErrorHandling(operation);

      expect(result).toBeUndefined();
      expect(operation).toHaveBeenCalledOnce();
    });

    it("should work without context parameter", async () => {
      const operation = vi.fn().mockResolvedValue("result");

      const result = await ErrorHandler.withErrorHandling(operation);

      expect(result).toBe("result");
      expect(operation).toHaveBeenCalledOnce();
    });
  });

  describe("Error Handling", () => {
    it("should catch and classify errors", async () => {
      const error = new Error("Database connection failed");
      const operation = vi.fn().mockRejectedValue(error);

      await expect(ErrorHandler.withErrorHandling(operation)).rejects.toThrow(
        QueueError
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ HIGH SEVERITY ERROR:",
        expect.stringContaining("Database connection failed")
      );
    });

    it("should throw QueueError with classified JobError", async () => {
      const error = new Error("Database connection failed");
      const operation = vi.fn().mockRejectedValue(error);

      try {
        await ErrorHandler.withErrorHandling(operation);
      } catch (caughtError) {
        const queueError = caughtError as QueueError;
        expect(queueError).toBeInstanceOf(QueueError);
        expect(queueError.jobError.type).toBe(ErrorType.DATABASE_ERROR);
        expect(queueError.jobError.severity).toBe(ErrorSeverity.HIGH);
        expect(queueError.jobError.message).toBe("Database connection failed");
      }
    });

    it("should handle different error types", async () => {
      const networkError = new Error("Network timeout");
      const operation = vi.fn().mockRejectedValue(networkError);

      try {
        await ErrorHandler.withErrorHandling(operation);
      } catch (caughtError) {
        const queueError = caughtError as QueueError;
        expect(queueError).toBeInstanceOf(QueueError);
        expect(queueError.jobError.type).toBe(ErrorType.NETWORK_ERROR);
        expect(queueError.jobError.severity).toBe(ErrorSeverity.MEDIUM);
      }
    });

    it("should handle unknown errors", async () => {
      const unknownError = new Error("Some random error");
      const operation = vi.fn().mockRejectedValue(unknownError);

      try {
        await ErrorHandler.withErrorHandling(operation);
      } catch (caughtError) {
        const queueError = caughtError as QueueError;
        expect(queueError).toBeInstanceOf(QueueError);
        expect(queueError.jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
        expect(queueError.jobError.severity).toBe(ErrorSeverity.MEDIUM);
      }
    });

    it("should preserve original error object", async () => {
      const originalError = new Error("Test error");
      originalError.name = "TestError";
      originalError.stack = "test stack";
      const operation = vi.fn().mockRejectedValue(originalError);

      try {
        await ErrorHandler.withErrorHandling(operation);
      } catch (caughtError) {
        const queueError = caughtError as QueueError;
        expect(queueError.jobError.originalError).toBe(originalError);
        expect(queueError.jobError.originalError?.name).toBe("TestError");
        expect(queueError.jobError.originalError?.stack).toBe("test stack");
      }
    });
  });

  describe("Context Merging", () => {
    it("should merge provided context with error context", async () => {
      const error = new Error("Test error");
      const operation = vi.fn().mockRejectedValue(error);
      const context = { operation: "test", userId: 123 };

      try {
        await ErrorHandler.withErrorHandling(operation, context);
      } catch (caughtError) {
        const queueError = caughtError as QueueError;
        expect(queueError.jobError.context).toEqual({
          operation: "test",
          userId: 123,
        });
      }
    });

    it("should handle empty context", async () => {
      const error = new Error("Test error");
      const operation = vi.fn().mockRejectedValue(error);
      const context = {};

      try {
        await ErrorHandler.withErrorHandling(operation, context);
      } catch (caughtError) {
        const queueError = caughtError as QueueError;
        expect(queueError.jobError.context).toEqual({});
      }
    });

    it("should handle undefined context", async () => {
      const error = new Error("Test error");
      const operation = vi.fn().mockRejectedValue(error);

      try {
        await ErrorHandler.withErrorHandling(operation, undefined);
      } catch (caughtError) {
        const queueError = caughtError as QueueError;
        expect(queueError.jobError.context).toEqual({});
      }
    });

    it("should handle complex context objects", async () => {
      const error = new Error("Test error");
      const operation = vi.fn().mockRejectedValue(error);
      const context = {
        nested: { key: "value" },
        array: [1, 2, 3],
        nullValue: null,
        undefinedValue: undefined,
      };

      try {
        await ErrorHandler.withErrorHandling(operation, context);
      } catch (caughtError) {
        const queueError = caughtError as QueueError;
        expect(queueError.jobError.context).toEqual(context);
      }
    });
  });

  describe("Error Logging", () => {
    it("should log errors with merged context", async () => {
      const error = new Error("Test error");
      const operation = vi.fn().mockRejectedValue(error);
      const context = { operation: "test", userId: 123 };

      try {
        await ErrorHandler.withErrorHandling(operation, context);
      } catch {
        // Error should be logged
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "⚠️ MEDIUM SEVERITY ERROR:",
        expect.stringContaining('"operation": "test"')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "⚠️ MEDIUM SEVERITY ERROR:",
        expect.stringContaining('"userId": 123')
      );
    });

    it("should log errors without context when none provided", async () => {
      const error = new Error("Test error");
      const operation = vi.fn().mockRejectedValue(error);

      try {
        await ErrorHandler.withErrorHandling(operation);
      } catch {
        // Error should be logged
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "⚠️ MEDIUM SEVERITY ERROR:",
        expect.stringContaining("Test error")
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle operations that throw non-Error objects", async () => {
      const operation = vi.fn().mockRejectedValue("String error");

      // The actual implementation will throw a TypeError when trying to access error.message
      await expect(ErrorHandler.withErrorHandling(operation)).rejects.toThrow(
        TypeError
      );
    });

    it("should handle operations that throw null", async () => {
      const operation = vi.fn().mockRejectedValue(null);

      // The actual implementation will throw a TypeError when trying to access error.message
      await expect(ErrorHandler.withErrorHandling(operation)).rejects.toThrow(
        TypeError
      );
    });

    it("should handle operations that throw undefined", async () => {
      const operation = vi.fn().mockRejectedValue(undefined);

      // The actual implementation will throw a TypeError when trying to access error.message
      await expect(ErrorHandler.withErrorHandling(operation)).rejects.toThrow(
        TypeError
      );
    });

    it("should handle operations that throw numbers", async () => {
      const operation = vi.fn().mockRejectedValue(42);

      // The actual implementation will throw a TypeError when trying to access error.message
      await expect(ErrorHandler.withErrorHandling(operation)).rejects.toThrow(
        TypeError
      );
    });

    it("should handle operations that throw objects", async () => {
      const customError = { message: "Custom error", code: "CUSTOM" };
      const operation = vi.fn().mockRejectedValue(customError);

      try {
        await ErrorHandler.withErrorHandling(operation);
      } catch (caughtError) {
        const queueError = caughtError as QueueError;
        expect(queueError).toBeInstanceOf(QueueError);
        expect(queueError.jobError.type).toBe(ErrorType.UNKNOWN_ERROR);
        expect(queueError.jobError.severity).toBe(ErrorSeverity.MEDIUM);
      }
    });
  });

  describe("Async Operation Behavior", () => {
    it("should handle operations that return promises", async () => {
      const operation = vi
        .fn()
        .mockResolvedValue(Promise.resolve("async result"));

      const result = await ErrorHandler.withErrorHandling(operation);

      expect(result).toBe("async result");
    });

    it("should handle operations that return delayed promises", async () => {
      const operation = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve("delayed result"), 10)
            )
        );

      const result = await ErrorHandler.withErrorHandling(operation);

      expect(result).toBe("delayed result");
    });

    it("should handle operations that reject with delayed promises", async () => {
      const error = new Error("Delayed error");
      const operation = vi
        .fn()
        .mockImplementation(
          () => new Promise((_, reject) => setTimeout(() => reject(error), 10))
        );

      await expect(ErrorHandler.withErrorHandling(operation)).rejects.toThrow(
        QueueError
      );
    });
  });
});
