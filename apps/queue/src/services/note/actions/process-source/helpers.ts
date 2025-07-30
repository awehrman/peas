import { prisma } from "@peas/database";

import type { StructuredLogger } from "../../../../types";

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
 * Create or find a source with the given URL
 */
export async function createOrFindSourceWithUrl(
  url: string,
  logger: StructuredLogger
): Promise<string> {
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
    logger.log(
      `[PROCESS_SOURCE] Found existing source with URL: ${url}, source ID: ${existingSource.id}`
    );
    return existingSource.id;
  }

  // Create new source with URL
  const newSource = await prisma.source.create({
    data: {
      urls: {
        create: {
          url: url,
          siteName: extractSiteName(url),
        },
      },
    },
  });

  logger.log(
    `[PROCESS_SOURCE] Created new source with URL: ${url}, source ID: ${newSource.id}`
  );
  return newSource.id;
}

/**
 * Create or find a source with the given book reference
 */
export async function createOrFindSourceWithBook(
  bookReference: string,
  logger: StructuredLogger
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
    logger.log(
      `[PROCESS_SOURCE] Found existing source with book: ${bookReference}, source ID: ${existingSource.id}`
    );
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

  logger.log(
    `[PROCESS_SOURCE] Created new source with book: ${bookReference}, source ID: ${newSource.id}`
  );
  return newSource.id;
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
