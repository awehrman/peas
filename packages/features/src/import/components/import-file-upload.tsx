"use client";

import { UploadBatchHistory } from "./upload-batch-history";
import { UploadProgressDisplay } from "./upload-progress";

import React from "react";

import { FileDropZone } from "@peas/components";

import { useFileUpload } from "../hooks/use-file-upload";
import {
  getUploadDescription,
  getUploadError,
  getUploadState,
  getUploadTitle,
} from "../utils/upload-ui-helpers";

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
  const { state, validationError, isProcessing, handleFilesChange } =
    useFileUpload();

  const uploadState = getUploadState(state.currentBatch, isProcessing);
  const title = getUploadTitle(uploadState);
  const description = getUploadDescription(uploadState);
  const error = getUploadError(validationError, state.currentBatch);

  return (
    <div className={className}>
      <FileDropZone
        onFilesChange={handleFilesChange}
        multiple={true}
        allowDirectories={true}
        accept=".html,.htm,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp"
        disabled={disabled || isProcessing}
        title={title}
        description={description}
        error={error}
        isProcessing={isProcessing}
      />

      {/* Upload Progress */}
      {state.currentBatch && (
        <UploadProgressDisplay batch={state.currentBatch} />
      )}

      {/* Previous Batches */}
      <UploadBatchHistory batches={state.previousBatches} />
    </div>
  );
}
