/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  setupWorkerTestEnvironment,
  cleanupWorkerTestEnvironment,
  mockWithErrorHandling,
  mockLogError,
  mockShouldRetry,
  mockCalculateBackoff,
  mockCreateJobError,
  mockClassifyError,
  mockValidateJobData,
  mockHealthMonitor,
  mockParseHTML,
  mockAddStatusEventAndBroadcast,
} from "../../utils/worker-test-utils";
import { ErrorType, ErrorSeverity } from "../../../types";
import { QueueError } from "../../../utils/error-handler";
import { TestNote, TestFile } from "./types";

describe("Notes Process Job", () => {
  let testSetup: any;
  let mockDeps: {
    parseHTML: ReturnType<typeof vi.fn>;
    createNote: ReturnType<typeof vi.fn>;
    addStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
    ErrorHandler: {
      withErrorHandling: ReturnType<typeof vi.fn>;
      logError: ReturnType<typeof vi.fn>;
      shouldRetry: ReturnType<typeof vi.fn>;
      calculateBackoff: ReturnType<typeof vi.fn>;
      createJobError: ReturnType<typeof vi.fn>;
      classifyError: ReturnType<typeof vi.fn>;
      validateJobData: ReturnType<typeof vi.fn>;
    };
    HealthMonitor: {
      getInstance: ReturnType<typeof vi.fn>;
    };
    ingredientQueue: any;
    instructionQueue: any;
    imageQueue: any;
    categorizationQueue: any;
    logger: any;
  };

  beforeEach(async () => {
    console.log("🧪 Setting up process job test environment...");
    testSetup = setupWorkerTestEnvironment() as unknown as any;

    mockDeps = {
      parseHTML: mockParseHTML,
      createNote: vi
        .fn()
        .mockResolvedValue({ id: "note-1", title: "Test Note" }),
      addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
      ErrorHandler: {
        withErrorHandling: mockWithErrorHandling,
        logError: mockLogError,
        shouldRetry: mockShouldRetry,
        calculateBackoff: mockCalculateBackoff,
        createJobError: mockCreateJobError,
        classifyError: mockClassifyError,
        validateJobData: mockValidateJobData,
      },
      HealthMonitor: {
        getInstance: vi.fn(() => mockHealthMonitor),
      },
      ingredientQueue: { name: "ingredient-queue", add: vi.fn() },
      instructionQueue: { name: "instruction-queue", add: vi.fn() },
      imageQueue: { name: "image-queue", add: vi.fn() },
      categorizationQueue: { name: "categorization-queue", add: vi.fn() },
      logger: console,
    };
  });

  afterEach(() => {
    console.log("🧹 Cleaning up process job test environment...");
    cleanupWorkerTestEnvironment(testSetup as any);
  });

  describe("processNote", () => {
    it("should process note content successfully", async () => {
      const { processNote } = await import(
        "../../../workers/notes/process-job"
      );

      const mockFile: TestFile = {
        title: "Test File",
        content: "test content",
      };
      const mockNote: TestNote = { id: "note-1", title: "Test Note" };

      mockParseHTML.mockResolvedValue(mockFile);
      mockDeps.createNote.mockResolvedValue(mockNote);
      mockWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      const result = await processNote(
        "test content",
        "job-1",
        mockDeps as any
      );

      expect(result.note).toEqual(mockNote);
      expect(result.file).toEqual(mockFile);
      expect(mockParseHTML).toHaveBeenCalledWith("test content");
      expect(mockDeps.createNote).toHaveBeenCalledWith(mockFile);
    });

    it("should handle HTML parsing errors", async () => {
      const { processNote } = await import(
        "../../../workers/notes/process-job"
      );

      const parseError = new Error("Parse failed");
      mockParseHTML.mockRejectedValue(parseError);
      mockWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      await expect(
        processNote("invalid content", "job-1", mockDeps as any)
      ).rejects.toThrow("Parse failed");
    });

    it("should handle note creation errors", async () => {
      const { processNote } = await import(
        "../../../workers/notes/process-job"
      );

      const mockFile: TestFile = {
        title: "Test File",
        content: "test content",
      };
      const createError = new Error("Create failed");

      mockParseHTML.mockResolvedValue(mockFile);
      mockDeps.createNote.mockRejectedValue(createError);
      mockWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      await expect(
        processNote("test content", "job-1", mockDeps as any)
      ).rejects.toThrow("Create failed");
    });
  });

  describe("addNoteStatusEvent", () => {
    it("should add status event successfully", async () => {
      const { addNoteStatusEvent } = await import(
        "../../../workers/notes/process-job"
      );

      const note: TestNote = { id: "note-1" };
      const file: TestFile = { title: "Test File" };

      mockAddStatusEventAndBroadcast.mockResolvedValue(undefined);
      mockWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      await addNoteStatusEvent(note, file, "job-1", mockDeps as any);

      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        noteId: "note-1",
        status: "PROCESSING",
        message: 'Added note "Test File"',
        context: "import",
      });
    });

    it("should handle status event errors", async () => {
      const { addNoteStatusEvent } = await import(
        "../../../workers/notes/process-job"
      );

      const note: TestNote = { id: "note-1" };
      const file: TestFile = { title: "Test File" };
      const statusError = new Error("Status failed");

      mockAddStatusEventAndBroadcast.mockRejectedValue(statusError);
      mockWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });

      await expect(
        addNoteStatusEvent(note, file, "job-1", mockDeps as any)
      ).rejects.toThrow("Status failed");
    });
  });

  describe("processNoteJob", () => {
    it("should process job successfully", async () => {
      const { processNoteJob } = await import(
        "../../../workers/notes/process-job"
      );

      const mockFile: TestFile = {
        title: "Test File",
        content: "test content",
      };
      const mockNote: TestNote = { id: "note-1", title: "Test Note" };

      mockParseHTML.mockResolvedValue(mockFile);
      mockDeps.createNote.mockResolvedValue(mockNote);
      mockWithErrorHandling.mockImplementation(async (fn) => {
        return await fn();
      });
      mockValidateJobData.mockReturnValue(null);
      mockHealthMonitor.isHealthy.mockResolvedValue(true);

      // Mock all queue add methods to resolve successfully
      mockDeps.ingredientQueue.add.mockResolvedValue(undefined);
      mockDeps.instructionQueue.add.mockResolvedValue(undefined);
      mockDeps.imageQueue.add.mockResolvedValue(undefined);
      mockDeps.categorizationQueue.add.mockResolvedValue(undefined);

      // Mock status event to resolve successfully
      mockAddStatusEventAndBroadcast.mockResolvedValue(undefined);

      await processNoteJob(
        testSetup.job as any,
        testSetup.queue as any,
        mockDeps as any
      );

      expect(mockValidateJobData).toHaveBeenCalledWith(
        (testSetup as any).job.data,
        ["content"]
      );
      expect(mockHealthMonitor.isHealthy).toHaveBeenCalled();
      expect(mockParseHTML).toHaveBeenCalledWith(
        (testSetup as any).job.data.content
      );
      expect(mockDeps.createNote).toHaveBeenCalledWith(mockFile);
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalled();
    });

    it("should handle validation errors", async () => {
      const { processNoteJob } = await import(
        "../../../workers/notes/process-job"
      );

      const validationError = {
        message: "Invalid job data",
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.HIGH,
      };

      mockValidateJobData.mockReturnValue(validationError);
      mockCreateJobError.mockReturnValue(validationError);

      await expect(
        processNoteJob(
          testSetup.job as any,
          testSetup.queue as any,
          mockDeps as any
        )
      ).rejects.toThrow();

      expect(mockLogError).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: "job1",
          queueName: "test-queue",
          retryCount: 0,
        })
      );
    });

    it("should handle unhealthy service", async () => {
      const { processNoteJob } = await import(
        "../../../workers/notes/process-job"
      );

      mockValidateJobData.mockReturnValue(null);
      mockHealthMonitor.isHealthy.mockResolvedValue(false);
      mockCreateJobError.mockReturnValue({
        message: "Service is unhealthy, skipping job processing",
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
      });

      await expect(
        processNoteJob(
          testSetup.job as any,
          testSetup.queue as any,
          mockDeps as any
        )
      ).rejects.toThrow();

      expect(mockLogError).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: "job1",
          queueName: "test-queue",
          retryCount: 0,
        })
      );
    });

    it("should handle retryable errors", async () => {
      const { processNoteJob } = await import(
        "../../../workers/notes/process-job"
      );

      const retryableError = new QueueError({
        message: "Temporary error",
        type: ErrorType.EXTERNAL_SERVICE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        timestamp: new Date(),
      });

      mockValidateJobData.mockReturnValue(null);
      mockHealthMonitor.isHealthy.mockResolvedValue(true);
      mockWithErrorHandling.mockRejectedValue(retryableError);
      mockShouldRetry.mockReturnValue(true);
      mockCalculateBackoff.mockReturnValue(1000);

      await expect(
        processNoteJob(
          testSetup.job as any,
          testSetup.queue as any,
          mockDeps as any
        )
      ).rejects.toThrow();

      expect(mockShouldRetry).toHaveBeenCalled();
      expect(mockCalculateBackoff).toHaveBeenCalledWith(0);
    });

    it("should handle non-retryable errors", async () => {
      const { processNoteJob } = await import(
        "../../../workers/notes/process-job"
      );

      const nonRetryableError = new QueueError({
        message: "Permanent error",
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.HIGH,
        timestamp: new Date(),
      });

      mockValidateJobData.mockReturnValue(null);
      mockHealthMonitor.isHealthy.mockResolvedValue(true);
      mockWithErrorHandling.mockRejectedValue(nonRetryableError);
      mockShouldRetry.mockReturnValue(false);

      await expect(
        processNoteJob(
          testSetup.job as any,
          testSetup.queue as any,
          mockDeps as any
        )
      ).rejects.toThrow();

      expect(mockShouldRetry).toHaveBeenCalled();
      expect(mockLogError).toHaveBeenCalled();
    });

    it("should handle unexpected errors", async () => {
      const { processNoteJob } = await import(
        "../../../workers/notes/process-job"
      );

      const unexpectedError = new Error("Unexpected error");

      mockValidateJobData.mockReturnValue(null);
      mockHealthMonitor.isHealthy.mockResolvedValue(true);
      mockWithErrorHandling.mockRejectedValue(unexpectedError);
      mockClassifyError.mockReturnValue({
        message: "Unexpected error",
        type: ErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.CRITICAL,
      });

      await expect(
        processNoteJob(
          testSetup.job as any,
          testSetup.queue as any,
          mockDeps as any
        )
      ).rejects.toThrow();

      expect(mockClassifyError).toHaveBeenCalledWith(unexpectedError);
      expect(mockLogError).toHaveBeenCalled();
    });
  });
});
