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
        () => processUploadedFiles(files, req),
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
  files: Express.Multer.File[],
  req: Request
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
    `[UPLOAD_ROUTE] Using importId: ${importId} (${typeof headerImportId === "string" ? "from frontend" : "generated"})`
  );

  // Check if this is a directory upload
  const isDirectoryUpload = req.body.isDirectoryUpload === "true";
  console.log(`[UPLOAD_ROUTE] Directory upload detected: ${isDirectoryUpload}`);

  // Extract file paths if this is a directory upload
  const htmlPaths: string[] = Array.isArray(req.body.htmlPaths)
    ? req.body.htmlPaths
    : [];
  const imagePaths: string[] = Array.isArray(req.body.imagePaths)
    ? req.body.imagePaths
    : [];

  if (isDirectoryUpload) {
    console.log("[UPLOAD_ROUTE] HTML paths:", htmlPaths);
    console.log("[UPLOAD_ROUTE] Image paths:", imagePaths);
  }

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

    // Filter out Evernote_index files (both HTML and image variants)
    if (file.originalname.includes("Evernote_index")) {
      console.log(
        `[UPLOAD_ROUTE] Ignoring Evernote index file: ${file.originalname}`
      );
      continue;
    }

    const isHtml =
      file.mimetype === "text/html" || file.originalname.endsWith(".html");

    // Use enhanced image detection that supports binary files without extensions
    const isImage = await isImageFileEnhanced(file.originalname, file.path);

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

  // Note: Evernote_index files are now filtered out during classification above
  const filteredHtmlFiles = htmlFiles; // No additional filtering needed

  // Filter htmlPaths to match filteredHtmlFiles (remove paths for Evernote files)
  const filteredHtmlPaths: string[] = [];
  if (isDirectoryUpload && htmlPaths.length > 0) {
    console.log(
      `[UPLOAD_ROUTE] Filtering HTML paths - original count: ${htmlPaths.length}`
    );
    console.log(`[UPLOAD_ROUTE] Original HTML paths:`, htmlPaths);
    console.log(
      `[UPLOAD_ROUTE] HTML files before filtering:`,
      htmlFiles.map((f) => f.originalname)
    );
    console.log(
      `[UPLOAD_ROUTE] HTML files after filtering:`,
      filteredHtmlFiles.map((f) => f.originalname)
    );

    for (let i = 0; i < htmlFiles.length; i++) {
      const htmlFile = htmlFiles[i];
      const htmlPath = htmlPaths[i];
      console.log(
        `[UPLOAD_ROUTE] Checking path index ${i}: file=${htmlFile?.originalname}, path=${htmlPath}`
      );

      if (
        htmlFile &&
        htmlPath &&
        htmlFile.originalname !== "Evernote_index.html"
      ) {
        filteredHtmlPaths.push(htmlPath);
        console.log(
          `[UPLOAD_ROUTE] Added filtered path: ${htmlPath} for file: ${htmlFile.originalname}`
        );
      } else {
        console.log(
          `[UPLOAD_ROUTE] Skipped path index ${i}: file=${htmlFile?.originalname}, path=${htmlPath}, isEvernoteIndex=${htmlFile?.originalname === "Evernote_index.html"}`
        );
      }
    }
    console.log(
      `[UPLOAD_ROUTE] Filtered HTML paths: ${filteredHtmlPaths.length} (was ${htmlPaths.length})`
    );
    console.log(`[UPLOAD_ROUTE] Final filtered HTML paths:`, filteredHtmlPaths);
  }

  // Create a map to associate HTML files with their images based on directory structure
  const htmlToImagesMap = new Map<string, Express.Multer.File[]>();

  if (isDirectoryUpload && htmlPaths.length > 0 && imagePaths.length > 0) {
    console.log("[UPLOAD_ROUTE] Organizing files by directory structure");
    console.log(
      "[UPLOAD_ROUTE] HTML files:",
      htmlFiles.map((f) => f.originalname)
    );
    console.log(
      "[UPLOAD_ROUTE] Image files:",
      imageFiles.map((f) => f.originalname)
    );
    console.log("[UPLOAD_ROUTE] HTML paths:", htmlPaths);
    console.log("[UPLOAD_ROUTE] Image paths:", imagePaths);

    // Create a map of HTML file paths to their base directory names
    const htmlBaseDirs = new Map<string, string>();
    const pathsToUse = isDirectoryUpload ? filteredHtmlPaths : htmlPaths;
    console.log(
      `[UPLOAD_ROUTE] Using paths: ${pathsToUse.length} (filtered: ${isDirectoryUpload})`
    );
    console.log(`[UPLOAD_ROUTE] Paths to use:`, pathsToUse);

    pathsToUse.forEach((path, index) => {
      console.log(`[UPLOAD_ROUTE] Processing path index ${index}: ${path}`);
      if (index < filteredHtmlFiles.length && path) {
        const htmlFile = filteredHtmlFiles[index]!;
        const baseDir = path!.split("/")[0]; // Get the first directory name
        console.log(
          `[UPLOAD_ROUTE] HTML file ${htmlFile.originalname} at index ${index}, path: ${path}, baseDir: ${baseDir}`
        );

        if (baseDir) {
          htmlBaseDirs.set(htmlFile.originalname, baseDir);
          console.log(
            `[UPLOAD_ROUTE] HTML file ${htmlFile.originalname} belongs to directory: ${baseDir}`
          );
        } else {
          console.log(
            `[UPLOAD_ROUTE] No base directory found for path: ${path}`
          );
        }
      } else {
        console.log(
          `[UPLOAD_ROUTE] Skipping path index ${index}: index >= filteredHtmlFiles.length (${index >= filteredHtmlFiles.length}) or no path (${!path})`
        );
      }
    });

    console.log(
      "[UPLOAD_ROUTE] HTML base directories:",
      Array.from(htmlBaseDirs.entries())
    );

    // Group images by their HTML file's directory
    console.log(
      `[UPLOAD_ROUTE] Processing ${imageFiles.length} images for directory mapping`
    );
    imageFiles.forEach((imageFile, imageIndex) => {
      console.log(
        `[UPLOAD_ROUTE] Processing image ${imageIndex}: ${imageFile.originalname}`
      );

      if (imageIndex < imagePaths.length) {
        const imagePath = imagePaths[imageIndex];
        console.log(`[UPLOAD_ROUTE] Image ${imageIndex} path: ${imagePath}`);

        if (imagePath) {
          const imageDir = imagePath.split("/")[0]; // Get the first directory name
          console.log(
            `[UPLOAD_ROUTE] Image ${imageFile.originalname} belongs to directory: ${imageDir}`
          );

          // Find which HTML file this image belongs to
          let matchedHtmlFile = null;
          for (const [htmlFileName, htmlBaseDir] of htmlBaseDirs) {
            console.log(
              `[UPLOAD_ROUTE] Checking if image dir '${imageDir}' matches HTML dir '${htmlBaseDir}' for file '${htmlFileName}'`
            );
            if (htmlBaseDir === imageDir) {
              matchedHtmlFile = htmlFileName;
              console.log(
                `[UPLOAD_ROUTE] ✅ MATCH: Image ${imageFile.originalname} matches HTML file ${htmlFileName}`
              );
              break;
            }
          }

          if (matchedHtmlFile) {
            if (!htmlToImagesMap.has(matchedHtmlFile)) {
              htmlToImagesMap.set(matchedHtmlFile, []);
              console.log(
                `[UPLOAD_ROUTE] Created new image array for HTML file: ${matchedHtmlFile}`
              );
            }
            htmlToImagesMap.get(matchedHtmlFile)!.push(imageFile);
            console.log(
              `[UPLOAD_ROUTE] Associated image ${imageFile.originalname} with HTML file ${matchedHtmlFile}`
            );
          } else {
            console.log(
              `[UPLOAD_ROUTE] ❌ NO MATCH: Image ${imageFile.originalname} (dir: ${imageDir}) could not be matched to any HTML file`
            );
            console.log(
              `[UPLOAD_ROUTE] Available HTML directories:`,
              Array.from(htmlBaseDirs.values())
            );
          }
        } else {
          console.log(
            `[UPLOAD_ROUTE] No path available for image ${imageIndex}: ${imageFile.originalname}`
          );
        }
      } else {
        console.log(
          `[UPLOAD_ROUTE] Image index ${imageIndex} out of range for imagePaths (${imagePaths.length})`
        );
      }
    });

    console.log(
      "[UPLOAD_ROUTE] Final HTML to images map:",
      Array.from(htmlToImagesMap.entries()).map(([html, images]) => [
        html,
        images.map((img) => img.originalname),
      ])
    );
  }

  // Create a map to track file renames during processing
  const fileRenameMap = new Map<string, string>();

  // Function to update image files with correct filenames after conversion
  function updateImageFilesWithRenames(
    imageFiles: Array<{
      fileName: string;
      filePath: string;
      size: number;
      extension: string;
    }>,
    importId: string
  ) {
    return imageFiles.map((img) => {
      const newFileName = fileRenameMap.get(img.fileName) || img.fileName;
      const newExtension = path.extname(newFileName) || "binary";

      console.log(
        `[UPLOAD_ROUTE] Updating image file: ${img.fileName} -> ${newFileName} (extension: ${newExtension})`
      );

      return {
        fileName: newFileName,
        filePath: path.join(
          process.cwd(),
          "uploads",
          "images",
          importId,
          newFileName
        ),
        size: img.size,
        extension: newExtension,
      };
    });
  }

  // First, set up importIds and create directories
  const processedImportIds: string[] = [];

  // Process HTML files to generate importIds and create directories
  for (const htmlFile of filteredHtmlFiles) {
    // Generate unique importId for this file
    const fileImportId = isDirectoryUpload ? randomUUID() : importId;
    console.log(
      `[UPLOAD_ROUTE] Using importId for ${htmlFile.originalname}: ${fileImportId}`
    );

    // Track the importId for directory creation
    if (isDirectoryUpload) {
      processedImportIds.push(fileImportId);
    }
  }

  // Create image directories for each importId
  try {
    if (isDirectoryUpload) {
      // For directory uploads, create separate directories for each HTML file's importId
      for (const fileImportId of processedImportIds) {
        const imageDir = path.join(
          process.cwd(),
          "uploads",
          "images",
          fileImportId
        );
        await fs.mkdir(imageDir, { recursive: true });
        console.log(
          `[UPLOAD_ROUTE] Created image directory for importId ${fileImportId}: ${imageDir}`
        );
      }
    } else {
      // For single file uploads, create a directory for the single importId
      const imageDir = path.join(process.cwd(), "uploads", "images", importId);
      await fs.mkdir(imageDir, { recursive: true });
      console.log(
        `[UPLOAD_ROUTE] Created coordinated image directory: ${imageDir}`
      );
    }

    // Move image files to their respective directories
    if (imageFiles.length > 0) {
      console.log(
        `[UPLOAD_ROUTE] Moving ${imageFiles.length} image files to their respective directories`
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

        // Check if this is a binary image (no extension) and convert it
        const hasExtension = path.extname(imageFile.originalname).length > 0;
        let finalPath = imageFile.path;

        // Determine which importId to use for this image
        let imageImportId = importId;
        if (isDirectoryUpload) {
          // For directory uploads, find which HTML file this image belongs to
          const imagePath = imagePaths[index];
          if (imagePath) {
            const imageDir = imagePath.split("/")[0]; // Get the first directory name
            console.log(
              `[UPLOAD_ROUTE] Image ${imageFile.originalname} belongs to directory: ${imageDir}`
            );

            // Find the corresponding importId for this image
            const pathsToUse = isDirectoryUpload
              ? filteredHtmlPaths
              : htmlPaths;
            for (let i = 0; i < pathsToUse.length; i++) {
              const htmlPath = pathsToUse[i];
              if (htmlPath && htmlPath.split("/")[0] === imageDir) {
                if (i < processedImportIds.length) {
                  imageImportId = processedImportIds[i]!;
                  console.log(
                    `[UPLOAD_ROUTE] Using importId ${imageImportId} for image ${imageFile.originalname}`
                  );
                }
                break;
              }
            }
          }
        }

        // Generate a clean filename using the correct importId and index
        const imageIndex = imageFiles.indexOf(imageFile);
        const cleanFilename = hasExtension
          ? `${imageImportId}-image-${imageIndex}${path.extname(imageFile.originalname)}`
          : `${imageImportId}-image-${imageIndex}.png`; // Default to PNG for binary files

        let finalFilename = cleanFilename;

        if (!hasExtension) {
          console.log(
            `[UPLOAD_ROUTE] Binary image detected: ${imageFile.originalname}, attempting conversion with clean filename: ${cleanFilename}`
          );

          // Create a simple logger for the conversion process
          /* istanbul ignore next -- @preserve */
          const logger = {
            log: (message: string) => console.log(message),
            error: (message: string) => console.error(message),
            warn: (message: string) => console.warn(message),
            debug: (message: string) => console.log(message),
          };

          // Convert with clean filename
          const conversionResult = await convertBinaryImageToStandardFormat(
            imageFile.path,
            logger,
            cleanFilename // Pass the desired clean filename
          );

          if (
            conversionResult.success &&
            conversionResult.outputPath &&
            conversionResult.newFilename
          ) {
            console.log(
              `[UPLOAD_ROUTE] Conversion successful: ${imageFile.originalname} -> ${conversionResult.newFilename}`
            );
            finalPath = conversionResult.outputPath;
            finalFilename = conversionResult.newFilename;

            // Track the file rename for updating pre-assigned images
            fileRenameMap.set(imageFile.originalname, finalFilename);
            console.log(
              `[UPLOAD_ROUTE] Tracked file rename: ${imageFile.originalname} -> ${finalFilename}`
            );

            // Clean up the original binary file
            try {
              await fs.unlink(imageFile.path);
              console.log(
                `[UPLOAD_ROUTE] Cleaned up original binary file: ${imageFile.path}`
              );
            } catch (cleanupError) {
              /* istanbul ignore next -- @preserve */
              console.warn(
                `[UPLOAD_ROUTE] Could not clean up original file: ${cleanupError}`
              );
            }
          } else {
            console.log(
              `[UPLOAD_ROUTE] Conversion failed, using original file: ${imageFile.originalname}`
            );
            // Even if conversion fails, use the clean filename
            finalFilename = cleanFilename;
          }
        } else {
          // For files with extensions, just use the clean filename
          console.log(
            `[UPLOAD_ROUTE] Using clean filename for ${imageFile.originalname}: ${cleanFilename}`
          );
          finalFilename = cleanFilename;

          // Track the file rename for updating pre-assigned images
          fileRenameMap.set(imageFile.originalname, finalFilename);
          console.log(
            `[UPLOAD_ROUTE] Tracked file rename: ${imageFile.originalname} -> ${finalFilename}`
          );
        }

        // Determine which directory to move the image to
        const targetImageDir = path.join(
          process.cwd(),
          "uploads",
          "images",
          imageImportId
        );
        console.log(
          `[UPLOAD_ROUTE] Moving image ${imageFile.originalname} to directory for importId: ${imageImportId}`
        );

        // Move image file to the appropriate directory
        const targetPath = path.join(targetImageDir, finalFilename);
        console.log(`[UPLOAD_ROUTE] Target path: ${targetPath}`);

        try {
          await fs.rename(finalPath, targetPath);
          console.log(`[UPLOAD_ROUTE] Successfully moved: ${finalFilename}`);

          // Verify the move was successful
          const targetStats = await fs.stat(targetPath);
          console.log(
            `[UPLOAD_ROUTE] Target file verified - size: ${targetStats.size}`
          );
        } catch (moveError) {
          console.error(
            `[UPLOAD_ROUTE] Failed to move image ${finalFilename}:`,
            moveError
          );
          errors.push(`Failed to move ${finalFilename}: ${moveError}`);
        }
      }

      // List final directory contents for each importId
      if (isDirectoryUpload) {
        for (const fileImportId of processedImportIds) {
          try {
            const imageDir = path.join(
              process.cwd(),
              "uploads",
              "images",
              fileImportId
            );
            const finalContents = await fs.readdir(imageDir);
            console.log(
              `[UPLOAD_ROUTE] Final directory contents for ${fileImportId} (${finalContents.length} items):`,
              finalContents
            );
          } catch (listError) {
            /* istanbul ignore next -- @preserve */
            console.error(
              `[UPLOAD_ROUTE] Could not list final directory contents for ${fileImportId}:`,
              listError
            );
          }
        }
      } else {
        try {
          const imageDir = path.join(
            process.cwd(),
            "uploads",
            "images",
            importId
          );
          const finalContents = await fs.readdir(imageDir);
          console.log(
            `[UPLOAD_ROUTE] Final directory contents (${finalContents.length} items):`,
            finalContents
          );
        } catch (listError) {
          /* istanbul ignore next -- @preserve */
          console.error(
            `[UPLOAD_ROUTE] Could not list final directory contents:`,
            listError
          );
        }
      }

      console.log(
        `[UPLOAD_ROUTE] Successfully organized ${imageFiles.length} images across ${isDirectoryUpload ? processedImportIds.length : 1} directories`
      );

      // Log the file rename map for debugging
      if (fileRenameMap.size > 0) {
        console.log(
          `[UPLOAD_ROUTE] File rename map (${fileRenameMap.size} entries):`
        );
        for (const [originalName, newName] of fileRenameMap.entries()) {
          console.log(`[UPLOAD_ROUTE]   ${originalName} -> ${newName}`);
        }
      } else {
        console.log(
          `[UPLOAD_ROUTE] No file renames occurred during processing`
        );
      }
    } else {
      const message = isDirectoryUpload
        ? `No image files to move, but directories created for future use: ${processedImportIds.join(", ")}`
        : `No image files to move, but directory created for future use: ${importId}`;
      console.log(`[UPLOAD_ROUTE] ${message}`);
    }
  } catch (error) {
    console.error(
      "[UPLOAD_ROUTE] Failed to create/organize image directory:",
      error
    );
    errors.push(`Failed to create image directory: ${error}`);
  }

  // Process HTML files first to set up the image associations
  for (const htmlFile of filteredHtmlFiles) {
    try {
      console.log(
        `[UPLOAD_ROUTE] Processing HTML file: ${htmlFile.originalname}`
      );

      // Get the importId that was already generated for this file
      const fileImportId = isDirectoryUpload
        ? processedImportIds[filteredHtmlFiles.indexOf(htmlFile)] || importId
        : importId;
      console.log(
        `[UPLOAD_ROUTE] Using importId for ${htmlFile.originalname}: ${fileImportId}`
      );

      // Find associated images for this HTML file
      const associatedImages = htmlToImagesMap.get(htmlFile.originalname) || [];

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
        errors.push(`HTML file not found: ${htmlFile.originalname}`);
        continue;
      }

      // Read HTML content
      const htmlContent = await fs.readFile(htmlFile.path, "utf-8");
      console.log(
        `[UPLOAD_ROUTE] Successfully read HTML content: ${htmlContent.length} characters`
      );

      console.log(
        `[UPLOAD_ROUTE] Found ${associatedImages.length} associated images for ${htmlFile.originalname}`
      );

      // Log the file rename map before updating image files
      console.log(
        `[UPLOAD_ROUTE] File rename map before updating image files (${fileRenameMap.size} entries):`
      );
      for (const [originalName, newName] of fileRenameMap.entries()) {
        console.log(`[UPLOAD_ROUTE]   ${originalName} -> ${newName}`);
      }

      // Create job data with unique importId for each file
      const jobData = {
        content: htmlContent,
        importId: fileImportId,
        originalFilePath: htmlFile.path, // Store for image directory discovery
        imageFiles: updateImageFilesWithRenames(
          associatedImages.map((img) => ({
            fileName: img.originalname,
            filePath: path.join(
              process.cwd(),
              "uploads",
              "images",
              fileImportId,
              img.originalname
            ),
            size: img.size,
            extension: path.extname(img.originalname) || "binary",
          })),
          fileImportId
        ), // Pass associated images to the note job
        options: {
          skipFollowupTasks: false, // Enable image scheduling
        },
      };

      // Log the final image files in job data
      console.log(
        `[UPLOAD_ROUTE] Final image files in job data for ${htmlFile.originalname}:`
      );
      jobData.imageFiles.forEach((img, index) => {
        console.log(
          `[UPLOAD_ROUTE]   Image ${index}: ${img.fileName} -> ${img.filePath}`
        );
      });

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

  // For directory uploads, return the first importId as the primary one
  // For single file uploads, return the single importId
  const returnImportId =
    isDirectoryUpload && processedImportIds.length > 0
      ? processedImportIds[0]!
      : importId;

  return {
    importId: returnImportId,
    htmlFiles: filteredHtmlFiles.length,
    imageFiles: imageFiles.length,
    totalFiles: files.length,
    errors,
  };
}

export default uploadRouter;
