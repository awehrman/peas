import { prisma } from "./client";

export async function getNotes() {
  console.log("getNotes");
  try {
    const notes = await prisma.note.findMany();
    return { notes };
  } catch (error) {
    return { error };
  }
}

export async function createNote({ title = "", content = "" }) {
  console.log("creating note", { title });
  try {
    const note = await prisma.note.create({
      data: {
        title,
        content,
      },
    });
    console.log(`created ${note.id}`);
    return { note };
  } catch (error) {
    console.log({ error });
    return { error };
  }
}
