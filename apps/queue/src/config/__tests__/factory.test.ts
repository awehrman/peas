import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setupTestEnvironment } from "../../test-utils/helpers";

describe("ManagerFactory", () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>;

  beforeEach(async () => {
    testEnv = setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    testEnv.cleanup();
    vi.clearAllMocks();
  });

  describe("Manager Creation", () => {
    it("should create WebSocket manager with default port", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.createWebSocketManager();

      expect(manager).toBeDefined();
      expect(typeof manager).toBe("object");
    });

    it("should create WebSocket manager with custom port", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.createWebSocketManager(9000);

      expect(manager).toBeDefined();
      expect(typeof manager).toBe("object");
    });

    it("should create database manager", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.createDatabaseManager();

      expect(manager).toBeDefined();
      expect(typeof manager).toBe("object");
    });

    it("should create cache manager", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.createCacheManager();

      expect(manager).toBeDefined();
      expect(typeof manager).toBe("object");
    });

    it("should create health monitor", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.createHealthMonitor();

      expect(manager).toBeDefined();
      expect(typeof manager).toBe("object");
    });

    it("should create metrics collector", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.createMetricsCollector();

      expect(manager).toBeDefined();
      expect(typeof manager).toBe("object");
    });
  });

  describe("Singleton Pattern", () => {
    it("should return the same WebSocket manager instance for the same port", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager1 = ManagerFactory.createWebSocketManager(8080);
      const manager2 = ManagerFactory.createWebSocketManager(8080);

      expect(manager1).toBe(manager2);
    });

    it("should return the same database manager instance", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager1 = ManagerFactory.createDatabaseManager();
      const manager2 = ManagerFactory.createDatabaseManager();

      expect(manager1).toBe(manager2);
    });

    it("should return the same cache manager instance", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager1 = ManagerFactory.createCacheManager();
      const manager2 = ManagerFactory.createCacheManager();

      expect(manager1).toBe(manager2);
    });

    it("should return the same health monitor instance", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager1 = ManagerFactory.createHealthMonitor();
      const manager2 = ManagerFactory.createHealthMonitor();

      expect(manager1).toBe(manager2);
    });

    it("should return the same metrics collector instance", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager1 = ManagerFactory.createMetricsCollector();
      const manager2 = ManagerFactory.createMetricsCollector();

      expect(manager1).toBe(manager2);
    });
  });

  describe("Manager Retrieval", () => {
    it("should get existing WebSocket manager by type", async () => {
      const { ManagerFactory } = await import("../factory");

      // Create the manager first
      const createdManager = ManagerFactory.createWebSocketManager(8080);

      // Retrieve it by type
      const manager = ManagerFactory.getManager("websocket-8080");

      expect(manager).toBe(createdManager);
    });

    it("should get existing database manager by type", async () => {
      const { ManagerFactory } = await import("../factory");

      // Create the manager first
      const createdManager = ManagerFactory.createDatabaseManager();

      // Retrieve it by type
      const manager = ManagerFactory.getManager("database");

      expect(manager).toBe(createdManager);
    });

    it("should get existing cache manager by type", async () => {
      const { ManagerFactory } = await import("../factory");

      // Create the manager first
      const createdManager = ManagerFactory.createCacheManager();

      // Retrieve it by type
      const manager = ManagerFactory.getManager("cache");

      expect(manager).toBe(createdManager);
    });

    it("should get existing health monitor by type", async () => {
      const { ManagerFactory } = await import("../factory");

      // Create the manager first
      const createdManager = ManagerFactory.createHealthMonitor();

      // Retrieve it by type
      const manager = ManagerFactory.getManager("health");

      expect(manager).toBe(createdManager);
    });

    it("should get existing metrics collector by type", async () => {
      const { ManagerFactory } = await import("../factory");

      // Create the manager first
      const createdManager = ManagerFactory.createMetricsCollector();

      // Retrieve it by type
      const manager = ManagerFactory.getManager("metrics");

      expect(manager).toBe(createdManager);
    });

    it("should return undefined for non-existent manager type", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.getManager("non-existent");

      expect(manager).toBeUndefined();
    });

    it("should return undefined for empty manager type", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.getManager("");

      expect(manager).toBeUndefined();
    });
  });

  describe("Manager Management", () => {
    it("should clear all managers", async () => {
      const { ManagerFactory } = await import("../factory");

      // Clear any existing managers first
      ManagerFactory.clearManagers();

      // Create some managers
      ManagerFactory.createWebSocketManager(8080);
      ManagerFactory.createDatabaseManager();
      ManagerFactory.createCacheManager();

      // Verify managers exist
      expect(ManagerFactory.getManagerTypes()).toHaveLength(3);

      // Clear all managers
      ManagerFactory.clearManagers();

      // Verify managers are cleared
      expect(ManagerFactory.getManagerTypes()).toHaveLength(0);
      expect(ManagerFactory.getManager("websocket-8080")).toBeUndefined();
      expect(ManagerFactory.getManager("database")).toBeUndefined();
      expect(ManagerFactory.getManager("cache")).toBeUndefined();
    });

    it("should get all manager types", async () => {
      const { ManagerFactory } = await import("../factory");

      // Clear any existing managers
      ManagerFactory.clearManagers();

      // Create managers
      ManagerFactory.createWebSocketManager(8080);
      ManagerFactory.createWebSocketManager(9000);
      ManagerFactory.createDatabaseManager();
      ManagerFactory.createCacheManager();
      ManagerFactory.createHealthMonitor();
      ManagerFactory.createMetricsCollector();

      const types = ManagerFactory.getManagerTypes();

      expect(types).toHaveLength(6);
      expect(types).toContain("websocket-8080");
      expect(types).toContain("websocket-9000");
      expect(types).toContain("database");
      expect(types).toContain("cache");
      expect(types).toContain("health");
      expect(types).toContain("metrics");
    });

    it("should return empty array when no managers exist", async () => {
      const { ManagerFactory } = await import("../factory");

      // Clear all managers
      ManagerFactory.clearManagers();

      const types = ManagerFactory.getManagerTypes();

      expect(types).toHaveLength(0);
      expect(types).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle WebSocket manager creation with zero port", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.createWebSocketManager(0);

      expect(manager).toBeDefined();
    });

    it("should handle WebSocket manager creation with negative port", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.createWebSocketManager(-1);

      expect(manager).toBeDefined();
    });

    it("should handle WebSocket manager creation with very large port", async () => {
      const { ManagerFactory } = await import("../factory");

      const manager = ManagerFactory.createWebSocketManager(65535);

      expect(manager).toBeDefined();
    });

    it("should handle multiple clear operations", async () => {
      const { ManagerFactory } = await import("../factory");

      // Create some managers
      ManagerFactory.createWebSocketManager(8080);
      ManagerFactory.createDatabaseManager();

      // Clear multiple times
      ManagerFactory.clearManagers();
      ManagerFactory.clearManagers();
      ManagerFactory.clearManagers();

      // Should still be empty
      expect(ManagerFactory.getManagerTypes()).toHaveLength(0);
    });

    it("should handle getManager with null type", async () => {
      const { ManagerFactory } = await import("../factory");

      // @ts-expect-error - Testing with null for edge case
      const manager = ManagerFactory.getManager(null);

      expect(manager).toBeUndefined();
    });

    it("should handle getManager with undefined type", async () => {
      const { ManagerFactory } = await import("../factory");

      // @ts-expect-error - Testing with undefined for edge case
      const manager = ManagerFactory.getManager(undefined);

      expect(manager).toBeUndefined();
    });
  });

  describe("Integration", () => {
    it("should maintain separate instances for different manager types", async () => {
      const { ManagerFactory } = await import("../factory");

      // Clear any existing managers first
      ManagerFactory.clearManagers();

      // Create all types of managers
      const wsManager1 = ManagerFactory.createWebSocketManager(8080);
      const wsManager2 = ManagerFactory.createWebSocketManager(9000);
      const dbManager = ManagerFactory.createDatabaseManager();
      const cacheManager = ManagerFactory.createCacheManager();
      const healthManager = ManagerFactory.createHealthMonitor();
      const metricsManager = ManagerFactory.createMetricsCollector();

      // Verify all are valid instances
      expect(wsManager1).toBeDefined();
      expect(wsManager2).toBeDefined();
      expect(dbManager).toBeDefined();
      expect(cacheManager).toBeDefined();
      expect(healthManager).toBeDefined();
      expect(metricsManager).toBeDefined();

      // Verify all manager types are registered
      const types = ManagerFactory.getManagerTypes();
      expect(types).toHaveLength(6);
    });

    it("should recreate managers after clearing", async () => {
      const { ManagerFactory } = await import("../factory");

      // Clear any existing managers first
      ManagerFactory.clearManagers();

      // Create managers
      const originalWsManager = ManagerFactory.createWebSocketManager(8080);
      const originalDbManager = ManagerFactory.createDatabaseManager();

      // Clear managers
      ManagerFactory.clearManagers();

      // Recreate managers
      const newWsManager = ManagerFactory.createWebSocketManager(8080);
      const newDbManager = ManagerFactory.createDatabaseManager();

      // Should be valid instances
      expect(newWsManager).toBeDefined();
      expect(newDbManager).toBeDefined();
      expect(originalWsManager).toBeDefined();
      expect(originalDbManager).toBeDefined();
    });
  });
});
