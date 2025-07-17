import { Router, Request, Response } from "express";
import { serviceContainer } from "../../services/container";

const router = Router();

// Test categorization processing
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { noteId, title, content } = req.body;

    if (!noteId) {
      serviceContainer.logger.log(
        "Categorization test endpoint: Missing required fields",
        "warn"
      );
      res.status(400).json({
        error: "Missing required fields",
        message: "noteId is required",
      });
      return;
    }

    serviceContainer.logger.log(
      `Categorization test endpoint: Queuing job for note ${noteId}`
    );

    // Add job to categorization queue
    const job = await serviceContainer.queues.categorizationQueue.add(
      "process_categorization",
      {
        noteId,
        title: title || "Untitled Recipe",
        content: content || "",
      }
    );

    serviceContainer.logger.log(
      `Categorization test endpoint: Job queued successfully with ID ${job.id}`
    );
    res.json({
      success: true,
      message: "Categorization test job queued successfully",
      jobId: job.id,
      data: { noteId, title, contentLength: content?.length || 0 },
      queue: "categorization",
    });
  } catch (error) {
    serviceContainer.logger.log(
      `Categorization test endpoint: Failed to queue job - ${(error as Error).message}`,
      "error"
    );
    res.status(500).json({
      error: "Failed to queue categorization test job",
      message: (error as Error).message,
    });
  }
});

// Get categorization test info
router.get("/", (req: Request, res: Response): void => {
  serviceContainer.logger.log("Categorization test endpoint: Info request");
  res.json({
    message: "Categorization Worker Test Endpoint",
    usage: "POST with { noteId: string, title?: string, content?: string }",
    example: {
      noteId: "note_123",
      title: "Chocolate Chip Cookies",
      content: "A delicious recipe for homemade cookies...",
    },
  });
});

export { router as categorizationTestRouter };
