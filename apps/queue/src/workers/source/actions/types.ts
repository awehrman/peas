import type { SourceJobData } from "../types";

export interface ProcessSourceData extends SourceJobData {
  title?: string;
  content?: string;
}

export interface ProcessSourceDeps {
  sourceProcessor: {
    processSource: (
      data: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
}

export interface SaveSourceData extends SourceJobData {
  source: {
    processedData: {
      title: string;
      content: string;
      metadata: Record<string, unknown>;
    };
  };
}

export interface SaveSourceDeps {
  database: {
    saveSource: (
      data: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
}
