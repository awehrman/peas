import { ErrorType, ErrorSeverity, AppErrorCode, LogLevel } from "../types";
import { createLogger } from "./standardized-logger";

// ============================================================================
// STANDARDIZED ERROR HANDLER
// ============================================================================

/**
 * Standardized error interface
 */
export interface StandardizedError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  code: AppErrorCode;
  context?: Record<string, unknown>;
  originalError?: Error;
  timestamp: Date;
  jobId?: string;
  queueName?: string;
  retryCount?: number;
}

/**
 * Error context for better error tracking
 */
export interface ErrorContext {
  operation?: string;
  component?: string;
  jobId?: string;
  noteId?: string;
  queueName?: string;
  workerName?: string;
  attemptNumber?: number;
  [key: string]: unknown;
}

/**
 * Error handling result
 */
export interface ErrorHandlingResult {
  handled: boolean;
  shouldRetry: boolean;
  retryAfter?: number;
  error: StandardizedError;
}

/**
 * Standardized error handler
 */
export class StandardizedErrorHandler {
  private logger = createLogger("ErrorHandler");

  /**
   * Create a standardized error from any error
   */
  createError(
    error: Error | string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code: AppErrorCode = AppErrorCode.INTERNAL_ERROR,
    context?: ErrorContext
  ): StandardizedError {
    const message = typeof error === "string" ? error : error.message;
    const originalError = typeof error === "string" ? new Error(error) : error;

    const standardizedError = new Error(message) as StandardizedError;
    standardizedError.type = type;
    standardizedError.severity = severity;
    standardizedError.code = code;
    standardizedError.context = context;
    standardizedError.originalError = originalError;
    standardizedError.timestamp = new Date();
    standardizedError.name = "StandardizedError";

    return standardizedError;
  }

  /**
   * Handle an error with standardized logging and recovery strategies
   */
  handleError(
    error: Error | StandardizedError,
    context?: ErrorContext
  ): ErrorHandlingResult {
    const standardizedError = this.isStandardizedError(error)
      ? error
      : this.createError(error, ErrorType.UNKNOWN_ERROR, ErrorSeverity.MEDIUM, AppErrorCode.INTERNAL_ERROR, context);

    // Log the error with appropriate level based on severity
    this.logError(standardizedError);

    // Determine if the error should trigger a retry
    const shouldRetry = this.shouldRetryError(standardizedError);
    const retryAfter = shouldRetry ? this.calculateRetryDelay(standardizedError) : undefined;

    return {
      handled: true,
      shouldRetry,
      retryAfter,
      error: standardizedError,
    };
  }

  /**
   * Handle errors in async operations with automatic error wrapping
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    errorType: ErrorType = ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const standardizedError = this.createError(
        error as Error,
        errorType,
        severity,
        this.mapErrorToCode(error as Error),
        context
      );

      const result = this.handleError(standardizedError, context);
      
      if (result.shouldRetry) {
        throw new Error(`Operation failed but should be retried: ${standardizedError.message}`);
      }

      throw standardizedError;
    }
  }

  /**
   * Classify an error based on its properties
   */
  classifyError(error: Error): ErrorType {
    if (error.name === "ValidationError") return ErrorType.VALIDATION_ERROR;
    if (error.name === "DatabaseError") return ErrorType.DATABASE_ERROR;
    if (error.name === "RedisError") return ErrorType.REDIS_ERROR;
    if (error.name === "NetworkError") return ErrorType.NETWORK_ERROR;
    if (error.name === "TimeoutError") return ErrorType.TIMEOUT_ERROR;
    if (error.message.includes("timeout")) return ErrorType.TIMEOUT_ERROR;
    if (error.message.includes("connection")) return ErrorType.NETWORK_ERROR;
    if (error.message.includes("validation")) return ErrorType.VALIDATION_ERROR;
    if (error.message.includes("database")) return ErrorType.DATABASE_ERROR;
    if (error.message.includes("redis")) return ErrorType.REDIS_ERROR;
    
    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Map error to appropriate error code
   */
  mapErrorToCode(error: Error): AppErrorCode {
    const type = this.classifyError(error);
    
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        return AppErrorCode.VALIDATION_FAILED;
      case ErrorType.DATABASE_ERROR:
        return AppErrorCode.DATABASE_QUERY_FAILED;
      case ErrorType.REDIS_ERROR:
        return AppErrorCode.CACHE_OPERATION_FAILED;
      case ErrorType.NETWORK_ERROR:
        return AppErrorCode.NETWORK_CONNECTION_FAILED;
      case ErrorType.TIMEOUT_ERROR:
        return AppErrorCode.NETWORK_TIMEOUT;
      case ErrorType.PARSING_ERROR:
        return AppErrorCode.HTML_PARSING_FAILED;
      default:
        return AppErrorCode.INTERNAL_ERROR;
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetryError(error: StandardizedError): boolean {
    // Don't retry critical errors
    if (error.severity === ErrorSeverity.CRITICAL) return false;

    // Don't retry validation errors
    if (error.type === ErrorType.VALIDATION_ERROR) return false;

    // Retry network and timeout errors
    if (error.type === ErrorType.NETWORK_ERROR || error.type === ErrorType.TIMEOUT_ERROR) return true;

    // Retry database connection errors but not query errors
    if (error.type === ErrorType.DATABASE_ERROR && error.message.includes("connection")) return true;

    // Retry Redis connection errors but not operation errors
    if (error.type === ErrorType.REDIS_ERROR && error.message.includes("connection")) return true;

    return false;
  }

  /**
   * Calculate retry delay based on error type and retry count
   */
  private calculateRetryDelay(error: StandardizedError): number {
    const baseDelay = 1000; // 1 second
    const retryCount = error.retryCount || 0;
    const maxDelay = 30000; // 30 seconds

    // Exponential backoff with jitter
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    const jitter = Math.random() * 0.1 * delay;

    return delay + jitter;
  }

  /**
   * Log error with appropriate level based on severity
   */
  private logError(error: StandardizedError): void {
    const logLevel = this.getLogLevelForSeverity(error.severity);
    const context = {
      type: error.type,
      severity: error.severity,
      code: error.code,
      timestamp: error.timestamp,
      ...error.context,
    };

    this.logger.log(error.message, logLevel, context);
  }

  /**
   * Get log level based on error severity
   */
  private getLogLevelForSeverity(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.LOW:
        return LogLevel.INFO;
      case ErrorSeverity.MEDIUM:
        return LogLevel.WARN;
      case ErrorSeverity.HIGH:
        return LogLevel.ERROR;
      case ErrorSeverity.CRITICAL:
        return LogLevel.FATAL;
      default:
        return LogLevel.ERROR;
    }
  }

  /**
   * Check if an error is already standardized
   */
  private isStandardizedError(error: Error | StandardizedError): error is StandardizedError {
    return 'type' in error && 'severity' in error && 'code' in error;
  }
}

// ============================================================================
// ERROR HANDLER INSTANCE
// ============================================================================

export const errorHandler = new StandardizedErrorHandler();

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Create an error with context
 */
export function createError(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN_ERROR,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  code: AppErrorCode = AppErrorCode.INTERNAL_ERROR,
  context?: ErrorContext
): StandardizedError {
  return errorHandler.createError(message, type, severity, code, context);
}

/**
 * Handle errors in async operations
 */
export function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  errorType: ErrorType = ErrorType.UNKNOWN_ERROR,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): Promise<T> {
  return errorHandler.withErrorHandling(operation, context, errorType, severity);
}

/**
 * Create a validation error
 */
export function createValidationError(
  message: string,
  field?: string,
  value?: unknown,
  context?: ErrorContext
): StandardizedError {
  return createError(
    message,
    ErrorType.VALIDATION_ERROR,
    ErrorSeverity.MEDIUM,
    AppErrorCode.VALIDATION_FAILED,
    { field, value, ...context }
  );
}

/**
 * Create a database error
 */
export function createDatabaseError(
  message: string,
  operation?: string,
  table?: string,
  context?: ErrorContext
): StandardizedError {
  return createError(
    message,
    ErrorType.DATABASE_ERROR,
    ErrorSeverity.HIGH,
    AppErrorCode.DATABASE_QUERY_FAILED,
    { operation, table, ...context }
  );
}

/**
 * Create a network error
 */
export function createNetworkError(
  message: string,
  context?: ErrorContext
): StandardizedError {
  return createError(
    message,
    ErrorType.NETWORK_ERROR,
    ErrorSeverity.MEDIUM,
    AppErrorCode.NETWORK_CONNECTION_FAILED,
    context
  );
}

/**
 * Create a timeout error
 */
export function createTimeoutError(
  message: string,
  timeoutMs?: number,
  context?: ErrorContext
): StandardizedError {
  return createError(
    message,
    ErrorType.TIMEOUT_ERROR,
    ErrorSeverity.MEDIUM,
    AppErrorCode.NETWORK_TIMEOUT,
    { timeoutMs, ...context }
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default errorHandler; 