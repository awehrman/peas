export * from "./error-handler";
export * from "./health-monitor";
export * from "./route-handler";

/**
 * Utility functions for common operations
 */

/**
 * Format log message with placeholders
 */
export function formatLogMessage(
  template: string,
  placeholders: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return placeholders[key]?.toString() || match;
  });
}

/**
 * Create standardized job options
 */
export async function createJobOptions(
  overrides?: Partial<
    typeof import("../config/constants").WORKER_CONSTANTS.DEFAULT_JOB_OPTIONS
  >
) {
  const { WORKER_CONSTANTS } = await import("../config/constants");
  return {
    ...WORKER_CONSTANTS.DEFAULT_JOB_OPTIONS,
    ...overrides,
  };
}

/**
 * Validate file exists and is readable
 */
export async function validateFile(
  filePath: string,
  fileName: string
): Promise<void> {
  const fs = await import("fs");

  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${fileName}`);
  }

  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    throw new Error(`Cannot read file: ${fileName}`);
  }
}

/**
 * Validate file content is not empty
 */
export function validateFileContent(content: string, fileName: string): void {
  if (!content || content.trim().length === 0) {
    throw new Error(`File is empty: ${fileName}`);
  }
}

/**
 * Get all HTML files from directory (excluding index file)
 */
export async function getHtmlFiles(
  directoryPath: string,
  excludeFiles: string[] = []
): Promise<string[]> {
  const fs = await import("fs");

  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory does not exist: ${directoryPath}`);
  }

  try {
    await fs.promises.access(directoryPath, fs.constants.R_OK);
  } catch {
    throw new Error(`Cannot read directory: ${directoryPath}`);
  }

  const files = await fs.promises.readdir(directoryPath);
  return files.filter(
    (file) => file.endsWith(".html") && !excludeFiles.includes(file)
  );
}

/**
 * Create standardized queue status response
 */
export function createQueueStatusResponse(
  waiting: unknown[],
  active: unknown[],
  completed: unknown[],
  failed: unknown[]
) {
  return {
    success: true,
    status: {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Measure execution time of an async function
 */
export async function measureExecutionTime<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;

  if (operationName) {
    console.log(`${operationName} completed in ${duration}ms`);
  }

  return { result, duration };
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Create a throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Check if value is a valid UUID
 */
export async function isValidUuid(value: string): Promise<boolean> {
  const { VALIDATION_CONSTANTS } = await import("../config/constants");
  return VALIDATION_CONSTANTS.PATTERNS.UUID.test(value);
}

/**
 * Generate a random UUID
 */
export async function generateUuid(): Promise<string> {
  const { randomUUID } = await import("crypto");
  return randomUUID();
}

/**
 * Truncate string to specified length
 */
export function truncateString(
  str: string,
  maxLength: number,
  suffix: string = "..."
): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a promise that rejects after timeout
 */
export function timeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`)
        );
      }, timeoutMs);
    }),
  ]);
}
