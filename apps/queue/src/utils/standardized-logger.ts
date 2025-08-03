import { LogLevel, StructuredLogger } from "../types";

// ============================================================================
// STANDARDIZED LOGGER
// ============================================================================

/**
 * Standardized logger interface for consistent logging across the application
 */
export interface StandardizedLogger extends StructuredLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  fatal(message: string, context?: Record<string, unknown>): void;

  // Context-aware logging methods
  withContext(context: Record<string, unknown>): StandardizedLogger;
  withJob(jobId: string): StandardizedLogger;
  withNote(noteId: string): StandardizedLogger;
  withWorker(workerName: string): StandardizedLogger;
  withQueue(queueName: string): StandardizedLogger;
}

/**
 * Standardized logger implementation
 */
export class StandardizedLoggerImpl implements StandardizedLogger {
  private context: Record<string, unknown> = {};
  private baseLogger: StructuredLogger;

  constructor(baseLogger: StructuredLogger) {
    this.baseLogger = baseLogger;
  }

  log(message: string, level?: LogLevel, meta?: Record<string, unknown>): void {
    const enrichedMeta = { ...this.context, ...meta };
    this.baseLogger.log(message, level, enrichedMeta);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(message, LogLevel.DEBUG, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(message, LogLevel.INFO, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(message, LogLevel.WARN, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(message, LogLevel.ERROR, context);
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.log(message, LogLevel.FATAL, context);
  }

  withContext(context: Record<string, unknown>): StandardizedLogger {
    const newLogger = new StandardizedLoggerImpl(this.baseLogger);
    newLogger.context = { ...this.context, ...context };
    return newLogger;
  }

  withJob(jobId: string): StandardizedLogger {
    return this.withContext({ jobId });
  }

  withNote(noteId: string): StandardizedLogger {
    return this.withContext({ noteId });
  }

  withWorker(workerName: string): StandardizedLogger {
    return this.withContext({ workerName });
  }

  withQueue(queueName: string): StandardizedLogger {
    return this.withContext({ queueName });
  }
}

// ============================================================================
// LOGGER FACTORY
// ============================================================================

/**
 * Logger factory for creating standardized loggers
 */
export class LoggerFactory {
  private static instance: StandardizedLogger | null = null;
  private static baseLogger: StructuredLogger | null = null;

  static setBaseLogger(logger: StructuredLogger): void {
    LoggerFactory.baseLogger = logger;
    LoggerFactory.instance = null; // Reset instance to use new base logger
  }

  static getLogger(): StandardizedLogger {
    if (!LoggerFactory.instance) {
      if (!LoggerFactory.baseLogger) {
        // Fallback to console logger if no base logger is set
        LoggerFactory.baseLogger = {
          log: (
            message: string,
            level?: LogLevel,
            meta?: Record<string, unknown>
          ) => {
            const timestamp = new Date().toISOString();
            const levelStr = level ? `[${level.toUpperCase()}]` : "[INFO]";
            /* istanbul ignore next -- @preserve */
            const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
            console.log(`${timestamp} ${levelStr} ${message}${metaStr}`);
          },
        };
      }
      LoggerFactory.instance = new StandardizedLoggerImpl(
        LoggerFactory.baseLogger
      );
    }
    return LoggerFactory.instance;
  }

  static createLogger(context?: Record<string, unknown>): StandardizedLogger {
    const logger = LoggerFactory.getLogger();
    return context ? logger.withContext(context) : logger;
  }
}

// ============================================================================
// LOGGING CONSTANTS
// ============================================================================

export const LOG_MESSAGES = {
  // System messages
  SYSTEM: {
    STARTUP: "System startup initiated",
    SHUTDOWN: "System shutdown initiated",
    HEALTH_CHECK: "Health check performed",
    CONFIG_LOADED: "Configuration loaded successfully",
    CONFIG_ERROR: "Configuration error",
  },

  // Queue messages
  QUEUE: {
    JOB_ADDED: "Job added to queue",
    JOB_PROCESSED: "Job processed successfully",
    JOB_FAILED: "Job processing failed",
    JOB_RETRY: "Job retry initiated",
    QUEUE_EMPTY: "Queue is empty",
    QUEUE_ERROR: "Queue operation failed",
  },

  // Worker messages
  WORKER: {
    STARTED: "Worker started",
    STOPPED: "Worker stopped",
    IDLE: "Worker is idle",
    BUSY: "Worker is busy",
    ERROR: "Worker error occurred",
  },

  // Database messages
  DATABASE: {
    CONNECTED: "Database connected",
    DISCONNECTED: "Database disconnected",
    QUERY_SUCCESS: "Database query successful",
    QUERY_ERROR: "Database query failed",
    TRANSACTION_START: "Database transaction started",
    TRANSACTION_COMMIT: "Database transaction committed",
    TRANSACTION_ROLLBACK: "Database transaction rolled back",
  },

  // Cache messages
  CACHE: {
    HIT: "Cache hit",
    MISS: "Cache miss",
    SET: "Cache value set",
    DELETE: "Cache value deleted",
    CLEAR: "Cache cleared",
    ERROR: "Cache operation failed",
  },

  // Parsing messages
  PARSING: {
    STARTED: "Parsing started",
    COMPLETED: "Parsing completed",
    FAILED: "Parsing failed",
    INVALID_INPUT: "Invalid input for parsing",
  },

  // Validation messages
  VALIDATION: {
    PASSED: "Validation passed",
    FAILED: "Validation failed",
    INVALID_INPUT: "Invalid input provided",
    MISSING_REQUIRED: "Missing required field",
  },

  // Error messages
  ERROR: {
    UNEXPECTED: "Unexpected error occurred",
    VALIDATION: "Validation error",
    NETWORK: "Network error",
    TIMEOUT: "Operation timed out",
    PERMISSION: "Permission denied",
    NOT_FOUND: "Resource not found",
  },
} as const;

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Create a logger with common context
 */
export function createLogger(
  component: string,
  context?: Record<string, unknown>
): StandardizedLogger {
  return LoggerFactory.createLogger({ component, ...context });
}

/**
 * Create a job-specific logger
 */
export function createJobLogger(
  jobId: string,
  context?: Record<string, unknown>
): StandardizedLogger {
  return LoggerFactory.createLogger({ jobId, ...context });
}

/**
 * Create a worker-specific logger
 */
export function createWorkerLogger(
  workerName: string,
  context?: Record<string, unknown>
): StandardizedLogger {
  return LoggerFactory.createLogger({ workerName, ...context });
}

/**
 * Create a queue-specific logger
 */
export function createQueueLogger(
  queueName: string,
  context?: Record<string, unknown>
): StandardizedLogger {
  return LoggerFactory.createLogger({ queueName, ...context });
}

/**
 * Create a note-specific logger
 */
export function createNoteLogger(
  noteId: string,
  context?: Record<string, unknown>
): StandardizedLogger {
  return LoggerFactory.createLogger({ noteId, ...context });
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { StandardizedLogger as Logger };
export default LoggerFactory.getLogger;
