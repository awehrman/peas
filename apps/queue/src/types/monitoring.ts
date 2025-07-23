// ============================================================================
// MONITORING TYPES
// ============================================================================

/**
 * Job metrics data structure
 */
export interface JobMetrics {
  jobId: string;
  duration: number;
  success: boolean;
  queueName?: string;
  workerName?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Queue metrics data structure
 */
export interface QueueMetrics {
  queueName: string;
  jobCount: number;
  waitingCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
  timestamp: Date;
}

/**
 * System metrics summary
 */
export interface SystemMetrics {
  totalWorkers: number;
  totalQueues: number;
  totalJobsProcessed: number;
  totalJobsFailed: number;
  averageJobDuration: number;
  totalErrors: number;
  uptime: number;
  lastUpdated: Date;
  systemUptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

/**
 * Cache health information
 */
export interface CacheHealth {
  isConnected: boolean;
  hitRate: number;
  lastChecked: Date;
}

/**
 * Job health information
 */
export interface JobHealth {
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  metrics: SystemMetrics;
}

/**
 * Queue health information
 */
export interface QueueHealth {
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  metrics: QueueMetrics;
}

/**
 * Comprehensive health report
 */
export interface HealthReport {
  timestamp: Date;
  overallStatus: "healthy" | "degraded" | "unhealthy";
  systemHealth: {
    status: "healthy" | "degraded" | "unhealthy";
    checks: {
      database: import("../types").HealthCheck;
      redis: import("../types").HealthCheck;
      queues: Record<string, import("../types").HealthCheck>;
    };
    timestamp: Date;
  };
  performanceMetrics: import("../utils/metrics").PerformanceMetrics;
  queueHealth: Record<string, QueueHealth>;
  jobHealth: JobHealth;
  cacheHealth: CacheHealth;
  recommendations: string[];
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Base event interface
 */
export interface BaseEvent {
  type: string;
  timestamp: Date;
}

/**
 * Job event data
 */
export interface JobEventData {
  jobId: string;
  duration: number;
  success: boolean;
  queueName?: string;
  workerName?: string;
  error?: string;
}

/**
 * Job event
 */
export interface JobEvent extends BaseEvent {
  type: "job_processed" | "job_failed" | "job_started" | "job_completed";
  data: JobEventData;
}

/**
 * Worker event data
 */
export interface WorkerEventData {
  workerName: string;
  status: "started" | "stopped" | "idle" | "busy" | "error";
  queueName?: string;
  jobCount?: number;
  error?: string;
}

/**
 * Worker event
 */
export interface WorkerEvent extends BaseEvent {
  type:
    | "worker_started"
    | "worker_stopped"
    | "worker_status_changed"
    | "worker_error";
  data: WorkerEventData;
}

/**
 * System event data
 */
export interface SystemEventData {
  component: string;
  status: "healthy" | "degraded" | "unhealthy" | "error";
  message: string;
  error?: string;
}

/**
 * System event
 */
export interface SystemEvent extends BaseEvent {
  type:
    | "health_check"
    | "system_startup"
    | "system_shutdown"
    | "health_report_generated"
    | "error_occurred";
  data: SystemEventData;
}

// ============================================================================
// MONITORING CONFIGURATION
// ============================================================================

/**
 * Monitoring configuration options
 */
export interface MonitoringConfig {
  enabled: boolean;
  metricsRetentionHours: number;
  healthCheckIntervalMs: number;
  cleanupIntervalMs: number;
  maxMetricsHistory: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  metricsRetentionHours: 24,
  healthCheckIntervalMs: 30000, // 30 seconds
  cleanupIntervalMs: 300000, // 5 minutes
  maxMetricsHistory: 1000,
  logLevel: "info",
};
