import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HealthMonitor } from "../health-monitor";
import { ErrorType, ErrorSeverity } from "../../types";
import type { ServiceHealth } from "../../types";

// Mock dependencies
vi.mock("../../config/database", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    note: {
      count: vi.fn(),
    },
  },
}));

vi.mock("../../config/redis", () => ({
  redisConnection: {
    host: "localhost",
    port: 6379,
  },
}));

vi.mock("../error-handler", () => ({
  ErrorHandler: {
    createJobError: vi.fn(),
    logError: vi.fn(),
  },
}));

// Interface for accessing private methods in tests
interface HealthMonitorPrivate {
  performHealthChecks: () => Promise<ServiceHealth>;
  lastCheckTime: Date;
  checkDatabaseHealth: () => Promise<{
    status: string;
    message: string;
    responseTime?: number;
    lastChecked: Date;
  }>;
  checkRedisHealth: () => Promise<{
    status: string;
    message: string;
    responseTime?: number;
    lastChecked: Date;
  }>;
  checkQueueHealth: () => Promise<{
    noteQueue: {
      status: string;
      message: string;
      responseTime?: number;
      lastChecked: Date;
    };
    imageQueue: {
      status: string;
      message: string;
      responseTime?: number;
      lastChecked: Date;
    };
    ingredientQueue: {
      status: string;
      message: string;
      responseTime?: number;
      lastChecked: Date;
    };
    instructionQueue: {
      status: string;
      message: string;
      responseTime?: number;
      lastChecked: Date;
    };
    categorizationQueue: {
      status: string;
      message: string;
      responseTime?: number;
      lastChecked: Date;
    };
  }>;
  determineOverallStatus: (checks: unknown) => string;
  createFailedHealthCheck: (
    error: Error | string,
    context: string
  ) => {
    status: string;
    message: string;
    lastChecked: Date;
  };
}

describe("HealthMonitor", () => {
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

  describe("Singleton Pattern", () => {
    it("should return the same instance when getInstance is called multiple times", () => {
      const instance1 = HealthMonitor.getInstance();
      const instance2 = HealthMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should have private constructor", () => {
      // @ts-expect-error - Testing private constructor
      expect(() => new HealthMonitor()).toThrow();
    });
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

    it("should force refresh when refreshHealth is called", async () => {
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
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(
        monitor as unknown as HealthMonitorPrivate,
        "performHealthChecks"
      ).mockResolvedValue(mockHealth);

      await monitor.getHealth();
      await monitor.refreshHealth();

      expect(
        (monitor as unknown as HealthMonitorPrivate).performHealthChecks
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe("Health Check Methods", () => {
    it("should return overall health status", async () => {
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

      expect(health.status).toBe("healthy");
      expect(health.checks).toBeDefined();
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it("should return true for isHealthy when status is not unhealthy", async () => {
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

    it("should return false for isHealthy when status is unhealthy", async () => {
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

    it("should return component health for specific component", async () => {
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

      const queuesHealth = await monitor.getComponentHealth("queues");
      expect(queuesHealth).toEqual(mockHealth.checks.queues);
    });
  });

  describe("Database Health Check", () => {
    it("should return healthy status for fast database response", async () => {
      const { prisma } = await import("../../config/database");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "1": 1 }] as any);
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("responding normally");
      expect(health.responseTime).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return degraded status for slow database response", async () => {
      const { prisma } = await import("../../config/database");
      vi.mocked(prisma.$queryRaw).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ "1": 1 }] as unknown), 1100)
          ) as any // eslint-disable-line @typescript-eslint/no-explicit-any -- Mock PrismaPromise
      );
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("degraded");
      expect(health.message).toContain("slow to respond");
    });

    it("should return unhealthy status for database errors", async () => {
      const { prisma } = await import("../../config/database");
      const { ErrorHandler } = await import("../error-handler");

      vi.mocked(prisma.$queryRaw).mockRejectedValue(
        new Error("Database connection failed")
      );
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (err: string | Error, type?: ErrorType, _severity?: ErrorSeverity) => {
          if (type === ErrorType.DATABASE_ERROR) {
            return {
              type: ErrorType.DATABASE_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Database connection failed",
              timestamp: new Date(),
            };
          }
          if (type === ErrorType.REDIS_ERROR) {
            return {
              type: ErrorType.REDIS_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Redis host not configured",
              timestamp: new Date(),
            };
          }
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Unknown error",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.message).toContain("Database connection failed");
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });
  });

  describe("Redis Health Check", () => {
    it("should return healthy status for valid Redis configuration", async () => {
      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("configuration is valid");
      expect(health.responseTime).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return degraded status for slow Redis configuration check", async () => {
      // Mock a slow response by adding a delay
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return originalDateNow();
        } else {
          return originalDateNow() + 600; // 600ms delay to trigger degraded status
        }
      });

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("degraded");
      expect(health.message).toContain("configuration check is slow");
      expect(health.responseTime).toBeGreaterThanOrEqual(500);

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it("should return unhealthy status for missing Redis host", async () => {
      const { redisConnection } = await import("../../config/redis");
      const { ErrorHandler } = await import("../error-handler");

      // Temporarily modify redisConnection
      const originalHost = redisConnection.host;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      (redisConnection as any).host = undefined;

      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (err: string | Error, type?: ErrorType, _severity?: ErrorSeverity) => {
          if (type === ErrorType.DATABASE_ERROR) {
            return {
              type: ErrorType.DATABASE_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Database connection failed",
              timestamp: new Date(),
            };
          }
          if (type === ErrorType.REDIS_ERROR) {
            return {
              type: ErrorType.REDIS_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Redis host not configured",
              timestamp: new Date(),
            };
          }
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Unknown error",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.message).toContain("Redis host not configured");
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();

      // Restore original value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      (redisConnection as any).host = originalHost;
    });
  });

  describe("Queue Health Check", () => {
    it("should return healthy status for all queues when Redis is configured", async () => {
      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.status).toBe("healthy");
      expect(queues.imageQueue.status).toBe("healthy");
      expect(queues.ingredientQueue.status).toBe("healthy");
      expect(queues.instructionQueue.status).toBe("healthy");
      expect(queues.categorizationQueue.status).toBe("healthy");

      expect(queues.noteQueue.message).toContain("Queue system is operational");
      expect(queues.noteQueue.responseTime).toBeDefined();
      expect(queues.noteQueue.lastChecked).toBeInstanceOf(Date);
    });

    it("should return unhealthy status for all queues when Redis is not configured", async () => {
      const { redisConnection } = await import("../../config/redis");
      const { ErrorHandler } = await import("../error-handler");

      // Temporarily modify redisConnection
      const originalHost = redisConnection.host;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      (redisConnection as any).host = undefined;

      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (err: string | Error, type?: ErrorType, _severity?: ErrorSeverity) => {
          if (type === ErrorType.DATABASE_ERROR) {
            return {
              type: ErrorType.DATABASE_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Database connection failed",
              timestamp: new Date(),
            };
          }
          if (type === ErrorType.REDIS_ERROR) {
            return {
              type: ErrorType.REDIS_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Redis host not configured",
              timestamp: new Date(),
            };
          }
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Unknown error",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.status).toBe("unhealthy");
      expect(queues.imageQueue.status).toBe("unhealthy");
      expect(queues.ingredientQueue.status).toBe("unhealthy");
      expect(queues.instructionQueue.status).toBe("unhealthy");
      expect(queues.categorizationQueue.status).toBe("unhealthy");

      expect(queues.noteQueue.message).toContain("Queue system failed");
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();

      // Restore original value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      (redisConnection as any).host = originalHost;
    });
  });

  describe("Overall Status Determination", () => {
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
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("unhealthy");
    });

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
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("degraded");
    });

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
        },
      };

      const status = (
        monitor as unknown as HealthMonitorPrivate
      ).determineOverallStatus(checks);
      expect(status).toBe("healthy");
    });
  });

  describe("Failed Health Check Creation", () => {
    it("should create a failed health check with correct properties", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("Test failure", "test context");

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe("Test failure");
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe("Perform Health Checks", () => {
    it("should handle database health check failure in performHealthChecks", async () => {
      const { prisma } = await import("../../config/database");
      const { ErrorHandler } = await import("../error-handler");

      // Mock database failure
      vi.mocked(prisma.$queryRaw).mockRejectedValue(
        new Error("Database connection failed")
      );
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (err: string | Error, type?: ErrorType, _severity?: ErrorSeverity) => {
          if (type === ErrorType.DATABASE_ERROR) {
            return {
              type: ErrorType.DATABASE_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Database connection failed",
              timestamp: new Date(),
            };
          }
          if (type === ErrorType.REDIS_ERROR) {
            return {
              type: ErrorType.REDIS_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Redis host not configured",
              timestamp: new Date(),
            };
          }
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Unknown error",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).performHealthChecks();

      expect(health.checks.database.status).toBe("unhealthy");
      expect(health.checks.database.message).toContain(
        "Database connection failed"
      );
      expect(health.checks.redis.status).toBe("healthy");
      expect(health.checks.queues).toBeDefined();
    });

    it("should handle Redis health check failure in performHealthChecks", async () => {
      const { prisma } = await import("../../config/database");
      const { redisConnection } = await import("../../config/redis");
      const { ErrorHandler } = await import("../error-handler");

      // Mock database health check to succeed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      (vi.mocked(prisma.$queryRaw) as any).mockResolvedValue([{ "1": 1 }]);
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      // Temporarily modify redisConnection to cause failure
      const originalHost = redisConnection.host;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      (redisConnection as any).host = undefined;

      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (err: string | Error, type?: ErrorType, _severity?: ErrorSeverity) => {
          if (type === ErrorType.DATABASE_ERROR) {
            return {
              type: ErrorType.DATABASE_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Database connection failed",
              timestamp: new Date(),
            };
          }
          if (type === ErrorType.REDIS_ERROR) {
            return {
              type: ErrorType.REDIS_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Redis host not configured",
              timestamp: new Date(),
            };
          }
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Unknown error",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).performHealthChecks();

      expect(health.checks.database.status).toBe("healthy");
      expect(health.checks.redis.status).toBe("unhealthy");
      expect(health.checks.redis.message).toContain(
        "Redis host not configured"
      );
      expect(health.checks.queues).toBeDefined();

      // Restore original value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      (redisConnection as any).host = originalHost;
    });

    it("should handle both database and Redis health check failures", async () => {
      const { prisma } = await import("../../config/database");
      const { redisConnection } = await import("../../config/redis");
      const { ErrorHandler } = await import("../error-handler");

      // Mock database failure
      vi.mocked(prisma.$queryRaw).mockRejectedValue(
        new Error("Database connection failed")
      );

      // Temporarily modify redisConnection to cause failure
      const originalHost = redisConnection.host;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      (redisConnection as any).host = undefined;

      // Mock ErrorHandler.createJobError to return different messages for each error type
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (err: string | Error, type?: ErrorType, _severity?: ErrorSeverity) => {
          if (type === ErrorType.DATABASE_ERROR) {
            return {
              type: ErrorType.DATABASE_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Database connection failed",
              timestamp: new Date(),
            };
          }
          if (type === ErrorType.REDIS_ERROR) {
            return {
              type: ErrorType.REDIS_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Redis host not configured",
              timestamp: new Date(),
            };
          }
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Unknown error",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).performHealthChecks();

      expect(health.checks.database.status).toBe("unhealthy");
      expect(health.checks.database.message).toContain(
        "Database connection failed"
      );
      expect(health.checks.redis.status).toBe("unhealthy");
      expect(health.checks.redis.message).toContain(
        "Redis host not configured"
      );
      expect(health.checks.queues).toBeDefined();

      // Restore original value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
      (redisConnection as any).host = originalHost;
    });
  });
});
