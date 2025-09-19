import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ImportError,
  getUserErrorMessage,
  logError,
  normalizeError,
} from "../error-utils";

describe("error-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ImportError", () => {
    it("should create ImportError with message", () => {
      const error = new ImportError("Test error message");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ImportError);
      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("ImportError");
    });

    it("should create ImportError with message and cause", () => {
      const cause = new Error("Original error");
      const error = new ImportError("Test error message", { cause });

      expect(error.message).toBe("Test error message");
      expect(error.cause).toBe(cause);
    });
  });

  describe("normalizeError", () => {
    it("should normalize Error objects", () => {
      const originalError = new Error("Test error");
      const normalized = normalizeError(originalError);

      expect(normalized).toBeInstanceOf(ImportError);
      expect(normalized.message).toBe("Test error");
      expect(normalized.cause).toBe(originalError);
    });

    it("should normalize string errors", () => {
      const normalized = normalizeError("String error message");

      expect(normalized).toBeInstanceOf(ImportError);
      expect(normalized.message).toBe("String error message");
    });

    it("should normalize object errors", () => {
      const errorObj = { message: "Object error message" };
      const normalized = normalizeError(errorObj);

      expect(normalized).toBeInstanceOf(ImportError);
      expect(normalized.message).toBe("An unknown error occurred");
      expect(normalized.userMessage).toBe(
        "An unexpected error occurred. Please try again."
      );
    });

    it("should handle null and undefined", () => {
      const nullNormalized = normalizeError(null);
      expect(nullNormalized).toBeInstanceOf(ImportError);
      expect(nullNormalized.message).toBe("An unknown error occurred");

      const undefinedNormalized = normalizeError(undefined);
      expect(undefinedNormalized).toBeInstanceOf(ImportError);
      expect(undefinedNormalized.message).toBe("An unknown error occurred");
    });

    it("should handle primitive values", () => {
      const numberNormalized = normalizeError(404);
      expect(numberNormalized).toBeInstanceOf(ImportError);
      expect(numberNormalized.message).toBe("An unknown error occurred");

      const booleanNormalized = normalizeError(false);
      expect(booleanNormalized).toBeInstanceOf(ImportError);
      expect(booleanNormalized.message).toBe("An unknown error occurred");
    });

    it("should preserve ImportError instances", () => {
      const importError = new ImportError("Already normalized");
      const normalized = normalizeError(importError);

      expect(normalized).toBe(importError); // Should return the same instance
    });
  });

  describe("getUserErrorMessage", () => {
    it("should return userMessage from normalized Error objects", () => {
      const error = new Error("User-friendly error");
      const message = getUserErrorMessage(error);

      expect(message).toBe("An unexpected error occurred. Please try again.");
    });

    it("should return userMessage from ImportError", () => {
      const error = new ImportError("Import-specific error", {
        userMessage: "Custom user message",
      });
      const message = getUserErrorMessage(error);

      expect(message).toBe("Custom user message");
    });

    it("should handle string errors", () => {
      const message = getUserErrorMessage("String error");

      expect(message).toBe("An unexpected error occurred. Please try again.");
    });

    it("should handle object errors", () => {
      const errorObj = { message: "Object error message" };
      const message = getUserErrorMessage(errorObj);

      expect(message).toBe("An unexpected error occurred. Please try again.");
    });

    it("should provide fallback for unknown error types", () => {
      const message = getUserErrorMessage(42);

      expect(message).toBe("An unexpected error occurred. Please try again.");
    });

    it("should handle null and undefined", () => {
      expect(getUserErrorMessage(null)).toBe(
        "An unexpected error occurred. Please try again."
      );
      expect(getUserErrorMessage(undefined)).toBe(
        "An unexpected error occurred. Please try again."
      );
    });

    it("should handle empty string message", () => {
      const error = new Error("");
      const message = getUserErrorMessage(error);

      expect(message).toBe("An unexpected error occurred. Please try again.");
    });

    it("should handle whitespace-only message", () => {
      const error = new Error("   ");
      const message = getUserErrorMessage(error);

      expect(message).toBe("An unexpected error occurred. Please try again.");
    });

    it("should handle nested error objects", () => {
      const nestedError = {
        error: {
          message: "Nested error message",
        },
      };
      const message = getUserErrorMessage(nestedError);

      expect(message).toBe("An unexpected error occurred. Please try again.");
    });
  });

  describe("logError", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should log normalized error object with context", () => {
      const error = new Error("Test error");
      logError("TestContext", error);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[TestContext]",
        expect.objectContaining({
          message: "Test error",
          code: "UNKNOWN_ERROR",
          recoverable: false,
          userMessage: "An unexpected error occurred. Please try again.",
          cause: error,
          stack: expect.any(String),
        })
      );
    });

    it("should log normalized string errors", () => {
      logError("TestContext", "String error");

      expect(consoleSpy).toHaveBeenCalledWith(
        "[TestContext]",
        expect.objectContaining({
          message: "String error",
          code: "UNKNOWN_ERROR",
          recoverable: false,
          userMessage: "An unexpected error occurred. Please try again.",
          cause: "String error",
        })
      );
    });

    it("should log normalized object errors", () => {
      const originalError = { message: "Object error" };
      logError("TestContext", originalError);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[TestContext]",
        expect.objectContaining({
          message: "An unknown error occurred",
          code: "UNKNOWN_ERROR",
          recoverable: false,
          userMessage: "An unexpected error occurred. Please try again.",
          cause: originalError,
        })
      );
    });

    it("should handle empty context", () => {
      const error = new Error("Test error");
      logError("", error);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[]",
        expect.objectContaining({
          message: "Test error",
          code: "UNKNOWN_ERROR",
        })
      );
    });

    it("should handle null/undefined errors", () => {
      logError("TestContext", null);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[TestContext]",
        expect.objectContaining({
          message: "An unknown error occurred",
          cause: undefined,
        })
      );

      logError("TestContext", undefined);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[TestContext]",
        expect.objectContaining({
          message: "An unknown error occurred",
          cause: undefined,
        })
      );
    });
  });

  describe("integration scenarios", () => {
    it("should work together in error handling flow", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      try {
        throw new Error("Original error");
      } catch (error) {
        const normalized = normalizeError(error);
        const userMessage = getUserErrorMessage(normalized);
        logError("IntegrationTest", normalized);

        expect(normalized).toBeInstanceOf(ImportError);
        expect(userMessage).toBe(
          "An unexpected error occurred. Please try again."
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          "[IntegrationTest]",
          expect.objectContaining({
            message: "Original error",
            code: "UNKNOWN_ERROR",
          })
        );
      }

      consoleSpy.mockRestore();
    });

    it("should handle complex error chain", () => {
      const originalError = new Error("Network timeout");
      const wrappedError = new ImportError("Upload failed", {
        cause: originalError,
      });

      const userMessage = getUserErrorMessage(wrappedError);
      const normalized = normalizeError(wrappedError);

      expect(userMessage).toBe("Upload failed");
      expect(normalized).toBe(wrappedError); // Should not double-wrap
      expect(normalized.cause).toBe(originalError);
    });
  });
});
