/**
 * Progress Tracking Contracts
 * Defines the contracts and events for progress tracking operations
 */

import { type FeatureContext, type FeatureEvent } from "@peas/shared";
import {
  type ProgressTracker,
  type ProgressStep,
  type ProgressFilter,
} from "./progress-tracker";

export interface ProgressEvent extends FeatureEvent {
  type:
    | "progress-tracker-created"
    | "progress-tracker-updated"
    | "progress-step-updated"
    | "progress-tracker-completed"
    | "progress-tracker-failed"
    | "progress-tracker-cancelled";
  payload: {
    trackerId: string;
    context: FeatureContext;
  };
}

export interface ProgressTrackerCreatedEvent extends ProgressEvent {
  type: "progress-tracker-created";
  payload: {
    trackerId: string;
    tracker: ProgressTracker;
    context: FeatureContext;
  };
}

export interface ProgressTrackerUpdatedEvent extends ProgressEvent {
  type: "progress-tracker-updated";
  payload: {
    trackerId: string;
    tracker: ProgressTracker;
    previousProgress?: number;
    context: FeatureContext;
  };
}

export interface ProgressStepUpdatedEvent extends ProgressEvent {
  type: "progress-step-updated";
  payload: {
    trackerId: string;
    stepId: string;
    step: ProgressStep;
    previousStatus?: ProgressStep["status"];
    context: FeatureContext;
  };
}

export interface ProgressTrackerCompletedEvent extends ProgressEvent {
  type: "progress-tracker-completed";
  payload: {
    trackerId: string;
    tracker: ProgressTracker;
    completionTime: number; // milliseconds
    context: FeatureContext;
  };
}

export interface ProgressTrackerFailedEvent extends ProgressEvent {
  type: "progress-tracker-failed";
  payload: {
    trackerId: string;
    tracker: ProgressTracker;
    error: string;
    context: FeatureContext;
  };
}

export interface ProgressTrackerCancelledEvent extends ProgressEvent {
  type: "progress-tracker-cancelled";
  payload: {
    trackerId: string;
    tracker: ProgressTracker;
    reason?: string;
    context: FeatureContext;
  };
}

export interface ProgressQuery {
  importId?: string;
  status?: ProgressTracker["status"];
  filter?: ProgressFilter;
  includeSteps?: boolean;
  sortBy?: "startTime" | "progress" | "name";
  sortOrder?: "asc" | "desc";
}

export interface ProgressQueryResult {
  trackers: ProgressTracker[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ProgressBatchOperation {
  trackers: Array<{
    name: string;
    description: string;
    steps: Omit<ProgressStep, "id" | "status" | "progress">[];
    context?: Partial<FeatureContext>;
  }>;
}

export interface ProgressBatchResult {
  successCount: number;
  failedCount: number;
  trackers: ProgressTracker[];
  errors: Array<{
    index: number;
    error: string;
  }>;
}

export interface ProgressMetrics {
  totalTrackers: number;
  trackersByStatus: Record<ProgressTracker["status"], number>;
  trackersByImport: Record<string, number>;
  averageCompletionTime: number;
  successRate: number;
  averageStepsPerTracker: number;
  stepsByStatus: Record<ProgressStep["status"], number>;
  realTimeUpdates: {
    activeTrackers: number;
    updatesPerMinute: number;
  };
}
