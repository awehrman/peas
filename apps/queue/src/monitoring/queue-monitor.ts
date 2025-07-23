import { systemMonitor } from "./system-monitor";

import { Queue } from "bullmq";

// ============================================================================
// QUEUE MONITOR CLASS
// ============================================================================

/**
 * Queue monitor that tracks BullMQ queue metrics and integrates with SystemMonitor
 */
export class QueueMonitor {
  private static instance: QueueMonitor;
  private monitoredQueues: Map<string, Queue> = new Map();
  private monitoringIntervals: Map<string, ReturnType<typeof setInterval>> =
    new Map();
  private readonly MONITORING_INTERVAL_MS = 30000; // 30 seconds

  private constructor() {}

  public static getInstance(): QueueMonitor {
    if (!QueueMonitor.instance) {
      QueueMonitor.instance = new QueueMonitor();
    }
    return QueueMonitor.instance;
  }

  /**
   * Start monitoring a queue
   */
  public async startMonitoring(queue: Queue): Promise<void> {
    const queueName = queue.name;

    if (this.monitoredQueues.has(queueName)) {
      console.log(`Queue ${queueName} is already being monitored`);
      return;
    }

    this.monitoredQueues.set(queueName, queue);

    // Start periodic monitoring
    const interval = setInterval(async () => {
      await this.collectQueueMetrics(queueName);
    }, this.MONITORING_INTERVAL_MS);

    this.monitoringIntervals.set(queueName, interval);

    // Initial metrics collection
    await this.collectQueueMetrics(queueName);

    console.log(`Started monitoring queue: ${queueName}`);
  }

  /**
   * Stop monitoring a queue
   */
  public stopMonitoring(queueName: string): void {
    const interval = this.monitoringIntervals.get(queueName);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(queueName);
    }

    this.monitoredQueues.delete(queueName);
    console.log(`Stopped monitoring queue: ${queueName}`);
  }

  /**
   * Stop monitoring all queues
   */
  public stopAllMonitoring(): void {
    for (const [queueName] of this.monitoredQueues) {
      this.stopMonitoring(queueName);
    }
  }

  /**
   * Collect metrics for a specific queue
   */
  public async collectQueueMetrics(queueName: string): Promise<void> {
    try {
      const queue = this.monitoredQueues.get(queueName);
      if (!queue) {
        console.warn(`Queue ${queueName} not found in monitored queues`);
        return;
      }

      // Get queue job counts
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      const totalJobs =
        waiting.length + active.length + completed.length + failed.length;

      // Track metrics with SystemMonitor
      systemMonitor.trackQueueMetrics(
        queueName,
        totalJobs,
        waiting.length,
        active.length,
        completed.length,
        failed.length
      );

      // Log queue status
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[QUEUE] ${queueName}: ${waiting.length} waiting, ${active.length} active, ${completed.length} completed, ${failed.length} failed`
        );
      }
    } catch (error) {
      console.error(`Failed to collect metrics for queue ${queueName}:`, error);

      // Log system event for monitoring
      systemMonitor.logSystemEvent({
        type: "error_occurred",
        data: {
          component: "queue_monitor",
          status: "error",
          message: `Failed to collect metrics for queue ${queueName}`,
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get all monitored queue names
   */
  public getMonitoredQueues(): string[] {
    return Array.from(this.monitoredQueues.keys());
  }

  /**
   * Check if a queue is being monitored
   */
  public isMonitoring(queueName: string): boolean {
    return this.monitoredQueues.has(queueName);
  }

  /**
   * Get current monitoring status
   */
  public getMonitoringStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [queueName] of this.monitoredQueues) {
      status[queueName] = this.monitoringIntervals.has(queueName);
    }
    return status;
  }
}

// Export singleton instance
export const queueMonitor = QueueMonitor.getInstance();
