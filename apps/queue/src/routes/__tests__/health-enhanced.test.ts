import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ManagerFactory } from "../../config/factory";
import { systemMonitor } from "../../monitoring/system-monitor";
import {
  createMockCacheManager,
  createMockHealthMonitor,
  createTestApp,
  createTestEnvironment,
} from "../../test-utils/test-utils";
import { HttpStatus } from "../../types";
import { healthEnhancedRouter } from "../health-enhanced";

// Mock dependencies
vi.mock("../../config/factory", () => ({
  ManagerFactory: {
    createHealthMonitor: vi.fn(),
    createCacheManager: vi.fn(),
  },
}));

vi.mock("../../monitoring/system-monitor", () => ({
  systemMonitor: {
    generateHealthReport: vi.fn(),
    getSystemMetrics: vi.fn(),
    getAllJobMetrics: vi.fn(),
    getAllQueueMetrics: vi.fn(),
    getQueueMetrics: vi.fn(),
    getQueueJobMetrics: vi.fn(),
  },
}));

describe("Health Enhanced Router", () => {
  let app: express.Application;
  let testEnv: ReturnType<typeof createTestEnvironment>;
  let mockHealthMonitor: ReturnType<typeof createMockHealthMonitor>;
  let mockCacheManager: ReturnType<typeof createMockCacheManager>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create test app
    app = createTestApp();
    app.use("/health", healthEnhancedRouter);

    // Setup test environment
    testEnv = createTestEnvironment();
    testEnv.setEnv({
      NODE_ENV: "test",
      npm_package_version: "1.2.3",
    });

    // Setup mocks
    mockHealthMonitor = createMockHealthMonitor();
    mockCacheManager = createMockCacheManager();

    // Setup default mock implementations
    (
      ManagerFactory.createHealthMonitor as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockHealthMonitor);
    (
      ManagerFactory.createCacheManager as ReturnType<typeof vi.fn>
    ).mockReturnValue(mockCacheManager);
  });

  afterEach(() => {
    testEnv.restore();
  });

  describe("GET /health", () => {
    it("should return healthy status when system is healthy", async () => {
      const mockHealthReport = {
        overallStatus: "healthy" as const,
        timestamp: new Date("2023-01-01T00:00:00Z"),
        systemHealth: { status: "healthy", details: "All systems operational" },
        jobHealth: { status: "healthy", details: "Jobs processing normally" },
        queueHealth: {
          status: "healthy",
          details: "Queues functioning properly",
        },
        cacheHealth: { status: "healthy", details: "Cache operational" },
        performanceMetrics: {
          responseTime: 150,
          throughput: 100,
          errorRate: 0.01,
        },
        recommendations: ["System is performing well"],
      };

      (
        systemMonitor.generateHealthReport as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockHealthReport);

      const response = await request(app).get("/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "healthy",
        timestamp: "2023-01-01T00:00:00.000Z",
        uptime: expect.any(Number),
        version: "1.2.3",
        environment: "test",
        health: {
          system: { status: "healthy", details: "All systems operational" },
          job: { status: "healthy", details: "Jobs processing normally" },
          queue: { status: "healthy", details: "Queues functioning properly" },
          cache: { status: "healthy", details: "Cache operational" },
        },
        performance: {
          responseTime: 150,
          throughput: 100,
          errorRate: 0.01,
        },
        recommendations: ["System is performing well"],
      });
    });

    it("should return degraded status when system is degraded", async () => {
      const mockHealthReport = {
        overallStatus: "degraded" as const,
        timestamp: new Date("2023-01-01T00:00:00Z"),
        systemHealth: { status: "degraded", details: "Some issues detected" },
        jobHealth: { status: "healthy", details: "Jobs processing normally" },
        queueHealth: { status: "degraded", details: "Queue delays detected" },
        cacheHealth: { status: "healthy", details: "Cache operational" },
        performanceMetrics: {
          responseTime: 500,
          throughput: 50,
          errorRate: 0.05,
        },
        recommendations: ["Monitor queue performance"],
      };

      (
        systemMonitor.generateHealthReport as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockHealthReport);

      const response = await request(app).get("/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe("degraded");
    });

    it("should return unhealthy status when system is unhealthy", async () => {
      const mockHealthReport = {
        overallStatus: "unhealthy" as const,
        timestamp: new Date("2023-01-01T00:00:00Z"),
        systemHealth: {
          status: "unhealthy",
          details: "Critical system failure",
        },
        jobHealth: { status: "unhealthy", details: "Jobs failing" },
        queueHealth: { status: "unhealthy", details: "Queue system down" },
        cacheHealth: { status: "unhealthy", details: "Cache unavailable" },
        performanceMetrics: {
          responseTime: 2000,
          throughput: 10,
          errorRate: 0.25,
        },
        recommendations: ["Immediate intervention required"],
      };

      (
        systemMonitor.generateHealthReport as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockHealthReport);

      const response = await request(app).get("/health");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body.status).toBe("unhealthy");
    });

    it("should handle errors when health check fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Health check failed");
      (
        systemMonitor.generateHealthReport as ReturnType<typeof vi.fn>
      ).mockRejectedValue(error);

      const response = await request(app).get("/health");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body).toEqual({
        status: "unhealthy",
        timestamp: expect.any(String),
        error: "Health check failed",
        message: "Health check failed",
      });
      expect(consoleSpy).toHaveBeenCalledWith("Health check failed:", error);

      consoleSpy.mockRestore();
    });

    it("should handle non-Error objects in catch block", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        systemMonitor.generateHealthReport as ReturnType<typeof vi.fn>
      ).mockRejectedValue("String error");

      const response = await request(app).get("/health");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body.message).toBe("Unknown error");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Health check failed:",
        "String error"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("GET /health/ready", () => {
    it("should return ready status when all services are healthy", async () => {
      (
        mockHealthMonitor.isHealthy as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true);
      (mockCacheManager.isReady as ReturnType<typeof vi.fn>).mockReturnValue(
        true
      );

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "ready",
        timestamp: expect.any(String),
        checks: {
          health: true,
          cache: true,
        },
      });
    });

    it("should return not_ready status when health check fails", async () => {
      (
        mockHealthMonitor.isHealthy as ReturnType<typeof vi.fn>
      ).mockResolvedValue(false);
      (mockCacheManager.isReady as ReturnType<typeof vi.fn>).mockReturnValue(
        true
      );

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body).toEqual({
        status: "not_ready",
        timestamp: expect.any(String),
        checks: {
          health: false,
          cache: true,
        },
        message: "Service is not ready to receive traffic",
      });
    });

    it("should return not_ready status when cache is not ready", async () => {
      (
        mockHealthMonitor.isHealthy as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true);
      (mockCacheManager.isReady as ReturnType<typeof vi.fn>).mockReturnValue(
        false
      );

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body.status).toBe("not_ready");
      expect(response.body.checks.cache).toBe(false);
    });

    it("should handle errors when readiness check fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Readiness check failed");
      (
        mockHealthMonitor.isHealthy as ReturnType<typeof vi.fn>
      ).mockRejectedValue(error);

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body).toEqual({
        status: "not_ready",
        timestamp: expect.any(String),
        error: "Readiness check failed",
        message: "Readiness check failed",
      });
      expect(consoleSpy).toHaveBeenCalledWith("Readiness check failed:", error);

      consoleSpy.mockRestore();
    });

    it("should handle non-Error objects in readiness check", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        mockHealthMonitor.isHealthy as ReturnType<typeof vi.fn>
      ).mockRejectedValue("String error");

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body.message).toBe("Unknown error");

      consoleSpy.mockRestore();
    });
  });

  describe("GET /health/live", () => {
    it("should return alive status when memory usage is healthy", async () => {
      // Mock process.memoryUsage to return healthy values
      const originalMemoryUsage = process.memoryUsage;
      const mockMemoryUsage = vi.fn().mockReturnValue({
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 10 * 1024 * 1024, // 10MB
        rss: 200 * 1024 * 1024, // 200MB
      });
      process.memoryUsage =
        mockMemoryUsage as unknown as typeof process.memoryUsage;

      const response = await request(app).get("/health/live");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "alive",
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: {
          heapUsed: 52428800,
          heapTotal: 104857600,
          external: 10485760,
          rss: 209715200,
        },
      });

      // Restore original
      process.memoryUsage = originalMemoryUsage;
    });

    it("should return unhealthy status when memory usage is too high", async () => {
      // Mock process.memoryUsage to return unhealthy values
      const originalMemoryUsage = process.memoryUsage;
      const mockMemoryUsage = vi.fn().mockReturnValue({
        heapUsed: 2 * 1024 * 1024 * 1024, // 2GB (over 1GB limit)
        heapTotal: 3 * 1024 * 1024 * 1024, // 3GB
        external: 100 * 1024 * 1024, // 100MB
        rss: 2.5 * 1024 * 1024 * 1024, // 2.5GB
      });
      process.memoryUsage =
        mockMemoryUsage as unknown as typeof process.memoryUsage;

      const response = await request(app).get("/health/live");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body).toEqual({
        status: "unhealthy",
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: {
          heapUsed: 2147483648,
          heapTotal: 3221225472,
          external: 104857600,
          rss: 2684354560,
        },
        message: "Service is not healthy",
      });

      // Restore original
      process.memoryUsage = originalMemoryUsage;
    });

    it("should handle errors when liveness check fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Liveness check failed");

      // Mock process.memoryUsage to throw an error
      const originalMemoryUsage = process.memoryUsage;
      const mockMemoryUsage = vi.fn().mockImplementation(() => {
        throw error;
      });
      process.memoryUsage =
        mockMemoryUsage as unknown as typeof process.memoryUsage;

      const response = await request(app).get("/health/live");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body).toEqual({
        status: "unhealthy",
        timestamp: expect.any(String),
        error: "Liveness check failed",
        message: "Liveness check failed",
      });
      expect(consoleSpy).toHaveBeenCalledWith("Liveness check failed:", error);

      // Restore original
      process.memoryUsage = originalMemoryUsage;
      consoleSpy.mockRestore();
    });

    it("should handle non-Error objects in liveness check", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock process.memoryUsage to throw a string
      const originalMemoryUsage = process.memoryUsage;
      const mockMemoryUsage = vi.fn().mockImplementation(() => {
        throw "String error";
      });
      process.memoryUsage =
        mockMemoryUsage as unknown as typeof process.memoryUsage;

      const response = await request(app).get("/health/live");

      expect(response.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(response.body.message).toBe("Unknown error");

      // Restore original
      process.memoryUsage = originalMemoryUsage;
      consoleSpy.mockRestore();
    });
  });

  describe("GET /health/components/:component", () => {
    it("should return component health for valid component", async () => {
      const mockComponentHealth = {
        status: "healthy",
        details: "Database is operational",
        metrics: { connections: 10, responseTime: 50 },
      };

      (
        mockHealthMonitor.getComponentHealth as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockComponentHealth);

      const response = await request(app).get("/health/components/database");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        component: "database",
        timestamp: expect.any(String),
        health: mockComponentHealth,
      });
      expect(mockHealthMonitor.getComponentHealth).toHaveBeenCalledWith(
        "database"
      );
    });

    it("should handle errors when component health check fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Component health check failed");
      (
        mockHealthMonitor.getComponentHealth as ReturnType<typeof vi.fn>
      ).mockRejectedValue(error);

      const response = await request(app).get("/health/components/redis");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        component: "redis",
        timestamp: expect.any(String),
        error: "Component health check failed",
        message: "Component health check failed",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Component health check failed for redis:",
        error
      );

      consoleSpy.mockRestore();
    });

    it("should handle non-Error objects in component health check", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        mockHealthMonitor.getComponentHealth as ReturnType<typeof vi.fn>
      ).mockRejectedValue("String error");

      const response = await request(app).get("/health/components/queues");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBe("Unknown error");

      consoleSpy.mockRestore();
    });
  });

  describe("GET /health/metrics", () => {
    it("should return system metrics successfully", async () => {
      const mockSystemMetrics = {
        cpu: { usage: 25.5, load: [1.2, 1.1, 0.9] },
        memory: { used: 512, total: 1024, percentage: 50 },
        uptime: 3600,
      };

      const mockJobMetrics = [
        {
          id: "job1",
          queueName: "default",
          status: "completed",
          duration: 1000,
        },
        { id: "job2", queueName: "priority", status: "failed", duration: 500 },
        {
          id: "job3",
          queueName: "default",
          status: "completed",
          duration: 1500,
        },
      ];

      const mockQueueMetrics = [
        { name: "default", waiting: 5, active: 2, completed: 100, failed: 3 },
        { name: "priority", waiting: 1, active: 1, completed: 50, failed: 1 },
      ];

      (
        systemMonitor.getSystemMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockSystemMetrics);
      (
        systemMonitor.getAllJobMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockJobMetrics);
      (
        systemMonitor.getAllQueueMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockQueueMetrics);

      const response = await request(app).get("/health/metrics");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        timestamp: expect.any(String),
        system: mockSystemMetrics,
        jobs: {
          total: 3,
          recent: mockJobMetrics,
          byQueue: {
            default: 2,
            priority: 1,
          },
        },
        queues: mockQueueMetrics,
      });
    });

    it("should handle errors when metrics collection fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Metrics collection failed");
      (
        systemMonitor.getSystemMetrics as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw error;
      });

      const response = await request(app).get("/health/metrics");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        timestamp: expect.any(String),
        error: "Metrics collection failed",
        message: "Metrics collection failed",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Metrics endpoint failed:",
        error
      );

      consoleSpy.mockRestore();
    });

    it("should handle non-Error objects in metrics collection", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        systemMonitor.getSystemMetrics as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String error";
      });

      const response = await request(app).get("/health/metrics");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body.message).toBe("Unknown error");

      consoleSpy.mockRestore();
    });
  });

  describe("GET /health/queues/:queueName", () => {
    it("should return healthy queue status for low failure rate", async () => {
      const mockQueueMetrics = {
        name: "test-queue",
        jobCount: 100,
        completedCount: 95,
        failedCount: 2, // 2% failure rate
        waitingCount: 3,
        activeCount: 0,
      };

      const mockJobMetrics = [
        { id: "job1", status: "completed", duration: 1000 },
        { id: "job2", status: "completed", duration: 1500 },
        { id: "job3", status: "failed", duration: 500 },
      ];

      (
        systemMonitor.getQueueMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockQueueMetrics);
      (
        systemMonitor.getQueueJobMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockJobMetrics);

      const response = await request(app).get("/health/queues/test-queue");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        queueName: "test-queue",
        timestamp: expect.any(String),
        status: "healthy",
        metrics: mockQueueMetrics,
        recentJobs: mockJobMetrics,
        failureRate: 2, // 2%
      });
    });

    it("should return degraded queue status for moderate failure rate", async () => {
      const mockQueueMetrics = {
        name: "test-queue",
        jobCount: 100,
        completedCount: 80,
        failedCount: 15, // 15% failure rate
        waitingCount: 5,
        activeCount: 0,
      };

      (
        systemMonitor.getQueueMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockQueueMetrics);
      (
        systemMonitor.getQueueJobMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue([]);

      const response = await request(app).get("/health/queues/test-queue");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe("degraded");
      expect(response.body.failureRate).toBe(15);
    });

    it("should return unhealthy queue status for high failure rate", async () => {
      const mockQueueMetrics = {
        name: "test-queue",
        jobCount: 100,
        completedCount: 60,
        failedCount: 30, // 30% failure rate
        waitingCount: 10,
        activeCount: 0,
      };

      (
        systemMonitor.getQueueMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockQueueMetrics);
      (
        systemMonitor.getQueueJobMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue([]);

      const response = await request(app).get("/health/queues/test-queue");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe("unhealthy");
      expect(response.body.failureRate).toBe(30);
    });

    it("should return 404 when queue is not found", async () => {
      (
        systemMonitor.getQueueMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue(null);

      const response = await request(app).get(
        "/health/queues/nonexistent-queue"
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        queueName: "nonexistent-queue",
        timestamp: expect.any(String),
        error: "Queue not found",
      });
    });

    it("should handle division by zero when jobCount is 0", async () => {
      const mockQueueMetrics = {
        name: "test-queue",
        jobCount: 0,
        completedCount: 0,
        failedCount: 0,
        waitingCount: 0,
        activeCount: 0,
      };

      (
        systemMonitor.getQueueMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockQueueMetrics);
      (
        systemMonitor.getQueueJobMetrics as ReturnType<typeof vi.fn>
      ).mockReturnValue([]);

      const response = await request(app).get("/health/queues/test-queue");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.failureRate).toBe(0); // 0 / Math.max(0, 1) = 0
    });

    it("should handle errors when queue health check fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const error = new Error("Queue health check failed");
      (
        systemMonitor.getQueueMetrics as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw error;
      });

      const response = await request(app).get("/health/queues/test-queue");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        queueName: "test-queue",
        timestamp: expect.any(String),
        error: "Queue health check failed",
        message: "Queue health check failed",
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Queue health check failed for test-queue:",
        error
      );

      consoleSpy.mockRestore();
    });

    it("should handle non-Error objects in queue health check", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        systemMonitor.getQueueMetrics as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String error";
      });

      const response = await request(app).get("/health/queues/test-queue");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Unknown error");

      consoleSpy.mockRestore();
    });
  });
});
