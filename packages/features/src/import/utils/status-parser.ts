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
    cropSizes?: string[];
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
): { count: number; types: string[]; cropSizes?: string[] } | undefined {
  const imageCount = metadata.imageCount || metadata.completedImages;
  const imageTypes = metadata.imageTypes;

  if (typeof imageCount === "number" && imageCount > 0) {
    const types: string[] = [];
    const cropSizes: string[] = [];

    if (imageTypes && Array.isArray(imageTypes)) {
      types.push(...imageTypes.map((t) => String(t)));
    } else {
      // Default types if not specified
      types.push("thumbnail", "crop");
    }

    // Extract crop sizes from metadata
    if (
      metadata.r2OriginalUrl &&
      typeof metadata.r2OriginalUrl === "string" &&
      metadata.r2OriginalUrl.trim()
    )
      cropSizes.push("original");
    if (
      metadata.r2Crop3x2Url &&
      typeof metadata.r2Crop3x2Url === "string" &&
      metadata.r2Crop3x2Url.trim()
    )
      cropSizes.push("3:2");
    if (
      metadata.r2Crop4x3Url &&
      typeof metadata.r2Crop4x3Url === "string" &&
      metadata.r2Crop4x3Url.trim()
    )
      cropSizes.push("4:3");
    if (
      metadata.r2Crop16x9Url &&
      typeof metadata.r2Crop16x9Url === "string" &&
      metadata.r2Crop16x9Url.trim()
    )
      cropSizes.push("16:9");
    if (
      metadata.r2ThumbnailUrl &&
      typeof metadata.r2ThumbnailUrl === "string" &&
      metadata.r2ThumbnailUrl.trim()
    )
      cropSizes.push("thumbnail");

    return {
      count: imageCount,
      types,
      cropSizes: cropSizes.length > 0 ? cropSizes : undefined,
    };
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
    if (event.context === "clean_html_end") {
      if (event.status === "COMPLETED") {
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
    }

    // Note creation
    if (event.context === "save_note" && event.status === "COMPLETED") {
      summary.noteCreated = true;
    }

    // Ingredient processing
    if (
      event.context === "ingredient_processing" &&
      event.status === "COMPLETED"
    ) {
      const total = metadata.totalIngredientLines as number;
      const current = metadata.completedIngredientLines as number;
      const errors = (metadata.parsingErrors as number) || 0;

      if (typeof total === "number" && typeof current === "number") {
        summary.ingredientsProcessed = { current, total, errors };
      }
    }

    // Instruction processing
    if (
      event.context === "instruction_processing" &&
      event.status === "COMPLETED"
    ) {
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
        summary.imagesAdded = {
          count: imageInfo.count,
          types: imageInfo.types,
          cropSizes: imageInfo.cropSizes,
        };
      }
    }

    // Categorization
    if (
      (event.context === "categorization_save_complete" ||
        event.context === "categorization_complete") &&
      event.status === "COMPLETED"
    ) {
      const { categories, tags } = parseCategorizationInfo(metadata);
      summary.categoriesAdded = categories;
      summary.tagsAdded = tags;
    }

    // Tags (separate from categorization)
    if (
      (event.context === "tag_save_complete" ||
        event.context === "tag_determination_complete") &&
      event.status === "COMPLETED"
    ) {
      const { categories, tags } = parseCategorizationInfo(metadata);
      if (!summary.categoriesAdded) summary.categoriesAdded = categories;
      if (!summary.tagsAdded) summary.tagsAdded = tags;
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
    messages.push(`Connected source *${name}* (${type})`);
  }

  if (summary.imagesAdded) {
    const { count, types, cropSizes } = summary.imagesAdded;
    const typeText = types.length > 0 ? ` (${types.join(", ")})` : "";
    const cropText =
      cropSizes && cropSizes.length > 0 ? ` [${cropSizes.join(", ")}]` : "";
    messages.push(
      `Added ${count} image${count !== 1 ? "s" : ""}${typeText}${cropText}`
    );
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
 * Normalize context to step ID for proper grouping
 */
function normalizeStepId(context: string): string {
  // Map different contexts to the same step ID
  const normalizationMap: Record<string, string> = {
    // Clean HTML contexts
    clean_html_start: "cleaning",
    clean_html_end: "cleaning",

    // Parse HTML contexts
    parse_html: "parsing",
    parse_html_start: "parsing",

    // Other contexts that should be grouped
    save_note: "saving_note",
    note_creation: "saving_note",

    // Keep others as-is
  };

  return normalizationMap[context] || context;
}

/**
 * Create processing steps from events
 */
export function createProcessingSteps(events: StatusEvent[]): ProcessingStep[] {
  const stepMap = new Map<string, ProcessingStep>();

  for (const event of events) {
    const context = event.context || "unknown";
    // Normalize context for step grouping
    const normalizedStepId = normalizeStepId(context);
    const stepId = normalizedStepId;

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

    // Update step status with proper precedence
    // FAILED > COMPLETED > PROCESSING > PENDING
    if (event.status === "FAILED") {
      step.status = "failed";
    } else if (event.status === "COMPLETED") {
      // Only update to completed if not already failed
      if (step.status !== "failed") {
        step.status = "completed";
      }
    } else if (event.status === "PROCESSING") {
      // Only update to processing if not already completed or failed
      if (step.status !== "completed" && step.status !== "failed") {
        step.status = "processing";
      }
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

  const steps = Array.from(stepMap.values());

  return steps;
}

/**
 * Format step name for display
 */
function formatStepName(context: string): string {
  const nameMap: Record<string, string> = {
    // Note processing
    clean_html_start: "Cleaning",
    clean_html_end: "Cleaning",
    cleaning: "Cleaning",
    parse_html: "Parsing",
    parsing: "Parsing",
    save_note: "Saving Note",
    note_creation: "Note Creation",
    note_completion: "Note Completion",

    // Ingredient processing
    ingredient_processing: "Ingredient Processing",
    parse_ingredient_line: "Ingredient Processing",
    save_ingredient_line: "Ingredient Processing",
    check_ingredient_completion: "Ingredient Processing",

    // Instruction processing
    instruction_processing: "Instruction Processing",
    format_instruction_line: "Instruction Processing",
    save_instruction_line: "Instruction Processing",
    check_instruction_completion: "Instruction Processing",

    // Image processing
    image_processing: "Image Processing",
    process_image: "Image Processing",
    upload_original: "Image Processing",
    upload_processed: "Image Processing",
    image_save: "Image Processing",
    cleanup_local_files: "Image Processing",
    image_completed_status: "Image Processing",
    check_image_completion: "Image Processing",

    // Source processing
    source_connection: "Connecting Source",
    process_source: "Connecting Source",

    // Categorization
    categorization_save: "Adding Categories",
    categorization_save_complete: "Adding Categories",
    categorization_start: "Adding Categories",
    categorization_complete: "Adding Categories",

    // Tags
    tag_save: "Adding Tags",
    tag_save_complete: "Adding Tags",
    tag_determination_start: "Adding Tags",
    tag_determination_complete: "Adding Tags",

    // Scheduling
    schedule_images: "Image Processing",
    schedule_ingredients: "Ingredient Processing",
    schedule_instructions: "Instruction Processing",
    schedule_all_followup_tasks: "Scheduling Tasks",

    // Completion tracking
    track_completion: "Tracking Completion",
    track_completion_complete: "Tracking Completion",
    mark_worker_completed: "Worker Completion",
    mark_worker_completed_complete: "Worker Completion",
    initialize_completion_tracking_complete: "Initializing Tracking",

    // Wait states
    wait_for_categorization: "Waiting for Categorization",
    wait_for_categorization_complete: "Waiting for Categorization",

    // Duplicates
    check_duplicates: "Check Duplicates",
  };

  return (
    nameMap[context] ||
    context.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}
