import { promises as fs } from "fs";
import path from "path";

/**
 * Supported image file extensions
 */
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
] as const;

/**
 * Check if a file is an image based on its extension
 */
export function isImageFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext as (typeof IMAGE_EXTENSIONS)[number]);
}

/**
 * Get all image files from a directory
 */
export async function getImageFiles(
  directoryPath: string,
  excludeFiles: string[] = []
): Promise<string[]> {
  if (
    !(await fs
      .access(directoryPath)
      .then(() => true)
      .catch(() => false))
  ) {
    return []; // Directory doesn't exist, return empty array
  }

  try {
    await fs.access(directoryPath, fs.constants.R_OK);
  } catch {
    throw new Error(`Cannot read directory: ${directoryPath}`);
  }

  const files = await fs.readdir(directoryPath);
  return files.filter(
    (file) => isImageFile(file) && !excludeFiles.includes(file)
  );
}

/**
 * Get image files with their full paths and metadata
 */
export async function getImageFilesWithMetadata(
  directoryPath: string,
  excludeFiles: string[] = []
): Promise<
  Array<{
    fileName: string;
    filePath: string;
    size: number;
    extension: string;
  }>
> {
  const imageFiles = await getImageFiles(directoryPath, excludeFiles);
  const results = [];

  for (const fileName of imageFiles) {
    const filePath = path.join(directoryPath, fileName);
    try {
      const stats = await fs.stat(filePath);
      results.push({
        fileName,
        filePath,
        size: stats.size,
        extension: path.extname(fileName).toLowerCase(),
      });
    } catch (error) {
      // Skip files that can't be accessed
      console.warn(`Could not access image file: ${filePath}`, error);
    }
  }

  return results;
}

/**
 * Find image directory associated with an HTML file
 * Looks for a directory with the same name as the HTML file (without extension)
 */
export async function findImageDirectoryForHtmlFile(
  htmlFilePath: string
): Promise<string | null> {
  const htmlDir = path.dirname(htmlFilePath);
  const htmlBaseName = path.basename(htmlFilePath, path.extname(htmlFilePath));

  // Common patterns for image directories
  const possibleDirNames = [
    htmlBaseName, // same name as HTML file
    `${htmlBaseName}_files`, // standard pattern
    `${htmlBaseName}.files`, // alternative pattern
    `${htmlBaseName}_images`, // explicit images folder
    `${htmlBaseName}.images`, // alternative images folder
    "images", // generic images folder
    "assets", // generic assets folder
  ];

  for (const dirName of possibleDirNames) {
    const possiblePath = path.join(htmlDir, dirName);
    try {
      const stats = await fs.stat(possiblePath);
      if (stats.isDirectory()) {
        // Check if this directory contains any image files
        const images = await getImageFiles(possiblePath);
        if (images.length > 0) {
          return possiblePath;
        }
      }
    } catch {
      // Directory doesn't exist, continue to next
    }
  }

  return null;
}
