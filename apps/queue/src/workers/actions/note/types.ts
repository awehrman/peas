// Define proper types for note processing
// Import the correct ParsedHTMLFile type from the main types
import type { ParsedHTMLFile } from "../../../types";

// Re-export for convenience
export type ParsedHtmlFile = ParsedHTMLFile;

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteWithParsedLines extends Note {
  parsedLines: string[];
}

// Type-safe dependency interfaces
export interface ParseHtmlDeps {
  parseHTML: (content: string) => Promise<ParsedHtmlFile>;
}

export interface SaveNoteDeps {
  createNote: (file: ParsedHtmlFile) => Promise<NoteWithParsedLines>;
}

export interface ScheduleActionDeps {
  queue: {
    add: (name: string, data: Record<string, any>) => Promise<any>;
  };
}

// Type-safe data interfaces
export interface ParseHtmlData {
  content: string;
}

export interface SaveNoteData {
  file: ParsedHtmlFile;
}

export interface ScheduleActionData {
  noteId: string;
  file: ParsedHtmlFile;
}
