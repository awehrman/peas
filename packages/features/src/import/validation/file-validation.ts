import { getFilePath } from "@peas/components/lib/file-paths";
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
  /** Path within the selected folder or archive, e.g. "Venison/Venison Stew.html" */
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
    name: getFilePath(file),
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

/** Hidden files anywhere in the path (".DS_Store", "__MACOSX/...") are skipped. */
function isSystemPath(path: string): boolean {
  return path.split("/").some((part) => FILE_PATTERNS.SYSTEM_FILES.test(part));
}

/**
 * Validates a list of files
 */
export function validateFileList(
  files: File[]
):
  | { success: true; data: ValidatedFile[] }
  | { success: false; error: z.ZodError } {
  const filteredFiles = files.filter((file) => !isSystemPath(getFilePath(file)));

  const fileDataList = filteredFiles.map((file) => ({
    name: getFilePath(file),
    type: file.type,
    size: file.size,
  }));

  const result = fileListValidationSchema.safeParse(fileDataList);

  if (!result.success) return result;

  // Map by position: exports contain many images that share a name ("Evernote")
  return {
    success: true,
    data: result.data.map((fileData, index) => {
      const originalFile = filteredFiles[index];
      if (!originalFile) {
        throw new Error(`File not found: ${fileData.name}`);
      }
      return { ...fileData, file: originalFile };
    }),
  };
}

function isHtmlFile(file: ValidatedFile): boolean {
  const fileName = file.name.split("/").pop() || file.name;
  return (
    (SUPPORTED_FILE_TYPES.HTML_MIME_TYPES as readonly string[]).includes(file.type) ||
    FILE_PATTERNS.HTML_FILE.test(fileName)
  );
}

function splitPath(path: string): { directory: string; baseName: string } {
  const separator = path.lastIndexOf("/");
  return separator === -1
    ? { directory: "", baseName: path }
    : { directory: path.slice(0, separator), baseName: path.slice(separator + 1) };
}

/** Case- and accent-form-insensitive key ("Purée" typed vs. decomposed). */
function normalizeName(name: string): string {
  return name.normalize("NFC").trim().toLowerCase();
}

function stripHtmlExtension(fileName: string): string {
  return fileName.replace(/\.(html|htm)$/i, "");
}

/**
 * The note an image folder belongs to: Evernote names it "<title> files",
 * some browsers use "<title>_files", and older exports use "<title>".
 */
function folderNoteKey(folderName: string): string {
  return normalizeName(folderName.replace(/(\s|_)files$/i, ""));
}

/**
 * Groups each HTML note with its images.
 *
 * Images are matched by folder, as Evernote exports them:
 *   Venison/Venison Hot Pot.html
 *   Venison/Venison Hot Pot files/CleanShot.png
 *
 * Loose images next to the HTML are attached when that folder has a single
 * note, or to the note whose title prefixes the image name. Anything that
 * still has no note is ignored (or reported, if nothing else was found).
 */
export function groupFilesByHtmlAndImages(
  files: ValidatedFile[]
): DirectoryValidationResult {
  const ignoredFiles: string[] = [];
  const groupsByPath = new Map<string, FileGroup>();
  const notesByFolder = new Map<string, Map<string, FileGroup>>();
  const notesInDirectory = new Map<string, FileGroup[]>();

  for (const htmlFile of files.filter(isHtmlFile)) {
    const { directory, baseName } = splitPath(htmlFile.name);
    if (FILE_PATTERNS.IGNORE_PATTERN.test(baseName)) {
      ignoredFiles.push(htmlFile.name);
      continue;
    }

    const group: FileGroup = { htmlFile, imageFiles: [], importId: generateImportId() };
    groupsByPath.set(htmlFile.name, group);

    const folderKeys = notesByFolder.get(directory) ?? new Map<string, FileGroup>();
    folderKeys.set(normalizeName(stripHtmlExtension(baseName)), group);
    notesByFolder.set(directory, folderKeys);

    notesInDirectory.set(directory, [...(notesInDirectory.get(directory) ?? []), group]);
  }

  const orphanedFiles: string[] = [];

  for (const file of files.filter((candidate) => !isHtmlFile(candidate))) {
    const { directory, baseName } = splitPath(file.name);
    const { directory: parentDirectory, baseName: folderName } = splitPath(directory);

    const folderMatch = directory
      ? notesByFolder.get(parentDirectory)?.get(folderNoteKey(folderName))
      : undefined;

    const siblings = notesInDirectory.get(directory) ?? [];
    const looseMatch =
      siblings.length === 1
        ? siblings[0]
        : siblings
            .filter((group) =>
              normalizeName(baseName).startsWith(
                normalizeName(stripHtmlExtension(splitPath(group.htmlFile.name).baseName))
              )
            )
            .sort((a, b) => b.htmlFile.name.length - a.htmlFile.name.length)[0];

    const owner = folderMatch ?? looseMatch;
    if (owner) owner.imageFiles.push(file);
    else orphanedFiles.push(file.name);
  }

  const groups = [...groupsByPath.values()];

  if (groups.length === 0 && orphanedFiles.length > 0) {
    return {
      isValid: false,
      groups,
      errors: [`Orphaned files found: ${orphanedFiles.join(", ")}`],
      ignoredFiles,
    };
  }

  return {
    isValid: true,
    groups,
    errors: [],
    ignoredFiles: [...ignoredFiles, ...orphanedFiles],
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
