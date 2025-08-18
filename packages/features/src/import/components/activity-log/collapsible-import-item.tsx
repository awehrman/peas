"use client";

import { DetailedStatus } from "./detailed-status";
import { ProgressStatusBar } from "./progress-status-bar";
import { ImportItem, ImportItemWithUploadProgress, UploadItem } from "./types";

import { ReactNode } from "react";

import { StatusEvent } from "../../hooks/use-status-websocket";
import {
  createProcessingSteps,
  createStatusSummary,
} from "../../utils/status-parser";
import { getDisplayTitle, getStatusText } from "../utils/display-utils";

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
  const itemEvents = events.filter(
    (event) => event.importId === importItem.importId
  );

  // Create status summary and processing steps
  const statusSummary = createStatusSummary(itemEvents);
  const processingSteps = createProcessingSteps(itemEvents);

  // Detect high-confidence duplicate from the processing steps (support both lower/upper context ids)
  const hasDuplicate = processingSteps.some((s) => {
    const isDupContext =
      s.id === "check_duplicates" || s.id === "CHECK_DUPLICATES";
    if (!isDupContext) return false;
    const msg = (s.message || "").toLowerCase();
    const dupCount = Number(
      (s.metadata as Record<string, unknown> | undefined)?.duplicateCount ?? 0
    );
    return msg.includes("duplicate") || dupCount > 0;
  });

  function getImagePreviewUrl(): string | null {
    for (const step of processingSteps) {
      if (step.id !== "image_processing" || !step.metadata) continue;
      const meta = step.metadata as Record<string, unknown>;
      const crop4x3 = meta["r2Crop4x3Url"];
      const thumb = meta["r2ThumbnailUrl"];
      const crop3x2 = meta["r2Crop3x2Url"];
      const original = meta["r2OriginalUrl"];
      // Prefer 4:3 crop to match container aspect
      if (typeof crop4x3 === "string" && crop4x3) return crop4x3;
      if (typeof thumb === "string" && thumb) return thumb;
      if (typeof crop3x2 === "string" && crop3x2) return crop3x2;
      if (typeof original === "string" && original) return original;
    }
    return null;
  }

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
        {/* Status Icon - align with step icons */}
        <div className="flex-shrink-0">
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              hasDuplicate
                ? "bg-amber-500"
                : importItem.status === "completed"
                  ? "bg-green-500"
                  : importItem.status === "failed"
                    ? "bg-red-500"
                    : importItem.status === "importing"
                      ? "bg-blue-500"
                      : "bg-gray-300"
            }`}
            title={hasDuplicate ? "duplicate" : importItem.status}
            aria-label={hasDuplicate ? "Duplicate detected" : importItem.status}
          >
            {hasDuplicate
              ? "!"
              : importItem.status === "completed"
                ? "✓"
                : importItem.status === "failed"
                  ? "✗"
                  : importItem.status === "importing"
                    ? "⟳"
                    : "○"}
          </div>
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
          <div className="p-4">
            <div className="md:flex md:items-start md:gap-6">
              {/* Left: 50% width on md+ with progress + status */}
              <div className="w-full md:w-1/2 space-y-4">
                {/* Progress Status Bar */}
                {processingSteps.length > 0 && (
                  <div>
                    <ProgressStatusBar steps={processingSteps} compact />
                  </div>
                )}
                {/* Detailed Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Status Details
                  </h4>
                  <DetailedStatus summary={statusSummary} />
                </div>
              </div>

              {/* Right: image placeholder/preview 3x4 aspect */}
              <div className="w-full md:w-1/2 mt-4 md:mt-0">
                <div className="w-full md:flex md:justify-end">
                  <div className="border border-gray-200 rounded-md overflow-hidden w-full">
                    {(() => {
                      const previewUrl = getImagePreviewUrl();
                      return previewUrl ? (
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
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Metadata */}
            {itemEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Event History
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {(() => {
                    // Show only the latest event per grouped key (context + optional subtype)
                    const latestByKey = new Map<
                      string,
                      (typeof itemEvents)[number]
                    >();
                    const sorted = [...itemEvents].sort(
                      (a, b) =>
                        new Date(a.createdAt || 0).getTime() -
                        new Date(b.createdAt || 0).getTime()
                    );
                    for (const ev of sorted) {
                      const meta = (ev.metadata || {}) as Record<
                        string,
                        unknown
                      >;
                      const subtype =
                        (typeof meta.subtype === "string" && meta.subtype) ||
                        (typeof meta.eventType === "string" &&
                          meta.eventType) ||
                        undefined;
                      const key = `${ev.context || "unknown"}${subtype ? `:${subtype}` : ""}`;
                      latestByKey.set(key, ev);
                    }
                    const latestEvents = Array.from(latestByKey.entries())
                      .map(([key, ev]) => ({ key, ev }))
                      .sort(
                        (a, b) =>
                          new Date(b.ev.createdAt || 0).getTime() -
                          new Date(a.ev.createdAt || 0).getTime()
                      );
                    return latestEvents.map(({ key, ev }) => (
                      <div key={key} className="text-xs text-gray-600">
                        <span className="font-medium">{ev.context}:</span>{" "}
                        {ev.message}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
