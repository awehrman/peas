import { describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../services/container";
import type { BaseWorkerDependencies } from "../../types";
import {
  ActionName,
  type ImageJobData,
  type ImagePipelineData,
  type ImageProcessingData,
  type ImageProcessingResultData,
  type ImageSaveData,
  type ImageWorkerDependencies,
} from "../../image/types";

describe("Image Worker Types", () => {
  describe("ImageWorkerDependencies", () => {
    it("should extend BaseWorkerDependencies", () => {
      const mockServiceContainer: IServiceContainer = {} as IServiceContainer;
      const mockLogger = { log: vi.fn() };

      const dependencies: ImageWorkerDependencies = {
        serviceContainer: mockServiceContainer,
        logger: mockLogger,
      };

      expect(dependencies).toHaveProperty("serviceContainer");
      expect(dependencies).toHaveProperty("logger");
      expect(dependencies.serviceContainer).toBe(mockServiceContainer);
      expect(dependencies.logger).toBe(mockLogger);
    });

    it("should be assignable to BaseWorkerDependencies", () => {
      const mockServiceContainer: IServiceContainer = {} as IServiceContainer;
      const mockLogger = { log: vi.fn() };

      const dependencies: ImageWorkerDependencies = {
        serviceContainer: mockServiceContainer,
        logger: mockLogger,
      };

      const baseDependencies: BaseWorkerDependencies = dependencies;
      expect(baseDependencies).toBe(dependencies);
    });
  });

  describe("ImagePipelineData", () => {
    it("should have all required properties", () => {
      const pipelineData: ImagePipelineData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        processingStatus: "pending",
      };

      expect(pipelineData.noteId).toBe("test-note-id");
      expect(pipelineData.importId).toBe("test-import-id");
      expect(pipelineData.imagePath).toBe("/path/to/image.jpg");
      expect(pipelineData.processingStatus).toBe("pending");
    });

    it("should support optional imageId", () => {
      const pipelineData: ImagePipelineData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        imageId: "test-image-id",
        processingStatus: "processing",
      };

      expect(pipelineData.imageId).toBe("test-image-id");
    });

    it("should support optional error", () => {
      const pipelineData: ImagePipelineData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        processingStatus: "failed",
        error: "Processing failed",
      };

      expect(pipelineData.error).toBe("Processing failed");
    });

    it("should support all processing status values", () => {
      const statuses: ImagePipelineData["processingStatus"][] = [
        "pending",
        "processing",
        "completed",
        "failed",
      ];

      statuses.forEach((status) => {
        const pipelineData: ImagePipelineData = {
          noteId: "test-note-id",
          importId: "test-import-id",
          imagePath: "/path/to/image.jpg",
          processingStatus: status,
        };

        expect(pipelineData.processingStatus).toBe(status);
      });
    });
  });

  describe("ImageProcessingData", () => {
    it("should have all required properties", () => {
      const processingData: ImageProcessingData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        outputDir: "/path/to/output",
        filename: "processed-image.jpg",
      };

      expect(processingData.noteId).toBe("test-note-id");
      expect(processingData.importId).toBe("test-import-id");
      expect(processingData.imagePath).toBe("/path/to/image.jpg");
      expect(processingData.outputDir).toBe("/path/to/output");
      expect(processingData.filename).toBe("processed-image.jpg");
    });
  });

  describe("ImageSaveData", () => {
    it("should have all required properties", () => {
      const saveData: ImageSaveData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
      };

      expect(saveData.noteId).toBe("test-note-id");
      expect(saveData.importId).toBe("test-import-id");
      expect(saveData.originalPath).toBe("/path/to/original.jpg");
      expect(saveData.thumbnailPath).toBe("/path/to/thumbnail.jpg");
      expect(saveData.crop3x2Path).toBe("/path/to/crop3x2.jpg");
      expect(saveData.crop4x3Path).toBe("/path/to/crop4x3.jpg");
      expect(saveData.crop16x9Path).toBe("/path/to/crop16x9.jpg");
      expect(saveData.originalSize).toBe(1024000);
      expect(saveData.thumbnailSize).toBe(51200);
      expect(saveData.crop3x2Size).toBe(256000);
      expect(saveData.crop4x3Size).toBe(128000);
      expect(saveData.crop16x9Size).toBe(64000);
      expect(saveData.metadata.width).toBe(1920);
      expect(saveData.metadata.height).toBe(1080);
      expect(saveData.metadata.format).toBe("jpeg");
    });

    it("should support optional imageId", () => {
      const saveData: ImageSaveData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imageId: "test-image-id",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
      };

      expect(saveData.imageId).toBe("test-image-id");
    });

    it("should support optional R2 properties", () => {
      const saveData: ImageSaveData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
        r2Key: "test-key",
        r2Url: "https://test-bucket.s3.amazonaws.com/test-key",
      };

      expect(saveData.r2Key).toBe("test-key");
      expect(saveData.r2Url).toBe("https://test-bucket.s3.amazonaws.com/test-key");
    });
  });

  describe("ImageProcessingResultData", () => {
    it("should extend ImageSaveData with processing fields", () => {
      const resultData: ImageProcessingResultData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        outputDir: "/path/to/output",
        filename: "processed-image.jpg",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
      };

      // Should have ImageSaveData properties
      expect(resultData.noteId).toBe("test-note-id");
      expect(resultData.originalPath).toBe("/path/to/original.jpg");
      expect(resultData.metadata.width).toBe(1920);

      // Should have additional processing fields
      expect(resultData.imagePath).toBe("/path/to/image.jpg");
      expect(resultData.outputDir).toBe("/path/to/output");
      expect(resultData.filename).toBe("processed-image.jpg");
    });
  });

  describe("ImageJobData", () => {
    it("should have all required properties", () => {
      const jobData: ImageJobData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        outputDir: "/path/to/output",
        filename: "processed-image.jpg",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
      };

      expect(jobData.noteId).toBe("test-note-id");
      expect(jobData.importId).toBe("test-import-id");
      expect(jobData.imagePath).toBe("/path/to/image.jpg");
      expect(jobData.outputDir).toBe("/path/to/output");
      expect(jobData.filename).toBe("processed-image.jpg");
      expect(jobData.originalPath).toBe("/path/to/original.jpg");
      expect(jobData.thumbnailPath).toBe("/path/to/thumbnail.jpg");
      expect(jobData.crop3x2Path).toBe("/path/to/crop3x2.jpg");
      expect(jobData.crop4x3Path).toBe("/path/to/crop4x3.jpg");
      expect(jobData.crop16x9Path).toBe("/path/to/crop16x9.jpg");
      expect(jobData.originalSize).toBe(1024000);
      expect(jobData.thumbnailSize).toBe(51200);
      expect(jobData.crop3x2Size).toBe(256000);
      expect(jobData.crop4x3Size).toBe(128000);
      expect(jobData.crop16x9Size).toBe(64000);
      expect(jobData.metadata.width).toBe(1920);
      expect(jobData.metadata.height).toBe(1080);
      expect(jobData.metadata.format).toBe("jpeg");
    });

    it("should support optional imageId", () => {
      const jobData: ImageJobData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imageId: "test-image-id",
        imagePath: "/path/to/image.jpg",
        outputDir: "/path/to/output",
        filename: "processed-image.jpg",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
      };

      expect(jobData.imageId).toBe("test-image-id");
    });

    it("should support optional R2 properties", () => {
      const jobData: ImageJobData = {
        noteId: "test-note-id",
        importId: "test-import-id",
        imagePath: "/path/to/image.jpg",
        outputDir: "/path/to/output",
        filename: "processed-image.jpg",
        originalPath: "/path/to/original.jpg",
        thumbnailPath: "/path/to/thumbnail.jpg",
        crop3x2Path: "/path/to/crop3x2.jpg",
        crop4x3Path: "/path/to/crop4x3.jpg",
        crop16x9Path: "/path/to/crop16x9.jpg",
        originalSize: 1024000,
        thumbnailSize: 51200,
        crop3x2Size: 256000,
        crop4x3Size: 128000,
        crop16x9Size: 64000,
        metadata: {
          width: 1920,
          height: 1080,
          format: "jpeg",
        },
        r2Key: "test-key",
        r2Url: "https://test-bucket.s3.amazonaws.com/test-key",
        r2OriginalUrl: "https://test-bucket.s3.amazonaws.com/original.jpg",
        r2ThumbnailUrl: "https://test-bucket.s3.amazonaws.com/thumbnail.jpg",
        r2Crop3x2Url: "https://test-bucket.s3.amazonaws.com/crop3x2.jpg",
        r2Crop4x3Url: "https://test-bucket.s3.amazonaws.com/crop4x3.jpg",
        r2Crop16x9Url: "https://test-bucket.s3.amazonaws.com/crop16x9.jpg",
      };

      expect(jobData.r2Key).toBe("test-key");
      expect(jobData.r2Url).toBe("https://test-bucket.s3.amazonaws.com/test-key");
      expect(jobData.r2OriginalUrl).toBe("https://test-bucket.s3.amazonaws.com/original.jpg");
      expect(jobData.r2ThumbnailUrl).toBe("https://test-bucket.s3.amazonaws.com/thumbnail.jpg");
      expect(jobData.r2Crop3x2Url).toBe("https://test-bucket.s3.amazonaws.com/crop3x2.jpg");
      expect(jobData.r2Crop4x3Url).toBe("https://test-bucket.s3.amazonaws.com/crop4x3.jpg");
      expect(jobData.r2Crop16x9Url).toBe("https://test-bucket.s3.amazonaws.com/crop16x9.jpg");
    });
  });

  describe("ActionName enum", () => {
    it("should contain all note actions", () => {
      expect(ActionName.CLEAN_HTML).toBe("clean_html");
      expect(ActionName.PARSE_HTML).toBe("parse_html");
      expect(ActionName.SAVE_NOTE).toBe("save_note");
      expect(ActionName.SCHEDULE_ALL_FOLLOWUP_TASKS).toBe("schedule_all_followup_tasks");
      expect(ActionName.SCHEDULE_IMAGES).toBe("schedule_images");
      expect(ActionName.SCHEDULE_INSTRUCTION_LINES).toBe("schedule_instruction_lines");
      expect(ActionName.SCHEDULE_INGREDIENT_LINES).toBe("schedule_ingredient_lines");
      expect(ActionName.CHECK_DUPLICATES).toBe("check_duplicates");
    });

    it("should contain all ingredient actions", () => {
      // Ingredient actions
      expect(ActionName.PARSE_INGREDIENT_LINE).toBe("parse_ingredient_line");
      expect(ActionName.SAVE_INGREDIENT_LINE).toBe("save_ingredient_line");
      expect(ActionName.CHECK_INGREDIENT_COMPLETION).toBe("check_ingredient_completion");
      expect(ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION).toBe("schedule_categorization_after_completion");
    });

    it("should contain all instruction actions", () => {
      // Instruction actions
      expect(ActionName.FORMAT_INSTRUCTION_LINE).toBe("format_instruction_line");
      expect(ActionName.SAVE_INSTRUCTION_LINE).toBe("save_instruction_line");
      expect(ActionName.CHECK_INSTRUCTION_COMPLETION).toBe("check_instruction_completion");
    });

    it("should contain all image actions", () => {
      // Image actions
      expect(ActionName.PROCESS_IMAGE).toBe("process_image");
      expect(ActionName.UPLOAD_ORIGINAL).toBe("upload_original");
      expect(ActionName.UPLOAD_PROCESSED).toBe("upload_processed");
      expect(ActionName.SAVE_IMAGE).toBe("save_image");
      expect(ActionName.CLEANUP_LOCAL_FILES).toBe("cleanup_local_files");
      expect(ActionName.IMAGE_COMPLETED_STATUS).toBe("image_completed_status");
    });

    it("should contain all categorization actions", () => {
      // Categorization actions
      expect(ActionName.DETERMINE_CATEGORY).toBe("determine_category");
      expect(ActionName.SAVE_CATEGORY).toBe("save_category");
      expect(ActionName.DETERMINE_TAGS).toBe("determine_tags");
      expect(ActionName.SAVE_TAGS).toBe("save_tags");
      expect(ActionName.TRACK_PATTERN).toBe("track_pattern");
      expect(ActionName.COMPLETION_STATUS).toBe("completion_status");
    });

    it("should contain all source actions", () => {
      // Source actions
      expect(ActionName.PROCESS_SOURCE).toBe("process_source");
    });

    it("should contain all utility actions", () => {
      expect(ActionName.NO_OP).toBe("no_op");
      expect(ActionName.VALIDATION).toBe("validation");
      expect(ActionName.LOGGING).toBe("logging");
      expect(ActionName.RETRY).toBe("retry");
      expect(ActionName.RETRY_WRAPPER).toBe("retry_wrapper");
      expect(ActionName.CIRCUIT_BREAKER).toBe("circuit_breaker");
      expect(ActionName.ERROR_HANDLING).toBe("error_handling");
      expect(ActionName.PROCESSING_STATUS).toBe("processing_status");
      expect(ActionName.LOG_ERROR).toBe("log_error");
    });

    it("should have unique values", () => {
      const values = Object.values(ActionName);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
