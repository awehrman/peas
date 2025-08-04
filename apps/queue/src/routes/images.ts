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
    // @ts-expect-error - Multer/Express type compatibility issue
    upload.array("images", 10)(req, res, (err) => {
      if (err) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: err.message });
      }
      next();
    });
  },
  async (req: Request, res: Response) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const files = (req as any).files as any[];
      if (!files || files.length === 0) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: "No images uploaded" });
      }

      const serviceContainer = req.app.locals
        .serviceContainer as IServiceContainer;
      if (!serviceContainer) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: "Service container not available" });
      }

      const imageQueue = serviceContainer.queues.imageQueue;
      if (!imageQueue) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: "Image queue not available" });
      }

      const results = [];

      for (const file of files) {
        const importId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Add image processing job to queue
        await imageQueue.add(ActionName.PROCESS_IMAGE, {
          noteId: `note-${importId}`, // This will be updated when the note is created
          importId,
          imagePath: file.path,
          outputDir: path.join(process.cwd(), "uploads", "processed"),
          filename: file.filename,
        });

        results.push({
          originalName: file.originalname,
          filename: file.filename,
          importId,
          status: "queued",
        });
      }

      res.status(HttpStatus.OK).json({
        message: `${files.length} image(s) uploaded and queued for processing`,
        results,
      });
    } catch (error) {
      console.error("Image upload error:", error);
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
