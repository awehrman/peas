/**
 * Feature-level error handling system
 * Provides standardized error types and handling for features
 */

export interface FeatureErrorContext {
  featureName: string;
  operation: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface FeatureErrorOptions {
  context?: FeatureErrorContext;
  cause?: Error;
  retryable?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  code?: string;
  metadata?: Record<string, unknown>;
}

export class FeatureError extends Error {
  public readonly featureName: string;
  public readonly operation: string;
  public readonly timestamp: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly retryable: boolean;
  public readonly code?: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    featureName: string,
    operation: string,
    options: FeatureErrorOptions = {}
  ) {
    super(message);
    
    const {
      context,
      cause,
      retryable = false,
      severity = 'medium',
      code,
      metadata = {}
    } = options;

    this.name = 'FeatureError';
    this.featureName = featureName;
    this.operation = operation;
    this.timestamp = context?.timestamp || new Date().toISOString();
    this.severity = severity;
    this.retryable = retryable;
    this.code = code;
    this.metadata = {
      ...metadata,
      ...context?.metadata
    };

    if (cause) {
      this.cause = cause;
    }

    // Ensure proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FeatureError);
    }
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      featureName: this.featureName,
      operation: this.operation,
      timestamp: this.timestamp,
      severity: this.severity,
      retryable: this.retryable,
      code: this.code,
      metadata: this.metadata,
      stack: this.stack
    };
  }

  public static isFeatureError(error: unknown): error is FeatureError {
    return error instanceof FeatureError;
  }
}

export class ValidationError extends FeatureError {
  constructor(
    message: string,
    featureName: string,
    operation: string,
    options: FeatureErrorOptions = {}
  ) {
    super(message, featureName, operation, {
      ...options,
      severity: 'medium',
      retryable: false
    });
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends FeatureError {
  constructor(
    message: string,
    featureName: string,
    operation: string,
    options: FeatureErrorOptions = {}
  ) {
    super(message, featureName, operation, {
      ...options,
      severity: 'high',
      retryable: true
    });
    this.name = 'ProcessingError';
  }
}

export class ConnectionError extends FeatureError {
  constructor(
    message: string,
    featureName: string,
    operation: string,
    options: FeatureErrorOptions = {}
  ) {
    super(message, featureName, operation, {
      ...options,
      severity: 'high',
      retryable: true
    });
    this.name = 'ConnectionError';
  }
}

export class TimeoutError extends FeatureError {
  constructor(
    message: string,
    featureName: string,
    operation: string,
    options: FeatureErrorOptions = {}
  ) {
    super(message, featureName, operation, {
      ...options,
      severity: 'medium',
      retryable: true
    });
    this.name = 'TimeoutError';
  }
}

export function createFeatureError(
  message: string,
  featureName: string,
  operation: string,
  options: FeatureErrorOptions = {}
): FeatureError {
  return new FeatureError(message, featureName, operation, options);
}

export function createValidationError(
  message: string,
  featureName: string,
  operation: string,
  options: FeatureErrorOptions = {}
): ValidationError {
  return new ValidationError(message, featureName, operation, options);
}

export function createProcessingError(
  message: string,
  featureName: string,
  operation: string,
  options: FeatureErrorOptions = {}
): ProcessingError {
  return new ProcessingError(message, featureName, operation, options);
}

export function createConnectionError(
  message: string,
  featureName: string,
  operation: string,
  options: FeatureErrorOptions = {}
): ConnectionError {
  return new ConnectionError(message, featureName, operation, options);
}

export function createTimeoutError(
  message: string,
  featureName: string,
  operation: string,
  options: FeatureErrorOptions = {}
): TimeoutError {
  return new TimeoutError(message, featureName, operation, options);
}
