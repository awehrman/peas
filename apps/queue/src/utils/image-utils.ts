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
  ".tiff",
  ".tif",
] as const;

/**
 * Image magic bytes for content-based detection
 * These are the first few bytes that identify image formats
 */
const IMAGE_MAGIC_BYTES = {
  // JPEG: starts with FF D8 FF
  jpeg: [0xff, 0xd8, 0xff],
  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  // GIF: starts with 47 49 46 38 (GIF8)
  gif: [0x47, 0x49, 0x46, 0x38],
  // WebP: starts with 52 49 46 46 (RIFF) followed by WebP
  webp: [0x52, 0x49, 0x46, 0x46],
  // BMP: starts with 42 4D (BM)
  bmp: [0x42, 0x4d],
  // TIFF: starts with 49 49 2A 00 (little-endian) or 4D 4D 00 2A (big-endian)
  tiff: [0x49, 0x49, 0x2a, 0x00], // little-endian
  tiff_be: [0x4d, 0x4d, 0x00, 0x2a], // big-endian
} as const;

/**
 * Check if a file is an image based on its extension
 */
export function isImageFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext as (typeof IMAGE_EXTENSIONS)[number]);
}

/**
 * Check if a file is an image based on its content (magic bytes)
 */
export async function isImageFileByContent(filePath: string): Promise<boolean> {
  try {
    // Read the first 12 bytes to check magic bytes
    const buffer = Buffer.alloc(12);
    const fileHandle = await fs.open(filePath, "r");
    const { bytesRead } = await fileHandle.read(buffer, 0, 12, 0);
    await fileHandle.close();

    if (bytesRead < 4) {
      return false; // File too small to be an image
    }

    const bytes = Array.from(buffer.subarray(0, bytesRead));

    // Check each image format's magic bytes
    for (const [format, magicBytes] of Object.entries(IMAGE_MAGIC_BYTES)) {
      /* istanbul ignore next -- @preserve */
      if (bytes.length >= magicBytes.length) {
        const matches = magicBytes.every(
          (byte, index) => bytes[index] === byte
        );
        if (matches) {
          console.log(
            `[IMAGE_UTILS] Detected ${format.toUpperCase()} image by content: ${path.basename(filePath)}`
          );
          return true;
        }
      }
    }

    // Special case for WebP: check for "WebP" after RIFF header
    /* istanbul ignore next -- @preserve */
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x65 &&
      bytes[10] === 0x62 &&
      bytes[11] === 0x50
    ) {
      /* istanbul ignore next -- @preserve */
      console.log(
        `[IMAGE_UTILS] Detected WebP image by content: ${path.basename(filePath)}`
      );
      /* istanbul ignore next -- @preserve */
      return true;
    }

    return false;
  } catch (error) {
    console.warn(
      `[IMAGE_UTILS] Error checking file content: ${filePath}`,
      error
    );
    return false;
  }
}

/**
 * Enhanced image detection that checks both extension and content
 */
export async function isImageFileEnhanced(
  fileName: string,
  filePath: string
): Promise<boolean> {
  // First check by extension (fast)
  if (isImageFile(fileName)) {
    return true;
  }

  // If no extension or unknown extension, check by content
  console.log(
    `[IMAGE_UTILS] No extension detected, checking content: ${fileName}`
  );
  return await isImageFileByContent(filePath);
}

/**
 * Get all image files from a directory (enhanced with content detection)
 */
export async function getImageFiles(
  directoryPath: string,
  excludeFiles: string[] = []
): Promise<string[]> {
  console.log(`[IMAGE_UTILS] Checking directory: ${directoryPath}`);

  if (
    !(await fs
      .access(directoryPath)
      .then(() => true)
      .catch(() => false))
  ) {
    console.log(`[IMAGE_UTILS] Directory does not exist: ${directoryPath}`);
    return []; // Directory doesn't exist, return empty array
  }

  try {
    await fs.access(directoryPath, fs.constants.R_OK);
  } catch {
    console.log(`[IMAGE_UTILS] Cannot read directory: ${directoryPath}`);
    throw new Error(`Cannot read directory: ${directoryPath}`);
  }

  const files = await fs.readdir(directoryPath);
  console.log(
    `[IMAGE_UTILS] Found ${files.length} files in directory: ${directoryPath}`
  );

  const imageFiles: string[] = [];

  // Check each file for image content
  for (const file of files) {
    if (excludeFiles.includes(file)) {
      continue;
    }

    const filePath = path.join(directoryPath, file);
    const isImage = await isImageFileEnhanced(file, filePath);

    if (isImage) {
      imageFiles.push(file);
    }
  }

  console.log(
    `[IMAGE_UTILS] Found ${imageFiles.length} image files: ${imageFiles.join(", ")}`
  );

  return imageFiles;
}

/**
 * Get image files with metadata from a directory
 */
export async function getImageFilesWithMetadata(
  directoryPath: string
): Promise<
  Array<{
    fileName: string;
    filePath: string;
    size: number;
    extension: string;
  }>
> {
  console.log(`[IMAGE_UTILS] Getting image files with metadata from: ${directoryPath}`);

  try {
    const files = await fs.readdir(directoryPath);
    console.log(`[IMAGE_UTILS] Found ${files.length} files in directory: ${directoryPath}`);
    console.log(`[IMAGE_UTILS] Files:`, files);

    const results: Array<{
      fileName: string;
      filePath: string;
      size: number;
      extension: string;
    }> = [];

    for (const fileName of files) {
      const filePath = path.join(directoryPath, fileName);
      
      try {
        const stats = await fs.stat(filePath);
        const result = {
          fileName,
          filePath,
          size: stats.size,
          extension: path.extname(fileName) || "binary",
        };
        
        console.log(`[IMAGE_UTILS] Image file: ${fileName} (${stats.size} bytes, ${result.extension})`);
        results.push(result);
      } catch (accessError) {
        console.log(`[IMAGE_UTILS] Could not access image file: ${filePath}`, accessError);
      }
    }

    console.log(`[IMAGE_UTILS] Returning ${results.length} image files with metadata`);
    return results;
  } catch (error) {
    console.log(`[IMAGE_UTILS] Error reading directory: ${directoryPath}`, error);
    return [];
  }
}

/**
 * Find image directory associated with an HTML file
 * Looks for a directory with the same name as the HTML file (without extension)
 */
export async function findImageDirectoryForHtmlFile(
  htmlFilePath: string
): Promise<string | null> {
  console.log(
    `[IMAGE_UTILS] Looking for image directory for HTML file: ${htmlFilePath}`
  );

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

  console.log(
    `[IMAGE_UTILS] Checking possible directory names: ${possibleDirNames.join(", ")}`
  );

  for (const dirName of possibleDirNames) {
    const possiblePath = path.join(htmlDir, dirName);
    console.log(`[IMAGE_UTILS] Checking path: ${possiblePath}`);

    try {
      const stats = await fs.stat(possiblePath);
      /* istanbul ignore next -- @preserve */
      if (stats.isDirectory()) {
        console.log(`[IMAGE_UTILS] Found directory: ${possiblePath}`);
        // Check if this directory contains any image files
        const images = await getImageFiles(possiblePath);
        if (images.length > 0) {
          console.log(
            `[IMAGE_UTILS] Directory contains ${images.length} images: ${possiblePath}`
          );
          return possiblePath;
        } else {
          console.log(
            `[IMAGE_UTILS] Directory exists but contains no images: ${possiblePath}`
          );
        }
      }
    } catch {
      console.log(`[IMAGE_UTILS] Directory does not exist: ${possiblePath}`);
      // Directory doesn't exist, continue to next
    }
  }

  console.log(`[IMAGE_UTILS] No image directory found for: ${htmlFilePath}`);
  return null;
}

/**
 * Enhanced function to find images in multiple locations
 */
export async function findImagesForImport(importId: string): Promise<
  Array<{
    fileName: string;
    filePath: string;
    size: number;
    extension: string;
  }>
> {
  console.log(`[IMAGE_UTILS] Looking for images for import: ${importId}`);

  const possiblePaths = [
    // Coordinated upload directory (most likely)
    path.join(process.cwd(), "uploads", "images", importId),
    // Legacy patterns
    path.join(process.cwd(), "public", "files", importId + "_files"),
    path.join(process.cwd(), "public", "files", importId + ".files"),
    path.join(process.cwd(), "public", "files", importId + "_images"),
    path.join(process.cwd(), "public", "files", importId + ".images"),
    // Additional patterns for different naming conventions
    path.join(process.cwd(), "uploads", "images", importId + "_files"),
    path.join(process.cwd(), "uploads", "images", importId + ".files"),
  ];

  console.log(`[IMAGE_UTILS] Will check ${possiblePaths.length} possible paths for images`);
  console.log(`[IMAGE_UTILS] Possible paths:`, possiblePaths);

  for (const [index, possiblePath] of possiblePaths.entries()) {
    console.log(`[IMAGE_UTILS] Checking path ${index + 1}/${possiblePaths.length}: ${possiblePath}`);

    try {
      const stats = await fs.stat(possiblePath);
      
      if (!stats.isDirectory()) {
        console.log(`[IMAGE_UTILS] Path exists but is not a directory: ${possiblePath}`);
        continue;
      }

      console.log(`[IMAGE_UTILS] Directory exists, checking for images: ${possiblePath}`);
      const images = await getImageFilesWithMetadata(possiblePath);
      
      if (images.length > 0) {
        console.log(`[IMAGE_UTILS] Found ${images.length} images in: ${possiblePath}`);
        console.log(`[IMAGE_UTILS] ✅ SUCCESS: Found ${images.length} images in: ${possiblePath}`);
        console.log(`[IMAGE_UTILS] Images found:`, images.map(img => ({
          fileName: img.fileName,
          size: img.size,
          extension: img.extension
        })));
        return images;
      } else {
        console.log(`[IMAGE_UTILS] Directory exists but contains no images: ${possiblePath}`);
      }
    } catch (error) {
      console.log(`[IMAGE_UTILS] Could not check path: ${possiblePath}`, error);
    }
  }

  console.log(`[IMAGE_UTILS] ❌ NO IMAGES FOUND: No images found for import: ${importId}`);
  console.log(`[IMAGE_UTILS] Checked paths:`, possiblePaths);
  return [];
}
