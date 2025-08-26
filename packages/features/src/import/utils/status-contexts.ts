// Canonical status contexts and aliases used by the frontend
// All context names are normalized to under_case format
export const STATUS_CONTEXT = {
  // Note processing
  CLEAN_HTML_START: "clean_html_start",
  CLEAN_HTML_END: "clean_html_end",
  SAVE_NOTE: "save_note",
  NOTE_CREATION: "note_creation",
  NOTE_COMPLETION: "note_completion",

  // Ingredient processing
  INGREDIENT_PROCESSING: "ingredient_processing",
  PARSE_INGREDIENT_LINE: "parse_ingredient_line",
  SAVE_INGREDIENT_LINE: "save_ingredient_line",
  CHECK_INGREDIENT_COMPLETION: "check_ingredient_completion",

  // Instruction processing
  INSTRUCTION_PROCESSING: "instruction_processing",
  FORMAT_INSTRUCTION_LINE: "format_instruction_line",
  SAVE_INSTRUCTION_LINE: "save_instruction_line",
  CHECK_INSTRUCTION_COMPLETION: "check_instruction_completion",

  // Image processing
  IMAGE_PROCESSING: "image_processing",
  PROCESS_IMAGE: "process_image",
  UPLOAD_ORIGINAL: "upload_original",
  UPLOAD_PROCESSED: "upload_processed",
  SAVE_IMAGE: "image_save",
  CLEANUP_LOCAL_FILES: "cleanup_local_files",
  IMAGE_COMPLETED_STATUS: "image_completed_status",
  CHECK_IMAGE_COMPLETION: "check_image_completion",

  // Source processing
  SOURCE_CONNECTION: "source_connection",
  PROCESS_SOURCE: "process_source",

  // Categorization
  CATEGORIZATION_SAVE: "categorization_save",
  CATEGORIZATION_SAVE_COMPLETE: "categorization_save_complete",
  CATEGORIZATION_START: "categorization_start",
  CATEGORIZATION_COMPLETE: "categorization_complete",

  // Tags
  TAG_SAVE: "tag_save",
  TAG_SAVE_COMPLETE: "tag_save_complete",
  TAG_DETERMINATION_START: "tag_determination_start",
  TAG_DETERMINATION_COMPLETE: "tag_determination_complete",

  // Scheduling
  SCHEDULE_IMAGES: "schedule_images",
  SCHEDULE_INGREDIENTS: "schedule_ingredients",
  SCHEDULE_INSTRUCTIONS: "schedule_instructions",
  SCHEDULE_ALL_FOLLOWUP_TASKS: "schedule_all_followup_tasks",

  // Completion tracking
  TRACK_COMPLETION: "track_completion",
  TRACK_COMPLETION_COMPLETE: "track_completion_complete",
  MARK_WORKER_COMPLETED: "mark_worker_completed",
  MARK_WORKER_COMPLETED_COMPLETE: "mark_worker_completed_complete",
  INITIALIZE_COMPLETION_TRACKING_COMPLETE:
    "initialize_completion_tracking_complete",

  // Wait states
  WAIT_FOR_CATEGORIZATION: "wait_for_categorization",
  WAIT_FOR_CATEGORIZATION_COMPLETE: "wait_for_categorization_complete",

  // Duplicates
  CHECK_DUPLICATES: "check_duplicates",
} as const;

export type StatusContextValue =
  (typeof STATUS_CONTEXT)[keyof typeof STATUS_CONTEXT];

// Aliases per normalized step used in the UI
export const STATUS_ALIASES = {
  cleaning: [STATUS_CONTEXT.CLEAN_HTML_START, STATUS_CONTEXT.CLEAN_HTML_END],
  saving_note: [STATUS_CONTEXT.SAVE_NOTE],
  ingredient_processing: [STATUS_CONTEXT.INGREDIENT_PROCESSING],
  instruction_processing: [STATUS_CONTEXT.INSTRUCTION_PROCESSING],
  connecting_source: [STATUS_CONTEXT.SOURCE_CONNECTION],
  adding_images: [
    STATUS_CONTEXT.IMAGE_PROCESSING,
    STATUS_CONTEXT.CHECK_IMAGE_COMPLETION,
  ],
  adding_categories: [
    STATUS_CONTEXT.CATEGORIZATION_SAVE_COMPLETE,
    STATUS_CONTEXT.CATEGORIZATION_SAVE,
    STATUS_CONTEXT.CATEGORIZATION_COMPLETE,
  ],
  adding_tags: [
    STATUS_CONTEXT.TAG_SAVE_COMPLETE,
    STATUS_CONTEXT.TAG_SAVE,
    STATUS_CONTEXT.TAG_DETERMINATION_COMPLETE,
  ],
  check_duplicates: [STATUS_CONTEXT.CHECK_DUPLICATES],
} as const;
