import { z } from "zod";
import { BaseJobDataSchema, BaseValidation, ParseResultSchema } from "./base";

// ============================================================================
// INGREDIENT-SPECIFIC SCHEMAS
// ============================================================================

/**
 * Ingredient job data schema - extends base job data
 */
export const IngredientJobDataSchema = BaseJobDataSchema.extend({
  ingredientLineId: z.string().min(1, "Ingredient line ID is required"),
  reference: z.string().min(1, "Reference text is required"),
  blockIndex: z.number().int().min(0, "Block index must be non-negative"),
  lineIndex: z.number().int().min(0, "Line index must be non-negative"),
  noteId: z.string().uuid("Note ID must be a valid UUID"),
  options: z
    .object({
      strictMode: z.boolean().default(false),
      allowPartial: z.boolean().default(true),
    })
    .optional(),
});

/**
 * Process ingredient line input schema
 */
export const ProcessIngredientLineInputSchema = z.object({
  ingredientLineId: z.string().min(1, "Ingredient line ID is required"),
  reference: z.string().min(1, "Reference text is required"),
  blockIndex: z.number().int().min(0, "Block index must be non-negative"),
  lineIndex: z.number().int().min(0, "Line index must be non-negative"),
  noteId: z.string().uuid("Note ID must be a valid UUID"),
  options: z
    .object({
      strictMode: z.boolean().default(false),
      allowPartial: z.boolean().default(true),
    })
    .optional(),
});

/**
 * Process ingredient line output schema
 */
export const ProcessIngredientLineOutputSchema = ParseResultSchema.extend({
  ingredientLineId: z.string().min(1, "Ingredient line ID is required"),
  noteId: z.string().uuid("Note ID must be a valid UUID"),
});

/**
 * Save ingredient line input schema
 */
export const SaveIngredientLineInputSchema = z.object({
  ingredientLineId: z.string().min(1, "Ingredient line ID is required"),
  noteId: z.string().uuid("Note ID must be a valid UUID"),
  parseResult: ParseResultSchema,
});

/**
 * Save ingredient line output schema
 */
export const SaveIngredientLineOutputSchema = z.object({
  success: z.boolean(),
  ingredientLineId: z.string().min(1, "Ingredient line ID is required"),
  segmentsCreated: z.number().int().min(0),
  processingTime: z.number().int().min(0),
  errorMessage: z.string().optional(),
});

/**
 * Schedule categorization input schema
 */
export const ScheduleCategorizationInputSchema = z.object({
  noteId: z.string().uuid("Note ID must be a valid UUID"),
  ingredientLineId: z.string().min(1, "Ingredient line ID is required"),
});

/**
 * Schedule categorization output schema
 */
export const ScheduleCategorizationOutputSchema = z.object({
  success: z.boolean(),
  categorizationJobId: z.string().optional(),
  errorMessage: z.string().optional(),
});

// ============================================================================
// INGREDIENT-SPECIFIC VALIDATION UTILITIES
// ============================================================================

/**
 * Ingredient-specific validation utilities that extend base validation
 */
export class IngredientValidation extends BaseValidation {
  /**
   * Validate ingredient job data with detailed error messages
   */
  static validateIngredientJobData(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof IngredientJobDataSchema> }
    | { success: false; error: string } {
    return this.validate(IngredientJobDataSchema, data);
  }

  /**
   * Validate process ingredient line input
   */
  static validateProcessIngredientLineInput(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ProcessIngredientLineInputSchema> }
    | { success: false; error: string } {
    return this.validate(ProcessIngredientLineInputSchema, data);
  }

  /**
   * Validate process ingredient line output
   */
  static validateProcessIngredientLineOutput(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ProcessIngredientLineOutputSchema> }
    | { success: false; error: string } {
    return this.validate(ProcessIngredientLineOutputSchema, data);
  }

  /**
   * Validate save ingredient line input
   */
  static validateSaveIngredientLineInput(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof SaveIngredientLineInputSchema> }
    | { success: false; error: string } {
    return this.validate(SaveIngredientLineInputSchema, data);
  }

  /**
   * Validate save ingredient line output
   */
  static validateSaveIngredientLineOutput(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof SaveIngredientLineOutputSchema> }
    | { success: false; error: string } {
    return this.validate(SaveIngredientLineOutputSchema, data);
  }

  /**
   * Validate schedule categorization input
   */
  static validateScheduleCategorizationInput(
    data: unknown
  ):
    | { success: true; data: z.infer<typeof ScheduleCategorizationInputSchema> }
    | { success: false; error: string } {
    return this.validate(ScheduleCategorizationInputSchema, data);
  }

  /**
   * Validate schedule categorization output
   */
  static validateScheduleCategorizationOutput(
    data: unknown
  ):
    | {
        success: true;
        data: z.infer<typeof ScheduleCategorizationOutputSchema>;
      }
    | { success: false; error: string } {
    return this.validate(ScheduleCategorizationOutputSchema, data);
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type IngredientJobData = z.infer<typeof IngredientJobDataSchema>;
export type ProcessIngredientLineInput = z.infer<
  typeof ProcessIngredientLineInputSchema
>;
export type ProcessIngredientLineOutput = z.infer<
  typeof ProcessIngredientLineOutputSchema
>;
export type SaveIngredientLineInput = z.infer<
  typeof SaveIngredientLineInputSchema
>;
export type SaveIngredientLineOutput = z.infer<
  typeof SaveIngredientLineOutputSchema
>;
export type ScheduleCategorizationInput = z.infer<
  typeof ScheduleCategorizationInputSchema
>;
export type ScheduleCategorizationOutput = z.infer<
  typeof ScheduleCategorizationOutputSchema
>;
