import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestApp } from "../../test-utils/helpers";
import { HttpStatus } from "../../types";
import { ErrorHandler } from "../../utils/error-handler";
import {
  getMetricsSnapshot,
  getPerformanceMetrics,
  getPrometheusMetrics,
} from "../../utils/metrics";
// Import the router after mocking
import { metricsRouter } from "../metrics";

// Mock the metrics utilities
vi.mock("../../utils/metrics", () => ({
  getMetricsSnapshot: vi.fn(),
  getPerformanceMetrics: vi.fn(),
  getPrometheusMetrics: vi.fn(),
}));

// Mock the error handler
vi.mock("../../utils/error-handler", () => ({
  ErrorHandler: {
    handleRouteError: vi.fn(),
  },
}));

describe("Metrics Router", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
    app.use("/metrics", metricsRouter);
  });

  describe("GET /metrics/prometheus", () => {
    it("should return prometheus metrics successfully", async () => {
      const mockMetrics =
        "# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total 100";
      (getPrometheusMetrics as ReturnType<typeof vi.fn>).mockReturnValue(
        mockMetrics
      );

      const response = await request(app).get("/metrics/prometheus");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.headers["content-type"]).toBe(
        "text/plain; charset=utf-8"
      );
      expect(response.text).toBe(mockMetrics);
      expect(getPrometheusMetrics).toHaveBeenCalledTimes(1);
    });

    it("should handle errors when getting prometheus metrics", async () => {
      const mockError = new Error("Failed to get metrics");
      (getPrometheusMetrics as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw mockError;
        }
      );

      const mockErrorResponse = {
        success: false,
        error: "Internal server error",
        operation: "get_prometheus_metrics",
      };
      (
        ErrorHandler.handleRouteError as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockErrorResponse);

      const response = await request(app).get("/metrics/prometheus");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual(mockErrorResponse);
      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        mockError,
        "get_prometheus_metrics"
      );
    });

    it("should handle non-Error objects thrown by getPrometheusMetrics", async () => {
      const mockError = "String error";
      (getPrometheusMetrics as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw mockError;
        }
      );

      const mockErrorResponse = {
        success: false,
        error: "Internal server error",
        operation: "get_prometheus_metrics",
      };
      (
        ErrorHandler.handleRouteError as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockErrorResponse);

      const response = await request(app).get("/metrics/prometheus");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual(mockErrorResponse);
      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        mockError,
        "get_prometheus_metrics"
      );
    });
  });

  describe("GET /metrics/snapshot", () => {
    it("should return metrics snapshot successfully", async () => {
      const mockSnapshot = {
        requests: 100,
        errors: 5,
        memoryUsage: 1024 * 1024,
        uptime: 3600,
      };
      (getMetricsSnapshot as ReturnType<typeof vi.fn>).mockReturnValue(
        mockSnapshot
      );

      const response = await request(app).get("/metrics/snapshot");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: mockSnapshot,
        timestamp: expect.any(String),
      });
      expect(getMetricsSnapshot).toHaveBeenCalledTimes(1);
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it("should handle errors when getting metrics snapshot", async () => {
      const mockError = new Error("Failed to get snapshot");
      (getMetricsSnapshot as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw mockError;
        }
      );

      const mockErrorResponse = {
        success: false,
        error: "Internal server error",
        operation: "get_metrics_snapshot",
      };
      (
        ErrorHandler.handleRouteError as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockErrorResponse);

      const response = await request(app).get("/metrics/snapshot");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual(mockErrorResponse);
      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        mockError,
        "get_metrics_snapshot"
      );
    });

    it("should handle null/undefined snapshot data", async () => {
      (getMetricsSnapshot as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const response = await request(app).get("/metrics/snapshot");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: null,
        timestamp: expect.any(String),
      });
    });
  });

  describe("GET /metrics/performance", () => {
    it("should return performance metrics successfully", async () => {
      const mockPerformance = {
        requestCount: 1000,
        errorCount: 10,
        requestDuration: 250,
        memoryUsage: 256 * 1024 * 1024,
        cpuUsage: 15.5,
      };
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockReturnValue(
        mockPerformance
      );

      const response = await request(app).get("/metrics/performance");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: mockPerformance,
        timestamp: expect.any(String),
      });
      expect(getPerformanceMetrics).toHaveBeenCalledTimes(1);
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it("should handle errors when getting performance metrics", async () => {
      const mockError = new Error("Failed to get performance metrics");
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw mockError;
        }
      );

      const mockErrorResponse = {
        success: false,
        error: "Internal server error",
        operation: "get_performance_metrics",
      };
      (
        ErrorHandler.handleRouteError as ReturnType<typeof vi.fn>
      ).mockReturnValue(mockErrorResponse);

      const response = await request(app).get("/metrics/performance");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual(mockErrorResponse);
      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        mockError,
        "get_performance_metrics"
      );
    });

    it("should handle empty performance metrics object", async () => {
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockReturnValue({});

      const response = await request(app).get("/metrics/performance");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: {},
        timestamp: expect.any(String),
      });
    });
  });

  describe("GET /metrics/health", () => {
    it("should return healthy status when metrics are within thresholds", async () => {
      const mockPerformance = {
        errorCount: 5, // Less than 10
        requestDuration: 2000, // Less than 5000ms
        memoryUsage: 100 * 1024 * 1024, // Less than 500MB
      };
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockReturnValue(
        mockPerformance
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "healthy",
        timestamp: expect.any(String),
        metrics: mockPerformance,
      });
      expect(getPerformanceMetrics).toHaveBeenCalledTimes(1);
    });

    it("should return degraded status when error count exceeds threshold", async () => {
      const mockPerformance = {
        errorCount: 15, // More than 10
        requestDuration: 2000, // Less than 5000ms
        memoryUsage: 100 * 1024 * 1024, // Less than 500MB
      };
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockReturnValue(
        mockPerformance
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "degraded",
        timestamp: expect.any(String),
        metrics: mockPerformance,
      });
    });

    it("should return degraded status when request duration exceeds threshold", async () => {
      const mockPerformance = {
        errorCount: 5, // Less than 10
        requestDuration: 6000, // More than 5000ms
        memoryUsage: 100 * 1024 * 1024, // Less than 500MB
      };
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockReturnValue(
        mockPerformance
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "degraded",
        timestamp: expect.any(String),
        metrics: mockPerformance,
      });
    });

    it("should return degraded status when memory usage exceeds threshold", async () => {
      const mockPerformance = {
        errorCount: 5, // Less than 10
        requestDuration: 2000, // Less than 5000ms
        memoryUsage: 600 * 1024 * 1024, // More than 500MB
      };
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockReturnValue(
        mockPerformance
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "degraded",
        timestamp: expect.any(String),
        metrics: mockPerformance,
      });
    });

    it("should return degraded status when multiple thresholds are exceeded", async () => {
      const mockPerformance = {
        errorCount: 15, // More than 10
        requestDuration: 6000, // More than 5000ms
        memoryUsage: 600 * 1024 * 1024, // More than 500MB
      };
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockReturnValue(
        mockPerformance
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "degraded",
        timestamp: expect.any(String),
        metrics: mockPerformance,
      });
    });

    it("should handle errors when getting performance metrics for health check", async () => {
      const mockError = new Error("Failed to get performance metrics");
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw mockError;
        }
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        status: "unhealthy",
        timestamp: expect.any(String),
        error: "Failed to get performance metrics",
      });
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it("should handle non-Error objects thrown by getPerformanceMetrics", async () => {
      const mockError = "String error";
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw mockError;
        }
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        status: "unhealthy",
        timestamp: expect.any(String),
        error: "Unknown error",
      });
    });

    it("should handle null/undefined error objects", async () => {
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockImplementation(
        () => {
          throw null;
        }
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        status: "unhealthy",
        timestamp: expect.any(String),
        error: "Unknown error",
      });
    });

    it("should handle edge case with exact threshold values", async () => {
      const mockPerformance = {
        errorCount: 10, // Exactly 10 (should be degraded)
        requestDuration: 5000, // Exactly 5000ms (should be degraded)
        memoryUsage: 500 * 1024 * 1024, // Exactly 500MB (should be degraded)
      };
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockReturnValue(
        mockPerformance
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "degraded",
        timestamp: expect.any(String),
        metrics: mockPerformance,
      });
    });

    it("should handle missing performance metrics properties", async () => {
      const mockPerformance = {
        // Missing errorCount, requestDuration, memoryUsage
        someOtherMetric: 123,
      };
      (getPerformanceMetrics as ReturnType<typeof vi.fn>).mockReturnValue(
        mockPerformance
      );

      const response = await request(app).get("/metrics/health");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        status: "degraded", // undefined values are treated as falsy, so all conditions fail
        timestamp: expect.any(String),
        metrics: mockPerformance,
      });
    });
  });

  describe("Router Configuration", () => {
    it("should have all expected routes configured", () => {
      const routes = metricsRouter.stack
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
        { path: "/prometheus", method: "get" },
        { path: "/snapshot", method: "get" },
        { path: "/performance", method: "get" },
        { path: "/health", method: "get" },
      ]);
    });

    it("should handle 404 for non-existent routes", async () => {
      const response = await request(app).get("/metrics/nonexistent");

      expect(response.status).toBe(404);
    });
  });
});
