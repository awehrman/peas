import { randomUUID } from "crypto";
import { Router } from "express";
import type { Express } from "express-serve-static-core";
import { promises as fs } from "fs";
import multer from "multer";
import path from "path";

import { LOG_MESSAGES, SECURITY_CONSTANTS } from "../config/constants";
import { SecurityMiddleware } from "../middleware/security";
import { ServiceContainer } from "../services";
import { ActionName, HttpStatus } from "../types";
import { isImageFile } from "../utils/image-utils";
import {
  ErrorHandler,
  formatLogMessage,
  measureExecutionTime,
} from "../utils/utils";

export const uploadRouter = Router();

// Ensure upload directories exist at startup
const initializeUploadDirectories = async () => {
  const tempDir = path.join(process.cwd(), "uploads", "temp");
  const imageDir = path.join(process.cwd(), "uploads", "images");

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(imageDir, { recursive: true });
    console.log("[UPLOAD_ROUTE] Upload directories initialized:", {
      tempDir,
      imageDir,
    });
  } catch (error) {
    console.error(
      "[UPLOAD_ROUTE] Failed to initialize upload directories:",
      error
    );
  }
};

// Initialize directories immediately
initializeUploadDirectories();

// Apply security middleware for upload routes
uploadRouter.use(
  SecurityMiddleware.rateLimit(
    SECURITY_CONSTANTS.RATE_LIMITS.IMPORT_WINDOW_MS,
    SECURITY_CONSTANTS.RATE_LIMITS.IMPORT_MAX_REQUESTS
  )
);
uploadRouter.use(
  SecurityMiddleware.validateRequestSize(
    SECURITY_CONSTANTS.REQUEST_LIMITS.MAX_IMPORT_REQUEST_SIZE_BYTES
  )
);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "temp");

    try {
      // Ensure the directory exists
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      console.error("[UPLOAD_ROUTE] Failed to create upload directory:", error);
      cb(error instanceof Error ? error : new Error(String(error)), uploadDir);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename with unique prefix to avoid conflicts
    const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, `${uniquePrefix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 100, // Maximum 100 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Accept HTML files and images
    const isHtml =
      file.mimetype === "text/html" || file.originalname.endsWith(".html");
    const isImage =
      file.mimetype.startsWith("image/") || isImageFile(file.originalname);

    if (isHtml || isImage) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

interface UploadResult {
  importId: string;
  htmlFiles: number;
  imageFiles: number;
  totalFiles: number;
  errors: string[];
}

/**
 * Unified upload endpoint that handles HTML files and their associated image directories
 */
uploadRouter.post(
  "/",
  (req, res, next) => {
    console.log("[UPLOAD_ROUTE] Starting unified upload middleware");
    // @ts-expect-error - Multer/Express type compatibility issue
    upload.any()(req, res, (err) => {
      if (err) {
        console.error("[UPLOAD_ROUTE] Multer error:", err);
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: `Upload failed: ${err.message}`,
        });
      }
      console.log("[UPLOAD_ROUTE] Multer middleware completed successfully");
      next();
    });
  },
  async (req, res) => {
    console.log("[UPLOAD_ROUTE] Processing unified HTML + image upload");

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      console.log("[UPLOAD_ROUTE] No files received in request");
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: "No files uploaded",
      });
    }

    console.log(`[UPLOAD_ROUTE] Received ${files.length} files`);
    console.log(
      "[UPLOAD_ROUTE] Files received:",
      files.map((f) => ({
        originalname: f.originalname,
        filename: f.filename,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype,
      }))
    );

    try {
      const { result, duration } = await measureExecutionTime(
        () => processUploadedFiles(files),
        "Unified upload process"
      );

      console.log(
        formatLogMessage(LOG_MESSAGES.SUCCESS.IMPORT_COMPLETED, { duration })
      );

      res.json(
        ErrorHandler.createHttpSuccessResponse(
          result,
          "Upload completed successfully",
          { duration }
        )
      );
    } catch (error) {
      console.error("[UPLOAD_ROUTE] Upload processing failed:", error);
      const errorResponse = ErrorHandler.handleRouteError(
        error,
        "unified_upload"
      );
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }
);

/**
 * Process uploaded files and create coordinated note and image jobs
 */
async function processUploadedFiles(
  files: Express.Multer.File[]
): Promise<UploadResult> {
  const serviceContainer = await ServiceContainer.getInstance();
  const noteQueue = serviceContainer.queues.noteQueue;

  // Generate a single importId for the entire upload batch
  const importId = randomUUID();
  console.log(`[UPLOAD_ROUTE] Generated importId: ${importId}`);

  // Separate HTML and image files
  const htmlFiles: Express.Multer.File[] = [];
  const imageFiles: Express.Multer.File[] = [];
  const errors: string[] = [];

  console.log(
    `[UPLOAD_ROUTE] Starting file classification for ${files.length} files`
  );

  for (const file of files) {
    console.log(
      `[UPLOAD_ROUTE] Analyzing file: ${file.originalname} (type: ${file.mimetype}, size: ${file.size})`
    );

    const isHtml =
      file.mimetype === "text/html" || file.originalname.endsWith(".html");
    const isImage =
      file.mimetype.startsWith("image/") || isImageFile(file.originalname);

    console.log(
      `[UPLOAD_ROUTE] File classification - isHtml: ${isHtml}, isImage: ${isImage}`
    );

    if (isHtml) {
      htmlFiles.push(file);
      console.log(`[UPLOAD_ROUTE] Added to htmlFiles: ${file.originalname}`);
    } else if (isImage) {
      imageFiles.push(file);
      console.log(
        `[UPLOAD_ROUTE] Added to imageFiles: ${file.originalname} (path: ${file.path})`
      );
    } else {
      console.log(
        `[UPLOAD_ROUTE] Unsupported file type: ${file.originalname} (type: ${file.mimetype})`
      );
      errors.push(`Unsupported file type: ${file.originalname}`);
    }
  }

  console.log(
    `[UPLOAD_ROUTE] Found ${htmlFiles.length} HTML files and ${imageFiles.length} image files`
  );

  // Process each HTML file and create note jobs
  for (const htmlFile of htmlFiles) {
    try {
      console.log(
        `[UPLOAD_ROUTE] Processing HTML file: ${htmlFile.originalname}`
      );

      // Check if file exists before reading
      console.log(`[UPLOAD_ROUTE] Checking file exists: ${htmlFile.path}`);

      try {
        await fs.access(htmlFile.path);
        console.log(
          `[UPLOAD_ROUTE] File exists, reading content: ${htmlFile.path}`
        );
      } catch (accessError) {
        console.error(
          `[UPLOAD_ROUTE] File does not exist: ${htmlFile.path}`,
          accessError
        );
        throw new Error(`File not found: ${htmlFile.originalname}`);
      }

      // Read HTML content
      const htmlContent = await fs.readFile(htmlFile.path, "utf-8");
      console.log(
        `[UPLOAD_ROUTE] Successfully read HTML content: ${htmlContent.length} characters`
      );

      // Create job data with coordinated importId
      const jobData = {
        content: htmlContent,
        importId,
        originalFilePath: htmlFile.path, // Store for image directory discovery
        imageFiles: [], // Will be populated by ScheduleImagesAction
        options: {
          skipFollowupTasks: false, // Enable image scheduling
        },
      };

      console.log(
        `[UPLOAD_ROUTE] Adding HTML job to noteQueue for: ${htmlFile.originalname}`
      );
      await noteQueue.add(ActionName.PARSE_HTML, jobData);

      // Clean up the temporary HTML file after processing
      await fs.unlink(htmlFile.path).catch((err) => {
        console.warn(
          `[UPLOAD_ROUTE] Could not delete temp HTML file: ${err.message}`
        );
      });
    } catch (error) {
      console.error(
        `[UPLOAD_ROUTE] Failed to process HTML file ${htmlFile.originalname}:`,
        error
      );
      errors.push(`Failed to process ${htmlFile.originalname}: ${error}`);
    }
  }

  // Always create image directory for coordinated processing (even if empty)
  try {
    // Create a directory for this importId (whether we have images or not)
    const imageDir = path.join(process.cwd(), "uploads", "images", importId);
    await fs.mkdir(imageDir, { recursive: true });
    console.log(
      `[UPLOAD_ROUTE] Created coordinated image directory: ${imageDir}`
    );

    // Move image files to the coordinated directory if we have any
    if (imageFiles.length > 0) {
      console.log(
        `[UPLOAD_ROUTE] Moving ${imageFiles.length} image files to coordinated directory`
      );

      for (const [index, imageFile] of imageFiles.entries()) {
        console.log(
          `[UPLOAD_ROUTE] Processing image ${index + 1}/${imageFiles.length}: ${imageFile.originalname}`
        );
        console.log(`[UPLOAD_ROUTE] Source path: ${imageFile.path}`);

        // Check if source file exists
        try {
          const sourceStats = await fs.stat(imageFile.path);
          console.log(
            `[UPLOAD_ROUTE] Source file verified - exists: ${true}, size: ${sourceStats.size}`
          );
        } catch (sourceError) {
          console.error(
            `[UPLOAD_ROUTE] Source file missing: ${imageFile.path}`,
            sourceError
          );
          errors.push(`Source file missing for ${imageFile.originalname}`);
          continue;
        }

        const targetPath = path.join(imageDir, imageFile.originalname);
        console.log(`[UPLOAD_ROUTE] Target path: ${targetPath}`);

        try {
          await fs.rename(imageFile.path, targetPath);
          console.log(
            `[UPLOAD_ROUTE] Successfully moved: ${imageFile.originalname}`
          );

          // Verify the move was successful
          const targetStats = await fs.stat(targetPath);
          console.log(
            `[UPLOAD_ROUTE] Target file verified - size: ${targetStats.size}`
          );
        } catch (moveError) {
          console.error(
            `[UPLOAD_ROUTE] Failed to move image ${imageFile.originalname}:`,
            moveError
          );
          errors.push(`Failed to move ${imageFile.originalname}: ${moveError}`);
        }
      }

      // List final directory contents
      try {
        const finalContents = await fs.readdir(imageDir);
        console.log(
          `[UPLOAD_ROUTE] Final directory contents (${finalContents.length} items):`,
          finalContents
        );
      } catch (listError) {
        console.error(
          `[UPLOAD_ROUTE] Could not list final directory contents:`,
          listError
        );
      }

      console.log(
        `[UPLOAD_ROUTE] Successfully organized ${imageFiles.length} images in directory: ${imageDir}`
      );
    } else {
      console.log(
        `[UPLOAD_ROUTE] No image files to move, but directory created for future use: ${imageDir}`
      );
    }
  } catch (error) {
    console.error(
      "[UPLOAD_ROUTE] Failed to create/organize image directory:",
      error
    );
    errors.push(`Failed to create image directory: ${error}`);
  }

  return {
    importId,
    htmlFiles: htmlFiles.length,
    imageFiles: imageFiles.length,
    totalFiles: files.length,
    errors,
  };
}

export default uploadRouter;
