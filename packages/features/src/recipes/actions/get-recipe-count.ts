"use server";

import { prisma } from "@peas/database";

export async function getRecipeCount() {
  // Placeholder: counts all notes as recipes for now.
  // Update when a Recipe model is added.
  return prisma.note.count();
}
