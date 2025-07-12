"use server";

import { prisma } from "@peas/database";

export async function getImportStats() {
  const noteCount = await prisma.note.count();
  const ingredientCount = await prisma.parsedIngredientLine.count();

  const { _sum } = await prisma.note.aggregate({
    _sum: { parsingErrorCount: true },
  });
  const parsingErrorCount = _sum.parsingErrorCount ?? 0;

  return {
    noteCount,
    ingredientCount,
    parsingErrorCount,
  } as const;
}
