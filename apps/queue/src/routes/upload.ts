import { randomUUID } from "crypto";
import { Router } from "express";
import type { Request } from "express";
import type { Express } from "express-serve-static-core";
import fs from "fs/promises";
import multer from "multer";
import path from "path";

import { LOG_MESSAGES, SECURITY_CONSTANTS } from "../config/constants";
import { SecurityMiddleware } from "../middleware/security";
import { ServiceContainer } from "../services";
import { ActionName, HttpStatus } from "../types";
import { convertBinaryImageToStandardFormat } from "../utils/image-converter";
import { isImageFile, isImageFileEnhanced } from "../utils/image-utils";
import {
  ErrorHandler,
  formatLogMessage,
  measureExecutionTime,
} from "../utils/utils";

export const uploadRouter = Router();

interface UploadResult {
  totalFiles: number;
  htmlFiles: number;
  imageFiles: number;
  errors: string[];
  importId: string;
}

// Initialize upload directories
const initializeUploadDirectories = async () => {
  const directories = [
    path.join(process.cwd(), "uploads"),
    path.join(process.cwd(), "uploads", "temp"),
    path.join(process.cwd(), "uploads", "images"),
    path.join(process.cwd(), "uploads", "processed"),
  ];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`[UPLOAD_ROUTE] Created directory: ${dir}`);
    } catch (error) {
      /* istanbul ignore next -- @preserve */
      console.warn(`[UPLOAD_ROUTE] Could not create directory ${dir}:`, error);
    }
  }
};

// Initialize directories on startup
/* istanbul ignore next -- @preserve */
initializeUploadDirectories().catch(console.error);

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
/* istanbul ignore next -- @preserve */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "temp");

    try {
      // Ensure the directory exists
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      /* istanbul ignore next -- @preserve */
      console.error("[UPLOAD_ROUTE] Failed to create upload directory:", error);
      /* istanbul ignore next -- @preserve */
      cb(error instanceof Error ? error : new Error(String(error)), uploadDir);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename with unique prefix to avoid conflicts
    const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, `${uniquePrefix}-${file.originalname}`);
  },
});

/* istanbul ignore next -- @preserve */
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 100, // Maximum 100 files per upload
  },
  fileFilter: async (req, file, cb) => {
    try {
      // Accept HTML files and images
      const isHtml =
        file.mimetype === "text/html" || file.originalname.endsWith(".html");

      // For images, we'll do a quick check here and a full content check later
      const isImage =
        file.mimetype.startsWith("image/") || isImageFile(file.originalname);

      if (isHtml || isImage) {
        cb(null, true);
      } else {
        // For files without extensions or unknown types, we'll check content later
        // Accept them for now and let the enhanced detection handle it
        console.log(
          `[UPLOAD_ROUTE] Accepting file for content check: ${file.originalname}`
        );
        cb(null, true);
      }
    } catch (error) {
      /* istanbul ignore next -- @preserve */
      console.error("[UPLOAD_ROUTE] File filter error:", error);
      /* istanbul ignore next -- @preserve */
      cb(null, false);
    }
  },
});

/**
 * Unified upload endpoint that handles HTML files and their associated image directories
 */
uploadRouter.post(
  "/",
  (req, res, next) => {
    /* istanbul ignore next -- @preserve */
    console.log("[UPLOAD_ROUTE] Starting unified upload middleware");
    /* istanbul ignore next -- @preserve */
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
    const uploadId = randomUUID();
    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 🚀 Starting unified HTML + image upload`
    );
    console.log(`[UPLOAD_ROUTE:${uploadId}] 📋 Request headers:`, {
      "content-type": req.headers["content-type"],
      "x-import-id": req.headers["x-import-id"],
      "user-agent": req.headers["user-agent"],
    });

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      console.log(`[UPLOAD_ROUTE:${uploadId}] ❌ No files received in request`);
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: "No files uploaded",
      });
    }

    console.log(`[UPLOAD_ROUTE:${uploadId}] 📁 Received ${files.length} files`);
    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 📄 Files received:`,
      files.map((f) => ({
        originalname: f.originalname,
        filename: f.filename,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype,
      }))
    );

    try {
      console.log(`[UPLOAD_ROUTE:${uploadId}] 🔄 Starting file processing...`);
      const { result, duration } = await measureExecutionTime(
        () => processUploadedFiles(files, req, uploadId),
        "Unified upload process"
      );

      console.log(
        `[UPLOAD_ROUTE:${uploadId}] ✅ Upload processing completed in ${duration}ms`
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
      console.error(
        `[UPLOAD_ROUTE:${uploadId}] ❌ Upload processing failed:`,
        error
      );
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
  files: Express.Multer.File[],
  req: Request,
  uploadId: string
): Promise<UploadResult> {
  const serviceContainer = await ServiceContainer.getInstance();
  const noteQueue = serviceContainer.queues.noteQueue;

  // Accept importId from frontend or generate one
  const headerImportId = req.headers["x-import-id"];
  /* istanbul ignore next -- @preserve */
  const importId =
    (typeof headerImportId === "string" ? headerImportId : undefined) ||
    (req.body as { importId?: string }).importId ||
    randomUUID();
  /* istanbul ignore next -- @preserve */
  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 🔑 Using importId: ${importId} (${typeof headerImportId === "string" ? "from frontend" : "generated"})`
  );

  // Extract metadata from the request
  const uploadIndex = req.body.uploadIndex;
  const totalUploads = req.body.totalUploads;
  const htmlFileName = req.body.htmlFileName;
  const associatedImageCount = req.body.associatedImageCount;

  if (uploadIndex !== undefined) {
    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 📊 Upload ${parseInt(uploadIndex) + 1}/${totalUploads} - HTML: ${htmlFileName} with ${associatedImageCount} images`
    );
  }

  // Separate HTML and image files
  const htmlFiles: Express.Multer.File[] = [];
  const imageFiles: Express.Multer.File[] = [];
  const errors: string[] = [];

  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 🔍 Starting file classification for ${files.length} files`
  );

  for (const file of files) {
    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 📋 Analyzing file: ${file.originalname} (type: ${file.mimetype}, size: ${file.size})`
    );

    // Filter out Evernote_index files (both HTML and image variants)
    if (file.originalname.includes("Evernote_index")) {
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] ⏭️ Ignoring Evernote index file: ${file.originalname}`
      );
      continue;
    }

    const isHtml =
      file.mimetype === "text/html" || file.originalname.endsWith(".html");

    // Use enhanced image detection that supports binary files without extensions
    const isImage = await isImageFileEnhanced(file.originalname, file.path);

    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 🏷️ File classification - isHtml: ${isHtml}, isImage: ${isImage}`
    );

    if (isHtml) {
      htmlFiles.push(file);
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] ✅ Added to htmlFiles: ${file.originalname}`
      );
    } else if (isImage) {
      imageFiles.push(file);
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] ✅ Added to imageFiles: ${file.originalname} (path: ${file.path})`
      );
    } else {
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] ❌ Unsupported file type: ${file.originalname} (type: ${file.mimetype})`
      );
      errors.push(`Unsupported file type: ${file.originalname}`);
    }
  }

  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 📊 Found ${htmlFiles.length} HTML files and ${imageFiles.length} image files`
  );

  // Note: Evernote_index files are now filtered out during classification above
  const filteredHtmlFiles = htmlFiles; // No additional filtering needed

  // SIMPLIFIED LOGIC: Since frontend handles grouping, all images are associated with the HTML file
  const htmlToImagesMap = new Map<string, Express.Multer.File[]>();

  // Associate all images with the HTML file (frontend has already done the grouping)
  if (filteredHtmlFiles.length > 0 && imageFiles.length > 0) {
    const htmlFile = filteredHtmlFiles[0]!; // Should only be one HTML file per upload
    htmlToImagesMap.set(htmlFile.originalname, imageFiles);

    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 🔗 Associated ${imageFiles.length} images with HTML file ${htmlFile.originalname}`
    );
  }

  // Log summary of associations
  console.log(`[UPLOAD_ROUTE:${uploadId}] === FILE ASSOCIATION SUMMARY ===`);
  for (const [htmlFileName, images] of htmlToImagesMap.entries()) {
    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 📄 ${htmlFileName}: ${images.length} images`
    );
    images.forEach((img, index) => {
      console.log(
        `[UPLOAD_ROUTE:${uploadId}]   ${index + 1}. ${img.originalname}`
      );
    });
  }
  console.log(`[UPLOAD_ROUTE:${uploadId}] ================================`);

  // Log summary of all images and their processing status
  console.log(`[UPLOAD_ROUTE:${uploadId}] === IMAGE PROCESSING SUMMARY ===`);
  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 📊 Total images: ${imageFiles.length}`
  );
  let associatedCount = 0;
  for (const [, images] of htmlToImagesMap.entries()) {
    associatedCount += images.length;
  }
  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 🔗 Associated with HTML files: ${associatedCount}`
  );
  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 🔄 Will be processed separately: ${imageFiles.length - associatedCount}`
  );
  console.log(`[UPLOAD_ROUTE:${uploadId}] ==================================`);

  // Create a map to track file renames during processing
  const fileRenameMap = new Map<string, string>();

  // Generate unique import ID for this upload
  const processedImportIds: string[] = [];
  const htmlFileToImportIdMap = new Map<string, string>();

  for (const htmlFile of filteredHtmlFiles) {
    // Generate unique importId for this file
    const fileImportId = importId; // Use the single importId for this upload
    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 🔑 Generated importId for ${htmlFile.originalname}: ${fileImportId}`
    );

    // Track the importId for directory creation
    processedImportIds.push(fileImportId);
    htmlFileToImportIdMap.set(htmlFile.originalname, fileImportId);
    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 💾 Stored importId ${fileImportId} for ${htmlFile.originalname} in map`
    );
  }

  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 📋 Generated ${processedImportIds.length} import IDs:`,
    processedImportIds
  );

  // Create image directory for this importId
  try {
    // Create a directory for this upload's importId
    const imageDir = path.join(process.cwd(), "uploads", "images", importId);
    await fs.mkdir(imageDir, { recursive: true });
    console.log(
      `[UPLOAD_ROUTE:${uploadId}] 📁 Created image directory: ${imageDir}`
    );

    // Move image files to their directory
    if (imageFiles.length > 0) {
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 🚚 Moving ${imageFiles.length} image files to directory`
      );

      for (const [index, imageFile] of imageFiles.entries()) {
        console.log(
          `[UPLOAD_ROUTE:${uploadId}] 🖼️ Processing image ${index + 1}/${imageFiles.length}: ${imageFile.originalname}`
        );
        console.log(
          `[UPLOAD_ROUTE:${uploadId}] 📍 Source path: ${imageFile.path}`
        );

        // Check if source file exists
        try {
          const sourceStats = await fs.stat(imageFile.path);
          console.log(
            `[UPLOAD_ROUTE:${uploadId}] ✅ Source file verified - exists: ${true}, size: ${sourceStats.size}`
          );
        } catch (sourceError) {
          console.error(
            `[UPLOAD_ROUTE:${uploadId}] ❌ Source file missing: ${imageFile.path}`,
            sourceError
          );
          errors.push(`Source file missing for ${imageFile.originalname}`);
          continue;
        }

        // Check if this is a binary image (no extension) and convert it
        const hasExtension = path.extname(imageFile.originalname).length > 0;
        let finalPath = imageFile.path;

        // Use the importId for this image (same as the HTML file)

        // Use original filename for files with extensions, only rename binary files
        let finalFilename = imageFile.originalname;

        if (!hasExtension) {
          console.log(
            `[UPLOAD_ROUTE:${uploadId}] 🔄 Binary image detected: ${imageFile.originalname}, attempting conversion`
          );

          // Create a simple logger for the conversion process
          /* istanbul ignore next -- @preserve */
          const logger = {
            log: (message: string) => console.log(message),
            error: (message: string) => console.error(message),
            warn: (message: string) => console.warn(message),
            debug: (message: string) => console.log(message),
          };

          // Convert binary file to standard format
          const conversionResult = await convertBinaryImageToStandardFormat(
            imageFile.path,
            logger,
            imageFile.originalname // Use original name as base
          );

          if (
            conversionResult.success &&
            conversionResult.outputPath &&
            conversionResult.newFilename
          ) {
            console.log(
              `[UPLOAD_ROUTE:${uploadId}] ✅ Conversion successful: ${imageFile.originalname} -> ${conversionResult.newFilename}`
            );
            finalPath = conversionResult.outputPath;
            finalFilename = conversionResult.newFilename;

            // Track the file rename for updating pre-assigned images
            fileRenameMap.set(imageFile.originalname, finalFilename);
            console.log(
              `[UPLOAD_ROUTE:${uploadId}] 📝 Tracked file rename: ${imageFile.originalname} -> ${finalFilename}`
            );

            // Clean up the original binary file
            try {
              await fs.unlink(imageFile.path);
              console.log(
                `[UPLOAD_ROUTE:${uploadId}] 🗑️ Cleaned up original binary file: ${imageFile.path}`
              );
            } catch (cleanupError) {
              /* istanbul ignore next -- @preserve */
              console.warn(
                `[UPLOAD_ROUTE:${uploadId}] ⚠️ Could not clean up original file: ${cleanupError}`
              );
            }
          } else {
            console.log(
              `[UPLOAD_ROUTE:${uploadId}] ❌ Conversion failed, using original file: ${imageFile.originalname}`
            );
          }
        } else {
          // For files with extensions, keep original filename
          console.log(
            `[UPLOAD_ROUTE:${uploadId}] 📄 Using original filename: ${imageFile.originalname}`
          );
        }

        // Move image file to the directory
        const targetPath = path.join(imageDir, finalFilename);
        console.log(`[UPLOAD_ROUTE:${uploadId}] 🎯 Target path: ${targetPath}`);

        try {
          await fs.rename(finalPath, targetPath);
          console.log(
            `[UPLOAD_ROUTE:${uploadId}] ✅ Successfully moved: ${finalFilename}`
          );

          // Verify the move was successful
          const targetStats = await fs.stat(targetPath);
          console.log(
            `[UPLOAD_ROUTE:${uploadId}] ✅ Target file verified - size: ${targetStats.size}`
          );
        } catch (moveError) {
          console.error(
            `[UPLOAD_ROUTE:${uploadId}] ❌ Failed to move image ${finalFilename}:`,
            moveError
          );
          errors.push(`Failed to move ${finalFilename}: ${moveError}`);
        }
      }

      // List final directory contents
      try {
        const finalContents = await fs.readdir(imageDir);
        console.log(
          `[UPLOAD_ROUTE:${uploadId}] 📋 Final directory contents (${finalContents.length} items):`,
          finalContents
        );
      } catch (listError) {
        /* istanbul ignore next -- @preserve */
        console.error(
          `[UPLOAD_ROUTE:${uploadId}] ❌ Could not list final directory contents:`,
          listError
        );
      }

      console.log(
        `[UPLOAD_ROUTE:${uploadId}] ✅ Successfully organized ${imageFiles.length} images in directory`
      );

      // Log the file rename map for debugging
      if (fileRenameMap.size > 0) {
        console.log(
          `[UPLOAD_ROUTE:${uploadId}] 📝 File rename map (${fileRenameMap.size} entries):`
        );
        for (const [originalName, newName] of fileRenameMap.entries()) {
          console.log(
            `[UPLOAD_ROUTE:${uploadId}]   ${originalName} -> ${newName}`
          );
        }
      } else {
        console.log(
          `[UPLOAD_ROUTE:${uploadId}] 📝 No file renames occurred during processing`
        );
      }
    } else {
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 📝 No image files to move, but directory created for future use: ${importId}`
      );
    }
  } catch (error) {
    console.error(
      `[UPLOAD_ROUTE:${uploadId}] ❌ Failed to create/organize image directory:`,
      error
    );
    errors.push(`Failed to create image directory: ${error}`);
  }

  // Process HTML files
  for (const htmlFile of filteredHtmlFiles) {
    try {
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 📄 Processing HTML file: ${htmlFile.originalname}`
      );

      // Get the importId for this file
      const fileImportId =
        htmlFileToImportIdMap.get(htmlFile.originalname) || importId;
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 🔑 Retrieved importId for ${htmlFile.originalname}: ${fileImportId}`
      );

      // Find associated images for this HTML file
      const associatedImages = htmlToImagesMap.get(htmlFile.originalname) || [];
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 🖼️ Found ${associatedImages.length} associated images for ${htmlFile.originalname}:`,
        associatedImages.map((img) => img.originalname)
      );

      // Debug: Show the actual image objects
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 🔍 Associated image objects for ${htmlFile.originalname}:`,
        associatedImages.map((img) => ({
          originalname: img.originalname,
          filename: img.filename,
          path: img.path,
          size: img.size,
        }))
      );

      // Check if file exists before reading
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 🔍 Checking file exists: ${htmlFile.path}`
      );
      try {
        await fs.access(htmlFile.path);
        console.log(
          `[UPLOAD_ROUTE:${uploadId}] ✅ File exists, reading content: ${htmlFile.path}`
        );
      } catch (accessError) {
        console.error(
          `[UPLOAD_ROUTE:${uploadId}] ❌ File does not exist: ${htmlFile.path}`,
          accessError
        );
        errors.push(`HTML file not found: ${htmlFile.originalname}`);
        continue;
      }

      // Read HTML content
      const htmlContent = await fs.readFile(htmlFile.path, "utf-8");
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] ✅ Successfully read HTML content: ${htmlContent.length} characters`
      );

      // Log the file rename map before updating image files
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 📝 File rename map before updating image files (${fileRenameMap.size} entries):`
      );
      for (const [originalName, newName] of fileRenameMap.entries()) {
        console.log(
          `[UPLOAD_ROUTE:${uploadId}]   ${originalName} -> ${newName}`
        );
      }

      // Create job data with unique importId for each file
      const jobData = {
        content: htmlContent,
        importId: fileImportId,
        originalFilePath: htmlFile.path, // Store for image directory discovery
        htmlFileName: htmlFile.originalname, // Include original filename for status events
        imageFiles: associatedImages.map((img) => {
          // Use the renamed filename if it was converted, otherwise use original
          const finalFileName =
            fileRenameMap.get(img.originalname) || img.originalname;
          const extension = path.extname(finalFileName) || "binary";

          return {
            fileName: finalFileName,
            filePath: path.join(
              process.cwd(),
              "uploads",
              "images",
              fileImportId,
              finalFileName
            ),
            size: img.size,
            extension: extension,
            importId: fileImportId, // Include the importId for this specific image
          };
        }),
        options: {
          skipFollowupTasks: false, // Enable image scheduling
        },
      };

      // Log the final image files in job data
      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 🎯 Final image files in job data for ${htmlFile.originalname}:`
      );
      jobData.imageFiles.forEach((img, index) => {
        console.log(
          `[UPLOAD_ROUTE:${uploadId}]   Image ${index}: ${img.fileName} -> ${img.filePath} (importId: ${img.importId})`
        );
      });

      console.log(
        `[UPLOAD_ROUTE:${uploadId}] 📤 Adding HTML job to noteQueue for: ${htmlFile.originalname}`
      );
      await noteQueue.add(ActionName.PARSE_HTML, jobData);

      // Clean up the temporary HTML file after processing
      await fs.unlink(htmlFile.path).catch((err) => {
        console.warn(
          `[UPLOAD_ROUTE:${uploadId}] ⚠️ Could not delete temp HTML file: ${err.message}`
        );
      });
    } catch (error) {
      console.error(
        `[UPLOAD_ROUTE:${uploadId}] ❌ Failed to process HTML file ${htmlFile.originalname}:`,
        error
      );
      errors.push(`Failed to process ${htmlFile.originalname}: ${error}`);
    }
  }

  // Return the importId for this upload
  const returnImportId = importId;

  // Final summary for debugging
  console.log(`[UPLOAD_ROUTE:${uploadId}] === FINAL UPLOAD SUMMARY ===`);
  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 📊 Total files processed: ${files.length}`
  );
  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 📄 HTML files: ${filteredHtmlFiles.length}`
  );
  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 🖼️ Image files: ${imageFiles.length}`
  );
  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 🔑 Import IDs generated: ${processedImportIds.length}`
  );
  console.log(
    `[UPLOAD_ROUTE:${uploadId}] 🎯 Return import ID: ${returnImportId}`
  );
  console.log(`[UPLOAD_ROUTE:${uploadId}] ❌ Errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach((error, index) => {
      console.log(`[UPLOAD_ROUTE:${uploadId}]   Error ${index + 1}: ${error}`);
    });
  }
  console.log(`[UPLOAD_ROUTE:${uploadId}] ==============================`);

  return {
    importId: returnImportId,
    htmlFiles: filteredHtmlFiles.length,
    imageFiles: imageFiles.length,
    totalFiles: files.length,
    errors,
  };
}

export default uploadRouter;
