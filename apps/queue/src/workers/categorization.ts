// Status events: Only emitted at start and completion for performance.
// This reduces DB connection overhead and status event spam.
import { Worker, Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { prisma, addStatusEvent } from "@peas/database";
import { ParsedHTMLFile } from "../types";

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
  }
}

export function setupCategorizationWorker(queue: Queue) {
  const worker = new Worker(
    queue.name,
    async ({
      data: { noteId, file },
    }: {
      data: { noteId: string; file: ParsedHTMLFile };
    }) => {
      console.log("Processing categorization...");

      try {
        await addStatusEvent({
          noteId,
          status: "PROCESSING",
          message: "Analyzing recipe for categories and tags...",
          context: "categorization",
        });

        const { categories, tags } = CategorizationProcessor.analyzeRecipe(
          file.title,
          file.contents
        );

        // Batch find existing categories and tags
        const [existingCategories, existingTags] = await Promise.all([
          prisma.category.findMany({
            where: { name: { in: categories } },
          }),
          prisma.tag.findMany({
            where: { name: { in: tags } },
          }),
        ]);

        const existingCategoryNames = new Set(
          existingCategories.map((c) => c.name)
        );
        const existingTagNames = new Set(existingTags.map((t) => t.name));

        // Batch create missing categories and tags
        await Promise.all([
          prisma.category.createMany({
            data: categories
              .filter((name) => !existingCategoryNames.has(name))
              .map((name) => ({ name })),
            skipDuplicates: true,
          }),
          prisma.tag.createMany({
            data: tags
              .filter((name) => !existingTagNames.has(name))
              .map((name) => ({ name })),
            skipDuplicates: true,
          }),
        ]);

        // Fetch all categories and tags (including newly created ones)
        const [allCategories, allTags] = await Promise.all([
          prisma.category.findMany({
            where: { name: { in: categories } },
          }),
          prisma.tag.findMany({
            where: { name: { in: tags } },
          }),
        ]);

        // Single batch update for note connections
        await prisma.note.update({
          where: { id: noteId },
          data: {
            categories: {
              connect: allCategories.map((cat) => ({ id: cat.id })),
            },
            tags: {
              connect: allTags.map((tag) => ({ id: tag.id })),
            },
          },
        });

        await addStatusEvent({
          noteId,
          status: "COMPLETED",
          message: `Categorized as: ${categories.join(", ")} | Tags: ${tags.join(", ")}`,
          context: "categorization",
        });
      } catch (error) {
        console.error("Categorization failed:", error);
        await addStatusEvent({
          noteId,
          status: "FAILED",
          message: `Categorization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          context: "categorization",
        });
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 3, // Process multiple categorization jobs simultaneously
    }
  );

  worker.on("completed", (job) => {
    console.log(`Categorization job ${job?.id ?? "unknown"} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `Categorization job ${job?.id ?? "unknown"} failed:`,
      err.message
    );
  });

  return worker;
}
