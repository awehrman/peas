import { Router } from "express";

import { ErrorHandler } from "../utils/error-handler";
import {
  getMetricsSnapshot,
  getPerformanceMetrics,
  getPrometheusMetrics,
} from "../utils/metrics";

export const metricsRouter = Router();

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

// Prometheus metrics endpoint
metricsRouter.get("/prometheus", (req, res) => {
  try {
    const metrics = getPrometheusMetrics();
    res.set("Content-Type", "text/plain");
    res.send(metrics);
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(
      error,
      "get_prometheus_metrics"
    );
    res.status(500).json(errorResponse);
  }
});

// JSON metrics snapshot
metricsRouter.get("/snapshot", (req, res) => {
  try {
    const snapshot = getMetricsSnapshot();
    res.json({
      success: true,
      data: snapshot,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(
      error,
      "get_metrics_snapshot"
    );
    res.status(500).json(errorResponse);
  }
});

// Performance metrics summary
metricsRouter.get("/performance", (req, res) => {
  try {
    const performance = getPerformanceMetrics();
    res.json({
      success: true,
      data: performance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(
      error,
      "get_performance_metrics"
    );
    res.status(500).json(errorResponse);
  }
});

// Health check with metrics
metricsRouter.get("/health", (req, res) => {
  try {
    const performance = getPerformanceMetrics();

    // Determine health status based on metrics
    const isHealthy =
      performance.errorCount < 10 && // Less than 10 errors
      performance.requestDuration < 5000 && // Average response time under 5s
      performance.memoryUsage < 500 * 1024 * 1024; // Memory usage under 500MB

    const status = isHealthy ? "healthy" : "degraded";

    res.json({
      status,
      timestamp: new Date().toISOString(),
      metrics: performance,
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
