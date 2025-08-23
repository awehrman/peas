"use client";

import { ReactNode } from "react";

import { ActivityItem } from "../../../types/core";
import { PendingUploadItem } from "../pending-upload-item";

interface PendingUploadsListProps {
  htmlFiles: string[];
  fileTitles: Map<string, string>;
  fileMatchingMap: Map<string, ActivityItem>;
  className?: string;
}

export function PendingUploadsList({
  htmlFiles,
  fileTitles,
  fileMatchingMap,
  className = "",
}: PendingUploadsListProps): ReactNode {
  const pendingItems = htmlFiles
    .map((htmlFile, index) => {
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

      return null; // Will be rendered in the main items list
    })
    .filter(Boolean);

  if (pendingItems.length === 0) {
    return null;
  }

  return <div className={className}>{pendingItems}</div>;
}
