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
  determineOverallStatus: (
    checks: ServiceHealth["checks"]
  ) => "healthy" | "degraded" | "unhealthy";
}

describe("HealthMonitor.determineOverallStatus", () => {
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

  describe("Unhealthy Status", () => {
    it("should return unhealthy if any component is unhealthy", () => {
      const checks = {
        database: {
          status: "unhealthy" as const,
          message: "Failed",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });

    it("should return unhealthy if database is unhealthy", () => {
      const checks = {
        database: {
          status: "unhealthy" as const,
          message: "Database connection failed",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });

    it("should return unhealthy if Redis is unhealthy", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        redis: {
          status: "unhealthy" as const,
          message: "Redis connection failed",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });

    it("should return unhealthy if any queue is unhealthy", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "unhealthy" as const,
            message: "Queue failed",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });

    it("should return unhealthy if multiple components are unhealthy", () => {
      const checks = {
        database: {
          status: "unhealthy" as const,
          message: "Database failed",
          lastChecked: new Date(),
        },
        redis: {
          status: "unhealthy" as const,
          message: "Redis failed",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "unhealthy" as const,
            message: "Queue failed",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });

    it("should return unhealthy if all components are unhealthy", () => {
      const checks = {
        database: {
          status: "unhealthy" as const,
          message: "Database failed",
          lastChecked: new Date(),
        },
        redis: {
          status: "unhealthy" as const,
          message: "Redis failed",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "unhealthy" as const,
            message: "Queue failed",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "unhealthy" as const,
            message: "Queue failed",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "unhealthy" as const,
            message: "Queue failed",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "unhealthy" as const,
            message: "Queue failed",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "unhealthy" as const,
            message: "Queue failed",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });
  });

  describe("Degraded Status", () => {
    it("should return degraded if any component is degraded but none unhealthy", () => {
      const checks = {
        database: {
          status: "degraded" as const,
          message: "Slow",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("degraded");
    });

    it("should return degraded if database is degraded", () => {
      const checks = {
        database: {
          status: "degraded" as const,
          message: "Database is slow",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("degraded");
    });

    it("should return degraded if Redis is degraded", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        redis: {
          status: "degraded" as const,
          message: "Redis is slow",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("degraded");
    });

    it("should return degraded if any queue is degraded", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "degraded" as const,
            message: "Queue is slow",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("degraded");
    });

    it("should return degraded if multiple components are degraded", () => {
      const checks = {
        database: {
          status: "degraded" as const,
          message: "Database is slow",
          lastChecked: new Date(),
        },
        redis: {
          status: "degraded" as const,
          message: "Redis is slow",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("degraded");
    });

    it("should return degraded if all components are degraded", () => {
      const checks = {
        database: {
          status: "degraded" as const,
          message: "Database is slow",
          lastChecked: new Date(),
        },
        redis: {
          status: "degraded" as const,
          message: "Redis is slow",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "degraded" as const,
            message: "Queue is slow",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "degraded" as const,
            message: "Queue is slow",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "degraded" as const,
            message: "Queue is slow",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "degraded" as const,
            message: "Queue is slow",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "degraded" as const,
            message: "Queue is slow",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("degraded");
    });
  });

  describe("Healthy Status", () => {
    it("should return healthy if all components are healthy", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("healthy");
    });

    it("should return healthy if all components are healthy with different messages", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "Database is responding normally",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "Redis configuration is valid",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "Queue system is operational",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "Queue system is operational",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "Queue system is operational",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "Queue system is operational",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "Queue system is operational",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("healthy");
    });
  });

  describe("Priority Logic", () => {
    it("should prioritize unhealthy over degraded", () => {
      const checks = {
        database: {
          status: "unhealthy" as const,
          message: "Failed",
          lastChecked: new Date(),
        },
        redis: {
          status: "degraded" as const,
          message: "Slow",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });

    it("should prioritize unhealthy over healthy", () => {
      const checks = {
        database: {
          status: "unhealthy" as const,
          message: "Failed",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });

    it("should prioritize degraded over healthy", () => {
      const checks = {
        database: {
          status: "degraded" as const,
          message: "Slow",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("degraded");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty queues object", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {} as Record<
          string,
          { status: string; message: string; lastChecked: Date }
        >,
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("healthy");
    });

    it("should handle queues with only some queue types", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        } as Record<
          string,
          { status: string; message: string; lastChecked: Date }
        >,
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("healthy");
    });

    it("should handle queues with extra queue types", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          extraQueue: {
            status: "unhealthy" as const,
            message: "Failed",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });
  });

  describe("Return Value", () => {
    it("should return a valid status string", () => {
      const checks = {
        database: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        redis: {
          status: "healthy" as const,
          message: "OK",
          lastChecked: new Date(),
        },
        queues: {
          noteQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          imageQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          ingredientQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          instructionQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
          categorizationQueue: {
            status: "healthy" as const,
            message: "OK",
            lastChecked: new Date(),
          },
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);

      expect(typeof status).toBe("string");
      expect(["healthy", "degraded", "unhealthy"]).toContain(status);
    });
  });
});
