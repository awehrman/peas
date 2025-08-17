export interface ImportItem {
  importId: string;
  htmlFileName: string;
  noteTitle?: string;
  status: "importing" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  type?: "import"; // Indicates this came from WebSocket events
}

export interface UploadItem {
  importId: string;
  htmlFileName: string;
  imageCount: number;
  status: "uploading" | "uploaded" | "failed";
  createdAt: Date;
  type?: "upload"; // Indicates this came from upload context
}

// Interface for upload progress information preserved when merging items
export interface UploadProgress {
  htmlFileName: string;
  imageCount: number;
  uploadStatus: "uploading" | "uploaded" | "failed";
}

// Extended ImportItem that includes upload progress information
export interface ImportItemWithUploadProgress extends ImportItem {
  uploadProgress?: UploadProgress;
}

// Union type for items that can be displayed in the activity log
export type ActivityItem = ImportItemWithUploadProgress | UploadItem;

export interface ActivityLogProps {
  className?: string;
  htmlFiles?: string[]; // List of HTML files from upload
}
