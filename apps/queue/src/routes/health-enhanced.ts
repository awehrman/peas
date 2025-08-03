import { Router } from "express";

import { ManagerFactory } from "../config/factory";
import { systemMonitor } from "../monitoring/system-monitor";
import { HttpStatus } from "../types";

export const healthEnhancedRouter = Router();

// ============================================================================
// ENHANCED HEALTH CHECK ENDPOINTS
// ============================================================================

/**
 * Comprehensive health check endpoint with detailed status
 */
healthEnhancedRouter.get("/", async (req, res) => {
  try {
    const healthReport = await systemMonitor.generateHealthReport();

    const statusCode =
      healthReport.overallStatus === "healthy"
        ? 200
        : healthReport.overallStatus === "degraded"
          ? 200
          : 503;

    /* istanbul ignore next -- @preserve */
    res.status(statusCode).json({
      status: healthReport.overallStatus,
      timestamp: healthReport.timestamp.toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      health: {
        system: healthReport.systemHealth,
        job: healthReport.jobHealth,
        queue: healthReport.queueHealth,
        cache: healthReport.cacheHealth,
      },
      performance: healthReport.performanceMetrics,
      recommendations: healthReport.recommendations,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Readiness check endpoint for Kubernetes readiness probes
 * Checks if the service is ready to receive traffic
 */
healthEnhancedRouter.get("/ready", async (req, res) => {
  try {
    const healthMonitor = ManagerFactory.createHealthMonitor();
    const cacheManager = ManagerFactory.createCacheManager();

    // Check essential services
    const isHealthy = await healthMonitor.isHealthy();
    const isCacheReady = cacheManager.isReady();

    const isReady = isHealthy && isCacheReady;

    if (isReady) {
      res.status(HttpStatus.OK).json({
        status: "ready",
        timestamp: new Date().toISOString(),
        checks: {
          health: isHealthy,
          cache: isCacheReady,
        },
      });
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        checks: {
          health: isHealthy,
          cache: isCacheReady,
        },
        message: "Service is not ready to receive traffic",
      });
    }
  } catch (error) {
    console.error("Readiness check failed:", error);
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
      error: "Readiness check failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Liveness check endpoint for Kubernetes liveness probes
 * Checks if the service is alive and responsive
 */
healthEnhancedRouter.get("/live", async (req, res) => {
  try {
    // Simple liveness check - just verify the process is running
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // Check if memory usage is reasonable (less than 1GB)
    const isMemoryHealthy = memoryUsage.heapUsed < 1024 * 1024 * 1024;

    if (isMemoryHealthy && uptime > 0) {
      res.status(HttpStatus.OK).json({
        status: "alive",
        timestamp: new Date().toISOString(),
        uptime,
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss,
        },
      });
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime,
        memory: memoryUsage,
        message: "Service is not healthy",
      });
    }
  } catch (error) {
    console.error("Liveness check failed:", error);
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Liveness check failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Detailed component health check
 */
healthEnhancedRouter.get("/components/:component", async (req, res) => {
  try {
    const { component } = req.params;
    const healthMonitor = ManagerFactory.createHealthMonitor();

    const componentHealth = await healthMonitor.getComponentHealth(
      component as "database" | "redis" | "queues"
    );

    res.status(HttpStatus.OK).json({
      component,
      timestamp: new Date().toISOString(),
      health: componentHealth,
    });
  } catch (error) {
    console.error(
      `Component health check failed for ${req.params.component}:`,
      error
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      component: req.params.component,
      timestamp: new Date().toISOString(),
      error: "Component health check failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * System metrics endpoint
 */
healthEnhancedRouter.get("/metrics", async (req, res) => {
  try {
    const systemMetrics = systemMonitor.getSystemMetrics();
    const allJobMetrics = systemMonitor.getAllJobMetrics();
    const allQueueMetrics = systemMonitor.getAllQueueMetrics();

    /* istanbul ignore next -- @preserve */
    res.status(HttpStatus.OK).json({
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      jobs: {
        total: allJobMetrics.length,
        recent: allJobMetrics.slice(-10), // Last 10 jobs
        byQueue: allJobMetrics.reduce(
          (acc, job) => {
            const queue = job.queueName || "unknown";
            acc[queue] = (acc[queue] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      queues: allQueueMetrics,
    });
  } catch (error) {
    console.error("Metrics endpoint failed:", error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      timestamp: new Date().toISOString(),
      error: "Metrics collection failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Health check for specific queue
 */
healthEnhancedRouter.get("/queues/:queueName", async (req, res) => {
  try {
    const { queueName } = req.params;
    const queueMetrics = systemMonitor.getQueueMetrics(queueName);
    const queueJobMetrics = systemMonitor.getQueueJobMetrics(queueName);

    if (!queueMetrics) {
      return res.status(404).json({
        queueName,
        timestamp: new Date().toISOString(),
        error: "Queue not found",
      });
    }

    const failureRate =
      queueMetrics.failedCount / Math.max(queueMetrics.jobCount, 1);
    const status =
      failureRate < 0.1
        ? "healthy"
        : failureRate < 0.25
          ? "degraded"
          : "unhealthy";

    res.status(200).json({
      queueName,
      timestamp: new Date().toISOString(),
      status,
      metrics: queueMetrics,
      recentJobs: queueJobMetrics.slice(-5), // Last 5 jobs
      failureRate: failureRate * 100, // Percentage
    });
  } catch (error) {
    console.error(
      `Queue health check failed for ${req.params.queueName}:`,
      error
    );
    res.status(500).json({
      queueName: req.params.queueName,
      timestamp: new Date().toISOString(),
      error: "Queue health check failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
