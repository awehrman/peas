// ============================================================================
// COMMON TYPES TO REPLACE Record<string, unknown>
// ============================================================================

/**
 * Metadata for jobs, actions, and operations
 */
export interface JobMetadata {
  /** Unique identifier for the job */
  jobId?: string;
  /** User who initiated the job */
  userId?: string;
  /** Import session identifier */
  importId?: string;
  /** Source of the job */
  source?: string;
  /** Priority level */
  priority?: number;
  /** Custom tags */
  tags?: string[];
  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * Context information for operations
 */
export interface OperationContext {
  /** Operation name */
  operation: string;
  /** Worker name */
  workerName?: string;
  /** Queue name */
  queueName?: string;
  /** Related note ID */
  noteId?: string;
  /** Related import ID */
  importId?: string;
  /** Timestamp of operation */
  timestamp: Date;
  /** Additional context data */
  [key: string]: unknown;
}

/**
 * Error context with specific fields
 */
export interface ErrorContext extends OperationContext {
  /** Error type */
  errorType: string;
  /** Error severity */
  severity: "low" | "medium" | "high" | "critical";
  /** Error code */
  errorCode?: string;
  /** Retry attempt number */
  attemptNumber?: number;
  /** Stack trace */
  stackTrace?: string;
}

/**
 * Status event data
 */
export interface StatusEventData {
  /** Event type */
  type?: string;
  /** Event message */
  message?: string;
  /** Event severity */
  severity?: "info" | "warn" | "error" | "critical";
  /** Related job ID */
  jobId?: string;
  /** Related note ID */
  noteId?: string;
  /** Related import ID */
  importId?: string;
  /** Event status */
  status?: string;
  /** Event context */
  context?: string;
  /** Progress percentage */
  progress?: number;
  /** Indent level for display */
  indentLevel?: number;
  /** Additional event data */
  metadata?: Record<string, unknown>;
  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * Database operation result
 */
export interface DatabaseResult {
  /** Success status */
  success: boolean;
  /** Affected record count */
  count?: number;
  /** Error message if failed */
  error?: string;
  /** Operation type */
  operation: string;
  /** Table name */
  table?: string;
  /** Additional result data */
  [key: string]: unknown;
}

/**
 * Queue operation data
 */
export interface QueueJobData {
  /** Job name */
  name: string;
  /** Job data */
  data: unknown;
  /** Job options */
  options?: {
    priority?: number;
    delay?: number;
    attempts?: number;
    timeout?: number;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
  /** Additional job metadata */
  [key: string]: unknown;
}

/**
 * Logger metadata
 */
export interface LoggerMetadata {
  /** Log level */
  level?: string;
  /** Component name */
  component?: string;
  /** Operation name */
  operation?: string;
  /** User ID */
  userId?: string;
  /** Request ID */
  requestId?: string;
  /** Additional log data */
  [key: string]: unknown;
}

/**
 * Configuration data
 */
export interface ConfigData {
  /** Configuration key */
  key: string;
  /** Configuration value */
  value: unknown;
  /** Environment */
  environment?: string;
  /** Configuration source */
  source?: string;
  /** Additional config data */
  [key: string]: unknown;
}

/**
 * Health check data
 */
export interface HealthCheckData {
  /** Service name */
  service: string;
  /** Health status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Response time in milliseconds */
  responseTime?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Additional health data */
  [key: string]: unknown;
}

/**
 * File metadata
 */
export interface FileMetadata {
  /** File name */
  filename: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimetype: string;
  /** File path */
  path?: string;
  /** File encoding */
  encoding?: string;
  /** Additional file data */
  [key: string]: unknown;
}

/**
 * Source information
 */
export interface SourceInfo {
  /** Source URL */
  url?: string;
  /** Source filename */
  filename?: string;
  /** Content type */
  contentType?: string;
  /** Source metadata */
  metadata?: JobMetadata;
}

/**
 * Processing options
 */
export interface ProcessingOptions {
  /** Skip parsing step */
  skipParsing?: boolean;
  /** Skip categorization step */
  skipCategorization?: boolean;
  /** Skip image processing */
  skipImageProcessing?: boolean;
  /** Skip source processing */
  skipSourceProcessing?: boolean;
  /** Additional options */
  [key: string]: unknown;
}
