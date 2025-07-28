import { EventEmitter } from "events";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import path from "path";
import { Transform } from "stream";
import { pipeline } from "stream/promises";

import {
  CACHE_OPTIONS,
  CacheKeyGenerator,
  actionCache,
} from "../workers/core/cache/action-cache";

// ============================================================================
// FILE PROCESSING INTERFACES
// ============================================================================

export interface FileProcessingOptions {
  maxConcurrentFiles?: number;
  maxFileSize?: number; // in bytes
  chunkSize?: number; // in bytes
  tempDirectory?: string;
  cleanupAfterProcessing?: boolean;
  validateContent?: boolean;
  cacheResults?: boolean;
}

export interface FileProcessingResult {
  filePath: string;
  fileName: string;
  status: "success" | "failed" | "skipped";
  size: number;
  processingTime: number;
  error?: string;
  importId?: string;
  contentLength?: number;
}

export interface FileProcessingStats {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  totalSize: number;
  averageProcessingTime: number;
  startTime: Date;
  endTime?: Date;
}

// ============================================================================
// STREAMING FILE PROCESSOR
// ============================================================================

class StreamingFileProcessor extends EventEmitter {
  private options: Required<FileProcessingOptions>;
  private stats: FileProcessingStats;
  private processingQueue: string[] = [];
  private activeProcessors = 0;
  private isShuttingDown = false;

  constructor(options: FileProcessingOptions = {}) {
    super();

    this.options = {
      maxConcurrentFiles: options.maxConcurrentFiles || 5,
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
      chunkSize: options.chunkSize || 64 * 1024, // 64KB
      tempDirectory: options.tempDirectory || path.join(process.cwd(), "temp"),
      cleanupAfterProcessing: options.cleanupAfterProcessing ?? true,
      validateContent: options.validateContent ?? true,
      cacheResults: options.cacheResults ?? true,
    };

    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      totalSize: 0,
      averageProcessingTime: 0,
      startTime: new Date(),
    };
  }

  // ============================================================================
  // MAIN PROCESSING METHODS
  // ============================================================================

  public async processFiles(filePaths: string[]): Promise<FileProcessingStats> {
    this.stats.totalFiles = filePaths.length;
    this.stats.startTime = new Date();

    console.log(`🚀 Starting file processing for ${filePaths.length} files`);

    // Create temp directory if it doesn't exist
    await this.ensureTempDirectory();

    // Process files with backpressure control
    const chunks = this.chunkArray(filePaths, this.options.maxConcurrentFiles);

    for (const chunk of chunks) {
      if (this.isShuttingDown) break;

      const promises = chunk.map((filePath) => this.processFile(filePath));
      await Promise.allSettled(promises);
    }

    this.stats.endTime = new Date();
    this.calculateFinalStats();

    console.log(
      `✅ File processing completed: ${this.stats.processedFiles}/${this.stats.totalFiles} files processed`
    );

    return this.stats;
  }

  private async processFile(filePath: string): Promise<FileProcessingResult> {
    const startTime = Date.now();
    const fileName = path.basename(filePath);

    try {
      // Check if file exists and get stats
      const stats = await fs.stat(filePath);

      if (stats.size > this.options.maxFileSize) {
        const result = this.createResult(
          filePath,
          fileName,
          "skipped",
          stats.size,
          Date.now() - startTime,
          `File size ${stats.size} exceeds maximum allowed size ${this.options.maxFileSize}`
        );

        // Update stats for skipped file
        this.stats.skippedFiles++;
        this.stats.totalSize += stats.size;
        this.emit("fileProcessed", result);

        return result;
      }

      // Check cache first
      if (this.options.cacheResults) {
        const cached = await this.getCachedResult(filePath);
        if (cached) {
          this.stats.processedFiles++;
          this.stats.totalSize += stats.size;
          return cached;
        }
      }

      // Process file with streaming
      const result = await this.streamProcessFile(
        filePath,
        fileName,
        stats.size
      );

      // Cache result
      if (this.options.cacheResults && result.status === "success") {
        await this.cacheResult(filePath, result);
      }

      // Update stats
      if (result.status === "success") {
        this.stats.processedFiles++;
      } else if (result.status === "failed") {
        this.stats.failedFiles++;
      } else {
        this.stats.skippedFiles++;
      }

      this.stats.totalSize += stats.size;

      // Emit progress event
      this.emit("fileProcessed", result);

      return result;
    } catch (error) {
      const result = this.createResult(
        filePath,
        fileName,
        "failed",
        0,
        Date.now() - startTime,
        error instanceof Error ? error.message : "Unknown error"
      );

      this.stats.failedFiles++;
      this.emit("fileProcessed", result);

      return result;
    }
  }

  // ============================================================================
  // STREAMING PROCESSING
  // ============================================================================

  private async streamProcessFile(
    filePath: string,
    fileName: string,
    fileSize: number
  ): Promise<FileProcessingResult> {
    const startTime = Date.now();
    const tempPath = path.join(
      this.options.tempDirectory,
      `${Date.now()}-${fileName}`
    );

    try {
      // Create read stream with error handling
      const readStream = createReadStream(filePath, {
        highWaterMark: this.options.chunkSize,
        encoding: "utf-8",
      });

      // Create content validation transform
      const validationTransform = new Transform({
        objectMode: false,
        transform(chunk, encoding, callback) {
          // Basic content validation
          if (chunk.length === 0) {
            callback(new Error("Empty file content"));
            return;
          }
          callback(null, chunk);
        },
      });

      // Create content processing transform
      const processingTransform = new Transform({
        objectMode: false,
        transform(chunk, encoding, callback) {
          // Process chunk (e.g., HTML cleaning, encoding conversion)
          const processedChunk = chunk
            .toString()
            .replace(/\r\n/g, "\n") // Normalize line endings
            .replace(/\t/g, "  "); // Convert tabs to spaces

          callback(null, processedChunk);
        },
      });

      // Create write stream for processed content
      const writeStream = createWriteStream(tempPath);

      // Process file with streaming pipeline
      await pipeline(
        readStream,
        validationTransform,
        processingTransform,
        writeStream
      );

      // Read processed content
      const processedContent = await fs.readFile(tempPath, "utf-8");

      // Validate processed content
      if (this.options.validateContent) {
        this.validateProcessedContent(processedContent, fileName);
      }

      // Cleanup temp file
      if (this.options.cleanupAfterProcessing) {
        await this.cleanupTempFile(tempPath);
      }

      const processingTime = Date.now() - startTime;

      return this.createResult(
        filePath,
        fileName,
        "success",
        fileSize,
        processingTime,
        undefined,
        await this.generateImportId(),
        processedContent.length
      );
    } catch (error) {
      // Cleanup temp file on error
      await this.cleanupTempFile(tempPath);
      throw error;
    }
  }

  // ============================================================================
  // CONTENT VALIDATION
  // ============================================================================

  private validateProcessedContent(content: string, fileName: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error(`Processed content is empty for file: ${fileName}`);
    }

    if (content.length > this.options.maxFileSize) {
      throw new Error(
        `Processed content size exceeds maximum allowed size for file: ${fileName}`
      );
    }

    // Basic HTML validation
    if (!content.includes("<html") && !content.includes("<!DOCTYPE")) {
      throw new Error(`File does not appear to be valid HTML: ${fileName}`);
    }
  }

  // ============================================================================
  // CACHING
  // ============================================================================

  private async getCachedResult(
    filePath: string
  ): Promise<FileProcessingResult | null> {
    try {
      const cacheKey = CacheKeyGenerator.fileProcessing(filePath);
      return await actionCache.get<FileProcessingResult>(cacheKey);
    } catch (error) {
      console.warn(`Cache read failed for ${filePath}:`, error);
      return null;
    }
  }

  private async cacheResult(
    filePath: string,
    result: FileProcessingResult
  ): Promise<void> {
    try {
      const cacheKey = CacheKeyGenerator.fileProcessing(filePath);
      await actionCache.set(cacheKey, result, CACHE_OPTIONS.FILE_PROCESSING);
    } catch (error) {
      console.warn(`Cache write failed for ${filePath}:`, error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.options.tempDirectory, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create temp directory: ${error}`);
    }
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  private async generateImportId(): Promise<string> {
    const { generateUuid } = await import("./utils");
    return generateUuid();
  }

  private createResult(
    filePath: string,
    fileName: string,
    status: "success" | "failed" | "skipped",
    size: number,
    processingTime: number,
    error?: string,
    importId?: string,
    contentLength?: number
  ): FileProcessingResult {
    return {
      filePath,
      fileName,
      status,
      size,
      processingTime,
      error,
      importId,
      contentLength,
    };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private calculateFinalStats(): void {
    const totalProcessed =
      this.stats.processedFiles +
      this.stats.failedFiles +
      this.stats.skippedFiles;
    if (totalProcessed > 0) {
      this.stats.averageProcessingTime = this.stats.totalSize / totalProcessed;
    }
  }

  // ============================================================================
  // PUBLIC UTILITY METHODS
  // ============================================================================

  public getStats(): FileProcessingStats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      totalSize: 0,
      averageProcessingTime: 0,
      startTime: new Date(),
    };
  }

  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Wait for active processors to complete
    while (this.activeProcessors > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Cleanup temp directory
    if (this.options.cleanupAfterProcessing) {
      try {
        await fs.rm(this.options.tempDirectory, {
          recursive: true,
          force: true,
        });
      } catch (error) {
        console.warn("Failed to cleanup temp directory:", error);
      }
    }
  }

  public async cleanupAllTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.options.tempDirectory);
      const cleanupPromises = files.map((file) =>
        fs.unlink(path.join(this.options.tempDirectory, file))
      );
      await Promise.allSettled(cleanupPromises);
      console.log(`🧹 Cleaned up ${files.length} temp files`);
    } catch (error) {
      console.warn("Failed to cleanup temp files:", error);
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const fileProcessor = new StreamingFileProcessor();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export async function processFilesWithStreaming(
  filePaths: string[],
  options?: FileProcessingOptions
): Promise<FileProcessingStats> {
  const processor = new StreamingFileProcessor(options);

  processor.on("fileProcessed", (result) => {
    console.log(
      `📄 ${result.fileName}: ${result.status} (${result.processingTime}ms)`
    );
  });

  try {
    return await processor.processFiles(filePaths);
  } finally {
    await processor.shutdown();
  }
}

export async function cleanupTempFiles(): Promise<void> {
  await fileProcessor.cleanupAllTempFiles();
}

export function getFileProcessingStats(): FileProcessingStats {
  return fileProcessor.getStats();
}
