import type { FileGroup } from "../validation/file-validation";

export interface ImportUploadResult {
  totalFiles: number;
  htmlFiles: number;
  imageFiles: number;
  errors: string[];
  importId: string;
}

export interface UploadProgress {
  importId: string;
  status: "uploading" | "completed" | "failed";
  progress: number; // 0-100
  message?: string;
  error?: string;
}

export class UploadService {
  private static readonly UPLOAD_ENDPOINT = "http://localhost:4200/upload";

  /**
   * Upload a group of files (HTML + associated images) to the queue
   */
  static async uploadFileGroup(
    group: FileGroup,
    onProgress?: (progress: UploadProgress) => void
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

      const response = await fetch(this.UPLOAD_ENDPOINT, {
        method: "POST",
        body: formData,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Upload failed with status ${response.status}`
        );
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
      let errorMessage = "Upload failed";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Upload timed out. Please try again.";
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      // Report upload failure
      onProgress?.({
        importId: group.importId,
        status: "failed",
        progress: 0,
        error: errorMessage,
      });

      throw new Error(errorMessage);
    }
  }

  /**
   * Upload multiple file groups sequentially
   */
  static async uploadFileGroups(
    groups: FileGroup[],
    onProgress?: (progress: UploadProgress) => void
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
