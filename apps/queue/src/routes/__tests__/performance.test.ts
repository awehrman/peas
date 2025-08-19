import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestApp } from "../../test-utils/helpers";
import { HttpStatus } from "../../types";
import { databaseOptimizer } from "../../utils/database-optimizer";
import { memoryOptimizer } from "../../utils/memory-optimizer";
import { performanceOptimizer } from "../../utils/performance-optimizer";
// Import the router after mocking
import { performanceRouter } from "../performance";

// Mock the utility modules
vi.mock("../../utils/database-optimizer", () => ({
  databaseOptimizer: {
    getCacheStats: vi.fn(),
    getOptimizedConnectionConfig: vi.fn(),
    cleanupExpiredCache: vi.fn(),
    clearQueryCache: vi.fn(),
  },
}));

vi.mock("../../utils/memory-optimizer", () => ({
  memoryOptimizer: {
    getMemoryReport: vi.fn(),
    optimizeMemory: vi.fn(),
    getMemoryStats: vi.fn(),
    forceGarbageCollection: vi.fn(),
  },
}));

vi.mock("../../utils/performance-optimizer", () => ({
  performanceOptimizer: {
    getPerformanceReport: vi.fn(),
    startProfiling: vi.fn(),
    stopProfiling: vi.fn(),
  },
}));

vi.mock("../../utils/standardized-logger", () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

describe("Performance Router", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
    app.use("/performance", performanceRouter);
  });

  describe("GET /performance/overview", () => {
    it("should return performance overview successfully", async () => {
      const mockPerformanceReport = {
        summary: {
          totalOperations: 100,
          averageDuration: 250,
          slowOperations: 5,
        },
        slowestOperations: [
          { operation: "db_query", duration: 500 },
          { operation: "file_parse", duration: 300 },
        ],
        recommendations: ["Optimize database queries"],
      };

      const mockMemoryReport = {
        current: {
          heapUsed: 1024 * 1024 * 100,
          heapUsedPercentage: 50,
        },
        leakDetection: {
          detected: false,
          severity: "none",
        },
        poolStats: {
          active: 5,
          idle: 10,
        },
        recommendations: ["Monitor memory usage"],
      };

      const mockCacheStats = {
        hitRate: 0.85,
        size: 1000,
        hits: 850,
        misses: 150,
      };

      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockPerformanceReport);
      (
        memoryOptimizer.getMemoryReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockMemoryReport);
      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockCacheStats);

      const response = await request(app).get("/performance/overview");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        performance: {
          summary: mockPerformanceReport.summary,
          slowestOperations: mockPerformanceReport.slowestOperations.slice(
            0,
            5
          ),
          recommendations: mockPerformanceReport.recommendations,
        },
        memory: {
          current: mockMemoryReport.current,
          leakDetection: mockMemoryReport.leakDetection,
          poolStats: mockMemoryReport.poolStats,
          recommendations: mockMemoryReport.recommendations,
        },
        database: {
          cacheStats: mockCacheStats,
          recommendations: [],
        },
        timestamp: expect.any(String),
      });
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it("should handle errors when getting performance overview", async () => {
      const mockError = new Error("Performance overview error");
      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).get("/performance/overview");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to get performance overview",
        message: "Performance overview error",
      });
    });

    it("should handle non-Error objects thrown by performance optimizer", async () => {
      const mockError = "String error";
      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).get("/performance/overview");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to get performance overview",
        message: "String error",
      });
    });
  });

  describe("GET /performance/metrics", () => {
    it("should return performance metrics successfully", async () => {
      const mockPerformanceReport = {
        slowestOperations: [
          { operation: "db_query", duration: 500 },
          { operation: "file_parse", duration: 300 },
        ],
        summary: {
          totalOperations: 100,
          averageDuration: 250,
        },
        recommendations: ["Optimize database queries"],
      };

      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockPerformanceReport);

      const response = await request(app).get("/performance/metrics");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        metrics: mockPerformanceReport.slowestOperations,
        summary: mockPerformanceReport.summary,
        recommendations: mockPerformanceReport.recommendations,
        timestamp: expect.any(String),
      });
    });

    it("should handle errors when getting performance metrics", async () => {
      const mockError = new Error("Metrics error");
      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).get("/performance/metrics");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to get performance metrics",
        message: "Metrics error",
      });
    });

    it("should handle non-Error exceptions when getting performance metrics", async () => {
      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String metrics error";
      });

      const response = await request(app).get("/performance/metrics");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to get performance metrics",
        message: "String metrics error",
      });
    });
  });

  describe("GET /performance/memory", () => {
    it("should return memory data successfully", async () => {
      const mockMemoryReport = {
        current: {
          heapUsed: 1024 * 1024 * 100,
          heapUsedPercentage: 50,
        },
        history: [
          { timestamp: "2023-01-01T00:00:00Z", heapUsed: 1024 * 1024 * 90 },
          { timestamp: "2023-01-01T00:01:00Z", heapUsed: 1024 * 1024 * 100 },
        ],
        leakDetection: {
          detected: false,
          severity: "none",
        },
        poolStats: {
          active: 5,
          idle: 10,
        },
        recommendations: ["Monitor memory usage"],
      };

      (
        memoryOptimizer.getMemoryReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockMemoryReport);

      const response = await request(app).get("/performance/memory");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        current: mockMemoryReport.current,
        history: mockMemoryReport.history.slice(-20),
        leakDetection: mockMemoryReport.leakDetection,
        poolStats: mockMemoryReport.poolStats,
        recommendations: mockMemoryReport.recommendations,
        timestamp: expect.any(String),
      });
    });

    it("should handle errors when getting memory data", async () => {
      const mockError = new Error("Memory data error");
      (
        memoryOptimizer.getMemoryReport as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).get("/performance/memory");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to get memory data",
        message: "Memory data error",
      });
    });

    it("should handle non-Error exceptions when getting memory data", async () => {
      (
        memoryOptimizer.getMemoryReport as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String memory data error";
      });

      const response = await request(app).get("/performance/memory");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to get memory data",
        message: "String memory data error",
      });
    });
  });

  describe("GET /performance/database", () => {
    it("should return database data successfully", async () => {
      const mockCacheStats = {
        hitRate: 0.85,
        size: 1000,
        hits: 850,
        misses: 150,
      };

      const mockConnectionConfig = {
        maxConnections: 10,
        idleTimeout: 30000,
      };

      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockCacheStats);
      (
        databaseOptimizer.getOptimizedConnectionConfig as ReturnType<
          typeof vi.fn
        >
      ).mockReturnValue(mockConnectionConfig);

      const response = await request(app).get("/performance/database");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        cacheStats: mockCacheStats,
        connectionConfig: mockConnectionConfig,
        recommendations: [
          "Monitor query execution times",
          "Review cache hit rates",
          "Consider query optimization for slow queries",
        ],
        timestamp: expect.any(String),
      });
    });

    it("should handle errors when getting database data", async () => {
      const mockError = new Error("Database data error");
      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).get("/performance/database");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to get database data",
        message: "Database data error",
      });
    });

    it("should handle non-Error exceptions when getting database data", async () => {
      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String database data error";
      });

      const response = await request(app).get("/performance/database");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to get database data",
        message: "String database data error",
      });
    });
  });

  describe("POST /performance/optimize", () => {
    it("should optimize memory successfully", async () => {
      const mockMemoryResult = {
        optimized: true,
        memoryFreed: 1024 * 1024 * 50,
      };

      (
        memoryOptimizer.optimizeMemory as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockMemoryResult);

      const response = await request(app)
        .post("/performance/optimize")
        .send({ type: "memory" });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        type: "memory",
        result: mockMemoryResult,
        timestamp: expect.any(String),
      });
      expect(memoryOptimizer.optimizeMemory).toHaveBeenCalledTimes(1);
    });

    it("should optimize database successfully", async () => {
      const mockCacheStats = {
        hitRate: 0.85,
        size: 1000,
      };

      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockCacheStats);

      const response = await request(app)
        .post("/performance/optimize")
        .send({ type: "database" });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        type: "database",
        result: {
          optimized: true,
          actions: ["Cleaned up expired cache entries"],
          cacheStats: mockCacheStats,
        },
        timestamp: expect.any(String),
      });
      expect(databaseOptimizer.cleanupExpiredCache).toHaveBeenCalledTimes(1);
    });

    it("should optimize all systems successfully", async () => {
      const mockMemoryResult = {
        optimized: true,
        memoryFreed: 1024 * 1024 * 50,
      };

      const mockCacheStats = {
        hitRate: 0.85,
        size: 1000,
      };

      (
        memoryOptimizer.optimizeMemory as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockMemoryResult);
      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockCacheStats);

      const response = await request(app)
        .post("/performance/optimize")
        .send({ type: "all" });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        type: "all",
        result: {
          memory: mockMemoryResult,
          database: {
            optimized: true,
            actions: ["Cleaned up expired cache entries"],
            cacheStats: mockCacheStats,
          },
        },
        timestamp: expect.any(String),
      });
      expect(memoryOptimizer.optimizeMemory).toHaveBeenCalledTimes(1);
      expect(databaseOptimizer.cleanupExpiredCache).toHaveBeenCalledTimes(1);
    });

    it("should handle invalid optimization type", async () => {
      const response = await request(app)
        .post("/performance/optimize")
        .send({ type: "invalid" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        error: "Invalid optimization type",
        validTypes: ["memory", "database", "all"],
      });
    });

    it("should handle missing type parameter", async () => {
      const response = await request(app)
        .post("/performance/optimize")
        .send({ type: undefined });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        error: "Invalid optimization type",
        validTypes: ["memory", "database", "all"],
      });
    });

    it("should handle null type parameter", async () => {
      const response = await request(app)
        .post("/performance/optimize")
        .send({ type: null });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        error: "Invalid optimization type",
        validTypes: ["memory", "database", "all"],
      });
    });

    it("should handle empty string type parameter", async () => {
      const response = await request(app)
        .post("/performance/optimize")
        .send({ type: "" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        error: "Invalid optimization type",
        validTypes: ["memory", "database", "all"],
      });
    });

    it("should handle errors during optimization", async () => {
      const mockError = new Error("Optimization error");
      (
        memoryOptimizer.optimizeMemory as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app)
        .post("/performance/optimize")
        .send({ type: "memory" });

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to trigger performance optimization",
        message: "Optimization error",
      });
    });

    it("should handle non-Error exceptions during optimization", async () => {
      (
        memoryOptimizer.optimizeMemory as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String optimization error";
      });

      const response = await request(app)
        .post("/performance/optimize")
        .send({ type: "memory" });

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to trigger performance optimization",
        message: "String optimization error",
      });
    });
  });

  describe("POST /performance/profiling/start", () => {
    it("should start profiling successfully", async () => {
      const response = await request(app).post("/performance/profiling/start");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        message: "Performance profiling started",
        timestamp: expect.any(String),
      });
      expect(performanceOptimizer.startProfiling).toHaveBeenCalledTimes(1);
    });

    it("should handle errors when starting profiling", async () => {
      const mockError = new Error("Profiling start error");
      (
        performanceOptimizer.startProfiling as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).post("/performance/profiling/start");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to start performance profiling",
        message: "Profiling start error",
      });
    });

    it("should handle non-Error exceptions when starting profiling", async () => {
      (
        performanceOptimizer.startProfiling as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String profiling error";
      });

      const response = await request(app).post("/performance/profiling/start");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to start performance profiling",
        message: "String profiling error",
      });
    });
  });

  describe("POST /performance/profiling/stop", () => {
    it("should stop profiling successfully", async () => {
      const response = await request(app).post("/performance/profiling/stop");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        message: "Performance profiling stopped",
        timestamp: expect.any(String),
      });
      expect(performanceOptimizer.stopProfiling).toHaveBeenCalledTimes(1);
    });

    it("should handle errors when stopping profiling", async () => {
      const mockError = new Error("Profiling stop error");
      (
        performanceOptimizer.stopProfiling as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).post("/performance/profiling/stop");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to stop performance profiling",
        message: "Profiling stop error",
      });
    });

    it("should handle non-Error exceptions when stopping profiling", async () => {
      (
        performanceOptimizer.stopProfiling as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String stop profiling error";
      });

      const response = await request(app).post("/performance/profiling/stop");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to stop performance profiling",
        message: "String stop profiling error",
      });
    });
  });

  describe("POST /performance/memory/gc", () => {
    it("should force garbage collection successfully", async () => {
      const mockBeforeGC = {
        heapUsed: 1024 * 1024 * 100,
        heapTotal: 1024 * 1024 * 200,
      };

      const mockAfterGC = {
        heapUsed: 1024 * 1024 * 80,
        heapTotal: 1024 * 1024 * 200,
      };

      (memoryOptimizer.getMemoryStats as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockBeforeGC)
        .mockReturnValueOnce(mockAfterGC);

      const response = await request(app).post("/performance/memory/gc");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        message: "Garbage collection completed",
        memorySaved: 1024 * 1024 * 20, // 100 - 80 = 20 MB
        before: mockBeforeGC,
        after: mockAfterGC,
        timestamp: expect.any(String),
      });
      expect(memoryOptimizer.getMemoryStats).toHaveBeenCalledTimes(2);
      expect(memoryOptimizer.forceGarbageCollection).toHaveBeenCalledTimes(1);
    });

    it("should handle errors when forcing garbage collection", async () => {
      const mockError = new Error("GC error");
      (
        memoryOptimizer.getMemoryStats as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).post("/performance/memory/gc");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to force garbage collection",
        message: "GC error",
      });
    });

    it("should handle non-Error exceptions when forcing garbage collection", async () => {
      (
        memoryOptimizer.getMemoryStats as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String GC error";
      });

      const response = await request(app).post("/performance/memory/gc");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to force garbage collection",
        message: "String GC error",
      });
    });
  });

  describe("POST /performance/cache/clear", () => {
    it("should clear cache successfully", async () => {
      const response = await request(app).post("/performance/cache/clear");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        message: "Database query cache cleared",
        timestamp: expect.any(String),
      });
      expect(databaseOptimizer.clearQueryCache).toHaveBeenCalledTimes(1);
    });

    it("should handle errors when clearing cache", async () => {
      const mockError = new Error("Cache clear error");
      (
        databaseOptimizer.clearQueryCache as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).post("/performance/cache/clear");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to clear database cache",
        message: "Cache clear error",
      });
    });

    it("should handle non-Error exceptions when clearing cache", async () => {
      (
        databaseOptimizer.clearQueryCache as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String cache clear error";
      });

      const response = await request(app).post("/performance/cache/clear");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        error: "Failed to clear database cache",
        message: "String cache clear error",
      });
    });
  });

  describe("GET /performance/health", () => {
    it("should return healthy status when all metrics are good", async () => {
      const mockPerformanceReport = {
        summary: {
          slowOperations: 2,
          averageDuration: 200, // Less than 500
        },
      };

      const mockMemoryReport = {
        current: {
          heapUsedPercentage: 60, // Less than 80
        },
        leakDetection: {
          detected: false,
          severity: "none",
        },
      };

      const mockCacheStats = {
        hitRate: 0.85, // Greater than 0.7
        size: 1000,
      };

      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockPerformanceReport);
      (
        memoryOptimizer.getMemoryReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockMemoryReport);
      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockCacheStats);

      const response = await request(app).get("/performance/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "healthy",
        issues: [],
        performance: {
          slowOperations: 2,
          averageDuration: 200,
        },
        memory: {
          heapUsedPercentage: 60,
          leakDetected: false,
          leakSeverity: "none",
        },
        database: {
          cacheHitRate: 0.85,
          cacheSize: 1000,
        },
        timestamp: expect.any(String),
      });
    });

    it("should return degraded status when some issues are detected", async () => {
      const mockPerformanceReport = {
        summary: {
          slowOperations: 2,
          averageDuration: 600, // Greater than 500
        },
      };

      const mockMemoryReport = {
        current: {
          heapUsedPercentage: 85, // Greater than 80
        },
        leakDetection: {
          detected: false,
          severity: "none",
        },
      };

      const mockCacheStats = {
        hitRate: 0.85,
        size: 1000,
      };

      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockPerformanceReport);
      (
        memoryOptimizer.getMemoryReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockMemoryReport);
      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockCacheStats);

      const response = await request(app).get("/performance/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe("degraded");
      expect(response.body.issues).toContain("High average operation duration");
      expect(response.body.issues).toContain("High memory usage");
      expect(response.body.issues).toHaveLength(2);
    });

    it("should return unhealthy status when many issues are detected", async () => {
      const mockPerformanceReport = {
        summary: {
          slowOperations: 2,
          averageDuration: 600,
        },
      };

      const mockMemoryReport = {
        current: {
          heapUsedPercentage: 85,
        },
        leakDetection: {
          detected: true,
          severity: "high",
        },
      };

      const mockCacheStats = {
        hitRate: 0.5, // Less than 0.7
        size: 1000,
      };

      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockPerformanceReport);
      (
        memoryOptimizer.getMemoryReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockMemoryReport);
      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockCacheStats);

      const response = await request(app).get("/performance/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe("unhealthy");
      expect(response.body.issues).toContain("High average operation duration");
      expect(response.body.issues).toContain("High memory usage");
      expect(response.body.issues).toContain("Memory leak detected");
      expect(response.body.issues).toContain("Low cache hit rate");
      expect(response.body.issues).toHaveLength(4);
    });

    it("should handle errors when getting performance health", async () => {
      const mockError = new Error("Health check error");
      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw mockError;
      });

      const response = await request(app).get("/performance/health");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        status: "error",
        error: "Failed to get performance health",
        message: "Health check error",
      });
    });

    it("should handle non-Error exceptions when getting performance health", async () => {
      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockImplementation(() => {
        throw "String health check error";
      });

      const response = await request(app).get("/performance/health");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        status: "error",
        error: "Failed to get performance health",
        message: "String health check error",
      });
    });

    it("should handle edge case with exact threshold values", async () => {
      const mockPerformanceReport = {
        summary: {
          slowOperations: 2,
          averageDuration: 500, // Exactly 500 (should NOT trigger issue since it's > 500, not >= 500)
        },
      };

      const mockMemoryReport = {
        current: {
          heapUsedPercentage: 80, // Exactly 80 (should NOT trigger issue since it's > 80, not >= 80)
        },
        leakDetection: {
          detected: false,
          severity: "none",
        },
      };

      const mockCacheStats = {
        hitRate: 0.7, // Exactly 0.7 (should NOT trigger issue since it's < 0.7, not <= 0.7)
        size: 1000,
      };

      (
        performanceOptimizer.getPerformanceReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockPerformanceReport);
      (
        memoryOptimizer.getMemoryReport as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockMemoryReport);
      (
        databaseOptimizer.getCacheStats as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockCacheStats);

      const response = await request(app).get("/performance/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.status).toBe("healthy"); // No issues should be triggered
      expect(response.body.issues).toHaveLength(0);
    });
  });

  describe("Router Configuration", () => {
    it("should have all expected routes configured", () => {
      const routes = performanceRouter.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route?.path,
          method: Object.keys(
            (layer.route as { methods?: Record<string, boolean> })?.methods ||
              {}
          ).find(
            (key) =>
              (layer.route as { methods?: Record<string, boolean> })?.methods?.[
                key
              ]
          ),
        }));

      expect(routes).toEqual([
        { path: "/overview", method: "get" },
        { path: "/metrics", method: "get" },
        { path: "/memory", method: "get" },
        { path: "/database", method: "get" },
        { path: "/optimize", method: "post" },
        { path: "/profiling/start", method: "post" },
        { path: "/profiling/stop", method: "post" },
        { path: "/memory/gc", method: "post" },
        { path: "/cache/clear", method: "post" },
        { path: "/health", method: "get" },
      ]);
    });

    it("should handle 404 for non-existent routes", async () => {
      const response = await request(app).get("/performance/nonexistent");

      expect(response.status).toBe(404);
    });
  });
});
