import type { BaseWorkerDependencies, BaseJobData } from "../types";

// Source Worker Dependencies
export interface SourceWorkerDependencies extends BaseWorkerDependencies {
  sourceProcessor: {
    processSource: (
      data: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
  database: {
    saveSource: (data: Record<string, unknown>) => Promise<unknown>;
  };
}

// Source Job Data
export interface SourceJobData extends BaseJobData {
  title?: string;
  content?: string;
  sourceId?: string;
  source?: Record<string, unknown>;
}
