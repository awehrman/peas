"use client";

import { ReactNode } from "react";

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

  const completedSteps = steps.filter(
    (step) => step.status === "completed"
  ).length;
  const totalSteps = steps.length;
  const progressPercentage =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

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
          <span className="font-medium text-gray-700">Overall Progress</span>
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
        <div className={`space-y-2 ${compact ? "space-y-1" : ""}`}>
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-3">
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
                    {step.name}
                  </span>
                  {step.progress && (
                    <span className="text-xs text-gray-500 ml-2">
                      {step.progress.current}/{step.progress.total}
                    </span>
                  )}
                </div>

                {/* Step progress bar */}
                {step.progress && (
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
                {step.message && (
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {step.message}
                  </p>
                )}
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
        {steps.some((step) => step.status === "failed") && (
          <span className="text-red-600 font-medium">
            {steps.filter((step) => step.status === "failed").length} failed
          </span>
        )}
      </div>
    </div>
  );
}
