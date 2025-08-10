import type { IServiceContainer } from "../../services/container";
import type { StructuredLogger } from "../../types";

export interface ImageWorkerDependencies {
  serviceContainer: IServiceContainer;
  logger: StructuredLogger;
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
