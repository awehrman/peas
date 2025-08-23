"use client";

import { StatusIcon } from "./status-icon";
import { StepMessage } from "./step-message";
import { StepTitle } from "./step-title";
import { StatusMetadata } from "@/import/types/status-metadata";

import React from "react";

import { ProcessingStep } from "../../../utils/status-parser";
import { STATUS_TEXT } from "../../../utils/status";
import { ACTIVITY_LOG_STYLES } from "../styles/activity-log-styles";

export interface ProcessingStepProps {
  step: ProcessingStep;
  className?: string;
  showProgress?: boolean;
}

export function ProcessingStepItem({
  step,
  className = "",
  showProgress = true,
}: ProcessingStepProps): React.ReactElement {
  const getStatusTextColor = (status: ProcessingStep["status"]) => {
    // Check if this is a duplicate step with duplicates found
    if (step.id === "check_duplicates" && step.status === "completed") {
      const metadata = step.metadata as Partial<StatusMetadata> | undefined;
      if (metadata?.duplicateCount && metadata.duplicateCount > 0) {
        return "text-amber-700"; // Amber color for duplicates
      }
    }
    return STATUS_TEXT[status] ?? STATUS_TEXT.pending;
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Status indicator */}
      <div className={ACTIVITY_LOG_STYLES.stepStatusIcon.container}>
        <StatusIcon status={step.status} step={step} />
      </div>

      {/* Step name and progress */}
      <div className={ACTIVITY_LOG_STYLES.step.content}>
        <div className={ACTIVITY_LOG_STYLES.step.header}>
          <StepTitle
            step={step}
            className={`${ACTIVITY_LOG_STYLES.step.title} ${getStatusTextColor(step.status)}`}
          />
          {step.id !== "adding_images" && step.progress && showProgress && (
            <span className={ACTIVITY_LOG_STYLES.step.progress}>
              {step.progress.current}/{step.progress.total}
            </span>
          )}
        </div>

        {/* Step progress bar */}
        {step.id !== "adding_images" && step.progress && showProgress && (
          <div
            className="mt-1 w-full bg-gray-200 rounded-full h-1"
            role="progressbar"
            aria-valuenow={step.progress.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${step.name} progress: ${step.progress.percentage}%`}
          >
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                step.status === "completed"
                  ? "bg-green-500"
                  : step.status === "processing"
                    ? "bg-blue-500"
                    : step.status === "failed"
                      ? "bg-red-500"
                      : "bg-gray-300"
              }`}
              style={{ width: `${step.progress.percentage}%` }}
            />
          </div>
        )}

        {/* Step message */}
        <StepMessage step={step} className={ACTIVITY_LOG_STYLES.step.message} />
      </div>
    </div>
  );
}
