"use client";

import React, { useCallback, useState } from "react";

import { FileDropZone } from "@peas/components";

import {
  UPLOAD_ERROR_MESSAGES,
  UPLOAD_STATES,
} from "../constants/upload-constants";
import { useImportUpload } from "../context/upload/upload-provider";
import type { FileUploadItem } from "../types/import-types";
import {
  groupFilesByHtmlAndImages,
  validateFileList,
} from "../validation/file-validation";

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
  const { state, dispatch } = useImportUpload();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesChange = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setValidationError(null);
      setIsProcessing(true);

      try {
        // Validate files
        const validationResult = validateFileList(files);
        if (!validationResult.success) {
          const errorMessage = validationResult.error.issues
            .map((err: any) => err.message)
            .join(", ");
          setValidationError(errorMessage);
          setIsProcessing(false);
          return;
        }

        // Group files by HTML and associated images
        const groupingResult = groupFilesByHtmlAndImages(validationResult.data);
        if (!groupingResult.isValid) {
          setValidationError(groupingResult.errors.join(", "));
          setIsProcessing(false);
          return;
        }

        if (groupingResult.groups.length === 0) {
          setValidationError(UPLOAD_ERROR_MESSAGES.NO_FILES_SELECTED);
          setIsProcessing(false);
          return;
        }

        // Process each group (HTML file + associated images)
        for (const group of groupingResult.groups) {
          // Create file upload items
          const fileUploadItems: FileUploadItem[] = [
            {
              id: `html-${group.htmlFile.name}`,
              file: group.htmlFile.file,
              status: "pending",
              progress: 0,
            },
            ...group.imageFiles.map((imageFile) => ({
              id: `image-${imageFile.name}`,
              file: imageFile.file,
              status: "pending" as const,
              progress: 0,
            })),
          ];

          // Start batch for this group
          dispatch({
            type: "START_BATCH",
            importId: group.importId,
            createdAt: new Date().toISOString(),
            numberOfFiles: fileUploadItems.length,
          });

          // Add files to the batch
          dispatch({
            type: "ADD_FILES",
            files: fileUploadItems,
            directoryName: group.htmlFile.name.replace(/\.(html|htm)$/i, ""),
          });

          // TODO: Implement actual upload to /upload endpoint
          // For now, just mark as completed
          setTimeout(() => {
            dispatch({
              type: "COMPLETE_BATCH",
              successMessage: `Successfully uploaded ${group.htmlFile.name} with ${group.imageFiles.length} images`,
            });
          }, 1000);
        }

        setIsProcessing(false);
      } catch (error) {
        console.error("Error processing files:", error);
        setValidationError(
          "An unexpected error occurred while processing files"
        );
        setIsProcessing(false);
      }
    },
    [dispatch]
  );

  const getUploadState = () => {
    if (isProcessing) return UPLOAD_STATES.UPLOADING;
    if (state.currentBatch) return UPLOAD_STATES.UPLOADING;
    // Always return INITIAL when no current batch, regardless of previous batches
    return UPLOAD_STATES.INITIAL;
  };

  const getTitle = () => {
    const uploadState = getUploadState();
    switch (uploadState) {
      case UPLOAD_STATES.UPLOADING:
        return "Uploading files...";
      case UPLOAD_STATES.INITIAL:
      default:
        return "Import Files";
    }
  };

  const getDescription = () => {
    const uploadState = getUploadState();
    switch (uploadState) {
      case UPLOAD_STATES.UPLOADING:
        return "Processing your files...";
      case UPLOAD_STATES.INITIAL:
      default:
        return "Select a directory containing HTML files with associated image folders (e.g., file.html + file/ folder)";
    }
  };

  const getError = () => {
    if (validationError) return validationError;
    if (state.currentBatch?.errorMessage)
      return state.currentBatch.errorMessage;
    // Only show errors from current batch, not previous batches
    return undefined;
  };

  return (
    <div className={className}>
      <FileDropZone
        onFilesChange={handleFilesChange}
        multiple={true}
        allowDirectories={true}
        accept=".html,.htm,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp"
        disabled={disabled || isProcessing}
        title={getTitle()}
        description={getDescription()}
        error={getError()}
        isProcessing={isProcessing}
      />

      {/* Upload Progress */}
      {state.currentBatch && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">
            Uploading: {state.currentBatch.directoryName || "Files"}
          </h4>
          <div className="space-y-2">
            {state.currentBatch.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-blue-700">{file.file.name}</span>
                <span className="text-blue-600">
                  {file.status === "completed"
                    ? "✓"
                    : file.status === "failed"
                      ? "✗"
                      : file.status === "uploading"
                        ? "⏳"
                        : "⏸"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Batches */}
      {state.previousBatches.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="font-medium text-gray-900">Previous uploads:</h4>
          {state.previousBatches.map((batch, index) => (
            <div
              key={batch.importId}
              className={`p-3 rounded-lg border ${
                batch.errorMessage
                  ? "bg-red-50 border-red-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {batch.directoryName || `Upload ${index + 1}`}
                </span>
                <span className="text-sm">
                  {batch.errorMessage ? "Failed" : "Success"}
                </span>
              </div>
              {batch.successMessage && (
                <p className="text-sm text-green-700 mt-1">
                  {batch.successMessage}
                </p>
              )}
              {batch.errorMessage && (
                <p className="text-sm text-red-700 mt-1">
                  {batch.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
