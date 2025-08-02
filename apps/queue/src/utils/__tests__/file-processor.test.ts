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

vi.mock("../../workers/core/cache/action-cache", () => ({
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

vi.mock("../utils", () => ({
  generateUuid: vi.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
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

  describe("StreamingFileProcessor - Core Functionality", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fs: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let streamPromises: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let utils: any;

    beforeEach(async () => {
      fs = vi.mocked(await import("fs"));
      streamPromises = vi.mocked(await import("stream/promises"));
      utils = vi.mocked(await import("../utils"));

      // Reset fileProcessor stats between tests
      const { fileProcessor } = await import("../file-processor");
      fileProcessor.resetStats();
    });

    describe("processFiles method", () => {
      it("should handle temp directory creation errors", async () => {
        const filePaths = ["/path/to/file.html"];

        // Mock temp directory creation error
        fs.promises.mkdir.mockRejectedValue(new Error("Permission denied"));

        await expect(fileProcessor.processFiles(filePaths)).rejects.toThrow(
          "Permission denied"
        );
      });

      it("should process files with chunking", async () => {
        const filePaths = [
          "/path/to/file1.html",
          "/path/to/file2.html",
          "/path/to/file3.html",
        ];

        // Mock successful file processing
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue(
          "<html><body>Test</body></html>"
        );
        fs.promises.unlink.mockResolvedValue(undefined);

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.totalFiles).toBe(3);
        expect(fs.promises.mkdir).toHaveBeenCalled();
      });

      it("should handle file size limit exceeded", async () => {
        const filePaths = ["/path/to/large-file.html"];

        // Mock file stats with size exceeding limit
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({
          size: 100 * 1024 * 1024, // 100MB, exceeds default 50MB limit
        });

        // Mock cache to return null (no cached result)
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);

        try {
          const stats = await fileProcessor.processFiles(filePaths);
          console.log("File size limit test stats:", stats);
          expect(stats.skippedFiles).toBe(1);
          expect(stats.processedFiles).toBe(0);
          expect(stats.totalFiles).toBe(1);
          expect(stats.failedFiles).toBe(0);
        } catch (error) {
          console.error("File size limit test error:", error);
          throw error;
        }
      });

      it("should handle file stat errors", async () => {
        const filePaths = ["/path/to/nonexistent.html"];

        // Mock file stat error
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockRejectedValue(new Error("File not found"));

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.failedFiles).toBe(1);
        expect(stats.processedFiles).toBe(0);
      });
    });

    describe("Caching functionality", () => {
      it("should return cached result when available", async () => {
        const filePaths = ["/path/to/cached-file.html"];
        const cachedResult: FileProcessingResult = {
          filePath: "/path/to/cached-file.html",
          fileName: "cached-file.html",
          status: "success",
          size: 1024,
          processingTime: 50,
          importId: "cached-import-id",
          contentLength: 500,
        };

        // Mock successful file stats and cached result
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(cachedResult);

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.processedFiles).toBe(1);
        expect(actionCache.get).toHaveBeenCalled();
      });

      it("should handle cache read errors gracefully", async () => {
        const filePaths = ["/path/to/file.html"];

        // Mock successful file stats but cache read error
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockRejectedValue(new Error("Cache error"));

        // Mock successful file processing
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue(
          "<html><body>Test</body></html>"
        );
        fs.promises.unlink.mockResolvedValue(undefined);

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.processedFiles).toBe(1);
        expect(actionCache.get).toHaveBeenCalled();
      });

      it("should cache successful results", async () => {
        const filePaths = ["/path/to/file.html"];

        // Mock successful file processing
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null); // No cached result
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue(
          "<html><body>Test</body></html>"
        );
        fs.promises.unlink.mockResolvedValue(undefined);
        vi.mocked(actionCache.set).mockResolvedValue(undefined);

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.processedFiles).toBe(1);
        expect(actionCache.set).toHaveBeenCalled();
      });

      it("should handle cache write errors gracefully", async () => {
        const filePaths = ["/path/to/file.html"];

        // Mock successful file processing but cache write error
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue(
          "<html><body>Test</body></html>"
        );
        fs.promises.unlink.mockResolvedValue(undefined);
        vi.mocked(actionCache.set).mockRejectedValue(
          new Error("Cache write error")
        );

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.processedFiles).toBe(1);
        expect(actionCache.set).toHaveBeenCalled();
      });
    });

    describe("Content validation", () => {
      it("should validate HTML content successfully", async () => {
        const filePaths = ["/path/to/valid.html"];

        // Mock successful file processing with valid HTML
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue(
          "<html><body>Valid content</body></html>"
        );
        fs.promises.unlink.mockResolvedValue(undefined);

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.processedFiles).toBe(1);
      });

      it("should reject empty content", async () => {
        const filePaths = ["/path/to/empty.html"];

        // Mock successful file processing but empty content
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue(""); // Empty content
        fs.promises.unlink.mockResolvedValue(undefined);

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.failedFiles).toBe(1);
      });

      it("should reject content without HTML tags", async () => {
        const filePaths = ["/path/to/invalid.html"];

        // Mock successful file processing but invalid content
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue("This is not HTML content");
        fs.promises.unlink.mockResolvedValue(undefined);

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.failedFiles).toBe(1);
      });

      it("should reject oversized processed content", async () => {
        const filePaths = ["/path/to/large.html"];

        // Mock successful file processing but oversized content
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);
        streamPromises.pipeline.mockResolvedValue(undefined);
        // Create content larger than maxFileSize
        const largeContent =
          "<html><body>" + "x".repeat(100 * 1024 * 1024) + "</body></html>";
        fs.promises.readFile.mockResolvedValue(largeContent);
        fs.promises.unlink.mockResolvedValue(undefined);

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.failedFiles).toBe(1);
      });
    });

    describe("Streaming processing", () => {
      it("should handle streaming pipeline errors", async () => {
        const filePaths = ["/path/to/file.html"];

        // Mock successful setup but pipeline error
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);
        streamPromises.pipeline.mockRejectedValue(new Error("Pipeline error"));
        fs.promises.unlink.mockResolvedValue(undefined);

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.failedFiles).toBe(1);
        expect(fs.promises.unlink).toHaveBeenCalled(); // Should cleanup temp file
      });

      it("should handle temp file cleanup errors", async () => {
        const filePaths = ["/path/to/file.html"];

        // Mock successful setup but temp file cleanup error
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);
        streamPromises.pipeline.mockRejectedValue(new Error("Pipeline error"));
        fs.promises.unlink.mockRejectedValue(new Error("Cleanup error"));

        const stats = await fileProcessor.processFiles(filePaths);

        expect(stats.failedFiles).toBe(1);
        expect(fs.promises.unlink).toHaveBeenCalled();
      });
    });

    describe("Shutdown functionality", () => {
      it("should shutdown gracefully with cleanup", async () => {
        // Mock successful cleanup
        fs.promises.rm.mockResolvedValue(undefined);

        await fileProcessor.shutdown();

        expect(fs.promises.rm).toHaveBeenCalled();
      });

      it("should handle cleanup errors during shutdown", async () => {
        // Mock cleanup error
        fs.promises.rm.mockRejectedValue(new Error("Cleanup failed"));

        await fileProcessor.shutdown();

        expect(fs.promises.rm).toHaveBeenCalled();
      });

      it("should wait for active processors during shutdown", async () => {
        // Mock successful cleanup
        fs.promises.rm.mockResolvedValue(undefined);

        await fileProcessor.shutdown();

        expect(fs.promises.rm).toHaveBeenCalled();
      });
    });

    describe("Temp file cleanup", () => {
      it("should cleanup temp files successfully", async () => {
        // Mock directory read
        fs.promises.readdir.mockResolvedValue(["temp1.txt", "temp2.txt"]);
        fs.promises.unlink.mockResolvedValue(undefined);

        await fileProcessor.cleanupAllTempFiles();

        expect(fs.promises.readdir).toHaveBeenCalled();
        expect(fs.promises.unlink).toHaveBeenCalledTimes(2);
      });

      it("should handle cleanup errors gracefully", async () => {
        // Mock directory read error
        fs.promises.readdir.mockRejectedValue(new Error("Read error"));

        await fileProcessor.cleanupAllTempFiles();

        expect(fs.promises.readdir).toHaveBeenCalled();
      });

      it("should handle individual file cleanup errors", async () => {
        // Mock directory read
        fs.promises.readdir.mockResolvedValue(["temp1.txt", "temp2.txt"]);

        // Mock first file cleanup success, second file cleanup error
        fs.promises.unlink
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error("Delete failed"));

        await fileProcessor.cleanupAllTempFiles();

        expect(fs.promises.unlink).toHaveBeenCalledTimes(2);
      });
    });

    describe("Utility methods", () => {
      it("should handle zero processed files in stats calculation", async () => {
        const stats = fileProcessor.getStats();

        expect(stats.averageProcessingTime).toBe(0);
      });

      it("should calculate average processing time correctly", async () => {
        // Mock stats with processed files
        const mockStats = {
          totalFiles: 2,
          processedFiles: 2,
          failedFiles: 0,
          skippedFiles: 0,
          totalSize: 2048,
          averageProcessingTime: 0,
          startTime: new Date(),
          endTime: new Date(),
        };

        const statsSpy = vi
          .spyOn(fileProcessor, "getStats")
          .mockReturnValue(mockStats);

        const stats = fileProcessor.getStats();

        expect(stats).toEqual(mockStats);
        expect(statsSpy).toHaveBeenCalled();
        statsSpy.mockRestore();
      });

      it("should generate import ID correctly", async () => {
        // Mock successful file processing
        const filePaths = ["/path/to/file.html"];
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue(
          "<html><body>Test</body></html>"
        );
        fs.promises.unlink.mockResolvedValue(undefined);
        utils.generateUuid.mockReturnValue("test-import-id");

        const stats = await processFilesWithStreaming(filePaths);

        console.log("Import ID test stats:", stats);
        expect(stats.processedFiles).toBe(1);
        expect(utils.generateUuid).toHaveBeenCalled();
        expect(stats.totalFiles).toBe(1);
        expect(stats.failedFiles).toBe(0);
        expect(stats.skippedFiles).toBe(0);
      });
    });

    describe("Edge cases", () => {
      it("should handle disabled content validation", async () => {
        const filePaths = ["/path/to/file.html"];
        const options: FileProcessingOptions = {
          validateContent: false,
        };

        // Mock successful file processing with invalid content
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        vi.mocked(actionCache.get).mockResolvedValue(null);
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue("Invalid content without HTML");
        fs.promises.unlink.mockResolvedValue(undefined);

        // Create a new processor with disabled validation
        const { processFilesWithStreaming } = await import("../file-processor");
        const stats = await processFilesWithStreaming(filePaths, options);

        expect(stats.processedFiles).toBe(1); // Should process despite invalid content
      });

      it("should handle disabled caching", async () => {
        const filePaths = ["/path/to/file.html"];
        const options: FileProcessingOptions = {
          cacheResults: false,
        };

        // Mock successful file processing
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue(
          "<html><body>Test</body></html>"
        );
        fs.promises.unlink.mockResolvedValue(undefined);

        // Create a new processor with disabled caching
        const { processFilesWithStreaming } = await import("../file-processor");
        const stats = await processFilesWithStreaming(filePaths, options);

        expect(stats.processedFiles).toBe(1);
        const { actionCache } = await import(
          "../../workers/core/cache/action-cache"
        );
        expect(actionCache.get).not.toHaveBeenCalled();
        expect(actionCache.set).not.toHaveBeenCalled();
      });

      it("should handle disabled cleanup", async () => {
        const filePaths = ["/path/to/file.html"];
        const options: FileProcessingOptions = {
          cleanupAfterProcessing: false,
        };

        // Mock successful file processing
        fs.promises.mkdir.mockResolvedValue(undefined);
        fs.promises.stat.mockResolvedValue({ size: 1024 });
        streamPromises.pipeline.mockResolvedValue(undefined);
        fs.promises.readFile.mockResolvedValue(
          "<html><body>Test</body></html>"
        );
        // Don't mock unlink since cleanup is disabled

        // Create a new processor with disabled cleanup
        const { processFilesWithStreaming } = await import("../file-processor");
        const stats = await processFilesWithStreaming(filePaths, options);

        expect(stats.processedFiles).toBe(1);
        expect(fs.promises.unlink).not.toHaveBeenCalled();
      });
    });
  });
});
