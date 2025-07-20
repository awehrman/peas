import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DatabaseService } from "../../register-database";

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

describe("DatabaseService getNoteTitle", () => {
  let databaseService: DatabaseService;
  let mockFindUnique: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    databaseService = new DatabaseService();
    mockFindUnique = vi.fn();
    databaseService.prisma.note.findUnique = mockFindUnique;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful Title Retrieval", () => {
    it("should return note title when note exists", async () => {
      const mockNote = { title: "Test Recipe Title" };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBe("Test Recipe Title");
    });

    it("should return null when note exists but has no title", async () => {
      const mockNote = { title: null };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });

    it("should return null when note exists but title is undefined", async () => {
      const mockNote = { title: undefined };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });

    it("should return null when note does not exist", async () => {
      mockFindUnique.mockResolvedValue(null);

      const title = await databaseService.getNoteTitle!("non-existent-note");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "non-existent-note" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });

    it("should return null when note is undefined", async () => {
      mockFindUnique.mockResolvedValue(undefined);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors", async () => {
      const mockError = new Error("Database connection failed");
      mockFindUnique.mockRejectedValue(mockError);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });

    it("should handle timeout errors", async () => {
      const mockError = new Error("Query timeout");
      mockFindUnique.mockRejectedValue(mockError);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });

    it("should handle validation errors", async () => {
      const mockError = new Error("Invalid note ID format");
      mockFindUnique.mockRejectedValue(mockError);

      const title = await databaseService.getNoteTitle!("invalid-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "invalid-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });

    it("should handle network errors", async () => {
      const mockError = new Error("Network error");
      mockFindUnique.mockRejectedValue(mockError);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });

    it("should handle unexpected errors", async () => {
      const mockError = new Error("Unexpected error occurred");
      mockFindUnique.mockRejectedValue(mockError);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });

    it("should handle non-Error exceptions", async () => {
      const mockError = "String error";
      mockFindUnique.mockRejectedValue(mockError);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });
  });

  describe("Input Validation", () => {
    it("should handle empty string note ID", async () => {
      const mockNote = { title: "Test Title" };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!("");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "" },
        select: { title: true },
      });
      expect(title).toBe("Test Title");
    });

    it("should handle very long note ID", async () => {
      const longId = "a".repeat(1000);
      const mockNote = { title: "Test Title" };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!(longId);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: longId },
        select: { title: true },
      });
      expect(title).toBe("Test Title");
    });

    it("should handle special characters in note ID", async () => {
      const specialId = "note-id-with-special-chars-!@#$%^&*()";
      const mockNote = { title: "Test Title" };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!(specialId);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: specialId },
        select: { title: true },
      });
      expect(title).toBe("Test Title");
    });
  });

  describe("Multiple Calls", () => {
    it("should handle multiple calls to the same note ID", async () => {
      const mockNote = { title: "Test Title" };
      mockFindUnique.mockResolvedValue(mockNote);

      const title1 = await databaseService.getNoteTitle!("test-note-id");
      const title2 = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledTimes(2);
      expect(title1).toBe("Test Title");
      expect(title2).toBe("Test Title");
    });

    it("should handle calls to different note IDs", async () => {
      const mockNote1 = { title: "First Title" };
      const mockNote2 = { title: "Second Title" };
      mockFindUnique
        .mockResolvedValueOnce(mockNote1)
        .mockResolvedValueOnce(mockNote2);

      const title1 = await databaseService.getNoteTitle!("note-1");
      const title2 = await databaseService.getNoteTitle!("note-2");

      expect(mockFindUnique).toHaveBeenCalledTimes(2);
      expect(mockFindUnique).toHaveBeenNthCalledWith(1, {
        where: { id: "note-1" },
        select: { title: true },
      });
      expect(mockFindUnique).toHaveBeenNthCalledWith(2, {
        where: { id: "note-2" },
        select: { title: true },
      });
      expect(title1).toBe("First Title");
      expect(title2).toBe("Second Title");
    });

    it("should handle mixed success and error scenarios", async () => {
      const mockNote = { title: "Success Title" };
      const mockError = new Error("Database error");
      mockFindUnique
        .mockResolvedValueOnce(mockNote)
        .mockRejectedValueOnce(mockError);

      const title1 = await databaseService.getNoteTitle!("success-note");
      const title2 = await databaseService.getNoteTitle!("error-note");

      expect(mockFindUnique).toHaveBeenCalledTimes(2);
      expect(title1).toBe("Success Title");
      expect(title2).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle note with empty string title", async () => {
      const mockNote = { title: "" };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBeNull();
    });

    it("should handle note with very long title", async () => {
      const longTitle = "A".repeat(10000);
      const mockNote = { title: longTitle };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBe(longTitle);
    });

    it("should handle note with special characters in title", async () => {
      const specialTitle =
        "Recipe with special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?";
      const mockNote = { title: specialTitle };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBe(specialTitle);
    });

    it("should handle note with unicode characters in title", async () => {
      const unicodeTitle = "Recipe with unicode: 🍕🍔🌮 中文 Español Français";
      const mockNote = { title: unicodeTitle };
      mockFindUnique.mockResolvedValue(mockNote);

      const title = await databaseService.getNoteTitle!("test-note-id");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "test-note-id" },
        select: { title: true },
      });
      expect(title).toBe(unicodeTitle);
    });
  });

  describe("Method Properties", () => {
    it("should have getNoteTitle as a getter method", () => {
      expect(typeof databaseService.getNoteTitle).toBe("function");
      expect(databaseService.getNoteTitle).toBeDefined();
    });

    it("should return a function when accessed", () => {
      const getTitleFn = databaseService.getNoteTitle;
      expect(typeof getTitleFn).toBe("function");
    });

    it("should be callable with note ID parameter", async () => {
      const mockNote = { title: "Test Title" };
      mockFindUnique.mockResolvedValue(mockNote);

      const getTitleFn = databaseService.getNoteTitle;
      const title = await getTitleFn("test-note-id");

      expect(title).toBe("Test Title");
    });
  });
});
