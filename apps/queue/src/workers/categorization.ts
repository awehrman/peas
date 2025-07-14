// Status events: Only emitted at start and completion for performance.
// This reduces DB connection overhead and status event spam.
import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma } from "@peas/database";
import { addStatusEventAndBroadcast } from "../utils/status-broadcaster";
import { ErrorHandler, QueueError } from "../utils";
import { ErrorType, ErrorSeverity, CategorizationJobData } from "../types";
import { HealthMonitor } from "../utils/health-monitor";

interface CategoryRule {
  category: string;
  tags: string[];
}

const CATEGORY_KEYWORDS: Record<string, CategoryRule> = {
  smoothie: { category: "Beverages", tags: ["smoothie", "drink", "healthy"] },
  pizza: { category: "Main Dishes", tags: ["pizza", "italian", "dinner"] },
  salad: { category: "Salads", tags: ["salad", "healthy", "vegetables"] },
  cake: { category: "Desserts", tags: ["dessert", "sweet", "baking"] },
  dessert: { category: "Desserts", tags: ["dessert", "sweet", "baking"] },
  breakfast: { category: "Breakfast", tags: ["breakfast", "morning"] },
  eggs: { category: "Breakfast", tags: ["breakfast", "morning"] },
  pancake: { category: "Breakfast", tags: ["breakfast", "morning"] },
};

const DEFAULT_CATEGORY = "Uncategorized";
const DEFAULT_TAGS = ["recipe", "imported"];

export class CategorizationProcessor {
  static analyzeRecipe(
    title: string,
    content: string
  ): { categories: string[]; tags: string[] } {
    try {
      const titleLower = title.toLowerCase();
      const contentLower = content.toLowerCase();
      const allText = `${titleLower} ${contentLower}`;

      const categories = new Set<string>();
      const tags = new Set<string>();

      // Check each keyword
      for (const [keyword, rule] of Object.entries(CATEGORY_KEYWORDS)) {
        if (allText.includes(keyword)) {
          categories.add(rule.category);
          rule.tags.forEach((tag) => tags.add(tag));
        }
      }

      // Add defaults if no categories found
      if (categories.size === 0) {
        categories.add(DEFAULT_CATEGORY);
        DEFAULT_TAGS.forEach((tag) => tags.add(tag));
      }

      return {
        categories: Array.from(categories),
        tags: Array.from(tags),
      };
    } catch (error) {
      throw new Error(
        `Failed to analyze recipe: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

export function setupCategorizationWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async (job) => {
      const jobId = job.id;
      const retryCount = job.attemptsMade;

      console.log(
        `Processing categorization job ${jobId} (attempt ${retryCount + 1})`
      );

      try {
        // Validate job data
        const validationError =
          ErrorHandler.validateJobData<CategorizationJobData>(job.data, [
            "noteId",
            "file",
          ]);

        if (validationError) {
          validationError.jobId = jobId;
          validationError.queueName = queue.name;
          validationError.retryCount = retryCount;
          ErrorHandler.logError(validationError);
          throw new QueueError(validationError);
        }

        const { noteId, file } = job.data as CategorizationJobData;

        // Check service health before processing
        const healthMonitor = HealthMonitor.getInstance();
        const isHealthy = await healthMonitor.isHealthy();

        if (!isHealthy) {
          const healthError = ErrorHandler.createJobError(
            "Service is unhealthy, skipping categorization processing",
            ErrorType.EXTERNAL_SERVICE_ERROR,
            ErrorSeverity.HIGH,
            { jobId, queueName: queue.name, retryCount }
          );
          ErrorHandler.logError(healthError);
          throw new QueueError(healthError);
        }

        // Add status event with error handling
        await ErrorHandler.withErrorHandling(
          () =>
            addStatusEventAndBroadcast({
              noteId,
              status: "PROCESSING",
              message: "Analyzing recipe for categories and tags...",
              context: "categorization",
            }),
          { jobId, noteId, operation: "add_status_event" }
        );

        // Analyze recipe with error handling
        const analysisResult = await ErrorHandler.withErrorHandling(
          async () =>
            CategorizationProcessor.analyzeRecipe(file.title, file.contents),
          { jobId, noteId, operation: "analyze_recipe" }
        );
        const { categories, tags } = analysisResult;

        // Batch find existing categories and tags with error handling
        const [existingCategories, existingTags] =
          await ErrorHandler.withErrorHandling(
            () =>
              Promise.all([
                prisma.category.findMany({
                  where: { name: { in: categories } },
                }),
                prisma.tag.findMany({
                  where: { name: { in: tags } },
                }),
              ]),
            { jobId, noteId, operation: "find_existing_categories_tags" }
          );

        const existingCategoryNames = new Set(
          existingCategories.map((c) => c.name)
        );
        const existingTagNames = new Set(existingTags.map((t) => t.name));

        // Batch create missing categories and tags with error handling
        await ErrorHandler.withErrorHandling(
          () =>
            Promise.all([
              prisma.category.createMany({
                data: categories
                  .filter((name: string) => !existingCategoryNames.has(name))
                  .map((name: string) => ({ name })),
                skipDuplicates: true,
              }),
              prisma.tag.createMany({
                data: tags
                  .filter((name: string) => !existingTagNames.has(name))
                  .map((name: string) => ({ name })),
                skipDuplicates: true,
              }),
            ]),
          { jobId, noteId, operation: "create_missing_categories_tags" }
        );

        // Fetch all categories and tags (including newly created ones) with error handling
        const [allCategories, allTags] = await ErrorHandler.withErrorHandling(
          () =>
            Promise.all([
              prisma.category.findMany({
                where: { name: { in: categories } },
              }),
              prisma.tag.findMany({
                where: { name: { in: tags } },
              }),
            ]),
          { jobId, noteId, operation: "fetch_all_categories_tags" }
        );

        // Single batch update for note connections with error handling
        await ErrorHandler.withErrorHandling(
          () =>
            prisma.note.update({
              where: { id: noteId },
              data: {
                categories: {
                  connect: allCategories.map((cat) => ({ id: cat.id })),
                },
                tags: {
                  connect: allTags.map((tag) => ({ id: tag.id })),
                },
              },
            }),
          { jobId, noteId, operation: "update_note_categories_tags" }
        );

        // Add completion status event with error handling
        await ErrorHandler.withErrorHandling(
          () =>
            addStatusEventAndBroadcast({
              noteId,
              status: "COMPLETED",
              message: `Categorized as: ${categories.join(", ")} | Tags: ${tags.join(", ")}`,
              context: "categorization",
            }),
          { jobId, noteId, operation: "add_completion_status" }
        );

        console.log(`Categorization job ${jobId} completed successfully`);
      } catch (error) {
        // Handle structured errors
        if (error instanceof QueueError) {
          const jobError = error.jobError;
          jobError.jobId = jobId;
          jobError.queueName = queue.name;
          jobError.retryCount = retryCount;

          ErrorHandler.logError(jobError);

          // Add failure status event
          try {
            await addStatusEventAndBroadcast({
              noteId: job.data.noteId,
              status: "FAILED",
              message: `Categorization failed: ${jobError.message}`,
              context: "categorization",
            });
          } catch (statusError) {
            console.error("Failed to add failure status event:", statusError);
          }

          // Determine if job should be retried
          if (ErrorHandler.shouldRetry(jobError, retryCount)) {
            const backoffDelay = ErrorHandler.calculateBackoff(retryCount);
            console.log(
              `Scheduling retry for categorization job ${jobId} in ${backoffDelay}ms`
            );
            throw error; // Re-throw for BullMQ retry
          } else {
            console.log(
              `Categorization job ${jobId} failed permanently after ${retryCount + 1} attempts`
            );
            throw error; // Re-throw to mark job as failed
          }
        }

        // Handle unexpected errors
        const unexpectedError = ErrorHandler.classifyError(error as Error);
        unexpectedError.jobId = jobId;
        unexpectedError.queueName = queue.name;
        unexpectedError.retryCount = retryCount;

        ErrorHandler.logError(unexpectedError);
        throw new QueueError(unexpectedError);
      }
    },
    {
      connection: redisConnection,
      concurrency: 3, // Process multiple categorization jobs simultaneously
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Categorization job ${job?.id ?? "unknown"} completed`);
  });

  worker.on("failed", (job, err) => {
    const errorMessage =
      err instanceof QueueError ? err.jobError.message : err.message;
    console.error(
      `❌ Categorization job ${job?.id ?? "unknown"} failed:`,
      errorMessage
    );
  });

  worker.on("error", (err) => {
    const jobError = ErrorHandler.createJobError(
      err,
      ErrorType.UNKNOWN_ERROR,
      ErrorSeverity.CRITICAL,
      { operation: "worker_error", queueName: queue.name }
    );
    ErrorHandler.logError(jobError);
  });

  return worker;
}
