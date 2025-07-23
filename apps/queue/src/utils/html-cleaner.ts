import type { NotePipelineData } from "../types/notes";
import type { StructuredLogger } from "../workers/core/types";

/**
 * Extract title from H1 tag or meta itemprop="title"
 */
export function extractTitleFromHtml(html: string): string | undefined {
  // First try to find H1 tag
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match && h1Match[1]?.trim()) {
    return h1Match[1].trim();
  }

  // Then try to find meta itemprop="title"
  const metaMatch = html.match(
    /<meta[^>]*itemprop="title"[^>]*content="([^"]*)"[^>]*>/i
  );
  if (metaMatch && metaMatch[1]?.trim()) {
    return metaMatch[1].trim();
  }

  return undefined;
}

/**
 * Resolve the title for the content
 */
export function resolveTitle(data: NotePipelineData, html: string): string {
  let title = data.source?.filename || data.source?.url || "Untitled";
  if (!title || title === "Untitled") {
    title = extractTitleFromHtml(html) ?? "Untitled";
  }
  return title;
}

/**
 * Remove style tags and their content from HTML
 */
export function removeStyleTags(content: string): string {
  return content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
}

/**
 * Remove icons tags and their content from HTML
 */
export function removeIconsTags(content: string): string {
  return content.replace(/<icons[^>]*>[\s\S]*?<\/icons>/gi, "");
}

/**
 * Calculate and format the size of removed content
 */
export function calculateRemovedSize(
  originalLength: number,
  cleanedLength: number
): string {
  const totalRemoved = originalLength - cleanedLength;
  const removedKB = totalRemoved / 1024;
  const removedMB = totalRemoved / (1024 * 1024);

  // Format size string - show KB if < 1MB, otherwise show MB
  return removedKB >= 1024
    ? `${removedMB.toFixed(2)}MB`
    : `${removedKB.toFixed(1)}KB`;
}

/**
 * Log the cleaning statistics
 */
export function logCleaningStats(
  logger: StructuredLogger,
  title: string,
  originalLength: number,
  cleanedLength: number,
  beforeStyleRemoval: number,
  afterStyleRemoval: number,
  beforeIconsRemoval: number,
  afterIconsRemoval: number
): void {
  const sizeString = calculateRemovedSize(originalLength, cleanedLength);
  const totalRemoved = originalLength - cleanedLength;

  logger.log(
    `Style tags removed: ${beforeStyleRemoval - afterStyleRemoval} characters`
  );
  logger.log(
    `Icons tags removed: ${beforeIconsRemoval - afterIconsRemoval} characters`
  );
  logger.log(`HTML cleaning completed: ${title}`);
  logger.log(`Total characters removed: ${totalRemoved} (${sizeString})`);
  logger.log(`Final content length: ${cleanedLength}`);
}
