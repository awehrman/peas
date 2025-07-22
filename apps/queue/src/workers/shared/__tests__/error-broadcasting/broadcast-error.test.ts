import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ErrorBroadcastData,
  type ErrorBroadcastDependencies,
  broadcastError,
} from "../../error-broadcasting";

describe("Error Broadcasting - broadcastError", () => {
  let mockDeps: ErrorBroadcastDependencies;
  let mockLogger: { log: ReturnType<typeof vi.fn> };
  let mockAddStatusEventAndBroadcast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      log: vi.fn(),
    };

    // Create mock addStatusEventAndBroadcast
    mockAddStatusEventAndBroadcast = vi.fn().mockResolvedValue(undefined);

    // Create mock dependencies
    mockDeps = {
      logger: mockLogger,
      addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
    } as unknown as ErrorBroadcastDependencies;
  });

  it("should broadcast error successfully with all required fields", async () => {
    // Arrange
    const errorData: ErrorBroadcastData = {
      importId: "import-123",
      noteId: "note-456",
      errorType: "PARSING_ERROR",
      errorMessage: "Failed to parse ingredient line",
      context: "ingredient-parsing",
      metadata: { lineNumber: 5, rawText: "1 cup flour" },
    };

    // Act
    await broadcastError(mockDeps, errorData);

    // Assert
    expect(mockLogger.log).toHaveBeenCalledWith(
      "[ERROR_BROADCAST] Broadcasting PARSING_ERROR for ingredient-parsing: Failed to parse ingredient line",
      "error"
    );

    expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-123",
      noteId: "note-456",
      status: "FAILED",
      message: "❌ Failed to parse ingredient line",
      context: "ingredient-parsing",
      indentLevel: 2,
      metadata: {
        errorType: "PARSING_ERROR",
        errorMessage: "Failed to parse ingredient line",
        lineNumber: 5,
        rawText: "1 cup flour",
      },
    });
  });

  it("should broadcast error without noteId", async () => {
    // Arrange
    const errorData: ErrorBroadcastData = {
      importId: "import-123",
      errorType: "PROCESSING_ERROR",
      errorMessage: "Database connection failed",
      context: "database-operations",
    };

    // Act
    await broadcastError(mockDeps, errorData);

    // Assert
    expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
      importId: "import-123",
      noteId: undefined,
      status: "FAILED",
      message: "❌ Database connection failed",
      context: "database-operations",
      indentLevel: 2,
      metadata: {
        errorType: "PROCESSING_ERROR",
        errorMessage: "Database connection failed",
      },
    });
  });

  it("should skip broadcast when no importId is provided", async () => {
    // Arrange
    const errorData: ErrorBroadcastData = {
      errorType: "VALIDATION_ERROR",
      errorMessage: "Invalid input data",
      context: "validation",
    };

    // Act
    await broadcastError(mockDeps, errorData);

    // Assert
    expect(mockLogger.log).toHaveBeenCalledWith(
      "[ERROR_BROADCAST] Skipping error broadcast - no importId provided",
      "warn"
    );

    expect(mockAddStatusEventAndBroadcast).not.toHaveBeenCalled();
  });

  it("should handle logger failure during no importId warning", async () => {
    // Arrange
    const failingLogger = {
      log: vi.fn().mockImplementation((message: string) => {
        if (message.includes("Skipping error broadcast")) {
          throw new Error("Logger failed during warning");
        }
        // Don't throw for other messages
      }),
    };

    const depsWithFailingLogger: ErrorBroadcastDependencies = {
      ...mockDeps,
      logger: failingLogger,
    } as unknown as ErrorBroadcastDependencies;

    const errorData: ErrorBroadcastData = {
      errorType: "VALIDATION_ERROR",
      errorMessage: "Invalid input data",
      context: "validation",
    };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    await broadcastError(depsWithFailingLogger, errorData);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      "[ERROR_BROADCAST] Logger failed: Error: Logger failed during warning"
    );

    // Should not attempt to broadcast
    expect(mockAddStatusEventAndBroadcast).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle all error types", async () => {
    const errorTypes = [
      "PARSING_ERROR",
      "PROCESSING_ERROR",
      "DATABASE_ERROR",
      "VALIDATION_ERROR",
    ] as const;

    for (const errorType of errorTypes) {
      // Reset mocks for each iteration
      vi.clearAllMocks();

      // Arrange
      const errorData: ErrorBroadcastData = {
        importId: "import-123",
        errorType,
        errorMessage: `Test ${errorType} message`,
        context: "test-context",
      };

      // Act
      await broadcastError(mockDeps, errorData);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          importId: "import-123",
          status: "FAILED",
          message: `❌ Test ${errorType} message`,
          metadata: expect.objectContaining({
            errorType,
            errorMessage: `Test ${errorType} message`,
          }),
        })
      );
    }
  });

  it("should handle logger failure gracefully", async () => {
    // Arrange
    const failingLogger = {
      log: vi.fn().mockImplementation(() => {
        throw new Error("Logger failed");
      }),
    };

    const depsWithFailingLogger: ErrorBroadcastDependencies = {
      ...mockDeps,
      logger: failingLogger,
    } as unknown as ErrorBroadcastDependencies;

    const errorData: ErrorBroadcastData = {
      importId: "import-123",
      errorType: "PARSING_ERROR",
      errorMessage: "Test error",
      context: "test-context",
    };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    await broadcastError(depsWithFailingLogger, errorData);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      "[ERROR_BROADCAST] Logger failed: Error: Logger failed"
    );

    // Should still broadcast the error
    expect(mockAddStatusEventAndBroadcast).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle broadcast failure gracefully", async () => {
    // Arrange
    const failingBroadcast = vi
      .fn()
      .mockRejectedValue(new Error("Broadcast failed"));
    const depsWithFailingBroadcast: ErrorBroadcastDependencies = {
      ...mockDeps,
      addStatusEventAndBroadcast: failingBroadcast,
    } as unknown as ErrorBroadcastDependencies;

    const errorData: ErrorBroadcastData = {
      importId: "import-123",
      errorType: "DATABASE_ERROR",
      errorMessage: "Database error",
      context: "database",
    };

    // Act
    await broadcastError(depsWithFailingBroadcast, errorData);

    // Assert
    expect(mockLogger.log).toHaveBeenCalledWith(
      "[ERROR_BROADCAST] Failed to broadcast error: Error: Broadcast failed",
      "error"
    );
  });

  it("should handle both logger and broadcast failure", async () => {
    // Arrange
    const failingLogger = {
      log: vi.fn().mockImplementation(() => {
        throw new Error("Logger failed");
      }),
    };

    const failingBroadcast = vi
      .fn()
      .mockRejectedValue(new Error("Broadcast failed"));
    const depsWithFailures: ErrorBroadcastDependencies = {
      ...mockDeps,
      logger: failingLogger,
      addStatusEventAndBroadcast: failingBroadcast,
    } as unknown as ErrorBroadcastDependencies;

    const errorData: ErrorBroadcastData = {
      importId: "import-123",
      errorType: "VALIDATION_ERROR",
      errorMessage: "Validation error",
      context: "validation",
    };

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    await broadcastError(depsWithFailures, errorData);

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      "[ERROR_BROADCAST] Failed to broadcast error and logger failed: Error: Broadcast failed, Error: Logger failed"
    );

    consoleSpy.mockRestore();
  });

  it("should handle empty error message", async () => {
    // Arrange
    const errorData: ErrorBroadcastData = {
      importId: "import-123",
      errorType: "PROCESSING_ERROR",
      errorMessage: "",
      context: "test-context",
    };

    // Act
    await broadcastError(mockDeps, errorData);

    // Assert
    expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "❌ ",
      })
    );
  });

  it("should handle long error messages", async () => {
    // Arrange
    const longMessage = "A".repeat(1000);
    const errorData: ErrorBroadcastData = {
      importId: "import-123",
      errorType: "PARSING_ERROR",
      errorMessage: longMessage,
      context: "test-context",
    };

    // Act
    await broadcastError(mockDeps, errorData);

    // Assert
    expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `❌ ${longMessage}`,
      })
    );
  });

  it("should merge metadata correctly", async () => {
    // Arrange
    const errorData: ErrorBroadcastData = {
      importId: "import-123",
      errorType: "PARSING_ERROR",
      errorMessage: "Test error",
      context: "test-context",
      metadata: {
        customField: "customValue",
        numberField: 42,
        booleanField: true,
      },
    };

    // Act
    await broadcastError(mockDeps, errorData);

    // Assert
    expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          errorType: "PARSING_ERROR",
          errorMessage: "Test error",
          customField: "customValue",
          numberField: 42,
          booleanField: true,
        },
      })
    );
  });
});
