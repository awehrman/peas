"use client";

import { ImportItem, ImportItemWithUploadProgress, UploadItem } from "./types";

import { ReactNode, memo, useMemo } from "react";

import { useImportStatusTracker } from "../../hooks/use-import-status-tracker";
import { StatusEvent } from "../../hooks/use-status-websocket";
import { choosePreviewUrl, getDuplicateCount } from "../../utils/metadata";
import { BASE_STEP_DEFS } from "../../utils/status";
import { STATUS_CONTEXT } from "../../utils/status-contexts";
import { createProcessingSteps } from "../../utils/status-parser";
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

  // Events are now pre-filtered by the parent component
  const itemEvents = events;

  // Create status summary and processing steps
  const processingSteps = useMemo(
    () => createProcessingSteps(itemEvents),
    [itemEvents]
  );

  // Calculate completion percentage using the same logic as the status bar
  const completionPercentage = useMemo(() => {
    if (itemEvents.length === 0) return 0;

    // Use the same logic as ProgressStatusBar
    const byId = new Map();
    for (const step of processingSteps) {
      byId.set(step.id, step);
    }

    function pickCombinedFromContexts(contextIds: string[]) {
      const candidates = contextIds.map((cid) => byId.get(cid)).filter(Boolean);
      if (candidates.length === 0) return undefined;
      const order = ["failed", "completed", "processing", "pending"];
      for (const status of order) {
        const found = candidates.find((c) => c.status === status);
        if (found) return found;
      }
      return candidates[0];
    }

    const derivedSteps = BASE_STEP_DEFS.map((def) => {
      const chosen = pickCombinedFromContexts(def.sourceIds);
      return {
        id: def.id,
        name: def.name,
        status: chosen?.status ?? "pending",
        message: chosen?.message ?? "",
        progress: chosen?.progress,
        metadata: chosen?.metadata,
      };
    });

    const totalSteps = BASE_STEP_DEFS.length;
    const completedSteps = derivedSteps.filter(
      (step) => step.status === "completed"
    ).length;
    let progressPercentage =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // If note completion has been received, force overall progress to 100%
    const noteCompleted = processingSteps.some(
      (s) => s.id === "note_completion" && s.status === "completed"
    );
    if (noteCompleted) {
      progressPercentage = 100;
    }

    return progressPercentage;
  }, [itemEvents, processingSteps]);

  // Detect high-confidence duplicate from the processing steps
  const hasDuplicate = useMemo(() => {
    const duplicateStep = processingSteps.find((s) => {
      const isDupContext =
        s.id === STATUS_CONTEXT.CHECK_DUPLICATES ||
        s.id === STATUS_CONTEXT.CHECK_DUPLICATES_LEGACY;

      if (!isDupContext) return false;

      // Only consider it a duplicate if the step is completed AND duplicates were found
      if (s.status !== "completed") return false;

      const metadataHasDuplicates = getDuplicateCount(s.metadata) > 0;
      return metadataHasDuplicates;
    });

    if (duplicateStep) {
      console.log(
        `🟡 [DUPLICATE] Found duplicate for ${importItem.importId}: ${getDuplicateCount(duplicateStep.metadata)} duplicates`
      );
    }

    return !!duplicateStep;
  }, [processingSteps, importItem.importId]);

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
          processingSteps={processingSteps}
          previewUrl={previewUrl}
        />
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const CollapsibleImportItem = memo(CollapsibleImportItemComponent);
