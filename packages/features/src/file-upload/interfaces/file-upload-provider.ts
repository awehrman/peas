/**
 * File Upload Provider Interface
 * Defines the contract for file upload operations
 */

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
  uploadedAt: string;
  metadata?: Record<string, unknown>;
  context?: FileUploadContext;
}

export interface FileUploadContext {
  featureName: string;
  operation: string;
  userId?: string;
  sessionId?: string;
  importId?: string;
  metadata?: Record<string, unknown>;
}

export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  generateThumbnail?: boolean;
  compress?: boolean;
  metadata?: Record<string, unknown>;
  context?: Partial<FileUploadContext>;
}

export interface FileUploadProgress {
  fileId: string;
  filename: string;
  progress: number; // 0-100
  bytesUploaded: number;
  totalBytes: number;
  speed: number; // bytes per second
  estimatedTimeRemaining: number; // seconds
  status: "pending" | "uploading" | "processing" | "completed" | "failed";
  error?: string;
}

export interface FileUploadProvider {
  /**
   * Upload a single file
   */
  uploadFile(file: File, options?: FileUploadOptions): Promise<UploadedFile>;

  /**
   * Upload multiple files
   */
  uploadFiles(
    files: File[],
    options?: FileUploadOptions
  ): Promise<UploadedFile[]>;

  /**
   * Get upload progress for a file
   */
  getUploadProgress(fileId: string): Promise<FileUploadProgress | null>;

  /**
   * Get all upload progress for an import
   */
  getImportUploadProgress(importId: string): Promise<FileUploadProgress[]>;

  /**
   * Cancel an upload
   */
  cancelUpload(fileId: string): Promise<void>;

  /**
   * Delete an uploaded file
   */
  deleteFile(fileId: string): Promise<void>;

  /**
   * Get file metadata
   */
  getFileMetadata(fileId: string): Promise<UploadedFile | null>;

  /**
   * Validate file before upload
   */
  validateFile(
    file: File,
    options?: FileUploadOptions
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * Get upload statistics
   */
  getUploadStats(
    importId?: string,
    timeRange?: { since: Date; until: Date }
  ): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    uploadSuccessRate: number;
    filesByType: Record<string, number>;
  }>;
}

export interface FileUploadProviderConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  uploadDirectory: string;
  enableCompression: boolean;
  enableThumbnails: boolean;
  thumbnailSize: { width: number; height: number };
  chunkSize: number;
  maxConcurrentUploads: number;
  retryAttempts: number;
  retryDelay: number;
}
