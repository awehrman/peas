"use client";

import React from "react";

import { formatBytes } from "../../../utils/formatting";
import {
  getDuplicateCount,
  getImageSummary,
  getSavedCategory,
  getSavedTags,
  getSourceName,
} from "../../../utils/metadata";
import { getDefaultStatusMessage } from "../../../utils/status";
import { ProcessingStep } from "../../../utils/status-parser";

export interface StepMessageProps {
  step: ProcessingStep;
  className?: string;
}

export function StepMessage({
  step,
  className = "",
}: StepMessageProps): React.ReactElement | null {
  // Ingredient/Instruction processing: always show "Processing x/y lines"
  if (
    (step.id === "ingredient_processing" ||
      step.id === "instruction_processing") &&
    step.progress &&
    typeof step.progress.current === "number" &&
    typeof step.progress.total === "number"
  ) {
    return (
      <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
        {`Processing ${step.progress.current}/${step.progress.total} lines`}
      </p>
    );
  }

  // Cleaning: show "Removed 123kb from file" when we have size info
  if (step.id === "cleaning") {
    const sizeRemoved = getSizeRemoved(step.metadata);
    if (sizeRemoved) {
      return (
        <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
          Removed {sizeRemoved}
        </p>
      );
    }
  }

  // Images: show preview and textual summary
  if (step.id === "adding_images") {
    const { count, types, cropSizes } = getImageSummary(step.metadata);
    const previewUrl = getImagePreviewUrl(step.metadata);

    if (count !== undefined || types.length > 0 || previewUrl) {
      const cropCount = cropSizes?.length || 0;
      const label = `${cropCount} image${cropCount === 1 ? "" : "s"} added`;
      const typesText =
        types.length > 0 ? `, created [${types.join(", ")}]` : "";
      const cropText =
        cropSizes && cropSizes.length > 0 ? ` [${cropSizes.join(", ")}]` : "";

      return (
        <div className={`mt-1 ${className}`}>
          {previewUrl && (
            <div className="mb-2">
              <img
                src={previewUrl}
                alt="Image preview"
                className="w-16 h-16 object-cover rounded border border-gray-200 shadow-sm"
                loading="lazy"
                onError={(e) => {
                  // Hide image if it fails to load
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
          <p className="text-xs text-gray-600 truncate">
            {`${label}${typesText}${cropText}`}
          </p>
        </div>
      );
    }
  }

  // Categories/Tags: simplified messages when none present
  if (step.id === "adding_categories") {
    const savedCategory = getSavedCategory(step.metadata);
    // Only show message when step is completed
    if (step.status === "completed") {
      return (
        <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
          {savedCategory ? "Category added" : "No category added"}
        </p>
      );
    }
  }

  if (step.id === "adding_tags") {
    const savedTags = getSavedTags(step.metadata);
    // Only show message when step is completed
    if (step.status === "completed") {
      return (
        <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
          {savedTags && savedTags.length > 0 ? "Tags added" : "No tags added"}
        </p>
      );
    }
  }

  // Connecting Source: show source name as secondary text when completed
  if (step.id === "connecting_source" && step.status === "completed") {
    const sourceName = getSourceName(step.metadata);
    if (sourceName) {
      return (
        <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
          Added <span className="italic">{sourceName}</span>
        </p>
      );
    }
  }

  // Check Duplicates: show custom format when duplicates found
  if (step.id === "check_duplicates") {
    const dupCount = getDuplicateCount(step.metadata);

    if (step.status === "completed" && dupCount > 0) {
      return (
        <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
          {dupCount} duplicate{dupCount === 1 ? "" : "s"} note found
        </p>
      );
    }

    // For other statuses, use default message
    const base =
      step.message ||
      (step.status === "pending"
        ? `${step.name} not started`
        : step.status === "processing"
          ? `${step.name} is processing`
          : step.status === "failed"
            ? `${step.name} failed`
            : `${step.name} completed`);

    return (
      <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
        {base}
      </p>
    );
  }

  // Saving Note: show custom format
  if (step.id === "saving_note") {
    const base =
      step.message ||
      (step.status === "pending"
        ? "Waiting to save note..."
        : step.status === "processing"
          ? "Saving note to database..."
          : step.status === "failed"
            ? "Failed to save note"
            : "Note saved successfully");

    return (
      <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
        {base}
      </p>
    );
  }

  // Default language for other steps when no specific message
  const fallback = getDefaultStatusMessage(step.name, step.status);

  return (
    <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
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

function getImagePreviewUrl(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;

  // Priority order: thumbnail, 4:3 crop, 3:2 crop, 16:9 crop, original
  const candidates = [
    metadata.r2ThumbnailUrl,
    metadata.r2Crop4x3Url,
    metadata.r2Crop3x2Url,
    metadata.r2Crop16x9Url,
    metadata.r2OriginalUrl,
  ];

  for (const url of candidates) {
    if (typeof url === "string" && url.trim()) {
      return url;
    }
  }

  return null;
}
