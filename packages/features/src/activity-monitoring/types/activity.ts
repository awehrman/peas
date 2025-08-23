export interface ActivityItem {
  importId: string;
  status: string;
  htmlFileName?: string;
  type: "upload" | "import";
  createdAt?: Date;
  // Additional properties based on type will be added via intersection types
}

export interface UploadActivityItem extends ActivityItem {
  type: "upload";
  imageCount: number;
  batchProgress?: {
    currentBatch: number;
    totalBatches: number;
    currentFile: number;
    totalFiles: number;
  };
}

export interface ImportActivityItem extends ActivityItem {
  type: "import";
  noteTitle?: string;
  uploadProgress?: {
    htmlFileName: string;
    imageCount: number;
    uploadStatus: string;
  };
}

export type CombinedActivityItem = UploadActivityItem | ImportActivityItem;
