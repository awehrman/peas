"use client";

export interface PerformanceMetrics {
  uploadStartTime: number;
  uploadEndTime: number;
  totalDuration: number;
  filesProcessed: number;
  totalFileSize: number;
  averageUploadTime: number;
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
  };
  batchMetrics: BatchMetric[];
}

export interface BatchMetric {
  batchIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  filesInBatch: number;
  successfulUploads: number;
  failedUploads: number;
}

export interface UploadPerformanceConfig {
  enableMonitoring: boolean;
  logToConsole: boolean;
  trackMemory: boolean;
  trackBatches: boolean;
}

const DEFAULT_CONFIG: Required<UploadPerformanceConfig> = {
  enableMonitoring: true,
  logToConsole: process.env.NODE_ENV === "development",
  trackMemory: true,
  trackBatches: true,
};

export class PerformanceMonitor {
  private config: Required<UploadPerformanceConfig>;
  private metrics: PerformanceMetrics | null = null;
  private batchMetrics: BatchMetric[] = [];
  private memoryPeak = 0;
  private uploadStartTime = 0;

  constructor(config: Partial<UploadPerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start monitoring upload performance
   */
  startMonitoring(fileCount: number, totalFileSize: number): void {
    if (!this.config.enableMonitoring) return;

    this.uploadStartTime =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    this.memoryPeak = this.getCurrentMemoryUsage();
    this.batchMetrics = [];

    this.metrics = {
      uploadStartTime: this.uploadStartTime,
      uploadEndTime: 0,
      totalDuration: 0,
      filesProcessed: fileCount,
      totalFileSize,
      averageUploadTime: 0,
      memoryUsage: {
        before: this.getCurrentMemoryUsage(),
        after: 0,
        peak: this.memoryPeak,
      },
      batchMetrics: [],
    };

    if (this.config.logToConsole) {
      console.log("🚀 Starting upload performance monitoring", {
        fileCount,
        totalFileSize: this.formatBytes(totalFileSize),
      });
    }
  }

  /**
   * Record batch performance
   */
  recordBatch(
    batchIndex: number,
    startTime: number,
    endTime: number,
    filesInBatch: number,
    successfulUploads: number,
    failedUploads: number
  ): void {
    if (!this.config.enableMonitoring || !this.config.trackBatches) return;

    const batchMetric: BatchMetric = {
      batchIndex,
      startTime,
      endTime,
      duration: endTime - startTime,
      filesInBatch,
      successfulUploads,
      failedUploads,
    };

    this.batchMetrics.push(batchMetric);

    // Update memory peak
    const currentMemory = this.getCurrentMemoryUsage();
    if (currentMemory > this.memoryPeak) {
      this.memoryPeak = currentMemory;
    }

    if (this.config.logToConsole) {
      console.log(`📦 Batch ${batchIndex} completed`, {
        duration: `${batchMetric.duration.toFixed(2)}ms`,
        files: `${successfulUploads}/${filesInBatch} successful`,
        memory: `${this.formatBytes(currentMemory * 1024 * 1024)}`,
      });
    }
  }

  /**
   * Stop monitoring and calculate final metrics
   */
  stopMonitoring(): PerformanceMetrics | null {
    if (!this.config.enableMonitoring || !this.metrics) return null;

    const uploadEndTime =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const totalDuration = uploadEndTime - this.uploadStartTime;

    this.metrics.uploadEndTime = uploadEndTime;
    this.metrics.totalDuration = totalDuration;
    this.metrics.averageUploadTime =
      totalDuration / this.metrics.filesProcessed;
    this.metrics.memoryUsage.after = this.getCurrentMemoryUsage();
    this.metrics.memoryUsage.peak = this.memoryPeak;
    this.metrics.batchMetrics = this.batchMetrics;

    if (this.config.logToConsole) {
      this.logFinalMetrics();
    }

    return this.metrics;
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    if (
      !this.config.trackMemory ||
      typeof performance === "undefined" ||
      !("memory" in performance)
    ) {
      return 0;
    }

    const memory = (
      performance as Performance & { memory?: { usedJSHeapSize: number } }
    ).memory;
    return Math.round((memory?.usedJSHeapSize || 0) / 1024 / 1024);
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Log final performance metrics
   */
  private logFinalMetrics(): void {
    if (!this.metrics) return;

    const { metrics } = this;

    console.group("📊 Upload Performance Report");
    console.log("⏱️  Total Duration:", `${metrics.totalDuration.toFixed(2)}ms`);
    console.log("📁 Files Processed:", metrics.filesProcessed);
    console.log("📦 Total Size:", this.formatBytes(metrics.totalFileSize));
    console.log(
      "⚡ Average Upload Time:",
      `${metrics.averageUploadTime.toFixed(2)}ms per file`
    );
    console.log("💾 Memory Usage:", {
      before: `${metrics.memoryUsage.before}MB`,
      after: `${metrics.memoryUsage.after}MB`,
      peak: `${metrics.memoryUsage.peak}MB`,
      increase: `${metrics.memoryUsage.after - metrics.memoryUsage.before}MB`,
    });

    if (metrics.batchMetrics.length > 0) {
      console.group("📦 Batch Performance");
      metrics.batchMetrics.forEach((batch, index) => {
        console.log(`Batch ${index + 1}:`, {
          duration: `${batch.duration.toFixed(2)}ms`,
          files: `${batch.successfulUploads}/${batch.filesInBatch} successful`,
          successRate: `${((batch.successfulUploads / batch.filesInBatch) * 100).toFixed(1)}%`,
        });
      });
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Get performance recommendations based on metrics
   */
  getRecommendations(): string[] {
    if (!this.metrics) return [];

    const recommendations: string[] = [];
    const { metrics } = this;

    // Check upload speed
    const filesPerSecond =
      metrics.filesProcessed / (metrics.totalDuration / 1000);
    if (filesPerSecond < 0.5) {
      recommendations.push(
        "Consider reducing batch size to improve upload speed"
      );
    } else if (filesPerSecond > 2) {
      recommendations.push(
        "Consider increasing batch size for better efficiency"
      );
    }

    // Check memory usage
    const memoryIncrease =
      metrics.memoryUsage.after - metrics.memoryUsage.before;
    if (memoryIncrease > 100) {
      recommendations.push(
        "High memory usage detected. Consider processing files in smaller batches"
      );
    }

    // Check batch performance
    if (metrics.batchMetrics.length > 0) {
      const avgBatchDuration =
        metrics.batchMetrics.reduce((sum, batch) => sum + batch.duration, 0) /
        metrics.batchMetrics.length;
      if (avgBatchDuration > 10000) {
        recommendations.push(
          "Batch processing is slow. Consider reducing batch size or increasing delays"
        );
      }
    }

    // Check success rate
    const totalSuccessful = metrics.batchMetrics.reduce(
      (sum, batch) => sum + batch.successfulUploads,
      0
    );
    const successRate = (totalSuccessful / metrics.filesProcessed) * 100;
    if (successRate < 90) {
      recommendations.push(
        "Low success rate detected. Consider implementing retry logic or reducing concurrent uploads"
      );
    }

    return recommendations;
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * Reset monitor state
   */
  reset(): void {
    this.metrics = null;
    this.batchMetrics = [];
    this.memoryPeak = 0;
    this.uploadStartTime = 0;
  }
}
