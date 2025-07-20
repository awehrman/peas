import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HealthMonitor } from "../../health-monitor";
import type { ServiceHealth } from "../../../types";

// Mock dependencies
vi.mock("../../../config/database", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    note: {
      count: vi.fn(),
    },
  },
}));

vi.mock("../../../config/redis", () => ({
  redisConnection: {
    host: "localhost",
    port: 6379,
  },
}));

vi.mock("../../error-handler", () => ({
  ErrorHandler: {
    createJobError: vi.fn(),
    logError: vi.fn(),
  },
}));

// Interface for accessing private methods in tests
interface HealthMonitorPrivate {
  performHealthChecks: () => Promise<ServiceHealth>;
  lastCheckTime: Date | null;
  healthCache: ServiceHealth | null;
}

describe("HealthMonitor.refreshHealth", () => {
  let monitor: HealthMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton instance before each test
    (HealthMonitor as unknown as { instance: undefined }).instance = undefined;
    monitor = HealthMonitor.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Cache Clearing", () => {
    it("should clear health cache when called", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      // First call to populate cache
      await monitor.getHealth();

      // Verify cache is populated
      expect((monitor as unknown as HealthMonitorPrivate).healthCache).toEqual(
        mockHealth
      );
      expect(
        (monitor as unknown as HealthMonitorPrivate).lastCheckTime
      ).toBeInstanceOf(Date);

      // Call refreshHealth
      await monitor.refreshHealth();

      // Verify cache is cleared and fresh health is returned
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(2);
    });

    it("should clear lastCheckTime when called", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      // First call to populate cache
      await monitor.getHealth();

      // Verify lastCheckTime is set
      expect(
        (monitor as unknown as HealthMonitorPrivate).lastCheckTime
      ).toBeInstanceOf(Date);

      // Call refreshHealth
      await monitor.refreshHealth();

      // Verify fresh health check is performed
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe("Fresh Health Check", () => {
    it("should perform fresh health checks after clearing cache", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      // Call refreshHealth
      const health = await monitor.refreshHealth();

      expect(health).toEqual(mockHealth);
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(1);
    });

    it("should return fresh health data", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      const health = await monitor.refreshHealth();

      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("checks");
      expect(health).toHaveProperty("timestamp");
      expect(health.status).toBe("healthy");
      expect(health.checks).toHaveProperty("database");
      expect(health.checks).toHaveProperty("redis");
      expect(health.checks).toHaveProperty("queues");
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("Multiple Refresh Calls", () => {
    it("should perform fresh checks on each refresh call", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      // Multiple refresh calls
      await monitor.refreshHealth();
      await monitor.refreshHealth();
      await monitor.refreshHealth();

      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(3);
    });

    it("should not use cache between refresh calls", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      // First refresh
      await monitor.refreshHealth();

      // Second refresh should not use cache
      await monitor.refreshHealth();

      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in performHealthChecks during refresh", async () => {
      const error = new Error("Health check failed");
      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockRejectedValue(error);

      await expect(monitor.refreshHealth()).rejects.toThrow(
        "Health check failed"
      );
    });

    it("should propagate errors from performHealthChecks", async () => {
      const error = new Error("Database connection failed");
      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockRejectedValue(error);

      await expect(monitor.refreshHealth()).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("Integration with getHealth", () => {
    it("should force refresh even when cache is valid", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      // First call to populate cache
      await monitor.getHealth();

      // Verify cache is populated and within cache duration
      expect((monitor as unknown as HealthMonitorPrivate).healthCache).toEqual(
        mockHealth
      );
      expect(
        (monitor as unknown as HealthMonitorPrivate).lastCheckTime
      ).toBeInstanceOf(Date);

      // Call refreshHealth - should force fresh check even though cache is valid
      await monitor.refreshHealth();

      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(2);
    });

    it("should update cache after refresh", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      // Call refreshHealth
      const health = await monitor.refreshHealth();

      // Verify cache is updated
      expect((monitor as unknown as HealthMonitorPrivate).healthCache).toEqual(
        mockHealth
      );
      expect(
        (monitor as unknown as HealthMonitorPrivate).lastCheckTime
      ).toBeInstanceOf(Date);
      expect(health).toEqual(mockHealth);
    });
  });

  describe("Return Value", () => {
    it("should return ServiceHealth object", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      const health = await monitor.refreshHealth();

      expect(health).toEqual(mockHealth);
      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("checks");
      expect(health).toHaveProperty("timestamp");
    });
  });

  describe("Performance", () => {
    it("should handle rapid successive refresh calls", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "OK",
              lastChecked: new Date(),
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      const results = [];

      for (let i = 0; i < 10; i++) {
        results.push(await monitor.refreshHealth());
      }

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toEqual(mockHealth);
      });

      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(10);
    });
  });
});
