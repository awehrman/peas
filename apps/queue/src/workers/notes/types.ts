import { Queue } from "bullmq";
import { parseHTML } from "../../parsers/html";
import { createNote } from "@peas/database";
import { addStatusEventAndBroadcast } from "../../utils/status-broadcaster";
import { ErrorHandler } from "../../utils/error-handler";
import { HealthMonitor } from "../../utils/health-monitor";
import { ParsedHTMLFile } from "../../types";
import { NoteWithParsedLines } from "@peas/database";

export interface NoteProcessingResult {
  note: NoteWithParsedLines;
  file: ParsedHTMLFile;
}

export interface NoteProcessingDependencies {
  parseHTML: (content: string) => Promise<ParsedHTMLFile>;
  createNote: (file: ParsedHTMLFile) => Promise<NoteWithParsedLines>;
}

export interface NoteWorkerDependencies {
  parseHTML: typeof parseHTML;
  createNote: typeof createNote;
  addStatusEventAndBroadcast: typeof addStatusEventAndBroadcast;
  ErrorHandler: typeof ErrorHandler;
  HealthMonitor: typeof HealthMonitor;
  ingredientQueue: Queue;
  instructionQueue: Queue;
  imageQueue: Queue;
  categorizationQueue: Queue;
  logger?: {
    log: (message: string) => void;
    error: (message: string, error?: Error) => void;
  };
}
