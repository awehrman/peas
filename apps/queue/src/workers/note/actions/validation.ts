import { ParseHtmlData, SaveNoteData, ScheduleActionData } from "../types";

/**
 * Validation utilities for note actions
 */
export class NoteValidation {
  /**
   * Validate parse HTML data
   */
  static validateParseHtmlData(data: ParseHtmlData): Error | null {
    if (!data.content) {
      return new Error("Content is required for HTML parsing");
    }

    if (typeof data.content !== "string") {
      return new Error("Content must be a string");
    }

    if (data.content.trim().length === 0) {
      return new Error("Content cannot be empty");
    }

    return null;
  }

  /**
   * Validate save note data
   */
  static validateSaveNoteData(data: SaveNoteData): Error | null {
    if (!data.file) {
      return new Error("Parsed file is required for saving note");
    }

    if (!data.file.title) {
      return new Error("File title is required");
    }

    if (!data.file.contents) {
      return new Error("File content is required");
    }

    return null;
  }

  /**
   * Validate schedule action data
   */
  static validateScheduleActionData(data: ScheduleActionData): Error | null {
    if (!data.noteId) {
      return new Error("Note ID is required for scheduling");
    }

    if (!data.file) {
      return new Error("Parsed file is required for scheduling");
    }

    return null;
  }
}
