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
  /** Ingredient parser version to use ("v1" or "v2") */
  INGREDIENT_PARSER_VERSION: "v1" as "v1" | "v2",

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

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

export const SECURITY_CONSTANTS = {
  /** Rate limiting */
  RATE_LIMITS: {
    GLOBAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    GLOBAL_MAX_REQUESTS: 100,
    IMPORT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    IMPORT_MAX_REQUESTS: 50,
    API_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    API_MAX_REQUESTS: 200,
  },
  /** Request size limits */
  REQUEST_LIMITS: {
    MAX_REQUEST_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    MAX_IMPORT_REQUEST_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  },
  /** CORS settings */
  CORS: {
    ALLOWED_ORIGINS: ["http://localhost:3000", "http://localhost:4200"],
    ALLOWED_METHODS: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    ALLOWED_HEADERS: ["Content-Type", "Authorization", "X-Requested-With"],
  },
  /** Security headers */
  SECURITY_HEADERS: {
    CONTENT_TYPE_OPTIONS: "nosniff",
    FRAME_OPTIONS: "DENY",
    XSS_PROTECTION: "1; mode=block",
    REFERRER_POLICY: "strict-origin-when-cross-origin",
    CONTENT_SECURITY_POLICY:
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  },
} as const;

// ============================================================================
// HTTP CONSTANTS
// ============================================================================

export const HTTP_CONSTANTS = {
  /** HTTP status codes */
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
    TOO_MANY_REQUESTS: 429,
  },
  /** HTTP methods */
  METHODS: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
    DELETE: "DELETE",
    PATCH: "PATCH",
  },
  /** Common headers */
  HEADERS: {
    CONTENT_TYPE: "Content-Type",
    AUTHORIZATION: "Authorization",
    USER_AGENT: "User-Agent",
  },
} as const;

// ============================================================================
// WORKER CONSTANTS
// ============================================================================

export const WORKER_CONSTANTS = {
  /** Worker names */
  NAMES: {
    NOTE: "note_processing",
    INSTRUCTION: "instruction_processing",
    INGREDIENT: "ingredient_processing",
    IMAGE: "image_processing",
    PATTERN_TRACKING: "pattern_tracking",
  },
  /** Job types */
  JOB_TYPES: {
    PROCESS_NOTE: "process-note",
  },
  /** Default job options */
  DEFAULT_JOB_OPTIONS: {
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 2000,
    },
  },
} as const;

// ============================================================================
// FILE CONSTANTS
// ============================================================================

export const FILE_CONSTANTS = {
  /** File extensions */
  EXTENSIONS: {
    HTML: ".html",
    JSON: ".json",
    TXT: ".txt",
  },
  /** File size limits */
  SIZE_LIMITS: {
    MAX_HTML_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
    MAX_IMAGE_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  },
  /** Directory paths */
  PATHS: {
    PUBLIC_FILES: "/public/files",
    EVERNOTE_INDEX_FILE: "Evernote_index.html",
  },
} as const;

// ============================================================================
// LOGGING MESSAGES
// ============================================================================

export const LOG_MESSAGES = {
  /** Success messages */
  SUCCESS: {
    WORKER_STARTED: "✅ {workerName} worker created and started",
    WORKER_CLOSED: "✅ {workerName} worker closed successfully",
    QUEUE_CLOSED: "✅ {queueName} queue closed successfully",
    IMPORT_COMPLETED: "✅ Import completed in {duration}ms",
    FILE_QUEUED: "✅ Queued file: {fileName} with importId: {importId}",
    NOTE_HTML_PARSING_COMPLETED:
      "✅ HTML parsing completed: {contentLength} characters",
    NOTE_CREATION_COMPLETED: "✅ Note created successfully: {fileName}",
    NOTE_COMPLETION_TRACKER_CREATED:
      "✅ Completion tracker created for note {noteId}",
    NOTE_COMPLETION_TRACKER_UPDATED:
      "✅ Completion tracker updated for note {noteId}",
    NOTE_COMPLETION_TRACKER_INCREMENTED:
      "✅ Completion tracker incremented for note {noteId}",
    NOTE_COMPLETION_CHECKED:
      "✅ Completion status checked for note {noteId}: {isComplete}",
  },
  /** Error messages */
  ERROR: {
    WORKER_FAILED: "❌ Failed to create {workerName} worker: {error}",
    WORKER_ERROR: "❌ {workerName} worker error: {error}",
    FILE_FAILED: "❌ Failed to queue file {fileName}: {error}",
    IMPORT_FAILED: "❌ Import failed: {error}",
    GRACEFUL_SHUTDOWN_TIMEOUT: "❌ Forced shutdown after timeout",
  },
  /** Info messages */
  INFO: {
    GRACEFUL_SHUTDOWN_START:
      "🛑 Received {signal}, starting graceful shutdown...",
    CLOSING_WORKERS: "🔄 Closing workers...",
    CLOSING_QUEUES: "🔄 Closing queues...",
    SERVER_STARTED: "🚀 Queue service running at http://localhost:{port}",
    BULL_BOARD_AVAILABLE:
      "📊 Bull Board available at http://localhost:{port}/bull-board",
    HEALTH_CHECK_AVAILABLE:
      "❤️ Health check available at http://localhost:{port}/health",
    WEBSOCKET_STARTED: "🔌 WebSocket server running on port {port}",
    WORKERS_STARTED: "👷 All workers started successfully",
    HTTP_SERVER_CLOSED: "✅ HTTP server closed",
    NOTE_HTML_PARSING_START:
      "📄 Parsing HTML content: {contentLength} characters",
    NOTE_CREATION_START: "📝 Creating note: {fileName}",
    NOTE_COMPLETION_TRACKER_CREATION:
      "📊 Creating completion tracker for note {noteId}: {totalJobs} jobs",
    NOTE_COMPLETION_TRACKER_UPDATE:
      "📊 Updating completion tracker for note {noteId}: {completedJobs} completed",
    NOTE_COMPLETION_TRACKER_INCREMENT:
      "📊 Incrementing completion tracker for note {noteId}",
    NOTE_COMPLETION_CHECK: "📊 Checking completion status for note {noteId}",
  },
} as const;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_CONSTANTS = {
  /** Minimum lengths */
  MIN_LENGTHS: {
    INGREDIENT_TEXT: 3,
    INSTRUCTION_TEXT: 10,
    NOTE_CONTENT: 1,
  },
  /** Maximum lengths */
  MAX_LENGTHS: {
    NOTE_TITLE: 255,
    INGREDIENT_TEXT: 1000,
    INSTRUCTION_TEXT: 2000,
    SOURCE_URL: 500,
  },
  /** Regex patterns */
  PATTERNS: {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/.+/,
  },
} as const;
