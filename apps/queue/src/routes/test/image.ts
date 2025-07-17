import { Router, Request, Response } from "express";
import { serviceContainer } from "../../services/container";

const router = Router();

// Test image processing
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { noteId, imageUrl } = req.body;

    if (!noteId) {
      serviceContainer.logger.log(
        "Image test endpoint: Missing required fields",
        "warn"
      );
      res.status(400).json({
        error: "Missing required fields",
        message: "noteId is required",
      });
      return;
    }

    serviceContainer.logger.log(
      `Image test endpoint: Queuing job for note ${noteId}`
    );

    // Add job to image queue
    const job = await serviceContainer.queues.imageQueue.add("process_image", {
      noteId,
      imageUrl: imageUrl || "https://example.com/image.jpg",
    });

    serviceContainer.logger.log(
      `Image test endpoint: Job queued successfully with ID ${job.id}`
    );
    res.json({
      success: true,
      message: "Image test job queued successfully",
      jobId: job.id,
      data: { noteId, imageUrl },
      queue: "image",
    });
  } catch (error) {
    serviceContainer.logger.log(
      `Image test endpoint: Failed to queue job - ${(error as Error).message}`,
      "error"
    );
    res.status(500).json({
      error: "Failed to queue image test job",
      message: (error as Error).message,
    });
  }
});

// Get image test info
router.get("/", (req: Request, res: Response): void => {
  serviceContainer.logger.log("Image test endpoint: Info request");
  res.json({
    message: "Image Worker Test Endpoint",
    usage: "POST with { noteId: string, imageUrl?: string }",
    example: {
      noteId: "note_123",
      imageUrl: "https://example.com/recipe-image.jpg",
    },
  });
});

export { router as imageTestRouter };
