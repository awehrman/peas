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
}

describe("HealthMonitor.isHealthy", () => {
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

  describe("Healthy Status", () => {
    it("should return true when status is healthy", async () => {
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it("should return true when all components are healthy", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "Database is responding normally",
            lastChecked: new Date(),
          },
          redis: {
            status: "healthy",
            message: "Redis configuration is valid",
            lastChecked: new Date(),
          },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "Queue system is operational",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "Queue system is operational",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "Queue system is operational",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "Queue system is operational",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "Queue system is operational",
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe("Degraded Status", () => {
    it("should return true when status is degraded", async () => {
      const mockHealth: ServiceHealth = {
        status: "degraded",
        checks: {
          database: {
            status: "degraded",
            message: "Database is slow to respond",
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it("should return true when some components are degraded", async () => {
      const mockHealth: ServiceHealth = {
        status: "degraded",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: {
            status: "degraded",
            message: "Redis configuration check is slow",
            lastChecked: new Date(),
          },
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it("should return true when all components are degraded", async () => {
      const mockHealth: ServiceHealth = {
        status: "degraded",
        checks: {
          database: {
            status: "degraded",
            message: "Database is slow to respond",
            lastChecked: new Date(),
          },
          redis: {
            status: "degraded",
            message: "Redis configuration check is slow",
            lastChecked: new Date(),
          },
          queues: {
            noteQueue: {
              status: "degraded",
              message: "Queue system is slow",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "degraded",
              message: "Queue system is slow",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "degraded",
              message: "Queue system is slow",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "degraded",
              message: "Queue system is slow",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "degraded",
              message: "Queue system is slow",
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe("Unhealthy Status", () => {
    it("should return false when status is unhealthy", async () => {
      const mockHealth: ServiceHealth = {
        status: "unhealthy",
        checks: {
          database: {
            status: "unhealthy",
            message: "Database connection failed",
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(false);
    });

    it("should return false when database is unhealthy", async () => {
      const mockHealth: ServiceHealth = {
        status: "unhealthy",
        checks: {
          database: {
            status: "unhealthy",
            message: "Database connection failed",
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(false);
    });

    it("should return false when Redis is unhealthy", async () => {
      const mockHealth: ServiceHealth = {
        status: "unhealthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: {
            status: "unhealthy",
            message: "Redis connection failed",
            lastChecked: new Date(),
          },
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(false);
    });

    it("should return false when queues are unhealthy", async () => {
      const mockHealth: ServiceHealth = {
        status: "unhealthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
            lastChecked: new Date(),
          },
          redis: { status: "healthy", message: "OK", lastChecked: new Date() },
          queues: {
            noteQueue: {
              status: "unhealthy",
              message: "Queue system failed",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "unhealthy",
              message: "Queue system failed",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "unhealthy",
              message: "Queue system failed",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "unhealthy",
              message: "Queue system failed",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "unhealthy",
              message: "Queue system failed",
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(false);
    });

    it("should return false when all components are unhealthy", async () => {
      const mockHealth: ServiceHealth = {
        status: "unhealthy",
        checks: {
          database: {
            status: "unhealthy",
            message: "Database connection failed",
            lastChecked: new Date(),
          },
          redis: {
            status: "unhealthy",
            message: "Redis connection failed",
            lastChecked: new Date(),
          },
          queues: {
            noteQueue: {
              status: "unhealthy",
              message: "Queue system failed",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "unhealthy",
              message: "Queue system failed",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "unhealthy",
              message: "Queue system failed",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "unhealthy",
              message: "Queue system failed",
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "unhealthy",
              message: "Queue system failed",
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe("Integration with getHealth", () => {
    it("should use getHealth method internally", async () => {
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

      const isHealthy = await monitor.isHealthy();

      expect(isHealthy).toBe(true);
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalled();
    });

    it("should respect caching behavior from getHealth", async () => {
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

      // First call
      const isHealthy1 = await monitor.isHealthy();
      // Second call should use cache
      const isHealthy2 = await monitor.isHealthy();

      expect(isHealthy1).toBe(true);
      expect(isHealthy2).toBe(true);
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors from getHealth", async () => {
      const error = new Error("Health check failed");
      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockRejectedValue(error);

      await expect(monitor.isHealthy()).rejects.toThrow("Health check failed");
    });

    it("should propagate errors from performHealthChecks", async () => {
      const error = new Error("Database connection failed");
      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockRejectedValue(error);

      await expect(monitor.isHealthy()).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("Return Value", () => {
    it("should return boolean value", async () => {
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

      const isHealthy = await monitor.isHealthy();
      expect(typeof isHealthy).toBe("boolean");
    });

    it("should return true for healthy status", async () => {
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it("should return true for degraded status", async () => {
      const mockHealth: ServiceHealth = {
        status: "degraded",
        checks: {
          database: {
            status: "degraded",
            message: "Slow",
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it("should return false for unhealthy status", async () => {
      const mockHealth: ServiceHealth = {
        status: "unhealthy",
        checks: {
          database: {
            status: "unhealthy",
            message: "Failed",
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

      const isHealthy = await monitor.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe("Performance", () => {
    it("should handle rapid successive calls efficiently", async () => {
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
        results.push(await monitor.isHealthy());
      }

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toBe(true);
      });

      // Should only call performHealthChecks once due to caching
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(1);
    });
  });
});
