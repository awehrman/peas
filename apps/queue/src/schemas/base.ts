import { z } from "zod";

// ============================================================================
// BASE SCHEMAS - Shared across all workers
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
 * Base processing options schema
 */
export const ProcessingOptionsSchema = z.object({
  skipCategorization: z.boolean().default(false),
  skipImageProcessing: z.boolean().default(false),
  skipIngredientProcessing: z.boolean().default(false),
  skipInstructionProcessing: z.boolean().default(false),
  strictMode: z.boolean().default(false),
  allowPartial: z.boolean().default(true),
});

/**
 * Base job metadata schema
 */
export const JobMetadataSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  workerName: z.string().min(1, "Worker name is required"),
  attemptNumber: z.number().int().min(1).default(1),
  maxRetries: z.number().int().min(1).max(10).default(3),
  createdAt: z.date().default(() => new Date()),
  priority: z
    .number()
    .int()
    .min(1, "Priority must be between 1 and 10")
    .max(10, "Priority must be between 1 and 10")
    .default(5),
  timeout: z
    .number()
    .int()
    .positive("Timeout must be a positive integer")
    .default(30000), // 30 seconds
});

/**
 * Base job data schema that all workers extend
 */
export const BaseJobDataSchema = z.object({
  metadata: JobMetadataSchema.optional(),
  source: SourceSchema.optional(),
  options: ProcessingOptionsSchema.optional(),
  createdAt: z.date().optional(),
});

/**
 * Base status event schema
 */
export const StatusEventSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
  message: z.string().min(1, "Status message is required"),
  timestamp: z.date().default(() => new Date()),
  metadata: z.record(z.string(), z.unknown()).optional(),
  errorCode: z.string().optional(),
  errorDetails: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Base error context schema
 */
export const ErrorContextSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  operation: z.string().min(1, "Operation is required"),
  noteId: z.string().uuid().optional(),
  workerName: z.string().optional(),
  attemptNumber: z.number().int().positive().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  errorDetails: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.date().default(() => new Date()),
});

/**
 * Base parsed segment schema
 */
export const ParsedSegmentSchema = z.object({
  index: z.number().int().min(0),
  rule: z.string().min(1, "Rule is required"),
  type: z.enum([
    "amount",
    "unit",
    "ingredient",
    "modifier",
    "instruction",
    "note",
  ]),
  value: z.string().min(1, "Value is required"),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Base parse result schema
 */
export const ParseResultSchema = z.object({
  success: z.boolean(),
  parseStatus: z.enum(["PENDING", "CORRECT", "INCORRECT", "ERROR"]),
  segments: z.array(ParsedSegmentSchema).optional(),
  errorMessage: z.string().optional(),
  processingTime: z.number().int().min(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Generic validation utilities that can be used across all workers
 */
export class BaseValidation {
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

  /**
   * Validate base job data
   */
  static validateBaseJobData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof BaseJobDataSchema> }
    | { success: false; error: string } {
    return this.validate(BaseJobDataSchema, data);
  }

  /**
   * Validate status event
   */
  static validateStatusEvent(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof StatusEventSchema> }
    | { success: false; error: string } {
    return this.validate(StatusEventSchema, data);
  }

  /**
   * Validate error context
   */
  static validateErrorContext(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ErrorContextSchema> }
    | { success: false; error: string } {
    return this.validate(ErrorContextSchema, data);
  }

  /**
   * Validate parse result
   */
  static validateParseResult(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ParseResultSchema> }
    | { success: false; error: string } {
    return this.validate(ParseResultSchema, data);
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Source = z.infer<typeof SourceSchema>;
export type ProcessingOptions = z.infer<typeof ProcessingOptionsSchema>;
export type JobMetadata = z.infer<typeof JobMetadataSchema>;
export type BaseJobData = z.infer<typeof BaseJobDataSchema>;
export type StatusEvent = z.infer<typeof StatusEventSchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;
export type ParsedSegment = z.infer<typeof ParsedSegmentSchema>;
export type ParseResult = z.infer<typeof ParseResultSchema>;
