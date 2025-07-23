import { Router } from "express";
import path from "path";

import { FILE_CONSTANTS, LOG_MESSAGES } from "../config/constants";
import { noteQueue } from "../queues";
import {
  FileProcessingOptions,
  processFilesWithStreaming,
} from "../utils/file-processor";
import {
  ErrorHandler,
  createQueueStatusResponse,
  formatLogMessage,
  getHtmlFiles,
  measureExecutionTime,
} from "../utils/utils";

export const importRouter = Router();

// TODO: Apply security middleware when integration issues are resolved
// importRouter.use(SecurityMiddleware.rateLimit(15 * 60 * 1000, 50)); // 50 requests per 15 minutes for import
// importRouter.use(SecurityMiddleware.addSecurityHeaders);

const directoryPath = path.join(
  process.cwd(),
  FILE_CONSTANTS.PATHS.PUBLIC_FILES
);

async function enqueueHtmlFilesWithStreaming() {
  const htmlFiles = await getHtmlFiles(directoryPath, [
    FILE_CONSTANTS.PATHS.EVERNOTE_INDEX_FILE,
  ]);

  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files found in directory: ${directoryPath}`);
  }

  // Convert file names to full paths
  const filePaths = htmlFiles.map((file) => path.join(directoryPath, file));

  // Configure streaming processor options
  const processingOptions: FileProcessingOptions = {
    maxConcurrentFiles: 3, // Process 3 files at a time
    maxFileSize: 50 * 1024 * 1024, // 50MB limit
    chunkSize: 64 * 1024, // 64KB chunks
    cleanupAfterProcessing: true,
    validateContent: true,
    cacheResults: true,
  };

  // Process files with streaming
  const processingStats = await processFilesWithStreaming(
    filePaths,
    processingOptions
  );

  const results = {
    total: processingStats.totalFiles,
    queued: processingStats.processedFiles,
    failed: processingStats.failedFiles,
    skipped: processingStats.skippedFiles,
    errors: [] as string[],
    processingTime: processingStats.endTime
      ? processingStats.endTime.getTime() - processingStats.startTime.getTime()
      : 0,
    totalSize: processingStats.totalSize,
  };

  console.log(
    `📊 Processing completed: ${results.queued}/${results.total} files processed successfully`
  );
  console.log(`⏱️ Total processing time: ${results.processingTime}ms`);
  console.log(
    `📦 Total size processed: ${(results.totalSize / 1024 / 1024).toFixed(2)}MB`
  );

  return results;
}

// Kick off import for all HTML files in the directory
importRouter.post("/", async (req, res) => {
  const { result: results, duration } = await measureExecutionTime(
    enqueueHtmlFilesWithStreaming,
    "Import process"
  );

  console.log(
    formatLogMessage(LOG_MESSAGES.SUCCESS.IMPORT_COMPLETED, {
      duration,
    })
  );

  res.json(
    ErrorHandler.createHttpSuccessResponse(
      results,
      "Import completed successfully",
      { duration }
    )
  );
});

// Get import status
importRouter.get("/status", async (req, res) => {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      noteQueue.getWaiting(),
      noteQueue.getActive(),
      noteQueue.getCompleted(),
      noteQueue.getFailed(),
    ]);

    res.json(createQueueStatusResponse(waiting, active, completed, failed));
  } catch (error) {
    const errorResponse = ErrorHandler.handleRouteError(
      error,
      "get_import_status"
    );
    res.status(500).json(errorResponse);
  }
});
