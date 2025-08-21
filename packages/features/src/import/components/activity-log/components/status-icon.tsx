"use client";

import React from "react";

import { ProcessingStep } from "../../../utils/status-parser";
import {
  STATUS,
  STATUS_COLOR,
  STATUS_ICON,
} from "../../utils/activity-log-helpers";
import { getDuplicateCount } from "../../utils/activity-log-helpers";
import {
  ACTIVITY_LOG_STYLES,
  ICON_POSITIONING,
} from "../styles/activity-log-styles";

export interface StatusIconProps {
  status: ProcessingStep["status"];
  step?: ProcessingStep;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTitle?: boolean;
}

// Size configurations
const SIZE_CONFIGS = {
  sm: {
    container: ACTIVITY_LOG_STYLES.statusIcon.sizes.sm,
    text: ACTIVITY_LOG_STYLES.statusIcon.text.sm,
  },
  md: {
    container: ACTIVITY_LOG_STYLES.statusIcon.sizes.md,
    text: ACTIVITY_LOG_STYLES.statusIcon.text.md,
  },
  lg: {
    container: ACTIVITY_LOG_STYLES.statusIcon.sizes.lg,
    text: ACTIVITY_LOG_STYLES.statusIcon.text.lg,
  },
} as const;

export function StatusIcon({
  status,
  step,
  size = "md",
  className = "",
  showTitle = true,
}: StatusIconProps): React.ReactElement {
  const sizeConfig = SIZE_CONFIGS[size];

  // Determine icon and color
  const getIcon = () => {
    if (step?.id === "check_duplicates" && status === STATUS.COMPLETED) {
      const hasDuplicates = getDuplicateCount(step.metadata) > 0;
      return hasDuplicates
        ? STATUS_ICON.DUPLICATE
        : STATUS_ICON[STATUS.COMPLETED];
    }
    return (
      STATUS_ICON[status as keyof typeof STATUS_ICON] ??
      STATUS_ICON[STATUS.PENDING]
    );
  };

  const getColor = () => {
    if (step?.id === "check_duplicates") {
      if (status === STATUS.PROCESSING) return "bg-amber-400";
      const hasDuplicates = getDuplicateCount(step.metadata) > 0;
      if (hasDuplicates) return "bg-amber-500";
    }
    return STATUS_COLOR[status] ?? STATUS_COLOR[STATUS.PENDING];
  };

  const icon = getIcon();
  const color = getColor();
  const positioning =
    ICON_POSITIONING[status as keyof typeof ICON_POSITIONING] || "";

  return (
    <div
      className={`
        ${sizeConfig.container} 
        ${ACTIVITY_LOG_STYLES.statusIcon.base}
        ${sizeConfig.text} 
        ${color} 
        ${className}
      `}
      title={
        showTitle
          ? step?.id === "check_duplicates" &&
            getDuplicateCount(step?.metadata) > 0
            ? "duplicate"
            : status
          : undefined
      }
      aria-label={
        step?.id === "check_duplicates" && getDuplicateCount(step?.metadata) > 0
          ? "Duplicate detected"
          : status
      }
    >
      <span className={positioning}>{icon}</span>
    </div>
  );
}
