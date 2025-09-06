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
      // Extract just the filename from the full path (for directory uploads)
      const fileName = file.name.split("/").pop() || file.name;

      // HTML files
      if (
        (SUPPORTED_FILE_TYPES.HTML_MIME_TYPES as readonly string[]).includes(
          file.type
        ) ||
        FILE_PATTERNS.HTML_FILE.test(fileName)
      ) {
        return true;
      }

      // Image files with extensions
      if (
        (SUPPORTED_FILE_TYPES.IMAGE_MIME_TYPES as readonly string[]).includes(
          file.type
        ) ||
        FILE_PATTERNS.IMAGE_FILE.test(fileName)
      ) {
        return true;
      }

      // Binary images without extensions (will be validated server-side)
      if (!fileName.includes(".") && file.type === "") {
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
  // Filter out system files before validation
  const filteredFiles = files.filter((file) => {
    const fileName = file.name.split("/").pop() || file.name;
    const isSystemFile = FILE_PATTERNS.SYSTEM_FILES.test(fileName);

    if (isSystemFile) {
      console.log(`Filtering out system file: ${file.name}`);
      return false;
    }

    return true;
  });

  const fileDataList = filteredFiles.map((file) => ({
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
  const htmlFiles = files.filter((file) => {
    const fileName = file.name.split("/").pop() || file.name;
    return (
      (SUPPORTED_FILE_TYPES.HTML_MIME_TYPES as readonly string[]).includes(
        file.type
      ) || FILE_PATTERNS.HTML_FILE.test(fileName)
    );
  });

  const otherFiles = files.filter((file) => {
    const fileName = file.name.split("/").pop() || file.name;
    return !(
      (SUPPORTED_FILE_TYPES.HTML_MIME_TYPES as readonly string[]).includes(
        file.type
      ) || FILE_PATTERNS.HTML_FILE.test(fileName)
    );
  });

  // Process each HTML file
  for (const htmlFile of htmlFiles) {
    // Extract just the filename without directory path
    const fileName = htmlFile.name.split("/").pop() || htmlFile.name;
    const htmlName = fileName.replace(/\.(html|htm)$/i, "");

    // Skip index.html files without associated directories
    if (FILE_PATTERNS.IGNORE_PATTERN.test(fileName)) {
      const hasAssociatedDir = otherFiles.some((file) =>
        file.name.includes(htmlName + "/")
      );

      if (!hasAssociatedDir) {
        ignoredFiles.push(htmlFile.name);
        continue;
      }
    }

    // Find associated image files
    // Look for images in any subdirectory that might be related to this HTML file
    // This handles cases like "1-egg.html" with images in "1-egg files/" directory
    let associatedImages = otherFiles.filter((file) => {
      // Check if the file is in a subdirectory that starts with the HTML name
      const filePath = file.name;
      const htmlBaseName = htmlName.toLowerCase().replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric chars

      // Look for directories that contain the HTML base name
      const pathParts = filePath.split("/");
      for (let i = 0; i < pathParts.length - 1; i++) {
        const pathPart = pathParts[i];
        if (pathPart) {
          const dirName = pathPart.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (
            dirName.includes(htmlBaseName) ||
            htmlBaseName.includes(dirName)
          ) {
            return true;
          }
        }
      }
      return false;
    });

    console.log(`HTML file: ${htmlFile.name}, htmlName: ${htmlName}`);
    console.log(
      `Images in related subdirectory: ${associatedImages.map((f) => f.name).join(", ")}`
    );

    // If no images found in subdirectory, look for images in the same directory
    // This handles cases where HTML and images are in the same folder
    if (associatedImages.length === 0) {
      associatedImages = otherFiles.filter((file) => {
        const fileDir = file.name.split("/").slice(0, -1).join("/");
        const htmlDir = htmlFile.name.split("/").slice(0, -1).join("/");
        const isInSameDir = fileDir === htmlDir;
        console.log(
          `File: ${file.name}, fileDir: "${fileDir}", htmlDir: "${htmlDir}", sameDir: ${isInSameDir}`
        );
        return isInSameDir;
      });
    }

    console.log(
      `Final associated images: ${associatedImages.map((f) => f.name).join(", ")}`
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
