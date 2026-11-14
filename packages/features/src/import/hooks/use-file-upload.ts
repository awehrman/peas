"use client";

import { useCallback, useState } from "react";

import { UPLOAD_ERROR_MESSAGES } from "../constants/upload-constants";
import { useQueueTokenProvider } from "../context/queue-auth";
import { useImportUpload } from "../context/upload/upload-provider";
import { UploadService } from "../services/upload-service";
import type { FileUploadItem } from "../types/import-types";
import { getUserErrorMessage, logError } from "../utils/error-utils";
import { expandArchives } from "../utils/expand-archives";
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
  const getQueueToken = useQueueTokenProvider();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectionSummary, setSelectionSummary] = useState<string | null>(null);
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
        directoryName: getGroupTitle(group),
      });

      // Upload the group to the queue
      try {
        const authToken = await getQueueToken?.();

        await UploadService.uploadFileGroup(
          group,
          (progress) => {
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
          },
          authToken
        );
      } catch (error) {
        logError(`Upload group ${group.importId}`, error);
        dispatch({
          type: "FAIL_BATCH",
          errorMessage: getUserErrorMessage(error),
        });
      }
    },
    [dispatch, getQueueToken]
  );

  const handleFilesChange = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setValidationError(null);
      setSelectionSummary(null);
      setIsProcessing(true);

      try {
        // Zipped exports are unpacked in the browser and grouped like folders
        const expandedFiles = await expandArchives(files);
        const validationResult = validateFileList(expandedFiles);
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

        const imageCount = groupingResult.groups.reduce(
          (total, group) => total + group.imageFiles.length,
          0
        );
        const skipped = groupingResult.ignoredFiles.length;
        setSelectionSummary(
          `Queuing ${groupingResult.groups.length} notes with ${imageCount} images` +
            (skipped > 0 ? ` (skipped ${skipped}: ${groupingResult.ignoredFiles.join(", ")})` : "")
        );

        // Every note gets a row right away, so totals stay fixed while uploads run
        const createdAt = new Date().toISOString();
        dispatch({
          type: "QUEUE_BATCHES",
          batches: groupingResult.groups.map((group) => ({
            importId: group.importId,
            createdAt,
            numberOfFiles: 1 + group.imageFiles.length,
            files: [],
            directoryName: getGroupTitle(group),
          })),
        });

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
    [processFileGroup, dispatch]
  );

  return {
    state,
    validationError,
    selectionSummary,
    isProcessing,
    handleFilesChange,
  };
}

type FileGroup = ReturnType<typeof groupFilesByHtmlAndImages>["groups"][number];

/** The note's file name without its folder or extension, used until the queue sends the real title. */
function getGroupTitle(group: FileGroup): string {
  const fileName = group.htmlFile.name.split("/").pop() ?? group.htmlFile.name;
  return fileName.replace(/\.(html|htm)$/i, "");
}
