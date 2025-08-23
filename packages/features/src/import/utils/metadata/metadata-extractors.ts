import type { StatusMetadata } from "../../types/core";
import type { ProcessingStep } from "../status-parser";

export function getDuplicateCount(metadata?: Partial<StatusMetadata>): number {
  if (!metadata) {
    return 0;
  }
  const count = metadata["duplicateCount"];
  const result = typeof count === "number" ? count : 0;
  return result;
}

export function isDuplicateStep(step: ProcessingStep): boolean {
  if (step.id !== "check_duplicates") {
    return false;
  }

  const msg = (step.message || "").toLowerCase();
  const messageHasDuplicate = msg.includes("duplicate");
  const metadataHasDuplicates = getDuplicateCount(step.metadata) > 0;
  const result = messageHasDuplicate || metadataHasDuplicates;

  return result;
}

export function choosePreviewUrl(
  meta?: Partial<StatusMetadata>
): string | null {
  if (!meta) return null;
  const crop4x3 = meta["r2Crop4x3Url"];
  const thumb = meta["r2ThumbnailUrl"];
  const crop3x2 = meta["r2Crop3x2Url"];
  const original = meta["r2OriginalUrl"];
  if (typeof crop4x3 === "string" && crop4x3) return crop4x3;
  if (typeof thumb === "string" && thumb) return thumb;
  if (typeof crop3x2 === "string" && crop3x2) return crop3x2;
  if (typeof original === "string" && original) return original;
  return null;
}

export interface ImageSummary {
  count?: number;
  types: string[];
  cropSizes?: string[];
}

export function getImageSummary(
  metadata?: Partial<StatusMetadata>
): ImageSummary {
  const result: ImageSummary = { types: [] };
  if (!metadata) return result;
  const count =
    metadata["completedImages"] ??
    metadata["imageCount"] ??
    metadata["totalImages"];
  if (typeof count === "number") result.count = count;
  const types = metadata["imageTypes"];
  if (Array.isArray(types)) result.types = types.map((t) => String(t));

  // Extract crop sizes from metadata
  const cropSizes: string[] = [];

  if (
    metadata["r2OriginalUrl"] &&
    typeof metadata["r2OriginalUrl"] === "string" &&
    metadata["r2OriginalUrl"].trim()
  ) {
    cropSizes.push("original");
  }
  if (
    metadata["r2Crop3x2Url"] &&
    typeof metadata["r2Crop3x2Url"] === "string" &&
    metadata["r2Crop3x2Url"].trim()
  ) {
    cropSizes.push("3:2");
  }
  if (
    metadata["r2Crop4x3Url"] &&
    typeof metadata["r2Crop4x3Url"] === "string" &&
    metadata["r2Crop4x3Url"].trim()
  ) {
    cropSizes.push("4:3");
  }
  if (
    metadata["r2Crop16x9Url"] &&
    typeof metadata["r2Crop16x9Url"] === "string" &&
    metadata["r2Crop16x9Url"].trim()
  ) {
    cropSizes.push("16:9");
  }
  if (
    metadata["r2ThumbnailUrl"] &&
    typeof metadata["r2ThumbnailUrl"] === "string" &&
    metadata["r2ThumbnailUrl"].trim()
  ) {
    cropSizes.push("thumbnail");
  }

  if (cropSizes.length > 0) result.cropSizes = cropSizes;

  return result;
}

export function getSourceName(
  metadata?: Partial<StatusMetadata>
): string | null {
  if (!metadata) return null;
  const bookName = metadata["bookName"];
  const siteName = metadata["siteName"];
  const domain = metadata["domain"];
  const source = metadata["source"];
  if (typeof bookName === "string" && bookName) return bookName;
  if (typeof siteName === "string" && siteName) return siteName;
  if (typeof domain === "string" && domain) return domain;
  if (typeof source === "string" && source) {
    try {
      const url = new URL(source);
      return url.hostname;
    } catch {
      return source;
    }
  }
  return null;
}

export function getSavedCategory(
  metadata?: Partial<StatusMetadata>
): string | null {
  if (!metadata) return null;
  const cat = metadata["savedCategory"];
  return typeof cat === "string" && cat ? cat : null;
}

export function getSavedTags(
  metadata?: Partial<StatusMetadata>
): string[] | null {
  if (!metadata) return null;
  const tags = metadata["savedTags"];
  if (Array.isArray(tags)) return tags.map((t) => String(t));
  return null;
}
