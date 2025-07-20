import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServiceContainer } from "../../container";

// Mock dependencies
vi.mock("../../register-queues", () => ({
  registerQueues: vi.fn(() => ({
    noteQueue: { close: vi.fn() },
    imageQueue: { close: vi.fn() },
    ingredientQueue: { close: vi.fn() },
    instructionQueue: { close: vi.fn() },
    categorizationQueue: { close: vi.fn() },
    sourceQueue: { close: vi.fn() },
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

describe("ServiceContainer Close Method", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    ServiceContainer.reset();
    container = ServiceContainer.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful Close", () => {
    it("should close all queues successfully", async () => {
      const mockLogger = vi.mocked(container.logger.info);

      await container.close();

      // Verify all queues were closed
      expect(container.queues.noteQueue.close).toHaveBeenCalled();
      expect(container.queues.imageQueue.close).toHaveBeenCalled();
      expect(container.queues.ingredientQueue.close).toHaveBeenCalled();
      expect(container.queues.instructionQueue.close).toHaveBeenCalled();
      expect(container.queues.categorizationQueue.close).toHaveBeenCalled();
      expect(container.queues.sourceQueue.close).toHaveBeenCalled();

      // Verify database was disconnected
      expect(container.database.prisma.$disconnect).toHaveBeenCalled();

      // Verify logger was called
      expect(mockLogger).toHaveBeenCalledWith(
        "ServiceContainer closed successfully"
      );
    });

    it("should close database connection", async () => {
      const mockDisconnect = vi.mocked(container.database.prisma.$disconnect);

      await container.close();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("should log successful closure", async () => {
      const mockLogger = vi.mocked(container.logger.info);

      await container.close();

      expect(mockLogger).toHaveBeenCalledWith(
        "ServiceContainer closed successfully"
      );
    });

    it("should close workers if they exist", async () => {
      const mockWorker = { close: vi.fn().mockResolvedValue(undefined) };
      container._workers = {
        noteWorker: mockWorker,
        imageWorker: mockWorker,
        ingredientWorker: mockWorker,
        instructionWorker: mockWorker,
        categorizationWorker: mockWorker,
        sourceWorker: mockWorker,
      };

      await container.close();

      expect(mockWorker.close).toHaveBeenCalledTimes(6);
    });
  });

  describe("Error Handling", () => {
    it("should handle queue close errors gracefully", async () => {
      const mockError = new Error("Queue close failed");
      vi.mocked(container.queues.noteQueue.close).mockRejectedValue(mockError);

      // Should not throw since Promise.allSettled is used for queues
      await container.close();

      // Should still attempt to close other queues
      expect(container.queues.imageQueue.close).toHaveBeenCalled();
      expect(container.queues.ingredientQueue.close).toHaveBeenCalled();
      expect(container.queues.instructionQueue.close).toHaveBeenCalled();
      expect(container.queues.categorizationQueue.close).toHaveBeenCalled();
      expect(container.queues.sourceQueue.close).toHaveBeenCalled();
    });

    it("should handle database disconnect errors gracefully", async () => {
      const mockError = new Error("Database disconnect failed");
      vi.mocked(container.database.prisma.$disconnect).mockRejectedValue(
        mockError
      );
      const mockLogger = vi.mocked(container.logger.error);

      // Should not throw since database errors are caught
      await container.close();

      expect(mockLogger).toHaveBeenCalledWith(
        "Failed to disconnect database",
        mockError
      );
    });

    it("should handle worker close errors gracefully", async () => {
      const mockError = new Error("Worker close failed");
      const mockWorker = { close: vi.fn().mockRejectedValue(mockError) };
      container._workers = {
        noteWorker: mockWorker,
        imageWorker: mockWorker,
      };
      const mockLogger = vi.mocked(container.logger.error);

      // Should not throw since worker errors are caught
      await container.close();

      expect(mockLogger).toHaveBeenCalledWith(
        "Failed to close note worker",
        mockError
      );
      expect(mockLogger).toHaveBeenCalledWith(
        "Failed to close image worker",
        mockError
      );
    });

    it("should continue closing other resources even if some fail", async () => {
      const mockError = new Error("Some error");
      vi.mocked(container.queues.noteQueue.close).mockRejectedValue(mockError);
      vi.mocked(container.database.prisma.$disconnect).mockRejectedValue(
        mockError
      );

      // Should not throw since errors are handled gracefully
      await container.close();

      // Should still attempt to close all queues
      expect(container.queues.imageQueue.close).toHaveBeenCalled();
      expect(container.queues.ingredientQueue.close).toHaveBeenCalled();
      expect(container.queues.instructionQueue.close).toHaveBeenCalled();
      expect(container.queues.categorizationQueue.close).toHaveBeenCalled();
      expect(container.queues.sourceQueue.close).toHaveBeenCalled();
    });
  });

  describe("Partial Worker Closure", () => {
    it("should handle missing workers gracefully", async () => {
      container._workers = {
        noteWorker: { close: vi.fn().mockResolvedValue(undefined) },
        // imageWorker is missing
        ingredientWorker: { close: vi.fn().mockResolvedValue(undefined) },
      };

      await container.close();

      expect(container._workers.noteWorker?.close).toHaveBeenCalled();
      expect(container._workers.ingredientWorker?.close).toHaveBeenCalled();
    });

    it("should handle undefined workers gracefully", async () => {
      container._workers = {
        noteWorker: undefined,
        imageWorker: { close: vi.fn().mockResolvedValue(undefined) },
      };

      await container.close();

      expect(container._workers.imageWorker?.close).toHaveBeenCalled();
    });
  });

  describe("Multiple Close Calls", () => {
    it("should handle multiple close calls gracefully", async () => {
      await container.close();
      await container.close();

      // Should not throw errors on subsequent calls
      expect(container.queues.noteQueue.close).toHaveBeenCalledTimes(2);
      expect(container.database.prisma.$disconnect).toHaveBeenCalledTimes(2);
    });
  });
});
