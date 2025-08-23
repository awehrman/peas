export interface ProcessingStep {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed";
  message: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ImportItem {
  importId: string;
  status: "importing" | "completed" | "failed";
  noteTitle?: string;
  htmlFileName?: string;
  createdAt?: Date;
}

export interface ProcessingContext {
  stepId: string;
  stepName: string;
  expectedEvents: string[];
  dependencies?: string[];
}
