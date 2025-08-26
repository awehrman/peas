"use client";

import { useCallback, useEffect, useRef } from "react";

import { useImportState } from "../contexts/import-state-context";

interface PerformanceMetrics {
  uploadStartTime?: number;
  uploadEndTime?: number;
  uploadDuration?: number;
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
}

export function usePerformanceMonitoring(config: PerformanceConfig = {}) {
  const {
    enableMemoryMonitoring = true,
    enableRenderTracking = true,
    reportingInterval = 30000, // 30 seconds
    logToConsole = process.env.NODE_ENV === "development",
  } = config;

  const { state } = useImportState();
  const { uploadItems, importItems, events } = state;

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

  // Track state updates
  useEffect(() => {
    metricsRef.current.stateUpdateCount++;
    metricsRef.current.lastUpdateTime = Date.now();
    metricsRef.current.itemsProcessed = uploadItems.size + importItems.size;
  }, [uploadItems.size, importItems.size]);

  // Track upload performance
  useEffect(() => {
    const uploadingItems = Array.from(uploadItems.values()).filter(
      (item) => item.status === "uploading"
    );

    if (uploadingItems.length > 0 && !metricsRef.current.uploadStartTime) {
      metricsRef.current.uploadStartTime = Date.now();
    }

    const completedItems = Array.from(uploadItems.values()).filter(
      (item) => item.status === "uploaded" || item.status === "failed"
    );

    if (
      completedItems.length > 0 &&
      uploadingItems.length === 0 &&
      metricsRef.current.uploadStartTime
    ) {
      metricsRef.current.uploadEndTime = Date.now();
      metricsRef.current.uploadDuration =
        metricsRef.current.uploadEndTime - metricsRef.current.uploadStartTime;

      if (completedItems.length > 0) {
        metricsRef.current.avgProcessingTime =
          metricsRef.current.uploadDuration / completedItems.length;
      }
    }
  }, [uploadItems]);

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
  }, [uploadItems.size, importItems.size, events.length, getMemoryUsage]);

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
    ${metrics.uploadDuration ? `- Upload duration: ${(metrics.uploadDuration / 1000).toFixed(1)}s` : ""}
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
        "Upload performance is slower than optimal - consider batch optimization"
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
  }, [uploadItems.size, importItems.size, events.length]); // Add dependencies that affect metrics

  // Periodic reporting
  useEffect(() => {
    if (reportingInterval > 0) {
      reportingTimerRef.current = setInterval(() => {
        const report = generateReport();

        // Only log in development environment
        if (logToConsole && process.env.NODE_ENV === "development") {
          console.group("🚀 Import Performance Report");
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
  }, [reportingInterval, logToConsole, generateReport]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      itemsProcessed: uploadItems.size + importItems.size,
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
  }, [
    uploadItems.size,
    importItems.size,
    enableMemoryMonitoring,
    getMemoryUsage,
  ]);

  // Get current metrics
  const getCurrentMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  return {
    generateReport,
    resetMetrics,
    getCurrentMetrics,
  };
}
