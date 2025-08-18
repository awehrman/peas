"use client";

import { ReactNode } from "react";
import { useMemo } from "react";

// import { STATUS_CONTEXT } from "../../utils/status-contexts";
import { ProcessingStep } from "../../utils/status-parser";
import {
  BASE_STEP_DEFS,
  STATUS,
  STATUS_COLOR,
  STATUS_ICON,
  STATUS_TEXT,
  formatBytes,
  getDefaultStatusMessage,
  getDuplicateCount,
  getImageSummary,
  getSavedCategory,
  getSavedTags,
  getSourceName,
} from "../utils/activity-log-helpers";

export interface ProgressStatusBarProps {
  steps: ProcessingStep[];
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function ProgressStatusBar({
  steps,
  className = "",
  showDetails = true,
  compact = false,
}: ProgressStatusBarProps): ReactNode {
  if (steps.length === 0) {
    return null;
  }

  // Use centralized step definitions

  // Build derived steps from incoming steps, limited to the base set
  const byId = useMemo(() => {
    const m = new Map<string, (typeof steps)[number]>();
    for (const s of steps) m.set(s.id, s);
    return m;
  }, [steps]);

  function pickCombinedFromContexts(
    contextIds: string[]
  ): ProcessingStep | undefined {
    const candidates = contextIds
      .map((cid) => byId.get(cid))
      .filter(Boolean) as ProcessingStep[];
    if (candidates.length === 0) return undefined;
    // Status precedence: failed > completed > processing > pending
    const order: ProcessingStep["status"][] = [
      "failed",
      "completed",
      "processing",
      "pending",
    ];
    for (const status of order) {
      const found = candidates.find((c) => c.status === status);
      if (found) return found;
    }
    return candidates[0];
  }

  const derivedSteps = useMemo(
    () =>
      BASE_STEP_DEFS.map((def) => {
        const chosen = pickCombinedFromContexts(def.sourceIds);
        return {
          id: def.id,
          name: def.name,
          status: chosen?.status ?? STATUS.PENDING,
          message: chosen?.message ?? "",
          progress: chosen?.progress,
          metadata: chosen?.metadata,
        } as ProcessingStep;
      }),
    [byId]
  );

  const totalSteps = BASE_STEP_DEFS.length;
  const completedSteps = useMemo(
    () =>
      derivedSteps.filter((step) => step.status === STATUS.COMPLETED).length,
    [derivedSteps]
  );
  let progressPercentage =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // If note completion has been received, force overall progress to 100%
  const noteCompleted = useMemo(
    () =>
      steps.some(
        (s) => s.id === "note_completion" && s.status === STATUS.COMPLETED
      ),
    [steps]
  );
  if (noteCompleted) {
    progressPercentage = 100;
  }

  const getStatusColor = (
    status: ProcessingStep["status"],
    step?: ProcessingStep
  ) => {
    // Special case: duplicates highlighted with accent
    if (step?.id === "check_duplicates") {
      if (status === STATUS.PROCESSING) return "bg-amber-400";
      const isDup =
        step.message?.toLowerCase().includes("duplicate") ||
        getDuplicateCount(step.metadata) > 0;
      if (isDup) return "bg-amber-500";
    }
    return STATUS_COLOR[status] ?? STATUS_COLOR[STATUS.PENDING];
  };

  const getStatusIcon = (
    status: ProcessingStep["status"],
    step?: ProcessingStep
  ) => {
    if (
      step?.id === "check_duplicates" &&
      (step.message?.toLowerCase().includes("duplicate") ||
        getDuplicateCount(step.metadata) > 0)
    ) {
      return STATUS_ICON.DUPLICATE;
    }
    return (
      STATUS_ICON[status as keyof typeof STATUS_ICON] ??
      STATUS_ICON[STATUS.PENDING]
    );
  };

  const getStatusTextColor = (status: ProcessingStep["status"]) => {
    return STATUS_TEXT[status] ?? STATUS_TEXT[STATUS.PENDING];
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Import progress</span>
          <span className="text-gray-500">{progressPercentage}%</span>
        </div>
        <div
          className="w-full bg-gray-200 rounded-full h-2"
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall progress: ${progressPercentage}%`}
        >
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progressPercentage === 100 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Individual steps */}
      {showDetails && (
        <div className={`space-y-2 ${compact ? "space-y-1" : ""} pl-[20px]`}>
          {derivedSteps.map((step) => (
            <div key={step.id} className="flex items-center space-x-3">
              {/* Status indicator */}
              <div className="flex-shrink-0">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white ${getStatusColor(
                    step.status,
                    step
                  )}`}
                  title={step.status}
                >
                  {getStatusIcon(step.status, step)}
                </div>
              </div>

              {/* Step name and progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={
                      step.id === "check_duplicates" &&
                      (step.message?.toLowerCase().includes("duplicate") ||
                        getDuplicateCount(step.metadata) > 0)
                        ? `text-sm font-medium truncate text-amber-700`
                        : `text-sm font-medium truncate ${getStatusTextColor(step.status)}`
                    }
                  >
                    {renderStepTitle(step)}
                  </span>
                  {step.id !== "adding_images" && step.progress && (
                    <span className="text-xs text-gray-500 ml-2">
                      {step.progress.current}/{step.progress.total}
                    </span>
                  )}
                </div>

                {/* Step progress bar */}
                {step.id !== "adding_images" && step.progress && (
                  <div
                    className="mt-1 w-full bg-gray-200 rounded-full h-1"
                    role="progressbar"
                    aria-valuenow={step.progress.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${step.name} progress: ${step.progress.percentage}%`}
                  >
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${getStatusColor(
                        step.status,
                        step
                      )}`}
                      style={{ width: `${step.progress.percentage}%` }}
                    />
                  </div>
                )}

                {/* Step message */}
                {renderStepMessage(step)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
        <span>
          {completedSteps} of {totalSteps} steps completed
        </span>
        {derivedSteps.some((step) => step.status === "failed") && (
          <span className="text-red-600 font-medium">
            {derivedSteps.filter((step) => step.status === "failed").length}{" "}
            failed
          </span>
        )}
      </div>
    </div>
  );
}

function renderStepTitle(step: ProcessingStep): string | ReactNode {
  // For connecting source, append the source name if available
  if (step.id === "connecting_source") {
    const sourceName = getSourceName(step.metadata);
    if (sourceName) {
      return (
        <span>
          {step.name}
          <span className="text-gray-500"> — {sourceName}</span>
        </span>
      );
    }
  }
  // Highlight Check Duplicates title when duplicates found
  if (
    step.id === "check_duplicates" &&
    step.message?.toLowerCase().includes("duplicate")
  ) {
    return (
      <span className="text-amber-600">
        {step.name}
        {getDuplicateCount(step.metadata) > 0 ? (
          <span className="text-amber-500 ml-1">
            ({getDuplicateCount(step.metadata)})
          </span>
        ) : null}
      </span>
    );
  }
  return step.name;
}

function renderStepMessage(step: ProcessingStep): ReactNode {
  // Cleaning: show "Removed 123kb from file" when we have size info
  if (step.id === "cleaning") {
    const sizeRemoved = getSizeRemoved(step.metadata);
    if (sizeRemoved) {
      return (
        <p className="text-xs text-gray-600 mt-1 truncate">{`Removed ${sizeRemoved} from file`}</p>
      );
    }
  }

  // Images: textual summary instead of a progress bar
  if (step.id === "adding_images") {
    const { count, types } = getImageSummary(step.metadata);
    if (count !== undefined || types.length > 0) {
      const label = `${count ?? 0} image${(count ?? 0) === 1 ? "" : "s"} added`;
      const typesText =
        types.length > 0 ? `, created [${types.join(", ")}]` : "";
      return (
        <p className="text-xs text-gray-600 mt-1 truncate">{`${label}${typesText}`}</p>
      );
    }
  }

  // Categories/Tags: simplified messages when none present
  if (step.id === "adding_categories") {
    const savedCategory = getSavedCategory(step.metadata);
    return (
      <p className="text-xs text-gray-600 mt-1 truncate">
        {savedCategory ? "Category added" : "No category added"}
      </p>
    );
  }
  if (step.id === "adding_tags") {
    const savedTags = getSavedTags(step.metadata);
    return (
      <p className="text-xs text-gray-600 mt-1 truncate">
        {savedTags && savedTags.length > 0 ? "Tags added" : "No tags added"}
      </p>
    );
  }

  // Check Duplicates: append count when available
  if (step.id === "check_duplicates") {
    const dupCount = getDuplicateCount(step.metadata);
    const base =
      step.message ||
      (step.status === "pending"
        ? `${step.name} not started`
        : step.status === "processing"
          ? `${step.name} is processing`
          : step.status === "failed"
            ? `${step.name} failed`
            : `${step.name} completed`);
    const suffix =
      dupCount > 0
        ? ` (found ${dupCount} duplicate${dupCount === 1 ? "" : "s"})`
        : "";
    return (
      <p className="text-xs text-gray-600 mt-1 truncate">{base + suffix}</p>
    );
  }

  // Default language for other steps when no specific message
  const fallback = getDefaultStatusMessage(step.name, step.status);

  return (
    <p className="text-xs text-gray-600 mt-1 truncate">
      {step.message || fallback}
    </p>
  );
}

function getSizeRemoved(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  const raw = metadata.sizeRemoved as unknown;
  if (typeof raw === "number") return formatBytes(raw);
  if (typeof raw === "string" && raw.trim().length > 0) return raw;
  return null;
}

// formatBytes imported from helpers

// getSourceName imported from helpers

// getImageSummary imported from helpers

// getSavedCategory imported from helpers

// getSavedTags imported from helpers

// Note: preview URL selection is handled in the parent (collapsible item)

// getDuplicateCount imported from helpers
