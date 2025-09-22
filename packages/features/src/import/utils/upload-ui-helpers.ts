import { UPLOAD_STATES } from "../constants/upload-constants";
import type { UploadState } from "../types/import-types";

/**
 * Utility functions for upload UI state management
 */

export function getUploadState(
  currentBatch: UploadState["currentBatch"],
  isProcessing: boolean
): string {
  if (isProcessing) return UPLOAD_STATES.UPLOADING;
  if (currentBatch) return UPLOAD_STATES.UPLOADING;
  // Always return INITIAL when no current batch, regardless of previous batches
  return UPLOAD_STATES.INITIAL;
}

export function getUploadDescription(uploadState: string): string {
  switch (uploadState) {
    case UPLOAD_STATES.UPLOADING:
      return "Processing your files...";
    case UPLOAD_STATES.INITIAL:
    default:
      return "Select an Evernote export directory.";
  }
}

export function getUploadError(
  validationError: string | null,
  currentBatch: UploadState["currentBatch"]
): string | undefined {
  if (validationError) return validationError;
  if (currentBatch?.errorMessage) return currentBatch.errorMessage;
  // Only show errors from current batch, not previous batches
  return undefined;
}
