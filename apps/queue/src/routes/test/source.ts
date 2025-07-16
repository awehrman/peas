import { Router } from "express";
import { serviceContainer } from "../../services/container";

const router = Router();

// Test source processing
router.post("/", async (req: any, res: any) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "title and content are required",
      });
    }

    // Add job to source queue
    const job = await serviceContainer.queues.sourceQueue.add(
      "process_source",
      {
        title,
        content,
      }
    );

    res.json({
      success: true,
      message: "Source test job queued successfully",
      jobId: job.id,
      data: { title, content },
      queue: "source",
    });
  } catch (error) {
    console.error("Error queuing source test job:", error);
    res.status(500).json({
      error: "Failed to queue source test job",
      message: (error as Error).message,
    });
  }
});

// Get source test info
router.get("/", (req: any, res: any) => {
  res.json({
    message: "Source Worker Test Endpoint",
    usage: "POST with { title: string, content: string }",
    example: {
      title: "Test Recipe",
      content: "This is a test recipe content for processing",
    },
  });
});

export { router as sourceTestRouter };
