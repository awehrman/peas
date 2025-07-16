import type { BaseWorkerDependencies, BaseJobData } from "../types";

// Image Worker Dependencies
export interface ImageWorkerDependencies extends BaseWorkerDependencies {
  imageProcessor: {
    processImage: (data: ImageData) => Promise<ProcessedImageResult>;
    saveImage: (result: ProcessedImageResult) => Promise<string>;
  };
  database: {
    updateNoteImage: (noteId: string, imageUrl: string) => Promise<unknown>;
  };
}

// Image Job Data
export interface ImageJobData extends BaseJobData {
  noteId: string;
  imageUrl?: string;
  imageData?: string;
  imageType?: string;
  fileName?: string;
  options?: {
    resize?: {
      width?: number;
      height?: number;
      quality?: number;
    };
    format?: "jpeg" | "png" | "webp";
  };
}

// Image Data
export interface ImageData {
  noteId: string;
  url?: string;
  data?: string;
  type?: string;
  fileName?: string;
}

// Processed Image Result
export interface ProcessedImageResult {
  success: boolean;
  processedUrl: string;
  imageMetadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    originalSize?: number;
  };
  errorMessage?: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}
