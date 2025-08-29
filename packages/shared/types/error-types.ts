/**
 * Error-specific types
 */

export interface ErrorContext {
  featureName: string;
  operation: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorOptions {
  context?: ErrorContext;
  cause?: Error;
  retryable?: boolean;
  severity?: "low" | "medium" | "high" | "critical";
  code?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorReport {
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    cause?: string;
  };
  context: ErrorContext;
  severity: "low" | "medium" | "high" | "critical";
  retryable: boolean;
  code?: string;
  metadata?: Record<string, unknown>;
  reportedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ErrorHandler {
  handle: (error: unknown, context?: ErrorContext) => void;
  report: (error: unknown, context?: ErrorContext) => ErrorReport;
  resolve: (errorId: string, resolvedBy?: string) => void;
  getReports: (filter?: {
    featureName?: string;
    severity?: "low" | "medium" | "high" | "critical";
    resolved?: boolean;
    since?: Date;
  }) => ErrorReport[];
}

export interface ErrorRecovery {
  retry: <T>(
    operation: () => Promise<T>,
    options?: {
      maxRetries?: number;
      delay?: number;
      backoff?: boolean;
      onRetry?: (attempt: number, error: Error) => void;
    }
  ) => Promise<T>;

  fallback: <T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ) => Promise<T>;

  circuitBreaker: <T>(
    operation: () => Promise<T>,
    options?: {
      failureThreshold?: number;
      recoveryTimeout?: number;
      expectedErrors?: string[];
    }
  ) => Promise<T>;
}

export interface ErrorLogger {
  log: (error: unknown, context?: ErrorContext) => void;
  warn: (message: string, context?: ErrorContext) => void;
  error: (error: unknown, context?: ErrorContext) => void;
  info: (message: string, context?: ErrorContext) => void;
  debug: (message: string, context?: ErrorContext) => void;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByFeature: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByType: Record<string, number>;
  averageResolutionTime: number;
  unresolvedErrors: number;
}

export interface ErrorTrend {
  period: {
    start: string;
    end: string;
  };
  errorCount: number;
  errorRate: number;
  topErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
  topFeatures: Array<{
    feature: string;
    count: number;
    percentage: number;
  }>;
}

export const createErrorContext = (
  featureName: string,
  operation: string,
  additional?: Partial<ErrorContext>
): ErrorContext => ({
  featureName,
  operation,
  timestamp: new Date().toISOString(),
  ...additional,
});

export const createErrorReport = (
  error: unknown,
  context?: ErrorContext
): ErrorReport => {
  let errorName = "UnknownError";
  let errorMessage = String(error);
  let errorStack: string | undefined;
  let errorCause: string | undefined;

  if (error instanceof Error) {
    errorName = error.name || "UnknownError";
    errorMessage = error.message;
    errorStack = error.stack || undefined;
    errorCause = error.cause instanceof Error ? error.cause.message : undefined;
  }

  return {
    id: `${context?.featureName || "unknown"}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    error: {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
      cause: errorCause,
    },
    context: context || createErrorContext("unknown", "unknown"),
    severity: "medium",
    retryable: false,
    metadata: {},
    reportedAt: new Date().toISOString(),
  };
};
