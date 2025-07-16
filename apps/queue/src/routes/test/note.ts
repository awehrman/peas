import { Router, Request, Response } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { serviceContainer } from "../../services/container";
import { NoteValidation } from "../../schemas";

const router = Router();

// Test note processing
router.post("/", (req: Request, res: Response) => {
  // Validate the request body using the centralized schema
  const validation = NoteValidation.validateNoteJobData(req.body);
  if (!validation.success) {
    serviceContainer.logger.log(
      `Note test endpoint: Validation failed - ${validation.error}`,
      "warn"
    );
    res.status(400).json({
      error: "Invalid request data",
      message: validation.error,
    });
    return;
  }

  const { content } = validation.data;

  serviceContainer.logger.log(
    `Note test endpoint: Queuing job with ${content.length} characters`
  );

  serviceContainer.queues.noteQueue
    .add("process-note", { content })
    .then((job) => {
      serviceContainer.logger.log(
        `Note test endpoint: Job queued successfully with ID ${job.id}`
      );
      res.json({
        success: true,
        message: "Note test job queued successfully",
        jobId: job.id,
        data: { contentLength: content.length },
        queue: "note",
      });
    })
    .catch((error) => {
      serviceContainer.logger.log(
        `Note test endpoint: Failed to queue job - ${(error as Error).message}`,
        "error"
      );
      res.status(500).json({
        error: "Failed to queue note test job",
        message: (error as Error).message,
      });
    });
});

// Test with Acai Berry Smoothie HTML file
router.post("/acai-smoothie", (req: Request, res: Response) => {
  try {
    const filePath = join(
      process.cwd(),
      "public",
      "files",
      "Acai Berry Smoothie.html"
    );
    const htmlContent = readFileSync(filePath, "utf-8");

    serviceContainer.logger.log(
      `Acai smoothie test: Reading file from ${filePath}`
    );

    serviceContainer.queues.noteQueue
      .add("process-note", { content: htmlContent })
      .then((job) => {
        serviceContainer.logger.log(
          `Acai smoothie test: Job queued successfully with ID ${job.id}`
        );
        res.json({
          message: `[${job.id}] Acai Berry Smoothie test job queued successfully`,
          job: {
            data: {
              ...job.data,
              content:
                job.data.content.substring(0, 50) +
                (job.data.content.length > 50 ? "..." : ""),
            },
          },
        });
      })
      .catch((error) => {
        serviceContainer.logger.log(
          `Acai smoothie test: Failed to queue job - ${(error as Error).message}`,
          "error"
        );
        res.status(500).json({
          error: "Failed to queue Acai Berry Smoothie test job",
          message: (error as Error).message,
        });
      });
  } catch (error) {
    serviceContainer.logger.log(
      `Acai smoothie test: Failed to read file - ${(error as Error).message}`,
      "error"
    );
    res.status(500).json({
      error: "Failed to read Acai Berry Smoothie file",
      message: (error as Error).message,
    });
  }
});

// Get note test info
router.get("/", (req: Request, res: Response) => {
  serviceContainer.logger.log("Note test endpoint: Info request");
  res.json({
    message: "Note Worker Test Endpoint",
    endpoints: {
      "POST /": "Test with custom content",
      "POST /acai-smoothie": "Test with Acai Berry Smoothie HTML file",
    },
    usage: {
      "POST /": "POST with { content: string }",
      "POST /acai-smoothie": "No body required, uses predefined HTML file",
    },
    example: {
      content:
        "<html><body><h1>Test Recipe</h1><p>This is a test recipe</p></body></html>",
    },
    testFile:
      "Acai Berry Smoothie.html - Real Evernote export with recipe data",
  });
});

export { router as noteTestRouter };
