/**
 * Shared constants for workers
 */
export const WORKER_CONSTANTS = {
  // Status contexts
  STATUS_CONTEXTS: {
    IMPORT_COMPLETE: "import_complete",
    SAVE_NOTE_START: "save_note_start",
    SAVE_NOTE_COMPLETE: "save_note_complete",
    PARSE_HTML_INGREDIENTS: "parse_html_ingredients",
    PARSE_HTML_INSTRUCTIONS: "parse_html_instructions",
    PROCESSING: "processing",
    ERROR: "error",
  },

  // Indent levels for status messages
  INDENT_LEVELS: {
    TOP_LEVEL: 0,
    MAIN_OPERATION: 1,
    SUB_OPERATION: 2,
  },

  // Default timeouts and retries
  DEFAULTS: {
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
    BACKOFF_MS: 1000,
    MAX_BACKOFF_MS: 10000,
  },

  // Emojis for status messages
  EMOJIS: {
    SUCCESS: "✅",
    PROCESSING: "⏳",
    ERROR: "❌",
    WARNING: "⚠️",
  },

  // Parse statuses
  PARSE_STATUSES: {
    CORRECT: "COMPLETED_SUCCESSFULLY",
    INCORRECT: "COMPLETED_SUCCESSFULLY",
    ERROR: "COMPLETED_WITH_ERROR",
  },
} as const;

/**
 * Type-safe access to constants
 */
export type StatusContext =
  (typeof WORKER_CONSTANTS.STATUS_CONTEXTS)[keyof typeof WORKER_CONSTANTS.STATUS_CONTEXTS];
export type ParseStatus =
  (typeof WORKER_CONSTANTS.PARSE_STATUSES)[keyof typeof WORKER_CONSTANTS.PARSE_STATUSES];
export type IndentLevel =
  (typeof WORKER_CONSTANTS.INDENT_LEVELS)[keyof typeof WORKER_CONSTANTS.INDENT_LEVELS];
