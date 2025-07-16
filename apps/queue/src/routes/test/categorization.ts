import { Router } from "express";
import { serviceContainer } from "../../services/container";

const router = Router();

// Test categorization processing
router.post("/", async (req: any, res: any) => {
  try {
    const { noteId, title, content, ingredients, instructions } = req.body;

    if (!noteId || !content) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "noteId and content are required",
      });
    }

    // Add job to categorization queue
    const job = await serviceContainer.queues.categorizationQueue.add(
      "process_categorization",
      {
        noteId,
        title,
        content,
        ingredients: ingredients || [],
        instructions: instructions || [],
      }
    );

    res.json({
      success: true,
      message: "Categorization test job queued successfully",
      jobId: job.id,
      data: { noteId, title, contentLength: content.length },
      queue: "categorization",
    });
  } catch (error) {
    console.error("Error queuing categorization test job:", error);
    res.status(500).json({
      error: "Failed to queue categorization test job",
      message: (error as Error).message,
    });
  }
});

// Get categorization test info
router.get("/", (req: any, res: any) => {
  res.json({
    message: "Categorization Worker Test Endpoint",
    usage:
      "POST with { noteId: string, title?: string, content: string, ingredients?: string[], instructions?: string[] }",
    example: {
      noteId: "note_456",
      title: "Chicken Curry",
      content: "A delicious chicken curry recipe with spices and vegetables",
      ingredients: ["chicken", "curry powder", "vegetables"],
      instructions: ["Cook chicken", "Add spices", "Serve hot"],
    },
  });
});

export { router as categorizationTestRouter };
