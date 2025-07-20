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
    IMAGE: "image_processing",
    INGREDIENT: "ingredient_processing",
    INSTRUCTION: "instruction_processing",
    CATEGORIZATION: "categorization_processing",
    SOURCE: "source_processing",
  },
  /** Job types */
  JOB_TYPES: {
    PROCESS_NOTE: "process-note",
    PROCESS_IMAGE: "process-image",
    PROCESS_INGREDIENT: "process-ingredient",
    PROCESS_INSTRUCTION: "process-instruction",
    PROCESS_CATEGORIZATION: "process-categorization",
    PROCESS_SOURCE: "process-source",
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
    IMAGE_PROCESSING_COMPLETED:
      "✅ Image processing completed: {processedUrl} ({width}x{height})",
    IMAGE_SAVED: "✅ Image saved successfully: {savedUrl}",
    IMAGE_DATABASE_UPDATED: "✅ Successfully updated note {noteId} with image",
    INGREDIENT_PARSING_COMPLETED: "✅ Ingredient parsing completed: {status}",
    INSTRUCTION_PARSING_COMPLETED: "✅ Instruction parsing completed: {status}",
    INSTRUCTION_DATABASE_UPDATED:
      "✅ Successfully updated instruction line {id}",
    INSTRUCTION_STEPS_CREATED:
      "✅ Successfully created {count} instruction steps",
    CATEGORIZATION_COMPLETED: "✅ Categorization completed: {categories}",
    CATEGORIZATION_DATABASE_UPDATED:
      "✅ Successfully updated note {noteId} with categories",
    CATEGORIZATION_TAGS_UPDATED:
      "✅ Successfully updated note {noteId} with tags",
    SOURCE_PROCESSING_COMPLETED: "✅ Source processing completed: {title}",
    SOURCE_SAVED: "✅ Source saved successfully: {id}",
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
    INGREDIENT_EMPTY_INPUT: "❌ Empty or whitespace-only input received",
    INGREDIENT_PARSER_NO_DATA: "❌ Parser returned no valid data",
    INGREDIENT_PARSING_FAILED: "❌ Ingredient parsing failed: {error}",
    INSTRUCTION_PARSING_FAILED: "❌ Instruction parsing failed: {error}",
    CATEGORIZATION_FAILED: "❌ Categorization failed: {error}",
    SOURCE_PROCESSING_FAILED: "❌ Source processing failed: {error}",
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
    IMAGE_PROCESSING_START: "🖼️ Processing image for note {noteId}",
    IMAGE_SAVING_START: "💾 Saving processed image: {processedUrl}",
    IMAGE_DATABASE_UPDATE:
      "🗄️ Updating note {noteId} with image URL: {imageUrl}",
    INGREDIENT_PARSING_START: "🥕 Parsing ingredient: {text}",
    INSTRUCTION_PARSING_START: "📝 Parsing instruction: {text}",
    INSTRUCTION_DATABASE_UPDATE:
      "🗄️ Updating instruction line {id} with data: {data}",
    INSTRUCTION_STEPS_CREATION: "📋 Creating {count} instruction steps",
    CATEGORIZATION_START: "🏷️ Categorizing recipe: {title}",
    CATEGORIZATION_DATABASE_UPDATE:
      "🗄️ Updating note {noteId} with categories: {categories}",
    CATEGORIZATION_TAGS_UPDATE: "🏷️ Updating note {noteId} with tags: {tags}",
    SOURCE_PROCESSING_START: "📚 Processing source for note {noteId}",
    SOURCE_SAVING_START: "💾 Saving source: {title}",
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
