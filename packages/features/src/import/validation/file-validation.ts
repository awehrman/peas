import { z } from "zod";

import {
  FILE_PATTERNS,
  SUPPORTED_FILE_TYPES,
  UPLOAD_ERROR_MESSAGES,
  UPLOAD_LIMITS,
} from "../constants/upload-constants";

/**
 * Zod schema for validating individual files
 */
export const fileValidationSchema = z
  .object({
    name: z.string().min(1, "File name is required"),
    type: z.string(),
    size: z.number().positive("File size must be positive"),
  })
  .refine((file) => file.size <= UPLOAD_LIMITS.MAX_FILE_SIZE, {
    message: UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE,
    path: ["size"],
  })
  .refine(
    (file) => {
      // HTML files
      if (
        (SUPPORTED_FILE_TYPES.HTML_MIME_TYPES as readonly string[]).includes(
          file.type
        ) ||
        FILE_PATTERNS.HTML_FILE.test(file.name)
      ) {
        return true;
      }

      // Image files with extensions
      if (
        (SUPPORTED_FILE_TYPES.IMAGE_MIME_TYPES as readonly string[]).includes(
          file.type
        ) ||
        FILE_PATTERNS.IMAGE_FILE.test(file.name)
      ) {
        return true;
      }

      // Binary images without extensions (will be validated server-side)
      if (!file.name.includes(".") && file.type === "") {
        return true;
      }

      return false;
    },
    {
      message: UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE,
      path: ["type"],
    }
  );

/**
 * Zod schema for validating file lists
 */
export const fileListValidationSchema = z
  .array(fileValidationSchema)
  .min(1, UPLOAD_ERROR_MESSAGES.NO_FILES_SELECTED)
  .refine(
    (files) => {
      const imageCount = files.filter(
        (file) =>
          (SUPPORTED_FILE_TYPES.IMAGE_MIME_TYPES as readonly string[]).includes(
            file.type
          ) ||
          FILE_PATTERNS.IMAGE_FILE.test(file.name) ||
          (!file.name.includes(".") && file.type === "")
      ).length;
      return imageCount <= UPLOAD_LIMITS.MAX_IMAGES;
    },
    {
      message: UPLOAD_ERROR_MESSAGES.TOO_MANY_IMAGES,
    }
  )
  .refine((files) => files.length <= UPLOAD_LIMITS.MAX_FILES_PER_UPLOAD, {
    message: UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES,
  });

/**
 * Interface for validated file data
 */
export interface ValidatedFile {
  name: string;
  type: string;
  size: number;
  file: File;
}

/**
 * Interface for file grouping result
 */
export interface FileGroup {
  htmlFile: ValidatedFile;
  imageFiles: ValidatedFile[];
  importId: string;
}

/**
 * Interface for directory structure validation result
 */
export interface DirectoryValidationResult {
  isValid: boolean;
  groups: FileGroup[];
  errors: string[];
  ignoredFiles: string[];
}

/**
 * Validates a single file against the schema
 */
export function validateFile(
  file: File
):
  | { success: true; data: ValidatedFile }
  | { success: false; error: z.ZodError } {
  const fileData = {
    name: file.name,
    type: file.type,
    size: file.size,
  };

  const result = fileValidationSchema.safeParse(fileData);

  if (result.success) {
    return {
      success: true,
      data: {
        ...result.data,
        file,
      },
    };
  }

  return result;
}

/**
 * Validates a list of files
 */
export function validateFileList(
  files: File[]
):
  | { success: true; data: ValidatedFile[] }
  | { success: false; error: z.ZodError } {
  const fileDataList = files.map((file) => ({
    name: file.name,
    type: file.type,
    size: file.size,
  }));

  const result = fileListValidationSchema.safeParse(fileDataList);

  if (result.success) {
    return {
      success: true,
      data: result.data.map((fileData, index) => ({
        ...fileData,
        file: files[index]!,
      })),
    };
  }

  return result;
}

/**
 * Groups files by HTML file and associated image directory
 * Expects structure: file-a.html + file-a/ directory with images
 */
export function groupFilesByHtmlAndImages(
  files: ValidatedFile[]
): DirectoryValidationResult {
  const errors: string[] = [];
  const ignoredFiles: string[] = [];
  const groups: FileGroup[] = [];

  // Separate HTML files and other files
  const htmlFiles = files.filter(
    (file) =>
      (SUPPORTED_FILE_TYPES.HTML_MIME_TYPES as readonly string[]).includes(
        file.type
      ) || FILE_PATTERNS.HTML_FILE.test(file.name)
  );

  const otherFiles = files.filter(
    (file) =>
      !(
        (SUPPORTED_FILE_TYPES.HTML_MIME_TYPES as readonly string[]).includes(
          file.type
        ) || FILE_PATTERNS.HTML_FILE.test(file.name)
      )
  );

  // Process each HTML file
  for (const htmlFile of htmlFiles) {
    const htmlName = htmlFile.name.replace(/\.(html|htm)$/i, "");

    // Skip index.html files without associated directories
    if (FILE_PATTERNS.IGNORE_PATTERN.test(htmlFile.name)) {
      const hasAssociatedDir = otherFiles.some((file) =>
        file.name.startsWith(htmlName + "/")
      );

      if (!hasAssociatedDir) {
        ignoredFiles.push(htmlFile.name);
        continue;
      }
    }

    // Find associated image files (files in directory with same name)
    const associatedImages = otherFiles.filter((file) =>
      file.name.startsWith(htmlName + "/")
    );

    // Generate unique importId for this HTML file
    const importId = generateImportId();

    groups.push({
      htmlFile,
      imageFiles: associatedImages,
      importId,
    });
  }

  // Check for orphaned files (files that don't belong to any HTML file)
  const usedFiles = new Set([
    ...htmlFiles.map((f) => f.name),
    ...groups.flatMap((g) => g.imageFiles.map((f) => f.name)),
  ]);

  const orphanedFiles = files.filter((f) => !usedFiles.has(f.name));
  if (orphanedFiles.length > 0) {
    errors.push(
      `Orphaned files found: ${orphanedFiles.map((f) => f.name).join(", ")}`
    );
  }

  return {
    isValid: errors.length === 0,
    groups,
    errors,
    ignoredFiles,
  };
}

/**
 * Generates a unique import ID
 */
function generateImportId(): string {
  const timestamp = Date.now();
  const random1 = Math.random().toString(36).substr(2, 9);
  const random2 = Math.random().toString(36).substr(2, 9);
  return `import_${timestamp}_${random1}_${random2}`;
}
