"use client";

import React from "react";

import { ProcessingStep } from "../../../utils/status-parser";
import { getDuplicateCount } from "../../utils/activity-log-helpers";

export interface StepTitleProps {
  step: ProcessingStep;
  className?: string;
}

export function StepTitle({
  step,
  className = "",
}: StepTitleProps): React.ReactElement {
  // For connecting source, just show the step name
  if (step.id === "connecting_source") {
    return <span className={className}>{step.name}</span>;
  }

  // Highlight Check Duplicates title when duplicates found
  if (
    step.id === "check_duplicates" &&
    step.status === "completed" &&
    getDuplicateCount(step.metadata) > 0
  ) {
    return <span className={`text-amber-600 ${className}`}>{step.name}</span>;
  }

  return <span className={className}>{step.name}</span>;
}
