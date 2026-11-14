import { ImportError, logError, normalizeError } from "../utils/error-utils";
import type { FileGroup } from "../validation/file-validation";

export interface ImportUploadResult {
  totalFiles: number;
  htmlFiles: number;
  imageFiles: number;
  errors: string[];
  importId: string;
}

export interface UploadProgressData {
  importId: string;
  status: "uploading" | "completed" | "failed";
  progress: number; // 0-100
  message?: string;
  error?: string;
}

const UPLOAD_TIMEOUT_MS = 120_000;
const MAX_UPLOAD_ATTEMPTS = 5;
const MAX_RETRY_DELAY_MS = 60_000;
const RETRYABLE_STATUSES = new Set([429, 503]);

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Server-suggested wait (Retry-After header or retryAfter body), else backoff. */
async function getRetryDelayMs(response: Response, attempt: number): Promise<number> {
  const header = Number(response.headers.get("Retry-After"));
  const body = (await response.clone().json().catch(() => ({}))) as { retryAfter?: number };
  const seconds = Number.isFinite(header) && header > 0 ? header : body.retryAfter;
  const delay = seconds && seconds > 0 ? seconds * 1000 : 1000 * 2 ** (attempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

export class UploadService {
  private static getUploadEndpoint(): string {
    // Use environment variable if available
    if (process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT) {
      return process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT;
    }

    // Always use the queue service endpoint directly
    return "http://localhost:4200/upload";
  }

  /**
   * Upload a group of files (HTML + associated images) to the queue
   */
  static async uploadFileGroup(
    group: FileGroup,
    onProgress?: (progress: UploadProgressData) => void,
    authToken?: string
  ): Promise<ImportUploadResult> {
    const formData = new FormData();

    // Add the HTML file
    formData.append("files", group.htmlFile.file);

    // Add all associated image files
    group.imageFiles.forEach((imageFile) => {
      formData.append("files", imageFile.file);
    });

    // Set the import ID header
    const headers: Record<string, string> = {
      "x-import-id": group.importId,
    };

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    try {
      // Report upload start
      onProgress?.({
        importId: group.importId,
        status: "uploading",
        progress: 0,
        message: "Starting upload...",
      });

      let response: Response | undefined;
      for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

        response = await fetch(this.getUploadEndpoint(), {
          method: "POST",
          body: formData,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_UPLOAD_ATTEMPTS) {
          break;
        }

        const delayMs = await getRetryDelayMs(response, attempt);
        onProgress?.({
          importId: group.importId,
          status: "uploading",
          progress: 0,
          message: `Queue is busy; retrying in ${Math.ceil(delayMs / 1000)}s...`,
        });
        await wait(delayMs);
      }

      if (!response) {
        throw new Error("Upload did not start");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          response.status === 413
            ? `${group.htmlFile.name} and its images are too large to upload in one request`
            : errorData.error || `Upload failed with status ${response.status}`;
        throw new ImportError(errorMessage, {
          code: "UPLOAD_SERVER_ERROR",
          recoverable: response.status >= 500, // Server errors are potentially recoverable
          userMessage:
            response.status >= 500
              ? "Server error occurred. Please try again later."
              : errorMessage,
        });
      }

      const result: ImportUploadResult = await response.json();

      // Report upload completion
      onProgress?.({
        importId: group.importId,
        status: "completed",
        progress: 100,
        message: "Upload completed successfully",
      });

      return result;
    } catch (error) {
      const normalizedError = normalizeError(error);
      logError("UploadService.uploadFileGroup", error);

      // Report upload failure
      onProgress?.({
        importId: group.importId,
        status: "failed",
        progress: 0,
        error: normalizedError.userMessage,
      });

      throw normalizedError;
    }
  }

  /**
   * Upload multiple file groups sequentially
   */
  static async uploadFileGroups(
    groups: FileGroup[],
    onProgress?: (progress: UploadProgressData) => void
  ): Promise<ImportUploadResult[]> {
    const results: ImportUploadResult[] = [];

    for (const group of groups) {
      try {
        const result = await this.uploadFileGroup(group, onProgress);
        results.push(result);
      } catch (error) {
        // Continue with other groups even if one fails
        console.error(`Failed to upload group ${group.importId}:`, error);

        // Create a failed result for this group
        results.push({
          totalFiles: group.imageFiles.length + 1, // +1 for HTML file
          htmlFiles: 1,
          imageFiles: group.imageFiles.length,
          errors: [error instanceof Error ? error.message : "Upload failed"],
          importId: group.importId,
        });
      }
    }

    return results;
  }
}
