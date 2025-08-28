"use client";

import { ImportItem, ImportItemWithUploadProgress, UploadItem } from "./types";

import React, { memo } from "react";

import {
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
}: ImportItemProps): React.ReactElement | null {
  // Handle upload items separately
  if ("imageCount" in item && item.type === "upload") {
    const uploadItem = item;

    const getUploadStatusText = () => {
      switch (uploadItem.status) {
        case "uploading":
          return `Uploading ${uploadItem.htmlFileName}...`;
        case "uploaded":
          return `Processing ${uploadItem.htmlFileName}...`;
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
          return "...";
        case "failed":
          return "❌";
        default:
          return "spinner";
      }
    };

    const getUploadBackgroundColor = () => {
      switch (uploadItem.status) {
        case "uploading":
          return "bg-gray-50"; // Grey for batched items waiting to be processed
        case "uploaded":
          return "bg-blue-50"; // Light blue for processing
        case "failed":
          return "bg-red-50"; // Light red for errors
        default:
          return "bg-gray-50";
      }
    };

    const statusIcon = getUploadStatusIcon();
    const statusText = getUploadStatusText();
    const backgroundColor = getUploadBackgroundColor();

    return (
      <div
        className={`flex items-center space-x-3 p-3 rounded ${backgroundColor}`}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {statusIcon === "spinner" ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          ) : (
            <div
              className={`text-lg font-medium ${
                uploadItem.status === "uploaded"
                  ? "text-blue-600"
                  : uploadItem.status === "failed"
                    ? "text-red-600"
                    : "text-gray-600"
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
                ? "text-blue-800"
                : uploadItem.status === "failed"
                  ? "text-red-800"
                  : "text-gray-800"
            }`}
          >
            {statusText}
          </div>
        </div>
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
    console.warn("Unexpected item type in ImportItemComponent:", {
      itemType: typeof item,
      hasNoteTitle: "noteTitle" in item,
      type: "type" in item ? item.type : "undefined",
    });
    return null;
  }

  const importItem = item;
  const displayTitle = getDisplayTitle(importItem, fileTitles);
  const statusIcon = getStatusIcon(importItem.status);
  const statusText = getStatusText(importItem.status, displayTitle);

  const getImportBackgroundColor = () => {
    switch (importItem.status) {
      case "importing":
        return "bg-blue-50"; // Light primary color for processing
      case "completed":
        return "bg-green-50"; // Light green for success
      case "failed":
        return "bg-red-50"; // Light red for errors
      default:
        return "bg-blue-50";
    }
  };

  const backgroundColor = getImportBackgroundColor();

  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded ${backgroundColor}`}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {statusIcon === "spinner" ? (
          <div className="animate-spin rounded-full h-4 w-4"></div>
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
      </div>
    </div>
  );
});
