import { StatusEvent } from "../hooks/use-status-websocket";
import type { StatusMetadata } from "../types";

export interface ProcessingStep {
  id: string;
  name: string;
  status: "pending" | "processing" | "completed" | "failed";
  message: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  metadata?: Partial<StatusMetadata>;
}

export interface DetailedStatus {
  importId: string;
  noteId?: string;
  htmlFileName?: string;
  noteTitle?: string;
  overallStatus: "pending" | "processing" | "completed" | "failed";
  steps: ProcessingStep[];
  totalProgress: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  errors: string[];
  warnings: string[];
}

export interface StatusSummary {
  fileCleaned?: {
    sizeRemoved: string;
    originalSize: string;
  };
  noteCreated: boolean;
  ingredientsProcessed?: {
    current: number;
    total: number;
    errors: number;
  };
  instructionsProcessed?: {
    current: number;
    total: number;
  };
  sourceConnected?: {
    type: "book" | "site" | "domain";
    name: string;
  };
  imagesAdded?: {
    count: number;
    types: string[];
  };
  categoriesAdded?: {
    count: number;
    names: string[];
  };
  tagsAdded?: {
    count: number;
    names: string[];
  };
  parsingErrors: number;
}

/**
 * Parse file size information from event metadata
 */
function parseFileSize(metadata: Record<string, unknown>): string | undefined {
  const sizeRemoved = metadata.sizeRemoved;
  if (typeof sizeRemoved === "number") {
    return formatBytes(sizeRemoved);
  }
  if (typeof sizeRemoved === "string") {
    return sizeRemoved;
  }
  return undefined;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Extract source information from event metadata
 */
function parseSourceInfo(
  metadata: Record<string, unknown>
): { type: "book" | "site" | "domain"; name: string } | undefined {
  const source = metadata.source;
  const sourceType = metadata.sourceType;
  const domain = metadata.domain;
  const bookName = metadata.bookName;
  const siteName = metadata.siteName;

  if (bookName && typeof bookName === "string") {
    return { type: "book", name: bookName };
  }
  if (siteName && typeof siteName === "string") {
    return { type: "site", name: siteName };
  }
  if (domain && typeof domain === "string") {
    return { type: "domain", name: domain };
  }
  if (source && typeof source === "string") {
    try {
      const url = new URL(source);
      return { type: "domain", name: url.hostname };
    } catch {
      return { type: "site", name: source };
    }
  }
  return undefined;
}

/**
 * Parse image processing information
 */
function parseImageInfo(
  metadata: Record<string, unknown>
): { count: number; types: string[] } | undefined {
  const imageCount = metadata.imageCount || metadata.completedImages;
  const imageTypes = metadata.imageTypes;

  if (typeof imageCount === "number" && imageCount > 0) {
    const types: string[] = [];
    if (imageTypes && Array.isArray(imageTypes)) {
      types.push(...imageTypes.map((t) => String(t)));
    } else {
      // Default types if not specified
      types.push("thumbnail", "crop");
    }
    return { count: imageCount, types };
  }
  return undefined;
}

/**
 * Parse categorization and tagging information
 */
function parseCategorizationInfo(metadata: Record<string, unknown>): {
  categories: { count: number; names: string[] };
  tags: { count: number; names: string[] };
} {
  const categories = metadata.categories;
  const tags = metadata.tags;

  const categoryNames = Array.isArray(categories)
    ? categories.map((c) => String(c))
    : [];
  const tagNames = Array.isArray(tags) ? tags.map((t) => String(t)) : [];

  return {
    categories: { count: categoryNames.length, names: categoryNames },
    tags: { count: tagNames.length, names: tagNames },
  };
}

/**
 * Create a status summary from events
 */
export function createStatusSummary(events: StatusEvent[]): StatusSummary {
  const summary: StatusSummary = {
    noteCreated: false,
    parsingErrors: 0,
  };

  for (const event of events) {
    const metadata = event.metadata || {};

    // File cleaning
    if (event.context === "file_cleaning" && event.status === "COMPLETED") {
      const sizeRemoved = parseFileSize(metadata);
      if (sizeRemoved) {
        summary.fileCleaned = {
          sizeRemoved,
          originalSize: metadata.originalSize
            ? String(metadata.originalSize)
            : "unknown",
        };
      }
    }

    // Note creation
    if (event.context === "note_creation" && event.status === "COMPLETED") {
      summary.noteCreated = true;
    }

    // Ingredient processing
    if (event.context === "ingredient_processing") {
      const total = metadata.totalIngredientLines as number;
      const current = metadata.completedIngredientLines as number;
      const errors = (metadata.parsingErrors as number) || 0;

      if (typeof total === "number" && typeof current === "number") {
        summary.ingredientsProcessed = { current, total, errors };
      }
    }

    // Instruction processing
    if (event.context === "instruction_processing") {
      const total = metadata.totalInstructions as number;
      const current = metadata.completedInstructions as number;

      if (typeof total === "number" && typeof current === "number") {
        summary.instructionsProcessed = { current, total };
      }
    }

    // Source connection
    if (event.context === "source_connection" && event.status === "COMPLETED") {
      const sourceInfo = parseSourceInfo(metadata);
      if (sourceInfo) {
        summary.sourceConnected = sourceInfo;
      }
    }

    // Image processing
    if (event.context === "image_processing" && event.status === "COMPLETED") {
      const imageInfo = parseImageInfo(metadata);
      if (imageInfo) {
        summary.imagesAdded = imageInfo;
      }
    }

    // Categorization
    if (event.context === "categorization" && event.status === "COMPLETED") {
      const { categories, tags } = parseCategorizationInfo(metadata);
      summary.categoriesAdded = categories;
      summary.tagsAdded = tags;
    }

    // Parsing errors
    if (event.status === "FAILED" || event.message?.includes("parsing error")) {
      summary.parsingErrors++;
    }
  }

  return summary;
}

/**
 * Generate human-readable status messages
 */
export function generateStatusMessages(summary: StatusSummary): string[] {
  const messages: string[] = [];

  if (summary.fileCleaned) {
    messages.push(`Cleaned file (${summary.fileCleaned.sizeRemoved} removed)`);
  }

  if (summary.noteCreated) {
    messages.push("Created note");
  }

  if (summary.ingredientsProcessed) {
    const { current, total, errors } = summary.ingredientsProcessed;
    const errorText = errors > 0 ? ` (${errors} parsing errors found)` : "";
    messages.push(`Processed ${current}/${total} ingredients${errorText}`);
  }

  if (summary.instructionsProcessed) {
    const { current, total } = summary.instructionsProcessed;
    messages.push(`Processed ${current}/${total} instructions`);
  }

  if (summary.sourceConnected) {
    const { type, name } = summary.sourceConnected;
    messages.push(`Connected source ${name} (${type})`);
  }

  if (summary.imagesAdded) {
    const { count, types } = summary.imagesAdded;
    const typeText = types.length > 0 ? ` (${types.join(", ")})` : "";
    messages.push(`Added ${count} image${count !== 1 ? "s" : ""}${typeText}`);
  }

  if (summary.categoriesAdded) {
    const { count, names } = summary.categoriesAdded;
    if (count === 0) {
      messages.push("No category added");
    } else {
      messages.push(
        `${count} categor${count === 1 ? "y" : "ies"} added: ${names.join(", ")}`
      );
    }
  }

  if (summary.tagsAdded) {
    const { count, names } = summary.tagsAdded;
    if (count === 0) {
      messages.push("No tags added");
    } else {
      messages.push(
        `${count} tag${count === 1 ? "" : "s"} found: ${names.join(", ")}`
      );
    }
  }

  return messages;
}

/**
 * Calculate overall progress percentage
 */
export function calculateProgress(events: StatusEvent[]): number {
  if (events.length === 0) return 0;

  const completedEvents = events.filter(
    (event) => event.status === "COMPLETED"
  );
  const totalEvents = events.length;

  return Math.round((completedEvents.length / totalEvents) * 100);
}

/**
 * Create processing steps from events
 */
export function createProcessingSteps(events: StatusEvent[]): ProcessingStep[] {
  const steps: ProcessingStep[] = [];
  const stepMap = new Map<string, ProcessingStep>();

  for (const event of events) {
    const stepId = event.context || "unknown";

    if (!stepMap.has(stepId)) {
      stepMap.set(stepId, {
        id: stepId,
        name: formatStepName(stepId),
        status: "pending",
        message: "",
        metadata: {},
      });
    }

    const step = stepMap.get(stepId)!;

    // Update step status
    if (event.status === "PROCESSING") {
      step.status = "processing";
    } else if (event.status === "COMPLETED") {
      step.status = "completed";
    } else if (event.status === "FAILED") {
      step.status = "failed";
    }

    // Update step message
    if (event.message) {
      step.message = event.message;
    }

    // Update progress if available
    if (event.currentCount !== undefined && event.totalCount !== undefined) {
      step.progress = {
        current: event.currentCount,
        total: event.totalCount,
        percentage: Math.round((event.currentCount / event.totalCount) * 100),
      };
    }

    // Merge metadata
    if (event.metadata) {
      step.metadata = { ...step.metadata, ...event.metadata };
    }
  }

  return Array.from(stepMap.values());
}

/**
 * Format step name for display
 */
function formatStepName(context: string): string {
  const nameMap: Record<string, string> = {
    file_cleaning: "File Cleaning",
    note_creation: "Note Creation",
    ingredient_processing: "Ingredient Processing",
    instruction_processing: "Instruction Processing",
    image_processing: "Image Processing",
    source_connection: "Source Connection",
    categorization: "Categorization",
    note_completion: "Note Completion",
  };

  return (
    nameMap[context] ||
    context.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}
