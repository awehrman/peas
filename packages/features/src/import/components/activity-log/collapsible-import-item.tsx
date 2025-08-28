"use client";

import { ImportItem, ImportItemWithUploadProgress, UploadItem } from "./types";

import React, { memo, useEffect, useMemo, useState } from "react";

import { StatusEvent } from "../../hooks/use-status-websocket";
import { choosePreviewUrl, getDuplicateCount } from "../../utils/metadata";
import { BASE_STEP_DEFS } from "../../utils/status";
import { STATUS_CONTEXT } from "../../utils/status-contexts";
import { createProcessingSteps } from "../../utils/status-parser";
import { getDisplayTitle, getStatusText } from "../utils/display-utils";

import { CollapsibleContent } from "./components/collapsible-content";
import { CollapsibleHeader } from "./components/collapsible-header";
import { getImportItemStyling } from "./utils/styling-utils";
import { isImportItem, isUploadItem } from "./utils/type-guards";

export interface CollapsibleImportItemProps {
  item: ImportItem | UploadItem | ImportItemWithUploadProgress;
  fileTitles: Map<string, string>;
  events: StatusEvent[];
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
}

function CollapsibleImportItemComponent({
  item,
  fileTitles,
  events,
  isExpanded,
  onToggle,
  className = "",
}: CollapsibleImportItemProps): React.ReactElement | null {
  // Handle import items (from WebSocket events)
  if (!isImportItem(item)) {
    console.warn("Unexpected item type in CollapsibleImportItem:", {
      itemType: typeof item,
      hasImportId: "importId" in item,
    });
  }

  // Handle upload items with just the header (no collapsible content)
  const isUpload = isUploadItem(item);
  const uploadItem = isUpload ? item : null;

  // For upload items, we want to show "Processing filename" as the status text
  // The completion percentage will be shown separately by CollapsibleHeader
  const uploadStatusText = uploadItem
    ? `Uploading ${uploadItem.htmlFileName}`
    : "";

  // For upload items, we don't have processing steps, so use 0% progress
  const uploadCompletionPercentage = 0;

  // Create simple styling for upload items
  const getUploadStyling = (status: string) => {
    switch (status) {
      case "uploaded":
        return {
          backgroundColor: "bg-blue-50",
          hoverBackgroundColor: "hover:bg-blue-100",
          textColor: "text-blue-800",
        };
      case "failed":
        return {
          backgroundColor: "bg-red-50",
          hoverBackgroundColor: "hover:bg-red-100",
          textColor: "text-red-800",
        };
      case "cancelled":
        return {
          backgroundColor: "bg-gray-50",
          hoverBackgroundColor: "hover:bg-gray-100",
          textColor: "text-gray-800",
        };
      default:
        return {
          backgroundColor: "bg-gray-50",
          hoverBackgroundColor: "hover:bg-gray-100",
          textColor: "text-gray-800",
        };
    }
  };

  // Create a minimal item object that matches the expected interface for upload items
  const uploadHeaderItem: ImportItem | null = uploadItem
    ? {
        importId: uploadItem.importId,
        htmlFileName: uploadItem.htmlFileName,
        status:
          uploadItem.status === "uploaded"
            ? "importing" // This will show "..." icon and "0% complete"
            : uploadItem.status === "failed"
              ? "failed"
              : "importing",
        createdAt: uploadItem.createdAt,
        type: "import",
      }
    : null;

  const importItem = item;

  // Ensure this is an import item before proceeding
  if (!isImportItem(importItem)) {
    return null;
  }

  // Memoize expensive calculations
  const displayTitle = useMemo(
    () => getDisplayTitle(importItem, fileTitles),
    [importItem, fileTitles]
  );

  const statusText = useMemo(
    () => getStatusText(importItem.status, displayTitle),
    [importItem.status, displayTitle]
  );

  // Events are now pre-filtered by the parent component
  const itemEvents = events;

  // Create derived steps using the same logic as ProgressStatusBar
  const derivedSteps = useMemo(() => {
    // Build derived steps from raw events, using the same logic as ProgressStatusBar
    const byId = new Map();

    // Create processing steps from raw events
    const processingSteps = createProcessingSteps(itemEvents);
    for (const step of processingSteps) {
      byId.set(step.id, step);
    }

    const steps = BASE_STEP_DEFS.map((def) => {
      const chosen = byId.get(def.id);
      return {
        id: def.id,
        name: def.name,
        status: chosen?.status ?? "pending",
        message: chosen?.message ?? "",
        progress: chosen?.progress,
        metadata: chosen?.metadata,
      };
    });

    return steps;
  }, [itemEvents]);

  // Calculate completion percentage using the same logic as the status bar
  const completionPercentage = useMemo(() => {
    if (itemEvents.length === 0) return 0;

    const totalSteps = BASE_STEP_DEFS.length;
    const completedSteps = derivedSteps.filter(
      (step) => step.status === "completed"
    ).length;
    let progressPercentage =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // If note completion has been received, force overall progress to 100%
    const noteCompleted = itemEvents.some(
      (event) =>
        event.context === "note_completion" && event.status === "COMPLETED"
    );
    if (noteCompleted) {
      progressPercentage = 100;
    }

    return progressPercentage;
  }, [itemEvents, derivedSteps]);

  // Detect high-confidence duplicate from the processing steps
  const hasDuplicate = useMemo(() => {
    const processingSteps = createProcessingSteps(itemEvents);
    const duplicateStep = processingSteps.find((s) => {
      const isDupContext = s.id === STATUS_CONTEXT.CHECK_DUPLICATES;
      if (!isDupContext) return false;

      // Only consider it a duplicate if the step is completed AND duplicates were found
      if (s.status !== "completed") return false;

      const metadataHasDuplicates = getDuplicateCount(s.metadata) > 0;
      return metadataHasDuplicates;
    });

    return !!duplicateStep;
  }, [itemEvents, importItem.importId]);

  const previewUrl = useMemo(() => {
    const processingSteps = createProcessingSteps(itemEvents);
    for (const step of processingSteps) {
      if (step.id !== "adding_images" || !step.metadata) continue;
      return choosePreviewUrl(step.metadata as Record<string, unknown>);
    }
    return null;
  }, [itemEvents]);

  // Persist the last non-null preview URL so the placeholder doesn't reset
  const [stablePreviewUrl, setStablePreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (previewUrl) setStablePreviewUrl(previewUrl);
  }, [previewUrl]);

  // Get styling configuration
  const styling = useMemo(
    () => getImportItemStyling(importItem, hasDuplicate),
    [importItem, hasDuplicate]
  );

  // Prepare upload styling and data
  const uploadStyling =
    isUpload && uploadItem ? getUploadStyling(uploadItem.status) : null;

  // Determine what to render
  const shouldRenderAsUpload = isUpload && uploadItem && uploadHeaderItem;

  // Check if this is an import item
  const isImportItemType = isImportItem(importItem);

  // Calculate all derived values before any returns
  const uploadComponent = shouldRenderAsUpload ? (
    <div
      className={`rounded-lg border border-gray-200 overflow-hidden mb-3 ${className}`}
    >
      <CollapsibleHeader
        item={uploadHeaderItem!}
        isExpanded={false} // Upload items are never expanded
        onToggle={() => {}} // No-op for upload items
        styling={uploadStyling!}
        hasDuplicate={false}
        statusText={uploadStatusText}
        completionPercentage={uploadCompletionPercentage}
        showExpandIcon={false} // Hide expand icon for upload items
      />
    </div>
  ) : null;

  const importComponent = isImportItemType ? (
    <div
      className={`rounded-lg border border-gray-200 overflow-hidden mb-3 ${className}`}
    >
      {/* Header - always visible */}
      <CollapsibleHeader
        item={importItem}
        isExpanded={isExpanded}
        onToggle={onToggle}
        styling={styling}
        hasDuplicate={hasDuplicate}
        statusText={statusText}
        completionPercentage={completionPercentage}
      />

      {/* Collapsible Content */}
      {isExpanded && (
        <CollapsibleContent
          item={importItem}
          processingSteps={derivedSteps}
          previewUrl={stablePreviewUrl ?? previewUrl}
        />
      )}
    </div>
  ) : null;

  // Return based on item type after all hooks are called
  if (shouldRenderAsUpload) {
    return uploadComponent;
  }

  if (isImportItemType) {
    return importComponent;
  }

  return null;
}

CollapsibleImportItemComponent.displayName = "CollapsibleImportItemComponent";
export const CollapsibleImportItem = memo(CollapsibleImportItemComponent);
CollapsibleImportItem.displayName = "CollapsibleImportItem";
