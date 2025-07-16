import { Router } from "express";
import { serviceContainer } from "../../services/container";

const router = Router();

// Test ingredient processing
router.post("/", async (req: any, res: any) => {
  try {
    const { ingredientLineId, reference, blockIndex, lineIndex, noteId } =
      req.body;

    if (!ingredientLineId || !reference || !noteId) {
      serviceContainer.logger.log(
        "Ingredient test endpoint: Missing required fields",
        "warn"
      );
      return res.status(400).json({
        error: "Missing required fields",
        message: "ingredientLineId, reference, and noteId are required",
      });
    }

    serviceContainer.logger.log(
      `Ingredient test endpoint: Queuing job for line "${reference}"`
    );

    // Add job to ingredient queue
    const job = await serviceContainer.queues.ingredientQueue.add(
      "process_ingredient",
      {
        ingredientLineId,
        reference,
        blockIndex: blockIndex || 0,
        lineIndex: lineIndex || 0,
        noteId,
      }
    );

    serviceContainer.logger.log(
      `Ingredient test endpoint: Job queued successfully with ID ${job.id}`
    );
    res.json({
      success: true,
      message: "Ingredient test job queued successfully",
      jobId: job.id,
      data: { ingredientLineId, reference, noteId },
      queue: "ingredient",
    });
  } catch (error) {
    serviceContainer.logger.log(
      `Ingredient test endpoint: Failed to queue job - ${(error as Error).message}`,
      "error"
    );
    res.status(500).json({
      error: "Failed to queue ingredient test job",
      message: (error as Error).message,
    });
  }
});

// Get ingredient test info
router.get("/", (req: any, res: any) => {
  serviceContainer.logger.log("Ingredient test endpoint: Info request");
  res.json({
    message: "Ingredient Worker Test Endpoint",
    usage:
      "POST with { ingredientLineId: string, reference: string, noteId: string, blockIndex?: number, lineIndex?: number }",
    example: {
      ingredientLineId: "ing_123",
      reference: "2 cups flour",
      noteId: "note_456",
      blockIndex: 0,
      lineIndex: 0,
    },
  });
});

export { router as ingredientTestRouter };
