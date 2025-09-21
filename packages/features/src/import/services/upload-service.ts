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

export class UploadService {
  private static getUploadEndpoint(): string {
    // Use environment variable if available
    if (process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT) {
      return process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT;
    }

    // Fallback to relative API route in browser
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/upload`;
    }

    // Server-side fallback
    return "http://localhost:4200/upload";
  }

  /**
   * Upload a group of files (HTML + associated images) to the queue
   */
  static async uploadFileGroup(
    group: FileGroup,
    onProgress?: (progress: UploadProgressData) => void
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

    try {
      // Report upload start
      onProgress?.({
        importId: group.importId,
        status: "uploading",
        progress: 0,
        message: "Starting upload...",
      });

      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(this.getUploadEndpoint(), {
        method: "POST",
        body: formData,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Upload failed with status ${response.status}`;
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
