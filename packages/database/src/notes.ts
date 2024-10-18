import { prisma } from "./client";

export async function getNotes() {
  try {
    const notes = await prisma.note.findMany();
    return { notes };
  } catch (error) {
    return { error };
  }
}

export async function createNote({ title = "", content = "" }) {
  try {
    const note = await prisma.note.create({
      data: {
        title,
        content,
      },
    });
    return { note };
  } catch (error) {
    return { error };
  }
}
