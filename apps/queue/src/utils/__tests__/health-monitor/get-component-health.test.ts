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

describe("HealthMonitor.getComponentHealth", () => {
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

  describe("Database Component", () => {
    it("should return database health when component is database", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "Database is responding normally",
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

      const databaseHealth = await monitor.getComponentHealth("database");
      expect(databaseHealth).toEqual(mockHealth.checks.database);
    });

    it("should return database health with error status", async () => {
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

      const databaseHealth = await monitor.getComponentHealth("database");
      expect(databaseHealth).toEqual(mockHealth.checks.database);
      expect(databaseHealth.status).toBe("unhealthy");
    });

    it("should return database health with degraded status", async () => {
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

      const databaseHealth = await monitor.getComponentHealth("database");
      expect(databaseHealth).toEqual(mockHealth.checks.database);
      expect(databaseHealth.status).toBe("degraded");
    });
  });

  describe("Redis Component", () => {
    it("should return Redis health when component is redis", async () => {
      const mockHealth: ServiceHealth = {
        status: "healthy",
        checks: {
          database: {
            status: "healthy",
            message: "OK",
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

      const redisHealth = await monitor.getComponentHealth("redis");
      expect(redisHealth).toEqual(mockHealth.checks.redis);
    });

    it("should return Redis health with error status", async () => {
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

      const redisHealth = await monitor.getComponentHealth("redis");
      expect(redisHealth).toEqual(mockHealth.checks.redis);
      expect(redisHealth.status).toBe("unhealthy");
    });
  });

  describe("Queues Component", () => {
    it("should return queues health when component is queues", async () => {
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

      const queuesHealth = await monitor.getComponentHealth("queues");
      expect(queuesHealth).toEqual(mockHealth.checks.queues);
    });

    it("should return queues health with error status", async () => {
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

      const queuesHealth = await monitor.getComponentHealth("queues");
      expect(queuesHealth).toEqual(mockHealth.checks.queues);
      expect(queuesHealth.noteQueue.status).toBe("unhealthy");
      expect(queuesHealth.imageQueue.status).toBe("unhealthy");
      expect(queuesHealth.ingredientQueue.status).toBe("unhealthy");
      expect(queuesHealth.instructionQueue.status).toBe("unhealthy");
      expect(queuesHealth.categorizationQueue.status).toBe("unhealthy");
    });

    it("should return queues health with mixed statuses", async () => {
      const mockHealth: ServiceHealth = {
        status: "degraded",
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
              message: "Queue system is operational",
              lastChecked: new Date(),
            },
            imageQueue: {
              status: "degraded",
              message: "Queue system is slow",
              lastChecked: new Date(),
            },
            ingredientQueue: {
              status: "healthy",
              message: "Queue system is operational",
              lastChecked: new Date(),
            },
            instructionQueue: {
              status: "degraded",
              message: "Queue system is slow",
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

      const queuesHealth = await monitor.getComponentHealth("queues");
      expect(queuesHealth).toEqual(mockHealth.checks.queues);
      expect(queuesHealth.noteQueue.status).toBe("healthy");
      expect(queuesHealth.imageQueue.status).toBe("degraded");
      expect(queuesHealth.ingredientQueue.status).toBe("healthy");
      expect(queuesHealth.instructionQueue.status).toBe("degraded");
      expect(queuesHealth.categorizationQueue.status).toBe("healthy");
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

      const databaseHealth = await monitor.getComponentHealth("database");

      expect(databaseHealth).toEqual(mockHealth.checks.database);
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
      const databaseHealth1 = await monitor.getComponentHealth("database");
      // Second call should use cache
      const databaseHealth2 = await monitor.getComponentHealth("database");

      expect(databaseHealth1).toEqual(mockHealth.checks.database);
      expect(databaseHealth2).toEqual(mockHealth.checks.database);
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

      await expect(monitor.getComponentHealth("database")).rejects.toThrow(
        "Health check failed"
      );
    });

    it("should propagate errors from performHealthChecks", async () => {
      const error = new Error("Database connection failed");
      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockRejectedValue(error);

      await expect(monitor.getComponentHealth("redis")).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("Return Value Structure", () => {
    it("should return correct structure for database component", async () => {
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

      const databaseHealth = await monitor.getComponentHealth("database");

      expect(databaseHealth).toHaveProperty("status");
      expect(databaseHealth).toHaveProperty("message");
      expect(databaseHealth).toHaveProperty("lastChecked");
      expect(typeof databaseHealth.status).toBe("string");
      expect(typeof databaseHealth.message).toBe("string");
      expect(databaseHealth.lastChecked).toBeInstanceOf(Date);
    });

    it("should return correct structure for redis component", async () => {
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

      const redisHealth = await monitor.getComponentHealth("redis");

      expect(redisHealth).toHaveProperty("status");
      expect(redisHealth).toHaveProperty("message");
      expect(redisHealth).toHaveProperty("lastChecked");
      expect(typeof redisHealth.status).toBe("string");
      expect(typeof redisHealth.message).toBe("string");
      expect(redisHealth.lastChecked).toBeInstanceOf(Date);
    });

    it("should return correct structure for queues component", async () => {
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

      const queuesHealth = await monitor.getComponentHealth("queues");

      expect(queuesHealth).toHaveProperty("noteQueue");
      expect(queuesHealth).toHaveProperty("imageQueue");
      expect(queuesHealth).toHaveProperty("ingredientQueue");
      expect(queuesHealth).toHaveProperty("instructionQueue");
      expect(queuesHealth).toHaveProperty("categorizationQueue");

      const queueNames = [
        "noteQueue",
        "imageQueue",
        "ingredientQueue",
        "instructionQueue",
        "categorizationQueue",
      ];
      queueNames.forEach((queueName) => {
        const queue = queuesHealth[queueName as keyof typeof queuesHealth];
        expect(queue).toHaveProperty("status");
        expect(queue).toHaveProperty("message");
        expect(queue).toHaveProperty("lastChecked");
        expect(typeof queue.status).toBe("string");
        expect(typeof queue.message).toBe("string");
        expect(queue.lastChecked).toBeInstanceOf(Date);
      });
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
        results.push(await monitor.getComponentHealth("database"));
      }

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toEqual(mockHealth.checks.database);
      });

      // Should only call performHealthChecks once due to caching
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(1);
    });

    it("should handle calls for different components efficiently", async () => {
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

      const databaseHealth = await monitor.getComponentHealth("database");
      const redisHealth = await monitor.getComponentHealth("redis");
      const queuesHealth = await monitor.getComponentHealth("queues");

      expect(databaseHealth).toEqual(mockHealth.checks.database);
      expect(redisHealth).toEqual(mockHealth.checks.redis);
      expect(queuesHealth).toEqual(mockHealth.checks.queues);

      // Should only call performHealthChecks once due to caching
      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(1);
    });
  });
});
