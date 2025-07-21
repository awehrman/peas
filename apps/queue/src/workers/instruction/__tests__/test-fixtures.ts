import { PrismaClient } from "@peas/database";
import { vi } from "vitest";

import type { IDatabaseService } from "../../../services/register-database";
import { PatternTracker } from "../../shared/pattern-tracker";
import type { InstructionJobData } from "../types";

export const baseData: InstructionJobData = {
  instructionLineId: "id",
  originalText: "text",
  lineIndex: 0,
  noteId: "note",
};

export const mockDatabaseService: IDatabaseService & {
  updateInstructionLine: ReturnType<typeof vi.fn>;
  createInstructionSteps: ReturnType<typeof vi.fn>;
} = {
  prisma: new PrismaClient(),
  patternTracker: new PatternTracker({} as PrismaClient),
  createNote: vi.fn(),
  createNoteCompletionTracker: vi.fn(),
  updateNoteCompletionTracker: vi.fn(),
  incrementNoteCompletionTracker: vi.fn(),
  checkNoteCompletion: vi.fn(),
  getNoteTitle: vi.fn(),
  updateInstructionLine: vi.fn(),
  createInstructionSteps: vi.fn(),
};
