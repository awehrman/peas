import type { StatusMetadata } from "../../types";
import { STATUS_CONTEXT } from "../../utils/status-contexts";
import type { ProcessingStep } from "../../utils/status-parser";

export const STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const STATUS_ICON = {
  [STATUS.COMPLETED]: "✓",
  [STATUS.PROCESSING]: "⟳",
  [STATUS.FAILED]: "✗",
  [STATUS.PENDING]: "○",
  DUPLICATE: "!",
} as const;

export const STATUS_COLOR = {
  [STATUS.COMPLETED]: "bg-green-500",
  [STATUS.PROCESSING]: "bg-blue-500",
  [STATUS.FAILED]: "bg-red-500",
  [STATUS.PENDING]: "bg-gray-300",
} as const;

export const STATUS_TEXT = {
  [STATUS.COMPLETED]: "text-green-700",
  [STATUS.PROCESSING]: "text-blue-700",
  [STATUS.FAILED]: "text-red-700",
  [STATUS.PENDING]: "text-gray-500",
} as const;

export interface StepDef {
  id: string;
  name: string;
  sourceIds: string[];
}

export const BASE_STEP_DEFS: StepDef[] = [
  {
    id: "cleaning",
    name: "Cleaning",
    sourceIds: ["clean_html", "file_cleaning"],
  },
  {
    id: "saving_note",
    name: "Saving Note",
    sourceIds: ["save_note", "note_creation"],
  },
  {
    id: "ingredient_processing",
    name: "Ingredient Processing",
    sourceIds: ["ingredient_processing"],
  },
  {
    id: "instruction_processing",
    name: "Instruction Processing",
    sourceIds: ["instruction_processing"],
  },
  {
    id: "connecting_source",
    name: "Connecting Source",
    sourceIds: [
      STATUS_CONTEXT.PROCESS_SOURCE,
      STATUS_CONTEXT.SOURCE_CONNECTION,
    ],
  },
  {
    id: "adding_images",
    name: "Adding Images",
    sourceIds: ["image_processing"],
  },
  {
    id: "adding_categories",
    name: "Adding Categories",
    sourceIds: ["categorization_save_complete", "categorization_save"],
  },
  {
    id: "adding_tags",
    name: "Adding Tags",
    sourceIds: ["tag_save_complete", "tag_save"],
  },
  {
    id: "check_duplicates",
    name: "Check Duplicates",
    sourceIds: [
      STATUS_CONTEXT.CHECK_DUPLICATES,
      STATUS_CONTEXT.CHECK_DUPLICATES_LEGACY,
    ],
  },
];

export function getDefaultStatusMessage(
  stepName: string,
  status: ProcessingStep["status"]
): string {
  switch (status) {
    case STATUS.PENDING:
      return `${stepName} not started`;
    case STATUS.PROCESSING:
      return `${stepName} is processing`;
    case STATUS.FAILED:
      return `${stepName} failed`;
    case STATUS.COMPLETED:
    default:
      return `${stepName} completed`;
  }
}

export function getDuplicateCount(metadata?: Partial<StatusMetadata>): number {
  if (!metadata) return 0;
  const count = metadata["duplicateCount"];
  return typeof count === "number" ? count : 0;
}

export function isDuplicateStep(step: ProcessingStep): boolean {
  if (step.id !== "check_duplicates") return false;
  const msg = (step.message || "").toLowerCase();
  return msg.includes("duplicate") || getDuplicateCount(step.metadata) > 0;
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

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${sizes[i]}`;
}

export interface ImageSummary {
  count?: number;
  types: string[];
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

// Upload item helpers
export type UploadStatus = "uploading" | "uploaded" | "failed" | string;

export const UPLOAD_STATUS_ICON: Record<string, string> = {
  uploading: "spinner",
  uploaded: "✅",
  failed: "❌",
};

export const UPLOAD_BACKGROUND_COLOR: Record<string, string> = {
  uploading: "bg-gray-50",
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
