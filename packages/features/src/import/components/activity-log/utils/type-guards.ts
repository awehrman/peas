import { ImportItem, ImportItemWithUploadProgress, UploadItem } from "../types";

export function isUploadItem(
  item: ImportItem | UploadItem | ImportItemWithUploadProgress
): item is UploadItem {
  return "imageCount" in item && item.type === "upload";
}

export function isImportItem(
  item: ImportItem | UploadItem | ImportItemWithUploadProgress
): item is ImportItem | ImportItemWithUploadProgress {
  return "noteTitle" in item && item.type === "import";
}

export function hasValidIdentifier(item: ImportItem): boolean {
  return !!(item.htmlFileName || item.noteTitle);
}
