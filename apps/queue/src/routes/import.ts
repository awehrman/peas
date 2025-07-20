import { Router } from "express";
import path from "path";
import { noteQueue } from "../queues";
import {
  ErrorHandler,
  formatLogMessage,
  createJobOptions,
  validateFile,
  validateFileContent,
  getHtmlFiles,
  generateUuid,
  measureExecutionTime,
  createQueueStatusResponse,
} from "../utils";
import {
  FILE_CONSTANTS,
  WORKER_CONSTANTS,
  LOG_MESSAGES,
} from "../config/constants";
import { ErrorType, ErrorSeverity } from "../types";

export const importRouter = Router();

const directoryPath = path.join(
  process.cwd(),
  FILE_CONSTANTS.PATHS.PUBLIC_FILES
);

async function enqueueHtmlFiles() {
  const htmlFiles = await getHtmlFiles(directoryPath, [
    FILE_CONSTANTS.PATHS.EVERNOTE_INDEX_FILE,
  ]);

  if (htmlFiles.length === 0) {
    throw new Error(`No HTML files found in directory: ${directoryPath}`);
  }

  const results = {
    total: htmlFiles.length,
    queued: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Process files with individual error handling
  for (const file of htmlFiles) {
    try {
      const filePath = path.join(directoryPath, file);

      // Validate file exists and is readable
      await validateFile(filePath, file);

      // Read file content
      const fs = await import("fs");
      const content = await fs.promises.readFile(filePath, "utf-8");

      // Validate content is not empty
      validateFileContent(content, file);

      // Generate unique importId using UUID to prevent collisions
      const importId = generateUuid();

      // Add to queue with standardized job options
      await noteQueue.add(
        WORKER_CONSTANTS.JOB_TYPES.PROCESS_NOTE,
        { content, importId },
        {
          jobId: importId,
          ...createJobOptions(),
        }
      );

      results.queued++;
      console.log(
        formatLogMessage(LOG_MESSAGES.SUCCESS.FILE_QUEUED, {
          fileName: file,
          importId,
        })
      );
    } catch (error) {
      results.failed++;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`${file}: ${errorMessage}`);

      const jobError = ErrorHandler.createJobError(
        error as Error,
        ErrorType.VALIDATION_ERROR,
        ErrorSeverity.MEDIUM,
        { file, operation: "enqueue_file" }
      );
      ErrorHandler.logError(jobError);

      console.error(
        formatLogMessage(LOG_MESSAGES.ERROR.FILE_FAILED, {
          fileName: file,
          error: errorMessage,
        })
      );
    }
  }

  return results;
}

// Kick off import for all HTML files in the directory
importRouter.post("/", async (req, res) => {
  const { result: results, duration } = await measureExecutionTime(
    enqueueHtmlFiles,
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
