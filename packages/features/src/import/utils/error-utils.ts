/**
 * Error handling utilities for the import feature
 */

export interface ErrorDetails {
  message: string;
  code?: string;
  recoverable?: boolean;
  userMessage?: string;
}

/**
 * Standardizes error handling across the import feature
 */
export class ImportError extends Error {
  public readonly code?: string;
  public readonly recoverable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    options: {
      code?: string;
      recoverable?: boolean;
      userMessage?: string;
      cause?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "ImportError";
    this.code = options.code;
    this.recoverable = options.recoverable ?? false;
    this.userMessage = options.userMessage ?? message;

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Converts various error types to standardized ImportError
 */
export function normalizeError(error: unknown): ImportError {
  if (error instanceof ImportError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === "AbortError") {
      return new ImportError("Upload was cancelled", {
        code: "UPLOAD_CANCELLED",
        recoverable: true,
        userMessage: "Upload was cancelled. You can try uploading again.",
      });
    }

    if (error.message.includes("Failed to fetch")) {
      return new ImportError("Network connection failed", {
        code: "NETWORK_ERROR",
        recoverable: true,
        userMessage:
          "Network connection failed. Please check your internet connection and try again.",
        cause: error,
      });
    }

    if (error.message.includes("timeout")) {
      return new ImportError("Upload timed out", {
        code: "UPLOAD_TIMEOUT",
        recoverable: true,
        userMessage:
          "Upload timed out. Please try again with smaller files or better connection.",
        cause: error,
      });
    }

    // Generic error
    return new ImportError(error.message, {
      code: "UNKNOWN_ERROR",
      recoverable: false,
      userMessage: "An unexpected error occurred. Please try again.",
      cause: error,
    });
  }

  // Handle non-Error objects
  const message =
    typeof error === "string" ? error : "An unknown error occurred";
  return new ImportError(message, {
    code: "UNKNOWN_ERROR",
    recoverable: false,
    userMessage: "An unexpected error occurred. Please try again.",
    cause: error,
  });
}

/**
 * Logs errors with consistent formatting
 */
export function logError(context: string, error: unknown): void {
  const normalizedError = normalizeError(error);

  console.error(`[${context}]`, {
    message: normalizedError.message,
    code: normalizedError.code,
    recoverable: normalizedError.recoverable,
    userMessage: normalizedError.userMessage,
    cause: normalizedError.cause,
    stack: normalizedError.stack,
  });
}

/**
 * Gets user-friendly error message for display
 */
export function getUserErrorMessage(error: unknown): string {
  return normalizeError(error).userMessage;
}

/**
 * Checks if an error is recoverable (user can retry)
 */
export function isRecoverableError(error: unknown): boolean {
  return normalizeError(error).recoverable;
}
