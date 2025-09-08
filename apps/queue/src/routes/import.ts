import { Router } from "express";
import path from "path";

import {
  FILE_CONSTANTS,
  LOG_MESSAGES,
  SECURITY_CONSTANTS,
} from "../config/constants";
import { SecurityMiddleware } from "../middleware/security";
import { ServiceContainer } from "../services";
import { HttpStatus } from "../types";
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

// Apply security middleware for import routes
importRouter.use(
  SecurityMiddleware.rateLimit(
    SECURITY_CONSTANTS.RATE_LIMITS.IMPORT_WINDOW_MS,
    SECURITY_CONSTANTS.RATE_LIMITS.IMPORT_MAX_REQUESTS
  )
);
importRouter.use(
  SecurityMiddleware.validateRequestSize(
    SECURITY_CONSTANTS.REQUEST_LIMITS.MAX_IMPORT_REQUEST_SIZE_BYTES
  )
);

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
    const serviceContainer = await ServiceContainer.getInstance();
    const noteQueue = serviceContainer.queues.noteQueue;

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
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
});
