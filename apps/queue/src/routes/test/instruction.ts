import { Router } from "express";
import { serviceContainer } from "../../services/container";

const router = Router();

// Test instruction processing
router.post("/", async (req: any, res: any) => {
  try {
    const { instructionLineId, originalText, lineIndex, noteId } = req.body;

    if (!instructionLineId || !originalText || !noteId) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "instructionLineId, originalText, and noteId are required",
      });
    }

    // Add job to instruction queue
    const job = await serviceContainer.queues.instructionQueue.add(
      "process_instruction",
      {
        instructionLineId,
        originalText,
        lineIndex: lineIndex || 0,
        noteId,
      }
    );

    res.json({
      success: true,
      message: "Instruction test job queued successfully",
      jobId: job.id,
      data: { instructionLineId, originalText, noteId },
      queue: "instruction",
    });
  } catch (error) {
    console.error("Error queuing instruction test job:", error);
    res.status(500).json({
      error: "Failed to queue instruction test job",
      message: (error as Error).message,
    });
  }
});

// Get instruction test info
router.get("/", (req: any, res: any) => {
  res.json({
    message: "Instruction Worker Test Endpoint",
    usage:
      "POST with { instructionLineId: string, originalText: string, noteId: string, lineIndex?: number }",
    example: {
      instructionLineId: "inst_123",
      originalText: "Mix flour and water until smooth",
      noteId: "note_456",
      lineIndex: 0,
    },
  });
});

export { router as instructionTestRouter };
