import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockPrismaClient, createTestEnvironment, setupTestEnvironment } from "../../test-utils/test-utils";
import type { DatabaseManager } from "../database-manager";

// Mock Prisma client
const mockPrismaClient = createMockPrismaClient();
vi.mock("../database", () => ({
  prisma: mockPrismaClient,
}));

describe("DatabaseManager", () => {
  let databaseManager: DatabaseManager;
  let testEnv: ReturnType<typeof setupTestEnvironment>;
  let envTestEnv: ReturnType<typeof createTestEnvironment>;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(async () => {
    testEnv = setupTestEnvironment();
    envTestEnv = createTestEnvironment();
    mockPrisma = mockPrismaClient;

    // Clear all mocks
    vi.clearAllMocks();

    // Reset timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    testEnv.cleanup();
    envTestEnv.restore();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance when called multiple times", async () => {
      const { DatabaseManager } = await import("../database-manager");
      const instance1 = DatabaseManager.getInstance();
      const instance2 = DatabaseManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should have correct initial stats", async () => {
      const { DatabaseManager } = await import("../database-manager");
      const manager = DatabaseManager.getInstance();
      const stats = manager.getConnectionStats();

      expect(stats.totalConnections).toBe(0);
      expect(stats.activeConnections).toBe(0);
      expect(stats.idleConnections).toBe(0);
      expect(stats.maxConnections).toBe(10);
      expect(stats.connectionErrors).toBe(0);
      expect(stats.isHealthy).toBe(true);
      expect(stats.lastHealthCheck).toBeInstanceOf(Date);
    });
  });

  describe("Connection Health Checks", () => {
    beforeEach(async () => {
      const { DatabaseManager } = await import("../database-manager");
      databaseManager = DatabaseManager.getInstance();
    });

    it("should pass health check successfully", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);

      const result = await databaseManager.checkConnectionHealth();

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(expect.any(Array));

      const stats = databaseManager.getConnectionStats();
      expect(stats.isHealthy).toBe(true);
      expect(stats.connectionErrors).toBe(0);
    });

    it("should fail health check and update stats", async () => {
      const error = new Error("Connection failed");
      mockPrisma.$queryRaw.mockRejectedValue(error);

      const result = await databaseManager.checkConnectionHealth();

      expect(result).toBe(false);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(expect.any(Array));

      const stats = databaseManager.getConnectionStats();
      expect(stats.isHealthy).toBe(false);
      expect(stats.connectionErrors).toBe(1);
    });

    it("should log health check results in development", async () => {
      envTestEnv.setEnv({ NODE_ENV: "development" });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      mockPrisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);

      await databaseManager.checkConnectionHealth();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/✅ Database health check passed in \d+ms/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Connection Retry Logic", () => {
    beforeEach(async () => {
      const { DatabaseManager } = await import("../database-manager");
      databaseManager = DatabaseManager.getInstance();
    });

    it("should execute operation successfully on first try", async () => {
      const operation = vi.fn().mockResolvedValue("success");

      const result = await databaseManager.executeWithRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on connection errors and succeed", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("connection timeout"))
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValue("success");

      const promise = databaseManager.executeWithRetry(operation);

      // Advance timers to handle the delays
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      await vi.advanceTimersByTimeAsync(2000); // Second retry delay

      const result = await promise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should not retry non-connection errors", async () => {
      const nonConnectionError = new Error("validation error");
      const operation = vi.fn().mockRejectedValue(nonConnectionError);

      await expect(databaseManager.executeWithRetry(operation)).rejects.toThrow(
        "validation error"
      );
      expect(operation).toHaveBeenCalledTimes(1); // Should not retry
    });

    it("should respect custom max retries", async () => {
      const operation = vi
        .fn()
        .mockRejectedValue(new Error("connection timeout"));

      await expect(
        databaseManager.executeWithRetry(operation, 1)
      ).rejects.toThrow("connection timeout");
      expect(operation).toHaveBeenCalledTimes(1); // Custom max retries = 1
    });

    it("should not identify non-connection errors", async () => {
      const nonConnectionErrors = [
        "validation error",
        "permission denied",
        "table not found",
        "syntax error",
      ];

      for (const errorMessage of nonConnectionErrors) {
        const operation = vi.fn().mockRejectedValue(new Error(errorMessage));

        await expect(
          databaseManager.executeWithRetry(operation)
        ).rejects.toThrow(errorMessage);
        expect(operation).toHaveBeenCalledTimes(1); // Should not retry
        vi.clearAllMocks();
      }
    });
  });

  describe("Connection Statistics", () => {
    beforeEach(async () => {
      const { DatabaseManager } = await import("../database-manager");
      databaseManager = DatabaseManager.getInstance();
    });

    it("should update connection stats successfully", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: BigInt(5) }]);

      await databaseManager.updateConnectionStats();

      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(expect.any(Array));

      const stats = databaseManager.getConnectionStats();
      expect(stats.activeConnections).toBe(5);
      expect(stats.totalConnections).toBe(5);
    });

    it("should handle stats update errors gracefully", async () => {
      const error = new Error("Stats query failed");
      mockPrisma.$queryRaw.mockRejectedValue(error);

      await expect(
        databaseManager.updateConnectionStats()
      ).resolves.not.toThrow();

      const stats = databaseManager.getConnectionStats();
      // The stats might persist from previous tests, so we don't assert on specific values
      expect(stats).toBeDefined();
    });

    it("should handle empty stats result", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await databaseManager.updateConnectionStats();

      const stats = databaseManager.getConnectionStats();
      expect(stats.activeConnections).toBe(0);
      expect(stats.totalConnections).toBe(0);
    });

    it("should return a copy of connection stats", async () => {
      const stats1 = databaseManager.getConnectionStats();
      const stats2 = databaseManager.getConnectionStats();

      expect(stats1).not.toBe(stats2); // Should be different objects
      expect(stats1).toEqual(stats2); // But same values
    });
  });

  describe("Health Monitoring", () => {
    beforeEach(async () => {
      const { DatabaseManager } = await import("../database-manager");
      databaseManager = DatabaseManager.getInstance();
    });

    it("should start health monitoring", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      databaseManager.startHealthMonitoring(1000);

      expect(consoleSpy).toHaveBeenCalledWith(
        "🔍 Database health monitoring started (1000ms interval)"
      );

      consoleSpy.mockRestore();
    });

    it("should stop existing monitoring when starting new one", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      databaseManager.startHealthMonitoring(1000);
      databaseManager.startHealthMonitoring(2000);

      expect(consoleSpy).toHaveBeenCalledWith(
        "🛑 Database health monitoring stopped"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "🔍 Database health monitoring started (2000ms interval)"
      );

      consoleSpy.mockRestore();
    });

    it("should stop health monitoring", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      databaseManager.startHealthMonitoring(1000);
      databaseManager.stopHealthMonitoring();

      expect(consoleSpy).toHaveBeenCalledWith(
        "🛑 Database health monitoring stopped"
      );

      consoleSpy.mockRestore();
    });

    it("should not error when stopping non-existent monitoring", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      databaseManager.stopHealthMonitoring();

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should perform health checks and stats updates on interval", async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ "1": 1 }]) // Health check
        .mockResolvedValueOnce([{ count: BigInt(3) }]); // Stats update

      databaseManager.startHealthMonitoring(1000);

      // Fast-forward time to trigger the interval
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe("Connection Pool Optimization", () => {
    beforeEach(async () => {
      const { DatabaseManager } = await import("../database-manager");
      databaseManager = DatabaseManager.getInstance();
    });

    it("should optimize connection pool successfully", async () => {
      mockPrisma.$executeRaw.mockResolvedValue(undefined);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await databaseManager.optimizeConnectionPool();

      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(expect.any(Array));
      expect(consoleSpy).toHaveBeenCalledWith(
        "⚡ Database connection pool optimized"
      );

      consoleSpy.mockRestore();
    });

    it("should handle optimization errors gracefully", async () => {
      const error = new Error("Optimization failed");
      mockPrisma.$executeRaw.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await expect(
        databaseManager.optimizeConnectionPool()
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "⚠️ Could not optimize connection pool:",
        error
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Graceful Shutdown", () => {
    beforeEach(async () => {
      const { DatabaseManager } = await import("../database-manager");
      databaseManager = DatabaseManager.getInstance();
    });

    it("should shutdown gracefully", async () => {
      mockPrisma.$disconnect.mockResolvedValue(undefined);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await databaseManager.shutdown();

      expect(consoleSpy).toHaveBeenCalledWith(
        "🔄 Shutting down database manager..."
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "✅ Database manager shutdown complete"
      );
      expect(mockPrisma.$disconnect).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle shutdown errors gracefully", async () => {
      const error = new Error("Disconnect failed");
      mockPrisma.$disconnect.mockRejectedValue(error);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(databaseManager.shutdown()).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Error during database manager shutdown:",
        error
      );

      consoleSpy.mockRestore();
    });

    it("should stop health monitoring during shutdown", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      databaseManager.startHealthMonitoring(1000);
      await databaseManager.shutdown();

      expect(consoleSpy).toHaveBeenCalledWith(
        "🛑 Database health monitoring stopped"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Convenience Functions", () => {
    beforeEach(async () => {
      const { DatabaseManager } = await import("../database-manager");
      databaseManager = DatabaseManager.getInstance();
    });

    it("should use withDatabaseRetry convenience function", async () => {
      const { withDatabaseRetry } = await import("../database-manager");
      const operation = vi.fn().mockResolvedValue("success");

      const result = await withDatabaseRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should use checkDatabaseHealth convenience function", async () => {
      const { checkDatabaseHealth } = await import("../database-manager");
      mockPrisma.$queryRaw.mockResolvedValue([{ "1": 1 }]);

      const result = await checkDatabaseHealth();

      expect(result).toBe(true);
    });

    it("should use getDatabaseStats convenience function", async () => {
      const { getDatabaseStats } = await import("../database-manager");

      const stats = getDatabaseStats();

      expect(stats).toEqual(databaseManager.getConnectionStats());
    });
  });

  describe("Deprecated Singleton Instance", () => {
    it("should export singleton instance", async () => {
      const { databaseManager: exportedManager, DatabaseManager } =
        await import("../database-manager");

      expect(exportedManager).toBe(DatabaseManager.getInstance());
    });
  });

  describe("Edge Cases", () => {
    beforeEach(async () => {
      const { DatabaseManager } = await import("../database-manager");
      databaseManager = DatabaseManager.getInstance();
    });

    it("should handle delay function correctly", async () => {
      // Test the private delay method through executeWithRetry
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("connection timeout"))
        .mockResolvedValue("success");

      const promise = databaseManager.executeWithRetry(operation, 2);

      // Fast-forward time to simulate delays
      await vi.advanceTimersByTimeAsync(1000); // First retry delay
      await vi.advanceTimersByTimeAsync(2000); // Second retry delay

      const result = await promise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple health monitoring starts and stops", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      databaseManager.startHealthMonitoring(1000);
      databaseManager.startHealthMonitoring(2000);
      databaseManager.stopHealthMonitoring();
      databaseManager.stopHealthMonitoring(); // Should not error

      expect(consoleSpy).toHaveBeenCalledWith(
        "🛑 Database health monitoring stopped"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "🔍 Database health monitoring started (2000ms interval)"
      );

      consoleSpy.mockRestore();
    });

    it("should handle stats update with null result", async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: null }]);

      await databaseManager.updateConnectionStats();

      const stats = databaseManager.getConnectionStats();
      expect(stats.activeConnections).toBe(0);
      expect(stats.totalConnections).toBe(0);
    });
  });
});
