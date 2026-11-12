import type { ParsedLineSegment, ParsedLineStatus } from "../parsed-line";
import type { NoteMention } from "../teach/mention-panel";

export const NOTE_STATUS_OPTIONS = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "DUPLICATE",
] as const;

export type NoteStatus = (typeof NOTE_STATUS_OPTIONS)[number];

export type LineReviewStatus = "UNREVIEWED" | "CORRECT" | "INCORRECT";

export interface NoteListItem {
  id: string;
  title: string | null;
  status: NoteStatus;
  duplicateConfidence: number | null;
  parsingErrorCount: number;
  ingredientLineCount: number;
  instructionLineCount: number;
  thumbnailUrl: string | null;
  notebook: string | null;
  recipeId: string | null;
  createdAt: string;
}

export interface NotesPageData {
  items: NoteListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotesFilters {
  status?: NoteStatus;
  query?: string;
}

export interface NoteIngredientLine {
  id: string;
  blockIndex: number;
  lineIndex: number;
  reference: string;
  parseStatus: ParsedLineStatus;
  reviewStatus: LineReviewStatus;
  isActive: boolean;
  parserVersion: string | null;
  segments: ParsedLineSegment[];
  /** v2 mentions, once the backfill has run. */
  mentions?: NoteMention[];
}

export interface NoteDetail {
  id: string;
  title: string | null;
  status: NoteStatus;
  createdAt: string;
  errorMessage: string | null;
  duplicateConfidence: number | null;
  parsingErrorCount: number;
  evernote: {
    source: string | null;
    notebook: string | null;
    tags: string[];
    originalCreatedAt: string | null;
  } | null;
  images: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    processingStatus: string;
  }[];
  sources: {
    id: string;
    urls: {
      id: string;
      url: string;
      isBrokenLink: boolean;
      siteName: string | null;
    }[];
    book: { title: string; author: string | null } | null;
  }[];
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  ingredientBlocks: { blockIndex: number; lines: NoteIngredientLine[] }[];
  instructions: {
    id: string;
    lineIndex: number;
    text: string;
    isActive: boolean;
  }[];
  recipeId: string | null;
}
