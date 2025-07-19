"use server";

import { prisma } from "@peas/database";

export async function getIngredientCount() {
  return prisma.ingredient.count();
}
