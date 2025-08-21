"use client";

import { ProgressStatusBar } from "./progress-status-bar";
import { ImportItem, ImportItemWithUploadProgress, UploadItem } from "./types";

import { ReactNode, useMemo } from "react";

import { StatusEvent } from "../../hooks/use-status-websocket";
import { STATUS_CONTEXT } from "../../utils/status-contexts";
import {
  ProcessingStep,
  createProcessingSteps,
} from "../../utils/status-parser";
import {
  UPLOAD_BACKGROUND_COLOR,
  UPLOAD_STATUS_ICON,
  choosePreviewUrl,
  getDuplicateCount,
  getUploadStatusText,
} from "../utils/activity-log-helpers";
import { getDisplayTitle, getStatusText } from "../utils/display-utils";
import { formatStatusText } from "../utils/status-text-formatter";

import { StatusIcon } from "./components/status-icon";
import { ACTIVITY_LOG_STYLES } from "./styles/activity-log-styles";

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

    const statusIcon = useMemo(
      () => UPLOAD_STATUS_ICON[uploadItem.status] ?? "spinner",
      [uploadItem.status]
    );
    const statusText = useMemo(
      () =>
        getUploadStatusText(
          uploadItem.status,
          uploadItem.htmlFileName,
          uploadItem.imageCount
        ),
      [uploadItem.status, uploadItem.htmlFileName, uploadItem.imageCount]
    );
    const backgroundColor = useMemo(
      () => UPLOAD_BACKGROUND_COLOR[uploadItem.status] ?? "bg-gray-50",
      [uploadItem.status]
    );

    return (
      <div
        className={`flex items-center space-x-3 p-3 rounded ${backgroundColor} ${className}`}
      >
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
  const statusText = getStatusText(importItem.status, displayTitle);

  // Filter events for this specific import
  const itemEvents = useMemo(
    () => events.filter((event) => event.importId === importItem.importId),
    [events, importItem.importId]
  );

  // Create status summary and processing steps
  const processingSteps = useMemo(
    () => createProcessingSteps(itemEvents),
    [itemEvents]
  );

  // Detect high-confidence duplicate from the processing steps (support both lower/upper context ids)
  const hasDuplicate = useMemo(() => {
    const result = processingSteps.some((s) => {
      const isDupContext =
        s.id === STATUS_CONTEXT.CHECK_DUPLICATES ||
        s.id === STATUS_CONTEXT.CHECK_DUPLICATES_LEGACY;

      if (!isDupContext) return false;

      const metadataHasDuplicates = getDuplicateCount(s.metadata) > 0;
      // Only consider it a duplicate if we actually have duplicates in metadata
      // The message might contain "duplicate" even when no duplicates were found
      const stepResult = metadataHasDuplicates;

      return stepResult;
    });

    console.log("📊 [COLLAPSIBLE_ITEM] Final hasDuplicate result:", result);
    return result;
  }, [processingSteps, importItem.importId]);

  const previewUrl = useMemo(() => {
    for (const step of processingSteps) {
      if (step.id !== "image_processing" || !step.metadata) continue;
      return choosePreviewUrl(step.metadata as Record<string, unknown>);
    }
    return null;
  }, [processingSteps]);

  const getImportBackgroundColor = () => {
    if (hasDuplicate) return "bg-amber-50";
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
    <div
      className={`rounded-lg border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Header - always visible */}
      <button
        type="button"
        className={`w-full text-left flex items-center space-x-3 p-4 hover:bg-gray-200 transition-colors ${backgroundColor}`}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`import-item-${importItem.importId}`}
      >
        {/* Status Icon - align with step icons */}
        <div className={ACTIVITY_LOG_STYLES.collapsible.statusIcon}>
          <StatusIcon
            status={
              importItem.status === "importing"
                ? "processing"
                : importItem.status
            }
            step={
              hasDuplicate
                ? ({
                    id: "check_duplicates",
                    status: "completed",
                    metadata: { duplicateCount: 1 },
                  } as ProcessingStep)
                : undefined
            }
            size="md"
          />
        </div>

        {/* Status Text */}
        <div className="flex-1">
          <div
            className={`font-medium ${
              hasDuplicate
                ? "text-amber-800"
                : importItem.status === "completed"
                  ? "text-green-800"
                  : importItem.status === "failed"
                    ? "text-red-800"
                    : "text-blue-800"
            }`}
          >
            {formatStatusText(statusText)}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
              isExpanded ? "" : "rotate-180"
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
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div
          id={`import-item-${importItem.importId}`}
          className="border-t border-gray-200 bg-white"
        >
          <div className="p-4">
            <div className="md:flex md:items-start md:gap-6">
              {/* Left: 50% width on md+ with progress */}
              <div className="w-full md:w-1/2 space-y-4">
                {/* Progress Status Bar */}
                {processingSteps.length > 0 && (
                  <div>
                    <ProgressStatusBar steps={processingSteps} compact />
                  </div>
                )}
              </div>

              {/* Right: image placeholder/preview 3x4 aspect */}
              <div className="w-full md:w-1/2 mt-4 md:mt-0">
                <div className="w-full md:flex md:justify-end">
                  <div
                    className="border border-gray-200 rounded-md overflow-hidden w-full"
                    aria-live="polite"
                  >
                    {previewUrl ? (
                      <div className="relative w-full">
                        <div className="aspect-[4/3] w-full">
                          <img
                            src={previewUrl}
                            alt="Imported image preview"
                            className="block w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        className="w-full aspect-[4/3] bg-gray-100 animate-pulse"
                        aria-label="Image loading placeholder"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
