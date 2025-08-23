"use server";

import { prisma } from "@peas/database";

export interface ImportStats {
  noteCount: number;
  ingredientCount: number;
  parsingErrorCount: number;
}

export async function getImportStats(): Promise<ImportStats> {
  try {
    const [noteCount, ingredientCount, parsingErrorAggregate] =
      await Promise.all([
        prisma.note.count(),
        prisma.ingredient.count(),
        prisma.note.aggregate({
          _sum: { parsingErrorCount: true },
        }),
      ]);

    const parsingErrorCount = parsingErrorAggregate._sum.parsingErrorCount ?? 0;

    return {
      noteCount,
      ingredientCount,
      parsingErrorCount,
    };
  } catch (error) {
    console.error("Failed to fetch import stats:", error);
    throw new Error("Failed to fetch import statistics");
  }
}
