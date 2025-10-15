import { Progress } from "@peas/components";

import type { StepStatus } from "../types/import-types";
import {
  isStepCompleted,
  isStepError,
  isStepInProgress,
} from "../utils/activity-helpers";

interface ImportActivityStepProps {
  label: string;
  status: StepStatus;
}

/**
 * Individual step display component
 * Shows step name, status indicator, and optional progress
 */
export function ImportActivityStep({ label, status }: ImportActivityStepProps) {
  const inProgress = isStepInProgress(status);
  const completed = isStepCompleted(status);
  const hasError = isStepError(status);

  const progressPercent =
    status.steps && status.processedSteps
      ? Math.round((status.processedSteps / status.steps) * 100)
      : undefined;

  const icon = hasError ? "❌" : completed ? "✅" : inProgress ? "⏳" : "⚪";

  const textColor = hasError
    ? "text-red-600"
    : completed
      ? "text-green-600"
      : inProgress
        ? "text-blue-600"
        : "text-gray-400";

  const message =
    status.errorMessage ||
    status.completedMessage ||
    status.progressMessage ||
    status.startMessage;

  return (
    <div className="py-2 px-2 hover:bg-white rounded transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-lg flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className={`font-medium ${textColor}`}>{label}</span>
        {progressPercent !== undefined && (
          <span className="text-sm text-gray-500 ml-auto">
            {status.processedSteps}/{status.steps} ({progressPercent}%)
          </span>
        )}
      </div>

      {message && (
        <p className="text-sm text-gray-600 ml-9 mt-1 leading-relaxed">
          {message}
        </p>
      )}

      {inProgress && progressPercent !== undefined && (
        <div className="ml-9 mt-2 mr-2">
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}
    </div>
  );
}
