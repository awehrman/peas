"use client";

import { ReactNode } from "react";
import { WorkflowState } from "../types/workflow";

export interface WorkflowProgressProps {
  state: WorkflowState;
  className?: string;
}

export function WorkflowProgress({
  state,
  className = "",
}: WorkflowProgressProps): ReactNode {
  const { isRunning, currentStep, progress, error } = state;

  const getStepColor = (step: string) => {
    switch (step) {
      case "completed":
        return "text-green-600";
      case "error":
        return "text-red-600";
      case "paused":
        return "text-yellow-600";
      case "cancelled":
        return "text-gray-600";
      default:
        return "text-blue-600";
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case "completed":
        return "✓";
      case "error":
        return "✗";
      case "paused":
        return "⏸";
      case "cancelled":
        return "⊘";
      case "running":
      case "initializing":
      case "file-upload":
      case "note-processing":
      case "validation":
      case "cleanup":
      case "completion":
        return "⟳";
      default:
        return "○";
    }
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Import Workflow
        </h3>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Current Step */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Current Step:
          </span>
          <span className={`text-sm font-medium ${getStepColor(currentStep)}`}>
            {getStepIcon(currentStep)} {currentStep.replace("-", " ")}
          </span>
        </div>

        {/* Progress Percentage */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress:</span>
          <span className="text-sm font-medium text-gray-900">
            {progress}%
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`text-sm font-medium ${getStepColor(currentStep)}`}>
            {isRunning ? "Running" : currentStep === "completed" ? "Completed" : currentStep}
          </span>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
