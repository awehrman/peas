// ============================================================================
// WORKER METRICS
// ============================================================================

export interface WorkerMetrics {
  workerId: string;
  queueName: string;
  jobsProcessed: number;
  jobsFailed: number;
  averageProcessingTime: number;
  lastJobTime: Date;
  uptime: number;
}

export interface QueueMetrics {
  queueName: string;
  jobCount: number;
  waitingCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  averageWaitTime: number;
  averageProcessingTime: number;
}

export interface SystemMetrics {
  totalWorkers: number;
  totalQueues: number;
  totalJobsProcessed: number;
  totalJobsFailed: number;
  systemUptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

export class MetricsCollector {
  private static instance: MetricsCollector;
  private workerMetrics: Map<string, WorkerMetrics> = new Map();
  private queueMetrics: Map<string, QueueMetrics> = new Map();
  private systemMetrics: SystemMetrics = {
    totalWorkers: 0,
    totalQueues: 0,
    totalJobsProcessed: 0,
    totalJobsFailed: 0,
    systemUptime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
  };

  private constructor() {
    // Prevent direct instantiation
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public updateWorkerMetrics(metrics: WorkerMetrics): void {
    this.workerMetrics.set(metrics.workerId, metrics);
    this.updateSystemMetrics();
  }

  public updateQueueMetrics(metrics: QueueMetrics): void {
    this.queueMetrics.set(metrics.queueName, metrics);
    this.updateSystemMetrics();
  }

  public getWorkerMetrics(workerId: string): WorkerMetrics | undefined {
    return this.workerMetrics.get(workerId);
  }

  public getAllWorkerMetrics(): WorkerMetrics[] {
    return Array.from(this.workerMetrics.values());
  }

  public getQueueMetrics(queueName: string): QueueMetrics | undefined {
    return this.queueMetrics.get(queueName);
  }

  public getAllQueueMetrics(): QueueMetrics[] {
    return Array.from(this.queueMetrics.values());
  }

  public getSystemMetrics(): SystemMetrics {
    return { ...this.systemMetrics };
  }

  private updateSystemMetrics(): void {
    const workers = this.getAllWorkerMetrics();
    const queues = this.getAllQueueMetrics();

    this.systemMetrics = {
      totalWorkers: workers.length,
      totalQueues: queues.length,
      totalJobsProcessed: workers.reduce((sum, w) => sum + w.jobsProcessed, 0),
      totalJobsFailed: workers.reduce((sum, w) => sum + w.jobsFailed, 0),
      systemUptime: Date.now() - process.uptime() * 1000,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: process.cpuUsage().user / 1000000, // seconds
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const metricsCollector = MetricsCollector.getInstance(); 