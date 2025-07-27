import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FILE_CONSTANTS } from "../../config/constants";
import { ServiceContainer } from "../../services";
import {
  createConsoleSpies,
  createMockServiceContainer,
  createTestApp,
  createTestEnvironment,
} from "../../test-utils/helpers";
import { HttpStatus } from "../../types";
import { processFilesWithStreaming } from "../../utils/file-processor";
import {
  ErrorHandler,
  createQueueStatusResponse,
  formatLogMessage,
  getHtmlFiles,
  measureExecutionTime,
} from "../../utils/utils";
import { importRouter } from "../import";

// Mock dependencies
vi.mock("../../services", () => ({
  ServiceContainer: {
    getInstance: vi.fn(),
  },
}));

vi.mock("../../middleware/security", () => ({
  SecurityMiddleware: {
    rateLimit: vi.fn(
      () =>
        (
          req: express.Request,
          res: express.Response,
          next: express.NextFunction
        ) =>
          next()
    ),
    validateRequestSize: vi.fn(
      () =>
        (
          req: express.Request,
          res: express.Response,
          next: express.NextFunction
        ) =>
          next()
    ),
  },
}));

vi.mock("../../utils/file-processor", () => ({
  processFilesWithStreaming: vi.fn(),
}));

vi.mock("../../utils/utils", () => ({
  ErrorHandler: {
    createHttpSuccessResponse: vi.fn(),
    handleRouteError: vi.fn(),
  },
  createQueueStatusResponse: vi.fn(),
  formatLogMessage: vi.fn(),
  getHtmlFiles: vi.fn(),
  measureExecutionTime: vi.fn(),
}));

// Mock path module
vi.mock("path", async () => {
  const actual = await vi.importActual("path");
  return {
    ...actual,
    join: vi.fn((...args) => args.join("/")),
  };
});

describe("Import Router", () => {
  let app: express.Application;
  let testEnv: ReturnType<typeof createTestEnvironment>;
  let consoleSpies: ReturnType<typeof createConsoleSpies>;
  let mockServiceContainer: ReturnType<typeof createMockServiceContainer>;

  // Type for mock queue
  type MockQueue = {
    getWaiting: ReturnType<typeof vi.fn>;
    getActive: ReturnType<typeof vi.fn>;
    getCompleted: ReturnType<typeof vi.fn>;
    getFailed: ReturnType<typeof vi.fn>;
  };

  // Type for service container with queues
  type ServiceContainerWithQueues = ReturnType<
    typeof createMockServiceContainer
  > & {
    queues: {
      noteQueue?: MockQueue;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create test app
    app = createTestApp();
    app.use("/import", importRouter);

    // Setup test environment
    testEnv = createTestEnvironment();
    testEnv.setEnv({
      NODE_ENV: "test",
    });

    // Setup console spies
    consoleSpies = createConsoleSpies();

    // Setup mock service container
    mockServiceContainer = createMockServiceContainer();

    // Setup default mock implementations
    (
      ServiceContainer.getInstance as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockServiceContainer);

    // Mock process.cwd to return a consistent test path
    Object.defineProperty(process, "cwd", {
      value: vi.fn().mockReturnValue("/test/cwd"),
      writable: true,
    });

    // Mock getHtmlFiles
    (getHtmlFiles as ReturnType<typeof vi.fn>).mockResolvedValue([
      "file1.html",
      "file2.html",
      "file3.html",
    ]);

    // Mock processFilesWithStreaming
    (processFilesWithStreaming as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalFiles: 3,
      processedFiles: 2,
      failedFiles: 1,
      skippedFiles: 0,
      totalSize: 1024 * 1024, // 1MB
      startTime: new Date("2023-01-01T00:00:00Z"),
      endTime: new Date("2023-01-01T00:00:01Z"),
    });

    // Mock measureExecutionTime
    (measureExecutionTime as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: () => Promise<unknown>, _label: string) => {
        const result = await fn();
        return {
          result,
          duration: 1000,
        };
      }
    );

    // Mock ErrorHandler
    (
      ErrorHandler.createHttpSuccessResponse as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      success: true,
      data: {},
      message: "Success",
    });

    (ErrorHandler.handleRouteError as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        success: false,
        error: "Error occurred",
      }
    );

    // Mock createQueueStatusResponse
    (createQueueStatusResponse as ReturnType<typeof vi.fn>).mockReturnValue({
      success: true,
      data: {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      },
    });

    // Mock formatLogMessage
    (formatLogMessage as ReturnType<typeof vi.fn>).mockReturnValue(
      "Import completed successfully in 1000ms"
    );
  });

  afterEach(() => {
    testEnv.restore();
    consoleSpies.restore();
  });

  describe("POST /import", () => {
    it("should successfully process HTML files and return results", async () => {
      const response = await request(app).post("/import");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: {},
        message: "Success",
      });

      // Verify getHtmlFiles was called with correct parameters
      // Since process.cwd() is resolved at module load time, we need to expect the actual path
      expect(getHtmlFiles).toHaveBeenCalledWith(
        expect.stringContaining("/public/files"),
        [FILE_CONSTANTS.PATHS.EVERNOTE_INDEX_FILE]
      );

      // Verify processFilesWithStreaming was called with correct options
      expect(processFilesWithStreaming).toHaveBeenCalledWith(
        [
          expect.stringContaining("/public/files/file1.html"),
          expect.stringContaining("/public/files/file2.html"),
          expect.stringContaining("/public/files/file3.html"),
        ],
        {
          maxConcurrentFiles: 3,
          maxFileSize: 50 * 1024 * 1024,
          chunkSize: 64 * 1024,
          cleanupAfterProcessing: true,
          validateContent: true,
          cacheResults: true,
        }
      );

      // Verify console logs
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "📊 Processing completed: 2/3 files processed successfully"
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "⏱️ Total processing time: 1000ms"
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "📦 Total size processed: 1.00MB"
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "Import completed successfully in 1000ms"
      );

      // Verify measureExecutionTime was called
      expect(measureExecutionTime).toHaveBeenCalledWith(
        expect.any(Function),
        "Import process"
      );
    });

    it("should handle case when no HTML files are found", async () => {
      (getHtmlFiles as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const response = await request(app).post("/import");

      // When no files are found, the function throws an error which should be handled
      // Since there's no try-catch in the route, this will result in a 500 error
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      // Verify error was thrown and handled
      expect(processFilesWithStreaming).not.toHaveBeenCalled();
    });

    it("should handle processing errors gracefully", async () => {
      const error = new Error("Processing failed");
      (processFilesWithStreaming as ReturnType<typeof vi.fn>).mockRejectedValue(
        error
      );

      const response = await request(app).post("/import");

      // When processing fails, the error should be handled and return 500
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it("should handle getHtmlFiles errors", async () => {
      const error = new Error("Failed to get HTML files");
      (getHtmlFiles as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      const response = await request(app).post("/import");

      // When getHtmlFiles fails, the error should be handled and return 500
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it("should handle measureExecutionTime errors", async () => {
      const error = new Error("Execution time measurement failed");
      (measureExecutionTime as ReturnType<typeof vi.fn>).mockRejectedValue(
        error
      );

      const response = await request(app).post("/import");

      // When measureExecutionTime fails, the error should be handled and return 500
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it("should handle different processing results", async () => {
      (processFilesWithStreaming as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          totalFiles: 5,
          processedFiles: 3,
          failedFiles: 1,
          skippedFiles: 1,
          totalSize: 2 * 1024 * 1024, // 2MB
          startTime: new Date("2023-01-01T00:00:00Z"),
          endTime: new Date("2023-01-01T00:00:02Z"),
        }
      );

      const response = await request(app).post("/import");

      expect(response.status).toBe(HttpStatus.OK);
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "📊 Processing completed: 3/5 files processed successfully"
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "⏱️ Total processing time: 2000ms"
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "📦 Total size processed: 2.00MB"
      );
    });

    it("should handle processing with zero files", async () => {
      (processFilesWithStreaming as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          totalFiles: 0,
          processedFiles: 0,
          failedFiles: 0,
          skippedFiles: 0,
          totalSize: 0,
          startTime: new Date("2023-01-01T00:00:00Z"),
          endTime: new Date("2023-01-01T00:00:00Z"),
        }
      );

      const response = await request(app).post("/import");

      expect(response.status).toBe(HttpStatus.OK);
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "📊 Processing completed: 0/0 files processed successfully"
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "⏱️ Total processing time: 0ms"
      );
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "📦 Total size processed: 0.00MB"
      );
    });

    it("should handle processing with null endTime", async () => {
      (processFilesWithStreaming as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          totalFiles: 1,
          processedFiles: 1,
          failedFiles: 0,
          skippedFiles: 0,
          totalSize: 1024,
          startTime: new Date("2023-01-01T00:00:00Z"),
          endTime: null,
        }
      );

      const response = await request(app).post("/import");

      expect(response.status).toBe(HttpStatus.OK);
      expect(consoleSpies.logSpy).toHaveBeenCalledWith(
        "⏱️ Total processing time: 0ms"
      );
    });
  });

  describe("GET /import/status", () => {
    it("should return queue status successfully", async () => {
      // Mock queue methods
      const mockQueue = {
        getWaiting: vi.fn().mockResolvedValue([{ id: "job1" }, { id: "job2" }]),
        getActive: vi.fn().mockResolvedValue([{ id: "job3" }]),
        getCompleted: vi
          .fn()
          .mockResolvedValue([{ id: "job4" }, { id: "job5" }, { id: "job6" }]),
        getFailed: vi.fn().mockResolvedValue([{ id: "job7" }]),
      };

      (mockServiceContainer as ServiceContainerWithQueues).queues = {
        noteQueue: mockQueue,
      };

      const response = await request(app).get("/import/status");

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        success: true,
        data: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
        },
      });

      // Verify queue methods were called
      expect(mockQueue.getWaiting).toHaveBeenCalled();
      expect(mockQueue.getActive).toHaveBeenCalled();
      expect(mockQueue.getCompleted).toHaveBeenCalled();
      expect(mockQueue.getFailed).toHaveBeenCalled();

      // Verify createQueueStatusResponse was called with correct parameters
      expect(createQueueStatusResponse).toHaveBeenCalledWith(
        [{ id: "job1" }, { id: "job2" }],
        [{ id: "job3" }],
        [{ id: "job4" }, { id: "job5" }, { id: "job6" }],
        [{ id: "job7" }]
      );
    });

    it("should handle ServiceContainer.getInstance errors", async () => {
      const error = new Error("Service container error");
      (
        ServiceContainer.getInstance as ReturnType<typeof vi.fn>
      ).mockRejectedValue(error);

      const response = await request(app).get("/import/status");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Error occurred",
      });

      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        error,
        "get_import_status"
      );
    });

    it("should handle queue method errors", async () => {
      const mockQueue = {
        getWaiting: vi.fn().mockRejectedValue(new Error("Queue error")),
        getActive: vi.fn().mockResolvedValue([]),
        getCompleted: vi.fn().mockResolvedValue([]),
        getFailed: vi.fn().mockResolvedValue([]),
      };

      (mockServiceContainer as ServiceContainerWithQueues).queues = {
        noteQueue: mockQueue,
      };

      const response = await request(app).get("/import/status");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Error occurred",
      });
    });

    it("should handle missing noteQueue", async () => {
      (mockServiceContainer as ServiceContainerWithQueues).queues = {};

      const response = await request(app).get("/import/status");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Error occurred",
      });
    });

    it("should handle Promise.all errors", async () => {
      const mockQueue = {
        getWaiting: vi.fn().mockResolvedValue([]),
        getActive: vi.fn().mockResolvedValue([]),
        getCompleted: vi.fn().mockResolvedValue([]),
        getFailed: vi.fn().mockRejectedValue(new Error("Promise.all error")),
      };

      (mockServiceContainer as ServiceContainerWithQueues).queues = {
        noteQueue: mockQueue,
      };

      const response = await request(app).get("/import/status");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual({
        success: false,
        error: "Error occurred",
      });
    });
  });

  describe("File Processing Options", () => {
    it("should use correct file processing configuration", async () => {
      await request(app).post("/import");

      expect(processFilesWithStreaming).toHaveBeenCalledWith(
        expect.any(Array),
        {
          maxConcurrentFiles: 3,
          maxFileSize: 50 * 1024 * 1024, // 50MB
          chunkSize: 64 * 1024, // 64KB
          cleanupAfterProcessing: true,
          validateContent: true,
          cacheResults: true,
        }
      );
    });
  });

  // Note: Middleware integration tests are not included because middleware is applied
  // at the module level when the router is imported, making it difficult to test
  // the specific middleware calls in isolation. The middleware functionality
  // should be tested separately in the middleware test files.

  describe("Error Handling", () => {
    it("should handle non-Error objects in catch blocks", async () => {
      (processFilesWithStreaming as ReturnType<typeof vi.fn>).mockRejectedValue(
        "String error"
      );

      const response = await request(app).post("/import");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it("should handle null/undefined errors", async () => {
      (processFilesWithStreaming as ReturnType<typeof vi.fn>).mockRejectedValue(
        null
      );

      const response = await request(app).post("/import");

      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
