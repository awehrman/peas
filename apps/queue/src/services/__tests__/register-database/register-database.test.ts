import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  registerDatabase,
  DatabaseService,
  IDatabaseService,
} from "../../register-database";

// Mock the database package
vi.mock("@peas/database", () => ({
  createNote: vi.fn(),
}));

// Mock the prisma client
vi.mock("../../config/database", () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    note: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock the PatternTracker
vi.mock("../../workers/shared/pattern-tracker", () => ({
  PatternTracker: vi.fn().mockImplementation(() => ({
    trackPattern: vi.fn(),
  })),
}));

describe("registerDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Function Return", () => {
    it("should return a DatabaseService instance", () => {
      const result = registerDatabase();
      expect(result).toBeInstanceOf(DatabaseService);
    });

    it("should return an object that implements IDatabaseService", () => {
      const result = registerDatabase();
      const service: IDatabaseService = result;
      expect(service).toHaveProperty("prisma");
      expect(service).toHaveProperty("patternTracker");
      expect(service).toHaveProperty("createNote");
    });

    it("should return a new instance each time", () => {
      const instance1 = registerDatabase();
      const instance2 = registerDatabase();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Service Properties", () => {
    it("should have prisma property", () => {
      const result = registerDatabase();
      expect(result).toHaveProperty("prisma");
      expect(result.prisma).toBeDefined();
    });

    it("should have patternTracker property", () => {
      const result = registerDatabase();
      expect(result).toHaveProperty("patternTracker");
      expect(result.patternTracker).toBeDefined();
    });

    it("should have createNote method", () => {
      const result = registerDatabase();
      expect(result).toHaveProperty("createNote");
      expect(typeof result.createNote).toBe("function");
    });

    it("should have createNoteCompletionTracker method", () => {
      const result = registerDatabase();
      expect(result).toHaveProperty("createNoteCompletionTracker");
      expect(typeof result.createNoteCompletionTracker).toBe("function");
    });

    it("should have updateNoteCompletionTracker method", () => {
      const result = registerDatabase();
      expect(result).toHaveProperty("updateNoteCompletionTracker");
      expect(typeof result.updateNoteCompletionTracker).toBe("function");
    });

    it("should have incrementNoteCompletionTracker method", () => {
      const result = registerDatabase();
      expect(result).toHaveProperty("incrementNoteCompletionTracker");
      expect(typeof result.incrementNoteCompletionTracker).toBe("function");
    });

    it("should have checkNoteCompletion method", () => {
      const result = registerDatabase();
      expect(result).toHaveProperty("checkNoteCompletion");
      expect(typeof result.checkNoteCompletion).toBe("function");
    });

    it("should have getNoteTitle method", () => {
      const result = registerDatabase();
      expect(result).toHaveProperty("getNoteTitle");
      expect(typeof result.getNoteTitle).toBe("function");
    });
  });

  describe("Interface Compliance", () => {
    it("should implement IDatabaseService interface", () => {
      const result = registerDatabase();
      const service: IDatabaseService = result;

      expect(service).toBeDefined();
      expect(service).toHaveProperty("prisma");
      expect(service).toHaveProperty("patternTracker");
      expect(service).toHaveProperty("createNote");
      expect(service).toHaveProperty("createNoteCompletionTracker");
      expect(service).toHaveProperty("updateNoteCompletionTracker");
      expect(service).toHaveProperty("incrementNoteCompletionTracker");
      expect(service).toHaveProperty("checkNoteCompletion");
      expect(service).toHaveProperty("getNoteTitle");
    });

    it("should have correct property types", () => {
      const result = registerDatabase();

      expect(typeof result.prisma).toBe("object");
      expect(typeof result.patternTracker).toBe("object");
      expect(typeof result.createNote).toBe("function");
      expect(typeof result.createNoteCompletionTracker).toBe("function");
      expect(typeof result.updateNoteCompletionTracker).toBe("function");
      expect(typeof result.incrementNoteCompletionTracker).toBe("function");
      expect(typeof result.checkNoteCompletion).toBe("function");
      expect(typeof result.getNoteTitle).toBe("function");
    });
  });

  describe("Multiple Calls", () => {
    it("should create independent instances on multiple calls", () => {
      const instance1 = registerDatabase();
      const instance2 = registerDatabase();
      const instance3 = registerDatabase();

      expect(instance1).not.toBe(instance2);
      expect(instance2).not.toBe(instance3);
      expect(instance1).not.toBe(instance3);
    });

    it("should share prisma client across instances", () => {
      const instance1 = registerDatabase();
      const instance2 = registerDatabase();

      expect(instance1.prisma).toBe(instance2.prisma);
    });

    it("should have different pattern trackers for each instance", () => {
      const instance1 = registerDatabase();
      const instance2 = registerDatabase();

      expect(instance1.patternTracker).not.toBe(instance2.patternTracker);
    });
  });

  describe("Method Functionality", () => {
    it("should have working createNote method", async () => {
      const result = registerDatabase();
      const mockCreateNote = vi.fn().mockResolvedValue({ id: "test-note" });
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockImplementation(mockCreateNote);

      const createNoteFn = result.createNote;
      expect(createNoteFn).toBeDefined();

      const mockFile = {
        title: "Test Recipe",
        contents: "<html><body>Test</body></html>",
        ingredients: [],
        instructions: [],
      };

      const noteResult = await createNoteFn!(mockFile);

      expect(createNote).toHaveBeenCalledWith(mockFile);
      expect(noteResult).toEqual({ id: "test-note" });
    });

    it("should have working createNoteCompletionTracker method", async () => {
      const result = registerDatabase();
      const createTrackerFn = result.createNoteCompletionTracker;
      expect(createTrackerFn).toBeDefined();

      await expect(createTrackerFn!("test-note-id", 5)).resolves.not.toThrow();
    });

    it("should have working updateNoteCompletionTracker method", async () => {
      const result = registerDatabase();
      const updateTrackerFn = result.updateNoteCompletionTracker;
      expect(updateTrackerFn).toBeDefined();

      await expect(updateTrackerFn!("test-note-id", 3)).resolves.not.toThrow();
    });

    it("should have working incrementNoteCompletionTracker method", async () => {
      const result = registerDatabase();
      const incrementTrackerFn = result.incrementNoteCompletionTracker;
      expect(incrementTrackerFn).toBeDefined();

      await expect(incrementTrackerFn!("test-note-id")).resolves.not.toThrow();
    });

    it("should have working checkNoteCompletion method", async () => {
      const result = registerDatabase();
      const checkCompletionFn = result.checkNoteCompletion;
      expect(checkCompletionFn).toBeDefined();

      const completion = await checkCompletionFn!("test-note-id");

      expect(completion).toHaveProperty("isComplete");
      expect(completion).toHaveProperty("completedJobs");
      expect(completion).toHaveProperty("totalJobs");
    });

    it("should have working getNoteTitle method", async () => {
      const result = registerDatabase();
      const getTitleFn = result.getNoteTitle;
      expect(getTitleFn).toBeDefined();

      // Mock the prisma call
      const mockFindUnique = vi.fn().mockResolvedValue({
        title: "Test Recipe Title",
      });
      result.prisma.note.findUnique = mockFindUnique;

      const title = await getTitleFn!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBe("Test Recipe Title");
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in createNote gracefully", async () => {
      const result = registerDatabase();
      const mockError = new Error("Database error");
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockRejectedValue(mockError);

      const createNoteFn = result.createNote;
      expect(createNoteFn).toBeDefined();

      const mockFile = {
        title: "Test Recipe",
        contents: "<html><body>Test</body></html>",
        ingredients: [],
        instructions: [],
      };

      await expect(createNoteFn!(mockFile)).rejects.toThrow("Database error");
    });

    it("should handle errors in getNoteTitle gracefully", async () => {
      const result = registerDatabase();
      const getTitleFn = result.getNoteTitle;
      expect(getTitleFn).toBeDefined();

      // Mock the prisma call to throw an error
      const mockFindUnique = vi
        .fn()
        .mockRejectedValue(new Error("Database error"));
      result.prisma.note.findUnique = mockFindUnique;

      const title = await getTitleFn!("test-note-id");

      expect(title).toBeNull();
    });
  });
});
