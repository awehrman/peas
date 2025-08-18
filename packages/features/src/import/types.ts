export interface StatusMetadata {
  sizeRemoved?: number | string;
  originalSize?: string;
  bookName?: string;
  siteName?: string;
  domain?: string;
  source?: string;

  // Images
  imageCount?: number;
  completedImages?: number;
  totalImages?: number;
  imageTypes?: string[];
  r2ThumbnailUrl?: string;
  r2Crop3x2Url?: string;
  r2Crop4x3Url?: string;
  r2OriginalUrl?: string;

  // Categorization / tags
  savedCategory?: string;
  savedTags?: string[];

  // Duplicates
  duplicateCount?: number;

  // Generic
  [key: string]: unknown;
}

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
  metadata?: Partial<StatusMetadata>;
}

export interface StepDef {
  id: string;
  name: string;
  sourceIds: string[];
}

export interface ImageSummary {
  count?: number;
  types: string[];
}
