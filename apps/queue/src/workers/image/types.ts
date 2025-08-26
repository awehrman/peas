import type { IServiceContainer } from "../../services/container";
import type { BaseWorkerDependencies } from "../types";

export interface ImageWorkerDependencies extends BaseWorkerDependencies {
  serviceContainer: IServiceContainer;
}

export interface ImagePipelineData {
  noteId: string;
  importId: string;
  imagePath: string;
  imageId?: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

export interface ImageProcessingData {
  noteId: string;
  importId: string;
  imagePath: string;
  outputDir: string;
  filename: string;
}

export interface ImageSaveData {
  noteId: string;
  importId: string;
  imageId?: string;
  originalPath: string;
  thumbnailPath: string;
  crop3x2Path: string;
  crop4x3Path: string;
  crop16x9Path: string;
  originalSize: number;
  thumbnailSize: number;
  crop3x2Size: number;
  crop4x3Size: number;
  crop16x9Size: number;
  metadata: {
    width: number;
    height: number;
    format: string;
  };
  r2Key?: string;
  r2Url?: string;
}

/**
 * Extended ImageSaveData that includes original processing fields
 * This is used to pass data between actions in the image processing pipeline
 */
export interface ImageProcessingResultData extends ImageSaveData {
  // Original processing fields needed for subsequent actions
  imagePath: string;
  outputDir: string;
  filename: string;
}

/**
 * Unified image job data that can handle all stages of the image processing pipeline
 * This replaces the separate types to simplify the ActionFactory usage
 */
export interface ImageJobData {
  noteId: string;
  importId: string;
  imageId?: string;

  // Original processing fields (from ImageProcessingData)
  imagePath: string;
  outputDir: string;
  filename: string;

  // Processed image paths (from ImageSaveData)
  originalPath: string;
  thumbnailPath: string;
  crop3x2Path: string;
  crop4x3Path: string;
  crop16x9Path: string;

  // File sizes
  originalSize: number;
  thumbnailSize: number;
  crop3x2Size: number;
  crop4x3Size: number;
  crop16x9Size: number;

  // Metadata
  metadata: {
    width: number;
    height: number;
    format: string;
  };

  // R2 upload information
  r2Key?: string;
  r2Url?: string;

  // R2 URLs for processed images
  r2OriginalUrl?: string;
  r2ThumbnailUrl?: string;
  r2Crop3x2Url?: string;
  r2Crop4x3Url?: string;
  r2Crop16x9Url?: string;
}

// Re-export the ActionName enum from the main types file
export { ActionName } from "../../types";
