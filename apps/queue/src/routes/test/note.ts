import { Router } from "express";
import { serviceContainer } from "../../services/container";

const router = Router();

// Test note processing
router.post("/", async (req: any, res: any) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "content is required",
      });
    }

    // Add job to note queue
    const job = await serviceContainer.queues.noteQueue.add("process_note", {
      content,
    });

    res.json({
      success: true,
      message: "Note test job queued successfully",
      jobId: job.id,
      data: { contentLength: content.length },
      queue: "note",
    });
  } catch (error) {
    console.error("Error queuing note test job:", error);
    res.status(500).json({
      error: "Failed to queue note test job",
      message: (error as Error).message,
    });
  }
});

// Get note test info
router.get("/", (req: any, res: any) => {
  res.json({
    message: "Note Worker Test Endpoint",
    usage: "POST with { content: string }",
    example: {
      content:
        "<html><body><h1>Test Recipe</h1><p>This is a test recipe</p></body></html>",
    },
  });
});

export { router as noteTestRouter };
