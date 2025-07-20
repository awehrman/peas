/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServiceContainer } from "../../container";
import type { Queue } from "bullmq";

// Mock dependencies
vi.mock("../../register-queues", () => ({
  registerQueues: vi.fn(() => ({
    noteQueue: { close: vi.fn() } as Partial<Queue>,
    imageQueue: { close: vi.fn() } as Partial<Queue>,
    ingredientQueue: { close: vi.fn() } as Partial<Queue>,
    instructionQueue: { close: vi.fn() } as Partial<Queue>,
    categorizationQueue: { close: vi.fn() } as Partial<Queue>,
    sourceQueue: { close: vi.fn() } as Partial<Queue>,
  })),
}));

vi.mock("../../register-database", () => ({
  registerDatabase: vi.fn(() => ({
    prisma: { $disconnect: vi.fn() },
    createNote: vi.fn(),
  })),
}));

vi.mock("../../register-logger", () => ({
  registerLogger: vi.fn(() => ({
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    logWithContext: vi.fn(),
    getLogFiles: vi.fn(),
    rotateLogs: vi.fn(),
    getLogStats: vi.fn(),
    clearOldLogs: vi.fn(),
  })),
}));

describe("createServiceContainer Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Custom Close Method Override", () => {
    it("should use custom close method when provided", async () => {
      const mockCustomClose = vi.fn().mockResolvedValue(undefined);
      const container = createServiceContainer({ close: mockCustomClose });

      await container.close();

      expect(mockCustomClose).toHaveBeenCalled();
    });

    it("should handle errors in custom close method", async () => {
      const mockError = new Error("Custom close failed");
      const mockCustomClose = vi.fn().mockRejectedValue(mockError);
      const container = createServiceContainer({ close: mockCustomClose });

      await expect(container.close()).rejects.toThrow("Custom close failed");
      expect(mockCustomClose).toHaveBeenCalled();
    });
  });

  describe("Overridden Services Close Logic", () => {
    it("should close overridden queues when provided", async () => {
      const mockQueues = {
        noteQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
        imageQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
        ingredientQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
        instructionQueue: {
          close: vi.fn().mockResolvedValue(undefined),
        } as any,
        categorizationQueue: {
          close: vi.fn().mockResolvedValue(undefined),
        } as any,
        sourceQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
      };

      const container = createServiceContainer({ queues: mockQueues });

      await container.close();

      expect(mockQueues.noteQueue.close).toHaveBeenCalled();
      expect(mockQueues.imageQueue.close).toHaveBeenCalled();
      expect(mockQueues.ingredientQueue.close).toHaveBeenCalled();
      expect(mockQueues.instructionQueue.close).toHaveBeenCalled();
      expect(mockQueues.categorizationQueue.close).toHaveBeenCalled();
      expect(mockQueues.sourceQueue.close).toHaveBeenCalled();
    });

    it("should close overridden database when provided", async () => {
      const mockDatabase = {
        prisma: { $disconnect: vi.fn().mockResolvedValue(undefined) } as any,
        createNote: vi.fn(),
      } as any;

      const container = createServiceContainer({ database: mockDatabase });

      await container.close();

      expect(mockDatabase.prisma.$disconnect).toHaveBeenCalled();
    });

    it("should close overridden WebSocket when provided", async () => {
      const mockWebSocket = {
        webSocketManager: {
          close: vi.fn(),
        } as any,
      } as any;

      const container = createServiceContainer({ webSocket: mockWebSocket });

      await container.close();

      expect(mockWebSocket.webSocketManager.close).toHaveBeenCalled();
    });

    it("should use overridden logger for success message", async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
      } as any;

      const container = createServiceContainer({ logger: mockLogger });

      await container.close();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "ServiceContainer closed successfully"
      );
    });
  });

  describe("Error Handling in Close Logic", () => {
    it("should handle errors in overridden queues close", async () => {
      const mockError = new Error("Queue close failed");
      const mockQueues = {
        noteQueue: { close: vi.fn().mockRejectedValue(mockError) } as any,
        imageQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
        ingredientQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
        instructionQueue: {
          close: vi.fn().mockResolvedValue(undefined),
        } as any,
        categorizationQueue: {
          close: vi.fn().mockResolvedValue(undefined),
        } as any,
        sourceQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
      };

      const container = createServiceContainer({ queues: mockQueues });

      // Should not throw since Promise.allSettled is used
      await container.close();

      // Should still attempt to close other queues
      expect(mockQueues.imageQueue.close).toHaveBeenCalled();
      expect(mockQueues.ingredientQueue.close).toHaveBeenCalled();
      expect(mockQueues.instructionQueue.close).toHaveBeenCalled();
      expect(mockQueues.categorizationQueue.close).toHaveBeenCalled();
      expect(mockQueues.sourceQueue.close).toHaveBeenCalled();
    });

    it("should handle errors in overridden database disconnect", async () => {
      const mockError = new Error("Database disconnect failed");
      const mockDatabase = {
        prisma: { $disconnect: vi.fn().mockRejectedValue(mockError) } as any,
        createNote: vi.fn(),
      } as any;

      const mockLogger = {
        error: vi.fn(),
      } as any;

      const container = createServiceContainer({
        database: mockDatabase,
        logger: mockLogger,
      });

      await expect(container.close()).rejects.toThrow(
        "Database disconnect failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error closing ServiceContainer: Error: Database disconnect failed",
        mockError
      );
    });

    it("should handle errors in overridden WebSocket close", async () => {
      const mockError = new Error("WebSocket close failed");
      const mockWebSocket = {
        webSocketManager: {
          close: vi.fn().mockImplementation(() => {
            throw mockError;
          }),
        } as any,
      } as any;

      const mockLogger = {
        error: vi.fn(),
      } as any;

      const container = createServiceContainer({
        webSocket: mockWebSocket,
        logger: mockLogger,
      });

      await expect(container.close()).rejects.toThrow("WebSocket close failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error closing ServiceContainer: Error: WebSocket close failed",
        mockError
      );
    });

    it("should handle errors in overridden logger", async () => {
      const mockError = new Error("Logger error");
      const mockLogger = {
        info: vi.fn().mockImplementation(() => {
          throw mockError;
        }),
        error: vi.fn(),
      } as any;

      const container = createServiceContainer({ logger: mockLogger });

      await expect(container.close()).rejects.toThrow("Logger error");
    });

    it("should use base container logger when overridden logger has no error method", async () => {
      const mockLogger = {
        info: vi.fn(),
        // No error method
      } as any;

      const container = createServiceContainer({ logger: mockLogger });

      // Should not throw since we're not testing error conditions here
      await container.close();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "ServiceContainer closed successfully"
      );
    });
  });

  describe("Mixed Override Scenarios", () => {
    it("should handle partial overrides with error handling", async () => {
      const mockError = new Error("Database error");
      const mockDatabase = {
        prisma: { $disconnect: vi.fn().mockRejectedValue(mockError) } as any,
        createNote: vi.fn(),
      } as any;

      const mockLogger = {
        error: vi.fn(),
      } as any;

      const container = createServiceContainer({
        database: mockDatabase,
        logger: mockLogger,
      });

      await expect(container.close()).rejects.toThrow("Database error");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error closing ServiceContainer: Error: Database error",
        mockError
      );
    });

    it("should handle multiple overrides with mixed success/failure", async () => {
      const mockQueues = {
        noteQueue: {
          close: vi.fn().mockRejectedValue(new Error("Queue error")),
        } as any,
        imageQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
        ingredientQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
        instructionQueue: {
          close: vi.fn().mockResolvedValue(undefined),
        } as any,
        categorizationQueue: {
          close: vi.fn().mockResolvedValue(undefined),
        } as any,
        sourceQueue: { close: vi.fn().mockResolvedValue(undefined) } as any,
      };

      const mockDatabase = {
        prisma: {
          $disconnect: vi.fn().mockRejectedValue(new Error("DB error")),
        } as any,
        createNote: vi.fn(),
      } as any;

      const mockLogger = {
        error: vi.fn(),
      } as any;

      const container = createServiceContainer({
        queues: mockQueues,
        database: mockDatabase,
        logger: mockLogger,
      });

      await expect(container.close()).rejects.toThrow("DB error");

      // Should still attempt to close other queues
      expect(mockQueues.imageQueue.close).toHaveBeenCalled();
      expect(mockQueues.ingredientQueue.close).toHaveBeenCalled();
      expect(mockQueues.instructionQueue.close).toHaveBeenCalled();
      expect(mockQueues.categorizationQueue.close).toHaveBeenCalled();
      expect(mockQueues.sourceQueue.close).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined overrides gracefully", () => {
      const container = createServiceContainer(undefined);
      expect(container).toBeDefined();
      expect(typeof container.close).toBe("function");
    });

    it("should handle empty overrides object", () => {
      const container = createServiceContainer({});
      expect(container).toBeDefined();
      expect(typeof container.close).toBe("function");
    });

    it("should handle overrides with missing properties", () => {
      const container = createServiceContainer({
        queues: {} as any, // Missing queue properties
      });
      expect(container).toBeDefined();
      expect(typeof container.close).toBe("function");
    });
  });
});
