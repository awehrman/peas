import { EventEmitter } from "events";

import { ManagerFactory } from "../config/factory";
import type {
  HealthReport,
  JobEvent,
  JobHealth,
  JobMetrics,
  QueueHealth,
  QueueMetrics,
  SystemEvent,
  SystemMetrics,
  WorkerEvent,
} from "../types/monitoring";

// ============================================================================
// SYSTEM MONITOR CLASS
// ============================================================================

/**
 * Comprehensive system monitoring class that tracks job metrics, queue metrics,
 * and generates health reports. Integrates with existing metrics collectors.
 */
export class SystemMonitor extends EventEmitter {
  private static instance: SystemMonitor;
  private jobMetrics: Map<string, JobMetrics> = new Map();
  private queueMetrics: Map<string, QueueMetrics> = new Map();
  private systemMetrics: SystemMetrics = {
    totalWorkers: 0,
    totalQueues: 0,
    totalJobsProcessed: 0,
    totalJobsFailed: 0,
    averageJobDuration: 0,
    totalErrors: 0,
    uptime: 0,
    lastUpdated: new Date(),
    systemUptime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  };
  private readonly MAX_METRICS_HISTORY = 1000;
  private readonly CLEANUP_INTERVAL_MS = 300000; // 5 minutes

  private constructor() {
    super();
    this.startCleanupInterval();
  }

  public static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  // ============================================================================
  // JOB METRICS TRACKING
  // ============================================================================

  /**
   * Track job processing metrics
   */
  public trackJobMetrics(
    jobId: string,
    duration: number,
    success: boolean,
    queueName?: string,
    workerName?: string,
    error?: string
  ): void {
    const jobMetric: JobMetrics = {
      jobId,
      duration,
      success,
      queueName,
      workerName,
      error,
      timestamp: new Date(),
    };

    this.jobMetrics.set(jobId, jobMetric);
    this.updateSystemMetrics(jobMetric);

    // Emit job event for structured logging
    this.emit("jobProcessed", {
      type: "job_processed",
      data: jobMetric,
      timestamp: new Date(),
    } as JobEvent);

    // Clean up old metrics if we exceed the limit
    if (this.jobMetrics.size > this.MAX_METRICS_HISTORY) {
      this.cleanupOldJobMetrics();
    }
  }

  /**
   * Get job metrics for a specific job
   */
  public getJobMetrics(jobId: string): JobMetrics | undefined {
    return this.jobMetrics.get(jobId);
  }

  /**
   * Get all job metrics
   */
  public getAllJobMetrics(): JobMetrics[] {
    return Array.from(this.jobMetrics.values());
  }

  /**
   * Get job metrics for a specific queue
   */
  public getQueueJobMetrics(queueName: string): JobMetrics[] {
    return Array.from(this.jobMetrics.values()).filter(
      (metric) => metric.queueName === queueName
    );
  }

  // ============================================================================
  // QUEUE METRICS TRACKING
  // ============================================================================

  /**
   * Track queue metrics
   */
  public trackQueueMetrics(
    queueName: string,
    jobCount: number,
    waitingCount: number = 0,
    activeCount: number = 0,
    completedCount: number = 0,
    failedCount: number = 0
  ): void {
    const queueMetric: QueueMetrics = {
      queueName,
      jobCount,
      waitingCount,
      activeCount,
      completedCount,
      failedCount,
      timestamp: new Date(),
    };

    this.queueMetrics.set(queueName, queueMetric);

    // Emit queue event for structured logging
    this.emit("queueUpdated", {
      type: "queue_updated",
      data: queueMetric,
      timestamp: new Date(),
    } as unknown as JobEvent);
  }

  /**
   * Get queue metrics for a specific queue
   */
  public getQueueMetrics(queueName: string): QueueMetrics | undefined {
    return this.queueMetrics.get(queueName);
  }

  /**
   * Get all queue metrics
   */
  public getAllQueueMetrics(): QueueMetrics[] {
    return Array.from(this.queueMetrics.values());
  }

  // ============================================================================
  // STRUCTURED LOGGING
  // ============================================================================

  /**
   * Log job events with structured data
   */
  public logJobEvent(event: JobEvent): void {
    console.log(`[JOB] ${event.type}:`, {
      jobId: event.data.jobId,
      duration: event.data.duration,
      success: event.data.success,
      queueName: event.data.queueName,
      workerName: event.data.workerName,
      error: event.data.error,
      timestamp: event.timestamp.toISOString(),
    });

    this.emit("jobEventLogged", event);
  }

  /**
   * Log worker events with structured data
   */
  public logWorkerEvent(event: WorkerEvent): void {
    console.log(`[WORKER] ${event.type}:`, {
      workerName: event.data.workerName,
      status: event.data.status,
      queueName: event.data.queueName,
      jobCount: event.data.jobCount,
      timestamp: event.timestamp.toISOString(),
    });

    this.emit("workerEventLogged", event);
  }

  /**
   * Log system events with structured data
   */
  public logSystemEvent(event: SystemEvent): void {
    console.log(`[SYSTEM] ${event.type}:`, {
      component: event.data.component,
      status: event.data.status,
      message: event.data.message,
      error: event.data.error,
      timestamp: event.timestamp.toISOString(),
    });

    this.emit("systemEventLogged", event);
  }

  // ============================================================================
  // HEALTH REPORTING
  // ============================================================================

  /**
   * Generate comprehensive health report
   */
  public async generateHealthReport(): Promise<HealthReport> {
    const healthMonitor = ManagerFactory.createHealthMonitor();
    const metricsCollector = ManagerFactory.createMetricsCollector();
    const cacheManager = ManagerFactory.createCacheManager();

    // Get system health
    const health = await healthMonitor.getHealth();

    // Get performance metrics
    const performanceMetrics = metricsCollector.getPerformanceMetrics();

    // Calculate queue health
    const queueHealth = this.calculateQueueHealth();

    // Calculate job processing health
    const jobHealth = this.calculateJobHealth();

    const report: HealthReport = {
      timestamp: new Date(),
      overallStatus: this.determineOverallStatus(
        health,
        queueHealth,
        jobHealth
      ),
      systemHealth: health,
      performanceMetrics,
      queueHealth: queueHealth as Record<string, QueueHealth>,
      jobHealth: jobHealth as JobHealth,
      cacheHealth: {
        isConnected: cacheManager.isReady(),
        hitRate: performanceMetrics.cacheHitRate,
        lastChecked: new Date(),
      },
      recommendations: this.generateRecommendations(
        health,
        queueHealth,
        jobHealth
      ),
    };

    // Emit health report event
    this.emit("healthReportGenerated", {
      type: "health_report_generated",
      data: {
        component: "system_monitor",
        status: report.overallStatus,
        message: `Health report generated with status: ${report.overallStatus}`,
      },
      timestamp: new Date(),
    } as SystemEvent);

    return report;
  }

  /**
   * Get system metrics summary
   */
  public getSystemMetrics(): SystemMetrics {
    this.systemMetrics.uptime = process.uptime();
    this.systemMetrics.lastUpdated = new Date();
    return { ...this.systemMetrics };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private updateSystemMetrics(jobMetric: JobMetrics): void {
    this.systemMetrics.totalJobsProcessed++;

    if (!jobMetric.success) {
      this.systemMetrics.totalJobsFailed++;
      this.systemMetrics.totalErrors++;
    }

    // Update average job duration
    const allDurations = Array.from(this.jobMetrics.values())
      .map((m) => m.duration)
      .filter((d) => d > 0);

    if (allDurations.length > 0) {
      this.systemMetrics.averageJobDuration =
        allDurations.reduce((sum, duration) => sum + duration, 0) /
        allDurations.length;
    }
  }

  private calculateQueueHealth(): Record<
    string,
    { status: string; message: string; metrics: QueueMetrics }
  > {
    const queueHealth: Record<
      string,
      { status: string; message: string; metrics: QueueMetrics }
    > = {};

    for (const [queueName, metrics] of this.queueMetrics) {
      const failureRate = metrics.failedCount / Math.max(metrics.jobCount, 1);

      let status = "healthy";
      let message = "Queue is processing jobs normally";

      if (failureRate >= 0.25) {
        // 25% or higher failure rate = unhealthy
        status = "unhealthy";
        message = `High failure rate: ${(failureRate * 100).toFixed(1)}%`;
      } else if (failureRate >= 0.1) {
        // 10% to 25% failure rate = degraded
        status = "degraded";
        message = `Elevated failure rate: ${(failureRate * 100).toFixed(1)}%`;
      }
      // Less than 10% = healthy (default)

      queueHealth[queueName] = { status, message, metrics };
    }

    return queueHealth;
  }

  private calculateJobHealth(): {
    status: string;
    message: string;
    metrics: SystemMetrics;
  } {
    const failureRate =
      this.systemMetrics.totalJobsFailed /
      Math.max(this.systemMetrics.totalJobsProcessed, 1);

    let status = "healthy";
    let message = "Job processing is normal";

    if (failureRate >= 0.15) {
      // 15% or higher failure rate = unhealthy
      status = "unhealthy";
      message = `High job failure rate: ${(failureRate * 100).toFixed(1)}%`;
    } else if (failureRate >= 0.05) {
      // 5% to 15% failure rate = degraded
      status = "degraded";
      message = `Elevated job failure rate: ${(failureRate * 100).toFixed(1)}%`;
    }
    // Less than 5% = healthy (default)

    return { status, message, metrics: this.systemMetrics };
  }

  private determineOverallStatus(
    systemHealth: { status: string },
    queueHealth: Record<string, { status: string }>,
    jobHealth: { status: string }
  ): "healthy" | "degraded" | "unhealthy" {
    // Check system health
    if (systemHealth.status === "unhealthy") {
      return "unhealthy";
    }

    // Check job health
    if (jobHealth.status === "unhealthy") {
      return "unhealthy";
    }

    // Check queue health
    const unhealthyQueues = Object.values(queueHealth).filter(
      (q) => q.status === "unhealthy"
    ).length;

    if (unhealthyQueues > 0) {
      return "unhealthy";
    }

    // Check for degraded status
    if (
      systemHealth.status === "degraded" ||
      jobHealth.status === "degraded" ||
      Object.values(queueHealth).some((q) => q.status === "degraded")
    ) {
      return "degraded";
    }

    return "healthy";
  }

  private generateRecommendations(
    systemHealth: { status: string },
    queueHealth: Record<string, { status: string }>,
    jobHealth: { status: string; message: string }
  ): string[] {
    const recommendations: string[] = [];

    // System health recommendations
    if (systemHealth.status === "unhealthy") {
      recommendations.push("Check database and Redis connectivity");
      recommendations.push("Verify all required services are running");
    }

    // Job health recommendations
    if (jobHealth.status !== "healthy") {
      recommendations.push("Review job processing logs for errors");
      recommendations.push("Check worker configuration and dependencies");
    }

    // Queue health recommendations
    Object.entries(queueHealth).forEach(([queueName, health]) => {
      if (health.status !== "healthy") {
        recommendations.push(`Investigate ${queueName} queue failures`);
      }
    });

    return recommendations;
  }

  private cleanupOldJobMetrics(): void {
    const now = Date.now();
    const cutoffTime = now - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [jobId, metric] of this.jobMetrics.entries()) {
      if (metric.timestamp.getTime() < cutoffTime) {
        this.jobMetrics.delete(jobId);
      }
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldJobMetrics();
    }, this.CLEANUP_INTERVAL_MS);
  }

  public static _resetForTests() {
    if (SystemMonitor.instance) {
      SystemMonitor.instance.jobMetrics?.clear?.();
      SystemMonitor.instance.queueMetrics?.clear?.();
      // Reset other state if needed
    }
    SystemMonitor.instance = undefined as unknown as SystemMonitor;
  }
}

// Export singleton instance
export const systemMonitor = SystemMonitor.getInstance();
