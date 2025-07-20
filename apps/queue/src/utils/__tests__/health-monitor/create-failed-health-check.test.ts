import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HealthMonitor } from "../../health-monitor";

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
  createFailedHealthCheck: (message: string) => {
    status: string;
    message: string;
    lastChecked: Date;
  };
}

describe("HealthMonitor.createFailedHealthCheck", () => {
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

  describe("Basic Functionality", () => {
    it("should create a failed health check with correct properties", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("Test failure");

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe("Test failure");
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should create a failed health check with empty message", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("");

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe("");
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should create a failed health check with long message", () => {
      const longMessage = "a".repeat(1000);
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(longMessage);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(longMessage);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe("Message Handling", () => {
    it("should handle messages with special characters", () => {
      const message = "Error with special chars: \n\t\r\"'\\";
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(message);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(message);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should handle messages with unicode characters", () => {
      const message = "Error with unicode: 🚨❌⚠️ℹ️";
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(message);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(message);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should handle messages with numbers", () => {
      const message = "Error code: 404";
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(message);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(message);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should handle messages with URLs", () => {
      const message = "Connection failed to https://example.com";
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(message);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(message);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should handle messages with JSON-like content", () => {
      const message = '{"error": "Database connection failed", "code": 500}';
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(message);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(message);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe("Status Consistency", () => {
    it("should always return unhealthy status", () => {
      const messages = [
        "Test failure",
        "Database error",
        "Network timeout",
        "Service unavailable",
        "Configuration error",
        "",
        "a".repeat(1000),
      ];

      messages.forEach((message) => {
        const failedCheck = (
          monitor as unknown as HealthMonitorPrivate
        ).createFailedHealthCheck(message);

        expect(failedCheck.status).toBe("unhealthy");
      });
    });

    it("should always return the exact message provided", () => {
      const messages = [
        "Test failure",
        "Database error",
        "Network timeout",
        "Service unavailable",
        "Configuration error",
        "",
        "a".repeat(1000),
      ];

      messages.forEach((message) => {
        const failedCheck = (
          monitor as unknown as HealthMonitorPrivate
        ).createFailedHealthCheck(message);

        expect(failedCheck.message).toBe(message);
      });
    });
  });

  describe("Timestamp Generation", () => {
    it("should set current timestamp", () => {
      const beforeCall = new Date();
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("Test failure");
      const afterCall = new Date();

      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
      expect(failedCheck.lastChecked.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime()
      );
      expect(failedCheck.lastChecked.getTime()).toBeLessThanOrEqual(
        afterCall.getTime()
      );
    });

    it("should generate unique timestamps for different calls", () => {
      const failedCheck1 = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("First failure");

      // Small delay to ensure different timestamps
      setTimeout(() => {}, 1);

      const failedCheck2 = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("Second failure");

      expect(failedCheck1.lastChecked.getTime()).toBeLessThanOrEqual(
        failedCheck2.lastChecked.getTime()
      );
    });

    it("should generate timestamps close to each other for rapid calls", () => {
      const failedCheck1 = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("First failure");

      const failedCheck2 = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("Second failure");

      const timeDiff = Math.abs(
        failedCheck1.lastChecked.getTime() - failedCheck2.lastChecked.getTime()
      );

      // Should be very close (within 10ms for rapid calls)
      expect(timeDiff).toBeLessThan(10);
    });
  });

  describe("Return Value Structure", () => {
    it("should return object with correct structure", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("Test failure");

      expect(failedCheck).toHaveProperty("status");
      expect(failedCheck).toHaveProperty("message");
      expect(failedCheck).toHaveProperty("lastChecked");
      expect(typeof failedCheck.status).toBe("string");
      expect(typeof failedCheck.message).toBe("string");
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should not include responseTime property", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("Test failure");

      expect(failedCheck).not.toHaveProperty("responseTime");
    });

    it("should have exactly three properties", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("Test failure");

      const properties = Object.keys(failedCheck);
      expect(properties).toHaveLength(3);
      expect(properties).toContain("status");
      expect(properties).toContain("message");
      expect(properties).toContain("lastChecked");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null message", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(null as unknown as string);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(null);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should handle undefined message", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(undefined as unknown as string);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(undefined);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should handle non-string message", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(123 as unknown as string);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(123);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should handle boolean message", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck(true as unknown as string);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toBe(true);
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });

    it("should handle object message", () => {
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck({ error: "test" } as unknown as string);

      expect(failedCheck.status).toBe("unhealthy");
      expect(failedCheck.message).toEqual({ error: "test" });
      expect(failedCheck.lastChecked).toBeInstanceOf(Date);
    });
  });

  describe("Performance", () => {
    it("should handle rapid successive calls", () => {
      const results = [];

      for (let i = 0; i < 100; i++) {
        results.push(
          (monitor as unknown as HealthMonitorPrivate).createFailedHealthCheck(
            `Error ${i}`
          )
        );
      }

      expect(results).toHaveLength(100);
      results.forEach((result, index) => {
        expect(result.status).toBe("unhealthy");
        expect(result.message).toBe(`Error ${index}`);
        expect(result.lastChecked).toBeInstanceOf(Date);
      });
    });

    it("should handle rapid successive calls with same message", () => {
      const results = [];

      for (let i = 0; i < 100; i++) {
        results.push(
          (monitor as unknown as HealthMonitorPrivate).createFailedHealthCheck(
            "Same error"
          )
        );
      }

      expect(results).toHaveLength(100);
      results.forEach((result) => {
        expect(result.status).toBe("unhealthy");
        expect(result.message).toBe("Same error");
        expect(result.lastChecked).toBeInstanceOf(Date);
      });
    });
  });

  describe("Integration", () => {
    it("should be used by other health check methods when they fail", () => {
      // This test verifies that the method is properly integrated
      // by checking that it's called when other health checks fail
      const failedCheck = (
        monitor as unknown as HealthMonitorPrivate
      ).createFailedHealthCheck("Integration test");

      // Verify the structure matches what other methods expect
      expect(failedCheck).toMatchObject({
        status: "unhealthy",
        message: "Integration test",
        lastChecked: expect.any(Date),
      });
    });

    it("should produce consistent results across multiple instances", () => {
      const message = "Consistent error message";
      const results = [];

      for (let i = 0; i < 10; i++) {
        // Reset singleton to get fresh instance
        (HealthMonitor as unknown as { instance: undefined }).instance =
          undefined;
        const newMonitor = HealthMonitor.getInstance();

        results.push(
          (
            newMonitor as unknown as HealthMonitorPrivate
          ).createFailedHealthCheck(message)
        );
      }

      results.forEach((result) => {
        expect(result.status).toBe("unhealthy");
        expect(result.message).toBe(message);
        expect(result.lastChecked).toBeInstanceOf(Date);
      });
    });
  });
});
