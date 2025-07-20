import { describe, it, expect } from "vitest";
import {
  type ErrorBroadcastData,
  type ErrorBroadcastDependencies,
} from "../../error-broadcasting";

describe("Error Broadcasting - Type Definitions", () => {
  describe("ErrorBroadcastData interface", () => {
    it("should accept valid ErrorBroadcastData with all fields", () => {
      // Arrange & Act
      const validData: ErrorBroadcastData = {
        importId: "import-123",
        noteId: "note-456",
        errorType: "PARSING_ERROR",
        errorMessage: "Test error message",
        context: "test-context",
        metadata: { key: "value" },
      };

      // Assert
      expect(validData.importId).toBe("import-123");
      expect(validData.noteId).toBe("note-456");
      expect(validData.errorType).toBe("PARSING_ERROR");
      expect(validData.errorMessage).toBe("Test error message");
      expect(validData.context).toBe("test-context");
      expect(validData.metadata).toEqual({ key: "value" });
    });

    it("should accept ErrorBroadcastData with minimal required fields", () => {
      // Arrange & Act
      const minimalData: ErrorBroadcastData = {
        errorType: "PROCESSING_ERROR",
        errorMessage: "Minimal error",
        context: "minimal-context",
      };

      // Assert
      expect(minimalData.errorType).toBe("PROCESSING_ERROR");
      expect(minimalData.errorMessage).toBe("Minimal error");
      expect(minimalData.context).toBe("minimal-context");
      expect(minimalData.importId).toBeUndefined();
      expect(minimalData.noteId).toBeUndefined();
      expect(minimalData.metadata).toBeUndefined();
    });

    it("should accept all error types", () => {
      const errorTypes = [
        "PARSING_ERROR",
        "PROCESSING_ERROR",
        "DATABASE_ERROR",
        "VALIDATION_ERROR",
      ] as const;

      errorTypes.forEach((errorType) => {
        // Arrange & Act
        const data: ErrorBroadcastData = {
          errorType,
          errorMessage: `Test ${errorType}`,
          context: "test-context",
        };

        // Assert
        expect(data.errorType).toBe(errorType);
      });
    });

    it("should handle optional fields correctly", () => {
      // Arrange & Act
      const dataWithOptionals: ErrorBroadcastData = {
        importId: "import-123",
        noteId: "note-456",
        errorType: "DATABASE_ERROR",
        errorMessage: "Database error",
        context: "database",
        metadata: {
          operation: "save",
          table: "ingredients",
          timestamp: "2023-01-01T00:00:00Z",
        },
      };

      // Assert
      expect(dataWithOptionals.importId).toBe("import-123");
      expect(dataWithOptionals.noteId).toBe("note-456");
      expect(dataWithOptionals.metadata).toEqual({
        operation: "save",
        table: "ingredients",
        timestamp: "2023-01-01T00:00:00Z",
      });
    });

    it("should handle complex metadata", () => {
      // Arrange & Act
      const complexMetadata = {
        nested: {
          level1: {
            level2: "deep-value",
            array: [1, 2, 3],
          },
        },
        mixed: {
          string: "value",
          number: 42,
          boolean: true,
          null: null,
        },
      };

      const dataWithComplexMetadata: ErrorBroadcastData = {
        errorType: "VALIDATION_ERROR",
        errorMessage: "Complex validation error",
        context: "validation",
        metadata: complexMetadata,
      };

      // Assert
      expect(dataWithComplexMetadata.metadata).toEqual(complexMetadata);
    });
  });

  describe("ErrorBroadcastDependencies interface", () => {
    it("should extend BaseWorkerDependencies", () => {
      // Arrange & Act
      const mockLogger = { log: () => {} };
      const mockAddStatusEventAndBroadcast = async () => {};

      const deps: ErrorBroadcastDependencies = {
        logger: mockLogger,
        addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
      };

      // Assert
      expect(deps.logger).toBe(mockLogger);
      expect(deps.addStatusEventAndBroadcast).toBe(
        mockAddStatusEventAndBroadcast
      );
    });

    it("should have correct addStatusEventAndBroadcast signature", () => {
      // Arrange & Act
      const mockAddStatusEventAndBroadcast = async (_event: {
        importId: string;
        noteId?: string;
        status: "FAILED" | "PROCESSING" | "COMPLETED";
        message?: string;
        context?: string;
        currentCount?: number;
        totalCount?: number;
        indentLevel?: number;
        metadata?: Record<string, unknown>;
      }) => {
        return { success: true };
      };

      const deps: ErrorBroadcastDependencies = {
        logger: { log: () => {} },
        addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
      } as ErrorBroadcastDependencies;

      // Assert
      expect(typeof deps.addStatusEventAndBroadcast).toBe("function");
    });

    it("should handle optional logger", () => {
      // Arrange & Act
      const depsWithoutLogger: ErrorBroadcastDependencies = {
        addStatusEventAndBroadcast: async () => {},
      } as unknown as ErrorBroadcastDependencies;

      // Assert
      expect(depsWithoutLogger.logger).toBeUndefined();
    });
  });

  describe("Error type union", () => {
    it("should only accept valid error types", () => {
      // These should be valid
      const validTypes = [
        "PARSING_ERROR",
        "PROCESSING_ERROR",
        "DATABASE_ERROR",
        "VALIDATION_ERROR",
      ] as const;

      validTypes.forEach((errorType) => {
        const data: ErrorBroadcastData = {
          errorType,
          errorMessage: "Test",
          context: "test",
        };
        expect(data.errorType).toBe(errorType);
      });
    });

    it("should handle error type in switch statements", () => {
      const getErrorDescription = (
        errorType: ErrorBroadcastData["errorType"]
      ): string => {
        switch (errorType) {
          case "PARSING_ERROR":
            return "Parsing failed";
          case "PROCESSING_ERROR":
            return "Processing failed";
          case "DATABASE_ERROR":
            return "Database failed";
          case "VALIDATION_ERROR":
            return "Validation failed";
          default:
            return "Unknown error";
        }
      };

      expect(getErrorDescription("PARSING_ERROR")).toBe("Parsing failed");
      expect(getErrorDescription("PROCESSING_ERROR")).toBe("Processing failed");
      expect(getErrorDescription("DATABASE_ERROR")).toBe("Database failed");
      expect(getErrorDescription("VALIDATION_ERROR")).toBe("Validation failed");
    });
  });

  describe("Metadata type", () => {
    it("should accept Record<string, unknown> for metadata", () => {
      // Arrange & Act
      const metadata: Record<string, unknown> = {
        stringValue: "test",
        numberValue: 42,
        booleanValue: true,
        nullValue: null,
        arrayValue: [1, 2, 3],
        objectValue: { nested: "value" },
      };

      const data: ErrorBroadcastData = {
        errorType: "PROCESSING_ERROR",
        errorMessage: "Test",
        context: "test",
        metadata,
      };

      // Assert
      expect(data.metadata).toEqual(metadata);
    });

    it("should handle empty metadata object", () => {
      // Arrange & Act
      const data: ErrorBroadcastData = {
        errorType: "PROCESSING_ERROR",
        errorMessage: "Test",
        context: "test",
        metadata: {},
      };

      // Assert
      expect(data.metadata).toEqual({});
    });
  });
});
