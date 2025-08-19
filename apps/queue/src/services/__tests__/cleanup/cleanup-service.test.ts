import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../types";
import { CleanupService } from "../../cleanup/cleanup-service";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  default: {
    stat: vi.fn(),
    readdir: vi.fn(),
    rmdir: vi.fn(),
    unlink: vi.fn(),
  },
}));

// Mock path
vi.mock("path", () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join("/")),
  },
  join: vi.fn((...args: string[]) => args.join("/")),
}));

describe("CleanupService", () => {
  let cleanupService: CleanupService;
  let mockLogger: StructuredLogger;
  let mockStat: ReturnType<typeof vi.fn>;
  let mockReaddir: ReturnType<typeof vi.fn>;
  let mockRmdir: ReturnType<typeof vi.fn>;
  let mockUnlink: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    } as unknown as StructuredLogger;

    cleanupService = new CleanupService(mockLogger);

    // Get mocked functions
    const fs = await import("fs/promises");
    mockStat = vi.mocked(fs.default.stat);
    mockReaddir = vi.mocked(fs.default.readdir);
    mockRmdir = vi.mocked(fs.default.rmdir);
    mockUnlink = vi.mocked(fs.default.unlink);
  });

  describe("cleanupOrphanedImportDirectories", () => {
    it("should handle when uploads images directory does not exist", async () => {
      // Mock fs.stat to return a file instead of directory
      mockStat.mockResolvedValue({
        isDirectory: () => false,
      });

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 0,
        totalDirectories: 0,
        errors: [],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Uploads images directory does not exist: /Users/awehrman/projects/peas/apps/queue/uploads/images"
      );
    });

    it("should handle when uploads images directory is not a directory", async () => {
      // Mock fs.stat to return a file instead of directory
      mockStat.mockResolvedValue({
        isDirectory: () => false,
      });

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 0,
        totalDirectories: 0,
        errors: [],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Uploads images directory does not exist: /Users/awehrman/projects/peas/apps/queue/uploads/images"
      );
    });

    it("should handle empty directory list", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
      });
      mockReaddir.mockResolvedValue([]);

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 0,
        totalDirectories: 0,
        errors: [],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Found 0 import directories"
      );
    });

    it("should handle non-import directories", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
      });
      mockReaddir.mockResolvedValue(["other-dir", "not-import"]);

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 0,
        totalDirectories: 0,
        errors: [],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Found 0 import directories"
      );
    });

    it("should handle import directories that are not directories", async () => {
      // Mock fs.stat to return directory for main dir
      mockStat
        .mockResolvedValueOnce({ isDirectory: () => true }) // Main directory
        .mockResolvedValueOnce({ isDirectory: () => false }); // Import directory is a file

      mockReaddir.mockResolvedValue(["import_123_456"]);

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 0,
        totalDirectories: 1,
        errors: [],
      });
    });

    it("should handle empty import directories", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
      });
      // First readdir call returns the import directory list
      mockReaddir.mockResolvedValueOnce(["import_123_456"]);
      // Second readdir call returns empty contents for the import directory
      mockReaddir.mockResolvedValueOnce([]);

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 1,
        failedDirectories: 0,
        totalDirectories: 1,
        errors: [],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Removed empty import directory: import_123_456"
      );
    });

    it("should handle non-empty import directories with file cleanup", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => true,
      });
      // First readdir call returns the import directory list
      mockReaddir.mockResolvedValueOnce(["import_123_456"]);
      // Second readdir call returns files in the import directory
      mockReaddir.mockResolvedValueOnce(["file1.jpg", "file2.png"]);
      // Third readdir call returns empty after cleanup
      mockReaddir.mockResolvedValueOnce([]);

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 1,
        failedDirectories: 0,
        totalDirectories: 1,
        errors: [],
      });
      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Removed import directory after file cleanup: import_123_456"
      );
    });

    it("should handle file removal errors during cleanup", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => true,
      });
      // First readdir call returns the import directory list
      mockReaddir.mockResolvedValueOnce(["import_123_456"]);
      // Second readdir call returns files in the import directory
      mockReaddir.mockResolvedValueOnce(["file1.jpg"]);
      mockUnlink.mockRejectedValueOnce(new Error("Permission denied"));

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 0,
        totalDirectories: 1,
        errors: [],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Failed to remove file /Users/awehrman/projects/peas/apps/queue/uploads/images/import_123_456/file1.jpg: Error: Permission denied"
      );
    });

    it("should handle directory still having items after cleanup", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => true,
      });
      // First readdir call returns the import directory list
      mockReaddir.mockResolvedValueOnce(["import_123_456"]);
      // Second readdir call returns files in the import directory
      mockReaddir.mockResolvedValueOnce(["file1.jpg"]);
      // Third readdir call returns remaining files after cleanup
      mockReaddir.mockResolvedValueOnce(["remaining-file.txt"]);

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 0,
        totalDirectories: 1,
        errors: [],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Import directory still has 1 items after cleanup: import_123_456"
      );
    });

    it("should handle final directory removal error", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => true,
      });
      // First readdir call returns the import directory list
      mockReaddir.mockResolvedValueOnce(["import_123_456"]);
      // Second readdir call returns empty after cleanup
      mockReaddir.mockResolvedValueOnce([]);
      mockRmdir.mockRejectedValueOnce(new Error("Directory not empty"));

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 1,
        totalDirectories: 1,
        errors: ["Error processing import_123_456: Error: Directory not empty"],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Error processing import directory import_123_456: Error: Directory not empty"
      );
    });

    it("should handle processing errors for individual directories", async () => {
      // Mock fs.stat to return directory for main dir, then throw for import dir
      mockStat
        .mockResolvedValueOnce({ isDirectory: () => true }) // Main directory
        .mockRejectedValueOnce(new Error("Access denied")); // Import directory access error

      // First readdir call returns the import directory list
      mockReaddir.mockResolvedValueOnce(["import_123_456"]);

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 1,
        totalDirectories: 1,
        errors: ["Error processing import_123_456: Error: Access denied"],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Error processing import directory import_123_456: Error: Access denied"
      );
    });

    it("should handle service-level errors", async () => {
      // Mock fs.stat to throw for main directory
      mockStat.mockRejectedValue(new Error("Service unavailable"));

      const result = await cleanupService.cleanupOrphanedImportDirectories();

      expect(result).toEqual({
        cleanedDirectories: 0,
        failedDirectories: 0,
        totalDirectories: 0,
        errors: ["Service error: Error: Service unavailable"],
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Failed to cleanup orphaned import directories: Error: Service unavailable"
      );
    });
  });

  describe("cleanupImportDirectory", () => {
    it("should handle directory that does not exist", async () => {
      // Mock fs.stat to return a file instead of directory
      mockStat.mockResolvedValue({
        isDirectory: () => false,
      });

      const result = await cleanupService.cleanupImportDirectory("test-import");

      expect(result).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Import directory does not exist: /Users/awehrman/projects/peas/apps/queue/uploads/images/test-import"
      );
    });

    it("should handle empty directory", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
      });
      mockReaddir.mockResolvedValueOnce([]);

      const result = await cleanupService.cleanupImportDirectory("test-import");

      expect(result).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Successfully removed empty import directory: /Users/awehrman/projects/peas/apps/queue/uploads/images/test-import"
      );
    });

    it("should handle non-empty directory with file cleanup", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => true,
      });
      mockReaddir.mockResolvedValueOnce(["file1.jpg", "file2.png"]);
      mockReaddir.mockResolvedValueOnce([]); // Empty after cleanup

      const result = await cleanupService.cleanupImportDirectory("test-import");

      expect(result).toBe(true);
      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Successfully removed import directory after file cleanup: /Users/awehrman/projects/peas/apps/queue/uploads/images/test-import"
      );
    });

    it("should handle file removal errors", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => true,
      });
      mockReaddir.mockResolvedValueOnce(["file1.jpg"]);
      mockUnlink.mockRejectedValueOnce(new Error("Permission denied"));

      const result = await cleanupService.cleanupImportDirectory("test-import");

      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Failed to remove file /Users/awehrman/projects/peas/apps/queue/uploads/images/test-import/file1.jpg: Error: Permission denied"
      );
    });

    it("should handle directory still having items after cleanup", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => true,
      });
      mockReaddir.mockResolvedValueOnce(["file1.jpg"]);
      mockReaddir.mockResolvedValueOnce(["remaining-file.txt"]); // Still has files after cleanup

      const result = await cleanupService.cleanupImportDirectory("test-import");

      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Import directory still has 1 items after cleanup: /Users/awehrman/projects/peas/apps/queue/uploads/images/test-import"
      );
    });

    it("should handle final directory removal error", async () => {
      // Mock fs.stat to return directory
      mockStat.mockResolvedValue({
        isDirectory: () => true,
        isFile: () => true,
      });
      mockReaddir.mockResolvedValueOnce(["file1.jpg"]); // Has files initially
      mockReaddir.mockResolvedValueOnce([]); // Empty after cleanup
      mockRmdir.mockRejectedValueOnce(new Error("Directory not empty"));

      const result = await cleanupService.cleanupImportDirectory("test-import");

      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Could not remove import directory after cleanup: Error: Directory not empty"
      );
    });

    it("should handle ENOENT error (directory already deleted)", async () => {
      const enoentError = new Error("ENOENT: no such file or directory") as Error & { code?: string };
      enoentError.code = "ENOENT";
      mockStat.mockRejectedValue(enoentError);

      const result = await cleanupService.cleanupImportDirectory("test-import");

      expect(result).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Import directory already deleted: test-import"
      );
    });

    it("should handle other errors", async () => {
      // Mock fs.stat to throw other error
      mockStat.mockRejectedValue(new Error("Access denied"));

      const result = await cleanupService.cleanupImportDirectory("test-import");

      expect(result).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_SERVICE] Failed to cleanup import directory test-import: Error: Access denied"
      );
    });
  });
});
