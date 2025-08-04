/* eslint-disable @typescript-eslint/no-explicit-any */
// Import the mocked functions
import {
  connectNoteToSource,
  createOrFindSourceWithBook,
  createOrFindSourceWithUrl,
  getNoteWithEvernoteMetadata,
  isValidUrl,
  upsertEvernoteMetadataSource,
} from "@peas/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
// Import types
import type { NotePipelineData } from "../../../../../types/notes";
// Import the function to test
import { processSource } from "../../../../note/actions/process-source/service";

// Mock the database functions
vi.mock("@peas/database", () => ({
  getNoteWithEvernoteMetadata: vi.fn(),
  isValidUrl: vi.fn(),
  createOrFindSourceWithUrl: vi.fn(),
  createOrFindSourceWithBook: vi.fn(),
  upsertEvernoteMetadataSource: vi.fn(),
  connectNoteToSource: vi.fn(),
}));

describe("processSource", () => {
  let mockLogger: StructuredLogger;
  let mockData: NotePipelineData;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      log: vi.fn(),
    } as any;

    // Setup mock data
    mockData = {
      noteId: "test-note-123",
      content: "test content",
      file: {
        contents: "test content",
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
        evernoteMetadata: {
          source: "https://example.com/recipe",
        },
      },
    };
  });

  describe("basic functionality", () => {
    it("should process source URL successfully", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (upsertEvernoteMetadataSource as any).mockResolvedValue(undefined);
      (connectNoteToSource as any).mockResolvedValue(undefined);

      const result = await processSource(mockData, mockLogger);

      expect(result).toBe(mockData);
      expect(getNoteWithEvernoteMetadata).toHaveBeenCalledWith("test-note-123");
      expect(isValidUrl).toHaveBeenCalledWith("https://example.com/recipe");
      expect(createOrFindSourceWithUrl).toHaveBeenCalledWith(
        "https://example.com/recipe"
      );
      expect(upsertEvernoteMetadataSource).toHaveBeenCalledWith(
        "metadata-123",
        "https://example.com/recipe"
      );
      expect(connectNoteToSource).toHaveBeenCalledWith(
        "test-note-123",
        "source-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Starting source processing for note: test-note-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Processing source URL: https://example.com/recipe for note: test-note-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Successfully processed source for note: test-note-123, source ID: source-123"
      );
    });

    it("should process book reference successfully", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      mockData.file!.evernoteMetadata!.source = "The Joy of Cooking";
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(false);
      (createOrFindSourceWithBook as any).mockResolvedValue("book-source-456");
      (upsertEvernoteMetadataSource as any).mockResolvedValue(undefined);
      (connectNoteToSource as any).mockResolvedValue(undefined);

      const result = await processSource(mockData, mockLogger);

      expect(result).toBe(mockData);
      expect(isValidUrl).toHaveBeenCalledWith("The Joy of Cooking");
      expect(createOrFindSourceWithBook).toHaveBeenCalledWith(
        "The Joy of Cooking"
      );
      expect(createOrFindSourceWithUrl).not.toHaveBeenCalled();
    });

    it("should handle note without evernoteMetadataId", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: null,
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (connectNoteToSource as any).mockResolvedValue(undefined);

      const result = await processSource(mockData, mockLogger);

      expect(result).toBe(mockData);
      expect(upsertEvernoteMetadataSource).not.toHaveBeenCalled();
      expect(connectNoteToSource).toHaveBeenCalledWith(
        "test-note-123",
        "source-123"
      );
    });
  });

  describe("input validation", () => {
    it("should throw error when noteId is missing", async () => {
      const dataWithoutNoteId = { ...mockData, noteId: undefined };

      await expect(
        processSource(dataWithoutNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for source processing");
    });

    it("should throw error when noteId is null", async () => {
      const dataWithNullNoteId = { ...mockData, noteId: null as any };

      await expect(
        processSource(dataWithNullNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for source processing");
    });

    it("should throw error when noteId is empty string", async () => {
      const dataWithEmptyNoteId = { ...mockData, noteId: "" };

      await expect(
        processSource(dataWithEmptyNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for source processing");
    });
  });

  describe("note retrieval", () => {
    it("should throw error when note is not found", async () => {
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(null);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Note with ID test-note-123 not found"
      );
    });

    it("should handle database error when retrieving note", async () => {
      const dbError = new Error("Database connection failed");
      (getNoteWithEvernoteMetadata as any).mockRejectedValue(dbError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Database connection failed"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Failed to process source: Error: Database connection failed"
      );
    });
  });

  describe("source URL handling", () => {
    it("should return data unchanged when no source URL is provided", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const dataWithoutSource = {
        ...mockData,
        file: { ...mockData.file!, evernoteMetadata: { source: undefined } },
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);

      const result = await processSource(dataWithoutSource, mockLogger);

      expect(result).toBe(dataWithoutSource);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] No source URL found for note: test-note-123"
      );
      expect(isValidUrl).not.toHaveBeenCalled();
      expect(createOrFindSourceWithUrl).not.toHaveBeenCalled();
      expect(createOrFindSourceWithBook).not.toHaveBeenCalled();
      expect(upsertEvernoteMetadataSource).not.toHaveBeenCalled();
      expect(connectNoteToSource).not.toHaveBeenCalled();
    });

    it("should return data unchanged when source URL is empty string", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const dataWithEmptySource = {
        ...mockData,
        file: { ...mockData.file!, evernoteMetadata: { source: "" } },
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);

      const result = await processSource(dataWithEmptySource, mockLogger);

      expect(result).toBe(dataWithEmptySource);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] No source URL found for note: test-note-123"
      );
    });

    it("should return data unchanged when file is null", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const dataWithNullFile = {
        ...mockData,
        file: undefined,
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);

      const result = await processSource(dataWithNullFile, mockLogger);

      expect(result).toBe(dataWithNullFile);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] No source URL found for note: test-note-123"
      );
    });
  });

  describe("source creation errors", () => {
    it("should handle error when creating source with URL fails", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const sourceError = new Error("Failed to create source");
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockRejectedValue(sourceError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Failed to create source"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Failed to process source: Error: Failed to create source"
      );
    });

    it("should handle error when creating source with book fails", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      mockData.file!.evernoteMetadata!.source = "The Joy of Cooking";
      const bookError = new Error("Failed to create book source");
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(false);
      (createOrFindSourceWithBook as any).mockRejectedValue(bookError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Failed to create book source"
      );
    });
  });

  describe("metadata update errors", () => {
    it("should handle error when upserting evernote metadata fails", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const metadataError = new Error("Failed to update metadata");
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (upsertEvernoteMetadataSource as any).mockRejectedValue(metadataError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Failed to update metadata"
      );
    });
  });

  describe("note connection errors", () => {
    it("should handle error when connecting note to source fails", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const connectionError = new Error("Failed to connect note to source");
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (upsertEvernoteMetadataSource as any).mockResolvedValue(undefined);
      (connectNoteToSource as any).mockRejectedValue(connectionError);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Failed to connect note to source"
      );
    });
  });

  describe("logging", () => {
    it("should log start message", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (upsertEvernoteMetadataSource as any).mockResolvedValue(undefined);
      (connectNoteToSource as any).mockResolvedValue(undefined);

      await processSource(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Starting source processing for note: test-note-123"
      );
    });

    it("should log completion message on success", async () => {
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (upsertEvernoteMetadataSource as any).mockResolvedValue(undefined);
      (connectNoteToSource as any).mockResolvedValue(undefined);

      await processSource(mockData, mockLogger);

      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Successfully processed source for note: test-note-123, source ID: source-123"
      );
    });

    it("should log error message on failure", async () => {
      const error = new Error("Test error");
      (getNoteWithEvernoteMetadata as any).mockRejectedValue(error);

      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Test error"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Failed to process source: Error: Test error"
      );
    });
  });

  describe("edge cases", () => {
    it("should handle non-Error exceptions", async () => {
      const nonErrorException = "String exception";
      (getNoteWithEvernoteMetadata as any).mockRejectedValue(nonErrorException);

      await expect(processSource(mockData, mockLogger)).rejects.toBe(
        "String exception"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Failed to process source: String exception"
      );
    });
  });
});
