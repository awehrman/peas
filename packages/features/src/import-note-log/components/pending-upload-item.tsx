"use client";

import { ReactNode, memo } from "react";

interface PendingUploadItemProps {
  htmlFile: string;
  extractedTitle?: string | null;
  index: number;
}

export const PendingUploadItem = memo(function PendingUploadItem({
  htmlFile,
  extractedTitle,
  index,
}: PendingUploadItemProps): ReactNode {
  const displayName = extractedTitle || htmlFile.replace(/\.(html|htm)$/, "");

  return (
    <div
      key={`pending-${index}`}
      className="flex items-center space-x-3 p-3 bg-blue-50 rounded"
    >
      <div className="animate-spin rounded-full h-4 w-4"></div>
      <div className="text-gray-800">Importing {displayName}...</div>
    </div>
  );
});
