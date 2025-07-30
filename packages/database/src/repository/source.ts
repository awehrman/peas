import { prisma } from "../client.js";

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new globalThis.URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract site name from URL
 */
export function extractSiteName(url: string): string | null {
  try {
    const urlObj = new globalThis.URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Create or find a source with the given URL
 */
export async function createOrFindSourceWithUrl(url: string): Promise<string> {
  // Check if a source with this URL already exists
  const existingSource = await prisma.source.findFirst({
    where: {
      urls: {
        some: {
          url: url,
        },
      },
    },
    include: {
      urls: true,
    },
  });

  if (existingSource) {
    return existingSource.id;
  }

  // Create new source with URL
  const newSource = await prisma.source.create({
    data: {
      urls: {
        create: {
          url: url,
          domainName: extractSiteName(url),
        },
      },
    },
  });

  return newSource.id;
}

/**
 * Create or find a source with the given book reference
 */
export async function createOrFindSourceWithBook(
  bookReference: string
): Promise<string> {
  // Check if a source with this book already exists
  const existingSource = await prisma.source.findFirst({
    where: {
      book: {
        title: bookReference,
      },
    },
    include: {
      book: true,
    },
  });

  if (existingSource) {
    return existingSource.id;
  }

  // Create new source with book
  const newSource = await prisma.source.create({
    data: {
      book: {
        create: {
          title: bookReference,
        },
      },
    },
  });

  return newSource.id;
}

/**
 * Upsert EvernoteMetadata with source information
 */
export async function upsertEvernoteMetadataSource(
  evernoteMetadataId: string,
  sourceUrl: string
): Promise<void> {
  await prisma.evernoteMetadata.upsert({
    where: { id: evernoteMetadataId },
    update: { source: sourceUrl },
    create: {
      id: evernoteMetadataId,
      source: sourceUrl,
    },
  });
}

/**
 * Connect note to source
 */
export async function connectNoteToSource(
  noteId: string,
  sourceId: string
): Promise<void> {
  await prisma.note.update({
    where: { id: noteId },
    data: {
      sources: {
        connect: { id: sourceId },
      },
    },
  });
}

/**
 * Get note with EvernoteMetadata
 */
export async function getNoteWithEvernoteMetadata(noteId: string) {
  return prisma.note.findUnique({
    where: { id: noteId },
    include: {
      evernoteMetadata: true,
    },
  });
}
