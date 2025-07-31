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
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (upsertEvernoteMetadataSource as any).mockResolvedValue(undefined);
      (connectNoteToSource as any).mockResolvedValue(undefined);

      // Act
      const result = await processSource(mockData, mockLogger);

      // Assert
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
      // Arrange
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

      // Act
      const result = await processSource(mockData, mockLogger);

      // Assert
      expect(result).toBe(mockData);
      expect(isValidUrl).toHaveBeenCalledWith("The Joy of Cooking");
      expect(createOrFindSourceWithBook).toHaveBeenCalledWith(
        "The Joy of Cooking"
      );
      expect(createOrFindSourceWithUrl).not.toHaveBeenCalled();
    });

    it("should handle note without evernoteMetadataId", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: null,
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (connectNoteToSource as any).mockResolvedValue(undefined);

      // Act
      const result = await processSource(mockData, mockLogger);

      // Assert
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
      // Arrange
      const dataWithoutNoteId = { ...mockData, noteId: undefined };

      // Act & Assert
      await expect(
        processSource(dataWithoutNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for source processing");
    });

    it("should throw error when noteId is null", async () => {
      // Arrange
      const dataWithNullNoteId = { ...mockData, noteId: null as any };

      // Act & Assert
      await expect(
        processSource(dataWithNullNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for source processing");
    });

    it("should throw error when noteId is empty string", async () => {
      // Arrange
      const dataWithEmptyNoteId = { ...mockData, noteId: "" };

      // Act & Assert
      await expect(
        processSource(dataWithEmptyNoteId, mockLogger)
      ).rejects.toThrow("No note ID available for source processing");
    });
  });

  describe("note retrieval", () => {
    it("should throw error when note is not found", async () => {
      // Arrange
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(null);

      // Act & Assert
      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Note with ID test-note-123 not found"
      );
    });

    it("should handle database error when retrieving note", async () => {
      // Arrange
      const dbError = new Error("Database connection failed");
      (getNoteWithEvernoteMetadata as any).mockRejectedValue(dbError);

      // Act & Assert
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
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const dataWithoutSource = {
        ...mockData,
        file: { ...mockData.file!, evernoteMetadata: { source: undefined } },
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);

      // Act
      const result = await processSource(dataWithoutSource, mockLogger);

      // Assert
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
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const dataWithEmptySource = {
        ...mockData,
        file: { ...mockData.file!, evernoteMetadata: { source: "" } },
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);

      // Act
      const result = await processSource(dataWithEmptySource, mockLogger);

      // Assert
      expect(result).toBe(dataWithEmptySource);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] No source URL found for note: test-note-123"
      );
    });

    it("should return data unchanged when file is null", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const dataWithNullFile = {
        ...mockData,
        file: undefined,
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);

      // Act
      const result = await processSource(dataWithNullFile, mockLogger);

      // Assert
      expect(result).toBe(dataWithNullFile);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] No source URL found for note: test-note-123"
      );
    });
  });

  describe("source creation errors", () => {
    it("should handle error when creating source with URL fails", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const sourceError = new Error("Failed to create source");
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockRejectedValue(sourceError);

      // Act & Assert
      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Failed to create source"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Failed to process source: Error: Failed to create source"
      );
    });

    it("should handle error when creating source with book fails", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      mockData.file!.evernoteMetadata!.source = "The Joy of Cooking";
      const bookError = new Error("Failed to create book source");
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(false);
      (createOrFindSourceWithBook as any).mockRejectedValue(bookError);

      // Act & Assert
      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Failed to create book source"
      );
    });
  });

  describe("metadata update errors", () => {
    it("should handle error when upserting evernote metadata fails", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      const metadataError = new Error("Failed to update metadata");
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (upsertEvernoteMetadataSource as any).mockRejectedValue(metadataError);

      // Act & Assert
      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Failed to update metadata"
      );
    });
  });

  describe("note connection errors", () => {
    it("should handle error when connecting note to source fails", async () => {
      // Arrange
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

      // Act & Assert
      await expect(processSource(mockData, mockLogger)).rejects.toThrow(
        "Failed to connect note to source"
      );
    });
  });

  describe("logging", () => {
    it("should log start message", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (upsertEvernoteMetadataSource as any).mockResolvedValue(undefined);
      (connectNoteToSource as any).mockResolvedValue(undefined);

      // Act
      await processSource(mockData, mockLogger);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Starting source processing for note: test-note-123"
      );
    });

    it("should log completion message on success", async () => {
      // Arrange
      const mockNote = {
        id: "test-note-123",
        evernoteMetadataId: "metadata-123",
      };
      (getNoteWithEvernoteMetadata as any).mockResolvedValue(mockNote);
      (isValidUrl as any).mockReturnValue(true);
      (createOrFindSourceWithUrl as any).mockResolvedValue("source-123");
      (upsertEvernoteMetadataSource as any).mockResolvedValue(undefined);
      (connectNoteToSource as any).mockResolvedValue(undefined);

      // Act
      await processSource(mockData, mockLogger);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Successfully processed source for note: test-note-123, source ID: source-123"
      );
    });

    it("should log error message on failure", async () => {
      // Arrange
      const error = new Error("Test error");
      (getNoteWithEvernoteMetadata as any).mockRejectedValue(error);

      // Act & Assert
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
      // Arrange
      const nonErrorException = "String exception";
      (getNoteWithEvernoteMetadata as any).mockRejectedValue(nonErrorException);

      // Act & Assert
      await expect(processSource(mockData, mockLogger)).rejects.toBe(
        "String exception"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[PROCESS_SOURCE] Failed to process source: String exception"
      );
    });
  });
});
