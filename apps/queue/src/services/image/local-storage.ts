import path from "path";

/** Public route the queue serves locally stored images from */
export const LOCAL_IMAGE_ROUTE = "/media/images";

/**
 * Root directory for processed images kept on the queue's disk when they are
 * not uploaded to R2. Kept apart from uploads/images, which CleanupService
 * empties after each import.
 */
export function getLocalImageRoot(): string {
  return (
    process.env.LOCAL_IMAGE_DIR ?? path.join(process.cwd(), "uploads", "media")
  );
}

/** Directory that holds every processed size of one import's images */
export function getLocalImageDir(importId: string): string {
  return path.join(getLocalImageRoot(), toSafePathSegment(importId));
}

/**
 * Builds the public URL for a file under the local image root.
 * IMAGE_BASE_URL must point at the queue's public origin plus
 * LOCAL_IMAGE_ROUTE when the queue is not on localhost.
 */
export function getLocalImageUrl(filePath: string): string {
  const relativePath = path.relative(getLocalImageRoot(), filePath);

  if (
    !filePath ||
    relativePath === "" ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Image is outside local image storage: ${filePath}`);
  }

  const baseUrl = (
    process.env.IMAGE_BASE_URL ??
    `http://localhost:${process.env.PORT ?? "3000"}${LOCAL_IMAGE_ROUTE}`
  ).replace(/\/+$/, "");
  const encodedPath = relativePath
    .split(path.sep)
    .map(encodeURIComponent)
    .join("/");

  return `${baseUrl}/${encodedPath}`;
}

function toSafePathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_") || "unknown";
}
