import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HealthMonitor } from "../../health-monitor";
import { ErrorType, ErrorSeverity } from "../../../types";
import type { Prisma } from "@prisma/client";

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
  checkDatabaseHealth: () => Promise<{
    status: string;
    message: string;
    responseTime?: number;
    lastChecked: Date;
  }>;
}

describe("HealthMonitor.checkDatabaseHealth", () => {
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

  describe("Successful Database Checks", () => {
    it("should return healthy status for fast database response", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { "1": 1 },
      ] as unknown as Prisma.PrismaPromise<unknown>);
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("responding normally");
      expect(health.responseTime).toBeDefined();
      expect(health.responseTime).toBeLessThan(1000);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return healthy status for very fast response", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { "1": 1 },
      ] as unknown as Prisma.PrismaPromise<unknown>);
      vi.mocked(prisma.note.count).mockResolvedValue(0);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("responding normally");
      expect(health.responseTime).toBeDefined();
      expect(health.responseTime).toBeLessThan(1000);
    });

    it("should handle different query results", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { test: "value" },
      ] as unknown as Prisma.PrismaPromise<unknown>);
      vi.mocked(prisma.note.count).mockResolvedValue(999);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("responding normally");
      expect(health.responseTime).toBeDefined();
    });

    it("should handle empty query results", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockResolvedValue(
        [] as unknown as Prisma.PrismaPromise<unknown>
      );
      vi.mocked(prisma.note.count).mockResolvedValue(0);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("healthy");
      expect(health.message).toContain("responding normally");
      expect(health.responseTime).toBeDefined();
    });
  });

  describe("Degraded Performance", () => {
    it("should return degraded status for slow database response", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ "1": 1 }] as unknown), 1100)
          ) as unknown as Prisma.PrismaPromise<unknown>
      );
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("degraded");
      expect(health.message).toContain("slow to respond");
      expect(health.responseTime).toBeGreaterThanOrEqual(1000);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return degraded status for response time exactly at threshold", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ "1": 1 }] as unknown), 1000)
          ) as unknown as Prisma.PrismaPromise<unknown>
      );
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("degraded");
      expect(health.message).toContain("slow to respond");
      expect(health.responseTime).toBeGreaterThanOrEqual(1000);
    });

    it("should return degraded status for very slow response", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ "1": 1 }] as unknown), 5000)
          ) as unknown as Prisma.PrismaPromise<unknown>
      );
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("degraded");
      expect(health.message).toContain("slow to respond");
      expect(health.responseTime).toBeGreaterThanOrEqual(5000);
    }, 10000); // Increase timeout to 10 seconds
  });

  describe("Database Errors", () => {
    it("should return unhealthy status for database connection errors", async () => {
      const { prisma } = await import("../../../config/database");
      const { ErrorHandler } = await import("../../error-handler");

      vi.mocked(prisma.$queryRaw).mockRejectedValue(
        new Error("Database connection failed")
      );
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          if (_type === ErrorType.DATABASE_ERROR) {
            return {
              type: ErrorType.DATABASE_ERROR,
              severity: ErrorSeverity.HIGH,
              message: "Database connection failed",
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
      expect(health.lastChecked).toBeInstanceOf(Date);
      expect(health.responseTime).toBeUndefined();
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should return unhealthy status for query errors", async () => {
      const { prisma } = await import("../../../config/database");
      const { ErrorHandler } = await import("../../error-handler");

      vi.mocked(prisma.$queryRaw).mockRejectedValue(
        new Error("SQL syntax error")
      );
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "SQL syntax error",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.message).toContain("SQL syntax error");
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should return unhealthy status for note count errors", async () => {
      const { prisma } = await import("../../../config/database");
      const { ErrorHandler } = await import("../../error-handler");

      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { "1": 1 },
      ] as unknown as Prisma.PrismaPromise<unknown>);
      vi.mocked(prisma.note.count).mockRejectedValue(
        new Error("Table does not exist")
      );
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Table does not exist",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.message).toContain("Table does not exist");
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", async () => {
      const { prisma } = await import("../../../config/database");
      const { ErrorHandler } = await import("../../error-handler");

      vi.mocked(prisma.$queryRaw).mockRejectedValue("String error");
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "String error",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.message).toContain("String error");
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle null exceptions", async () => {
      const { prisma } = await import("../../../config/database");
      const { ErrorHandler } = await import("../../error-handler");

      vi.mocked(prisma.$queryRaw).mockRejectedValue(null);
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "null",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.message).toContain("null");
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });

    it("should handle undefined exceptions", async () => {
      const { prisma } = await import("../../../config/database");
      const { ErrorHandler } = await import("../../error-handler");

      vi.mocked(prisma.$queryRaw).mockRejectedValue(undefined);
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "undefined",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.message).toContain("undefined");
      expect(ErrorHandler.createJobError).toHaveBeenCalled();
      expect(ErrorHandler.logError).toHaveBeenCalled();
    });
  });

  describe("Error Handler Integration", () => {
    it("should call ErrorHandler.createJobError with correct parameters", async () => {
      const { prisma } = await import("../../../config/database");
      const { ErrorHandler } = await import("../../error-handler");

      const dbError = new Error("Database connection failed");
      vi.mocked(prisma.$queryRaw).mockRejectedValue(dbError);
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Database connection failed",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      await (monitor as unknown as HealthMonitorPrivate).checkDatabaseHealth();

      expect(ErrorHandler.createJobError).toHaveBeenCalledWith(
        dbError,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH,
        { operation: "health_check" }
      );
    });

    it("should call ErrorHandler.logError with the created job error", async () => {
      const { prisma } = await import("../../../config/database");
      const { ErrorHandler } = await import("../../error-handler");

      const mockJobError = {
        type: ErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
        message: "Database connection failed",
        timestamp: new Date(),
      };

      vi.mocked(prisma.$queryRaw).mockRejectedValue(
        new Error("Database connection failed")
      );
      vi.mocked(ErrorHandler.createJobError).mockReturnValue(mockJobError);
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      await (monitor as unknown as HealthMonitorPrivate).checkDatabaseHealth();

      expect(ErrorHandler.logError).toHaveBeenCalledWith(mockJobError);
    });
  });

  describe("Response Time Calculation", () => {
    it("should calculate response time correctly for fast queries", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { "1": 1 },
      ] as unknown as Prisma.PrismaPromise<unknown>);
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      const startTime = Date.now();
      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();
      const endTime = Date.now();

      expect(health.responseTime).toBeDefined();
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.responseTime).toBeLessThanOrEqual(endTime - startTime + 10); // Allow some tolerance
    });

    it("should calculate response time correctly for slow queries", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ "1": 1 }] as unknown), 100)
          ) as unknown as Prisma.PrismaPromise<unknown>
      );
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health.responseTime).toBeDefined();
      expect(health.responseTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe("Return Value Structure", () => {
    it("should return health check with correct structure for success", async () => {
      const { prisma } = await import("../../../config/database");
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { "1": 1 },
      ] as unknown as Prisma.PrismaPromise<unknown>);
      vi.mocked(prisma.note.count).mockResolvedValue(10);

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

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
      const { prisma } = await import("../../../config/database");
      const { ErrorHandler } = await import("../../error-handler");

      vi.mocked(prisma.$queryRaw).mockRejectedValue(
        new Error("Database connection failed")
      );
      vi.mocked(ErrorHandler.createJobError).mockImplementation(
        (
          _err: string | Error,
          _type?: ErrorType,
          _severity?: ErrorSeverity
        ) => {
          return {
            type: ErrorType.DATABASE_ERROR,
            severity: ErrorSeverity.HIGH,
            message: "Database connection failed",
            timestamp: new Date(),
          };
        }
      );
      vi.mocked(ErrorHandler.logError).mockImplementation(() => {});

      const health = await (
        monitor as unknown as HealthMonitorPrivate
      ).checkDatabaseHealth();

      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("message");
      expect(health).toHaveProperty("lastChecked");
      expect(health).not.toHaveProperty("responseTime");
      expect(typeof health.status).toBe("string");
      expect(typeof health.message).toBe("string");
      expect(health.lastChecked).toBeInstanceOf(Date);
    });
  });
});
