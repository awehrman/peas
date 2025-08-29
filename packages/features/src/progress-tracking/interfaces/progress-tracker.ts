/**
 * Progress Tracking Provider Interface
 * Defines the contract for tracking progress across import operations
 */

export interface ProgressStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  progress: number; // 0-100
  startTime?: string;
  endTime?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ProgressTracker {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  steps: ProgressStep[];
  totalSteps: number;
  completedSteps: number;
  startTime: string;
  endTime?: string;
  estimatedTimeRemaining?: number; // seconds
  metadata?: Record<string, unknown>;
  context?: ProgressContext;
}

export interface ProgressContext {
  featureName: string;
  operation: string;
  userId?: string;
  sessionId?: string;
  importId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface ProgressTrackerProvider {
  /**
   * Create a new progress tracker
   */
  createTracker(
    name: string,
    description: string,
    steps: Omit<ProgressStep, "id" | "status" | "progress">[],
    context?: Partial<ProgressContext>
  ): Promise<ProgressTracker>;

  /**
   * Get a progress tracker by ID
   */
  getTracker(trackerId: string): Promise<ProgressTracker | null>;

  /**
   * Update tracker progress
   */
  updateTrackerProgress(
    trackerId: string,
    progress: number,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Update step progress
   */
  updateStepProgress(
    trackerId: string,
    stepId: string,
    status: ProgressStep["status"],
    progress?: number,
    error?: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Mark step as completed
   */
  completeStep(
    trackerId: string,
    stepId: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Mark step as failed
   */
  failStep(
    trackerId: string,
    stepId: string,
    error: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Complete the entire tracker
   */
  completeTracker(
    trackerId: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Fail the entire tracker
   */
  failTracker(
    trackerId: string,
    error: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Cancel a tracker
   */
  cancelTracker(
    trackerId: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Get all trackers for an import
   */
  getImportTrackers(importId: string): Promise<ProgressTracker[]>;

  /**
   * Get trackers by status
   */
  getTrackersByStatus(
    status: ProgressTracker["status"],
    filter?: ProgressFilter
  ): Promise<ProgressTracker[]>;

  /**
   * Clean up old completed trackers
   */
  cleanupOldTrackers(retentionDays: number): Promise<number>;

  /**
   * Get progress statistics
   */
  getProgressStats(
    importId?: string,
    timeRange?: { since: Date; until: Date }
  ): Promise<{
    totalTrackers: number;
    completedTrackers: number;
    failedTrackers: number;
    averageCompletionTime: number;
    successRate: number;
    trackersByStatus: Record<ProgressTracker["status"], number>;
  }>;
}

export interface ProgressFilter {
  importId?: string;
  status?: ProgressTracker["status"];
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface ProgressTrackerProviderConfig {
  maxTrackersPerUser: number;
  maxStepsPerTracker: number;
  cleanupRetentionDays: number;
  enableRealTimeUpdates: boolean;
  enableMetrics: boolean;
  updateInterval: number; // milliseconds
}
