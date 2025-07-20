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

describe("ServiceContainer Error Handling", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    ServiceContainer.reset();
    container = ServiceContainer.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Service Access Errors", () => {
    it("should handle missing service properties gracefully", () => {
      // Test that container doesn't crash when accessing properties
      expect(() => {
        expect(container.queues).toBeDefined();
        expect(container.database).toBeDefined();
        expect(container.logger).toBeDefined();
        expect(container.config).toBeDefined();
      }).not.toThrow();
    });

    it("should handle undefined service methods gracefully", () => {
      // Test that container doesn't crash when accessing methods
      expect(() => {
        const closeMethod = container.close;
        expect(typeof closeMethod).toBe("function");
      }).not.toThrow();
    });
  });

  describe("Configuration Errors", () => {
    it("should handle invalid environment variables gracefully", () => {
      // Test with invalid PORT
      const originalPort = process.env.PORT;
      process.env.PORT = "invalid-port";

      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.port).toBeNaN(); // Should be NaN for invalid input

      // Restore original value
      process.env.PORT = originalPort;
    });

    it("should handle missing environment variables gracefully", () => {
      // Test with missing WS_HOST
      const originalWsHost = process.env.WS_HOST;
      delete process.env.WS_HOST;

      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.wsHost).toBe("localhost"); // Should fall back to default

      // Restore original value
      if (originalWsHost) {
        process.env.WS_HOST = originalWsHost;
      }
    });

    it("should handle invalid numeric environment variables gracefully", () => {
      // Test with invalid BATCH_SIZE
      const originalBatchSize = process.env.BATCH_SIZE;
      process.env.BATCH_SIZE = "invalid-number";

      ServiceContainer.reset();
      const newContainer = ServiceContainer.getInstance();

      expect(newContainer.config.batchSize).toBeNaN(); // Should be NaN for invalid input

      // Restore original value
      if (originalBatchSize) {
        process.env.BATCH_SIZE = originalBatchSize;
      }
    });
  });

  describe("Resource Cleanup Errors", () => {
    it("should handle errors during service cleanup", async () => {
      const mockError = new Error("Cleanup failed");
      vi.mocked(container.queues.noteQueue.close).mockRejectedValue(mockError);
      vi.mocked(container.queues.imageQueue.close).mockRejectedValue(mockError);
      vi.mocked(container.database.prisma.$disconnect).mockRejectedValue(
        mockError
      );

      const mockLogger = vi.mocked(container.logger.error);

      // Should not throw since errors are handled gracefully
      await container.close();

      // Should log the database error
      expect(mockLogger).toHaveBeenCalledWith(
        "Failed to disconnect database",
        mockError
      );
    });

    it("should handle partial cleanup failures", async () => {
      const mockError = new Error("Partial failure");
      vi.mocked(container.queues.noteQueue.close).mockRejectedValue(mockError);
      // Other queues should close successfully

      // Should not throw since Promise.allSettled is used for queues
      await container.close();

      // Should not log queue errors since they're handled by Promise.allSettled
      // but should still attempt to close other queues
      expect(container.queues.imageQueue.close).toHaveBeenCalled();
      expect(container.queues.ingredientQueue.close).toHaveBeenCalled();
    });
  });

  describe("Singleton Pattern Errors", () => {
    it("should handle concurrent access gracefully", () => {
      // Test that multiple simultaneous getInstance calls don't cause issues
      const instances = [];
      for (let i = 0; i < 10; i++) {
        instances.push(ServiceContainer.getInstance());
      }

      // All instances should be the same
      const firstInstance = instances[0];
      instances.forEach((instance) => {
        expect(instance).toBe(firstInstance);
      });
    });

    it("should handle reset during active usage", () => {
      const instance1 = ServiceContainer.getInstance();
      ServiceContainer.reset();
      const instance2 = ServiceContainer.getInstance();

      expect(instance1).not.toBe(instance2);
      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
    });
  });

  describe("Service Method Errors", () => {
    it("should handle errors in service method calls", async () => {
      const mockError = new Error("Service method error");
      if (container.logger.info) {
        vi.mocked(container.logger.info).mockImplementation(() => {
          throw mockError;
        });
      }

      // Should not throw when calling close
      await expect(container.close()).rejects.toThrow("Service method error");
    });

    it("should handle async errors in service methods", async () => {
      const mockError = new Error("Async service method error");
      // Mock the logger.info to throw an error
      const originalInfo = container.logger.info;
      container.logger.info = vi.fn().mockImplementation(() => {
        throw mockError;
      });

      // Should throw when calling close
      await expect(container.close()).rejects.toThrow(
        "Async service method error"
      );

      // Restore original method
      container.logger.info = originalInfo;
    });
  });
});
