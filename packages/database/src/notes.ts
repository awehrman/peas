import { ParsedHTMLFile } from "../../../apps/queue/src/types";
import { Note, Prisma, prisma } from "./client";

export async function getNotes() {
  console.log("getNotes");
  try {
    const notes = await prisma.note.findMany();
    return { notes };
  } catch (error) {
    return { error };
  }
}

export async function createNote(file: ParsedHTMLFile): Promise<Note> {
  try {
    const response: Note = await prisma.note.create({
      data: {
        title: file.title,
        historicalCreatedAt: file.historicalCreatedAt,
        content: file.contents,
        source: file.sourceUrl ?? null,
        isParsed: true,
        parsedAt: new Date(),
        ingredients: {
          createMany: {
            data: file.ingredients,
          },
        },
        instructions: {
          createMany: {
            data: file.instructions,
          },
        },
      },
    });
    console.log(`Successfully create note ${response.id}`);
    return response;
  } catch (error) {
    console.log({ error });
    throw error;
  }
}
