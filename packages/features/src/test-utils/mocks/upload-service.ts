import { vi } from "vitest";

import type {
  ImportUploadResult,
  UploadProgress,
} from "../../import/services/upload-service";
import type { FileGroup } from "../../import/validation/file-validation";

// Mock implementation of UploadService
export const mockUploadService = {
  uploadFileGroup: vi.fn(),
  getUploadEndpoint: vi.fn(() => "http://localhost:3000/api/upload"),
};

// Helper to create successful upload response
export const createSuccessfulUploadResponse = (
  importId = "test-import-1"
): ImportUploadResult => ({
  totalFiles: 3,
  htmlFiles: 1,
  imageFiles: 2,
  errors: [],
  importId,
});

// Helper to create failed upload response
export const createFailedUploadResponse = (
  errors = ["Upload failed"]
): ImportUploadResult => ({
  totalFiles: 0,
  htmlFiles: 0,
  imageFiles: 0,
  errors,
  importId: "",
});

// Helper to simulate upload progress
export const simulateUploadProgress = (
  onProgress: (progress: UploadProgress) => void,
  importId = "test-import-1",
  shouldFail = false
) => {
  // Simulate progress updates
  setTimeout(() => {
    onProgress({
      importId,
      status: "uploading",
      progress: 25,
      message: "Uploading files...",
    });
  }, 100);

  setTimeout(() => {
    onProgress({
      importId,
      status: "uploading",
      progress: 50,
      message: "Processing files...",
    });
  }, 200);

  setTimeout(() => {
    onProgress({
      importId,
      status: "uploading",
      progress: 75,
      message: "Almost done...",
    });
  }, 300);

  setTimeout(() => {
    if (shouldFail) {
      onProgress({
        importId,
        status: "failed",
        progress: 0,
        error: "Upload failed",
      });
    } else {
      onProgress({
        importId,
        status: "completed",
        progress: 100,
        message: "Upload completed successfully",
      });
    }
  }, 400);
};

// Mock fetch responses for different scenarios
export const mockFetchResponses = {
  success: {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(createSuccessfulUploadResponse()),
  },
  serverError: {
    ok: false,
    status: 500,
    json: vi.fn().mockResolvedValue({ error: "Internal server error" }),
  },
  networkError: {
    ok: false,
    status: 0,
    json: vi.fn().mockRejectedValue(new Error("Network error")),
  },
  timeout: {
    ok: false,
    status: 408,
    json: vi.fn().mockResolvedValue({ error: "Request timeout" }),
  },
};

// Setup mock for UploadService
export const setupUploadServiceMock = (
  scenario: "success" | "failure" | "network-error" = "success"
) => {
  mockUploadService.uploadFileGroup.mockImplementation(
    async (
      fileGroup: FileGroup,
      onProgress: (progress: UploadProgress) => void
    ) => {
      return new Promise((resolve, reject) => {
        if (scenario === "network-error") {
          reject(new Error("Network error"));
          return;
        }

        simulateUploadProgress(
          onProgress,
          fileGroup.importId,
          scenario === "failure"
        );

        setTimeout(() => {
          if (scenario === "failure") {
            resolve(createFailedUploadResponse(["Upload failed"]));
          } else {
            resolve(createSuccessfulUploadResponse(fileGroup.importId));
          }
        }, 500);
      });
    }
  );
};
