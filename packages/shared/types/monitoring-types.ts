/**
 * Monitoring-specific types
 */

export interface MonitoringThreshold {
  warning: number;
  error: number;
  critical?: number;
}

export interface MonitoringAlert {
  id: string;
  type: "threshold" | "error" | "performance" | "custom";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: string;
  featureName: string;
  operation?: string;
  data?: Record<string, unknown>;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description?: string;
  features: string[];
  widgets: MonitoringWidget[];
  refreshInterval?: number; // in milliseconds
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringWidget {
  id: string;
  type: "metric" | "chart" | "alert" | "log";
  title: string;
  description?: string;
  config: Record<string, unknown>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MonitoringReport {
  id: string;
  title: string;
  description?: string;
  period: {
    start: string;
    end: string;
  };
  features: string[];
  metrics: MonitoringReportMetric[];
  summary: MonitoringReportSummary;
  generatedAt: string;
  generatedBy: string;
}

export interface MonitoringReportMetric {
  name: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  threshold?: MonitoringThreshold;
  status: "good" | "warning" | "error" | "critical";
}

export interface MonitoringReportSummary {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  errorRate: number;
  successRate: number;
  topFeatures: Array<{
    name: string;
    operations: number;
    errorRate: number;
    averageResponseTime: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
}

export interface MonitoringAlertRule {
  id: string;
  name: string;
  description?: string;
  condition: {
    metric: string;
    operator: "gt" | "lt" | "eq" | "gte" | "lte";
    value: number;
    duration: number; // in milliseconds
  };
  action: {
    type: "email" | "slack" | "webhook";
    config: Record<string, unknown>;
  };
  enabled: boolean;
  severity: "low" | "medium" | "high" | "critical";
}

export interface MonitoringLogEntry {
  id: string;
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  featureName: string;
  operation?: string;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface MonitoringHealthCheck {
  featureName: string;
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: Array<{
    name: string;
    status: "pass" | "fail";
    duration: number;
    message?: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
}

export interface MonitoringTrend {
  metric: string;
  featureName: string;
  values: Array<{
    timestamp: string;
    value: number;
  }>;
  trend: "up" | "down" | "stable";
  changePercent: number;
  period: {
    start: string;
    end: string;
  };
}

export const createMonitoringAlert = (
  type: MonitoringAlert["type"],
  severity: MonitoringAlert["severity"],
  message: string,
  featureName: string,
  data?: Record<string, unknown>
): MonitoringAlert => ({
  id: `${featureName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type,
  severity,
  message,
  timestamp: new Date().toISOString(),
  featureName,
  data,
  acknowledged: false,
});

export const createMonitoringLogEntry = (
  level: MonitoringLogEntry["level"],
  featureName: string,
  message: string,
  data?: Record<string, unknown>
): MonitoringLogEntry => ({
  id: `${featureName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date().toISOString(),
  level,
  featureName,
  message,
  data,
});

export const createMonitoringHealthCheck = (
  featureName: string,
  checks: MonitoringHealthCheck["checks"]
): MonitoringHealthCheck => {
  const total = checks.length;
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = total - passed;
  const duration = checks.reduce((sum, c) => sum + c.duration, 0);

  let status: MonitoringHealthCheck["status"];
  if (failed === 0) {
    status = "healthy";
  } else if (failed < total) {
    status = "degraded";
  } else {
    status = "unhealthy";
  }

  return {
    featureName,
    status,
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total,
      passed,
      failed,
      duration,
    },
  };
};
