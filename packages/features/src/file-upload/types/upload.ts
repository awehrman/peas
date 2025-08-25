import React from "react";

export interface UploadItem {
  importId: string;
  htmlFileName: string;
  imageCount: number;
  status: "uploading" | "uploaded" | "failed" | "cancelled";
  createdAt: Date;
  batchProgress?: {
    currentBatch: number;
    totalBatches: number;
    currentFile: number;
    totalFiles: number;
  };
  abortController?: AbortController;
}

export interface UploadContextType {
  uploadingHtmlFiles: string[];
  fileTitles: Map<string, string>; // Map of filename to extracted title
  uploadItems: Map<string, UploadItem>; // Map of importId to UploadItem
  addUploadingHtmlFiles: (files: string[]) => void;
  removeUploadingHtmlFiles: (files: string[]) => void;
  clearUploadingHtmlFiles: () => void;
  setFileTitles: (titles: Map<string, string>) => void;
  clearFileTitles: () => void;
  addUploadItem: (item: UploadItem) => void;
  updateUploadItem: (importId: string, updates: Partial<UploadItem>) => void;
  removeUploadItem: (importId: string) => void;
  clearUploadItems: () => void;
  generateImportId: () => string;
  cancelUpload: (importId: string) => void;
  cancelAllUploads: () => void;
}

export interface UploadProviderProps {
  children: React.ReactNode;
}

export interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  className?: string;
}

export interface UploadResult {
  file: File;
  success: boolean;
  importId?: string;
  error?: string;
}
