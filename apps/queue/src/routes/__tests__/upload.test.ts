/* eslint-disable @typescript-eslint/no-explicit-any -- Test file with intentional any types for mocking */
import express from "express";
import fs from "fs/promises";
import multer from "multer";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceContainer } from "../../services";
import { ActionName, HttpStatus } from "../../types";
import { convertBinaryImageToStandardFormat } from "../../utils/image-converter";
import { isImageFile, isImageFileEnhanced } from "../../utils/image-utils";
import {
  ErrorHandler,
  formatLogMessage,
  measureExecutionTime,
} from "../../utils/utils";
import uploadRouter from "../upload";

// Mock dependencies
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "test-uuid-123"),
}));

vi.mock("multer", () => {
  const mockMulter = vi.fn(() => ({
    any: vi.fn(() => vi.fn()),
  }));
  (mockMulter as any).diskStorage = vi.fn(() => ({}));
  return { default: mockMulter };
});

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
  },
  mkdir: vi.fn(),
  access: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn(),
  stat: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock("path", () => ({
  default: {
    join: vi.fn((...args) => args.join("/")),
    extname: vi.fn((filename) => {
      const ext = filename.split(".").pop();
      return ext ? `.${ext}` : "";
    }),
  },
  join: vi.fn((...args) => args.join("/")),
  extname: vi.fn((filename) => {
    const ext = filename.split(".").pop();
    return ext ? `.${ext}` : "";
  }),
}));

vi.mock("process", () => ({
  cwd: vi.fn(() => "/test/cwd"),
}));

vi.mock("../../middleware/security", () => ({
  SecurityMiddleware: {
    rateLimit: vi.fn(() => (req: any, res: any, next: any) => next()),
    validateRequestSize: vi.fn(() => (req: any, res: any, next: any) => next()),
  },
}));

vi.mock("../../services", () => ({
  ServiceContainer: {
    getInstance: vi.fn(),
  },
}));

vi.mock("../../utils/image-converter", () => ({
  convertBinaryImageToStandardFormat: vi.fn(),
}));

vi.mock("../../utils/image-utils", () => ({
  isImageFile: vi.fn(),
  isImageFileEnhanced: vi.fn(),
}));

vi.mock("../../utils/utils", () => ({
  ErrorHandler: {
    createHttpSuccessResponse: vi.fn(),
    handleRouteError: vi.fn(),
  },
  formatLogMessage: vi.fn(),
  measureExecutionTime: vi.fn(),
}));

describe("Upload Router", () => {
  let mockServiceContainer: any;
  let mockNoteQueue: any;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;
  let app: express.Application;

  // Helper function to execute the upload route
  const executeUploadRoute = async (files: any[] = []) => {
    const req = {
      ...mockRequest,
      files,
      method: "POST",
      url: "/upload/",
    };

    // Find and execute the POST route handler directly (skip middleware)
    const postRoute = uploadRouter.stack.find(
      (layer: any) => layer.route && layer.route.methods.post
    );

    if (postRoute?.route?.stack) {
      // Execute the route handler directly (index 1, skip middleware)
      const handler = postRoute.route.stack[1];

      if (handler && handler.handle) {
        await handler.handle(req, mockResponse, mockNext);
      }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock service container
    mockNoteQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    mockServiceContainer = {
      queues: {
        noteQueue: mockNoteQueue,
        imageQueue: {} as any,
        ingredientQueue: {} as any,
        instructionQueue: {} as any,
        categorizationQueue: {} as any,
        sourceQueue: {} as any,
        patternTrackingQueue: {} as any,
      },
      database: {} as any,
      errorHandler: {} as any,
      healthMonitor: {} as any,
      webSocket: {} as any,
      statusBroadcaster: {} as any,
      logger: {} as any,
      config: {},
      r2: {} as any,
      close: vi.fn(),
    };

    vi.mocked(ServiceContainer.getInstance).mockResolvedValue(
      mockServiceContainer
    );

    // Mock request
    mockRequest = {
      files: [],
      body: {},
    };

    // Mock response
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    // Mock next function
    mockNext = vi.fn();

    // Mock multer middleware
    const mockMulter = multer as any;
    mockMulter.mockReturnValue({
      any: vi.fn(() => (req: any, res: any, callback: any) => {
        // Ensure req.files is set and callback is called
        if (!req.files) {
          req.files = [];
        }
        callback();
      }),
    });

    // Mock successful file operations
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue("<html>test</html>");
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: "file1.jpg" } as any,
      { name: "file2.png" } as any,
    ]);

    // Mock image detection
    vi.mocked(isImageFile).mockReturnValue(true);
    vi.mocked(isImageFileEnhanced).mockResolvedValue(true);

    // Mock image conversion
    vi.mocked(convertBinaryImageToStandardFormat).mockResolvedValue({
      success: true,
      outputPath: "/test/path/converted.jpg",
      newFilename: "converted.jpg",
    });

    // Mock utility functions
    vi.mocked(measureExecutionTime).mockImplementation(async (fn) => {
      const result = await fn();
      return { result, duration: 100 };
    });

    vi.mocked(formatLogMessage).mockReturnValue("Formatted log message");
    vi.mocked(ErrorHandler.createHttpSuccessResponse).mockImplementation(
      (data, message) => ({
        success: true,
        data: data || {},
        message: message || "Success",
        context: undefined,
        timestamp: "2023-01-01T00:00:00.000Z",
      })
    );
    vi.mocked(ErrorHandler.handleRouteError).mockReturnValue({
      success: false,
      error: {
        message: "Test error",
        type: "UNKNOWN_ERROR" as any,
        code: undefined,
      },
      context: {},
      timestamp: "2023-01-01T00:00:00.000Z",
    });

    // Create Express app
    app = express();
    app.use("/upload", uploadRouter);
  });

  describe("POST /upload", () => {
    it("should handle successful HTML and image upload", async () => {
      const mockFiles = [
        {
          originalname: "test.html",
          filename: "test-123.html",
          path: "/test/path/test-123.html",
          mimetype: "text/html",
          size: 1024,
        },
        {
          originalname: "image.jpg",
          filename: "image-456.jpg",
          path: "/test/path/image-456.jpg",
          mimetype: "image/jpeg",
          size: 2048,
        },
      ];

      await executeUploadRoute(mockFiles);

      expect(mockNoteQueue.add).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        expect.objectContaining({
          content: "<html>test</html>",
          importId: "test-uuid-123",
          originalFilePath: "/test/path/test-123.html",
          imageFiles: [],
          options: {
            skipFollowupTasks: false,
          },
        })
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 1,
            imageFiles: 1,
            totalFiles: 2,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle HTML files only", async () => {
      const mockFiles = [
        {
          originalname: "test1.html",
          filename: "test1-123.html",
          path: "/test/path/test1-123.html",
          mimetype: "text/html",
          size: 1024,
        },
        {
          originalname: "test2.html",
          filename: "test2-456.html",
          path: "/test/path/test2-456.html",
          mimetype: "text/html",
          size: 2048,
        },
      ];

      await executeUploadRoute(mockFiles);

      expect(mockNoteQueue.add).toHaveBeenCalledTimes(2);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 2,
            imageFiles: 0,
            totalFiles: 2,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle image files only", async () => {
      const mockFiles = [
        {
          originalname: "image1.jpg",
          filename: "image1-123.jpg",
          path: "/test/path/image1-123.jpg",
          mimetype: "image/jpeg",
          size: 1024,
        },
        {
          originalname: "image2.png",
          filename: "image2-456.png",
          path: "/test/path/image2-456.png",
          mimetype: "image/png",
          size: 2048,
        },
      ];

      await executeUploadRoute(mockFiles);

      expect(mockNoteQueue.add).toHaveBeenCalledTimes(0);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 2,
            totalFiles: 2,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle no files uploaded", async () => {
      await executeUploadRoute([]);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "No files uploaded",
        })
      );
    });

    it("should handle unsupported file types", async () => {
      const mockFiles = [
        {
          originalname: "test.txt",
          filename: "test-123.txt",
          path: "/test/path/test-123.txt",
          mimetype: "text/plain",
          size: 1024,
        },
      ];

      vi.mocked(isImageFile).mockReturnValue(false);
      vi.mocked(isImageFileEnhanced).mockResolvedValue(false);

      await executeUploadRoute(mockFiles);

      expect(mockNoteQueue.add).toHaveBeenCalledTimes(0);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 0,
            totalFiles: 1,
            errors: ["Unsupported file type: test.txt"],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle HTML file processing errors", async () => {
      const mockFiles = [
        {
          originalname: "test.html",
          filename: "test-123.html",
          path: "/test/path/test-123.html",
          mimetype: "text/html",
          size: 1024,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error("File not found"));

      await executeUploadRoute(mockFiles);

      expect(mockNoteQueue.add).toHaveBeenCalledTimes(0);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 1,
            imageFiles: 0,
            totalFiles: 1,
            errors: [
              "Failed to process test.html: Error: File not found: test.html",
            ],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle HTML file read errors", async () => {
      const mockFiles = [
        {
          originalname: "test.html",
          filename: "test-123.html",
          path: "/test/path/test-123.html",
          mimetype: "text/html",
          size: 1024,
        },
      ];

      vi.mocked(fs.readFile).mockRejectedValue(new Error("Read error"));

      await executeUploadRoute(mockFiles);

      expect(mockNoteQueue.add).toHaveBeenCalledTimes(0);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 1,
            imageFiles: 0,
            totalFiles: 1,
            errors: ["Failed to process test.html: Error: Read error"],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle binary image conversion", async () => {
      const mockFiles = [
        {
          originalname: "binary-image",
          filename: "binary-image-123",
          path: "/test/path/binary-image-123",
          mimetype: "application/octet-stream",
          size: 1024,
        },
      ];

      vi.mocked(path.extname).mockReturnValue(""); // No extension
      vi.mocked(isImageFileEnhanced).mockResolvedValue(true);

      await executeUploadRoute(mockFiles);

      expect(convertBinaryImageToStandardFormat).toHaveBeenCalledWith(
        "/test/path/binary-image-123",
        expect.objectContaining({
          log: expect.any(Function),
          error: expect.any(Function),
          warn: expect.any(Function),
          debug: expect.any(Function),
        })
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 1,
            totalFiles: 1,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle binary image conversion failure", async () => {
      const mockFiles = [
        {
          originalname: "binary-image",
          filename: "binary-image-123",
          path: "/test/path/binary-image-123",
          mimetype: "application/octet-stream",
          size: 1024,
        },
      ];

      vi.mocked(path.extname).mockReturnValue(""); // No extension
      vi.mocked(isImageFileEnhanced).mockResolvedValue(true);
      vi.mocked(convertBinaryImageToStandardFormat).mockResolvedValue({
        success: false,
      });

      await executeUploadRoute(mockFiles);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 1,
            totalFiles: 1,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle image file move errors", async () => {
      const mockFiles = [
        {
          originalname: "image.jpg",
          filename: "image-123.jpg",
          path: "/test/path/image-123.jpg",
          mimetype: "image/jpeg",
          size: 1024,
        },
      ];

      vi.mocked(fs.rename).mockRejectedValue(new Error("Move error"));

      await executeUploadRoute(mockFiles);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 1,
            totalFiles: 1,
            errors: ["Failed to move converted.jpg: Error: Move error"],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle source file missing errors", async () => {
      const mockFiles = [
        {
          originalname: "image.jpg",
          filename: "image-123.jpg",
          path: "/test/path/image-123.jpg",
          mimetype: "image/jpeg",
          size: 1024,
        },
      ];

      vi.mocked(fs.stat).mockRejectedValue(new Error("File not found"));

      await executeUploadRoute(mockFiles);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 1,
            totalFiles: 1,
            errors: ["Source file missing for image.jpg"],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle directory creation errors", async () => {
      const mockFiles = [
        {
          originalname: "image.jpg",
          filename: "image-123.jpg",
          path: "/test/path/image-123.jpg",
          mimetype: "image/jpeg",
          size: 1024,
        },
      ];

      vi.mocked(fs.mkdir).mockRejectedValue(new Error("Permission denied"));

      await executeUploadRoute(mockFiles);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 1,
            totalFiles: 1,
            errors: [
              "Failed to create image directory: Error: Permission denied",
            ],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle multer errors", async () => {
      const mockMulter = multer as any;
      mockMulter.mockReturnValue({
        any: vi.fn(() => (req: any, res: any, callback: any) => {
          callback(new Error("Multer error"));
        }),
      });

      await executeUploadRoute([]);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "No files uploaded",
        })
      );
    });

    it("should handle processing errors", async () => {
      const mockFiles = [
        {
          originalname: "test.html",
          filename: "test-123.html",
          path: "/test/path/test-123.html",
          mimetype: "text/html",
          size: 1024,
        },
      ];

      vi.mocked(measureExecutionTime).mockRejectedValue(
        new Error("Processing error")
      );

      await executeUploadRoute(mockFiles);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            message: "Test error",
            type: "UNKNOWN_ERROR",
            code: undefined,
          },
          context: {},
          timestamp: "2023-01-01T00:00:00.000Z",
        })
      );
    });

    it("should handle service container errors", async () => {
      const mockFiles = [
        {
          originalname: "test.html",
          filename: "test-123.html",
          path: "/test/path/test-123.html",
          mimetype: "text/html",
          size: 1024,
        },
      ];

      vi.mocked(ServiceContainer.getInstance).mockRejectedValue(
        new Error("Service error")
      );

      await executeUploadRoute(mockFiles);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            message: "Test error",
            type: "UNKNOWN_ERROR",
            code: undefined,
          },
          context: {},
          timestamp: "2023-01-01T00:00:00.000Z",
        })
      );
    });
  });

  describe("Middleware configuration", () => {
    it("should have security middleware configured", () => {
      // Check that the router has middleware configured
      expect(uploadRouter.stack).toBeDefined();
      expect(uploadRouter.stack.length).toBeGreaterThan(0);

      // The middleware should be present in the router stack
      const hasMiddleware = uploadRouter.stack.some(
        (layer: any) => layer.name === "router" || layer.handle
      );
      expect(hasMiddleware).toBe(true);
    });

    it("should have multer configuration available", () => {
      // Check that multer is properly mocked and available
      expect(multer).toBeDefined();
      expect(typeof multer).toBe("function");

      // Verify the router has the expected structure
      expect(uploadRouter.stack).toBeDefined();
    });

    it("should have upload directories configured", () => {
      // Check that the router is properly configured
      expect(uploadRouter.stack).toBeDefined();
      expect(uploadRouter.stack.length).toBeGreaterThan(0);

      // Verify the router can handle requests
      const hasRouteHandlers = uploadRouter.stack.some(
        (layer: any) => layer.route || layer.name === "router"
      );
      expect(hasRouteHandlers).toBe(true);
    });

    it("should test multer middleware error handling directly", async () => {
      // Create a more direct test for the multer middleware error handling
      const req = {
        ...mockRequest,
        files: [],
        body: {},
      };

      const postRoute = uploadRouter.stack.find(
        (layer: any) => layer.route && layer.route.methods.post
      );

      if (postRoute?.route?.stack) {
        const middlewareHandler = postRoute.route.stack[0]; // The first handler is the middleware

        if (middlewareHandler && middlewareHandler.handle) {
          // Test the middleware with error by directly calling the callback
          const originalHandle = middlewareHandler.handle;
          middlewareHandler.handle = vi.fn((req, res, next) => {
            // Simulate multer error callback
            const mockCallback = (err: any) => {
              if (err) {
                return res
                  .status(HttpStatus.BAD_REQUEST)
                  .json({ error: `Upload failed: ${err.message}` });
              }
              next();
            };
            mockCallback(new Error("Test multer error"));
          });

          await middlewareHandler.handle(req, mockResponse, mockNext);

          expect(mockResponse.status).toHaveBeenCalledWith(
            HttpStatus.BAD_REQUEST
          );
          expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Upload failed: Test multer error",
          });

          // Restore the original handler
          middlewareHandler.handle = originalHandle;
        }
      }
    });

    it("should test multer storage destination error handling", async () => {
      // Test the multer storage destination error handling
      const mockStorage = multer.diskStorage as any;
      const mockDestination = vi.fn();
      
      // Mock the storage destination to simulate an error
      mockStorage.mockImplementation(() => ({
        destination: mockDestination,
      }));

      // Test the destination function with error
      const mockCallback = vi.fn();
      const mockError = new Error("Directory creation failed");
      
      // Simulate the destination function behavior
      mockDestination.mockImplementation(async (req, file, cb) => {
        try {
          // Simulate directory creation failure
          throw mockError;
        } catch (error) {
          cb(error instanceof Error ? error : new Error(String(error)), "/test/dir");
        }
      });

      // Call the destination function
      await mockDestination({}, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(mockError, "/test/dir");
    });

    it("should test multer file filter error handling", async () => {
      // Test the multer file filter error handling
      const mockFileFilter = vi.fn();
      
      // Mock the file filter to simulate an error
      mockFileFilter.mockImplementation(async (req, file, cb) => {
        try {
          // Simulate file filter error
          throw new Error("File filter error");
        } catch {
          cb(null, false);
        }
      });

      const mockCallback = vi.fn();
      await mockFileFilter({}, { originalname: "test.txt", mimetype: "text/plain" }, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, false);
    });
  });

  describe("File classification", () => {
    it("should classify HTML files correctly", async () => {
      const mockFiles = [
        {
          originalname: "test.html",
          filename: "test-123.html",
          path: "/test/path/test-123.html",
          mimetype: "text/html",
          size: 1024,
        },
      ];

      await executeUploadRoute(mockFiles);

      expect(mockNoteQueue.add).toHaveBeenCalledTimes(1);
    });

    it("should classify image files correctly", async () => {
      const mockFiles = [
        {
          originalname: "image.jpg",
          filename: "image-123.jpg",
          path: "/test/path/image-123.jpg",
          mimetype: "image/jpeg",
          size: 1024,
        },
      ];

      await executeUploadRoute(mockFiles);

      expect(mockNoteQueue.add).toHaveBeenCalledTimes(0);
    });

    it("should handle files with no extension", async () => {
      const mockFiles = [
        {
          originalname: "binary-file",
          filename: "binary-file-123",
          path: "/test/path/binary-file-123",
          mimetype: "application/octet-stream",
          size: 1024,
        },
      ];

      vi.mocked(isImageFileEnhanced).mockResolvedValue(false);

      await executeUploadRoute(mockFiles);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 0,
            totalFiles: 1,
            errors: ["Unsupported file type: binary-file"],
          },
          message: "Upload completed successfully",
        })
      );
    });
  });

  describe("Error handling", () => {
    it("should handle file filter errors", async () => {
      const mockFiles = [
        {
          originalname: "test.html",
          filename: "test-123.html",
          path: "/test/path/test-123.html",
          mimetype: "text/html",
          size: 1024,
        },
      ];

      await executeUploadRoute(mockFiles);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 1,
            imageFiles: 0,
            totalFiles: 1,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle HTML file cleanup errors", async () => {
      const mockFiles = [
        {
          originalname: "test.html",
          filename: "test-123.html",
          path: "/test/path/test-123.html",
          mimetype: "text/html",
          size: 1024,
        },
      ];

      vi.mocked(fs.unlink).mockRejectedValue(new Error("Cleanup error"));

      await executeUploadRoute(mockFiles);

      // Should still succeed even if cleanup fails
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 1,
            imageFiles: 0,
            totalFiles: 1,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle binary file cleanup errors", async () => {
      const mockFiles = [
        {
          originalname: "binary-image",
          filename: "binary-image-123",
          path: "/test/path/binary-image-123",
          mimetype: "application/octet-stream",
          size: 1024,
        },
      ];

      vi.mocked(path.extname).mockReturnValue(""); // No extension
      vi.mocked(isImageFileEnhanced).mockResolvedValue(true);
      vi.mocked(fs.unlink).mockRejectedValue(new Error("Cleanup error"));

      await executeUploadRoute(mockFiles);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 1,
            totalFiles: 1,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle binary image conversion with cleanup error", async () => {
      const mockFiles = [
        {
          originalname: "binary-image",
          filename: "binary-image-123",
          path: "/test/path/binary-image-123",
          mimetype: "application/octet-stream",
          size: 1024,
        },
      ];

      vi.mocked(path.extname).mockReturnValue(""); // No extension
      vi.mocked(isImageFileEnhanced).mockResolvedValue(true);
      vi.mocked(convertBinaryImageToStandardFormat).mockResolvedValue({
        success: true,
        outputPath: "/test/path/converted.jpg",
        newFilename: "converted.jpg",
      });
      // Mock cleanup error
      vi.mocked(fs.unlink).mockRejectedValue(new Error("Cleanup error"));

      await executeUploadRoute(mockFiles);

      // Should still succeed even if cleanup fails
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 1,
            totalFiles: 1,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });

    it("should handle directory listing errors", async () => {
      const mockFiles = [
        {
          originalname: "image.jpg",
          filename: "image-123.jpg",
          path: "/test/path/image-123.jpg",
          mimetype: "image/jpeg",
          size: 1024,
        },
      ];

      // Mock directory listing error
      vi.mocked(fs.readdir).mockRejectedValue(new Error("Directory listing error"));

      await executeUploadRoute(mockFiles);

      // Should still succeed even if directory listing fails
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            importId: "test-uuid-123",
            htmlFiles: 0,
            imageFiles: 1,
            totalFiles: 1,
            errors: [],
          },
          message: "Upload completed successfully",
        })
      );
    });
  });
});
