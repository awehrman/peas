import type { IServiceContainer } from "../../services/container";
import type { StructuredLogger } from "../../types";

export interface PatternTrackingJobData {
  jobId: string;
  patternRules: Array<{
    ruleId: string;
    ruleNumber: number;
  }>;
  exampleLine?: string;
  noteId?: string;
  importId?: string;
  metadata?: Record<string, unknown>;
}

export interface PatternTrackingWorkerDependencies {
  logger: StructuredLogger;
}

export function buildPatternTrackingDependencies(
  serviceContainer: IServiceContainer
): PatternTrackingWorkerDependencies {
  return {
    logger: serviceContainer.logger,
  };
}
