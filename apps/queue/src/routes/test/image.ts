import { Router } from "express";
import { serviceContainer } from "../../services/container";

const router = Router();

// Test image processing
router.post("/", async (req: any, res: any) => {
  try {
    const { noteId, imageUrl, imageData, imageType, fileName } = req.body;

    if (!noteId) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "noteId is required",
      });
    }

    // Add job to image queue
    const job = await serviceContainer.queues.imageQueue.add("process_image", {
      noteId,
      imageUrl,
      imageData,
      imageType,
      fileName,
    });

    res.json({
      success: true,
      message: "Image test job queued successfully",
      jobId: job.id,
      data: { noteId, hasImageUrl: !!imageUrl, hasImageData: !!imageData },
      queue: "image",
    });
  } catch (error) {
    console.error("Error queuing image test job:", error);
    res.status(500).json({
      error: "Failed to queue image test job",
      message: (error as Error).message,
    });
  }
});

// Get image test info
router.get("/", (req: any, res: any) => {
  res.json({
    message: "Image Worker Test Endpoint",
    usage:
      "POST with { noteId: string, imageUrl?: string, imageData?: string, imageType?: string, fileName?: string }",
    example: {
      noteId: "note_456",
      imageUrl: "https://example.com/image.jpg",
      imageType: "image/jpeg",
      fileName: "recipe-image.jpg",
    },
  });
});

export { router as imageTestRouter };
