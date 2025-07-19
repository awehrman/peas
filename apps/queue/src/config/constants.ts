/**
 * Application constants
 * Centralized location for all hardcoded values
 */

// ============================================================================
// SERVER CONSTANTS
// ============================================================================

export const SERVER_CONSTANTS = {
  /** Default HTTP port */
  DEFAULT_PORT: 4200,
  /** Default WebSocket port */
  DEFAULT_WS_PORT: 8080,
  /** Default WebSocket host */
  DEFAULT_WS_HOST: "localhost",
  /** Default WebSocket URL */
  DEFAULT_WS_URL: "ws://localhost:8080",
  /** Request size limit */
  REQUEST_SIZE_LIMIT: "10mb",
  /** Graceful shutdown timeout */
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: 10000,
  /** HTTP status codes */
  STATUS_CODES: {
    SERVICE_UNAVAILABLE: 503,
  },
} as const;

// ============================================================================
// QUEUE CONSTANTS
// ============================================================================

export const QUEUE_CONSTANTS = {
  /** Default batch size for processing */
  DEFAULT_BATCH_SIZE: 10,
  /** Default maximum retries */
  DEFAULT_MAX_RETRIES: 3,
  /** Default backoff delay in milliseconds */
  DEFAULT_BACKOFF_MS: 1000,
  /** Default maximum backoff delay in milliseconds */
  DEFAULT_MAX_BACKOFF_MS: 30000,
  /** Default job attempts */
  DEFAULT_JOB_ATTEMPTS: 3,
  /** Default worker concurrency */
  DEFAULT_WORKER_CONCURRENCY: 5,
} as const;

// ============================================================================
// CACHE CONSTANTS
// ============================================================================

export const CACHE_CONSTANTS = {
  /** Default cache TTL in milliseconds (5 minutes) */
  DEFAULT_CACHE_TTL_MS: 300000,
  /** Default cache TTL for action results */
  ACTION_CACHE_TTL_MS: 300000,
} as const;

// ============================================================================
// WEBSOCKET CONSTANTS
// ============================================================================

export const WEBSOCKET_CONSTANTS = {
  /** Maximum number of WebSocket clients */
  MAX_CLIENTS: 100,
  /** Rate limit window in milliseconds */
  RATE_LIMIT_MS: 1000,
  /** Maximum messages per rate limit window */
  MAX_MESSAGES_PER_WINDOW: 10,
} as const;

// ============================================================================
// LOGGING CONSTANTS
// ============================================================================

export const LOGGING_CONSTANTS = {
  /** Default maximum log file size in MB */
  DEFAULT_MAX_LOG_SIZE_MB: 10,
  /** Default log rotation size in MB */
  DEFAULT_LOG_ROTATION_SIZE_MB: 10,
} as const;

// ============================================================================
// PROCESSING CONSTANTS
// ============================================================================

export const PROCESSING_CONSTANTS = {
  /** Default image processing time in milliseconds */
  DEFAULT_IMAGE_PROCESSING_TIME_MS: 100,
  /** Default instruction processing time in milliseconds */
  DEFAULT_INSTRUCTION_PROCESSING_TIME_MS: 30,
  /** Default image size limit in bytes (100KB) */
  DEFAULT_IMAGE_SIZE_LIMIT_BYTES: 102400,
  /** Default image dimension limit */
  DEFAULT_IMAGE_DIMENSION_LIMIT: 1024,
  /** Minimum ingredient text length */
  MIN_INGREDIENT_TEXT_LENGTH: 3,
  /** Minimum instruction text length */
  MIN_INSTRUCTION_TEXT_LENGTH: 10,
  /** Default prep time string */
  DEFAULT_PREP_TIME: "30 minutes",
} as const;

// ============================================================================
// METRICS CONSTANTS
// ============================================================================

export const METRICS_CONSTANTS = {
  /** Maximum number of metrics to keep in memory */
  MAX_METRICS_VALUES: 100,
} as const;

// ============================================================================
// REDIS CONSTANTS
// ============================================================================

export const REDIS_CONSTANTS = {
  /** Default Redis port */
  DEFAULT_PORT: 6379,
} as const;

// ============================================================================
// RETRY CONSTANTS
// ============================================================================

export const RETRY_CONSTANTS = {
  /** Default maximum retry attempts */
  DEFAULT_MAX_ATTEMPTS: 3,
  /** Default base delay in milliseconds */
  DEFAULT_BASE_DELAY_MS: 1000,
  /** Default maximum delay in milliseconds */
  DEFAULT_MAX_DELAY_MS: 30000,
} as const;
