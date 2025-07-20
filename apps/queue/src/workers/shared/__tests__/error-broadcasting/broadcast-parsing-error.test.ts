import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  broadcastParsingError,
  type ErrorBroadcastDependencies,
} from "../../error-broadcasting";

describe("Error Broadcasting - broadcastParsingError", () => {
  let mockDeps: ErrorBroadcastDependencies;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock dependencies
    mockDeps = {
      logger: { log: vi.fn() },
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue(undefined),
    } as unknown as ErrorBroadcastDependencies;
  });

  it("should handle parsing error with all fields", async () => {
    // Arrange
    const parsingData = {
      importId: "import-123",
      noteId: "note-456",
      lineId: "line-789",
      reference: "1 cup flour",
      errorMessage: "Failed to parse ingredient line",
      context: "ingredient-parsing",
    };

    // Act & Assert - should not throw
    await expect(
      broadcastParsingError(mockDeps, parsingData)
    ).resolves.toBeUndefined();
  });

  it("should handle parsing error without noteId", async () => {
    // Arrange
    const parsingData = {
      importId: "import-123",
      lineId: "line-789",
      reference: "2 tbsp oil",
      errorMessage: "Invalid ingredient format",
      context: "ingredient-parsing",
    };

    // Act & Assert - should not throw
    await expect(
      broadcastParsingError(mockDeps, parsingData)
    ).resolves.toBeUndefined();
  });

  it("should handle parsing error without importId", async () => {
    // Arrange
    const parsingData = {
      lineId: "line-789",
      reference: "3 eggs",
      errorMessage: "Missing quantity",
      context: "ingredient-parsing",
    };

    // Act & Assert - should not throw
    await expect(
      broadcastParsingError(mockDeps, parsingData)
    ).resolves.toBeUndefined();
  });

  it("should handle parsing error with all fields", async () => {
    // Arrange
    const parsingData = {
      importId: "import-123",
      noteId: "note-456",
      lineId: "line-789",
      reference: "1/2 cup sugar",
      errorMessage: "Invalid fraction format",
      context: "ingredient-parsing",
    };

    // Act & Assert - should not throw
    await expect(
      broadcastParsingError(mockDeps, parsingData)
    ).resolves.toBeUndefined();
  });

  it("should handle empty reference", async () => {
    // Arrange
    const parsingData = {
      importId: "import-123",
      lineId: "line-789",
      reference: "",
      errorMessage: "Empty ingredient line",
      context: "ingredient-parsing",
    };

    // Act & Assert - should not throw
    await expect(
      broadcastParsingError(mockDeps, parsingData)
    ).resolves.toBeUndefined();
  });

  it("should handle long reference text", async () => {
    // Arrange
    const longReference = "A".repeat(500);
    const parsingData = {
      importId: "import-123",
      lineId: "line-789",
      reference: longReference,
      errorMessage: "Reference too long",
      context: "ingredient-parsing",
    };

    // Act & Assert - should not throw
    await expect(
      broadcastParsingError(mockDeps, parsingData)
    ).resolves.toBeUndefined();
  });

  it("should handle special characters in lineId and reference", async () => {
    // Arrange
    const parsingData = {
      importId: "import-123",
      lineId: "line-with-special-chars-123!@#",
      reference: "1 cup flour (sifted) - optional",
      errorMessage: "Special characters in parsing",
      context: "ingredient-parsing",
    };

    // Act & Assert - should not throw
    await expect(
      broadcastParsingError(mockDeps, parsingData)
    ).resolves.toBeUndefined();
  });

  it("should handle broadcastError throwing an error", async () => {
    // Arrange
    const error = new Error("Broadcast failed");
    mockDeps.addStatusEventAndBroadcast = vi.fn().mockRejectedValue(error);

    const parsingData = {
      importId: "import-123",
      lineId: "line-789",
      reference: "test reference",
      errorMessage: "Test error",
      context: "ingredient-parsing",
    };

    // Act & Assert - should not throw (error is handled internally)
    await expect(
      broadcastParsingError(mockDeps, parsingData)
    ).resolves.toBeUndefined();
  });

  it("should handle different contexts", async () => {
    const contexts = [
      "ingredient-parsing",
      "instruction-parsing",
      "note-parsing",
      "recipe-parsing",
    ];

    for (const context of contexts) {
      // Arrange
      const parsingData = {
        importId: "import-123",
        lineId: "line-789",
        reference: "test reference",
        errorMessage: "Test error",
        context,
      };

      // Act & Assert - should not throw
      await expect(
        broadcastParsingError(mockDeps, parsingData)
      ).resolves.toBeUndefined();
    }
  });
});
