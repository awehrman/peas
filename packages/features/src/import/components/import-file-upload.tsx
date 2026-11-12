"use client";

import { UploadBatchHistory } from "./upload-batch-history";

import React from "react";

import { FileDropZone, cn } from "@peas/components";

import { useFileUpload } from "../hooks/use-file-upload";
import {
  getUploadDescription,
  getUploadError,
  getUploadState,
} from "../utils/upload-ui-helpers";

/** Zipped exports, or individual notes and their images */
const ACCEPTED_FILES = ".zip,.html,.htm,image/*";

export interface ImportFileUploadProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether the upload is disabled */
  disabled?: boolean;
}

export function ImportFileUpload({
  className,
  disabled = false,
}: ImportFileUploadProps) {
  const { state, validationError, selectionSummary, isProcessing, handleFilesChange } =
    useFileUpload();

  const uploadState = getUploadState(state.currentBatch, isProcessing);
  const description = getUploadDescription(uploadState);
  const error = getUploadError(validationError, state.currentBatch);
  const hasHistory = state.previousBatches.length > 0 || state.currentBatch !== undefined;

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <div>
        <FileDropZone
          onFilesChange={handleFilesChange}
          multiple
          allowDirectories
          accept={ACCEPTED_FILES}
          disabled={disabled || isProcessing}
          description={description}
          error={error}
          isProcessing={isProcessing}
        />

        {selectionSummary ? (
          <p role="status" className="mt-3 text-sm text-greyscale-600">
            {selectionSummary}
          </p>
        ) : null}
      </div>

      {hasHistory ? (
        <UploadBatchHistory
          batches={state.previousBatches}
          currentBatch={state.currentBatch}
          className="mt-0"
        />
      ) : (
        <p className="hidden items-center justify-center rounded-lg border border-dashed border-greyscale-200 text-sm text-greyscale-500 md:flex">
          Uploaded notes will appear here
        </p>
      )}
    </div>
  );
}
