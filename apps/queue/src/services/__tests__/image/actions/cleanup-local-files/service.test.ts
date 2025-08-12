import fs from "fs/promises";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IServiceContainer } from "../../../../../services/container";
import {
  createMockLogger,
  createMockServiceContainer,
} from "../../../../../test-utils/helpers";
import type { ImageJobData } from "../../../../../workers/image/types";
import { cleanupLocalFiles } from "../../../../image/actions/cleanup-local-files/service";

// Mock fs module
vi.mock("fs/promises");
vi.mock("path");

describe("cleanupLocalFiles", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockServiceContainer: IServiceContainer;
  let mockData: ImageJobData;
  let mockFsAccess: ReturnType<typeof vi.fn>;
  let mockFsUnlink: ReturnType<typeof vi.fn>;
  let mockFsStat: ReturnType<typeof vi.fn>;
  let mockFsReaddir: ReturnType<typeof vi.fn>;
  let mockFsRmdir: ReturnType<typeof vi.fn>;
  let mockPathResolve: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get mocked functions
    const fsModule = vi.mocked(fs);
    const pathModule = vi.mocked(path);

    mockFsAccess = vi.mocked(fsModule.access);
    mockFsUnlink = vi.mocked(fsModule.unlink);
    mockFsStat = vi.mocked(fsModule.stat);
    mockFsReaddir = vi.mocked(fsModule.readdir);
    mockFsRmdir = vi.mocked(fsModule.rmdir);
    mockPathResolve = vi.mocked(pathModule.resolve);

    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock service container
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockServiceContainer = createMockServiceContainer() as any;

    // Create mock data
    mockData = {
      noteId: "test-note-123",
      importId: "test-import-456",
      imagePath: "/path/to/image.jpg",
      outputDir: "/path/to/output",
      filename: "image.jpg",
      originalPath: "/path/to/original.jpg",
      thumbnailPath: "/path/to/thumbnail.jpg",
      crop3x2Path: "/path/to/crop3x2.jpg",
      crop4x3Path: "/path/to/crop4x3.jpg",
      crop16x9Path: "/path/to/crop16x9.jpg",
      originalSize: 1024,
      thumbnailSize: 512,
      crop3x2Size: 768,
      crop4x3Size: 768,
      crop16x9Size: 768,
      metadata: {
        width: 1920,
        height: 1080,
        format: "jpeg",
      },
    };

    // Setup default mocks
    mockPathResolve.mockReturnValue("/resolved/output/path");
  });

  describe("successful cleanup scenarios", () => {
    it("should successfully delete all files and return data", async () => {
      // Setup mocks for successful file deletion
      mockFsAccess.mockResolvedValue(undefined);
      mockFsUnlink.mockResolvedValue(undefined);
      mockFsStat.mockResolvedValue({ isDirectory: () => true });
      mockFsReaddir.mockResolvedValue([]);
      mockFsRmdir.mockResolvedValue(undefined);

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify all files were attempted to be deleted
      expect(mockFsAccess).toHaveBeenCalledTimes(6);
      expect(mockFsUnlink).toHaveBeenCalledTimes(6);
      expect(mockFsAccess).toHaveBeenCalledWith(mockData.imagePath);
      expect(mockFsAccess).toHaveBeenCalledWith(mockData.originalPath);
      expect(mockFsAccess).toHaveBeenCalledWith(mockData.thumbnailPath);
      expect(mockFsAccess).toHaveBeenCalledWith(mockData.crop3x2Path);
      expect(mockFsAccess).toHaveBeenCalledWith(mockData.crop4x3Path);
      expect(mockFsAccess).toHaveBeenCalledWith(mockData.crop16x9Path);

      // Verify output directory cleanup
      expect(mockPathResolve).toHaveBeenCalledWith(mockData.outputDir);
      expect(mockFsStat).toHaveBeenCalledWith("/resolved/output/path");
      expect(mockFsReaddir).toHaveBeenCalledWith("/resolved/output/path");
      expect(mockFsRmdir).toHaveBeenCalledWith("/resolved/output/path");

      // Verify logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Starting cleanup for note: test-note-123"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted original uploaded: /path/to/image.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted processed original: /path/to/original.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted thumbnail: /path/to/thumbnail.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted crop3x2: /path/to/crop3x2.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted crop4x3: /path/to/crop4x3.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted crop16x9: /path/to/crop16x9.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Checking output directory: /resolved/output/path"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully removed empty output directory: /resolved/output/path"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Cleanup completed: 6 successful, 0 failed"
      );

      // Verify return value
      expect(result).toEqual(mockData);
    });

    it("should handle files that are already deleted", async () => {
      // Setup mocks for files that don't exist
      mockFsAccess.mockRejectedValue({ code: "ENOENT" });
      mockFsStat.mockResolvedValue({ isDirectory: () => true });
      mockFsReaddir.mockResolvedValue([]);
      mockFsRmdir.mockResolvedValue(undefined);

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify files were checked but not deleted
      expect(mockFsAccess).toHaveBeenCalledTimes(6);
      expect(mockFsUnlink).not.toHaveBeenCalled();

      // Verify logging for already deleted files
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] File already deleted: original uploaded"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] File already deleted: processed original"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] File already deleted: thumbnail"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] File already deleted: crop3x2"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] File already deleted: crop4x3"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] File already deleted: crop16x9"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Cleanup completed: 6 successful, 0 failed"
      );

      expect(result).toEqual(mockData);
    });

    it("should handle output directory that is already deleted", async () => {
      // Setup mocks for successful file deletion but directory already deleted
      mockFsAccess.mockResolvedValue(undefined);
      mockFsUnlink.mockResolvedValue(undefined);
      mockFsStat.mockRejectedValue({ code: "ENOENT" });

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify directory cleanup was attempted
      expect(mockPathResolve).toHaveBeenCalledWith(mockData.outputDir);
      expect(mockFsStat).toHaveBeenCalledWith("/resolved/output/path");

      // Verify logging for already deleted directory
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Output directory already deleted: /path/to/output"
      );

      expect(result).toEqual(mockData);
    });

    it("should handle output directory that is not empty", async () => {
      // Setup mocks for successful file deletion but directory not empty
      mockFsAccess.mockResolvedValue(undefined);
      mockFsUnlink.mockResolvedValue(undefined);
      mockFsStat.mockResolvedValue({ isDirectory: () => true });
      mockFsReaddir.mockResolvedValue(["file1.jpg", "file2.jpg"]);

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify directory was checked but not removed
      expect(mockPathResolve).toHaveBeenCalledWith(mockData.outputDir);
      expect(mockFsStat).toHaveBeenCalledWith("/resolved/output/path");
      expect(mockFsReaddir).toHaveBeenCalledWith("/resolved/output/path");
      expect(mockFsRmdir).not.toHaveBeenCalled();

      // Verify logging for non-empty directory
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Output directory not empty (2 items), leaving: /resolved/output/path"
      );

      expect(result).toEqual(mockData);
    });

    it("should handle missing outputDir", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataWithoutOutputDir = { ...mockData, outputDir: undefined } as any;

      // Setup mocks for successful file deletion
      mockFsAccess.mockResolvedValue(undefined);
      mockFsUnlink.mockResolvedValue(undefined);

      const result = await cleanupLocalFiles(
        dataWithoutOutputDir,
        mockServiceContainer,
        mockLogger
      );

      // Verify files were deleted but no directory cleanup attempted
      expect(mockFsAccess).toHaveBeenCalledTimes(6);
      expect(mockFsUnlink).toHaveBeenCalledTimes(6);
      expect(mockPathResolve).not.toHaveBeenCalled();
      expect(mockFsStat).not.toHaveBeenCalled();

      expect(result).toEqual(dataWithoutOutputDir);
    });
  });

  describe("error handling scenarios", () => {
    it("should handle file deletion errors gracefully", async () => {
      // Setup mocks for file deletion errors
      mockFsAccess.mockResolvedValue(undefined);
      mockFsUnlink.mockRejectedValue(new Error("Permission denied"));
      mockFsStat.mockResolvedValue({ isDirectory: () => true });
      mockFsReaddir.mockResolvedValue([]);
      mockFsRmdir.mockResolvedValue(undefined);

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify error logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Failed to delete original uploaded: Error: Permission denied"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Failed to delete processed original: Error: Permission denied"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Failed to delete thumbnail: Error: Permission denied"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Failed to delete crop3x2: Error: Permission denied"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Failed to delete crop4x3: Error: Permission denied"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Failed to delete crop16x9: Error: Permission denied"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Cleanup completed: 0 successful, 6 failed"
      );

      expect(result).toEqual(mockData);
    });

    it("should handle output directory cleanup errors gracefully", async () => {
      // Setup mocks for successful file deletion but directory cleanup error
      mockFsAccess.mockResolvedValue(undefined);
      mockFsUnlink.mockResolvedValue(undefined);
      mockFsStat.mockResolvedValue({ isDirectory: () => true });
      mockFsReaddir.mockResolvedValue([]);
      mockFsRmdir.mockRejectedValue(new Error("Directory not empty"));

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify error logging for directory cleanup
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Failed to cleanup output directory: Error: Directory not empty"
      );

      expect(result).toEqual(mockData);
    });

    it("should handle mixed success and failure scenarios", async () => {
      // Setup mocks for mixed results
      mockFsAccess
        .mockResolvedValueOnce(undefined) // imagePath - success
        .mockResolvedValueOnce(undefined) // originalPath - success
        .mockRejectedValueOnce({ code: "ENOENT" }) // thumbnailPath - already deleted
        .mockResolvedValueOnce(undefined) // crop3x2Path - success
        .mockRejectedValueOnce(new Error("Permission denied")) // crop4x3Path - error
        .mockResolvedValueOnce(undefined); // crop16x9Path - success

      mockFsUnlink
        .mockResolvedValueOnce(undefined) // imagePath
        .mockResolvedValueOnce(undefined) // originalPath
        .mockResolvedValueOnce(undefined) // crop3x2Path
        .mockResolvedValueOnce(undefined); // crop16x9Path

      mockFsStat.mockResolvedValue({ isDirectory: () => true });
      mockFsReaddir.mockResolvedValue([]);
      mockFsRmdir.mockResolvedValue(undefined);

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify mixed results logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted original uploaded: /path/to/image.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted processed original: /path/to/original.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] File already deleted: thumbnail"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted crop3x2: /path/to/crop3x2.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Failed to delete crop4x3: Error: Permission denied"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Successfully deleted crop16x9: /path/to/crop16x9.jpg"
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Cleanup completed: 5 successful, 1 failed"
      );

      expect(result).toEqual(mockData);
    });

    it("should handle non-directory output path", async () => {
      // Setup mocks for successful file deletion but output path is not a directory
      mockFsAccess.mockResolvedValue(undefined);
      mockFsUnlink.mockResolvedValue(undefined);
      mockFsStat.mockResolvedValue({ isDirectory: () => false });

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify directory check was made but no further cleanup attempted
      expect(mockPathResolve).toHaveBeenCalledWith(mockData.outputDir);
      expect(mockFsStat).toHaveBeenCalledWith("/resolved/output/path");
      expect(mockFsReaddir).not.toHaveBeenCalled();
      expect(mockFsRmdir).not.toHaveBeenCalled();

      expect(result).toEqual(mockData);
    });
  });

  describe("top-level error handling", () => {
    it("should handle unexpected errors and return data without throwing", async () => {
      // Setup mocks to throw unexpected error
      mockFsAccess.mockRejectedValue(new Error("Unexpected fs error"));

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify error was logged but not thrown
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Cleanup completed: 0 successful, 6 failed"
      );

      // Verify data is still returned
      expect(result).toEqual(mockData);
    });

    it("should handle Promise.allSettled rejection and return data", async () => {
      // Setup mocks to cause Promise.allSettled to have rejected promises
      mockFsAccess.mockRejectedValue(new Error("Access denied"));
      mockFsUnlink.mockRejectedValue(new Error("Unlink failed"));

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify error handling
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Cleanup completed: 0 successful, 6 failed"
      );

      expect(result).toEqual(mockData);
    });

    it("should handle top-level error and return data without throwing", async () => {
      // Setup mocks to cause a top-level error that triggers the catch block
      // Mock Promise.allSettled to throw an error
      const originalPromiseAllSettled = Promise.allSettled;
      Promise.allSettled = vi.fn().mockImplementation(() => {
        throw new Error("Top-level Promise.allSettled error");
      });

      const result = await cleanupLocalFiles(
        mockData,
        mockServiceContainer,
        mockLogger
      );

      // Verify the top-level error was logged
      expect(mockLogger.log).toHaveBeenCalledWith(
        "[CLEANUP_LOCAL_FILES] Cleanup failed: Error: Top-level Promise.allSettled error"
      );

      // Verify data is still returned
      expect(result).toEqual(mockData);

      // Restore original Promise.allSettled
      Promise.allSettled = originalPromiseAllSettled;
    });
  });
});
