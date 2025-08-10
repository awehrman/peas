import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";

import type { IServiceContainer } from "../services/container";
import { HttpStatus } from "../types";
import { ActionName } from "../types";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "images");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

export const imagesRouter = express.Router();

// POST /images - Upload and process images
imagesRouter.post(
  "/",
  (req: Request, res: Response, next: NextFunction) => {
    console.log("[IMAGES_ROUTE] Starting image upload middleware");
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
      const files = (req as any).files as any[];
      console.log(`[IMAGES_ROUTE] Received ${files?.length || 0} files`);

      // Also check for directories and other files
      const formData = req.body;
      console.log("[IMAGES_ROUTE] Form data:", formData);

      if (!files || files.length === 0) {
        console.log("[IMAGES_ROUTE] No files uploaded");

        // Check if directories were sent
        if (formData.directories) {
          console.log(
            "[IMAGES_ROUTE] Directories detected:",
            formData.directories
          );
          return res.status(HttpStatus.BAD_REQUEST).json({
            error:
              "Directories cannot be processed directly. Please select individual image files from the directory.",
            directories: formData.directories,
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

        const importId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
  } catch (error) {
    console.error("Status check error:", error);
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to check status" });
  }
});
