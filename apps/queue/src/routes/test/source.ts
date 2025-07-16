import { Router } from "express";
import { serviceContainer } from "../../services/container";

const router = Router();

// Test source processing
router.post("/", async (req: any, res: any) => {
  try {
    const { noteId, title, content, url } = req.body;

    if (!noteId) {
      serviceContainer.logger.log(
        "Source test endpoint: Missing required fields",
        "warn"
      );
      return res.status(400).json({
        error: "Missing required fields",
        message: "noteId is required",
      });
    }

    serviceContainer.logger.log(
      `Source test endpoint: Queuing job for note ${noteId}`
    );

    // Add job to source queue
    const job = await serviceContainer.queues.sourceQueue.add(
      "process_source",
      {
        noteId,
        title: title || "Untitled Source",
        content: content || "",
        url: url || "",
      }
    );

    serviceContainer.logger.log(
      `Source test endpoint: Job queued successfully with ID ${job.id}`
    );
    res.json({
      success: true,
      message: "Source test job queued successfully",
      jobId: job.id,
      data: { noteId, title, contentLength: content?.length || 0, url },
      queue: "source",
    });
  } catch (error) {
    serviceContainer.logger.log(
      `Source test endpoint: Failed to queue job - ${(error as Error).message}`,
      "error"
    );
    res.status(500).json({
      error: "Failed to queue source test job",
      message: (error as Error).message,
    });
  }
});

// Get source test info
router.get("/", (req: any, res: any) => {
  serviceContainer.logger.log("Source test endpoint: Info request");
  res.json({
    message: "Source Worker Test Endpoint",
    usage:
      "POST with { noteId: string, title?: string, content?: string, url?: string }",
    example: {
      noteId: "note_123",
      title: "Recipe from Food Blog",
      content: "This recipe was found on a popular food blog...",
      url: "https://example.com/recipe",
    },
  });
});

export { router as sourceTestRouter };
