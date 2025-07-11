import type { BlobPeaHighlight } from "../types.js";

/**
 * Checks if two highlights overlap
 */
export function highlightsOverlap(
  highlight1: BlobPeaHighlight,
  highlight2: BlobPeaHighlight,
  padding: number = 0
): boolean {
  const distance = Math.sqrt(
    Math.pow(highlight1.x - highlight2.x, 2) +
      Math.pow(highlight1.y - highlight2.y, 2)
  );

  const minDistance = highlight1.rx + highlight2.rx + padding;
  return distance < minDistance;
}

/**
 * Checks if a new highlight overlaps with any existing highlights
 */
export function hasCollision(
  newHighlight: BlobPeaHighlight,
  existingHighlights: BlobPeaHighlight[],
  padding: number = 0
): boolean {
  return existingHighlights.some((existing) =>
    highlightsOverlap(newHighlight, existing, padding)
  );
}

/**
 * Finds a non-colliding position for a highlight
 */
export function findNonCollidingPosition(
  highlight: BlobPeaHighlight,
  existingHighlights: BlobPeaHighlight[],
  maxDistX: number,
  maxDistY: number,
  maxAttempts: number = 50,
  padding: number = 0
): { x: number; y: number } | null {
  const originalX = highlight.x;
  const originalY = highlight.y;

  // Try the original position first
  if (!hasCollision(highlight, existingHighlights, padding)) {
    return { x: originalX, y: originalY };
  }

  // Try random positions around the original
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate a position within bounds
    const x = (Math.random() - 0.5) * 2 * maxDistX;
    const y = (Math.random() - 0.5) * 2 * maxDistY;

    const testHighlight = {
      ...highlight,
      x,
      y,
    };

    if (!hasCollision(testHighlight, existingHighlights, padding)) {
      return { x, y };
    }
  }

  // If we can't find a non-colliding position, try reducing the scale
  const reducedScale = highlight.scale * 0.8;
  const reducedHighlight = {
    ...highlight,
    scale: reducedScale,
    rx: highlight.rx * 0.8,
    ry: highlight.ry * 0.8,
  };

  // Try again with reduced size
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = (Math.random() - 0.5) * 2 * maxDistX;
    const y = (Math.random() - 0.5) * 2 * maxDistY;

    const testHighlight = {
      ...reducedHighlight,
      x,
      y,
    };

    if (!hasCollision(testHighlight, existingHighlights, padding)) {
      return { x, y };
    }
  }

  // If still no position found, return null (will skip this highlight)
  return null;
}
