// Import Prisma types for better type safety
import type {
  ErrorCode,
  Note,
  NoteStatus,
  NoteStatusEvent,
  ParsedIngredientLine,
  ParsedInstructionLine,
  QueueJob,
  QueueJobStatus,
  QueueJobType,
} from "@peas/database";
import type { Queue } from "bullmq";

// Export common types
export * from "./types/common";

// ============================================================================
// BASE INTERFACES
// ============================================================================

/**
 * Base interface for all job data
 */
export interface BaseJobData {
  jobId?: string;
  noteId?: string;
  importId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================================
// CORE ENUMS
// ============================================================================

/**
 * All queue names in the system
 */
export enum QueueName {
  NOTE = "note",
  INGREDIENT = "ingredient",
  INSTRUCTION = "instruction",
  SOURCE = "source",
  IMAGE = "image",
  CATEGORIZATION = "categorization",
  PATTERN_TRACKING = "patternTracking",
}

/**
 * All action names in the system
 */
export enum ActionName {
  // Note actions
  CLEAN_HTML = "clean_html",
  PARSE_HTML = "parse_html",
  SAVE_NOTE = "save_note",
  SCHEDULE_ALL_FOLLOWUP_TASKS = "schedule_all_followup_tasks",
  SCHEDULE_IMAGES = "schedule_images",
  SCHEDULE_INSTRUCTION_LINES = "schedule_instruction_lines",
  SCHEDULE_INGREDIENT_LINES = "schedule_ingredient_lines",
  CHECK_DUPLICATES = "check_duplicates",

  // Ingredient actions
  PARSE_INGREDIENT_LINE = "parse_ingredient_line",
  SAVE_INGREDIENT_LINE = "save_ingredient_line",
  CHECK_INGREDIENT_COMPLETION = "check_ingredient_completion",
  INGREDIENT_COMPLETED_STATUS = "ingredient_completed_status",
  UPDATE_INGREDIENT_COUNT = "update_ingredient_count",
  SCHEDULE_CATEGORIZATION_AFTER_COMPLETION = "schedule_categorization_after_completion",

  // Instruction actions
  FORMAT_INSTRUCTION_LINE = "format_instruction_line",
  SAVE_INSTRUCTION_LINE = "save_instruction_line",
  CHECK_INSTRUCTION_COMPLETION = "check_instruction_completion",

  // Image actions
  PROCESS_IMAGE = "process_image",
  UPLOAD_ORIGINAL = "upload_original",
  SAVE_IMAGE = "save_image",
  IMAGE_COMPLETED_STATUS = "image_completed_status",

  // Categorization actions
  PROCESS_CATEGORIZATION = "process_categorization",
  SAVE_CATEGORIZATION = "save_categorization",
  CATEGORIZATION_COMPLETED_STATUS = "categorization_completed_status",
  TRACK_PATTERN = "track_pattern",
  COMPLETION_STATUS = "completion_status",

  // Source actions
  PROCESS_SOURCE = "process_source",
  SAVE_SOURCE = "save_source",
  SOURCE_PROCESSING_STATUS = "source_processing_status",
  SOURCE_COMPLETED_STATUS = "source_completed_status",
  BROADCAST_SOURCE_COMPLETED = "broadcast_source_completed",

  // Utility actions
  NO_OP = "no_op",
  VALIDATION = "validation",
  LOGGING = "logging",
  RETRY = "retry",
  RETRY_WRAPPER = "retry_wrapper",
  CIRCUIT_BREAKER = "circuit_breaker",
  ERROR_HANDLING = "error_handling",
  PROCESSING_STATUS = "processing_status",
  LOG_ERROR = "log_error",
  CAPTURE_ERROR = "capture_error",
  ERROR_RECOVERY = "error_recovery",
}

/**
 * Action categories for better organization
 */
export enum ActionCategory {
  NOTE = "note",
  INGREDIENT = "ingredient",
  INSTRUCTION = "instruction",
  IMAGE = "image",
  CATEGORIZATION = "categorization",
  SOURCE = "source",
}

/**
 * HTTP status codes for consistent response handling
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  PAYLOAD_TOO_LARGE = 413,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * Error types for consistent error handling
 */
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  REDIS_ERROR = "REDIS_ERROR",
  PARSING_ERROR = "PARSING_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  WORKER_ERROR = "WORKER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Standardized error codes for consistent error handling
 */
export enum AppErrorCode {
  // Validation errors
  VALIDATION_FAILED = "VALIDATION_FAILED",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_UUID = "INVALID_UUID",

  // Database errors
  DATABASE_CONNECTION_FAILED = "DATABASE_CONNECTION_FAILED",
  DATABASE_QUERY_FAILED = "DATABASE_QUERY_FAILED",
  DATABASE_TRANSACTION_FAILED = "DATABASE_TRANSACTION_FAILED",
  RECORD_NOT_FOUND = "RECORD_NOT_FOUND",
  DUPLICATE_RECORD = "DUPLICATE_RECORD",

  // Cache errors
  CACHE_OPERATION_FAILED = "CACHE_OPERATION_FAILED",
  CACHE_CONNECTION_FAILED = "CACHE_CONNECTION_FAILED",
  CACHE_KEY_NOT_FOUND = "CACHE_KEY_NOT_FOUND",

  // Parsing errors
  HTML_PARSING_FAILED = "HTML_PARSING_FAILED",
  INGREDIENT_PARSING_FAILED = "INGREDIENT_PARSING_FAILED",
  INSTRUCTION_PARSING_FAILED = "INSTRUCTION_PARSING_FAILED",
  FILE_PARSING_FAILED = "FILE_PARSING_FAILED",

  // Queue errors
  QUEUE_OPERATION_FAILED = "QUEUE_OPERATION_FAILED",
  JOB_PROCESSING_FAILED = "JOB_PROCESSING_FAILED",
  WORKER_STARTUP_FAILED = "WORKER_STARTUP_FAILED",
  QUEUE_CONNECTION_FAILED = "QUEUE_CONNECTION_FAILED",

  // Network errors
  NETWORK_TIMEOUT = "NETWORK_TIMEOUT",
  NETWORK_CONNECTION_FAILED = "NETWORK_CONNECTION_FAILED",
  EXTERNAL_API_FAILED = "EXTERNAL_API_FAILED",

  // System errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  ENVIRONMENT_ERROR = "ENVIRONMENT_ERROR",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Health status values
 */
export enum HealthStatus {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
}

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

/**
 * Map queue names to their allowed actions
 */
export const QUEUE_ACTIONS: Record<QueueName, ActionName[]> = {
  [QueueName.NOTE]: [
    ActionName.CLEAN_HTML,
    ActionName.PARSE_HTML,
    ActionName.SAVE_NOTE,
    ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS,
    ActionName.PROCESS_SOURCE,
    ActionName.PROCESS_IMAGE,
    ActionName.SCHEDULE_INGREDIENT_LINES,
    ActionName.SCHEDULE_INSTRUCTION_LINES,
  ],
  [QueueName.INGREDIENT]: [
    ActionName.SAVE_INGREDIENT_LINE,
    ActionName.SCHEDULE_INGREDIENT_LINES,
    ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION,
  ],
  [QueueName.INSTRUCTION]: [
    ActionName.FORMAT_INSTRUCTION_LINE,
    ActionName.SAVE_INSTRUCTION_LINE,
  ],
  [QueueName.IMAGE]: [ActionName.SAVE_IMAGE, ActionName.IMAGE_COMPLETED_STATUS],
  [QueueName.CATEGORIZATION]: [
    ActionName.PROCESS_CATEGORIZATION,
    ActionName.SAVE_CATEGORIZATION,
  ],
  [QueueName.SOURCE]: [ActionName.SAVE_SOURCE],
  [QueueName.PATTERN_TRACKING]: [ActionName.TRACK_PATTERN],
};

/**
 * Map actions to their categories
 */
export const ACTION_CATEGORIES: Record<ActionName, ActionCategory> = {
  // Note actions
  [ActionName.CLEAN_HTML]: ActionCategory.NOTE,
  [ActionName.PARSE_HTML]: ActionCategory.NOTE,
  [ActionName.SAVE_NOTE]: ActionCategory.NOTE,
  [ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS]: ActionCategory.NOTE,
  [ActionName.SCHEDULE_IMAGES]: ActionCategory.NOTE,
  [ActionName.CHECK_DUPLICATES]: ActionCategory.NOTE,

  // Ingredient actions
  [ActionName.PARSE_INGREDIENT_LINE]: ActionCategory.INGREDIENT,
  [ActionName.SAVE_INGREDIENT_LINE]: ActionCategory.INGREDIENT,
  [ActionName.CHECK_INGREDIENT_COMPLETION]: ActionCategory.INGREDIENT,
  [ActionName.INGREDIENT_COMPLETED_STATUS]: ActionCategory.INGREDIENT,
  [ActionName.UPDATE_INGREDIENT_COUNT]: ActionCategory.INGREDIENT,
  [ActionName.SCHEDULE_INGREDIENT_LINES]: ActionCategory.INGREDIENT,
  [ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION]:
    ActionCategory.INGREDIENT,

  // Instruction actions
  [ActionName.SCHEDULE_INSTRUCTION_LINES]: ActionCategory.INSTRUCTION,
  [ActionName.FORMAT_INSTRUCTION_LINE]: ActionCategory.INSTRUCTION,
  [ActionName.SAVE_INSTRUCTION_LINE]: ActionCategory.INSTRUCTION,
  [ActionName.CHECK_INSTRUCTION_COMPLETION]: ActionCategory.INSTRUCTION,

  // Image actions
  [ActionName.PROCESS_IMAGE]: ActionCategory.IMAGE,
  [ActionName.UPLOAD_ORIGINAL]: ActionCategory.IMAGE,
  [ActionName.SAVE_IMAGE]: ActionCategory.IMAGE,
  [ActionName.IMAGE_COMPLETED_STATUS]: ActionCategory.IMAGE,

  // Categorization actions
  [ActionName.PROCESS_CATEGORIZATION]: ActionCategory.CATEGORIZATION,
  [ActionName.SAVE_CATEGORIZATION]: ActionCategory.CATEGORIZATION,
  [ActionName.CATEGORIZATION_COMPLETED_STATUS]: ActionCategory.CATEGORIZATION,
  [ActionName.TRACK_PATTERN]: ActionCategory.CATEGORIZATION,
  [ActionName.COMPLETION_STATUS]: ActionCategory.CATEGORIZATION,

  // Source actions
  [ActionName.PROCESS_SOURCE]: ActionCategory.SOURCE,
  [ActionName.SAVE_SOURCE]: ActionCategory.SOURCE,
  [ActionName.SOURCE_PROCESSING_STATUS]: ActionCategory.SOURCE,
  [ActionName.SOURCE_COMPLETED_STATUS]: ActionCategory.SOURCE,
  [ActionName.BROADCAST_SOURCE_COMPLETED]: ActionCategory.SOURCE,

  // Utility actions
  [ActionName.NO_OP]: ActionCategory.NOTE,
  [ActionName.VALIDATION]: ActionCategory.NOTE,
  [ActionName.LOGGING]: ActionCategory.NOTE,
  [ActionName.RETRY]: ActionCategory.NOTE,
  [ActionName.RETRY_WRAPPER]: ActionCategory.NOTE,
  [ActionName.CIRCUIT_BREAKER]: ActionCategory.NOTE,
  [ActionName.ERROR_HANDLING]: ActionCategory.NOTE,
  [ActionName.PROCESSING_STATUS]: ActionCategory.NOTE,
  [ActionName.LOG_ERROR]: ActionCategory.NOTE,
  [ActionName.CAPTURE_ERROR]: ActionCategory.NOTE,
  [ActionName.ERROR_RECOVERY]: ActionCategory.NOTE,
};

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface JobError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  context?: Record<string, unknown>;
  originalError?: Error;
  timestamp: Date;
  jobId?: string;
  queueName?: string;
  retryCount?: number;
}

export interface ValidationError extends JobError {
  type: ErrorType.VALIDATION_ERROR;
  field?: string;
  value?: unknown;
}

export interface DatabaseError extends JobError {
  type: ErrorType.DATABASE_ERROR;
  operation?: string;
  table?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter?: boolean;
}

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

export interface ServiceHealth {
  status: HealthStatus;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    queues: Record<string, HealthCheck>;
  };
  timestamp: Date;
}

interface BaseHealthCheck {
  message?: string;
  lastChecked: Date;
}

export interface HealthyCheck extends BaseHealthCheck {
  status: HealthStatus.HEALTHY;
  responseTime?: number;
  performance?: number;
}

export interface DegradedCheck extends BaseHealthCheck {
  status: HealthStatus.DEGRADED;
  warnings: string[];
  performance: number;
  responseTime?: number;
  retryAfter?: number;
}

export interface UnhealthyCheck extends BaseHealthCheck {
  status: HealthStatus.UNHEALTHY;
  error: string;
  errorCode?: string;
  retryAfter?: number;
  critical?: boolean;
  responseTime?: number;
}

export type HealthCheck = HealthyCheck | DegradedCheck | UnhealthyCheck;

// ============================================================================
// LOGGING TYPES
// ============================================================================

/**
 * Structured logger interface for consistent logging across the application
 */
export interface StructuredLogger {
  log: (
    message: string,
    level?: LogLevel,
    meta?: Record<string, unknown>
  ) => void;
}

// ============================================================================
// QUEUE TYPES
// ============================================================================

export interface TypedQueue<JobData, Action extends string = string>
  extends Queue {
  add: (
    name: Action,
    data: JobData,
    opts?: Parameters<Queue["add"]>[2]
  ) => ReturnType<Queue["add"]>;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  uptime: number;
  totalWorkers: number;
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type {
  ParsedIngredientLine,
  ParsedInstructionLine,
  Note,
  NoteStatus,
  NoteStatusEvent,
  QueueJob,
  QueueJobStatus,
  QueueJobType,
  ErrorCode,
};
