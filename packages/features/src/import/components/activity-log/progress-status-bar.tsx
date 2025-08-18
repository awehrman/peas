"use client";

import { ReactNode } from "react";

import { STATUS_CONTEXT } from "../../utils/status-contexts";
import { ProcessingStep } from "../../utils/status-parser";

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

  // Normalize to the 8 base steps we care about
  const BASE_STEP_DEFS: Array<{
    id: string;
    name: string;
    sourceIds: string[];
  }> = [
    // Cleaning can appear as clean_html (action) or file_cleaning (legacy)
    {
      id: "cleaning",
      name: "Cleaning",
      sourceIds: ["clean_html", "file_cleaning"],
    },
    // Saving note can appear as save_note (action) or note_creation (legacy)
    {
      id: "saving_note",
      name: "Saving Note",
      sourceIds: ["save_note", "note_creation"],
    },
    {
      id: "ingredient_processing",
      name: "Ingredient Processing",
      sourceIds: ["ingredient_processing"],
    },
    {
      id: "instruction_processing",
      name: "Instruction Processing",
      sourceIds: ["instruction_processing"],
    },
    // Connecting source can appear as process_source (action) or source_connection (legacy)
    {
      id: "connecting_source",
      name: "Connecting Source",
      sourceIds: [
        STATUS_CONTEXT.PROCESS_SOURCE,
        STATUS_CONTEXT.SOURCE_CONNECTION,
      ],
    },
    {
      id: "adding_images",
      name: "Adding Images",
      sourceIds: ["image_processing"],
    },
    // Categorization is split visually; we consider save completion contexts as well as generic categorization
    {
      id: "adding_categories",
      name: "Adding Categories",
      sourceIds: ["categorization_save_complete", "categorization_save"],
    },
    {
      id: "adding_tags",
      name: "Adding Tags",
      sourceIds: ["tag_save_complete", "tag_save"],
    },
    {
      id: "check_duplicates",
      name: "Check Duplicates",
      sourceIds: [
        STATUS_CONTEXT.CHECK_DUPLICATES,
        STATUS_CONTEXT.CHECK_DUPLICATES_LEGACY,
      ],
    },
  ];

  // Build derived steps from incoming steps, limited to the base set
  const byId = new Map<string, (typeof steps)[number]>();
  for (const s of steps) byId.set(s.id, s);

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

  const derivedSteps = BASE_STEP_DEFS.map((def) => {
    const chosen = pickCombinedFromContexts(def.sourceIds);
    return {
      id: def.id,
      name: def.name,
      status: chosen?.status ?? "pending",
      message: chosen?.message ?? "",
      progress: chosen?.progress,
      metadata: chosen?.metadata,
    } as ProcessingStep;
  });

  const totalSteps = 9; // fixed base steps
  const completedSteps = derivedSteps.filter(
    (step) => step.status === "completed"
  ).length;
  let progressPercentage =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // If note completion has been received, force overall progress to 100%
  const noteCompleted = steps.some(
    (s) => s.id === "note_completion" && s.status === "completed"
  );
  if (noteCompleted) {
    progressPercentage = 100;
  }

  const getStatusColor = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "processing":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      case "pending":
      default:
        return "bg-gray-300";
    }
  };

  const getStatusIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return "✓";
      case "processing":
        return "⟳";
      case "failed":
        return "✗";
      case "pending":
      default:
        return "○";
    }
  };

  const getStatusTextColor = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-700";
      case "processing":
        return "text-blue-700";
      case "failed":
        return "text-red-700";
      case "pending":
      default:
        return "text-gray-500";
    }
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
            <div key={step.id} className="flex items-center space-x-3 ml-5">
              {/* Status indicator */}
              <div className="flex-shrink-0">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white ${getStatusColor(
                    step.status
                  )}`}
                  title={step.status}
                >
                  {getStatusIcon(step.status)}
                </div>
              </div>

              {/* Step name and progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium truncate ${getStatusTextColor(
                      step.status
                    )}`}
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
                        step.status
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

  return step.message ? (
    <p className="text-xs text-gray-600 mt-1 truncate">{step.message}</p>
  ) : null;
}

function getSizeRemoved(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  const raw = metadata.sizeRemoved as unknown;
  if (typeof raw === "number") return formatBytes(raw);
  if (typeof raw === "string" && raw.trim().length > 0) return raw;
  return null;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${sizes[i]}`;
}

function getSourceName(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  const bookName = metadata.bookName;
  const siteName = metadata.siteName;
  const domain = metadata.domain;
  const source = metadata.source;
  if (typeof bookName === "string" && bookName) return bookName;
  if (typeof siteName === "string" && siteName) return siteName;
  if (typeof domain === "string" && domain) return domain;
  if (typeof source === "string" && source) {
    try {
      const url = new URL(source);
      return url.hostname;
    } catch {
      return source;
    }
  }
  return null;
}

function getImageSummary(metadata?: Record<string, unknown>): {
  count?: number;
  types: string[];
} {
  const result: { count?: number; types: string[] } = { types: [] };
  if (!metadata) return result;
  const count =
    metadata.completedImages ?? metadata.imageCount ?? metadata.totalImages;
  if (typeof count === "number") result.count = count;
  const types = metadata.imageTypes;
  if (Array.isArray(types)) {
    result.types = types.map((t) => String(t));
  }
  return result;
}

function getSavedCategory(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  const cat = (metadata as Record<string, unknown>).savedCategory;
  return typeof cat === "string" && cat ? cat : null;
}

function getSavedTags(metadata?: Record<string, unknown>): string[] | null {
  if (!metadata) return null;
  const tags = (metadata as Record<string, unknown>).savedTags;
  if (Array.isArray(tags)) return tags.map((t) => String(t));
  return null;
}
