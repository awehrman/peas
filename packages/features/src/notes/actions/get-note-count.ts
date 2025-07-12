"use server";

import { prisma } from "@peas/database";

export async function getNoteCount() {
  return prisma.note.count();
}
