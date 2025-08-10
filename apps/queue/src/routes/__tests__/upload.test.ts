import express from "express";
import { promises as fs } from "fs";
import path from "path";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceContainer } from "../../services";
import { createMockQueue, createTestApp } from "../../test-utils/helpers";
import { ActionName, HttpStatus } from "../../types";
import { isImageFile } from "../../utils/image-utils";
import {
  ErrorHandler,
  formatLogMessage,
  measureExecutionTime,
} from "../../utils/utils";
import uploadRouter from "../upload";

// Mock the ServiceContainer
vi.mock("../../services", () => ({
  ServiceContainer: {
    getInstance: vi.fn(),
  },
}));

// Mock crypto.randomUUID
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "test-uuid-12345"),
}));

// Mock fs module
vi.mock("fs", () => ({
  promises: {
    mkdir: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock path module
vi.mock("path", () => ({
  default: {
    join: vi.fn(),
    extname: vi.fn(),
    dirname: vi.fn(),
    basename: vi.fn(),
  },
}));

// Mock utils
vi.mock("../../utils/image-utils", () => ({
  isImageFile: vi.fn(),
}));

vi.mock("../../utils/utils", () => ({
  ErrorHandler: {
    createHttpSuccessResponse: vi.fn(),
    handleRouteError: vi.fn(),
  },
  formatLogMessage: vi.fn(),
  measureExecutionTime: vi.fn(),
}));

// Mock SecurityMiddleware
vi.mock("../../middleware/security", () => ({
  SecurityMiddleware: {
    rateLimit: vi.fn(
      () => (req: unknown, res: unknown, next: () => void) => next()
    ),
    validateRequestSize: vi.fn(
      () => (req: unknown, res: unknown, next: () => void) => next()
    ),
  },
}));

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();
const mockConsoleWarn = vi.fn();

describe("Upload Router", () => {
  let app: express.Application;
  let mockServiceContainer: {
    queues: { noteQueue: ReturnType<typeof createMockQueue> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup console mocks
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    console.warn = mockConsoleWarn;

    // Create mock queue
    const mockNoteQueue = createMockQueue("note-queue");

    // Create mock service container
    mockServiceContainer = {
      queues: {
        noteQueue: mockNoteQueue,
      },
    };

    // Setup ServiceContainer mock
    (
      ServiceContainer.getInstance as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockServiceContainer);

    // Setup fs mocks
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(
      "<html><body>Test content</body></html>"
    );
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
    vi.mocked(fs.readdir).mockResolvedValue([
      "image1.jpg",
      "image2.png",
    ] as any);

    // Setup path mocks
    vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
    vi.mocked(path.extname).mockReturnValue(".html");
    vi.mocked(path.dirname).mockReturnValue("/test/dir");
    vi.mocked(path.basename).mockReturnValue("test");

    // Setup utils mocks
    vi.mocked(isImageFile).mockReturnValue(false);
    vi.mocked(ErrorHandler.createHttpSuccessResponse).mockReturnValue({
      success: true,
      data: {},
      message: "Success",
      context: undefined,
      timestamp: "2023-01-01T00:00:00.000Z",
    } as any);
    vi.mocked(ErrorHandler.handleRouteError).mockReturnValue({
      error: {
        message: "Test error",
        type: "ValidationError" as any,
        code: undefined,
      },
      context: {},
      timestamp: "2023-01-01T00:00:00.000Z",
    } as any);
    vi.mocked(formatLogMessage).mockReturnValue("Formatted log message");
    vi.mocked(measureExecutionTime).mockImplementation(
      async (operation, _operationName) => {
        const start = Date.now();
        const result = await operation();
        const duration = Date.now() - start;
        return { result, duration };
      }
    );

    app = createTestApp();
    app.use("/upload", uploadRouter);
  });

  describe("POST /upload", () => {
    it("should successfully process HTML and image files", async () => {
      // Mock isImageFile to return true for image files
      vi.mocked(isImageFile)
        .mockReturnValueOnce(false) // HTML file
        .mockReturnValueOnce(true); // Image file

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .attach("files", Buffer.from("fake image data"), "test.jpg");

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify queue.add was called for HTML file
      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledTimes(
        1
      );
      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        expect.objectContaining({
          content: "<html><body>Test content</body></html>",
          importId: "test-uuid-12345",
          originalFilePath: expect.stringContaining("/uploads/temp/"),
          imageFiles: [],
          options: {
            skipFollowupTasks: false,
          },
        })
      );
    });

    it("should handle no files uploaded", async () => {
      const response = await request(app)
        .post("/upload")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "No files uploaded",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle unsupported file types", async () => {
      // Mock isImageFile to return false for all files
      vi.mocked(isImageFile).mockReturnValue(false);

      const response = await request(app)
        .post("/upload")
        .attach("files", Buffer.from("unsupported content"), "test.txt")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
    });

    it("should handle HTML file processing error", async () => {
      // Mock fs.access to throw an error
      vi.mocked(fs.access).mockRejectedValue(new Error("File not found"));

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle HTML file read error", async () => {
      // Mock fs.readFile to throw an error
      vi.mocked(fs.readFile).mockRejectedValue(new Error("Read error"));

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle queue add error", async () => {
      // Mock queue.add to throw an error
      vi.mocked(mockServiceContainer.queues.noteQueue.add).mockRejectedValue(
        new Error("Queue error")
      );

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle file cleanup error", async () => {
      // Mock fs.unlink to throw an error
      vi.mocked(fs.unlink).mockRejectedValue(new Error("Delete error"));

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle image directory creation error", async () => {
      // Mock fs.mkdir to throw an error for image directory
      vi.mocked(fs.mkdir)
        .mockResolvedValueOnce(undefined) // First call (temp dir) succeeds
        .mockRejectedValueOnce(new Error("Directory creation error")); // Second call (image dir) fails

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle image file move error", async () => {
      // Mock isImageFile to return true for image files
      vi.mocked(isImageFile)
        .mockReturnValueOnce(false) // HTML file
        .mockReturnValueOnce(true); // Image file

      // Mock fs.rename to throw an error
      vi.mocked(fs.rename).mockRejectedValue(new Error("Move error"));

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .attach("files", Buffer.from("fake image data"), "test.jpg")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle source file missing error", async () => {
      // Mock isImageFile to return true for image files
      vi.mocked(isImageFile)
        .mockReturnValueOnce(false) // HTML file
        .mockReturnValueOnce(true); // Image file

      // Mock fs.stat to throw an error for source file
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 1024 } as any) // First call succeeds
        .mockRejectedValueOnce(new Error("Source file missing")); // Second call fails

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .attach("files", Buffer.from("fake image data"), "test.jpg")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle target file verification error", async () => {
      // Mock isImageFile to return true for image files
      vi.mocked(isImageFile)
        .mockReturnValueOnce(false) // HTML file
        .mockReturnValueOnce(true); // Image file

      // Mock fs.stat to succeed for source but fail for target
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ size: 1024 } as any) // Source file
        .mockResolvedValueOnce({ size: 1024 } as any) // Target file (after move)
        .mockRejectedValueOnce(new Error("Target verification error")); // Target verification

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .attach("files", Buffer.from("fake image data"), "test.jpg")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle final directory listing error", async () => {
      // Mock isImageFile to return true for image files
      vi.mocked(isImageFile)
        .mockReturnValueOnce(false) // HTML file
        .mockReturnValueOnce(true); // Image file

      // Mock fs.readdir to throw an error
      vi.mocked(fs.readdir).mockRejectedValue(
        new Error("Directory listing error")
      );

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .attach("files", Buffer.from("fake image data"), "test.jpg")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle processing error", async () => {
      // Mock measureExecutionTime to throw an error
      vi.mocked(measureExecutionTime).mockRejectedValue(
        new Error("Processing error")
      );

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test</body></html>"),
          "test.html"
        )
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        error: {
          message: "Test error",
          type: "ValidationError",
        },
        context: {},
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify ErrorHandler.handleRouteError was called
      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        new Error("Processing error"),
        "unified_upload"
      );
    });

    it("should handle multer error", async () => {
      // This test would require mocking multer to throw an error
      // Since multer is configured in the route, we'll test the error handling
      // by providing invalid data that would cause multer to fail
      const response = await request(app)
        .post("/upload")
        .send("invalid multipart data")
        .set("Content-Type", "multipart/form-data")
        .expect(HttpStatus.BAD_REQUEST);

      // The exact error message depends on multer's behavior
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("edge cases", () => {
    it("should handle empty HTML content", async () => {
      // Mock fs.readFile to return empty content
      vi.mocked(fs.readFile).mockResolvedValue("");

      const response = await request(app)
        .post("/upload")
        .attach("files", Buffer.from(""), "test.html")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify queue.add was called with empty content
      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        expect.objectContaining({
          content: "",
        })
      );
    });

    it("should handle large HTML content", async () => {
      const largeContent = "x".repeat(1000000); // 1MB content
      vi.mocked(fs.readFile).mockResolvedValue(largeContent);

      const response = await request(app)
        .post("/upload")
        .attach("files", Buffer.from(largeContent), "test.html")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify queue.add was called with large content
      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        expect.objectContaining({
          content: largeContent,
        })
      );
    });

    it("should handle multiple HTML files", async () => {
      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test1</body></html>"),
          "test1.html"
        )
        .attach(
          "files",
          Buffer.from("<html><body>Test2</body></html>"),
          "test2.html"
        )
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify queue.add was called for each HTML file
      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledTimes(
        2
      );
    });

    it("should handle multiple image files", async () => {
      // Mock isImageFile to return true for all files
      vi.mocked(isImageFile).mockReturnValue(true);

      const response = await request(app)
        .post("/upload")
        .attach("files", Buffer.from("fake image data"), "test1.jpg")
        .attach("files", Buffer.from("fake image data"), "test2.png")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Unified upload process"
      );
    });

    it("should handle mixed file types", async () => {
      // Mock isImageFile to return true for some files
      vi.mocked(isImageFile)
        .mockReturnValueOnce(false) // HTML file
        .mockReturnValueOnce(true) // Image file
        .mockReturnValueOnce(false) // Another HTML file
        .mockReturnValueOnce(true); // Another image file

      const response = await request(app)
        .post("/upload")
        .attach(
          "files",
          Buffer.from("<html><body>Test1</body></html>"),
          "test1.html"
        )
        .attach("files", Buffer.from("fake image data"), "test1.jpg")
        .attach(
          "files",
          Buffer.from("<html><body>Test2</body></html>"),
          "test2.html"
        )
        .attach("files", Buffer.from("fake image data"), "test2.png")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      });

      // Verify queue.add was called for each HTML file
      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledTimes(
        2
      );
    });
  });
});
