import { describe, expect, it } from "vitest";

import {
  createMockFileUploadItem,
  createMockUploadBatch,
} from "../../../test-utils/factories";
import {
  getUploadDescription,
  getUploadError,
  getUploadState,
} from "../upload-ui-helpers";

describe("upload-ui-helpers", () => {
  describe("getUploadState", () => {
    it("should return 'initial' when no batch and not processing", () => {
      const state = getUploadState(undefined, false);
      expect(state).toBe("initial");
    });

    it("should return 'uploading' when processing is true", () => {
      const state = getUploadState(undefined, true);
      expect(state).toBe("uploading");
    });

    it("should return 'uploading' when batch exists and processing", () => {
      const batch = createMockUploadBatch();
      const state = getUploadState(batch, true);
      expect(state).toBe("uploading");
    });

    it("should return 'uploading' when batch exists but not processing", () => {
      const batch = createMockUploadBatch();
      const state = getUploadState(batch, false);
      expect(state).toBe("uploading");
    });

    it("should return 'uploading' regardless of file status", () => {
      const batch = createMockUploadBatch({
        files: [
          createMockFileUploadItem({ status: "completed" }),
          createMockFileUploadItem({ status: "completed" }),
        ],
      });
      const state = getUploadState(batch, false);
      expect(state).toBe("uploading");
    });

    it("should return 'uploading' even with failed files", () => {
      const batch = createMockUploadBatch({
        files: [
          createMockFileUploadItem({ status: "completed" }),
          createMockFileUploadItem({ status: "failed" }),
        ],
      });
      const state = getUploadState(batch, false);
      expect(state).toBe("uploading");
    });

    it("should return 'uploading' with mixed file states", () => {
      const batch = createMockUploadBatch({
        files: [
          createMockFileUploadItem({ status: "pending" }),
          createMockFileUploadItem({ status: "uploading" }),
        ],
      });
      const state = getUploadState(batch, false);
      expect(state).toBe("uploading");
    });
  });

  describe("getUploadDescription", () => {
    it("should return correct description for initial state", () => {
      const description = getUploadDescription("initial");
      expect(description).toBe(
        "Select a directory containing HTML files with associated image folders (e.g., file.html + file/ folder)"
      );
    });

    it("should return correct description for uploading state", () => {
      const description = getUploadDescription("uploading");
      expect(description).toBe("Processing your files...");
    });

    it("should handle unknown states gracefully", () => {
      const description = getUploadDescription("unknown" as any);
      expect(description).toBe(
        "Select a directory containing HTML files with associated image folders (e.g., file.html + file/ folder)"
      );
    });
  });

  describe("getUploadError", () => {
    it("should return validation error when present", () => {
      const validationError = "Invalid file type";
      const error = getUploadError(validationError, undefined);
      expect(error).toBe("Invalid file type");
    });

    it("should return batch error when present", () => {
      const batch = createMockUploadBatch({
        errorMessage: "Upload failed",
      });
      const error = getUploadError(null, batch);
      expect(error).toBe("Upload failed");
    });

    it("should prioritize validation error over batch error", () => {
      const validationError = "Validation failed";
      const batch = createMockUploadBatch({
        errorMessage: "Upload failed",
      });
      const error = getUploadError(validationError, batch);
      expect(error).toBe("Validation failed");
    });

    it("should return undefined when no errors", () => {
      const error = getUploadError(null, undefined);
      expect(error).toBeUndefined();
    });

    it("should return undefined when batch has no error", () => {
      const batch = createMockUploadBatch();
      const error = getUploadError(null, batch);
      expect(error).toBeUndefined();
    });

    it("should handle empty string validation error", () => {
      const error = getUploadError("", undefined);
      expect(error).toBeUndefined(); // Empty string is falsy, so it returns undefined
    });

    it("should handle empty string batch error", () => {
      const batch = createMockUploadBatch({
        errorMessage: "",
      });
      const error = getUploadError(null, batch);
      expect(error).toBeUndefined(); // Empty string is falsy, so it returns undefined
    });

    it("should handle whitespace-only errors", () => {
      const validationError = "   ";
      const error = getUploadError(validationError, undefined);
      expect(error).toBe("   ");
    });
  });

  describe("integration scenarios", () => {
    it("should work together for complete upload flow", () => {
      // Start with initial state
      let state = getUploadState(undefined, false);
      let description = getUploadDescription(state);
      let error = getUploadError(null, undefined);

      expect(state).toBe("initial");
      expect(description).toBe(
        "Select a directory containing HTML files with associated image folders (e.g., file.html + file/ folder)"
      );
      expect(error).toBeUndefined();

      // Move to processing
      state = getUploadState(undefined, true);
      description = getUploadDescription(state);

      expect(state).toBe("uploading");
      expect(description).toBe("Processing your files...");

      // Move to uploading with batch
      const uploadingBatch = createMockUploadBatch({
        files: [
          createMockFileUploadItem({ status: "uploading", progress: 50 }),
        ],
      });
      state = getUploadState(uploadingBatch, true);
      description = getUploadDescription(state);

      expect(state).toBe("uploading");
      expect(description).toBe("Processing your files...");

      // Batch completed but still shows uploading (simplified state management)
      const completedBatch = createMockUploadBatch({
        files: [
          createMockFileUploadItem({ status: "completed", progress: 100 }),
        ],
      });
      state = getUploadState(completedBatch, false);
      description = getUploadDescription(state);

      expect(state).toBe("uploading"); // Still uploading state when batch exists
      expect(description).toBe("Processing your files...");
    });

    it("should handle error scenarios", () => {
      // Validation error
      let error = getUploadError("Invalid file format", undefined);
      expect(error).toBe("Invalid file format");

      // Batch failure
      const failedBatch = createMockUploadBatch({
        errorMessage: "Server error occurred",
      });
      const state = getUploadState(failedBatch, false);
      const description = getUploadDescription(state);
      error = getUploadError(null, failedBatch);

      expect(state).toBe("uploading"); // Still uploading when batch exists
      expect(description).toBe("Processing your files...");
      expect(error).toBe("Server error occurred");
    });

    it("should handle edge case combinations", () => {
      // Empty batch with processing
      const emptyBatch = createMockUploadBatch({ files: [] });
      const state = getUploadState(emptyBatch, true);

      expect(state).toBe("uploading"); // Should show uploading when batch exists

      // Batch with no files but error message
      const errorBatch = createMockUploadBatch({
        files: [],
        errorMessage: "No files to process",
      });
      const errorState = getUploadState(errorBatch, false);

      expect(errorState).toBe("uploading"); // Still uploading when batch exists
    });
  });
});
