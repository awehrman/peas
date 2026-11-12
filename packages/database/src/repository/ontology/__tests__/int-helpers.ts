import { prisma } from "../../../client.js";

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

/** Empties every ontology table plus the notes, lines, and users the tests create. Revision ids restart at 1. */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE
      "LexiconRevision", "FoodConcept", "LexiconEntry", "AttributeDefinition", "PreparationOperation",
      "FoodRelationship", "FoodClassification", "Discovery", "LexiconDecision", "LegacyIngredientMapping",
      "IngredientMention", "ParsedIngredientLine", "Note", "User"
    RESTART IDENTITY CASCADE
  `);
}

export async function createNote(title = "Test note"): Promise<string> {
  const note = await prisma.note.create({
    data: { title, html: "<p></p>" },
    select: { id: true },
  });
  return note.id;
}

export async function createLine(
  reference: string,
  noteId: string | null = null,
  lineIndex = 0
): Promise<string> {
  const line = await prisma.parsedIngredientLine.create({
    data: { reference, blockIndex: 0, lineIndex, noteId },
    select: { id: true },
  });
  return line.id;
}

export async function createUser(username = "reviewer"): Promise<string> {
  const user = await prisma.user.create({
    data: {
      username,
      email: `${username}@example.com`,
      passwordHash: "not-a-real-hash",
    },
    select: { id: true },
  });
  return user.id;
}
