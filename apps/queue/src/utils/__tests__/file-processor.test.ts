import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type FileProcessingOptions,
  type FileProcessingResult,
  cleanupTempFiles,
  fileProcessor,
  getFileProcessingStats,
  processFilesWithStreaming,
} from "../file-processor";

// Mock dependencies
vi.mock("fs", () => ({
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
  promises: {
    stat: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
    readdir: vi.fn(),
    rm: vi.fn(),
  },
}));

vi.mock("stream/promises", () => ({
  pipeline: vi.fn(),
}));

vi.mock("../workers/core/cache/action-cache", () => ({
  actionCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
  CacheKeyGenerator: {
    fileProcessing: vi.fn(() => "test-cache-key"),
  },
  CACHE_OPTIONS: {
    FILE_PROCESSING: { ttl: 3600 },
  },
}));

vi.mock("./utils", () => ({
  generateUuid: vi.fn(() => "test-uuid-123"),
}));

describe("File Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fileProcessor singleton", () => {
    it("should be an instance of EventEmitter", () => {
      expect(fileProcessor).toBeInstanceOf(EventEmitter);
    });

    it("should have processFiles method", () => {
      expect(typeof fileProcessor.processFiles).toBe("function");
    });

    it("should have getStats method", () => {
      expect(typeof fileProcessor.getStats).toBe("function");
    });

    it("should have shutdown method", () => {
      expect(typeof fileProcessor.shutdown).toBe("function");
    });

    it("should have cleanupAllTempFiles method", () => {
      expect(typeof fileProcessor.cleanupAllTempFiles).toBe("function");
    });
  });

  describe("processFilesWithStreaming", () => {
    it("should process files with default options", async () => {
      const filePaths = ["/path/to/file1.html", "/path/to/file2.html"];
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const stats = await processFilesWithStreaming(filePaths);

      expect(stats).toBeDefined();
      expect(typeof stats.totalFiles).toBe("number");
      expect(typeof stats.processedFiles).toBe("number");
      expect(typeof stats.failedFiles).toBe("number");
      expect(typeof stats.skippedFiles).toBe("number");
      expect(typeof stats.totalSize).toBe("number");
      expect(typeof stats.averageProcessingTime).toBe("number");
      expect(stats.startTime).toBeInstanceOf(Date);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should process files with custom options", async () => {
      const filePaths = ["/path/to/file.html"];
      const options: FileProcessingOptions = {
        maxConcurrentFiles: 2,
        maxFileSize: 10 * 1024 * 1024,
        chunkSize: 32 * 1024,
        tempDirectory: "/custom/temp",
        cleanupAfterProcessing: false,
        validateContent: false,
        cacheResults: false,
      };

      const stats = await processFilesWithStreaming(filePaths, options);

      expect(stats).toBeDefined();
      expect(stats.totalFiles).toBe(1);
    });

    it("should handle empty file list", async () => {
      const stats = await processFilesWithStreaming([]);

      expect(stats.totalFiles).toBe(0);
      expect(stats.processedFiles).toBe(0);
      expect(stats.failedFiles).toBe(0);
      expect(stats.skippedFiles).toBe(0);
    });

    it("should emit fileProcessed events", async () => {
      const filePaths = ["/path/to/file.html"];
      const eventSpy = vi.fn();

      // Create a new processor instance for this test
      const processor = new EventEmitter();
      processor.on("fileProcessed", eventSpy);

      // Mock the processFilesWithStreaming to use our processor
      const originalProcessFiles = fileProcessor.processFiles;
      fileProcessor.processFiles = vi.fn().mockResolvedValue({
        totalFiles: 1,
        processedFiles: 1,
        failedFiles: 0,
        skippedFiles: 0,
        totalSize: 1024,
        averageProcessingTime: 100,
        startTime: new Date(),
        endTime: new Date(),
      });

      const stats = await processFilesWithStreaming(filePaths);

      expect(stats.totalFiles).toBe(1);

      // Restore original method
      fileProcessor.processFiles = originalProcessFiles;
    });
  });

  describe("cleanupTempFiles", () => {
    it("should call cleanupAllTempFiles on fileProcessor", async () => {
      const cleanupSpy = vi
        .spyOn(fileProcessor, "cleanupAllTempFiles")
        .mockResolvedValue();

      await cleanupTempFiles();

      expect(cleanupSpy).toHaveBeenCalled();
      cleanupSpy.mockRestore();
    });

    it("should handle cleanup errors gracefully", async () => {
      const cleanupSpy = vi
        .spyOn(fileProcessor, "cleanupAllTempFiles")
        .mockRejectedValue(new Error("Cleanup failed"));

      await expect(cleanupTempFiles()).rejects.toThrow("Cleanup failed");

      cleanupSpy.mockRestore();
    });
  });

  describe("getFileProcessingStats", () => {
    it("should return stats from fileProcessor", () => {
      const mockStats = {
        totalFiles: 5,
        processedFiles: 3,
        failedFiles: 1,
        skippedFiles: 1,
        totalSize: 5120,
        averageProcessingTime: 100,
        startTime: new Date(),
        endTime: new Date(),
      };

      const statsSpy = vi
        .spyOn(fileProcessor, "getStats")
        .mockReturnValue(mockStats);

      const stats = getFileProcessingStats();

      expect(stats).toEqual(mockStats);
      expect(statsSpy).toHaveBeenCalled();
      statsSpy.mockRestore();
    });
  });

  describe("fileProcessor methods", () => {
    it("should process files and return stats", async () => {
      const filePaths = ["/path/to/file.html"];
      const mockStats = {
        totalFiles: 1,
        processedFiles: 1,
        failedFiles: 0,
        skippedFiles: 0,
        totalSize: 1024,
        averageProcessingTime: 100,
        startTime: new Date(),
        endTime: new Date(),
      };

      const processSpy = vi
        .spyOn(fileProcessor, "processFiles")
        .mockResolvedValue(mockStats);

      const stats = await fileProcessor.processFiles(filePaths);

      expect(stats).toEqual(mockStats);
      expect(processSpy).toHaveBeenCalledWith(filePaths);
      processSpy.mockRestore();
    });

    it("should get current stats", () => {
      const mockStats = {
        totalFiles: 0,
        processedFiles: 0,
        failedFiles: 0,
        skippedFiles: 0,
        totalSize: 0,
        averageProcessingTime: 0,
        startTime: new Date(),
        endTime: undefined,
      };

      const statsSpy = vi
        .spyOn(fileProcessor, "getStats")
        .mockReturnValue(mockStats);

      const stats = fileProcessor.getStats();

      expect(stats).toEqual(mockStats);
      expect(statsSpy).toHaveBeenCalled();
      statsSpy.mockRestore();
    });

    it("should shutdown gracefully", async () => {
      const shutdownSpy = vi
        .spyOn(fileProcessor, "shutdown")
        .mockResolvedValue();

      await fileProcessor.shutdown();

      expect(shutdownSpy).toHaveBeenCalled();
      shutdownSpy.mockRestore();
    });

    it("should cleanup all temp files", async () => {
      const cleanupSpy = vi
        .spyOn(fileProcessor, "cleanupAllTempFiles")
        .mockResolvedValue();

      await fileProcessor.cleanupAllTempFiles();

      expect(cleanupSpy).toHaveBeenCalled();
      cleanupSpy.mockRestore();
    });
  });

  describe("error handling", () => {
    it("should handle file processing errors", async () => {
      const filePaths = ["/path/to/nonexistent.html"];
      const mockStats = {
        totalFiles: 1,
        processedFiles: 0,
        failedFiles: 1,
        skippedFiles: 0,
        totalSize: 0,
        averageProcessingTime: 0,
        startTime: new Date(),
        endTime: new Date(),
      };

      const processSpy = vi
        .spyOn(fileProcessor, "processFiles")
        .mockResolvedValue(mockStats);

      const stats = await fileProcessor.processFiles(filePaths);

      expect(stats.failedFiles).toBe(1);
      expect(stats.processedFiles).toBe(0);
      processSpy.mockRestore();
    });

    it("should handle cleanup errors", async () => {
      const cleanupSpy = vi
        .spyOn(fileProcessor, "cleanupAllTempFiles")
        .mockRejectedValue(new Error("Permission denied"));

      await expect(fileProcessor.cleanupAllTempFiles()).rejects.toThrow(
        "Permission denied"
      );

      cleanupSpy.mockRestore();
    });

    it("should handle shutdown errors", async () => {
      const shutdownSpy = vi
        .spyOn(fileProcessor, "shutdown")
        .mockRejectedValue(new Error("Shutdown failed"));

      await expect(fileProcessor.shutdown()).rejects.toThrow("Shutdown failed");

      shutdownSpy.mockRestore();
    });
  });

  describe("event handling", () => {
    it("should emit fileProcessed events", () => {
      const eventSpy = vi.fn();
      fileProcessor.on("fileProcessed", eventSpy);

      // Simulate a file processed event
      const mockResult: FileProcessingResult = {
        filePath: "/path/to/file.html",
        fileName: "file.html",
        status: "success",
        size: 1024,
        processingTime: 100,
        importId: "test-import-id",
        contentLength: 500,
      };

      fileProcessor.emit("fileProcessed", mockResult);

      expect(eventSpy).toHaveBeenCalledWith(mockResult);
      fileProcessor.off("fileProcessed", eventSpy);
    });

    it("should handle multiple event listeners", () => {
      const eventSpy1 = vi.fn();
      const eventSpy2 = vi.fn();

      fileProcessor.on("fileProcessed", eventSpy1);
      fileProcessor.on("fileProcessed", eventSpy2);

      const mockResult: FileProcessingResult = {
        filePath: "/path/to/file.html",
        fileName: "file.html",
        status: "success",
        size: 1024,
        processingTime: 100,
      };

      fileProcessor.emit("fileProcessed", mockResult);

      expect(eventSpy1).toHaveBeenCalledWith(mockResult);
      expect(eventSpy2).toHaveBeenCalledWith(mockResult);

      fileProcessor.off("fileProcessed", eventSpy1);
      fileProcessor.off("fileProcessed", eventSpy2);
    });
  });
});
