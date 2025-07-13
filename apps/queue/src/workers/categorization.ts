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

        // Batch create categories and tags
        const categoryResults = await Promise.all(
          categories.map(async (categoryName) => {
            await addStatusEvent({
              noteId,
              status: "PROCESSING",
              message: `Creating category: ${categoryName}`,
              context: "categorization",
            });

            let category = await prisma.category.findFirst({
              where: { name: categoryName },
            });

            if (!category) {
              category = await prisma.category.create({
                data: { name: categoryName },
              });
            }

            return category;
          })
        );

        const tagResults = await Promise.all(
          tags.map(async (tagName) => {
            await addStatusEvent({
              noteId,
              status: "PROCESSING",
              message: `Adding tag: ${tagName}`,
              context: "categorization",
            });

            let tag = await prisma.tag.findFirst({
              where: { name: tagName },
            });

            if (!tag) {
              tag = await prisma.tag.create({
                data: { name: tagName },
              });
            }

            return tag;
          })
        );

        // Batch update note with all connections
        await prisma.note.update({
          where: { id: noteId },
          data: {
            categories: {
              connect: categoryResults.map((cat) => ({ id: cat.id })),
            },
            tags: {
              connect: tagResults.map((tag) => ({ id: tag.id })),
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
