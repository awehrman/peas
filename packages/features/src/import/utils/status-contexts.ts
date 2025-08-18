// Canonical status contexts and aliases used by the frontend
// Avoid enums; use const objects + literal unions for type safety

export const STATUS_CONTEXT = {
  CLEAN_HTML: "clean_html",
  FILE_CLEANING: "file_cleaning",
  SAVE_NOTE: "save_note",
  NOTE_CREATION: "note_creation",
  INGREDIENT_PROCESSING: "ingredient_processing",
  INSTRUCTION_PROCESSING: "instruction_processing",
  PROCESS_SOURCE: "process_source",
  SOURCE_CONNECTION: "source_connection",
  IMAGE_PROCESSING: "image_processing",
  CATEGORIZATION_SAVE: "categorization_save",
  CATEGORIZATION_SAVE_COMPLETE: "categorization_save_complete",
  TAG_SAVE: "tag_save",
  TAG_SAVE_COMPLETE: "tag_save_complete",
  NOTE_COMPLETION: "note_completion",
  CHECK_DUPLICATES: "check_duplicates",
  CHECK_DUPLICATES_LEGACY: "CHECK_DUPLICATES",
} as const;

export type StatusContextValue =
  (typeof STATUS_CONTEXT)[keyof typeof STATUS_CONTEXT];

// Aliases per normalized step used in the UI
export const STATUS_ALIASES = {
  cleaning: [STATUS_CONTEXT.CLEAN_HTML, STATUS_CONTEXT.FILE_CLEANING],
  saving_note: [STATUS_CONTEXT.SAVE_NOTE, STATUS_CONTEXT.NOTE_CREATION],
  ingredient_processing: [STATUS_CONTEXT.INGREDIENT_PROCESSING],
  instruction_processing: [STATUS_CONTEXT.INSTRUCTION_PROCESSING],
  connecting_source: [
    STATUS_CONTEXT.PROCESS_SOURCE,
    STATUS_CONTEXT.SOURCE_CONNECTION,
  ],
  adding_images: [STATUS_CONTEXT.IMAGE_PROCESSING],
  adding_categories: [
    STATUS_CONTEXT.CATEGORIZATION_SAVE_COMPLETE,
    STATUS_CONTEXT.CATEGORIZATION_SAVE,
  ],
  adding_tags: [STATUS_CONTEXT.TAG_SAVE_COMPLETE, STATUS_CONTEXT.TAG_SAVE],
  check_duplicates: [
    STATUS_CONTEXT.CHECK_DUPLICATES,
    STATUS_CONTEXT.CHECK_DUPLICATES_LEGACY,
  ],
} as const;
