"use client";

import { ImportItem, ImportItemWithUploadProgress, UploadItem } from "./types";

import { ReactNode, memo, useMemo } from "react";

import { StatusEvent } from "../../hooks/use-status-websocket";
import { STATUS_CONTEXT } from "../../utils/status-contexts";
import { createProcessingSteps } from "../../utils/status-parser";
import {
  choosePreviewUrl,
  getDuplicateCount,
} from "../utils/activity-log-helpers";
import { getDisplayTitle, getStatusText } from "../utils/display-utils";

import { CollapsibleContent } from "./components/collapsible-content";
import { CollapsibleHeader } from "./components/collapsible-header";
import { UploadItemComponent } from "./components/upload-item";
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

const CollapsibleImportItemComponent = ({
  item,
  fileTitles,
  events,
  isExpanded,
  onToggle,
  className = "",
}: CollapsibleImportItemProps): ReactNode => {
  // Handle upload items separately (non-collapsible)
  if (isUploadItem(item)) {
    return <UploadItemComponent item={item} className={className} />;
  }

  // Handle import items (from WebSocket events)
  if (!isImportItem(item)) {
    console.warn("Unexpected item type in CollapsibleImportItem:", item);
    return null;
  }

  const importItem = item;

  // Memoize expensive calculations
  const displayTitle = useMemo(
    () => getDisplayTitle(importItem, fileTitles),
    [importItem, fileTitles]
  );

  const statusText = useMemo(
    () => getStatusText(importItem.status, displayTitle),
    [importItem.status, displayTitle]
  );

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

  // Detect high-confidence duplicate from the processing steps
  const hasDuplicate = useMemo(() => {
    return processingSteps.some((s) => {
      const isDupContext =
        s.id === STATUS_CONTEXT.CHECK_DUPLICATES ||
        s.id === STATUS_CONTEXT.CHECK_DUPLICATES_LEGACY;

      if (!isDupContext) return false;

      const metadataHasDuplicates = getDuplicateCount(s.metadata) > 0;
      return metadataHasDuplicates;
    });
  }, [processingSteps]);

  const previewUrl = useMemo(() => {
    for (const step of processingSteps) {
      if (step.id !== "image_processing" || !step.metadata) continue;
      return choosePreviewUrl(step.metadata as Record<string, unknown>);
    }
    return null;
  }, [processingSteps]);

  // Get styling configuration
  const styling = useMemo(
    () => getImportItemStyling(importItem, hasDuplicate),
    [importItem, hasDuplicate]
  );

  return (
    <div
      className={`rounded-lg border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Header - always visible */}
      <CollapsibleHeader
        item={importItem}
        isExpanded={isExpanded}
        onToggle={onToggle}
        styling={styling}
        hasDuplicate={hasDuplicate}
        statusText={statusText}
      />

      {/* Collapsible Content */}
      {isExpanded && (
        <CollapsibleContent
          item={importItem}
          processingSteps={processingSteps}
          previewUrl={previewUrl}
        />
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const CollapsibleImportItem = memo(CollapsibleImportItemComponent);
