import { ParsedHTMLFile } from "../../../apps/queue/src/types";
import { Note, Prisma, prisma } from "./client";

// TODO see if we can pull this from types
// type NoteWithIngredients = Prisma.NoteGetPayload<{
//   include: { ingredients: true };
// }>;

export type NoteWithIngredients = {
  id: string;
  ingredients: {
    id: string;
    reference: string;
  }[];
};

export async function getNotes() {
  console.log("getNotes");
  try {
    const notes = await prisma.note.findMany();
    return { notes };
  } catch (error) {
    return { error };
  }
}

export async function createNote(
  file: ParsedHTMLFile
): Promise<NoteWithIngredients> {
  try {
    const response: NoteWithIngredients = await prisma.note.create({
      data: {
        title: file.title,
        historicalCreatedAt: file.historicalCreatedAt,
        content: file.contents,
        source: file.sourceUrl ?? null,
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
      select: {
        id: true,
        // title: true,
        // historicalCreatedAt: true,
        // content: true,
        // source: true,
        ingredients: {
          select: {
            id: true,
            reference: true,
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
