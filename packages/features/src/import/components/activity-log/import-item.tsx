"use client";

import { ImportItem, ImportItemWithUploadProgress, UploadItem } from "./types";

import { ReactNode, memo } from "react";

import {
  formatTimestamp,
  getDisplayTitle,
  getStatusIcon,
  getStatusText,
} from "../utils/display-utils";

interface ImportItemProps {
  item: ImportItem | UploadItem | ImportItemWithUploadProgress;
  fileTitles: Map<string, string>;
}

export const ImportItemComponent = memo(function ImportItemComponent({
  item,
  fileTitles,
}: ImportItemProps): ReactNode {
  console.log("📊 [IMPORT_ITEM_COMPONENT] Rendering item:", {
    importId: item.importId,
    htmlFileName: item.htmlFileName,
    noteTitle: "noteTitle" in item ? item.noteTitle : undefined,
    status: item.status,
    type: item.type,
    fileTitlesSize: fileTitles.size,
  });

  // Handle upload items separately
  if ("imageCount" in item && item.type === "upload") {
    const uploadItem = item;
    const timestamp = formatTimestamp(uploadItem.createdAt);

    const getUploadStatusText = () => {
      switch (uploadItem.status) {
        case "uploading":
          return `Uploading ${uploadItem.htmlFileName}...`;
        case "uploaded":
          return `Uploaded ${uploadItem.htmlFileName} (${uploadItem.imageCount} images)`;
        case "failed":
          return `Failed to upload ${uploadItem.htmlFileName}`;
        default:
          return `Uploading ${uploadItem.htmlFileName}...`;
      }
    };

    const getUploadStatusIcon = () => {
      switch (uploadItem.status) {
        case "uploading":
          return "spinner";
        case "uploaded":
          return "✅";
        case "failed":
          return "❌";
        default:
          return "spinner";
      }
    };

    const statusIcon = getUploadStatusIcon();
    const statusText = getUploadStatusText();

    return (
      <div className="flex items-center space-x-3 p-3 border rounded">
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {statusIcon === "spinner" ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : (
            <div
              className={`text-lg ${
                uploadItem.status === "uploaded"
                  ? "text-green-600"
                  : uploadItem.status === "failed"
                    ? "text-red-600"
                    : "text-blue-600"
              }`}
            >
              {statusIcon}
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="flex-1">
          <div
            className={`font-medium ${
              uploadItem.status === "uploaded"
                ? "text-green-800"
                : uploadItem.status === "failed"
                  ? "text-red-800"
                  : "text-blue-800"
            }`}
          >
            {statusText}
          </div>
          {uploadItem.status === "uploaded" && (
            <div className="text-sm text-gray-600">Processing started...</div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-sm text-gray-500">{timestamp}</div>
      </div>
    );
  }

  // Handle import items (from WebSocket events)
  // Type guard to check if this is an import item
  const isImportItem = (
    item: ImportItem | UploadItem | ImportItemWithUploadProgress
  ): item is ImportItem | ImportItemWithUploadProgress => {
    return "noteTitle" in item && item.type === "import";
  };

  if (!isImportItem(item)) {
    // This should not happen given our logic, but handle gracefully
    console.warn("Unexpected item type in ImportItemComponent:", item);
    return null;
  }

  const importItem = item;
  const displayTitle = getDisplayTitle(importItem, fileTitles);
  const statusIcon = getStatusIcon(importItem.status);
  const statusText = getStatusText(importItem.status, displayTitle);
  const timestamp = formatTimestamp(
    importItem.completedAt || importItem.createdAt
  );

  // Check if this import item has upload progress information
  const hasUploadProgress =
    "uploadProgress" in importItem &&
    importItem.uploadProgress &&
    importItem.type === "import";

  return (
    <div className="flex items-center space-x-3 p-3 border rounded">
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {statusIcon === "spinner" ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        ) : (
          <div
            className={`text-lg ${
              importItem.status === "completed"
                ? "text-green-600"
                : importItem.status === "failed"
                  ? "text-red-600"
                  : "text-blue-600"
            }`}
          >
            {statusIcon}
          </div>
        )}
      </div>

      {/* Status Text */}
      <div className="flex-1">
        <div
          className={`font-medium ${
            importItem.status === "completed"
              ? "text-green-800"
              : importItem.status === "failed"
                ? "text-red-800"
                : "text-blue-800"
          }`}
        >
          {statusText}
        </div>
        {hasUploadProgress && importItem.uploadProgress && (
          <div className="text-sm text-gray-600">
            Uploaded {importItem.uploadProgress.htmlFileName} (
            {importItem.uploadProgress.imageCount} images)
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-sm text-gray-500">{timestamp}</div>
    </div>
  );
});
