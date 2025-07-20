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
  createFailedHealthCheck: (message: string) => {
    status: string;
    message: string;
    lastChecked: Date;
  };
}

describe("HealthMonitor.checkQueueHealth", () => {
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

  describe("Successful Queue Checks", () => {
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
      expect(queues.imageQueue.message).toContain(
        "Queue system is operational"
      );
      expect(queues.ingredientQueue.message).toContain(
        "Queue system is operational"
      );
      expect(queues.instructionQueue.message).toContain(
        "Queue system is operational"
      );
      expect(queues.categorizationQueue.message).toContain(
        "Queue system is operational"
      );

      expect(queues.noteQueue.responseTime).toBeDefined();
      expect(queues.imageQueue.responseTime).toBeDefined();
      expect(queues.ingredientQueue.responseTime).toBeDefined();
      expect(queues.instructionQueue.responseTime).toBeDefined();
      expect(queues.categorizationQueue.responseTime).toBeDefined();

      expect(queues.noteQueue.lastChecked).toBeInstanceOf(Date);
      expect(queues.imageQueue.lastChecked).toBeInstanceOf(Date);
      expect(queues.ingredientQueue.lastChecked).toBeInstanceOf(Date);
      expect(queues.instructionQueue.lastChecked).toBeInstanceOf(Date);
      expect(queues.categorizationQueue.lastChecked).toBeInstanceOf(Date);
    });

    it("should return consistent response times for all queues", async () => {
      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      const responseTimes = [
        queues.noteQueue.responseTime,
        queues.imageQueue.responseTime,
        queues.ingredientQueue.responseTime,
        queues.instructionQueue.responseTime,
        queues.categorizationQueue.responseTime,
      ];

      // All response times should be the same since they're calculated together
      const firstResponseTime = responseTimes[0];
      responseTimes.forEach((responseTime) => {
        expect(responseTime).toBe(firstResponseTime);
      });
    });

    it("should return consistent lastChecked times for all queues", async () => {
      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      const lastCheckedTimes = [
        queues.noteQueue.lastChecked,
        queues.imageQueue.lastChecked,
        queues.ingredientQueue.lastChecked,
        queues.instructionQueue.lastChecked,
        queues.categorizationQueue.lastChecked,
      ];

      // All lastChecked times should be the same since they're set together
      const firstLastChecked = lastCheckedTimes[0];
      expect(firstLastChecked).toBeDefined();
      lastCheckedTimes.forEach((lastChecked) => {
        expect(lastChecked.getTime()).toBe(firstLastChecked!.getTime());
      });
    });
  });

  describe("Queue System Errors", () => {
    it("should return unhealthy status for all queues when Redis is not configured", async () => {
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

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.status).toBe("unhealthy");
      expect(queues.imageQueue.status).toBe("unhealthy");
      expect(queues.ingredientQueue.status).toBe("unhealthy");
      expect(queues.instructionQueue.status).toBe("unhealthy");
      expect(queues.categorizationQueue.status).toBe("unhealthy");

      expect(queues.noteQueue.message).toContain("Queue system failed");
      expect(queues.imageQueue.message).toContain("Queue system failed");
      expect(queues.ingredientQueue.message).toContain("Queue system failed");
      expect(queues.instructionQueue.message).toContain("Queue system failed");
      expect(queues.categorizationQueue.message).toContain(
        "Queue system failed"
      );

      expect(queues.noteQueue.responseTime).toBeUndefined();
      expect(queues.imageQueue.responseTime).toBeUndefined();
      expect(queues.ingredientQueue.responseTime).toBeUndefined();
      expect(queues.instructionQueue.responseTime).toBeUndefined();
      expect(queues.categorizationQueue.responseTime).toBeUndefined();

      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should return unhealthy status for all queues when Redis host is empty", async () => {
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

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.status).toBe("unhealthy");
      expect(queues.imageQueue.status).toBe("unhealthy");
      expect(queues.ingredientQueue.status).toBe("unhealthy");
      expect(queues.instructionQueue.status).toBe("unhealthy");
      expect(queues.categorizationQueue.status).toBe("unhealthy");

      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should return unhealthy status for all queues when Redis host is null", async () => {
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

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.status).toBe("unhealthy");
      expect(queues.imageQueue.status).toBe("unhealthy");
      expect(queues.ingredientQueue.status).toBe("unhealthy");
      expect(queues.instructionQueue.status).toBe("unhealthy");
      expect(queues.categorizationQueue.status).toBe("unhealthy");

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

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.status).toBe("unhealthy");
      expect(queues.imageQueue.status).toBe("unhealthy");
      expect(queues.ingredientQueue.status).toBe("unhealthy");
      expect(queues.instructionQueue.status).toBe("unhealthy");
      expect(queues.categorizationQueue.status).toBe("unhealthy");

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

      await (monitor as unknown as HealthMonitorPrivate).checkQueueHealth();

      expect(ErrorHandler.createJobError).toHaveBeenCalledWith(
        expect.any(Error),
        ErrorType.REDIS_ERROR,
        ErrorSeverity.HIGH,
        { operation: "queue_health_check" }
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

      await (monitor as unknown as HealthMonitorPrivate).checkQueueHealth();

      expect(ErrorHandler.logError).toHaveBeenCalledWith(mockJobError);

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });
  });

  describe("Response Time Calculation", () => {
    it("should calculate response time correctly for fast checks", async () => {
      const startTime = Date.now();
      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();
      const endTime = Date.now();

      expect(queues.noteQueue.responseTime).toBeDefined();
      expect(queues.noteQueue.responseTime).toBeGreaterThanOrEqual(0);
      expect(queues.noteQueue.responseTime).toBeLessThanOrEqual(
        endTime - startTime + 10
      ); // Allow some tolerance
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

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.responseTime).toBeDefined();
      expect(queues.noteQueue.responseTime).toBeGreaterThanOrEqual(300);

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe("Return Value Structure", () => {
    it("should return health check with correct structure for success", async () => {
      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      const queueNames = [
        "noteQueue",
        "imageQueue",
        "ingredientQueue",
        "instructionQueue",
        "categorizationQueue",
      ];

      queueNames.forEach((queueName) => {
        const queue = queues[queueName as keyof typeof queues];
        expect(queue).toHaveProperty("status");
        expect(queue).toHaveProperty("message");
        expect(queue).toHaveProperty("responseTime");
        expect(queue).toHaveProperty("lastChecked");
        expect(typeof queue.status).toBe("string");
        expect(typeof queue.message).toBe("string");
        expect(typeof queue.responseTime).toBe("number");
        expect(queue.lastChecked).toBeInstanceOf(Date);
      });
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

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      const queueNames = [
        "noteQueue",
        "imageQueue",
        "ingredientQueue",
        "instructionQueue",
        "categorizationQueue",
      ];

      queueNames.forEach((queueName) => {
        const queue = queues[queueName as keyof typeof queues];
        expect(queue).toHaveProperty("status");
        expect(queue).toHaveProperty("message");
        expect(queue).toHaveProperty("lastChecked");
        expect(queue).not.toHaveProperty("responseTime");
        expect(typeof queue.status).toBe("string");
        expect(typeof queue.message).toBe("string");
        expect(queue.lastChecked).toBeInstanceOf(Date);
      });

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });
  });

  describe("Queue Types", () => {
    it("should include all required queue types", async () => {
      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues).toHaveProperty("noteQueue");
      expect(queues).toHaveProperty("imageQueue");
      expect(queues).toHaveProperty("ingredientQueue");
      expect(queues).toHaveProperty("instructionQueue");
      expect(queues).toHaveProperty("categorizationQueue");
    });

    it("should have consistent status across all queues for success", async () => {
      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      const statuses = [
        queues.noteQueue.status,
        queues.imageQueue.status,
        queues.ingredientQueue.status,
        queues.instructionQueue.status,
        queues.categorizationQueue.status,
      ];

      const firstStatus = statuses[0];
      statuses.forEach((status) => {
        expect(status).toBe(firstStatus);
      });
    });

    it("should have consistent status across all queues for failure", async () => {
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

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      const statuses = [
        queues.noteQueue.status,
        queues.imageQueue.status,
        queues.ingredientQueue.status,
        queues.instructionQueue.status,
        queues.categorizationQueue.status,
      ];

      const firstStatus = statuses[0];
      statuses.forEach((status) => {
        expect(status).toBe(firstStatus);
      });

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

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.status).toBe("healthy");
      expect(queues.noteQueue.message).toContain("Queue system is operational");

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should handle Redis host with numbers", async () => {
      const { redisConnection } = await import("../../../config/redis");

      // Test with numbers in host
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = "redis-123.example.com";

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.status).toBe("healthy");
      expect(queues.noteQueue.message).toContain("Queue system is operational");

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });

    it("should handle Redis host with underscores", async () => {
      const { redisConnection } = await import("../../../config/redis");

      // Test with underscores in host
      const originalHost = redisConnection.host;
      (redisConnection as { host?: string }).host = "redis_host.example.com";

      const queues = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkQueueHealth();

      expect(queues.noteQueue.status).toBe("healthy");
      expect(queues.noteQueue.message).toContain("Queue system is operational");

      // Restore original value
      (redisConnection as { host?: string }).host = originalHost;
    });
  });
});
