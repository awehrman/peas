import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HealthMonitor } from "../../health-monitor";
import { ErrorType, ErrorSeverity } from "../../../types";

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
  checkRedisHealth: () => Promise<{
    status: string;
    message: string;
    responseTime?: number;
    lastChecked: Date;
  }>;
}

describe("HealthMonitor.checkRedisHealth", () => {
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

  describe("Successful Redis Checks", () => {
    it("should return healthy status for valid Redis configuration", async () => {
      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("configuration is valid");
      expect(health.responseTime).toBeDefined();
      expect(health.responseTime).toBeLessThan(500);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return healthy status for very fast configuration check", async () => {
      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("configuration is valid");
      expect(health.responseTime).toBeDefined();
      expect(health.responseTime).toBeLessThan(500);
    });

    it("should handle different Redis host values", async () => {
      const { redisConnection } = await import("../../../config/redis");

      // Test with different host values
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = "redis.example.com";

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("configuration is valid");
      expect(health.responseTime).toBeDefined();

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should handle different Redis port values", async () => {
      const { redisConnection } = await import("../../../config/redis");

      // Test with different port values
      const originalPort = redisConnection.port;
      (redisConnection as { port?: number }).port = 6380;

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("configuration is valid");
      expect(health.responseTime).toBeDefined();

      // Restore original value
      (redisConnection as { port?: number }).port = originalPort;
    });
  });

  describe("Degraded Performance", () => {
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

    it("should return degraded status for response time exactly at threshold", async () => {
      // Mock a response time exactly at the threshold
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return originalDateNow();
        } else {
          return originalDateNow() + 500; // Exactly at threshold
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

    it("should return degraded status for very slow configuration check", async () => {
      // Mock a very slow response
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return originalDateNow();
        } else {
          return originalDateNow() + 2000; // 2 second delay
        }
      });

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("degraded");
      expect(health.message).toContain("configuration check is slow");
      expect(health.responseTime).toBeGreaterThanOrEqual(2000);

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe("Redis Configuration Errors", () => {
    it("should return unhealthy status for missing Redis host", async () => {
      const { redisConnection } = await import("../../../config/redis");
      const { ErrorHandler } = await import("../../error-handler");

      // Temporarily modify redisConnection
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = undefined;

      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.REDIS_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Redis host not configured",
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
      expect(health.lastChecked).toBeInstanceOf(Date);
      expect(health.responseTime).toBeUndefined();
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should return unhealthy status for empty Redis host", async () => {
      const { redisConnection } = await import("../../../config/redis");
      const { ErrorHandler } = await import("../../error-handler");

      // Temporarily modify redisConnection
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = "";

      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.REDIS_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Redis host not configured",
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
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should return unhealthy status for null Redis host", async () => {
      const { redisConnection } = await import("../../../config/redis");
      const { ErrorHandler } = await import("../../error-handler");

      // Temporarily modify redisConnection
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string | null }).host = null;

      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.REDIS_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Redis host not configured",
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
      (redisConnection as { host?: string | null }).host = originalHost;
    });

    it("should handle other Redis configuration errors", async () => {
      const { redisConnection } = await import("../../../config/redis");
      const { ErrorHandler } = await import("../../error-handler");

      // Temporarily modify redisConnection to cause a different error
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = ""; // Empty string should trigger error

      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.REDIS_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Redis configuration error",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.message).toContain("Redis configuration error");
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });
  });

  describe("Error Handler Integration", () => {
    it("should call ErrorHandler.createJobError with correct parameters", async () => {
      const { redisConnection } = await import("../../../config/redis");
      const { ErrorHandler } = await import("../../error-handler");

      // Temporarily modify redisConnection to cause error
      const originalHost = redisConnection.host;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (redisConnection as any).host = undefined;

      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.REDIS_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Redis host not configured",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      await (monitor as unknown as HealthMonitorPrivate).checkRedisHealth();

      expect(ErrorHandler.createJobError).toHaveBeenCalledWith(
        expect.any(Error),
        ErrorType.REDIS_ERROR,
        ErrorSeverity.HIGH,
        { operation: "health_check" }
      );

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should call ErrorHandler.logError with the created job error", async () => {
      const { redisConnection } = await import("../../../config/redis");
      const { ErrorHandler } = await import("../../error-handler");

      // Temporarily modify redisConnection to cause error
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = undefined;

      const mockJobError = {
        type: ErrorType.REDIS_ERROR,
        severity: ErrorSeverity.HIGH,
        message: "Redis host not configured",
        timestamp: new Date(),
      };

      vi.mocked(ErrorHandler.createJobError).mockReturnValue(mockJobError);
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      await (monitor as unknown as HealthMonitorPrivate).checkRedisHealth();

      expect(ErrorHandler.logError).toHaveBeenCalledWith(mockJobError);

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });
  });

  describe("Response Time Calculation", () => {
    it("should calculate response time correctly for fast checks", async () => {
      const startTime = Date.now();
      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();
      const endTime = Date.now();

      expect(health.responseTime).toBeDefined();
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.responseTime).toBeLessThanOrEqual(endTime - startTime + 10); // Allow some tolerance
    });

    it("should calculate response time correctly for slow checks", async () => {
      // Mock a slow response
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return originalDateNow();
        } else {
          return originalDateNow() + 300; // 300ms delay
        }
      });

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.responseTime).toBeDefined();
      expect(health.responseTime).toBeGreaterThanOrEqual(300);

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe("Return Value Structure", () => {
    it("should return health check with correct structure for success", async () => {
      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("message");
      expect(health).toHaveProperty("responseTime");
      expect(health).toHaveProperty("lastChecked");
      expect(typeof health.status).toBe("string");
      expect(typeof health.message).toBe("string");
      expect(typeof health.responseTime).toBe("number");
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return health check with correct structure for error", async () => {
      const { redisConnection } = await import("../../../config/redis");
      const { ErrorHandler } = await import("../../error-handler");

      // Temporarily modify redisConnection to cause error
      const originalHost = redisConnection.host;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (redisConnection as any).host = undefined;

      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.REDIS_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Redis host not configured",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("message");
      expect(health).toHaveProperty("lastChecked");
      expect(health).not.toHaveProperty("responseTime");
      expect(typeof health.status).toBe("string");
      expect(typeof health.message).toBe("string");
      expect(health.lastChecked).toBeInstanceOf(Date);

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });
  });

  describe("Edge Cases", () => {
    it("should handle Redis host with special characters", async () => {
      const { redisConnection } = await import("../../../config/redis");

      // Test with special characters in host
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = "redis-host.with.dots";

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("configuration is valid");

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should handle Redis host with numbers", async () => {
      const { redisConnection } = await import("../../../config/redis");

      // Test with numbers in host
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = "redis-123.example.com";

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("configuration is valid");

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should handle Redis host with underscores", async () => {
      const { redisConnection } = await import("../../../config/redis");

      // Test with underscores in host
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = "redis_host.example.com";

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkRedisHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("configuration is valid");

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });
  });
});
