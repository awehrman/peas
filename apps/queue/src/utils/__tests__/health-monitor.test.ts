import { beforeEach, describe, expect, it, vi } from "vitest";

import { HealthStatus, type ServiceHealth } from "../../types";
import { HealthMonitor } from "../health-monitor";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock the dependencies
vi.mock("../../config/database", () => ({
  prisma: {
    note: {
      count: vi.fn(),
    },
  },
}));

vi.mock("../../config/factory", () => ({
  ManagerFactory: {
    createDatabaseManager: vi.fn(),
    createCacheManager: vi.fn(),
  },
}));

vi.mock("../../config/redis", () => ({
  redisConnection: {
    get: vi.fn(),
    host: "localhost",
  },
}));

vi.mock("../error-handler", () => ({
  ErrorHandler: {
    createJobError: vi.fn(),
    logError: vi.fn(),
  },
}));

describe("HealthMonitor", () => {
  let healthMonitor: HealthMonitor;
  let mockDatabaseManager: any;
  let mockCacheManager: any;
  let mockErrorHandler: any;
  let ManagerFactory: any;
  let ErrorHandler: any;
  let redisConnection: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset singleton instance
    (HealthMonitor as any).instance = undefined;

    healthMonitor = HealthMonitor.getInstance();

    // Setup mock managers
    mockDatabaseManager = {
      checkConnectionHealth: vi.fn(),
      executeWithRetry: vi.fn(),
    };

    mockCacheManager = {
      isReady: vi.fn(),
      connect: vi.fn(),
    };

    mockErrorHandler = {
      createJobError: vi.fn(),
      logError: vi.fn(),
    };

    // Import the mocked modules
    const factoryModule = await import("../../config/factory");
    const errorHandlerModule = await import("../error-handler");
    const redisModule = await import("../../config/redis");

    ManagerFactory = factoryModule.ManagerFactory;
    ErrorHandler = errorHandlerModule.ErrorHandler;
    redisConnection = redisModule.redisConnection;

    // Setup the mocks
    (ManagerFactory.createDatabaseManager as any).mockReturnValue(
      mockDatabaseManager
    );
    (ManagerFactory.createCacheManager as any).mockReturnValue(
      mockCacheManager
    );
    (ErrorHandler.createJobError as any) = mockErrorHandler.createJobError;
    (ErrorHandler.logError as any) = mockErrorHandler.logError;
  });

  describe("singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = HealthMonitor.getInstance();
      const instance2 = HealthMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should prevent direct instantiation", () => {
      expect(() => {
        new (HealthMonitor as any)();
      }).toThrow("HealthMonitor is a singleton");
    });
  });

  describe("getHealth", () => {
    it("should return cached health if recent", async () => {
      // Mock the private methods
      const mockHealth: ServiceHealth = {
        status: HealthStatus.HEALTHY,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 100,
            performance: 100,
          },
          redis: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 50,
            performance: 100,
          },
          queues: {
            noteQueue: {
              status: HealthStatus.HEALTHY,
              message: "OK",
              lastChecked: new Date(),
              responseTime: 25,
              performance: 100,
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(healthMonitor as any, "performHealthChecks").mockResolvedValue(
        mockHealth
      );

      // Set cache to recent
      (healthMonitor as any).healthCache = mockHealth;
      (healthMonitor as any).lastCheckTime = new Date(Date.now() - 1000); // 1 second ago

      const result = await healthMonitor.getHealth();

      expect(result).toBe(mockHealth);
      expect((healthMonitor as any).performHealthChecks).not.toHaveBeenCalled();
    });

    it("should perform fresh health checks if cache is expired", async () => {
      const mockHealth: ServiceHealth = {
        status: HealthStatus.HEALTHY,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 100,
            performance: 100,
          },
          redis: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 50,
            performance: 100,
          },
          queues: {
            noteQueue: {
              status: HealthStatus.HEALTHY,
              message: "OK",
              lastChecked: new Date(),
              responseTime: 25,
              performance: 100,
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(healthMonitor as any, "performHealthChecks").mockResolvedValue(
        mockHealth
      );

      // Set cache to expired
      (healthMonitor as any).healthCache = mockHealth;
      (healthMonitor as any).lastCheckTime = new Date(Date.now() - 60000); // 1 minute ago

      const result = await healthMonitor.getHealth();

      expect(result).toBe(mockHealth);
      expect((healthMonitor as any).performHealthChecks).toHaveBeenCalledOnce();
    });

    it("should perform fresh health checks if no cache exists", async () => {
      const mockHealth: ServiceHealth = {
        status: HealthStatus.HEALTHY,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 100,
            performance: 100,
          },
          redis: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 50,
            performance: 100,
          },
          queues: {
            noteQueue: {
              status: HealthStatus.HEALTHY,
              message: "OK",
              lastChecked: new Date(),
              responseTime: 25,
              performance: 100,
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(healthMonitor as any, "performHealthChecks").mockResolvedValue(
        mockHealth
      );

      const result = await healthMonitor.getHealth();

      expect(result).toBe(mockHealth);
      expect((healthMonitor as any).performHealthChecks).toHaveBeenCalledOnce();
    });
  });

  describe("performHealthChecks", () => {
    it("should perform all health checks successfully", async () => {
      // Mock successful health checks
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(true);
      mockDatabaseManager.executeWithRetry.mockResolvedValue(undefined);
      mockCacheManager.isReady.mockReturnValue(true);
      (redisConnection.get as any).mockResolvedValue("test");

      const result = await (healthMonitor as any).performHealthChecks();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks.database.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks.redis.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks.queues.noteQueue.status).toBe(HealthStatus.HEALTHY);
    });

    it("should handle database health check failure", async () => {
      // Mock database failure
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(false);
      mockCacheManager.isReady.mockReturnValue(true);
      redisConnection.get.mockResolvedValue("test");

      mockErrorHandler.createJobError.mockReturnValue({
        message: "Database health check failed",
      });

      const result = await (healthMonitor as any).performHealthChecks();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.database.status).toBe(HealthStatus.UNHEALTHY);
      expect(mockErrorHandler.createJobError).toHaveBeenCalled();
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle database query error", async () => {
      // Mock database connection success but query failure
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(true);
      mockDatabaseManager.executeWithRetry.mockRejectedValue(
        new Error("Query failed")
      );
      mockCacheManager.isReady.mockReturnValue(true);
      (redisConnection.get as any).mockResolvedValue("test");

      mockErrorHandler.createJobError.mockReturnValue({
        message: "Database connection failed",
      });

      const result = await (healthMonitor as any).performHealthChecks();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.database.status).toBe(HealthStatus.UNHEALTHY);
      expect(mockErrorHandler.createJobError).toHaveBeenCalled();
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle Redis health check failure", async () => {
      // Mock database success but Redis failure
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(true);
      mockDatabaseManager.executeWithRetry.mockResolvedValue(undefined);
      mockCacheManager.isReady.mockReturnValue(false);
      mockCacheManager.connect.mockRejectedValue(
        new Error("Redis connection failed")
      );
      (redisConnection.get as any).mockRejectedValue(new Error("Redis error"));

      mockErrorHandler.createJobError.mockReturnValue({
        message: "Redis connection failed",
      });

      const result = await (healthMonitor as any).performHealthChecks();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.redis.status).toBe(HealthStatus.UNHEALTHY);
      expect(mockErrorHandler.createJobError).toHaveBeenCalled();
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle queue health check failure", async () => {
      // Mock database and Redis success but queue failure
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(true);
      mockDatabaseManager.executeWithRetry.mockResolvedValue(undefined);
      mockCacheManager.isReady.mockReturnValue(true);
      (redisConnection.get as any).mockResolvedValue("test");
      (redisConnection.host as any) = undefined; // This will cause queue check to fail

      mockErrorHandler.createJobError.mockReturnValue({
        message: "Queue system failed",
      });

      const result = await (healthMonitor as any).performHealthChecks();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.queues.noteQueue.status).toBe(
        HealthStatus.UNHEALTHY
      );
      expect(mockErrorHandler.createJobError).toHaveBeenCalled();
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle mixed health statuses", async () => {
      // Test that Redis health check returns degraded for slow response
      mockCacheManager.isReady.mockReturnValue(true);
      (redisConnection.get as any).mockResolvedValue("test");

      // Mock slow Redis response to trigger degraded status
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(600); // End time - 600ms response time

      const result = await (healthMonitor as any).checkRedisHealth();

      expect(result.status).toBe("degraded");
      expect(result.message).toBe("Redis configuration check is slow");
      expect(result.responseTime).toBe(600);
      expect(result.performance).toBe(75);
      expect(result.warnings).toContain(
        "Response time 600ms exceeds threshold"
      );
    });
  });

  describe("checkDatabaseHealth", () => {
    it("should return healthy status for fast response", async () => {
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(true);
      mockDatabaseManager.executeWithRetry.mockResolvedValue(undefined);

      vi.spyOn(Date, "now")
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(99); // End time - 99ms response time (under 100ms threshold)

      const result = await (healthMonitor as any).checkDatabaseHealth();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.message).toBe("Database is responding normally");
      expect(result.responseTime).toBe(99);
      expect(result.performance).toBe(100);
    });

    it("should return degraded status for slow response", async () => {
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(true);
      mockDatabaseManager.executeWithRetry.mockResolvedValue(undefined);

      vi.spyOn(Date, "now")
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(600); // End time - 600ms response time

      const result = await (healthMonitor as any).checkDatabaseHealth();

      expect(result.status).toBe("degraded");
      expect(result.message).toBe("Database is slow to respond");
      expect(result.responseTime).toBe(600);
      expect(result.performance).toBe(75);
      expect(result.warnings).toContain(
        "Response time 600ms exceeds threshold"
      );
    });

    it("should handle database connection error", async () => {
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(false);

      mockErrorHandler.createJobError.mockReturnValue({
        message: "Database health check failed",
      });

      const result = await (healthMonitor as any).checkDatabaseHealth();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.message).toBe("Database health check failed");
      expect(result.errorCode).toBe("DB_CONNECTION_ERROR");
      expect(result.critical).toBe(true);
      expect(mockErrorHandler.createJobError).toHaveBeenCalled();
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle database query error", async () => {
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(true);
      mockDatabaseManager.executeWithRetry.mockRejectedValue(
        new Error("Query failed")
      );

      mockErrorHandler.createJobError.mockReturnValue({
        message: "Database connection failed",
      });

      const result = await (healthMonitor as any).checkDatabaseHealth();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.message).toBe("Database connection failed");
      expect(result.errorCode).toBe("DB_CONNECTION_ERROR");
      expect(result.critical).toBe(true);
      expect(mockErrorHandler.createJobError).toHaveBeenCalled();
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });

    it("should execute prisma note count query successfully", async () => {
      mockDatabaseManager.checkConnectionHealth.mockResolvedValue(true);
      mockDatabaseManager.executeWithRetry.mockImplementation(
        async (fn: () => Promise<void>) => {
          // This should call the prisma.note.count() function
          await fn();
        }
      );

      // Mock the prisma.note.count call
      const prisma = await import("../../config/database");
      (prisma.prisma.note.count as any).mockResolvedValue(42);

      vi.spyOn(Date, "now")
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(99); // End time - 99ms response time

      const result = await (healthMonitor as any).checkDatabaseHealth();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.message).toBe("Database is responding normally");
      expect(result.responseTime).toBe(99);
      expect(result.performance).toBe(100);

      // Verify that the prisma.note.count was called
      expect(prisma.prisma.note.count).toHaveBeenCalled();
    });
  });

  describe("checkRedisHealth", () => {
    it("should return healthy status for fast response", async () => {
      mockCacheManager.isReady.mockReturnValue(true);
      (redisConnection.get as any).mockResolvedValue("test");

      vi.spyOn(Date, "now")
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(99); // End time - 99ms response time (under 100ms threshold)

      const result = await (healthMonitor as any).checkRedisHealth();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.message).toBe("Redis configuration is valid");
      expect(result.responseTime).toBe(99);
      expect(result.performance).toBe(100);
    });

    it("should return degraded status for slow response", async () => {
      mockCacheManager.isReady.mockReturnValue(true);
      (redisConnection.get as any).mockResolvedValue("test");

      vi.spyOn(Date, "now")
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(600); // End time - 600ms response time

      const result = await (healthMonitor as any).checkRedisHealth();

      expect(result.status).toBe("degraded");
      expect(result.message).toBe("Redis configuration check is slow");
      expect(result.responseTime).toBe(600);
      expect(result.performance).toBe(75);
      expect(result.warnings).toContain(
        "Response time 600ms exceeds threshold"
      );
    });

    it("should handle cache manager not ready", async () => {
      mockCacheManager.isReady.mockReturnValue(false);
      mockCacheManager.connect.mockResolvedValue(undefined);
      (redisConnection.get as any).mockResolvedValue("test");

      const result = await (healthMonitor as any).checkRedisHealth();

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(mockCacheManager.connect).toHaveBeenCalled();
    });

    it("should handle Redis connection error", async () => {
      mockCacheManager.isReady.mockReturnValue(true);
      (redisConnection.get as any).mockRejectedValue(
        new Error("Redis connection failed")
      );

      mockErrorHandler.createJobError.mockReturnValue({
        message: "Redis connection failed",
      });

      const result = await (healthMonitor as any).checkRedisHealth();

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.message).toBe("Redis connection failed");
      expect(result.errorCode).toBe("REDIS_CONNECTION_ERROR");
      expect(result.critical).toBe(true);
      expect(mockErrorHandler.createJobError).toHaveBeenCalled();
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });
  });

  describe("checkQueueHealth", () => {
    it("should return healthy status for all queues", async () => {
      (redisConnection.host as any) = "localhost";

      const result = await (healthMonitor as any).checkQueueHealth();

      expect(result.noteQueue.status).toBe(HealthStatus.HEALTHY);
      expect(result.imageQueue.status).toBe(HealthStatus.HEALTHY);
      expect(result.ingredientQueue.status).toBe(HealthStatus.HEALTHY);
      expect(result.instructionQueue.status).toBe(HealthStatus.HEALTHY);
      expect(result.categorizationQueue.status).toBe(HealthStatus.HEALTHY);
      expect(result.noteQueue.message).toBe("Queue system is operational");
    });

    it("should return unhealthy status when Redis host is missing", async () => {
      (redisConnection.host as any) = undefined;

      mockErrorHandler.createJobError.mockReturnValue({
        message: "Queue system failed",
      });

      const result = await (healthMonitor as any).checkQueueHealth();

      expect(result.noteQueue.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.imageQueue.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.ingredientQueue.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.instructionQueue.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.categorizationQueue.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.noteQueue.errorCode).toBe("QUEUE_CONNECTION_ERROR");
      expect(result.noteQueue.critical).toBe(false);
      expect(mockErrorHandler.createJobError).toHaveBeenCalled();
      expect(mockErrorHandler.logError).toHaveBeenCalled();
    });
  });

  describe("refreshHealth", () => {
    it("should clear cache and perform fresh health check", async () => {
      const mockHealth: ServiceHealth = {
        status: HealthStatus.HEALTHY,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 100,
            performance: 100,
          },
          redis: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 50,
            performance: 100,
          },
          queues: {
            noteQueue: {
              status: HealthStatus.HEALTHY,
              message: "OK",
              lastChecked: new Date(),
              responseTime: 25,
              performance: 100,
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(healthMonitor as any, "performHealthChecks").mockResolvedValue(
        mockHealth
      );

      // Set cache
      (healthMonitor as any).healthCache = mockHealth;
      (healthMonitor as any).lastCheckTime = new Date();

      const result = await healthMonitor.refreshHealth();

      expect(result).toBe(mockHealth);
      expect((healthMonitor as any).performHealthChecks).toHaveBeenCalledOnce();
      // Note: healthCache and lastCheckTime are not null because refreshHealth() calls getHealth()
      // which immediately populates the cache with fresh data
      expect((healthMonitor as any).healthCache).toBe(mockHealth);
      expect((healthMonitor as any).lastCheckTime).toBeInstanceOf(Date);
    });
  });

  describe("isHealthy", () => {
    it("should return true for healthy status", async () => {
      vi.spyOn(healthMonitor, "getHealth").mockResolvedValue({
        status: HealthStatus.HEALTHY,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 100,
            performance: 100,
          },
          redis: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 50,
            performance: 100,
          },
          queues: {},
        },
        timestamp: new Date(),
      });

      const result = await healthMonitor.isHealthy();

      expect(result).toBe(true);
    });

    it("should return true for degraded status", async () => {
      vi.spyOn(healthMonitor, "getHealth").mockResolvedValue({
        status: HealthStatus.DEGRADED,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 100,
            performance: 100,
          },
          redis: {
            status: HealthStatus.DEGRADED,
            warnings: [],
            performance: 0,
            lastChecked: new Date(),
            responseTime: 500,
          },
          queues: {},
        },
        timestamp: new Date(),
      });

      const result = await healthMonitor.isHealthy();

      expect(result).toBe(true);
    });

    it("should return false for unhealthy status", async () => {
      vi.spyOn(healthMonitor, "getHealth").mockResolvedValue({
        status: HealthStatus.UNHEALTHY,
        checks: {
          database: {
            status: HealthStatus.UNHEALTHY,
            error: "error",
            lastChecked: new Date(),
            responseTime: 5000,
          },
          redis: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 50,
            performance: 100,
          },
          queues: {},
        },
        timestamp: new Date(),
      });

      const result = await healthMonitor.isHealthy();

      expect(result).toBe(false);
    });
  });

  describe("getComponentHealth", () => {
    it("should return database health", async () => {
      const mockHealth: ServiceHealth = {
        status: HealthStatus.HEALTHY,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 100,
            performance: 100,
          },
          redis: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 50,
            performance: 100,
          },
          queues: {
            noteQueue: {
              status: HealthStatus.HEALTHY,
              message: "OK",
              lastChecked: new Date(),
              responseTime: 25,
              performance: 100,
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(healthMonitor, "getHealth").mockResolvedValue(mockHealth);

      const result = await healthMonitor.getComponentHealth("database");

      expect(result).toEqual({
        status: HealthStatus.HEALTHY,
        message: "OK",
        lastChecked: expect.any(Date),
        responseTime: 100,
        performance: 100,
      });
    });

    it("should return redis health", async () => {
      const mockHealth: ServiceHealth = {
        status: HealthStatus.HEALTHY,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 100,
            performance: 100,
          },
          redis: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 50,
            performance: 100,
          },
          queues: {
            noteQueue: {
              status: HealthStatus.HEALTHY,
              message: "OK",
              lastChecked: new Date(),
              responseTime: 25,
              performance: 100,
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(healthMonitor, "getHealth").mockResolvedValue(mockHealth);

      const result = await healthMonitor.getComponentHealth("redis");

      expect(result).toEqual({
        status: HealthStatus.HEALTHY,
        message: "OK",
        lastChecked: expect.any(Date),
        responseTime: 50,
        performance: 100,
      });
    });

    it("should return queues health", async () => {
      const mockHealth: ServiceHealth = {
        status: HealthStatus.HEALTHY,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 100,
            performance: 100,
          },
          redis: {
            status: HealthStatus.HEALTHY,
            message: "OK",
            lastChecked: new Date(),
            responseTime: 50,
            performance: 100,
          },
          queues: {
            noteQueue: {
              status: HealthStatus.HEALTHY,
              message: "OK",
              lastChecked: new Date(),
              responseTime: 25,
              performance: 100,
            },
          },
        },
        timestamp: new Date(),
      };

      vi.spyOn(healthMonitor, "getHealth").mockResolvedValue(mockHealth);

      const result = await healthMonitor.getComponentHealth("queues");

      expect(result).toEqual({
        noteQueue: {
          status: HealthStatus.HEALTHY,
          message: "OK",
          lastChecked: expect.any(Date),
          responseTime: 25,
          performance: 100,
        },
      });
    });
  });

  describe("private methods", () => {
    describe("determineOverallStatus", () => {
      it("should return healthy when all checks are healthy", () => {
        const checks = {
          database: { status: HealthStatus.HEALTHY },
          redis: { status: HealthStatus.HEALTHY },
          queues: { noteQueue: { status: HealthStatus.HEALTHY } },
        };

        const result = (healthMonitor as any).determineOverallStatus(checks);

        expect(result).toBe(HealthStatus.HEALTHY);
      });

      it("should return degraded when some checks are degraded", () => {
        const checks = {
          database: { status: HealthStatus.HEALTHY },
          redis: { status: HealthStatus.DEGRADED },
          queues: { noteQueue: { status: HealthStatus.HEALTHY } },
        };

        const result = (healthMonitor as any).determineOverallStatus(checks);

        expect(result).toBe(HealthStatus.DEGRADED);
      });

      it("should return unhealthy when any check is unhealthy", () => {
        const checks = {
          database: { status: HealthStatus.HEALTHY },
          redis: { status: HealthStatus.HEALTHY },
          queues: { noteQueue: { status: HealthStatus.UNHEALTHY } },
        };

        const result = (healthMonitor as any).determineOverallStatus(checks);

        expect(result).toBe(HealthStatus.UNHEALTHY);
      });

      it("should return unhealthy when multiple checks are unhealthy", () => {
        const checks = {
          database: { status: HealthStatus.UNHEALTHY },
          redis: { status: HealthStatus.UNHEALTHY },
          queues: { noteQueue: { status: HealthStatus.HEALTHY } },
        };

        const result = (healthMonitor as any).determineOverallStatus(checks);

        expect(result).toBe(HealthStatus.UNHEALTHY);
      });
    });

    describe("createFailedHealthCheck", () => {
      it("should create failed health check", () => {
        const result = (healthMonitor as any).createFailedHealthCheck(
          "Test error"
        );

        expect(result).toEqual({
          status: HealthStatus.UNHEALTHY,
          message: "Test error",
          error: "Test error",
          errorCode: "HEALTH_CHECK_FAILED",
          critical: false,
          lastChecked: expect.any(Date),
        });
      });
    });

    describe("calculatePerformance", () => {
      it("should calculate performance scores correctly", () => {
        expect((healthMonitor as any).calculatePerformance(50)).toBe(100);
        expect((healthMonitor as any).calculatePerformance(100)).toBe(90);
        expect((healthMonitor as any).calculatePerformance(250)).toBe(90);
        expect((healthMonitor as any).calculatePerformance(500)).toBe(75);
        expect((healthMonitor as any).calculatePerformance(750)).toBe(75);
        expect((healthMonitor as any).calculatePerformance(1000)).toBe(50);
        expect((healthMonitor as any).calculatePerformance(1500)).toBe(50);
        expect((healthMonitor as any).calculatePerformance(2000)).toBe(25);
        expect((healthMonitor as any).calculatePerformance(3000)).toBe(25);
        expect((healthMonitor as any).calculatePerformance(5000)).toBe(0);
        expect((healthMonitor as any).calculatePerformance(6000)).toBe(0);
      });
    });
  });
});
