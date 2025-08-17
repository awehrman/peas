"use client";

import { ReactNode, useState } from "react";

import { StatusEvent } from "../../hooks/use-status-websocket";
import { ImportItem, ImportItemWithUploadProgress, UploadItem } from "./types";
import { createStatusSummary, createProcessingSteps } from "../../utils/status-parser";
import { DetailedStatus } from "./detailed-status";
import { ProgressStatusBar } from "./progress-status-bar";

import {
  getDisplayTitle,
  getStatusIcon,
  getStatusText,
} from "../utils/display-utils";

export interface CollapsibleImportItemProps {
  item: ImportItem | UploadItem | ImportItemWithUploadProgress;
  fileTitles: Map<string, string>;
  events: StatusEvent[];
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function CollapsibleImportItem({
  item,
  fileTitles,
  events,
  isExpanded,
  onToggle,
  className = "",
}: CollapsibleImportItemProps): ReactNode {
  // Handle upload items separately (non-collapsible)
  if ("imageCount" in item && item.type === "upload") {
    const uploadItem = item;

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

    const getUploadBackgroundColor = () => {
      switch (uploadItem.status) {
        case "uploading":
          return "bg-gray-50";
        case "uploaded":
          return "bg-green-50";
        case "failed":
          return "bg-red-50";
        default:
          return "bg-gray-50";
      }
    };

    const statusIcon = getUploadStatusIcon();
    const statusText = getUploadStatusText();
    const backgroundColor = getUploadBackgroundColor();

    return (
      <div className={`flex items-center space-x-3 p-3 rounded ${backgroundColor} ${className}`}>
        <div className="flex-shrink-0">
          {statusIcon === "spinner" ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
          ) : (
            <div
              className={`text-lg ${
                uploadItem.status === "uploaded"
                  ? "text-green-600"
                  : uploadItem.status === "failed"
                    ? "text-red-600"
                    : "text-gray-600"
              }`}
            >
              {statusIcon}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div
            className={`font-medium ${
              uploadItem.status === "uploaded"
                ? "text-green-800"
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
  const isImportItem = (
    item: ImportItem | UploadItem | ImportItemWithUploadProgress
  ): item is ImportItem | ImportItemWithUploadProgress => {
    return "noteTitle" in item && item.type === "import";
  };

  if (!isImportItem(item)) {
    console.warn("Unexpected item type in CollapsibleImportItem:", item);
    return null;
  }

  const importItem = item;
  const displayTitle = getDisplayTitle(importItem, fileTitles);
  const statusIcon = getStatusIcon(importItem.status);
  const statusText = getStatusText(importItem.status, displayTitle);

  // Filter events for this specific import
  const itemEvents = events.filter(event => event.importId === importItem.importId);
  
  // Create status summary and processing steps
  const statusSummary = createStatusSummary(itemEvents);
  const processingSteps = createProcessingSteps(itemEvents);

  const getImportBackgroundColor = () => {
    switch (importItem.status) {
      case "importing":
        return "bg-blue-50";
      case "completed":
        return "bg-green-50";
      case "failed":
        return "bg-red-50";
      default:
        return "bg-blue-50";
    }
  };

  const backgroundColor = getImportBackgroundColor();

  return (
    <div className={`rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header - always visible */}
      <div
        className={`flex items-center space-x-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${backgroundColor}`}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${displayTitle}`}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {statusIcon === "spinner" ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
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
          {importItem.completedAt && (
            <div className="text-xs text-gray-500 mt-1">
              Completed at {importItem.completedAt.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-4 space-y-4">
            {/* Progress Status Bar */}
            {processingSteps.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Processing Steps</h4>
                <ProgressStatusBar steps={processingSteps} compact />
              </div>
            )}

            {/* Detailed Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Status Details</h4>
              <DetailedStatus summary={statusSummary} />
            </div>

            {/* Additional Metadata */}
            {itemEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Event History</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {itemEvents.slice(-5).map((event, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      <span className="font-medium">{event.context}:</span> {event.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
