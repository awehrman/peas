export type UploadStatus = "uploading" | "uploaded" | "failed" | string;

export const UPLOAD_STATUS_ICON: Record<string, string> = {
  uploading: "spinner",
  uploaded: "✅",
  failed: "❌",
};

export const UPLOAD_BACKGROUND_COLOR: Record<string, string> = {
  uploading: "bg-blue-50",
  uploaded: "bg-green-50",
  failed: "bg-red-50",
};

export function getUploadStatusText(
  status: UploadStatus,
  htmlFileName: string,
  imageCount?: number
): string {
  switch (status) {
    case "uploading":
      return `Uploading ${htmlFileName}...`;
    case "uploaded": {
      const count = typeof imageCount === "number" ? imageCount : 0;
      return `Uploaded ${htmlFileName} (${count} images)`;
    }
    case "failed":
      return `Failed to upload ${htmlFileName}`;
    default:
      return `Uploading ${htmlFileName}...`;
  }
}

export function getUploadProgressText(
  currentFile: number,
  totalFiles: number,
  currentBatch: number,
  totalBatches: number
): string {
  const fileProgress = `${currentFile}/${totalFiles}`;
  const batchProgress =
    totalBatches > 1 ? ` (Batch ${currentBatch}/${totalBatches})` : "";
  return `${fileProgress}${batchProgress}`;
}

export function calculateUploadProgress(
  currentFile: number,
  totalFiles: number,
  currentBatch: number,
  totalBatches: number
): number {
  if (totalFiles === 0 || totalBatches === 0) return 0;

  const fileProgress = currentFile / totalFiles;
  const batchProgress = currentBatch / totalBatches;

  // Weight batch progress more heavily for overall progress
  return Math.round((fileProgress * 0.3 + batchProgress * 0.7) * 100);
}
