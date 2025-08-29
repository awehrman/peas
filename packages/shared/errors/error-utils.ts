/**
 * Utility functions for error handling
 */
import { FeatureError, type FeatureErrorContext } from "./feature-error";

export interface ErrorHandlerOptions {
  featureName: string;
  operation: string;
  context?: Partial<FeatureErrorContext>;
  onError?: (error: FeatureError) => void;
  onRetry?: () => void;
  maxRetries?: number;
}

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  backoff: boolean;
}

export function handleError(
  error: unknown,
  options: ErrorHandlerOptions
): FeatureError {
  let featureError: FeatureError;

  if (FeatureError.isFeatureError(error)) {
    featureError = error as FeatureError;
  } else {
    const { featureName, operation, context } = options;
    const errorMessage = error instanceof Error ? error.message : String(error);

    featureError = new FeatureError(errorMessage, featureName, operation, {
      cause: error instanceof Error ? error : undefined,
      context: {
        featureName,
        operation,
        timestamp: new Date().toISOString(),
        ...context,
      },
    });
  }

  // Call error handler if provided
  if (options.onError) {
    options.onError(featureError);
  }

  return featureError;
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw handleError(error, options);
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: ErrorHandlerOptions & RetryOptions
): Promise<T> {
  const { maxRetries, delay, backoff, ...errorOptions } = options;
  let lastError: FeatureError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = handleError(error, {
        ...errorOptions,
        context: {
          ...errorOptions.context,
          metadata: {
            attempt: attempt + 1,
            maxRetries,
          },
        },
      });

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before next attempt
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
}

export function createErrorHandler(options: ErrorHandlerOptions) {
  return {
    handle: (error: unknown) => handleError(error, options),
    withHandling: <T>(operation: () => Promise<T>) =>
      withErrorHandling(operation, options),
    withRetry: <T>(operation: () => Promise<T>, retryOptions: RetryOptions) =>
      withRetry(operation, { ...options, ...retryOptions }),
  };
}

export function isRetryableError(error: unknown): boolean {
  if (FeatureError.isFeatureError(error)) {
    return error.retryable;
  }

  // Default retryable errors
  if (error instanceof Error) {
    const retryableErrors = [
      "Network Error",
      "Timeout",
      "Connection refused",
      "ECONNRESET",
      "ENOTFOUND",
    ];

    return retryableErrors.some((message) =>
      error.message.toLowerCase().includes(message.toLowerCase())
    );
  }

  return false;
}

export function getErrorSeverity(
  error: unknown
): "low" | "medium" | "high" | "critical" {
  if (FeatureError.isFeatureError(error)) {
    return error.severity;
  }

  // Default severity based on error type
  if (error instanceof Error) {
    if (error.name === "ValidationError") return "low";
    if (error.name === "TimeoutError") return "medium";
    if (error.name === "NetworkError") return "high";
    if (error.name === "TypeError" || error.name === "ReferenceError")
      return "critical";
  }

  return "medium";
}

export function formatErrorForLogging(error: unknown): Record<string, unknown> {
  if (FeatureError.isFeatureError(error)) {
    return error.toJSON();
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      severity: getErrorSeverity(error),
      retryable: isRetryableError(error),
    };
  }

  return {
    message: String(error),
    severity: "medium",
    retryable: false,
  };
}

export function suppressError(
  error: unknown,
  shouldSuppress: (error: unknown) => boolean
): void {
  if (!shouldSuppress(error)) {
    throw error;
  }

  console.warn("Suppressed error:", formatErrorForLogging(error));
}

export const errorUtils = {
  handleError,
  withErrorHandling,
  withRetry,
  createErrorHandler,
  isRetryableError,
  getErrorSeverity,
  formatErrorForLogging,
  suppressError,
};
