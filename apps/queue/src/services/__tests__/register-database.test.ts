import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  registerDatabase,
  DatabaseService,
  IDatabaseService,
} from "../register-database";
import type { ParsedHTMLFile } from "@peas/database";

// Mock the database package
vi.mock("@peas/database", () => ({
  createNote: vi.fn(),
}));

// Mock the prisma client
vi.mock("../config/database", () => ({
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
    status: {
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

describe("DatabaseService", () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create a DatabaseService instance", () => {
      expect(databaseService).toBeInstanceOf(DatabaseService);
      expect(databaseService).toHaveProperty("prisma");
      expect(databaseService).toHaveProperty("createNote");
    });
  });

  describe("prisma property", () => {
    it("should return the prisma client", () => {
      const prisma = databaseService.prisma;
      expect(prisma).toBeDefined();
      expect(prisma).toHaveProperty("note");
      // Note: status might not be available in all prisma clients
      expect(typeof prisma).toBe("object");
    });
  });

  describe("createNote property", () => {
    it("should return a function", () => {
      const createNote = databaseService.createNote;
      expect(typeof createNote).toBe("function");
    });

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

    it("should handle errors from createNote", async () => {
      const mockError = new Error("Database error");
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

      await expect(createNoteFn(mockFile)).rejects.toThrow("Database error");
    });
  });

  describe("interface compliance", () => {
    it("should implement IDatabaseService interface", () => {
      const service: IDatabaseService = databaseService;
      expect(service).toHaveProperty("prisma");
      expect(service).toHaveProperty("createNote");
      expect(typeof service.createNote).toBe("function");
    });
  });
});

describe("registerDatabase", () => {
  it("should return a DatabaseService instance", () => {
    const result = registerDatabase();
    expect(result).toBeInstanceOf(DatabaseService);
  });

  it("should return an object that implements IDatabaseService", () => {
    const result = registerDatabase();
    const service: IDatabaseService = result;
    expect(service).toHaveProperty("prisma");
    expect(service).toHaveProperty("createNote");
  });

  it("should return a new instance each time", () => {
    const instance1 = registerDatabase();
    const instance2 = registerDatabase();
    expect(instance1).not.toBe(instance2);
  });
});
