// ============================================================================
// BASE SCHEMAS
// ============================================================================

export * from "./base";

// ============================================================================
// WORKER-SPECIFIC SCHEMAS
// ============================================================================

export * from "./note";
export * from "./ingredient";

// ============================================================================
// SCHEMA UTILITIES
// ============================================================================

/**
 * All available schemas for easy access
 */
export const Schemas = {
  // Base schemas
  base: {
    SourceSchema: () => import("./base").then((m) => m.SourceSchema),
    ProcessingOptionsSchema: () =>
      import("./base").then((m) => m.ProcessingOptionsSchema),
    JobMetadataSchema: () => import("./base").then((m) => m.JobMetadataSchema),
    BaseJobDataSchema: () => import("./base").then((m) => m.BaseJobDataSchema),
    StatusEventSchema: () => import("./base").then((m) => m.StatusEventSchema),
    ErrorContextSchema: () =>
      import("./base").then((m) => m.ErrorContextSchema),
    ParsedSegmentSchema: () =>
      import("./base").then((m) => m.ParsedSegmentSchema),
    ParseResultSchema: () => import("./base").then((m) => m.ParseResultSchema),
  },

  // Note schemas
  note: {
    NoteJobDataSchema: () => import("./note").then((m) => m.NoteJobDataSchema),
    ParseHtmlDataSchema: () =>
      import("./note").then((m) => m.ParseHtmlDataSchema),
    ParsedHtmlFileSchema: () =>
      import("./note").then((m) => m.ParsedHtmlFileSchema),
    SaveNoteDataSchema: () =>
      import("./note").then((m) => m.SaveNoteDataSchema),
    NoteSchema: () => import("./note").then((m) => m.NoteSchema),
    ParsedIngredientLineSchema: () =>
      import("./note").then((m) => m.ParsedIngredientLineSchema),
    ParsedInstructionLineSchema: () =>
      import("./note").then((m) => m.ParsedInstructionLineSchema),
    ScheduleActionDataSchema: () =>
      import("./note").then((m) => m.ScheduleActionDataSchema),
    ScheduleCategorizationDataSchema: () =>
      import("./note").then((m) => m.ScheduleCategorizationDataSchema),
    ScheduleImagesDataSchema: () =>
      import("./note").then((m) => m.ScheduleImagesDataSchema),
    ScheduleIngredientsDataSchema: () =>
      import("./note").then((m) => m.ScheduleIngredientsDataSchema),
    ScheduleInstructionsDataSchema: () =>
      import("./note").then((m) => m.ScheduleInstructionsDataSchema),
    ProcessSourceDataSchema: () =>
      import("./note").then((m) => m.ProcessSourceDataSchema),
  },

  // Ingredient schemas
  ingredient: {
    IngredientJobDataSchema: () =>
      import("./ingredient").then((m) => m.IngredientJobDataSchema),
    ProcessIngredientLineInputSchema: () =>
      import("./ingredient").then((m) => m.ProcessIngredientLineInputSchema),
    ProcessIngredientLineOutputSchema: () =>
      import("./ingredient").then((m) => m.ProcessIngredientLineOutputSchema),
    SaveIngredientLineInputSchema: () =>
      import("./ingredient").then((m) => m.SaveIngredientLineInputSchema),
    SaveIngredientLineOutputSchema: () =>
      import("./ingredient").then((m) => m.SaveIngredientLineOutputSchema),
    ScheduleCategorizationInputSchema: () =>
      import("./ingredient").then((m) => m.ScheduleCategorizationInputSchema),
    ScheduleCategorizationOutputSchema: () =>
      import("./ingredient").then((m) => m.ScheduleCategorizationOutputSchema),
  },
} as const;

/**
 * All available validation utilities
 */
export const Validation = {
  BaseValidation: () => import("./base").then((m) => m.BaseValidation),
  NoteValidation: () => import("./note").then((m) => m.NoteValidation),
  IngredientValidation: () =>
    import("./ingredient").then((m) => m.IngredientValidation),
} as const;
