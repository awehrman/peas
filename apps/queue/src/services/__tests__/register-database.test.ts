import type { ParsedHTMLFile } from "@peas/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestError,
  testDatabaseInterface,
} from "../../test-utils/service";
import { DatabaseService, registerDatabase } from "../register-database";

// Mock dependencies
vi.mock("@peas/database", () => ({
  createNote: vi.fn(),
}));

vi.mock("../../config/database", () => ({
  prisma: {
    note: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../utils/standardized-logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("../../workers/shared/pattern-tracker", () => ({
  PatternTracker: vi.fn().mockImplementation(() => ({
    generatePatternCode: vi.fn(),
    trackPattern: vi.fn(),
    getPatterns: vi.fn(),
  })),
}));

// Helper to set prisma.note.findUnique for tests
function setPrismaFindUnique(
  service: DatabaseService,
  fn: (args: unknown) => unknown
) {
  (service.prisma as { note: { findUnique: typeof fn } }).note.findUnique = fn;
}

describe("register-database.ts", () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    vi.clearAllMocks();
    DatabaseService.clearJobCompletionTracker();
    databaseService = new DatabaseService();
  });

  afterEach(() => {
    vi.clearAllMocks();
    DatabaseService.clearJobCompletionTracker();
  });

  describe("DatabaseService", () => {
    describe("constructor", () => {
      it("should create a DatabaseService instance with required properties", () => {
        const service = new DatabaseService();

        expect(service).toBeInstanceOf(DatabaseService);
        expect(service).toHaveProperty("prisma");
        expect(service).toHaveProperty("patternTracker");
        expect(service).toHaveProperty("createNote");
        expect(service).toHaveProperty("createNoteCompletionTracker");
        expect(service).toHaveProperty("updateNoteCompletionTracker");
        expect(service).toHaveProperty("incrementNoteCompletionTracker");
        expect(service).toHaveProperty("checkNoteCompletion");
        expect(service).toHaveProperty("getNoteTitle");
        expect(service).toHaveProperty("updateInstructionLine");
        expect(service).toHaveProperty("createInstructionSteps");
      });

      it("should implement IDatabaseService interface", () => {
        const service = new DatabaseService();
        expect(() => testDatabaseInterface(service)).not.toThrow();
      });
    });

    describe("createNote", () => {
      it("should create a note using the database package", async () => {
        const mockCreateNote = vi.fn().mockResolvedValue({ id: "test-note" });
        const mockImport = vi.mocked(await import("@peas/database"));
        mockImport.createNote = mockCreateNote;

        const mockFile = {
          title: "Test Recipe",
          content: "Test content",
          contents: "Test content",
          ingredients: [],
          instructions: [],
          metadata: {},
          sourceUrl: "https://example.com",
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as ParsedHTMLFile;

        const result = await databaseService.createNote!(mockFile);

        expect(mockCreateNote).toHaveBeenCalledWith(mockFile);
        expect(result).toEqual({ id: "test-note" });
      });
    });

    describe("createNoteCompletionTracker", () => {
      it("should create a completion tracker for a note", async () => {
        const noteId = "test-note";
        const totalJobs = 5;

        const result = await databaseService.createNoteCompletionTracker!(
          noteId,
          totalJobs
        );

        expect(result).toEqual({});
      });

      it("should handle multiple trackers for different notes", async () => {
        const noteId1 = "test-note-1";
        const noteId2 = "test-note-2";
        const totalJobs = 3;

        await databaseService.createNoteCompletionTracker!(noteId1, totalJobs);
        await databaseService.createNoteCompletionTracker!(noteId2, totalJobs);

        const result1 = await databaseService.checkNoteCompletion!(noteId1);
        const result2 = await databaseService.checkNoteCompletion!(noteId2);

        expect(result1.totalJobs).toBe(3);
        expect(result1.completedJobs).toBe(0);
        expect(result1.isComplete).toBe(false);
        expect(result2.totalJobs).toBe(3);
        expect(result2.completedJobs).toBe(0);
        expect(result2.isComplete).toBe(false);
      });
    });

    describe("updateNoteCompletionTracker", () => {
      it("should update completion tracker with completed jobs", async () => {
        const noteId = "test-note";
        const totalJobs = 5;
        const completedJobs = 3;

        await databaseService.createNoteCompletionTracker!(noteId, totalJobs);
        const result = await databaseService.updateNoteCompletionTracker!(
          noteId,
          completedJobs
        );

        expect(result).toEqual({});

        const status = await databaseService.checkNoteCompletion!(noteId);
        expect(status.completedJobs).toBe(3);
        expect(status.totalJobs).toBe(5);
        expect(status.isComplete).toBe(false);
      });

      it("should mark note as complete when all jobs are done", async () => {
        const noteId = "test-note";
        const totalJobs = 3;
        const completedJobs = 3;

        await databaseService.createNoteCompletionTracker!(noteId, totalJobs);
        await databaseService.updateNoteCompletionTracker!(
          noteId,
          completedJobs
        );

        const status = await databaseService.checkNoteCompletion!(noteId);
        expect(status.completedJobs).toBe(3);
        expect(status.totalJobs).toBe(3);
        expect(status.isComplete).toBe(true);
      });

      it("should create fallback tracker when no tracker exists", async () => {
        const noteId = "test-note";
        const completedJobs = 2;

        const result = await databaseService.updateNoteCompletionTracker!(
          noteId,
          completedJobs
        );

        expect(result).toEqual({});

        const status = await databaseService.checkNoteCompletion!(noteId);
        expect(status.completedJobs).toBe(2);
        expect(status.totalJobs).toBe(2);
        expect(status.isComplete).toBe(true);
      });
    });

    describe("incrementNoteCompletionTracker", () => {
      it("should increment completion tracker by 1", async () => {
        const noteId = "test-note";
        const totalJobs = 3;

        await databaseService.createNoteCompletionTracker!(noteId, totalJobs);
        const result =
          await databaseService.incrementNoteCompletionTracker!(noteId);

        expect(result).toEqual({});

        const status = await databaseService.checkNoteCompletion!(noteId);
        expect(status.completedJobs).toBe(1);
        expect(status.totalJobs).toBe(3);
        expect(status.isComplete).toBe(false);
      });

      it("should not increment beyond total jobs", async () => {
        const noteId = "test-note";
        const totalJobs = 2;

        await databaseService.createNoteCompletionTracker!(noteId, totalJobs);
        await databaseService.incrementNoteCompletionTracker!(noteId);
        await databaseService.incrementNoteCompletionTracker!(noteId);
        await databaseService.incrementNoteCompletionTracker!(noteId); // Should not increment

        const status = await databaseService.checkNoteCompletion!(noteId);
        expect(status.completedJobs).toBe(2);
        expect(status.totalJobs).toBe(2);
        expect(status.isComplete).toBe(true);
      });

      it("should create fallback tracker when no tracker exists", async () => {
        const noteId = "test-note";

        const result =
          await databaseService.incrementNoteCompletionTracker!(noteId);

        expect(result).toEqual({});

        const status = await databaseService.checkNoteCompletion!(noteId);
        expect(status.completedJobs).toBe(1);
        expect(status.totalJobs).toBe(1);
        expect(status.isComplete).toBe(true);
      });
    });

    describe("checkNoteCompletion", () => {
      it("should return completion status for existing tracker", async () => {
        const noteId = "test-note";
        const totalJobs = 4;

        await databaseService.createNoteCompletionTracker!(noteId, totalJobs);
        await databaseService.incrementNoteCompletionTracker!(noteId);
        await databaseService.incrementNoteCompletionTracker!(noteId);

        const status = await databaseService.checkNoteCompletion!(noteId);

        expect(status.completedJobs).toBe(2);
        expect(status.totalJobs).toBe(4);
        expect(status.isComplete).toBe(false);
      });

      it("should return complete status when no tracker exists", async () => {
        const noteId = "test-note";

        const status = await databaseService.checkNoteCompletion!(noteId);

        expect(status.isComplete).toBe(true);
        expect(status.completedJobs).toBe(0);
        expect(status.totalJobs).toBe(0);
      });
    });

    describe("getNoteTitle", () => {
      it("should return note title from database", async () => {
        const noteId = "test-note";
        // Mock the prisma client directly
        const mockFindUnique = vi.fn().mockResolvedValue({
          title: "Test Recipe Title",
        });
        setPrismaFindUnique(databaseService, mockFindUnique);

        const title = await databaseService.getNoteTitle!(noteId);

        expect(mockFindUnique).toHaveBeenCalledWith({
          where: { id: noteId },
          select: { title: true },
        });
        expect(title).toBe("Test Recipe Title");
      });

      it("should return null when note is not found", async () => {
        const noteId = "test-note";
        const mockFindUnique = vi.fn().mockResolvedValue(null);
        setPrismaFindUnique(databaseService, mockFindUnique);

        const title = await databaseService.getNoteTitle!(noteId);

        expect(title).toBeNull();
      });

      it("should return null when note has no title", async () => {
        const noteId = "test-note";
        const mockFindUnique = vi.fn().mockResolvedValue({
          title: null,
        });
        setPrismaFindUnique(databaseService, mockFindUnique);

        const title = await databaseService.getNoteTitle!(noteId);

        expect(title).toBeNull();
      });

      it("should handle database errors gracefully", async () => {
        const noteId = "test-note";
        const mockFindUnique = vi
          .fn()
          .mockRejectedValue(createTestError("Database error"));
        setPrismaFindUnique(databaseService, mockFindUnique);

        const title = await databaseService.getNoteTitle!(noteId);

        expect(title).toBeNull();
      });
    });

    describe("updateInstructionLine", () => {
      it("should simulate updating an instruction line", async () => {
        const id = "test-instruction";
        const data = { content: "Updated instruction", step: 1 };

        const result = await databaseService.updateInstructionLine!(id, data);

        expect(result).toEqual({ id, content: "Updated instruction", step: 1 });
      });
    });

    describe("createInstructionSteps", () => {
      it("should simulate creating instruction steps", async () => {
        const steps = [
          { content: "Step 1", order: 1 },
          { content: "Step 2", order: 2 },
        ];

        const result = await databaseService.createInstructionSteps!(steps);

        expect(result).toEqual({ steps });
      });
    });
  });

  describe("registerDatabase", () => {
    it("should return a new DatabaseService instance", () => {
      const service = registerDatabase();

      expect(service).toBeInstanceOf(DatabaseService);
      expect(service).toHaveProperty("prisma");
      expect(service).toHaveProperty("patternTracker");
    });

    it("should implement IDatabaseService interface", () => {
      const service = registerDatabase();
      expect(() => testDatabaseInterface(service)).not.toThrow();
    });
  });
});
