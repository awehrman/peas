// Core type definitions for the import feature

export interface BaseItem {
  importId: string;
  htmlFileName: string;
  createdAt: Date;
}

export interface UploadItem extends BaseItem {
  imageCount: number;
  status: "uploading" | "uploaded" | "failed" | "cancelled";
  batchProgress?: BatchProgress;
  abortController?: AbortController;
  type?: "upload";
}

export interface ImportItem extends BaseItem {
  noteTitle?: string;
  status: "importing" | "completed" | "failed";
  completedAt?: Date;
  type?: "import";
}

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  currentFile: number;
  totalFiles: number;
}

export interface UploadProgress {
  htmlFileName: string;
  imageCount: number;
  uploadStatus: "uploading" | "uploaded" | "failed" | "cancelled";
}

export interface ImportItemWithUploadProgress extends ImportItem {
  uploadProgress?: UploadProgress;
}

export type ActivityItem = ImportItemWithUploadProgress | UploadItem;

export interface ConnectionState {
  status: "connecting" | "connected" | "disconnected" | "error" | "retrying";
  error?: string;
  reconnectAttempts: number;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface StatusMetadata {
  [key: string]: unknown;
  noteTitle?: string;
  htmlFileName?: string;
  bookName?: string;
  siteName?: string;
  domain?: string;
  source?: string;
  savedCategory?: string;
  savedTags?: string[];
}

export interface ProcessingStep {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
  metadata?: Partial<StatusMetadata>;
  message?: string;
  timestamp?: Date;
}

export interface ImportConfig {
  maxFileSize: number;
  maxTotalSize: number;
  acceptedFileTypes: string[];
  batchSize: number;
  delayBetweenBatches: number;
  maxRetries: number;
  timeoutMs: number;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PerformanceMetrics {
  uploadStartTime: number;
  uploadEndTime: number;
  totalDuration: number;
  filesProcessed: number;
  totalFileSize: number;
  averageUploadTime: number;
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
  };
}
