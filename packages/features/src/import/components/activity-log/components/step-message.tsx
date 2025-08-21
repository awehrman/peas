"use client";

import React from "react";
import { ProcessingStep } from "../../../utils/status-parser";
import {
  getImageSummary,
  getSavedCategory,
  getSavedTags,
  getSourceName,
  getDuplicateCount,
  getDefaultStatusMessage,
  formatBytes,
} from "../../utils/activity-log-helpers";

export interface StepMessageProps {
  step: ProcessingStep;
  className?: string;
}

export function StepMessage({ step, className = "" }: StepMessageProps): React.ReactElement | null {
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

  // Images: textual summary instead of a progress bar
  if (step.id === "adding_images") {
    const { count, types, cropSizes } = getImageSummary(step.metadata);

    if (count !== undefined || types.length > 0) {
      const cropCount = cropSizes?.length || 0;
      const label = `${cropCount} image${cropCount === 1 ? "" : "s"} added`;
      const typesText = types.length > 0 ? `, created [${types.join(", ")}]` : "";
      const cropText = cropSizes && cropSizes.length > 0 ? ` [${cropSizes.join(", ")}]` : "";
      
      return (
        <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
          {`${label}${typesText}${cropText}`}
        </p>
      );
    }
  }

  // Categories/Tags: simplified messages when none present
  if (step.id === "adding_categories") {
    const savedCategory = getSavedCategory(step.metadata);
    return (
      <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
        {savedCategory ? "Category added" : "No category added"}
      </p>
    );
  }

  if (step.id === "adding_tags") {
    const savedTags = getSavedTags(step.metadata);
    return (
      <p className={`text-xs text-gray-600 mt-1 truncate ${className}`}>
        {savedTags && savedTags.length > 0 ? "Tags added" : "No tags added"}
      </p>
    );
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
