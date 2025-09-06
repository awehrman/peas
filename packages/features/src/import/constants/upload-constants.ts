/**
 * Constants for file upload functionality in the import feature
 */

// File upload limits
export const UPLOAD_LIMITS = {
  /** Maximum number of image files per upload */
  MAX_IMAGES: 500,
  /** Maximum file size per file in bytes (50MB) */
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  /** Maximum number of files per upload */
  MAX_FILES_PER_UPLOAD: 1000,
} as const;

// File type validation
export const SUPPORTED_FILE_TYPES = {
  /** HTML file extensions */
  HTML: [".html", ".htm"],
  /** Image file extensions */
  IMAGES: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"],
  /** MIME types for HTML files */
  HTML_MIME_TYPES: ["text/html"],
  /** MIME types for image files */
  IMAGE_MIME_TYPES: [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
  ],
} as const;

// File validation patterns
export const FILE_PATTERNS = {
  /** Pattern to match HTML files */
  HTML_FILE: /\.(html|htm)$/i,
  /** Pattern to match image files with extensions */
  IMAGE_FILE: /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i,
  /** Pattern to match files that should be ignored */
  IGNORE_PATTERN: /^index\.html$/i,
  /** Pattern to match system files that should be ignored */
  SYSTEM_FILES: /^(\.|__).*|.*\.(tmp|temp|log|cache)$/i,
} as const;

// Upload states
export const UPLOAD_STATES = {
  INITIAL: "initial",
  UPLOADING: "uploading",
  SUCCESS: "success",
  FAILED: "failed",
} as const;

// Error messages
export const UPLOAD_ERROR_MESSAGES = {
  INVALID_FILE_TYPE: "File must be HTML or image format",
  FILE_TOO_LARGE: "File size exceeds maximum limit",
  TOO_MANY_IMAGES: "Too many image files selected",
  TOO_MANY_FILES: "Too many files selected",
  NO_FILES_SELECTED: "No files selected",
  INVALID_DIRECTORY_STRUCTURE: "Invalid directory structure",
  INDEX_HTML_IGNORED:
    "index.html files without associated image directories are ignored",
} as const;

// WebSocket message types for upload status
export const WS_UPLOAD_MESSAGE_TYPES = {
  UPLOAD_STARTED: "upload_started",
  UPLOAD_PROGRESS: "upload_progress",
  UPLOAD_COMPLETED: "upload_completed",
  UPLOAD_FAILED: "upload_failed",
} as const;
