"use client";

import { extractTitlesFromFiles } from "./extract-title";

export interface FileGroup {
  htmlFile: File;
  associatedImages: File[];
  title?: string;
}

export interface FileProcessingResult {
  htmlFiles: File[];
  htmlToImagesMap: Map<string, File[]>;
  fileTitles: Map<string, string>;
  totalImageCount: number;
  hasDirectoryStructure: boolean;
}

export interface FileProcessingOptions {
  maxFilesPerBatch?: number;
  enableTitleExtraction?: boolean;
  filterEvernoteIndex?: boolean;
}

const DEFAULT_OPTIONS: Required<FileProcessingOptions> = {
  maxFilesPerBatch: 50,
  enableTitleExtraction: true,
  filterEvernoteIndex: true,
};

/**
 * Memory-optimized file processor for handling large file uploads
 */
export class FileProcessor {
  private options: Required<FileProcessingOptions>;

  constructor(options: FileProcessingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Process files in memory-efficient batches
   */
  async processFiles(files: File[]): Promise<FileProcessingResult> {
    const result: FileProcessingResult = {
      htmlFiles: [],
      htmlToImagesMap: new Map(),
      fileTitles: new Map(),
      totalImageCount: 0,
      hasDirectoryStructure: false,
    };

    // Check for directory structure
    result.hasDirectoryStructure = files.some(
      (file) => file.webkitRelativePath && file.webkitRelativePath.includes("/")
    );

    // Separate HTML files from other files
    const allHtmlFiles = files.filter(
      (file) =>
        file.type === "text/html" ||
        file.name.endsWith(".html") ||
        file.name.endsWith(".htm")
    );

    // Filter out Evernote_index.html if enabled
    result.htmlFiles = this.options.filterEvernoteIndex
      ? allHtmlFiles.filter((file) => file.name !== "Evernote_index.html")
      : allHtmlFiles;

    // All non-HTML files are potential images
    const imageFiles = files.filter((file) => !result.htmlFiles.includes(file));

    if (result.htmlFiles.length === 0) {
      throw new Error(
        "No HTML files found. Please upload at least one HTML file."
      );
    }

    // Process files in batches to manage memory
    await this.processFilesInBatches(result, imageFiles);

    // Extract titles if enabled
    if (this.options.enableTitleExtraction) {
      result.fileTitles = await this.extractTitlesInBatches(result.htmlFiles);
    }

    return result;
  }

  /**
   * Process files in memory-efficient batches
   */
  private async processFilesInBatches(
    result: FileProcessingResult,
    imageFiles: File[]
  ): Promise<void> {
    const batchSize = this.options.maxFilesPerBatch;

    for (let i = 0; i < result.htmlFiles.length; i += batchSize) {
      const htmlBatch = result.htmlFiles.slice(i, i + batchSize);

      // Process each HTML file in the batch
      for (const htmlFile of htmlBatch) {
        const associatedImages = this.findAssociatedImages(
          htmlFile,
          imageFiles
        );
        result.htmlToImagesMap.set(htmlFile.name, associatedImages);
        result.totalImageCount += associatedImages.length;
      }

      // Allow garbage collection between batches
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  /**
   * Extract titles in batches to prevent memory issues
   */
  private async extractTitlesInBatches(
    htmlFiles: File[]
  ): Promise<Map<string, string>> {
    const fileTitles = new Map<string, string>();
    const batchSize = this.options.maxFilesPerBatch;

    for (let i = 0; i < htmlFiles.length; i += batchSize) {
      const batch = htmlFiles.slice(i, i + batchSize);
      const batchTitles = await extractTitlesFromFiles(batch);

      // Merge batch results
      batchTitles.forEach((title, fileName) => {
        fileTitles.set(fileName, title);
      });

      // Allow garbage collection between batches
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return fileTitles;
  }

  /**
   * Find images associated with a specific HTML file
   */
  private findAssociatedImages(htmlFile: File, imageFiles: File[]): File[] {
    if (!this.hasDirectoryStructure(imageFiles)) {
      return imageFiles; // All images are associated if no directory structure
    }

    const associatedImages: File[] = [];
    const htmlPath = htmlFile.webkitRelativePath || htmlFile.name;
    const htmlDir = htmlPath.split("/")[0];
    const htmlNameWithoutExt = htmlFile.name.replace(/\.(html|htm)$/, "");

    for (const imageFile of imageFiles) {
      const imagePath = imageFile.webkitRelativePath || imageFile.name;

      if (
        htmlDir &&
        this.isImageAssociatedWithHtml(imagePath, htmlDir, htmlNameWithoutExt)
      ) {
        associatedImages.push(imageFile);
      }
    }

    return associatedImages;
  }

  /**
   * Check if files have directory structure
   */
  private hasDirectoryStructure(files: File[]): boolean {
    return files.some(
      (file) => file.webkitRelativePath && file.webkitRelativePath.includes("/")
    );
  }

  /**
   * Determine if an image is associated with a specific HTML file
   */
  private isImageAssociatedWithHtml(
    imagePath: string,
    htmlDir: string,
    htmlNameWithoutExt: string
  ): boolean {
    // Check if the image path contains the HTML file's base directory
    if (!imagePath.startsWith(htmlDir + "/")) {
      return false;
    }

    // Check if the image is in a subdirectory that matches the HTML filename
    const imagePathParts = imagePath.split("/");

    // Look for a directory that matches the HTML filename
    for (let i = 1; i < imagePathParts.length - 1; i++) {
      const dirName = imagePathParts[i];
      if (
        dirName &&
        (dirName.toLowerCase().includes(htmlNameWithoutExt.toLowerCase()) ||
          htmlNameWithoutExt.toLowerCase().includes(dirName.toLowerCase()))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get memory usage information (for debugging)
   */
  getMemoryInfo(): { used: number; total: number; percentage: number } {
    if (typeof performance !== "undefined" && "memory" in performance) {
      const memory = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
        }
      ).memory;
      if (memory) {
        return {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          percentage: Math.round(
            (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
          ),
        };
      }
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  /**
   * Validate file types and sizes
   */
  validateFiles(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const maxTotalSize = 500 * 1024 * 1024; // 500MB

    let totalSize = 0;
    let htmlFileCount = 0;

    for (const file of files) {
      totalSize += file.size;

      // Check individual file size
      if (file.size > maxFileSize) {
        errors.push(
          `File ${file.name} is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 50MB.`
        );
      }

      // Count HTML files
      if (
        file.type === "text/html" ||
        file.name.endsWith(".html") ||
        file.name.endsWith(".htm")
      ) {
        htmlFileCount++;
      }
    }

    // Check total size
    if (totalSize > maxTotalSize) {
      errors.push(
        `Total file size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds maximum allowed size (500MB).`
      );
    }

    // Check for HTML files
    if (htmlFileCount === 0) {
      errors.push("No HTML files found. Please upload at least one HTML file.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
