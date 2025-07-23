import { Router } from "express";

import { HttpStatus } from "../types";
import { databaseOptimizer } from "../utils/database-optimizer";
import { memoryOptimizer } from "../utils/memory-optimizer";
import { performanceOptimizer } from "../utils/performance-optimizer";
import { createLogger } from "../utils/standardized-logger";

const logger = createLogger("PerformanceRoutes");
export const performanceRouter = Router();

// ============================================================================
// PERFORMANCE MONITORING ROUTES
// ============================================================================

/**
 * GET /performance/overview
 * Get overall performance overview
 */
performanceRouter.get("/overview", async (req, res) => {
  try {
    const performanceReport = performanceOptimizer.getPerformanceReport();
    const memoryReport = memoryOptimizer.getMemoryReport();
    const cacheStats = databaseOptimizer.getCacheStats();

    const overview = {
      performance: {
        summary: performanceReport.summary,
        slowestOperations: performanceReport.slowestOperations.slice(0, 5),
        recommendations: performanceReport.recommendations,
      },
      memory: {
        current: memoryReport.current,
        leakDetection: memoryReport.leakDetection,
        poolStats: memoryReport.poolStats,
        recommendations: memoryReport.recommendations,
      },
      database: {
        cacheStats,
        recommendations: [],
      },
      timestamp: new Date().toISOString(),
    };

    res.status(HttpStatus.OK).json(overview);
  } catch (error) {
    logger.error("Failed to get performance overview", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Failed to get performance overview",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /performance/metrics
 * Get detailed performance metrics
 */
performanceRouter.get("/metrics", async (req, res) => {
  try {
    const performanceReport = performanceOptimizer.getPerformanceReport();

    res.status(HttpStatus.OK).json({
      metrics: performanceReport.slowestOperations,
      summary: performanceReport.summary,
      recommendations: performanceReport.recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get performance metrics", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Failed to get performance metrics",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /performance/memory
 * Get memory usage and optimization data
 */
performanceRouter.get("/memory", async (req, res) => {
  try {
    const memoryReport = memoryOptimizer.getMemoryReport();

    res.status(HttpStatus.OK).json({
      current: memoryReport.current,
      history: memoryReport.history.slice(-20), // Last 20 entries
      leakDetection: memoryReport.leakDetection,
      poolStats: memoryReport.poolStats,
      recommendations: memoryReport.recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get memory data", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Failed to get memory data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /performance/database
 * Get database optimization data
 */
performanceRouter.get("/database", async (req, res) => {
  try {
    const cacheStats = databaseOptimizer.getCacheStats();

    res.status(HttpStatus.OK).json({
      cacheStats,
      connectionConfig: databaseOptimizer.getOptimizedConnectionConfig(),
      recommendations: [
        "Monitor query execution times",
        "Review cache hit rates",
        "Consider query optimization for slow queries",
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get database data", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Failed to get database data",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /performance/optimize
 * Trigger performance optimization
 */
performanceRouter.post("/optimize", async (req, res) => {
  try {
    const { type } = req.body as { type: string };
    let result: Record<string, unknown> = {};

    switch (type) {
      case "memory":
        result = memoryOptimizer.optimizeMemory();
        break;
      case "database":
        databaseOptimizer.cleanupExpiredCache();
        result = {
          optimized: true,
          actions: ["Cleaned up expired cache entries"],
          cacheStats: databaseOptimizer.getCacheStats(),
        };
        break;
      case "all": {
        const memoryResult = memoryOptimizer.optimizeMemory();
        databaseOptimizer.cleanupExpiredCache();
        result = {
          memory: memoryResult,
          database: {
            optimized: true,
            actions: ["Cleaned up expired cache entries"],
            cacheStats: databaseOptimizer.getCacheStats(),
          },
        };
        break;
      }
      default:
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: "Invalid optimization type",
          validTypes: ["memory", "database", "all"],
        });
    }

    logger.info("Performance optimization triggered", { type, result });

    res.status(HttpStatus.OK).json({
      type,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to trigger performance optimization", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Failed to trigger performance optimization",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /performance/profiling/start
 * Start performance profiling
 */
performanceRouter.post("/profiling/start", async (req, res) => {
  try {
    performanceOptimizer.startProfiling();

    logger.info("Performance profiling started");

    res.status(HttpStatus.OK).json({
      message: "Performance profiling started",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to start performance profiling", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Failed to start performance profiling",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /performance/profiling/stop
 * Stop performance profiling
 */
performanceRouter.post("/profiling/stop", async (req, res) => {
  try {
    performanceOptimizer.stopProfiling();

    logger.info("Performance profiling stopped");

    res.status(HttpStatus.OK).json({
      message: "Performance profiling stopped",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to stop performance profiling", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Failed to stop performance profiling",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /performance/memory/gc
 * Force garbage collection
 */
performanceRouter.post("/memory/gc", async (req, res) => {
  try {
    const beforeGC = memoryOptimizer.getMemoryStats();
    memoryOptimizer.forceGarbageCollection();
    const afterGC = memoryOptimizer.getMemoryStats();

    const memorySaved = beforeGC.heapUsed - afterGC.heapUsed;

    logger.info("Garbage collection forced", { memorySaved });

    res.status(HttpStatus.OK).json({
      message: "Garbage collection completed",
      memorySaved,
      before: beforeGC,
      after: afterGC,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to force garbage collection", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Failed to force garbage collection",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /performance/cache/clear
 * Clear database query cache
 */
performanceRouter.post("/cache/clear", async (req, res) => {
  try {
    databaseOptimizer.clearQueryCache();

    logger.info("Database query cache cleared");

    res.status(HttpStatus.OK).json({
      message: "Database query cache cleared",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to clear database cache", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: "Failed to clear database cache",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /performance/health
 * Get performance health status
 */
performanceRouter.get("/health", async (req, res) => {
  try {
    const performanceReport = performanceOptimizer.getPerformanceReport();
    const memoryReport = memoryOptimizer.getMemoryReport();
    const cacheStats = databaseOptimizer.getCacheStats();

    const health = {
      status: "healthy",
      issues: [] as string[],
      performance: {
        slowOperations: performanceReport.summary.slowOperations,
        averageDuration: performanceReport.summary.averageDuration,
      },
      memory: {
        heapUsedPercentage: memoryReport.current.heapUsedPercentage,
        leakDetected: memoryReport.leakDetection.detected,
        leakSeverity: memoryReport.leakDetection.severity,
      },
      database: {
        cacheHitRate: cacheStats.hitRate,
        cacheSize: cacheStats.size,
      },
      timestamp: new Date().toISOString(),
    };

    // Check for issues
    if (performanceReport.summary.averageDuration > 500) {
      health.issues.push("High average operation duration");
    }

    if (memoryReport.current.heapUsedPercentage > 80) {
      health.issues.push("High memory usage");
    }

    if (
      memoryReport.leakDetection.detected &&
      memoryReport.leakDetection.severity === "high"
    ) {
      health.issues.push("Memory leak detected");
    }

    if (cacheStats.hitRate < 0.7) {
      health.issues.push("Low cache hit rate");
    }

    if (health.issues.length > 0) {
      health.status = "degraded";
    }

    if (health.issues.length > 3) {
      health.status = "unhealthy";
    }

    res.status(HttpStatus.OK).json(health);
  } catch (error) {
    logger.error("Failed to get performance health", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: "error",
      error: "Failed to get performance health",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default performanceRouter;
