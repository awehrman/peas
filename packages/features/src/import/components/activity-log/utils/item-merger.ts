import { ActivityItem, UploadProgress } from "../types";
import { ImportItem } from "../types";
import { UploadItem } from "../types";

export interface ItemMergerOptions {
  uploadItems: Map<string, UploadItem>;
  importItems: ImportItem[];
}

export function mergeActivityItems({
  uploadItems,
  importItems,
}: ItemMergerOptions): ActivityItem[] {
  const allItems = new Map<string, ActivityItem>();

  // Add upload items first
  uploadItems.forEach((item) => {
    allItems.set(item.importId, {
      ...item,
      type: "upload",
      // Keep the original upload status for upload items
      status: item.status,
    });
  });

  // Add import items, but preserve upload progress information
  importItems.forEach((item) => {
    const existingItem = allItems.get(item.importId);
    if (existingItem && existingItem.type === "upload") {
      // Merge upload progress with import status
      const uploadProgress: UploadProgress = {
        htmlFileName: existingItem.htmlFileName,
        imageCount: existingItem.imageCount,
        uploadStatus: existingItem.status,
      };

      allItems.set(item.importId, {
        ...item,
        type: "import",
        uploadProgress,
      });
    } else {
      // No existing upload item, but we have an import item
      // This could happen if the WebSocket receives events for an importId
      // that doesn't have a corresponding upload item

      // Try to find the upload item by importId to get the htmlFileName
      const uploadItem = Array.from(uploadItems.entries()).find(
        ([uploadImportId]) => uploadImportId === item.importId
      );

      if (uploadItem) {
        // We found a matching upload item, use its htmlFileName
        const [, uploadData] = uploadItem;

        allItems.set(item.importId, {
          ...item,
          type: "import",
          htmlFileName: uploadData.htmlFileName,
        });
      } else {
        // No matching upload item found
        if (!item.htmlFileName && !item.noteTitle) {
          // Skip items that have no identifying information
          return;
        } else {
          // Use a fallback filename if htmlFileName is empty
          const displayFileName =
            item.htmlFileName ||
            item.noteTitle ||
            `Import ${item.importId.slice(-8)}`;
          allItems.set(item.importId, {
            ...item,
            type: "import",
            htmlFileName: displayFileName,
          });
        }
      }
    }
  });

  // Preserve insertion order (no resorting) so items don't move around on updates
  return Array.from(allItems.values());
}

export function createFileMatchingMap(
  items: ActivityItem[]
): Map<string, ActivityItem> {
  const map = new Map<string, ActivityItem>();

  items.forEach((item) => {
    if (item.htmlFileName) {
      map.set(item.htmlFileName, item);
    }
    if ("noteTitle" in item && item.noteTitle) {
      map.set(item.noteTitle, item);
    }
  });

  return map;
}
