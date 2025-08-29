"use client";

import { useCallback, useEffect, useRef } from "react";

interface PerformanceMetrics {
  startTime?: number;
  endTime?: number;
  duration?: number;
  itemsProcessed: number;
  avgProcessingTime?: number;
  memoryUsage?: {
    initial: number;
    peak: number;
    current: number;
  };
  componentRenderCount: number;
  stateUpdateCount: number;
  lastUpdateTime: number;
}

interface PerformanceConfig {
  enableMemoryMonitoring?: boolean;
  enableRenderTracking?: boolean;
  reportingInterval?: number;
  logToConsole?: boolean;
  onReport?: (report: PerformanceMetrics & { summary: string; recommendations: string[] }) => void;
}

export function usePerformanceMonitoring(
  config: PerformanceConfig = {},
  dependencies: unknown[] = []
) {
  const {
    enableMemoryMonitoring = true,
    enableRenderTracking = true,
    reportingInterval = 30000, // 30 seconds
    logToConsole = process.env.NODE_ENV === "development",
    onReport,
  } = config;

  const metricsRef = useRef<PerformanceMetrics>({
    itemsProcessed: 0,
    componentRenderCount: 0,
    stateUpdateCount: 0,
    lastUpdateTime: Date.now(),
  });

  const reportingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track component renders
  useEffect(() => {
    if (enableRenderTracking) {
      metricsRef.current.componentRenderCount++;
    }
  }, [enableRenderTracking]);

  // Track state updates based on dependencies
  useEffect(() => {
    metricsRef.current.stateUpdateCount++;
    metricsRef.current.lastUpdateTime = Date.now();
  }, dependencies);

  // Memory monitoring
  const getMemoryUsage = useCallback(() => {
    if (!enableMemoryMonitoring || typeof window === "undefined") return 0;

    if ("memory" in performance) {
      return (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;
    }
    return 0;
  }, [enableMemoryMonitoring]);

  // Update memory metrics
  useEffect(() => {
    if (enableMemoryMonitoring) {
      const currentMemory = getMemoryUsage();

      if (!metricsRef.current.memoryUsage) {
        metricsRef.current.memoryUsage = {
          initial: currentMemory,
          peak: currentMemory,
          current: currentMemory,
        };
      } else {
        metricsRef.current.memoryUsage.current = currentMemory;
        metricsRef.current.memoryUsage.peak = Math.max(
          metricsRef.current.memoryUsage.peak,
          currentMemory
        );
      }
    }
  }, dependencies.concat([getMemoryUsage]));

  // Start performance tracking
  const startTracking = useCallback(() => {
    metricsRef.current.startTime = Date.now();
  }, []);

  // End performance tracking
  const endTracking = useCallback(() => {
    if (metricsRef.current.startTime) {
      metricsRef.current.endTime = Date.now();
      metricsRef.current.duration = metricsRef.current.endTime - metricsRef.current.startTime;
    }
  }, []);

  // Update items processed count
  const updateItemsProcessed = useCallback((count: number) => {
    metricsRef.current.itemsProcessed = count;
    if (metricsRef.current.duration && count > 0) {
      metricsRef.current.avgProcessingTime = metricsRef.current.duration / count;
    }
  }, []);

  // Generate performance report
  const generateReport = useCallback((): PerformanceMetrics & {
    summary: string;
    recommendations: string[];
  } => {
    const metrics = { ...metricsRef.current };
    const now = Date.now();

    // Calculate summary
    const timeSinceLastUpdate = now - metrics.lastUpdateTime;
    const memoryEfficiency = metrics.memoryUsage
      ? (
          (metrics.memoryUsage.current / metrics.memoryUsage.peak) *
          100
        ).toFixed(1)
      : "N/A";

    const summary = `Performance Report:
    - Items processed: ${metrics.itemsProcessed}
    - Component renders: ${metrics.componentRenderCount}
    - State updates: ${metrics.stateUpdateCount}
    - Memory efficiency: ${memoryEfficiency}%
    - Time since last update: ${(timeSinceLastUpdate / 1000).toFixed(1)}s
    ${metrics.duration ? `- Duration: ${(metrics.duration / 1000).toFixed(1)}s` : ""}
    ${metrics.avgProcessingTime ? `- Avg processing time: ${(metrics.avgProcessingTime / 1000).toFixed(1)}s/item` : ""}`;

    // Generate recommendations
    const recommendations: string[] = [];

    if (metrics.componentRenderCount > metrics.stateUpdateCount * 2) {
      recommendations.push(
        "Consider memoizing components to reduce unnecessary renders"
      );
    }

    if (
      metrics.memoryUsage &&
      metrics.memoryUsage.peak > metrics.memoryUsage.initial * 3
    ) {
      recommendations.push(
        "High memory usage detected - consider implementing cleanup"
      );
    }

    if (metrics.avgProcessingTime && metrics.avgProcessingTime > 5000) {
      recommendations.push(
        "Processing performance is slower than optimal - consider optimization"
      );
    }

    if (timeSinceLastUpdate > 60000 && metrics.itemsProcessed > 0) {
      recommendations.push(
        "Long idle time detected - consider cleanup of old items"
      );
    }

    return {
      ...metrics,
      summary,
      recommendations,
    };
  }, dependencies);

  // Periodic reporting
  useEffect(() => {
    if (reportingInterval > 0) {
      reportingTimerRef.current = setInterval(() => {
        const report = generateReport();

        // Call custom report handler
        onReport?.(report);

        // Only log in development environment
        if (logToConsole && process.env.NODE_ENV === "development") {
          console.group("🚀 Performance Report");
          console.log(report.summary);
          if (report.recommendations.length > 0) {
            console.warn("📋 Recommendations:", report.recommendations);
          }
          console.groupEnd();
        }
      }, reportingInterval);

      return () => {
        if (reportingTimerRef.current) {
          clearInterval(reportingTimerRef.current);
        }
      };
    }
  }, [reportingInterval, logToConsole, generateReport, onReport]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      itemsProcessed: 0,
      componentRenderCount: 0,
      stateUpdateCount: 0,
      lastUpdateTime: Date.now(),
    };

    if (enableMemoryMonitoring) {
      const currentMemory = getMemoryUsage();
      metricsRef.current.memoryUsage = {
        initial: currentMemory,
        peak: currentMemory,
        current: currentMemory,
      };
    }
  }, [enableMemoryMonitoring, getMemoryUsage]);

  // Get current metrics
  const getCurrentMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  return {
    generateReport,
    resetMetrics,
    getCurrentMetrics,
    startTracking,
    endTracking,
    updateItemsProcessed,
  };
}
