"use client";

import type { ReinterpretProgress } from "./types";

import type { ReactNode } from "react";

import { cn } from "@peas/components";

export interface ReinterpretProgressBannerProps {
  progress: ReinterpretProgress | null;
}

const numberFormat = new Intl.NumberFormat("en-US");

function describeProgress(progress: ReinterpretProgress): string {
  const { status, processedCount, totalCount, errorMessage } = progress;
  const counted =
    processedCount !== null && totalCount !== null
      ? `${numberFormat.format(processedCount)} of ${numberFormat.format(totalCount)} lines`
      : null;
  switch (status) {
    case "COMPLETED":
      return totalCount !== null
        ? `Mentions are up to date: ${numberFormat.format(totalCount)} lines reinterpreted`
        : "Mentions are up to date";
    case "FAILED":
    case "CANCELLED":
      return `Reinterpretation stopped${counted ? ` after ${counted}` : ""}${errorMessage ? `: ${errorMessage}` : ""}`;
    case "MISSING":
      return "Reinterpretation was not found; the queue may be offline";
    default:
      return counted
        ? `Updating mentions in the background: ${counted}`
        : "Updating mentions in the background";
  }
}

/**
 * Shows a background reinterpretation run started by a Teach Peas decision (Phase 5f). Renders nothing until a run is tracked.
 *
 * @example
 * <ReinterpretProgressBanner progress={{ jobId: "reinterpret-15", status: "PROCESSING", processedCount: 400, totalCount: 1200, errorMessage: null }} />
 * // "Updating mentions in the background: 400 of 1,200 lines" with a progress bar at 33%
 */
export function ReinterpretProgressBanner({
  progress,
}: ReinterpretProgressBannerProps): ReactNode {
  if (!progress) return null;
  const isFailed =
    progress.status === "FAILED" ||
    progress.status === "CANCELLED" ||
    progress.status === "MISSING";
  const isDone = progress.status === "COMPLETED";
  const percent =
    progress.totalCount && progress.processedCount !== null
      ? Math.min(
          100,
          Math.round((progress.processedCount / progress.totalCount) * 100)
        )
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="reinterpret-progress"
      className={cn(
        "flex flex-col gap-2 rounded-md px-3 py-2 text-sm",
        isFailed
          ? "bg-error-50 text-error-900"
          : isDone
            ? "bg-success-50 text-success-900"
            : "bg-greyscale-50 text-greyscale-900"
      )}
    >
      <p>{describeProgress(progress)}</p>
      {!isDone && !isFailed && percent !== null ? (
        <div
          role="progressbar"
          aria-label="Reinterpretation progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 w-full overflow-hidden rounded-full bg-greyscale-200"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
