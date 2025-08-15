import express, { NextFunction, Request, Response } from "express";
import type { Express } from "express-serve-static-core";
import multer from "multer";
import path from "path";

import type { IServiceContainer } from "../services/container";
import { ActionName, HttpStatus } from "../types";

export const imagesRouter = express.Router();

interface ImageRequestBody {
  importId?: string;
  directories?: string[];
}

// Configure multer for file uploads
const upload = multer({
  dest: path.join(process.cwd(), "uploads", "temp"),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// POST /images - Upload and process images
imagesRouter.post(
  "/",
  (req: Request, res: Response, next: NextFunction) => {
    /* istanbul ignore next -- @preserve */
    // @ts-expect-error - Multer/Express type compatibility issue
    upload.array("images", 10)(req, res, (err) => {
      if (err) {
        console.error("[IMAGES_ROUTE] Multer error:", err);
        return res.status(HttpStatus.BAD_REQUEST).json({ error: err.message });
      }
      console.log("[IMAGES_ROUTE] Multer middleware completed successfully");
      next();
    });
  },
  async (req: Request, res: Response) => {
    console.log("[IMAGES_ROUTE] Processing image upload request");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files = (req as any).files as Express.Multer.File[];
      console.log(`[IMAGES_ROUTE] Received ${files?.length || 0} files`);

      // Also check for directories and other files
      const formData = req.body;
      console.log("[IMAGES_ROUTE] Form data:", formData);

      if (!files || files.length === 0) {
        console.log("[IMAGES_ROUTE] No files uploaded");

        // Check if directories were sent
        if ((formData as ImageRequestBody).directories) {
          console.log(
            "[IMAGES_ROUTE] Directories detected:",
            (formData as ImageRequestBody).directories
          );
          return res.status(HttpStatus.BAD_REQUEST).json({
            error:
              "Directories cannot be processed directly. Please select individual image files from the directory.",
            directories: (formData as ImageRequestBody).directories,
          });
        }

        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: "No images uploaded" });
      }

      const serviceContainer = req.app.locals
        .serviceContainer as IServiceContainer;
      if (!serviceContainer) {
        console.error("[IMAGES_ROUTE] Service container not available");
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: "Service container not available" });
      }

      const imageQueue = serviceContainer.queues.imageQueue;
      if (!imageQueue) {
        console.error("[IMAGES_ROUTE] Image queue not available");
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: "Image queue not available" });
      }

      console.log("[IMAGES_ROUTE] Image queue found, processing files");
      const results = [];

      // Accept importId from frontend or generate one for the batch
      const headerImportId = req.headers["x-import-id"];
      /* istanbul ignore next -- @preserve */
      const batchImportId =
        (typeof headerImportId === "string" ? headerImportId : undefined) ||
        (req.body as ImageRequestBody).importId ||
        /* istanbul ignore next -- @preserve */
        `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      for (const file of files) {
        console.log(
          `[IMAGES_ROUTE] Processing file: ${file.originalname} -> ${file.filename}`
        );

        // Check if this is actually an image file
        const isImage =
          file.mimetype.startsWith("image/") ||
          /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.originalname);

        if (!isImage) {
          console.log(
            `[IMAGES_ROUTE] Skipping non-image file: ${file.originalname}`
          );
          results.push({
            originalName: file.originalname,
            filename: file.filename,
            status: "skipped",
            reason: "Not an image file",
          });
          continue;
        }

        // Use the batch importId for all images in this request
        const importId = batchImportId;

        const jobData = {
          noteId: `note-${importId}`, // This will be updated when the note is created
          importId,
          imagePath: file.path,
          outputDir: path.join(process.cwd(), "uploads", "processed"),
          filename: file.filename,
          // Initialize processed image paths (will be set by PROCESS_IMAGE)
          originalPath: "",
          thumbnailPath: "",
          crop3x2Path: "",
          crop4x3Path: "",
          crop16x9Path: "",
          // Initialize file sizes (will be set by PROCESS_IMAGE)
          originalSize: 0,
          thumbnailSize: 0,
          crop3x2Size: 0,
          crop4x3Size: 0,
          crop16x9Size: 0,
          // Initialize metadata (will be set by PROCESS_IMAGE)
          metadata: {
            width: 0,
            height: 0,
            format: "unknown",
          },
          // R2 information (will be set by UPLOAD_ORIGINAL)
          r2Key: undefined,
          r2Url: undefined,
        };

        console.log(
          `[IMAGES_ROUTE] Adding job to image queue with data:`,
          jobData
        );

        // Add image processing job to queue
        await imageQueue.add(ActionName.UPLOAD_ORIGINAL, jobData);

        console.log(
          `[IMAGES_ROUTE] Job added to queue for file: ${file.originalname}`
        );

        results.push({
          originalName: file.originalname,
          filename: file.filename,
          importId,
          status: "queued",
        });
      }

      console.log(
        `[IMAGES_ROUTE] Successfully processed ${files.length} image(s)`
      );
      res.status(HttpStatus.OK).json({
        message: `${files.length} image(s) uploaded and queued for processing`,
        results,
      });
    } catch (error) {
      /* istanbul ignore next -- @preserve */
      console.error("[IMAGES_ROUTE] Image upload error:", error);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: "Failed to upload images" });
    }
  }
);

// GET /images/:importId/status - Get processing status
imagesRouter.get("/:importId/status", async (req: Request, res: Response) => {
  try {
    const { importId } = req.params;

    const serviceContainer = req.app.locals
      .serviceContainer as IServiceContainer;
    if (!serviceContainer) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: "Service container not available" });
    }

    // For now, return a basic status
    // In a real implementation, you'd query the database for the actual status
    res.status(HttpStatus.OK).json({
      importId,
      status: "processing",
      message: "Image processing status endpoint - implementation needed",
    });
  } catch {
    /* istanbul ignore next -- @preserve */
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to check status" });
  }
});
