import {
  SERVER_CONSTANTS,
  QUEUE_CONSTANTS,
  CACHE_CONSTANTS,
  WEBSOCKET_CONSTANTS,
  LOGGING_CONSTANTS,
  PROCESSING_CONSTANTS,
  METRICS_CONSTANTS,
  REDIS_CONSTANTS,
  RETRY_CONSTANTS,
} from "./constants";

/**
 * Default configuration values
 * These can be overridden by environment variables
 */

// ============================================================================
// SERVER DEFAULTS
// ============================================================================

export const SERVER_DEFAULTS = {
  /** HTTP port */
  PORT: SERVER_CONSTANTS.DEFAULT_PORT,
  /** WebSocket port */
  WS_PORT: SERVER_CONSTANTS.DEFAULT_WS_PORT,
  /** WebSocket host */
  WS_HOST: SERVER_CONSTANTS.DEFAULT_WS_HOST,
  /** WebSocket URL */
  WS_URL: SERVER_CONSTANTS.DEFAULT_WS_URL,
  /** Request size limit */
  REQUEST_SIZE_LIMIT: SERVER_CONSTANTS.REQUEST_SIZE_LIMIT,
  /** Graceful shutdown timeout */
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: SERVER_CONSTANTS.GRACEFUL_SHUTDOWN_TIMEOUT_MS,
} as const;

// ============================================================================
// QUEUE DEFAULTS
// ============================================================================

export const QUEUE_DEFAULTS = {
  /** Batch size for processing */
  BATCH_SIZE: QUEUE_CONSTANTS.DEFAULT_BATCH_SIZE,
  /** Maximum retries */
  MAX_RETRIES: QUEUE_CONSTANTS.DEFAULT_MAX_RETRIES,
  /** Backoff delay in milliseconds */
  BACKOFF_MS: QUEUE_CONSTANTS.DEFAULT_BACKOFF_MS,
  /** Maximum backoff delay in milliseconds */
  MAX_BACKOFF_MS: QUEUE_CONSTANTS.DEFAULT_MAX_BACKOFF_MS,
  /** Job attempts */
  JOB_ATTEMPTS: QUEUE_CONSTANTS.DEFAULT_JOB_ATTEMPTS,
  /** Worker concurrency */
  WORKER_CONCURRENCY: QUEUE_CONSTANTS.DEFAULT_WORKER_CONCURRENCY,
} as const;

// ============================================================================
// CACHE DEFAULTS
// ============================================================================

export const CACHE_DEFAULTS = {
  /** Default cache TTL in milliseconds */
  DEFAULT_TTL_MS: CACHE_CONSTANTS.DEFAULT_CACHE_TTL_MS,
  /** Action cache TTL in milliseconds */
  ACTION_TTL_MS: CACHE_CONSTANTS.ACTION_CACHE_TTL_MS,
} as const;

// ============================================================================
// WEBSOCKET DEFAULTS
// ============================================================================

export const WEBSOCKET_DEFAULTS = {
  /** Maximum number of clients */
  MAX_CLIENTS: WEBSOCKET_CONSTANTS.MAX_CLIENTS,
  /** Rate limit window in milliseconds */
  RATE_LIMIT_MS: WEBSOCKET_CONSTANTS.RATE_LIMIT_MS,
  /** Maximum messages per rate limit window */
  MAX_MESSAGES_PER_WINDOW: WEBSOCKET_CONSTANTS.MAX_MESSAGES_PER_WINDOW,
} as const;

// ============================================================================
// LOGGING DEFAULTS
// ============================================================================

export const LOGGING_DEFAULTS = {
  /** Maximum log file size in MB */
  MAX_LOG_SIZE_MB: LOGGING_CONSTANTS.DEFAULT_MAX_LOG_SIZE_MB,
  /** Log rotation size in MB */
  LOG_ROTATION_SIZE_MB: LOGGING_CONSTANTS.DEFAULT_LOG_ROTATION_SIZE_MB,
} as const;

// ============================================================================
// PROCESSING DEFAULTS
// ============================================================================

export const PROCESSING_DEFAULTS = {
  /** Image processing time in milliseconds */
  IMAGE_PROCESSING_TIME_MS:
    PROCESSING_CONSTANTS.DEFAULT_IMAGE_PROCESSING_TIME_MS,
  /** Instruction processing time in milliseconds */
  INSTRUCTION_PROCESSING_TIME_MS:
    PROCESSING_CONSTANTS.DEFAULT_INSTRUCTION_PROCESSING_TIME_MS,
  /** Image size limit in bytes */
  IMAGE_SIZE_LIMIT_BYTES: PROCESSING_CONSTANTS.DEFAULT_IMAGE_SIZE_LIMIT_BYTES,
  /** Image dimension limit */
  IMAGE_DIMENSION_LIMIT: PROCESSING_CONSTANTS.DEFAULT_IMAGE_DIMENSION_LIMIT,
  /** Minimum ingredient text length */
  MIN_INGREDIENT_TEXT_LENGTH: PROCESSING_CONSTANTS.MIN_INGREDIENT_TEXT_LENGTH,
  /** Minimum instruction text length */
  MIN_INSTRUCTION_TEXT_LENGTH: PROCESSING_CONSTANTS.MIN_INSTRUCTION_TEXT_LENGTH,
  /** Default prep time string */
  DEFAULT_PREP_TIME: PROCESSING_CONSTANTS.DEFAULT_PREP_TIME,
} as const;

// ============================================================================
// METRICS DEFAULTS
// ============================================================================

export const METRICS_DEFAULTS = {
  /** Maximum number of metrics to keep in memory */
  MAX_METRICS_VALUES: METRICS_CONSTANTS.MAX_METRICS_VALUES,
} as const;

// ============================================================================
// REDIS DEFAULTS
// ============================================================================

export const REDIS_DEFAULTS = {
  /** Redis port */
  PORT: REDIS_CONSTANTS.DEFAULT_PORT,
} as const;

// ============================================================================
// RETRY DEFAULTS
// ============================================================================

export const RETRY_DEFAULTS = {
  /** Maximum retry attempts */
  MAX_ATTEMPTS: RETRY_CONSTANTS.DEFAULT_MAX_ATTEMPTS,
  /** Base delay in milliseconds */
  BASE_DELAY_MS: RETRY_CONSTANTS.DEFAULT_BASE_DELAY_MS,
  /** Maximum delay in milliseconds */
  MAX_DELAY_MS: RETRY_CONSTANTS.DEFAULT_MAX_DELAY_MS,
} as const;
