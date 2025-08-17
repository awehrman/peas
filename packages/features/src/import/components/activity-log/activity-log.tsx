"use client";

import { ConnectionStatus } from "./connection-status";
import { ImportItemComponent } from "./import-item";
import { PendingUploadItem } from "./pending-upload-item";
import { ActivityItem, ActivityLogProps, UploadProgress } from "./types";

import { ReactNode, useMemo } from "react";

import { useUploadContext } from "../../contexts/upload-context";
import { useImportItems } from "../../hooks/use-import-items";
import { useStatusWebSocket } from "../../hooks/use-status-websocket";

export function ActivityLog({
  className,
  htmlFiles = [],
}: ActivityLogProps): ReactNode {
  const { events, connectionStatus, error } = useStatusWebSocket({
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });
  const { fileTitles, uploadItems } = useUploadContext();

  // Use custom hook for import items processing
  const importItems = useImportItems({ events });

  // Memoize the combined items to avoid recalculation on every render
  const combinedItems = useMemo(() => {
    const allItems = new Map<string, ActivityItem>();

    // Debug: Log all upload items
    console.log(
      "📋 [ACTIVITY_LOG] All upload items:",
      Array.from(uploadItems.entries()).map(([id, item]) => ({
        importId: id,
        htmlFileName: item.htmlFileName,
        status: item.status,
      }))
    );

    // Add upload items first
    uploadItems.forEach((item) => {
      allItems.set(item.importId, {
        ...item,
        type: "upload",
        // Keep the original upload status for upload items
        status: item.status,
      });
    });

    // Debug: Log all import items
    console.log(
      "📋 [ACTIVITY_LOG] All import items:",
      importItems.map((item) => ({
        importId: item.importId,
        htmlFileName: item.htmlFileName,
        noteTitle: item.noteTitle,
        status: item.status,
      }))
    );

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
          console.log(
            "🔍 [ACTIVITY_LOG] Found matching upload item for import:",
            {
              importId: item.importId,
              uploadHtmlFileName: uploadData.htmlFileName,
              importHtmlFileName: item.htmlFileName,
              noteTitle: item.noteTitle,
            }
          );
          allItems.set(item.importId, {
            ...item,
            type: "import",
            htmlFileName: uploadData.htmlFileName,
          });
        } else {
          // No matching upload item found
          console.warn(
            "🚨 [ACTIVITY_LOG] No matching upload item found for import:",
            {
              importId: item.importId,
              htmlFileName: item.htmlFileName,
              noteTitle: item.noteTitle,
              uploadItemsKeys: Array.from(uploadItems.keys()),
              uploadItemsCount: uploadItems.size,
              fileTitlesKeys: Array.from(fileTitles.keys()),
            }
          );

          if (!item.htmlFileName && !item.noteTitle) {
            // Skip items that have no identifying information
            console.warn(
              "🚨 [ACTIVITY_LOG] Skipping import item with no identifying info:",
              item
            );
            return;
          } else {
            // Use a fallback filename if htmlFileName is empty
            const displayFileName =
              item.htmlFileName ||
              item.noteTitle ||
              `Import ${item.importId.slice(-8)}`;

            console.log(
              "🔍 [ACTIVITY_LOG] Using fallback filename for import:",
              {
                importId: item.importId,
                htmlFileName: item.htmlFileName,
                noteTitle: item.noteTitle,
                displayFileName,
              }
            );

            allItems.set(item.importId, {
              ...item,
              type: "import",
              htmlFileName: displayFileName,
            });
          }
        }
      }
    });

    const result = Array.from(allItems.values()).sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    console.log("📊 [ACTIVITY_LOG] Combined items count:", result.length);
    result.forEach((item, index) => {
      console.log(`📋 [ACTIVITY_LOG] Item ${index}:`, {
        importId: item.importId,
        htmlFileName: item.htmlFileName,
        type: item.type,
        status: item.status,
        hasNoteTitle: "noteTitle" in item && item.noteTitle,
      });
    });

    return result;
  }, [uploadItems, importItems]);

  // Memoize the file matching map for better performance
  const fileMatchingMap = useMemo(() => {
    const map = new Map<string, ActivityItem>();
    combinedItems.forEach((item) => {
      if (item.htmlFileName) {
        map.set(item.htmlFileName, item);
      }
      if ("noteTitle" in item && item.noteTitle) {
        map.set(item.noteTitle, item);
      }
    });
    return map;
  }, [combinedItems]);

  // Handle connection states
  const connectionStatusComponent = (
    <ConnectionStatus
      connectionStatus={connectionStatus}
      error={error ?? undefined}
      className={className}
    />
  );

  if (connectionStatus !== "connected") {
    return connectionStatusComponent;
  }

  if (combinedItems.length === 0) {
    return (
      <div className={`text-gray-500 ${className || ""}`}>
        No import activity yet...
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Import activity
      </h3>

      {/* Show HTML files that are being uploaded but don't have events yet */}
      {htmlFiles.map((htmlFile, index) => {
        const importItem =
          fileMatchingMap.get(htmlFile) ||
          fileMatchingMap.get(htmlFile.replace(/\.(html|htm)$/, ""));

        if (!importItem) {
          const extractedTitle = fileTitles.get(htmlFile);
          return (
            <PendingUploadItem
              key={`pending-${index}`}
              htmlFile={htmlFile}
              extractedTitle={extractedTitle}
              index={index}
            />
          );
        }

        return null; // Will be rendered in the combinedItems loop
      })}

      {/* Show all items (upload and import) */}
      {combinedItems.map((item) => (
        <ImportItemComponent
          key={item.importId}
          item={item}
          fileTitles={fileTitles}
        />
      ))}
    </div>
  );
}
