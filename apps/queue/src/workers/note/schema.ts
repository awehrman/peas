import { z } from "zod";

// ============================================================================
// BASE SCHEMAS
// ============================================================================

/**
 * Base source information schema
 */
export const SourceSchema = z.object({
  url: z.string().url("Invalid URL format").optional(),
  filename: z.string().optional(),
  contentType: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Processing options schema
 */
export const ProcessingOptionsSchema = z.object({
  skipParsing: z.boolean().optional(),
  skipCategorization: z.boolean().optional(),
  skipImageProcessing: z.boolean().optional(),
});

/**
 * Job metadata schema
 */
export const JobMetadataSchema = z.record(z.string(), z.unknown()).optional();

// ============================================================================
// NOTE JOB DATA SCHEMAS
// ============================================================================

/**
 * Main note job data schema
 */
export const NoteJobDataSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  noteId: z.string().uuid("Note ID must be a valid UUID").optional(),
  source: SourceSchema.optional(),
  options: ProcessingOptionsSchema.optional(),
  metadata: JobMetadataSchema,
  createdAt: z.date().optional(),
  priority: z
    .number()
    .int()
    .min(1, "Priority must be between 1 and 10")
    .max(10, "Priority must be between 1 and 10")
    .optional(),
  timeout: z
    .number()
    .int()
    .positive("Timeout must be a positive integer")
    .optional(),
});

/**
 * Parse HTML action data schema
 */
export const ParseHtmlDataSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
});

/**
 * Parsed HTML file schema
 */
export const ParsedHtmlFileSchema = z.object({
  title: z.string().min(1, "Title is required"),
  contents: z.string().min(1, "Contents are required"),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  sourceUrl: z.string().url("Invalid source URL format").optional(),
  sourceApplication: z.string().optional(),
  created: z.string().optional(),
  images: z
    .array(
      z.object({
        src: z.string(),
        width: z.string().optional(),
        dataResourceHash: z.string().optional(),
      })
    )
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Save note action data schema
 */
export const SaveNoteDataSchema = z.object({
  file: ParsedHtmlFileSchema,
});

/**
 * Note schema
 */
export const NoteSchema = z.object({
  id: z.string().uuid("Note ID must be a valid UUID"),
  title: z.string().min(1, "Title cannot be empty"),
  content: z.string().min(1, "Content cannot be empty"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Parsed ingredient line schema
 */
export const ParsedIngredientLineSchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  blockIndex: z.number().int().nonnegative(),
  lineIndex: z.number().int().nonnegative(),
});

/**
 * Parsed instruction line schema
 */
export const ParsedInstructionLineSchema = z.object({
  id: z.string().uuid(),
  originalText: z.string().min(1),
  lineIndex: z.number().int().nonnegative(),
});

/**
 * Note with parsed lines schema
 */
export const NoteWithParsedLinesSchema = NoteSchema.extend({
  parsedIngredientLines: z.array(ParsedIngredientLineSchema),
  parsedInstructionLines: z.array(ParsedInstructionLineSchema),
});

// ============================================================================
// SCHEDULE ACTION SCHEMAS
// ============================================================================

/**
 * Base schedule action data schema
 */
export const ScheduleActionDataSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
  file: ParsedHtmlFileSchema,
});

/**
 * Schedule categorization action data schema
 */
export const ScheduleCategorizationDataSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
});

/**
 * Schedule images action data schema
 */
export const ScheduleImagesDataSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
});

/**
 * Schedule ingredients action data schema
 */
export const ScheduleIngredientsDataSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
});

/**
 * Schedule instructions action data schema
 */
export const ScheduleInstructionsDataSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
});

/**
 * Schedule source action data schema
 */
export const ScheduleSourceDataSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
});

// ============================================================================
// STATUS EVENT SCHEMAS
// ============================================================================

/**
 * Note status enum
 */
export const NoteStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

/**
 * Status event schema
 */
export const StatusEventSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
  status: NoteStatusSchema,
  message: z.string().optional(),
  context: z.string().optional(),
  currentCount: z.number().int().nonnegative().optional(),
  totalCount: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// ERROR CONTEXT SCHEMAS
// ============================================================================

/**
 * Error context schema
 */
export const ErrorContextSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  operation: z.string().min(1, "Operation is required"),
  noteId: z.string().uuid().optional(),
  workerName: z.string().optional(),
  attemptNumber: z.number().int().positive().optional(),
});

/**
 * Log level schema
 */
export const LogLevelSchema = z.enum([
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Zod-based validation utilities for note actions
 */
export class ZodNoteValidation {
  /**
   * Validate parse HTML data with detailed error messages
   */
  static validateParseHtmlData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ParseHtmlDataSchema> }
    | { success: false; error: string } {
    const result = ParseHtmlDataSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errorMessage = result.error.issues
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    return { success: false, error: errorMessage };
  }

  /**
   * Validate save note data with detailed error messages
   */
  static validateSaveNoteData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof SaveNoteDataSchema> }
    | { success: false; error: string } {
    const result = SaveNoteDataSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errorMessage = result.error.issues
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    return { success: false, error: errorMessage };
  }

  /**
   * Validate schedule action data with detailed error messages
   */
  static validateScheduleActionData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ScheduleActionDataSchema> }
    | { success: false; error: string } {
    const result = ScheduleActionDataSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errorMessage = result.error.issues
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    return { success: false, error: errorMessage };
  }

  /**
   * Validate note job data with detailed error messages
   */
  static validateNoteJobData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof NoteJobDataSchema> }
    | { success: false; error: string } {
    const result = NoteJobDataSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errorMessage = result.error.issues
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    return { success: false, error: errorMessage };
  }

  /**
   * Validate status event with detailed error messages
   */
  static validateStatusEvent(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof StatusEventSchema> }
    | { success: false; error: string } {
    const result = StatusEventSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errorMessage = result.error.issues
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    return { success: false, error: errorMessage };
  }

  /**
   * Validate error context with detailed error messages
   */
  static validateErrorContext(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ErrorContextSchema> }
    | { success: false; error: string } {
    const result = ErrorContextSchema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errorMessage = result.error.issues
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    return { success: false, error: errorMessage };
  }

  /**
   * Generic validation function for any schema
   */
  static validate<T extends z.ZodType>(
    schema: T,
    data: unknown
  ): { success: true; data: z.infer<T> } | { success: false; error: string } {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errorMessage = result.error.issues
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ");
    return { success: false, error: errorMessage };
  }
}
