import {
  ErrorType,
  ErrorSeverity,
  JobError,
  ValidationError,
  DatabaseError,
  RetryConfig,
} from "../types";

export class QueueError extends Error {
  public readonly jobError: JobError;

  constructor(jobError: JobError) {
    super(jobError.message);
    this.name = "QueueError";
    this.jobError = jobError;
  }
}

export class ErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
    maxBackoffMs: 30000,
  };

  /**
   * Create a job error with structured information
   */
  static createJobError(
    error: Error | string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, unknown>
  ): JobError {
    const message = typeof error === "string" ? error : error.message;

    return {
      type,
      severity,
      message,
      context,
      originalError: typeof error === "string" ? undefined : error,
      timestamp: new Date(),
    };
  }

  /**
   * Create a validation error
   */
  static createValidationError(
    message: string,
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>
  ): ValidationError {
    return {
      ...this.createJobError(
        message,
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.LOW,
        context
      ),
      field,
      value,
    } as ValidationError;
  }

  /**
   * Create a database error
   */
  static createDatabaseError(
    error: Error,
    operation?: string,
    table?: string,
    context?: Record<string, unknown>
  ): DatabaseError {
    return {
      ...this.createJobError(
        error,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH,
        context
      ),
      operation,
      table,
    } as DatabaseError;
  }

  /**
   * Determine if an error should be retried
   */
  static shouldRetry(
    error: JobError,
    retryCount: number,
    config?: Partial<RetryConfig>
  ): boolean {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };

    if (retryCount >= retryConfig.maxRetries) {
      return false;
    }

    // Don't retry validation errors
    if (error.type === ErrorType.VALIDATION_ERROR) {
      return false;
    }

    // Don't retry critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      return false;
    }

    return true;
  }

  /**
   * Calculate backoff delay for retries
   */
  static calculateBackoff(
    retryCount: number,
    config?: Partial<RetryConfig>
  ): number {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };

    const backoff =
      retryConfig.backoffMs *
      Math.pow(retryConfig.backoffMultiplier, retryCount);
    return Math.min(backoff, retryConfig.maxBackoffMs);
  }

  /**
   * Log error with structured format
   */
  static logError(
    error: JobError,
    additionalContext?: Record<string, unknown>
  ): void {
    const logData = {
      timestamp: error.timestamp.toISOString(),
      type: error.type,
      severity: error.severity,
      message: error.message,
      code: error.code,
      jobId: error.jobId,
      queueName: error.queueName,
      retryCount: error.retryCount,
      context: { ...error.context, ...additionalContext },
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error("🚨 CRITICAL ERROR:", JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.HIGH:
        console.error(
          "❌ HIGH SEVERITY ERROR:",
          JSON.stringify(logData, null, 2)
        );
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(
          "⚠️ MEDIUM SEVERITY ERROR:",
          JSON.stringify(logData, null, 2)
        );
        break;
      case ErrorSeverity.LOW:
        console.info(
          "ℹ️ LOW SEVERITY ERROR:",
          JSON.stringify(logData, null, 2)
        );
        break;
    }
  }

  /**
   * Handle and classify common errors
   */
  static classifyError(error: Error): JobError {
    const message = error.message.toLowerCase();

    // Database errors
    if (
      message.includes("database") ||
      message.includes("prisma") ||
      message.includes("sql")
    ) {
      return this.createJobError(
        error,
        ErrorType.DATABASE_ERROR,
        ErrorSeverity.HIGH
      );
    }

    // Redis errors
    if (message.includes("redis") || message.includes("connection")) {
      return this.createJobError(
        error,
        ErrorType.REDIS_ERROR,
        ErrorSeverity.HIGH
      );
    }

    // Network errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused")
    ) {
      return this.createJobError(
        error,
        ErrorType.NETWORK_ERROR,
        ErrorSeverity.MEDIUM
      );
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("timed out")) {
      return this.createJobError(
        error,
        ErrorType.TIMEOUT_ERROR,
        ErrorSeverity.MEDIUM
      );
    }

    // External service errors
    if (
      message.includes("api") ||
      message.includes("service") ||
      message.includes("http")
    ) {
      return this.createJobError(
        error,
        ErrorType.EXTERNAL_SERVICE_ERROR,
        ErrorSeverity.MEDIUM
      );
    }

    // Default to unknown error
    return this.createJobError(
      error,
      ErrorType.UNKNOWN_ERROR,
      ErrorSeverity.MEDIUM
    );
  }

  /**
   * Execute an operation with error handling
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const jobError = this.classifyError(error as Error);
      jobError.context = { ...jobError.context, ...context };
      this.logError(jobError);
      throw new QueueError(jobError);
    }
  }

  /**
   * Validate job data against required fields
   */
  static validateJobData<T extends Record<string, unknown>>(
    data: T,
    requiredFields: (keyof T)[]
  ): ValidationError | null {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return this.createValidationError(
          `Missing required field: ${String(field)}`,
          String(field),
          data[field]
        );
      }
    }
    return null;
  }
}

export function validateJobData(data: Record<string, unknown>) {
  if (!data || !data.note) {
    return {
      message: "Invalid job data: missing note",
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      timestamp: new Date(),
    };
  }
  return null;
}
