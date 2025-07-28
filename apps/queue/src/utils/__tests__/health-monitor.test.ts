import { beforeEach, describe, expect, it, vi } from "vitest";

import { HealthStatus, type ServiceHealth } from "../../types";
import { HealthMonitor } from "../health-monitor";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock the dependencies
vi.mock("../config/database", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("../config/factory", () => ({
  ManagerFactory: {
    createDatabaseManager: vi.fn(),
    createCacheManager: vi.fn(),
  },
}));

vi.mock("../config/redis", () => ({
  redisConnection: {
    ping: vi.fn(),
  },
}));

describe("HealthMonitor", () => {
  let healthMonitor: HealthMonitor;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset singleton instance
    (HealthMonitor as any).instance = undefined;

    healthMonitor = HealthMonitor.getInstance();
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
      expect((healthMonitor as any).performHealthChecks).toHaveBeenCalledOnce();
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
