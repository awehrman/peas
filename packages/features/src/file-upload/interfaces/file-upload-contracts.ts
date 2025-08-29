/**
 * File Upload Contracts
 * Defines the contracts and events for file upload operations
 */
import {
  type FileUploadOptions,
  type FileUploadProgress,
  type UploadedFile,
} from "./file-upload-provider";

import { type FeatureContext, type FeatureEvent } from "@peas/shared";

export interface FileUploadEvent extends FeatureEvent {
  type:
    | "file-upload-started"
    | "file-upload-progress"
    | "file-upload-completed"
    | "file-upload-failed"
    | "file-upload-cancelled";
  payload: {
    fileId: string;
    filename: string;
    context: FeatureContext;
  };
}

export interface FileUploadStartedEvent extends FileUploadEvent {
  type: "file-upload-started";
  payload: {
    fileId: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    options: FileUploadOptions;
    context: FeatureContext;
  };
}

export interface FileUploadProgressEvent extends FileUploadEvent {
  type: "file-upload-progress";
  payload: {
    fileId: string;
    filename: string;
    progress: FileUploadProgress;
    context: FeatureContext;
  };
}

export interface FileUploadCompletedEvent extends FileUploadEvent {
  type: "file-upload-completed";
  payload: {
    fileId: string;
    filename: string;
    uploadedFile: UploadedFile;
    context: FeatureContext;
  };
}

export interface FileUploadFailedEvent extends FileUploadEvent {
  type: "file-upload-failed";
  payload: {
    fileId: string;
    filename: string;
    error: string;
    context: FeatureContext;
  };
}

export interface FileUploadCancelledEvent extends FileUploadEvent {
  type: "file-upload-cancelled";
  payload: {
    fileId: string;
    filename: string;
    context: FeatureContext;
  };
}

export interface FileUploadQuery {
  importId?: string;
  status?: FileUploadProgress["status"];
  mimeType?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface FileUploadQueryResult {
  files: UploadedFile[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface FileUploadBatchOperation {
  files: Array<{
    file: File;
    options?: FileUploadOptions;
    context?: Partial<FeatureContext>;
  }>;
}

export interface FileUploadBatchResult {
  successCount: number;
  failedCount: number;
  uploadedFiles: UploadedFile[];
  errors: Array<{
    index: number;
    filename: string;
    error: string;
  }>;
}

export interface FileUploadValidationRule {
  name: string;
  validate: (
    file: File,
    options?: FileUploadOptions
  ) => Promise<{
    isValid: boolean;
    error?: string;
    warning?: string;
  }>;
}

export interface FileUploadMetrics {
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  uploadSuccessRate: number;
  filesByType: Record<string, number>;
  filesByStatus: Record<FileUploadProgress["status"], number>;
  averageUploadTime: number;
  storageUsage: {
    totalBytes: number;
    averageFileSize: number;
    filesByType: Record<string, number>;
  };
}
