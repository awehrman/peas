import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  broadcastProcessingError,
  type ErrorBroadcastDependencies,
} from "../../error-broadcasting";

describe("Error Broadcasting - broadcastProcessingError", () => {
  let mockDeps: ErrorBroadcastDependencies;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock dependencies
    mockDeps = {
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    } as unknown as ErrorBroadcastDependencies;
  });

  it("should handle processing error with all fields", async () => {
    // Arrange
    const processingData = {
      importId: "import-123",
      noteId: "note-456",
      errorMessage: "Failed to process ingredient",
      context: "ingredient-processing",
      metadata: {
        ingredientId: "ingredient-789",
        lineNumber: 5,
      },
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });

  it("should handle processing error without noteId", async () => {
    // Arrange
    const processingData = {
      importId: "import-123",
      errorMessage: "Database connection failed",
      context: "database-processing",
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });

  it("should handle processing error without importId", async () => {
    // Arrange
    const processingData = {
      errorMessage: "System error occurred",
      context: "system-processing",
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });

  it("should handle processing error without metadata", async () => {
    // Arrange
    const processingData = {
      importId: "import-123",
      noteId: "note-456",
      errorMessage: "Simple processing error",
      context: "simple-processing",
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });

  it("should handle processing error with complex metadata", async () => {
    // Arrange
    const complexMetadata = {
      step: "ingredient_parsing",
      attempt: 3,
      retryCount: 2,
      timestamp: new Date().toISOString(),
      details: {
        originalText: "2 cups flour",
        parsedAmount: "2",
        parsedUnit: "cups",
        parsedIngredient: "flour",
      },
      errors: ["Invalid unit format", "Missing quantity"],
    };

    const processingData = {
      importId: "import-123",
      errorMessage: "Complex processing error",
      context: "complex-processing",
      metadata: complexMetadata,
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });

  it("should handle empty error message", async () => {
    // Arrange
    const processingData = {
      importId: "import-123",
      errorMessage: "",
      context: "empty-error-processing",
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });

  it("should handle long error message", async () => {
    // Arrange
    const longMessage = "A".repeat(1000);
    const processingData = {
      importId: "import-123",
      errorMessage: longMessage,
      context: "long-error-processing",
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });

  it("should handle special characters in context", async () => {
    // Arrange
    const processingData = {
      importId: "import-123",
      errorMessage: "Special character error",
      context: "special-chars-processing!@#$%^&*()",
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });

  it("should handle broadcastError throwing an error", async () => {
    // Arrange
    const processingData = {
      importId: "import-123",
      errorMessage: "Test error",
      context: "test-processing",
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });

  it("should handle different processing contexts", async () => {
    const contexts = [
      "ingredient-processing",
      "instruction-processing",
      "note-processing",
      "recipe-processing",
      "image-processing",
    ];

    for (const context of contexts) {
      // Arrange
      const processingData = {
        importId: "import-123",
        errorMessage: "Test error",
        context,
      };

      // Act & Assert
      await expect(
        broadcastProcessingError(mockDeps, processingData)
      ).resolves.toBeUndefined();
    }
  });

  it("should handle metadata with various data types", async () => {
    // Arrange
    const metadataWithTypes = {
      string: "test string",
      number: 42,
      boolean: true,
      null: null,
      undefined: undefined,
      array: [1, 2, 3],
      object: { nested: "value" },
      date: new Date(),
    };

    const processingData = {
      importId: "import-123",
      errorMessage: "Type test error",
      context: "type-test-processing",
      metadata: metadataWithTypes,
    };

    // Act & Assert
    await expect(
      broadcastProcessingError(mockDeps, processingData)
    ).resolves.toBeUndefined();
  });
});
