import { BaseJobDataSchema, BaseValidation } from "./base";

import type {
  ParsedIngredientLine,
  ParsedInstructionLine,
} from "@peas/database";
import { z } from "zod";

// ============================================================================
// NOTE-SPECIFIC SCHEMAS
// ============================================================================

/**
 * Note job data schema - extends base job data
 */
export const NoteJobDataSchema = BaseJobDataSchema.extend({
  content: z.string().min(1, "Content cannot be empty"),
  noteId: z.string().uuid("Note ID must be a valid UUID").optional(),
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
 * Parse HTML data schema
 */
export const ParseHtmlDataSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  importId: z.string().optional(),
});

/**
 * Parsed HTML file schema
 */
export const ParsedHtmlFileSchema = z.object({
  title: z.string().min(1, "Title is required"),
  contents: z.string().min(1, "Contents are required"),
  ingredients: z.array(z.custom<ParsedIngredientLine>()).default([]),
  instructions: z.array(z.custom<ParsedInstructionLine>()).default([]),
  image: z.string().optional(),
  images: z
    .array(
      z.object({
        src: z.string(),
        width: z.string().optional(),
        dataResourceHash: z.string().optional(),
      })
    )
    .optional(),
  evernoteMetadata: z
    .object({
      originalCreatedAt: z.date().optional(),
      source: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Save note data schema
 */
export const SaveNoteDataSchema = z.object({
  file: ParsedHtmlFileSchema,
  importId: z.string().optional(),
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
  originalText: z.string(),
  normalizedText: z.string().optional(),
  lineIndex: z.number().int().nonnegative(),
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
export const ScheduleCategorizationDataSchema = ScheduleActionDataSchema.extend(
  {
    // Add categorization-specific fields if needed
  }
);

/**
 * Schedule images action data schema
 */
export const ScheduleImagesDataSchema = ScheduleActionDataSchema.extend({
  // Add image processing-specific fields if needed
});

/**
 * Schedule ingredients action data schema
 */
export const ScheduleIngredientsDataSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
  importId: z.string().optional(),
  note: z
    .object({
      id: z.string().uuid("Note ID must be a valid UUID"),
      title: z.string().nullable(),
      parsedIngredientLines: z.array(ParsedIngredientLineSchema).optional(),
    })
    .optional(),
});

/**
 * Schedule instructions action data schema
 */
export const ScheduleInstructionsDataSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
  importId: z.string().optional(),
  instructionLines: z.array(ParsedInstructionLineSchema).optional(),
});

/**
 * Process source action data schema
 */
export const ProcessSourceDataSchema = ScheduleActionDataSchema.extend({
  // Add source processing-specific fields if needed
});

// ============================================================================
// NOTE-SPECIFIC VALIDATION UTILITIES
// ============================================================================

/**
 * Note-specific validation utilities that extend base validation
 */
export class NoteValidation extends BaseValidation {
  /**
   * Validate note job data with detailed error messages
   */
  static validateNoteJobData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof NoteJobDataSchema> }
    | { success: false; error: string } {
    return this.validate(NoteJobDataSchema, data);
  }

  /**
   * Validate parse HTML data with detailed error messages
   */
  static validateParseHtmlData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ParseHtmlDataSchema> }
    | { success: false; error: string } {
    return this.validate(ParseHtmlDataSchema, data);
  }

  /**
   * Validate save note data with detailed error messages
   */
  static validateSaveNoteData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof SaveNoteDataSchema> }
    | { success: false; error: string } {
    return this.validate(SaveNoteDataSchema, data);
  }

  /**
   * Validate schedule action data with detailed error messages
   */
  static validateScheduleActionData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ScheduleActionDataSchema> }
    | { success: false; error: string } {
    return this.validate(ScheduleActionDataSchema, data);
  }

  /**
   * Validate schedule categorization data
   */
  static validateScheduleCategorizationData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ScheduleCategorizationDataSchema> }
    | { success: false; error: string } {
    return this.validate(ScheduleCategorizationDataSchema, data);
  }

  /**
   * Validate schedule images data
   */
  static validateScheduleImagesData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ScheduleImagesDataSchema> }
    | { success: false; error: string } {
    return this.validate(ScheduleImagesDataSchema, data);
  }

  /**
   * Validate schedule ingredients data
   */
  static validateScheduleIngredientsData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ScheduleIngredientsDataSchema> }
    | { success: false; error: string } {
    return this.validate(ScheduleIngredientsDataSchema, data);
  }

  /**
   * Validate schedule instructions data
   */
  static validateScheduleInstructionsData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ScheduleInstructionsDataSchema> }
    | { success: false; error: string } {
    return this.validate(ScheduleInstructionsDataSchema, data);
  }

  /**
   * Validate process source data
   */
  static validateProcessSourceData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ProcessSourceDataSchema> }
    | { success: false; error: string } {
    return this.validate(ProcessSourceDataSchema, data);
  }
}
