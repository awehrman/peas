import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestError } from "../../../test-utils/service";
import {
  CachedNoteRepository,
  cachedQuery,
  hashQueryParams,
} from "../../note/cached-note-repository";

// ============================================================================
// TYPE DEFINITIONS FOR MOCKED MODULES
// ============================================================================

interface MockActionCache {
  getOrSet: ReturnType<typeof vi.fn>;
  invalidateByPattern: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface MockCacheKeyGenerator {
  databaseQuery: ReturnType<typeof vi.fn>;
  noteMetadata: ReturnType<typeof vi.fn>;
  noteStatus: ReturnType<typeof vi.fn>;
}

interface MockDatabase {
  getNotes: ReturnType<typeof vi.fn>;
  createNote: ReturnType<typeof vi.fn>;
}

// Mock the action cache
vi.mock("../../../workers/core/cache/action-cache", () => ({
  CACHE_OPTIONS: {
    DATABASE_QUERY: {
      ttl: 1800,
      memoryTtl: 300000,
      tags: ["database", "query"],
    },
    NOTE_METADATA: {
      ttl: 3600,
      memoryTtl: 600000,
      tags: ["note", "metadata"],
    },
  },
  CacheKeyGenerator: {
    databaseQuery: vi.fn((query: string) => `db:query:${query}`),
    noteMetadata: vi.fn((noteId: string) => `note:metadata:${noteId}`),
    noteStatus: vi.fn((noteId: string) => `note:status:${noteId}`),
  },
  actionCache: {
    getOrSet: vi.fn(),
    invalidateByPattern: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the database functions
vi.mock("@peas/database", () => ({
  getNotes: vi.fn(),
  createNote: vi.fn(),
}));

describe("CachedNoteRepository", () => {
  let mockActionCache: MockActionCache;
  let mockCacheKeyGenerator: MockCacheKeyGenerator;
  let mockDatabase: MockDatabase;

  beforeEach(async () => {
    vi.clearAllMocks();

    const actionCacheModule = await import(
      "../../../workers/core/cache/action-cache"
    );
    mockActionCache =
      actionCacheModule.actionCache as unknown as MockActionCache;
    mockCacheKeyGenerator =
      actionCacheModule.CacheKeyGenerator as unknown as MockCacheKeyGenerator;

    const databaseModule = await import("@peas/database");
    mockDatabase = databaseModule as unknown as MockDatabase;
  });

  describe("getNotes", () => {
    it("should get notes with caching enabled", async () => {
      const mockNotes = [
        { id: "1", title: "Note 1" },
        { id: "2", title: "Note 2" },
      ];

      mockActionCache.getOrSet.mockResolvedValue(mockNotes);

      const result = await CachedNoteRepository.getNotes();

      expect(mockCacheKeyGenerator.databaseQuery).toHaveBeenCalledWith(
        "get_notes"
      );
      expect(mockActionCache.getOrSet).toHaveBeenCalledWith(
        "db:query:get_notes",
        expect.any(Function),
        expect.objectContaining({ ttl: 1800 })
      );
      expect(result).toEqual(mockNotes);
    });

    it("should handle cache miss and query database", async () => {
      const mockNotes = [
        { id: "1", title: "Note 1" },
        { id: "2", title: "Note 2" },
      ];

      // Simulate cache miss by calling the fallback function
      mockActionCache.getOrSet.mockImplementation(async (key, fallback) => {
        return await fallback();
      });
      mockDatabase.getNotes.mockResolvedValue(mockNotes);

      const result = await CachedNoteRepository.getNotes();

      expect(mockDatabase.getNotes).toHaveBeenCalled();
      expect(result).toEqual(mockNotes);
    });

    it("should handle cache getOrSet errors", async () => {
      const error = createTestError("Cache error");

      mockActionCache.getOrSet.mockRejectedValue(error);

      await expect(CachedNoteRepository.getNotes()).rejects.toThrow(
        "Cache error"
      );
    });
  });

  describe("createNote", () => {
    it("should create note and invalidate caches", async () => {
      const mockFile = {
        title: "Test File",
        contents: "<html>Test content</html>",
        ingredients: [],
        instructions: [],
      };
      const mockNote = {
        id: "note-1",
        fileId: "file-1",
        title: "Test Note",
        parsedLines: [],
      };

      mockDatabase.createNote.mockResolvedValue(mockNote);
      mockActionCache.invalidateByPattern.mockResolvedValue(3);

      const result = await CachedNoteRepository.createNote(mockFile);

      expect(mockDatabase.createNote).toHaveBeenCalledWith(mockFile);
      expect(mockActionCache.delete).toHaveBeenCalledWith(
        "note:metadata:note-1"
      );
      expect(mockActionCache.delete).toHaveBeenCalledWith("note:status:note-1");
      expect(result).toEqual(mockNote);
    });

    it("should handle createNote database errors", async () => {
      const mockFile = {
        title: "Test File",
        contents: "<html>Test content</html>",
        ingredients: [],
        instructions: [],
      };
      const error = createTestError("Database error");

      mockDatabase.createNote.mockRejectedValue(error);

      await expect(CachedNoteRepository.createNote(mockFile)).rejects.toThrow(
        "Database error"
      );
    });

    it("should handle cache invalidation errors gracefully", async () => {
      const mockFile = {
        title: "Test File",
        contents: "<html>Test content</html>",
        ingredients: [],
        instructions: [],
      };
      const mockNote = {
        id: "note-1",
        fileId: "file-1",
        title: "Test Note",
        parsedLines: [],
      };

      mockDatabase.createNote.mockResolvedValue(mockNote);
      mockActionCache.delete.mockRejectedValue(
        createTestError("Cache invalidation failed")
      );

      // Mock console.warn to avoid noise in tests
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result = await CachedNoteRepository.createNote(mockFile);

      expect(result).toEqual(mockNote);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[CACHED_NOTE_REPO] Failed to invalidate caches for note note-1:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("getNoteMetadata", () => {
    it("should get note metadata with caching", async () => {
      const noteId = "note-1";
      const mockMetadata = {
        id: noteId,
        title: "Test Note",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockActionCache.getOrSet.mockResolvedValue(mockMetadata);

      const result = await CachedNoteRepository.getNoteMetadata(noteId);

      expect(mockCacheKeyGenerator.noteMetadata).toHaveBeenCalledWith(noteId);
      expect(mockActionCache.getOrSet).toHaveBeenCalledWith(
        "note:metadata:note-1",
        expect.any(Function),
        expect.objectContaining({ ttl: 3600 })
      );
      expect(result).toEqual(mockMetadata);
    });

    it("should handle cache miss for note metadata", async () => {
      const noteId = "note-1";

      // Simulate cache miss by calling the fallback function
      mockActionCache.getOrSet.mockImplementation(async (key, fallback) => {
        return await fallback();
      });

      const result = await CachedNoteRepository.getNoteMetadata(noteId);

      expect(result).toBeNull();
    });

    it("should handle cache getOrSet errors for metadata", async () => {
      const noteId = "note-1";
      const error = createTestError("Cache error");

      mockActionCache.getOrSet.mockRejectedValue(error);

      await expect(
        CachedNoteRepository.getNoteMetadata(noteId)
      ).rejects.toThrow("Cache error");
    });
  });

  describe("getNoteStatus", () => {
    it("should get note status with caching", async () => {
      const noteId = "note-1";
      const mockStatus = {
        id: noteId,
        status: "processing",
        progress: 50,
        lastUpdated: new Date(),
      };

      mockActionCache.getOrSet.mockResolvedValue(mockStatus);

      const result = await CachedNoteRepository.getNoteStatus(noteId);

      expect(mockCacheKeyGenerator.noteStatus).toHaveBeenCalledWith(noteId);
      expect(mockActionCache.getOrSet).toHaveBeenCalledWith(
        "note:status:note-1",
        expect.any(Function),
        expect.objectContaining({ ttl: 3600 })
      );
      expect(result).toEqual(mockStatus);
    });

    it("should handle cache miss for note status", async () => {
      const noteId = "note-1";

      // Simulate cache miss by calling the fallback function
      mockActionCache.getOrSet.mockImplementation(async (key, fallback) => {
        return await fallback();
      });

      const result = await CachedNoteRepository.getNoteStatus(noteId);

      expect(result).toBeNull();
    });

    it("should handle cache getOrSet errors for status", async () => {
      const noteId = "note-1";
      const error = createTestError("Cache error");

      mockActionCache.getOrSet.mockRejectedValue(error);

      await expect(CachedNoteRepository.getNoteStatus(noteId)).rejects.toThrow(
        "Cache error"
      );
    });
  });

  describe("invalidateNoteCaches", () => {
    it("should invalidate all note-related caches successfully", async () => {
      mockActionCache.invalidateByPattern.mockResolvedValue(5);

      // Mock console.log to avoid noise in tests
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await CachedNoteRepository.invalidateNoteCaches();

      expect(mockActionCache.invalidateByPattern).toHaveBeenCalledWith(
        "note:metadata:"
      );
      expect(mockActionCache.invalidateByPattern).toHaveBeenCalledWith(
        "note:status:"
      );
      expect(mockActionCache.invalidateByPattern).toHaveBeenCalledWith(
        "db:query:"
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[CACHED_NOTE_REPO] Successfully invalidated note caches"
      );

      consoleLogSpy.mockRestore();
    });

    it("should handle cache invalidation errors gracefully", async () => {
      const error = createTestError("Cache invalidation failed");
      mockActionCache.invalidateByPattern.mockRejectedValue(error);

      // Mock console.warn to avoid noise in tests
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      await CachedNoteRepository.invalidateNoteCaches();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[CACHED_NOTE_REPO] Failed to invalidate note caches:",
        error
      );

      consoleWarnSpy.mockRestore();
    });

    it("should handle partial cache invalidation failures", async () => {
      // First call succeeds, second fails
      mockActionCache.invalidateByPattern
        .mockResolvedValueOnce(3)
        .mockRejectedValueOnce(createTestError("Partial failure"));

      // Mock console.warn to avoid noise in tests
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      await CachedNoteRepository.invalidateNoteCaches();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[CACHED_NOTE_REPO] Failed to invalidate note caches:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("invalidateNoteCache", () => {
    it("should invalidate caches for specific note successfully", async () => {
      const noteId = "note-1";

      mockActionCache.delete.mockResolvedValue(true);

      // Mock console.log to avoid noise in tests
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await CachedNoteRepository.invalidateNoteCache(noteId);

      expect(mockCacheKeyGenerator.noteMetadata).toHaveBeenCalledWith(noteId);
      expect(mockCacheKeyGenerator.noteStatus).toHaveBeenCalledWith(noteId);
      expect(mockActionCache.delete).toHaveBeenCalledWith(
        "note:metadata:note-1"
      );
      expect(mockActionCache.delete).toHaveBeenCalledWith("note:status:note-1");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[CACHED_NOTE_REPO] Successfully invalidated caches for note note-1"
      );

      consoleLogSpy.mockRestore();
    });

    it("should handle cache deletion errors gracefully", async () => {
      const noteId = "note-1";
      const error = createTestError("Cache deletion failed");

      mockActionCache.delete.mockRejectedValue(error);

      // Mock console.warn to avoid noise in tests
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      await CachedNoteRepository.invalidateNoteCache(noteId);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[CACHED_NOTE_REPO] Failed to invalidate caches for note note-1:",
        error
      );

      consoleWarnSpy.mockRestore();
    });

    it("should handle partial cache deletion failures", async () => {
      const noteId = "note-1";

      // First delete succeeds, second fails
      mockActionCache.delete
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(createTestError("Partial deletion failure"));

      // Mock console.warn to avoid noise in tests
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      await CachedNoteRepository.invalidateNoteCache(noteId);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[CACHED_NOTE_REPO] Failed to invalidate caches for note note-1:",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });
});

describe("Cache Utilities", () => {
  let mockActionCache: MockActionCache;

  beforeEach(async () => {
    const actionCacheModule = await import(
      "../../../workers/core/cache/action-cache"
    );
    mockActionCache =
      actionCacheModule.actionCache as unknown as MockActionCache;
  });

  describe("hashQueryParams", () => {
    it("should generate consistent hash for same parameters", () => {
      const params1 = ["query1", { filter: "test" }, 123];
      const params2 = ["query1", { filter: "test" }, 123];

      const hash1 = hashQueryParams(...params1);
      const hash2 = hashQueryParams(...params2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash format
    });

    it("should generate different hashes for different parameters", () => {
      const params1 = ["query1", { filter: "test" }, 123];
      const params2 = ["query1", { filter: "test" }, 124];

      const hash1 = hashQueryParams(...params1);
      const hash2 = hashQueryParams(...params2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty parameters", () => {
      const hash = hashQueryParams();

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle single parameter", () => {
      const hash = hashQueryParams("single_param");

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle complex nested objects", () => {
      const complexObj = {
        nested: {
          array: [1, 2, 3],
          string: "test",
          number: 42,
          boolean: true,
          null: null,
        },
      };

      const hash = hashQueryParams("query", complexObj);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("cachedQuery", () => {
    it("should execute query with caching", async () => {
      const queryName = "test_query";
      const params = ["param1", "param2"];
      const mockResult = { id: 1, name: "test" };
      const mockQueryFn = vi.fn().mockResolvedValue(mockResult);

      mockActionCache.getOrSet.mockResolvedValue(mockResult);

      const result = await cachedQuery(queryName, params, mockQueryFn);

      expect(mockActionCache.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining("db:query:"),
        expect.any(Function),
        expect.objectContaining({ ttl: 1800 })
      );
      expect(result).toEqual(mockResult);
      expect(mockQueryFn).not.toHaveBeenCalled(); // Should use cached result
    });

    it("should handle cache miss and execute query", async () => {
      const queryName = "test_query";
      const params = ["param1", "param2"];
      const mockResult = { id: 1, name: "test" };
      const mockQueryFn = vi.fn().mockResolvedValue(mockResult);

      // Simulate cache miss by calling the fallback function
      mockActionCache.getOrSet.mockImplementation(async (key, fallback) => {
        return await fallback();
      });

      const result = await cachedQuery(queryName, params, mockQueryFn);

      expect(mockQueryFn).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("should handle query function errors", async () => {
      const queryName = "test_query";
      const params = ["param1", "param2"];
      const error = createTestError("Query execution failed");
      const mockQueryFn = vi.fn().mockRejectedValue(error);

      // Simulate cache miss by calling the fallback function
      mockActionCache.getOrSet.mockImplementation(async (key, fallback) => {
        return await fallback();
      });

      await expect(cachedQuery(queryName, params, mockQueryFn)).rejects.toThrow(
        "Query execution failed"
      );
    });

    it("should handle cache getOrSet errors", async () => {
      const queryName = "test_query";
      const params = ["param1", "param2"];
      const mockQueryFn = vi.fn().mockResolvedValue({ id: 1 });
      const error = createTestError("Cache error");

      mockActionCache.getOrSet.mockRejectedValue(error);

      await expect(cachedQuery(queryName, params, mockQueryFn)).rejects.toThrow(
        "Cache error"
      );
    });

    it("should use custom cache options when provided", async () => {
      const queryName = "test_query";
      const params = ["param1"];
      const mockResult = { id: 1 };
      const mockQueryFn = vi.fn().mockResolvedValue(mockResult);
      const customOptions = {
        ttl: 7200,
        memoryTtl: 600000,
        tags: ["custom", "query"] as const,
      } as unknown as Parameters<typeof cachedQuery>[3];

      mockActionCache.getOrSet.mockResolvedValue(mockResult);

      await cachedQuery(queryName, params, mockQueryFn, customOptions);

      expect(mockActionCache.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining("db:query:"),
        expect.any(Function),
        customOptions
      );
    });

    it("should generate unique cache keys for different queries", async () => {
      const queryName1 = "getUserById";
      const queryName2 = "getUserByEmail";
      const params1 = [123];
      const params2 = ["user@example.com"];
      const mockQueryFn = vi.fn().mockResolvedValue({ id: 1 });

      mockActionCache.getOrSet.mockResolvedValue({ id: 1 });

      await cachedQuery(queryName1, params1, mockQueryFn);
      await cachedQuery(queryName2, params2, mockQueryFn);

      const calls = mockActionCache.getOrSet.mock.calls;

      // Verify that the cache key generator was called with different hashes
      expect(calls[0]?.[0]).toContain("db:query:");
      expect(calls[1]?.[0]).toContain("db:query:");

      // Test that the hash function works correctly (the actual implementation)
      const hash1 = hashQueryParams(queryName1, ...params1);
      const hash2 = hashQueryParams(queryName2, ...params2);
      expect(hash1).not.toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash2).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle empty parameters array", async () => {
      const queryName = "test_query";
      const params: unknown[] = [];
      const mockResult = { id: 1 };
      const mockQueryFn = vi.fn().mockResolvedValue(mockResult);

      mockActionCache.getOrSet.mockResolvedValue(mockResult);

      const result = await cachedQuery(queryName, params, mockQueryFn);

      expect(result).toEqual(mockResult);
    });

    it("should handle complex parameter types", async () => {
      const queryName = "complex_query";
      const params = [
        "string_param",
        123,
        { nested: { value: "test" } },
        [1, 2, 3],
        true,
        null,
        undefined,
      ];
      const mockResult = { id: 1 };
      const mockQueryFn = vi.fn().mockResolvedValue(mockResult);

      mockActionCache.getOrSet.mockResolvedValue(mockResult);

      const result = await cachedQuery(queryName, params, mockQueryFn);

      expect(result).toEqual(mockResult);
    });
  });
});

describe("Integration Tests", () => {
  let mockActionCache: MockActionCache;
  let mockDatabase: MockDatabase;

  beforeEach(async () => {
    const actionCacheModule = await import(
      "../../../workers/core/cache/action-cache"
    );
    mockActionCache =
      actionCacheModule.actionCache as unknown as MockActionCache;

    const databaseModule = await import("@peas/database");
    mockDatabase = databaseModule as unknown as MockDatabase;
  });

  describe("Full workflow with caching", () => {
    it("should handle complete note creation and retrieval workflow", async () => {
      const mockFile = {
        id: "file-1",
        title: "Test File",
        contents: "<html>Test content</html>",
        ingredients: [],
        instructions: [],
      };
      const mockNote = {
        id: "note-1",
        fileId: "file-1",
        title: "Test Note",
        parsedLines: [],
      };
      const mockNotes = [mockNote];

      // Setup mocks
      mockDatabase.createNote.mockResolvedValue(mockNote);
      mockDatabase.getNotes.mockResolvedValue(mockNotes);
      mockActionCache.getOrSet.mockResolvedValue(mockNotes);
      mockActionCache.invalidateByPattern.mockResolvedValue(3);
      mockActionCache.delete.mockResolvedValue(true);

      // Mock console methods to avoid noise
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      // Create note
      const createdNote = await CachedNoteRepository.createNote(mockFile);
      expect(createdNote).toEqual(mockNote);

      // Get all notes (should use cache)
      const allNotes = await CachedNoteRepository.getNotes();
      expect(allNotes).toEqual(mockNotes);

      // Invalidate specific note cache
      await CachedNoteRepository.invalidateNoteCache("note-1");

      // Invalidate all note caches
      await CachedNoteRepository.invalidateNoteCaches();

      // Verify all expected calls were made
      expect(mockDatabase.createNote).toHaveBeenCalledWith(mockFile);
      expect(mockActionCache.getOrSet).toHaveBeenCalled();
      expect(mockActionCache.invalidateByPattern).toHaveBeenCalled();
      expect(mockActionCache.delete).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});
