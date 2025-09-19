"use client";

import { useCallback, useState } from "react";

import { UPLOAD_ERROR_MESSAGES } from "../constants/upload-constants";
import { useImportUpload } from "../context/upload/upload-provider";
import { UploadService } from "../services/upload-service";
import type { FileUploadItem } from "../types/import-types";
import { getUserErrorMessage, logError } from "../utils/error-utils";
import {
  groupFilesByHtmlAndImages,
  validateFileList,
} from "../validation/file-validation";

/**
 * Custom hook for handling file upload logic
 * Separates upload processing from UI rendering
 */
export function useFileUpload() {
  const { state, dispatch } = useImportUpload();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFileGroup = useCallback(
    async (
      group: ReturnType<typeof groupFilesByHtmlAndImages>["groups"][0]
    ) => {
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

      // Upload the group to the queue
      try {
        await UploadService.uploadFileGroup(group, (progress) => {
          // Batch update all files in the group at once
          dispatch({
            type: "UPDATE_BATCH_STATUS",
            importId: group.importId,
            status:
              progress.status === "uploading"
                ? "uploading"
                : progress.status === "completed"
                  ? "completed"
                  : "failed",
            progress: progress.progress,
            error: progress.error,
          });

          // Complete or fail the batch based on progress
          if (progress.status === "completed") {
            dispatch({
              type: "COMPLETE_BATCH",
              successMessage: `Successfully uploaded ${group.htmlFile.name} with ${group.imageFiles.length} images`,
            });
          } else if (progress.status === "failed") {
            dispatch({
              type: "FAIL_BATCH",
              errorMessage: progress.error || "Upload failed",
            });
          }
        });
      } catch (error) {
        logError(`Upload group ${group.importId}`, error);
        dispatch({
          type: "FAIL_BATCH",
          errorMessage: getUserErrorMessage(error),
        });
      }
    },
    [dispatch]
  );

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
            .map((err) => err.message)
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
          await processFileGroup(group);
        }

        setIsProcessing(false);
      } catch (error) {
        logError("ImportFileUpload.handleFilesChange", error);
        setValidationError(getUserErrorMessage(error));
        setIsProcessing(false);
      }
    },
    [processFileGroup]
  );

  return {
    state,
    validationError,
    isProcessing,
    handleFilesChange,
  };
}
