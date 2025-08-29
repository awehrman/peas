"use client";

import { ReactNode } from "react";

import { WorkflowState } from "../types/workflow";

export interface WorkflowControlsProps {
  state: WorkflowState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onReset: () => void;
  className?: string;
}

export function WorkflowControls({
  state,
  onStart,
  onPause,
  onResume,
  onCancel,
  onReset,
  className = "",
}: WorkflowControlsProps): ReactNode {
  const { isRunning, currentStep } = state;

  const isCompleted = currentStep === "completed";
  const isError = currentStep === "error";
  const isCancelled = currentStep === "cancelled";
  const isPaused = currentStep === "paused";

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {/* Start Button */}
        {!isRunning && !isCompleted && !isError && !isCancelled && (
          <button
            onClick={onStart}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Start Workflow
          </button>
        )}

        {/* Pause Button */}
        {isRunning && !isPaused && (
          <button
            onClick={onPause}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
          >
            Pause
          </button>
        )}

        {/* Resume Button */}
        {isPaused && (
          <button
            onClick={onResume}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Resume
          </button>
        )}

        {/* Cancel Button */}
        {isRunning && !isCompleted && !isError && !isCancelled && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
        )}

        {/* Reset Button */}
        {(isCompleted || isError || isCancelled) && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Status Indicator */}
      <div className="mt-4">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isRunning
                ? "bg-blue-500 animate-pulse"
                : isCompleted
                  ? "bg-green-500"
                  : isError
                    ? "bg-red-500"
                    : isCancelled
                      ? "bg-gray-500"
                      : "bg-gray-300"
            }`}
          />
          <span className="text-sm text-gray-600">
            {isRunning
              ? "Workflow is running..."
              : isCompleted
                ? "Workflow completed successfully"
                : isError
                  ? "Workflow encountered an error"
                  : isCancelled
                    ? "Workflow was cancelled"
                    : isPaused
                      ? "Workflow is paused"
                      : "Workflow is idle"}
          </span>
        </div>
      </div>
    </div>
  );
}
