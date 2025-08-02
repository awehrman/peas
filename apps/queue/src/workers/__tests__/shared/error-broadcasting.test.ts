import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogLevel } from "../../../types";
import {
  type ErrorBroadcastData,
  type ErrorBroadcastDependencies,
  broadcastError,
  broadcastParsingError,
  broadcastProcessingError,
} from "../../shared/error-broadcasting";

describe("ErrorBroadcasting", () => {
  let mockLogger: {
    log: ReturnType<typeof vi.fn>;
  };
  let mockAddStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
  let mockDeps: ErrorBroadcastDependencies;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    };

    mockAddStatusEventAndBroadcast = vi.fn().mockResolvedValue({});

    mockDeps = {
      logger: mockLogger,
      addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
    };
  });

  describe("broadcastError", () => {
    it("should log error and broadcast status when importId is provided", async () => {
      const errorData: ErrorBroadcastData = {
        importId: "import-123",
        noteId: "note-456",
        errorType: "PARSING_ERROR",
        errorMessage: "Failed to parse ingredient",
        context: "ingredient-parsing",
        metadata: { lineNumber: 5 },
      };

      await broadcastError(mockDeps, errorData);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Broadcasting PARSING_ERROR for ingredient-parsing: Failed to parse ingredient",
        LogLevel.ERROR,
        {
          errorType: "PARSING_ERROR",
          errorMessage: "Failed to parse ingredient",
          context: "ingredient-parsing",
          noteId: "note-456",
          importId: "import-123",
          metadata: { lineNumber: 5 },
        }
      );

      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-123",
        noteId: "note-456",
        status: "FAILED",
        message: " 274c Failed to parse ingredient",
        context: "ingredient-parsing",
        indentLevel: 2,
        metadata: {
          errorType: "PARSING_ERROR",
          errorMessage: "Failed to parse ingredient",
          lineNumber: 5,
        },
      });
    });

    it("should handle different error types", async () => {
      const errorTypes = [
        "PARSING_ERROR",
        "PROCESSING_ERROR",
        "DATABASE_ERROR",
        "VALIDATION_ERROR",
      ] as const;

      for (const errorType of errorTypes) {
        const errorData: ErrorBroadcastData = {
          importId: "import-123",
          errorType,
          errorMessage: "Test error",
          context: "test-context",
        };

        await broadcastError(mockDeps, errorData);

        expect(mockLogger.log).toHaveBeenCalledWith(
          `[ERROR_BROADCAST] Broadcasting ${errorType} for test-context: Test error`,
          LogLevel.ERROR,
          expect.objectContaining({
            errorType,
            errorMessage: "Test error",
            context: "test-context",
          })
        );

        expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith(
          expect.objectContaining({
            status: "FAILED",
            metadata: expect.objectContaining({
              errorType,
              errorMessage: "Test error",
            }),
          })
        );
      }
    });

    it("should skip broadcast when importId is not provided", async () => {
      const errorData: ErrorBroadcastData = {
        noteId: "note-456",
        errorType: "PARSING_ERROR",
        errorMessage: "Failed to parse ingredient",
        context: "ingredient-parsing",
      };

      await broadcastError(mockDeps, errorData);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Broadcasting PARSING_ERROR for ingredient-parsing: Failed to parse ingredient",
        LogLevel.ERROR,
        expect.objectContaining({
          errorType: "PARSING_ERROR",
          errorMessage: "Failed to parse ingredient",
          context: "ingredient-parsing",
          noteId: "note-456",
          importId: undefined,
        })
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Skipping error broadcast - no importId provided",
        LogLevel.WARN,
        expect.objectContaining({
          errorType: "PARSING_ERROR",
          errorMessage: "Failed to parse ingredient",
          context: "ingredient-parsing",
          noteId: "note-456",
        })
      );

      expect(mockAddStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle logger errors gracefully", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockLogger.log.mockImplementation(() => {
        throw new Error("Logger failed");
      });

      const errorData: ErrorBroadcastData = {
        importId: "import-123",
        errorType: "PARSING_ERROR",
        errorMessage: "Failed to parse ingredient",
        context: "ingredient-parsing",
      };

      await broadcastError(mockDeps, errorData);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Logger failed: Error: Logger failed"
      );

      // Should still attempt to broadcast
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle broadcast errors gracefully", async () => {
      mockAddStatusEventAndBroadcast.mockRejectedValue(
        new Error("Broadcast failed")
      );

      const errorData: ErrorBroadcastData = {
        importId: "import-123",
        errorType: "PARSING_ERROR",
        errorMessage: "Failed to parse ingredient",
        context: "ingredient-parsing",
      };

      await broadcastError(mockDeps, errorData);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Failed to broadcast error: Error: Broadcast failed",
        LogLevel.ERROR,
        expect.objectContaining({
          errorType: "PARSING_ERROR",
          errorMessage: "Failed to parse ingredient",
          context: "ingredient-parsing",
          importId: "import-123",
        })
      );
    });

    it("should handle both logger and broadcast errors", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockLogger.log.mockImplementation(() => {
        throw new Error("Logger failed");
      });
      mockAddStatusEventAndBroadcast.mockRejectedValue(
        new Error("Broadcast failed")
      );

      const errorData: ErrorBroadcastData = {
        importId: "import-123",
        errorType: "PARSING_ERROR",
        errorMessage: "Failed to parse ingredient",
        context: "ingredient-parsing",
      };

      await broadcastError(mockDeps, errorData);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Logger failed: Error: Logger failed"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Failed to broadcast error and logger failed: Error: Broadcast failed, Error: Logger failed"
      );

      consoleSpy.mockRestore();
    });

    it("should handle error data without optional fields", async () => {
      const errorData: ErrorBroadcastData = {
        errorType: "PROCESSING_ERROR",
        errorMessage: "Processing failed",
        context: "processing",
      };

      await broadcastError(mockDeps, errorData);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Broadcasting PROCESSING_ERROR for processing: Processing failed",
        LogLevel.ERROR,
        expect.objectContaining({
          errorType: "PROCESSING_ERROR",
          errorMessage: "Processing failed",
          context: "processing",
          noteId: undefined,
          importId: undefined,
          metadata: undefined,
        })
      );

      expect(mockAddStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle logger failure when no importId provided", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      // Mock logger to throw an error
      const failingLogger = {
        log: vi.fn().mockImplementation(() => {
          throw new Error("Logger failed");
        }),
      };

      const depsWithFailingLogger: ErrorBroadcastDependencies = {
        logger: failingLogger,
        addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
      };

      const errorData: ErrorBroadcastData = {
        noteId: "note-456",
        errorType: "PARSING_ERROR",
        errorMessage: "Failed to parse ingredient",
        context: "ingredient-parsing",
        metadata: { lineNumber: 5 },
      };

      await broadcastError(depsWithFailingLogger, errorData);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Logger failed: Error: Logger failed"
      );
      expect(mockAddStatusEventAndBroadcast).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle logger failure when broadcasting fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      // Mock addStatusEventAndBroadcast to throw an error
      const failingBroadcaster = vi.fn().mockRejectedValue(new Error("Broadcast failed"));
      
      // Mock logger to throw an error when called for broadcast failure
      const failingLogger = {
        log: vi.fn().mockImplementation((message: string) => {
          if (message.includes("Failed to broadcast error")) {
            throw new Error("Logger failed during broadcast error");
          }
        }),
      };

      const depsWithFailingBroadcaster: ErrorBroadcastDependencies = {
        logger: failingLogger,
        addStatusEventAndBroadcast: failingBroadcaster,
      };

      const errorData: ErrorBroadcastData = {
        importId: "import-123",
        noteId: "note-456",
        errorType: "PARSING_ERROR",
        errorMessage: "Failed to parse ingredient",
        context: "ingredient-parsing",
        metadata: { lineNumber: 5 },
      };

      await broadcastError(depsWithFailingBroadcaster, errorData);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ERROR_BROADCAST] Failed to broadcast error and logger failed: Error: Broadcast failed, Error: Logger failed during broadcast error"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("broadcastParsingError", () => {
    it("should broadcast parsing error with correct data", async () => {
      const parsingData = {
        importId: "import-123",
        noteId: "note-456",
        lineId: "line-789",
        reference: "2 cups flour",
        errorMessage: "Invalid ingredient format",
        context: "ingredient-parsing",
      };

      await broadcastParsingError(mockDeps, parsingData);

      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-123",
        noteId: "note-456",
        status: "FAILED",
        message: " 274c Invalid ingredient format",
        context: "ingredient-parsing",
        indentLevel: 2,
        metadata: {
          errorType: "PARSING_ERROR",
          errorMessage: "Invalid ingredient format",
          lineId: "line-789",
          reference: "2 cups flour",
        },
      });
    });

    it("should handle parsing error without optional fields", async () => {
      const parsingData = {
        lineId: "line-789",
        reference: "2 cups flour",
        errorMessage: "Invalid ingredient format",
        context: "ingredient-parsing",
      };

      await broadcastParsingError(mockDeps, parsingData);

      // When importId is undefined, broadcastParsingError should not call addStatusEventAndBroadcast
      expect(mockAddStatusEventAndBroadcast).not.toHaveBeenCalled();
    });
  });

  describe("broadcastProcessingError", () => {
    it("should broadcast processing error with correct data", async () => {
      const processingData = {
        importId: "import-123",
        noteId: "note-456",
        errorMessage: "Database connection failed",
        context: "database-operation",
        metadata: { operation: "insert", table: "ingredients" },
      };

      await broadcastProcessingError(mockDeps, processingData);

      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-123",
        noteId: "note-456",
        status: "FAILED",
        message: " 274c Database connection failed",
        context: "database-operation",
        indentLevel: 2,
        metadata: {
          errorType: "PROCESSING_ERROR",
          errorMessage: "Database connection failed",
          operation: "insert",
          table: "ingredients",
        },
      });
    });

    it("should handle processing error without optional fields", async () => {
      const processingData = {
        errorMessage: "Processing failed",
        context: "processing",
      };

      await broadcastProcessingError(mockDeps, processingData);

      // When importId is undefined, broadcastProcessingError should not call addStatusEventAndBroadcast
      expect(mockAddStatusEventAndBroadcast).not.toHaveBeenCalled();
    });

    it("should handle processing error with metadata", async () => {
      const processingData = {
        importId: "import-123",
        errorMessage: "Network timeout",
        context: "api-call",
        metadata: { endpoint: "/api/ingredients", timeout: 5000 },
      };

      await broadcastProcessingError(mockDeps, processingData);

      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: "import-123",
        noteId: undefined,
        status: "FAILED",
        message: " 274c Network timeout",
        context: "api-call",
        indentLevel: 2,
        metadata: {
          errorType: "PROCESSING_ERROR",
          errorMessage: "Network timeout",
          endpoint: "/api/ingredients",
          timeout: 5000,
        },
      });
    });
  });
});
