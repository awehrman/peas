import { Router } from "express";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { noteQueue } from "../queues";
import { ErrorHandler, QueueError } from "../utils";
import { ErrorType, ErrorSeverity } from "../types";

export const importRouter = Router();

const directoryPath = path.join(process.cwd(), "/public/files");
const EVERNOTE_INDEX_FILE = "Evernote_index.html";

async function enqueueHtmlFiles() {
  // Validate directory exists
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Import directory does not exist: ${directoryPath}`);
  }

  // Check if directory is readable
  try {
    await fs.promises.access(directoryPath, fs.constants.R_OK);
  } catch {
    throw new Error(`Cannot read import directory: ${directoryPath}`);
  }

  const files = await fs.promises.readdir(directoryPath);
  const htmlFiles = files.filter(
    (file) => file.endsWith(".html") && file !== EVERNOTE_INDEX_FILE
  );

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
      await fs.promises.access(filePath, fs.constants.R_OK);

      // Read file content
      const content = await fs.promises.readFile(filePath, "utf-8");

      // Validate content is not empty
      if (!content || content.trim().length === 0) {
        throw new Error(`File is empty: ${file}`);
      }

      // Generate unique importId using UUID to prevent collisions
      const importId = randomUUID();

      // Add to queue
      await noteQueue.add(
        "process-note",
        { content, importId },
        {
          jobId: importId,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        }
      );

      results.queued++;
      console.log(`✅ Queued file: ${file} with importId: ${importId}`);
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

      console.error(`❌ Failed to queue file ${file}:`, errorMessage);
    }
  }

  return results;
}

// Kick off import for all HTML files in the directory
importRouter.post("/", async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("🚀 Starting import process...");

    const results = await enqueueHtmlFiles();
    const duration = Date.now() - startTime;

    console.log(`✅ Import completed in ${duration}ms:`, results);

    res.json({
      success: true,
      message: `Import completed successfully`,
      results,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof QueueError) {
      const jobError = error.jobError;
      jobError.context = {
        ...jobError.context,
        duration,
        operation: "import_process",
      };
      ErrorHandler.logError(jobError);

      res.status(400).json({
        success: false,
        error: {
          message: jobError.message,
          type: jobError.type,
          code: jobError.code,
        },
        duration,
        timestamp: jobError.timestamp.toISOString(),
      });
    } else {
      const jobError = ErrorHandler.createJobError(
        error as Error,
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.HIGH,
        { duration, operation: "import_process" }
      );
      ErrorHandler.logError(jobError);

      res.status(500).json({
        success: false,
        error: {
          message: jobError.message,
          type: jobError.type,
        },
        duration,
        timestamp: jobError.timestamp.toISOString(),
      });
    }
  }
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

    res.json({
      success: true,
      status: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total:
          waiting.length + active.length + completed.length + failed.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const jobError = ErrorHandler.createJobError(
      error as Error,
      ErrorType.REDIS_ERROR,
      ErrorSeverity.MEDIUM,
      { operation: "get_import_status" }
    );
    ErrorHandler.logError(jobError);

    res.status(500).json({
      success: false,
      error: {
        message: jobError.message,
        type: jobError.type,
      },
      timestamp: jobError.timestamp.toISOString(),
    });
  }
});
