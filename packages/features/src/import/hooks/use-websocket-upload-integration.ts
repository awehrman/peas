import { useCallback } from "react";

import { useImportUpload } from "../context/upload/upload-provider";
import type { StatusEvent } from "../types/import-types";

/**
 * Hook to integrate WebSocket status updates with upload context
 * This connects real-time processing updates from the queue to the upload UI
 */
export function useWebSocketUploadIntegration() {
  const { dispatch } = useImportUpload();

  const handleStatusUpdate = useCallback(
    (statusEvent: StatusEvent) => {
      const { importId, status, progress, message } = statusEvent;

      // Update all files in the current batch that match this importId
      // Note: This is a simplified approach. In a production system, you might want
      // to maintain a mapping of importId to specific file IDs for more granular updates

      if (status === "processing_started" || status === "processing_progress") {
        // Update all files in the batch to uploading status
        // We'll use a special action to update all files in a batch
        dispatch({
          type: "UPDATE_BATCH_STATUS",
          importId,
          status: "uploading",
          progress: progress || 0,
        });
      } else if (status === "processing_completed") {
        // Mark all files as completed
        dispatch({
          type: "UPDATE_BATCH_STATUS",
          importId,
          status: "completed",
          progress: 100,
        });

        // Complete the batch
        dispatch({
          type: "COMPLETE_BATCH",
          successMessage: message || "Processing completed successfully",
        });
      } else if (status === "processing_failed") {
        // Mark all files as failed
        dispatch({
          type: "UPDATE_BATCH_STATUS",
          importId,
          status: "failed",
          error: message || "Processing failed",
        });

        // Fail the batch
        dispatch({
          type: "FAIL_BATCH",
          errorMessage: message || "Processing failed",
        });
      }
    },
    [dispatch]
  );

  return { handleStatusUpdate };
}
