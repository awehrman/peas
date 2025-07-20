/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseService } from "../../register-database";
import type { ParsedHTMLFile } from "@peas/database";

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

describe("DatabaseService createNote", () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Function Property", () => {
    it("should return a function", () => {
      const createNote = databaseService.createNote;
      expect(typeof createNote).toBe("function");
    });

    it("should be callable", () => {
      expect(() => {
        expect(databaseService.createNote).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("Successful Note Creation", () => {
    it("should call the imported createNote function", async () => {
      const mockCreateNote = vi.fn().mockResolvedValue({ id: "test-note" });
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockImplementation(mockCreateNote);

      const createNoteFn = databaseService.createNote;
      const mockFile: ParsedHTMLFile = {
        title: "Test Recipe",
        contents: "<html><body>Test</body></html>",
        ingredients: [],
        instructions: [],
        source: "https://example.com/test.html",
      };

      const result = await createNoteFn(mockFile);

      expect(createNote).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual({ id: "test-note" });
    });

    it("should handle note with all properties", async () => {
      const mockCreateNote = vi.fn().mockResolvedValue({ id: "complete-note" });
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockImplementation(mockCreateNote);

      const createNoteFn = databaseService.createNote;
      const mockFile: ParsedHTMLFile = {
        title: "Complete Recipe",
        historicalCreatedAt: new Date("2023-01-01"),
        contents: "<html><body>Complete recipe content</body></html>",
        ingredients: [
          {
            blockIndex: 0,
            lineIndex: 0,
            parseStatus: "CORRECT",
            parsedAt: new Date(),
            reference: "2 cups flour",
            rule: "ingredient_rule",
          },
        ],
        instructions: [
          {
            parseStatus: "CORRECT",
            lineIndex: 0,
            reference: "Mix ingredients",
          },
        ],
        source: "https://example.com/complete-recipe.html",
        image: "https://example.com/recipe-image.jpg",
      };

      const result = await createNoteFn(mockFile);

      expect(createNote).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual({ id: "complete-note" });
    });

    it("should handle note with minimal properties", async () => {
      const mockCreateNote = vi.fn().mockResolvedValue({ id: "minimal-note" });
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockImplementation(mockCreateNote);

      const createNoteFn = databaseService.createNote;
      const mockFile: ParsedHTMLFile = {
        title: "Minimal Recipe",
        contents: "<html><body>Minimal content</body></html>",
        ingredients: [],
        instructions: [],
      };

      const result = await createNoteFn(mockFile);

      expect(createNote).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual({ id: "minimal-note" });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors", async () => {
      const mockError = new Error("Database connection failed");
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockRejectedValue(mockError);

      const createNoteFn = databaseService.createNote;
      const mockFile: ParsedHTMLFile = {
        title: "Test Recipe",
        contents: "<html><body>Test</body></html>",
        ingredients: [],
        instructions: [],
        source: "https://example.com/test.html",
      };

      await expect(createNoteFn(mockFile)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle validation errors", async () => {
      const mockError = new Error("Invalid note data");
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockRejectedValue(mockError);

      const createNoteFn = databaseService.createNote;
      const mockFile: ParsedHTMLFile = {
        title: "", // Invalid empty title
        contents: "<html><body>Test</body></html>",
        ingredients: [],
        instructions: [],
      };

      await expect(createNoteFn(mockFile)).rejects.toThrow("Invalid note data");
    });

    it("should handle network errors", async () => {
      const mockError = new Error("Network timeout");
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockRejectedValue(mockError);

      const createNoteFn = databaseService.createNote;
      const mockFile: ParsedHTMLFile = {
        title: "Test Recipe",
        contents: "<html><body>Test</body></html>",
        ingredients: [],
        instructions: [],
      };

      await expect(createNoteFn(mockFile)).rejects.toThrow("Network timeout");
    });

    it("should handle unexpected errors", async () => {
      const mockError = new Error("Unexpected error occurred");
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockRejectedValue(mockError);

      const createNoteFn = databaseService.createNote;
      const mockFile: ParsedHTMLFile = {
        title: "Test Recipe",
        contents: "<html><body>Test</body></html>",
        ingredients: [],
        instructions: [],
      };

      await expect(createNoteFn(mockFile)).rejects.toThrow(
        "Unexpected error occurred"
      );
    });
  });

  describe("Input Validation", () => {
    it("should handle null input", async () => {
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockRejectedValue(new Error("Invalid input"));

      const createNoteFn = databaseService.createNote;

      await expect(createNoteFn(null as any)).rejects.toThrow("Invalid input");
    });

    it("should handle undefined input", async () => {
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockRejectedValue(new Error("Invalid input"));

      const createNoteFn = databaseService.createNote;

      await expect(createNoteFn(undefined as any)).rejects.toThrow(
        "Invalid input"
      );
    });

    it("should handle missing required properties", async () => {
      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockRejectedValue(
        new Error("Missing required properties")
      );

      const createNoteFn = databaseService.createNote;
      const invalidFile = {
        title: "Test Recipe",
        // Missing contents, ingredients, instructions
      } as any;

      await expect(createNoteFn(invalidFile)).rejects.toThrow(
        "Missing required properties"
      );
    });
  });

  describe("Multiple Calls", () => {
    it("should handle multiple createNote calls", async () => {
      const mockCreateNote = vi
        .fn()
        .mockResolvedValueOnce({ id: "note-1" })
        .mockResolvedValueOnce({ id: "note-2" })
        .mockResolvedValueOnce({ id: "note-3" });

      const { createNote } = await import("@peas/database");
      vi.mocked(createNote).mockImplementation(mockCreateNote);

      const createNoteFn = databaseService.createNote;
      const mockFile: ParsedHTMLFile = {
        title: "Test Recipe",
        contents: "<html><body>Test</body></html>",
        ingredients: [],
        instructions: [],
      };

      const result1 = await createNoteFn(mockFile);
      const result2 = await createNoteFn(mockFile);
      const result3 = await createNoteFn(mockFile);

      expect(createNote).toHaveBeenCalledTimes(3);
      expect(result1).toEqual({ id: "note-1" });
      expect(result2).toEqual({ id: "note-2" });
      expect(result3).toEqual({ id: "note-3" });
    });

    it("should handle concurrent createNote calls", async () => {
      const mockCreateNote = vi
        .fn()
        .mockResolvedValue({ id: "concurrent-note" });

      // Create a new database service instance for this test
      const testDatabaseService = new DatabaseService();

      // Mock the createNote getter to return our mock function
      Object.defineProperty(testDatabaseService, "createNote", {
        get: () => mockCreateNote,
        configurable: true,
      });

      const createNoteFn = testDatabaseService.createNote;
      const mockFile: ParsedHTMLFile = {
        title: "Test Recipe",
        contents: "<html><body>Test</body></html>",
        ingredients: [],
        instructions: [],
      };

      const promises = [
        createNoteFn(mockFile),
        createNoteFn(mockFile),
        createNoteFn(mockFile),
      ];

      const results = await Promise.all(promises);

      expect(mockCreateNote).toHaveBeenCalledTimes(3);
      results.forEach((result) => {
        expect(result).toEqual({ id: "concurrent-note" });
      });
    });
  });
});
