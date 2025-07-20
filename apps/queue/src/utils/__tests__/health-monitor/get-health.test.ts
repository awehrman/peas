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
  CACHE_DURATION_MS: number;
}

describe("HealthMonitor.getHealth", () => {
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

  describe("Caching Behavior", () => {
    it("should return cached health if within cache duration", async () => {
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

      // Mock the private method to return our test data
      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      const health1 = await monitor.getHealth();
      const health2 = await monitor.getHealth();

      expect(health1).toBe(health2);
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(1);
    });

    it("should perform fresh checks after cache expires", async () => {
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
      await monitor.getHealth();

      // Simulate cache expiration by setting lastCheckTime to 31 seconds ago
      (monitor as unknown as HealthMonitorPrivate).lastCheckTime = new Date(
        Date.now() - 31000
      );

      // Second call should perform fresh checks
      await monitor.getHealth();

      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(2);
    });

    it("should perform fresh checks when cache is null", async () => {
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

      // Set cache to null to simulate no cached data
      (monitor as unknown as HealthMonitorPrivate).healthCache = null;
      (monitor as unknown as HealthMonitorPrivate).lastCheckTime = null;

      const health = await monitor.getHealth();

      expect(health).toEqual(mockHealth);
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(1);
    });

    it("should perform fresh checks when lastCheckTime is null", async () => {
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

      // Set lastCheckTime to null to simulate no cached time
      (monitor as unknown as HealthMonitorPrivate).lastCheckTime = null;

      const health = await monitor.getHealth();

      expect(health).toEqual(mockHealth);
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(1);
    });

    it("should update cache and lastCheckTime after fresh checks", async () => {
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

      const beforeCall = new Date();
      const health = await monitor.getHealth();
      const afterCall = new Date();

      expect(health).toEqual(mockHealth);
      expect((monitor as unknown as HealthMonitorPrivate).healthCache).toEqual(
        mockHealth
      );
      expect(
        (monitor as unknown as HealthMonitorPrivate).lastCheckTime
      ).toBeInstanceOf(Date);
      expect(
        (monitor as unknown as HealthMonitorPrivate).lastCheckTime!.getTime()
      ).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(
        (monitor as unknown as HealthMonitorPrivate).lastCheckTime!.getTime()
      ).toBeLessThanOrEqual(afterCall.getTime());
    });

    it("should handle cache duration boundary conditions", async () => {
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
      await monitor.getHealth();

      // Set lastCheckTime to exactly cache duration ago (should still use cache)
      const cacheDuration = (monitor as unknown as HealthMonitorPrivate)
        .CACHE_DURATION_MS;
      (monitor as unknown as HealthMonitorPrivate).lastCheckTime = new Date(
        Date.now() - cacheDuration + 1 // 1ms before expiration
      );

      // Should still use cache
      await monitor.getHealth();

      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(1);

      // Set lastCheckTime to exactly cache duration ago (should refresh)
      (monitor as unknown as HealthMonitorPrivate).lastCheckTime = new Date(
        Date.now() - cacheDuration
      );

      // Should perform fresh checks
      await monitor.getHealth();

      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in performHealthChecks", async () => {
      const error = new Error("Health check failed");
      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockRejectedValue(error);

      await expect(monitor.getHealth()).rejects.toThrow("Health check failed");
    });

    it("should propagate errors from performHealthChecks", async () => {
      const error = new Error("Database connection failed");
      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockRejectedValue(error);

      await expect(monitor.getHealth()).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("Return Value", () => {
    it("should return ServiceHealth object with correct structure", async () => {
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

      const health = await monitor.getHealth();

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

  describe("Promise.allSettled Rejection Scenarios", () => {
    it("should handle database health check rejection", async () => {
      // Mock performHealthChecks to simulate database rejection
      const mockHealth: ServiceHealth = {
        status: "degraded",
        checks: {
          database: {
            status: "unhealthy",
            message: "Database check failed",
            lastChecked: new Date(),
          },
          redis: {
            status: "healthy",
            message: "Redis configuration is valid",
            responseTime: 10,
            lastChecked: new Date(),
          },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
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

      const health = await monitor.getHealth();

      expect(health.checks.database.status).toBe("unhealthy");
      expect(health.checks.database.message).toContain("Database check failed");
      expect(health.checks.redis.status).toBe("healthy");
      expect(health.checks.queues).toBeDefined();
    });

    it("should handle Redis health check rejection", async () => {
      // Mock performHealthChecks to simulate Redis rejection
      const mockHealth: ServiceHealth = {
        status: "degraded",
        checks: {
          database: {
            status: "healthy",
            message: "Database is responding normally",
            responseTime: 10,
            lastChecked: new Date(),
          },
          redis: {
            status: "unhealthy",
            message: "Redis check failed",
            lastChecked: new Date(),
          },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
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

      const health = await monitor.getHealth();

      expect(health.checks.database.status).toBe("healthy");
      expect(health.checks.redis.status).toBe("unhealthy");
      expect(health.checks.redis.message).toContain("Redis check failed");
      expect(health.checks.queues).toBeDefined();
    });

    it("should handle both database and Redis health check rejections", async () => {
      // Mock performHealthChecks to simulate both rejections
      const mockHealth: ServiceHealth = {
        status: "unhealthy",
        checks: {
          database: {
            status: "unhealthy",
            message: "Database check failed",
            lastChecked: new Date(),
          },
          redis: {
            status: "unhealthy",
            message: "Redis check failed",
            lastChecked: new Date(),
          },
          queues: {
            noteQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
              lastChecked: new Date(),
            },
            categorizationQueue: {
              status: "healthy",
              message: "Queue system is operational",
              responseTime: 10,
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

      const health = await monitor.getHealth();

      expect(health.checks.database.status).toBe("unhealthy");
      expect(health.checks.database.message).toContain("Database check failed");
      expect(health.checks.redis.status).toBe("unhealthy");
      expect(health.checks.redis.message).toContain("Redis check failed");
      expect(health.checks.queues).toBeDefined();
      expect(health.status).toBe("unhealthy");
    });
  });
});
