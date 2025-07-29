import { SaveNoteDataSchema } from "../../schemas";
import { ActionName } from "../../types";
import type { StructuredLogger } from "../../types";
import type { NotePipelineData } from "../../types/notes";
import type { NoteWorkerDependencies } from "../../types/notes";
import type { NoteWithParsedLines } from "../../types/notes";
import { BaseAction } from "../../workers/core/base-action";
import { ActionContext } from "../../workers/core/types";

/**
 * Saves a note to the database using the parsed HTML file data.
 *
 * This function takes the pipeline data containing parsed HTML content and creates
 * a new note record in the database. It preserves the original content and HTML,
 * and handles database responses that may have missing timestamp fields.
 *
 * @param data - The pipeline data containing the parsed HTML file and content
 * @param logger - Logger instance for recording operation progress and errors
 * @returns Promise resolving to the updated pipeline data with the created note
 * @throws {Error} When file data is missing or database operation fails
 *
 * @example
 * ```typescript
 * const result = await saveNote(pipelineData, logger);
 * console.log(`Created note with ID: ${result.noteId}`);
 * ```
 */
export async function saveNote(
  data: NotePipelineData,
  logger: StructuredLogger
): Promise<NotePipelineData> {
  logger.log(`[SAVE_NOTE] Starting note creation`);

  // Validate that we have the required file data
  if (!data.file) {
    throw new Error("No parsed HTML file data available for note creation");
  }

  // Import the database service to create the note
  const db = await import("@peas/database");

  try {
    // Create the note in the database
    const dbNote = await db.createNote(data.file);

    logger.log(
      `[SAVE_NOTE] Successfully created note with ID: ${dbNote.id}, title: "${dbNote.title}"`
    );

    // Transform the database result to match the expected NoteWithParsedLines interface
    const note: NoteWithParsedLines = {
      id: dbNote.id,
      title: dbNote.title,
      content: data.file.contents, // Use the original content
      html: data.file.contents, // Use the original HTML content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (dbNote as any).createdAt || new Date(), // Use the createdAt from database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updatedAt: (dbNote as any).updatedAt || new Date(), // Use the updatedAt from database or current time
      parsedIngredientLines: dbNote.parsedIngredientLines,
      parsedInstructionLines: dbNote.parsedInstructionLines,
    };

    // Return the updated pipeline data with the created note
    return {
      ...data,
      noteId: dbNote.id,
      note,
    };
  } catch (error) {
    logger.log(`[SAVE_NOTE] Failed to create note: ${error}`);
    throw error;
  }
}

/**
 * Action class for saving notes in the worker pipeline.
 *
 * This action validates input data using a Zod schema and delegates the actual
 * note creation to the saveNote service. It extends BaseAction to provide
 * standardized error handling, logging, and status broadcasting.
 *
 * The action expects NotePipelineData as input and returns the same type with
 * additional noteId and note properties populated.
 *
 * @example
 * ```typescript
 * const action = new SaveNoteAction();
 * const result = await action.execute(pipelineData, dependencies, context);
 * ```
 */
export class SaveNoteAction extends BaseAction<
  NotePipelineData,
  NoteWorkerDependencies,
  NotePipelineData
> {
  /** The unique identifier for this action in the worker pipeline */
  name = ActionName.SAVE_NOTE;

  /** Zod schema for validating input data before processing */
  private schema = SaveNoteDataSchema;

  /**
   * Validates the input data using the SaveNoteDataSchema.
   *
   * This method ensures that the pipeline data contains all required fields
   * and meets the schema requirements before attempting to save the note.
   *
   * @param data - The pipeline data to validate
   * @returns null if validation passes, Error object if validation fails
   *
   * @example
   * ```typescript
   * const error = action.validateInput(pipelineData);
   * if (error) {
   *   console.error('Validation failed:', error.message);
   * }
   * ```
   */
  validateInput(data: NotePipelineData): Error | null {
    try {
      this.schema.parse(data);
      return null;
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Executes the save note action.
   *
   * This method orchestrates the note saving process by:
   * 1. Validating the input data
   * 2. Calling the saveNote service with proper error handling
   * 3. Broadcasting status updates
   * 4. Logging operation progress
   *
   * @param data - The pipeline data containing the note to save
   * @param deps - Worker dependencies including services, logger, and status broadcaster
   * @param context - Action context for tracking execution state
   * @returns Promise resolving to the updated pipeline data with saved note
   * @throws {Error} When validation fails or the save operation encounters an error
   *
   * @example
   * ```typescript
   * const result = await action.execute(pipelineData, dependencies, context);
   * console.log(`Note saved with ID: ${result.noteId}`);
   * ```
   */
  async execute(
    data: NotePipelineData,
    deps: NoteWorkerDependencies,
    context: ActionContext
  ): Promise<NotePipelineData> {
    return this.executeServiceAction({
      data,
      deps,
      context,
      serviceCall: () => deps.services.saveNote(data),
      contextName: "save_note",
      startMessage: "Save note started",
      completionMessage: "Save note completed",
    });
  }
}
