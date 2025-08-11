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

/**
 * All action names in the system
 */
export enum ActionName {
  // Note actions
  CLEAN_HTML = "clean_html",
  PARSE_HTML = "parse_html",
  SAVE_NOTE = "save_note",
  SCHEDULE_ALL_FOLLOWUP_TASKS = "schedule_all_followup_tasks",
  SCHEDULE_IMAGES = "schedule_images",
  SCHEDULE_INSTRUCTION_LINES = "schedule_instruction_lines",
  SCHEDULE_INGREDIENT_LINES = "schedule_ingredient_lines",
  CHECK_DUPLICATES = "check_duplicates",

  // Ingredient actions
  PARSE_INGREDIENT_LINE = "parse_ingredient_line",
  SAVE_INGREDIENT_LINE = "save_ingredient_line",
  CHECK_INGREDIENT_COMPLETION = "check_ingredient_completion",
  INGREDIENT_COMPLETED_STATUS = "ingredient_completed_status",
  UPDATE_INGREDIENT_COUNT = "update_ingredient_count",
  SCHEDULE_CATEGORIZATION_AFTER_COMPLETION = "schedule_categorization_after_completion",

  // Instruction actions
  FORMAT_INSTRUCTION_LINE = "format_instruction_line",
  SAVE_INSTRUCTION_LINE = "save_instruction_line",
  CHECK_INSTRUCTION_COMPLETION = "check_instruction_completion",

  // Image actions
  PROCESS_IMAGE = "process_image",
  UPLOAD_ORIGINAL = "upload_original",
  UPLOAD_PROCESSED = "upload_processed",
  SAVE_IMAGE = "save_image",
  CLEANUP_LOCAL_FILES = "cleanup_local_files",
  IMAGE_COMPLETED_STATUS = "image_completed_status",

  // Categorization actions
  PROCESS_CATEGORIZATION = "process_categorization",
  SAVE_CATEGORIZATION = "save_categorization",
  CATEGORIZATION_COMPLETED_STATUS = "categorization_completed_status",
  TRACK_PATTERN = "track_pattern",
  COMPLETION_STATUS = "completion_status",

  // Source actions
  PROCESS_SOURCE = "process_source",
  SAVE_SOURCE = "save_source",
  SOURCE_PROCESSING_STATUS = "source_processing_status",
  SOURCE_COMPLETED_STATUS = "source_completed_status",
  BROADCAST_SOURCE_COMPLETED = "broadcast_source_completed",

  // Utility actions
  NO_OP = "no_op",
  VALIDATION = "validation",
  LOGGING = "logging",
  RETRY = "retry",
  RETRY_WRAPPER = "retry_wrapper",
  CIRCUIT_BREAKER = "circuit_breaker",
  ERROR_HANDLING = "error_handling",
  PROCESSING_STATUS = "processing_status",
  LOG_ERROR = "log_error",
}
