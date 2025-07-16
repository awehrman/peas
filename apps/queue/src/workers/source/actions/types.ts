import type { SourceJobData } from "../types";

export interface ProcessSourceData extends SourceJobData {
  title?: string;
  content?: string;
}

export interface ProcessSourceDeps {
  sourceProcessor: {
    processSource: (data: any) => Promise<any>;
  };
}

export interface SaveSourceData extends SourceJobData {
  source: {
    processedData: {
      title: string;
      content: string;
      metadata: any;
    };
  };
}

export interface SaveSourceDeps {
  database: {
    saveSource: (data: any) => Promise<any>;
  };
}
