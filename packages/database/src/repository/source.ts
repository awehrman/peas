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
 * Extract domain name from URL
 */
export function extractDomainName(url: string): string | null {
  try {
    const urlObj = new globalThis.URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Extract site name from URL (for backward compatibility)
 */
export function extractSiteName(url: string): string | null {
  return extractDomainName(url);
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
      urls: {
        include: {
          website: true,
        },
      },
    },
  });

  if (existingSource) {
    return existingSource.id;
  }

  // Extract domain name from URL
  const domainName = extractDomainName(url);

  // Find or create website
  let websiteId: string | undefined;
  if (domainName) {
    const website = await prisma.website.upsert({
      where: { domainName },
      update: {},
      create: {
        domainName,
        // Don't set siteName initially - it can be updated later
      },
    });
    websiteId = website.id;
  }

  // Create new source with URL and website
  const newSource = await prisma.source.create({
    data: {
      urls: {
        create: {
          url: url,
          websiteId,
          lastAccessed: null, // Don't set lastAccessed initially
          isBrokenLink: false,
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
 * Connect note to source and update URL lastAccessed
 */
export async function connectNoteToSource(
  noteId: string,
  sourceId: string
): Promise<void> {
  // Update the lastAccessed date for all URLs in this source
  await prisma.uRL.updateMany({
    where: {
      sourceId: sourceId,
    },
    data: {
      lastAccessed: null,
    },
  });

  // Connect the note to the source
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

/**
 * Mark URL as broken link
 */
export async function markUrlAsBroken(urlId: string): Promise<void> {
  await prisma.uRL.update({
    where: { id: urlId },
    data: {
      isBrokenLink: true,
    },
  });
}

/**
 * Mark URL as working (not broken)
 */
export async function markUrlAsWorking(urlId: string): Promise<void> {
  await prisma.uRL.update({
    where: { id: urlId },
    data: {
      isBrokenLink: false,
      lastAccessed: null,
    },
  });
}

/**
 * Get website by domain name
 */
export async function getWebsiteByDomain(domainName: string) {
  return prisma.website.findUnique({
    where: { domainName },
    include: {
      urls: true,
    },
  });
}

/**
 * Update website site name
 */
export async function updateWebsiteSiteName(
  websiteId: string,
  siteName: string
): Promise<void> {
  await prisma.website.update({
    where: { id: websiteId },
    data: {
      siteName,
    },
  });
}
