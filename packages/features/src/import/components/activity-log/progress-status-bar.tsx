"use client";

import { ReactNode } from "react";
import { useMemo } from "react";

import { BASE_STEP_DEFS, STATUS } from "../../utils/status";
import { ProcessingStep } from "../../utils/status-parser";

import { ProcessingStepItem } from "./components/processing-step";
import { ACTIVITY_LOG_STYLES } from "./styles/activity-log-styles";

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
  // Build derived steps from incoming steps, limited to the base set
  const byId = useMemo(() => {
    const m = new Map<string, (typeof steps)[number]>();
    for (const s of steps) m.set(s.id, s);
    return m;
  }, [steps]);

  // Simplified: Just get the step directly by ID
  function getStepById(stepId: string): ProcessingStep | undefined {
    return byId.get(stepId);
  }

  const derivedSteps = useMemo(() => {
    const result = BASE_STEP_DEFS.map((def) => {
      const chosen = getStepById(def.id);

      const step = {
        id: def.id,
        name: def.name,
        // If step is completed, keep it completed; otherwise if we have numeric
        // progress but no terminal status, show PROCESSING; else use existing/pending
        status:
          chosen?.status === STATUS.COMPLETED
            ? STATUS.COMPLETED
            : chosen?.progress && typeof chosen.progress.current === "number"
              ? STATUS.PROCESSING
              : (chosen?.status ?? STATUS.PENDING),
        message: chosen?.message ?? "",
        progress: chosen?.progress,
        metadata: chosen?.metadata,
      } as ProcessingStep;

      return step;
    });

    return result;
  }, [byId, steps]);

  const totalSteps = BASE_STEP_DEFS.length;
  const completedSteps = useMemo(
    () =>
      derivedSteps.filter((step) => step.status === STATUS.COMPLETED).length,
    [derivedSteps]
  );
  let progressPercentage =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // If note completion has been received, force overall progress to 100%
  const noteCompleted = useMemo(
    () =>
      steps.some(
        (s) => s.id === "note_completion" && s.status === STATUS.COMPLETED
      ),
    [steps]
  );
  if (noteCompleted) {
    progressPercentage = 100;
  }

  // Early return after all hooks
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className={`${ACTIVITY_LOG_STYLES.container.spacing} ${className}`}>
      {/* Overall progress bar */}
      <div className={ACTIVITY_LOG_STYLES.progressBar.container}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-greyscale-700">
            Import progress
          </span>
          <span className="text-greyscale-500">{progressPercentage}%</span>
        </div>
        <div
          className={ACTIVITY_LOG_STYLES.progressBar.bar}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall progress: ${progressPercentage}%`}
        >
          <div
            className={`${ACTIVITY_LOG_STYLES.progressBar.fill} ${
              progressPercentage === 100
                ? ACTIVITY_LOG_STYLES.progressBar.colors.completed
                : ACTIVITY_LOG_STYLES.progressBar.colors.processing
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Individual steps */}
      {showDetails && (
        <div
          className={`${ACTIVITY_LOG_STYLES.steps.container} ${compact ? ACTIVITY_LOG_STYLES.steps.compact : ""}`}
        >
          {derivedSteps.map((step) => (
            <ProcessingStepItem key={step.id} step={step} />
          ))}
        </div>
      )}

      {/* Summary */}
      <div className={ACTIVITY_LOG_STYLES.summary.container}>
        <span>
          {completedSteps} of {totalSteps} steps completed
        </span>
        {derivedSteps.some((step) => step.status === "failed") && (
          <span className={ACTIVITY_LOG_STYLES.summary.failed}>
            {derivedSteps.filter((step) => step.status === "failed").length}{" "}
            failed
          </span>
        )}
      </div>
    </div>
  );
}
