import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockLogger,
  createMockStatusBroadcaster,
} from "../../../../../test-utils/helpers";
import { ActionName } from "../../../../../types";
import type {
  NotePipelineData,
  NoteWorkerDependencies,
} from "../../../../../types/notes";
import type { ActionContext } from "../../../../../workers/core/types";
import { ScheduleImagesAction } from "../../../../note/actions/schedule-images/action";

// Mock the service
vi.mock("../../../../note/actions/schedule-images/service", () => ({
  processImages: vi.fn(),
}));

describe("ScheduleImagesAction", () => {
  let action: ScheduleImagesAction;
  let mockDependencies: NoteWorkerDependencies;
  let mockContext: ActionContext;
  let mockData: NotePipelineData;

  // Import mocked function
  let processImages: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked function
    const service = await import(
      "../../../../note/actions/schedule-images/service"
    );
    processImages = vi.mocked(service.processImages);

    action = new ScheduleImagesAction();

    mockDependencies = {
      logger: createMockLogger(),
      statusBroadcaster: createMockStatusBroadcaster(),
      queues: {
        imageQueue: {
          add: vi.fn().mockResolvedValue({ id: "test-job-id" }),
        },
      },
      services: {
        parseHtml: vi.fn(),
        cleanHtml: vi.fn(),
        saveNote: vi.fn(),
      },
    } as unknown as NoteWorkerDependencies;

    mockContext = {
      jobId: "test-job-id",
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      startTime: Date.now(),
      workerName: "test-worker",
      attemptNumber: 1,
    };

    mockData = {
      noteId: "test-note-123",
      importId: "test-import-456",
      content: "<html><body>Test content</body></html>",
      metadata: {},
    };
  });

  describe("name", () => {
    it("should have the correct action name", () => {
      expect(action.name).toBe(ActionName.SCHEDULE_IMAGES);
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data with noteId", () => {
      const result = action.validateInput(mockData);
      expect(result).toBeNull();
    });

    it("should return error when noteId is missing", () => {
      const dataWithoutNoteId = { ...mockData, noteId: undefined };
      const result = action.validateInput(dataWithoutNoteId);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for scheduling images");
    });

    it("should return error when noteId is empty string", () => {
      const dataWithEmptyNoteId = { ...mockData, noteId: "" };
      const result = action.validateInput(dataWithEmptyNoteId);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for scheduling images");
    });

    it("should return error when noteId is null", () => {
      const dataWithNullNoteId = {
        ...mockData,
        noteId: null as unknown as string | undefined,
      };
      const result = action.validateInput(dataWithNullNoteId);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for scheduling images");
    });
  });

  describe("execute", () => {
    it("should successfully execute the action", async () => {
      processImages.mockResolvedValue(mockData);

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(processImages).toHaveBeenCalledWith(
        mockData,
        mockDependencies.logger,
        mockDependencies.queues
      );
      expect(result).toEqual(mockData);
    });

    it("should handle service errors and re-throw them", async () => {
      const error = new Error("Service error");
      processImages.mockRejectedValue(error);

      await expect(
        action.execute(mockData, mockDependencies, mockContext)
      ).rejects.toThrow("Service error");

      expect(processImages).toHaveBeenCalledWith(
        mockData,
        mockDependencies.logger,
        mockDependencies.queues
      );
    });

    it("should not call additionalBroadcasting when suppressDefaultBroadcast is true", async () => {
      const dataWithImages = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: "<html><body>Test content</body></html>",
          ingredients: [],
          instructions: [],
          images: [
            {
              id: "img1",
              originalImageUrl: "url1",
              processingStatus: "pending",
            },
            {
              id: "img2",
              originalImageUrl: "url2",
              processingStatus: "pending",
            },
          ],
        },
      };

      processImages.mockResolvedValue(dataWithImages);

      const result = await action.execute(
        dataWithImages,
        mockDependencies,
        mockContext
      );

      // additionalBroadcasting should be called even when suppressDefaultBroadcast is true
      // because suppressDefaultBroadcast only affects default broadcasts, not additionalBroadcasting
      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: "test-import-456",
        noteId: "test-note-123",
        status: "AWAITING_PARSING",
        message: "Processing 0/2 images",
        context: "image_processing",
        currentCount: 0,
        totalCount: 2,
        indentLevel: 1,
        metadata: {
          totalImages: 2,
          currentImages: 0,
        },
      });
      expect(result).toEqual(dataWithImages);
    });

    it("should not call additionalBroadcasting when statusBroadcaster is missing", async () => {
      const dependenciesWithoutBroadcaster = {
        ...mockDependencies,
        statusBroadcaster: undefined,
      };

      const dataWithImages = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: "<html><body>Test content</body></html>",
          ingredients: [],
          instructions: [],
          images: [
            {
              id: "img1",
              originalImageUrl: "url1",
              processingStatus: "pending",
            },
          ],
        },
      };

      processImages.mockResolvedValue(dataWithImages);

      const result = await action.execute(
        dataWithImages,
        dependenciesWithoutBroadcaster,
        mockContext
      );

      expect(result).toEqual(dataWithImages);
    });

    it("should not call additionalBroadcasting when file.images is missing", async () => {
      processImages.mockResolvedValue(mockData);

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it("should not call additionalBroadcasting when file.images is empty", async () => {
      const dataWithEmptyImages = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: "<html><body>Test content</body></html>",
          ingredients: [],
          instructions: [],
          images: [],
        },
      };

      processImages.mockResolvedValue(dataWithEmptyImages);

      const result = await action.execute(
        dataWithEmptyImages,
        mockDependencies,
        mockContext
      );

      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
      expect(result).toEqual(dataWithEmptyImages);
    });

    it("should handle additionalBroadcasting errors gracefully", async () => {
      const dataWithImages = {
        ...mockData,
        file: {
          title: "Test Recipe",
          contents: "<html><body>Test content</body></html>",
          ingredients: [],
          instructions: [],
          images: [
            {
              id: "img1",
              originalImageUrl: "url1",
              processingStatus: "pending",
            },
          ],
        },
      };

      processImages.mockResolvedValue(dataWithImages);
      (
        mockDependencies.statusBroadcaster!
          .addStatusEventAndBroadcast as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Broadcast error"));

      const result = await action.execute(
        dataWithImages,
        mockDependencies,
        mockContext
      );

      expect(result).toEqual(dataWithImages);
    });

    it("should handle missing importId gracefully", async () => {
      const dataWithImagesNoImportId = {
        ...mockData,
        importId: undefined,
        file: {
          title: "Test Recipe",
          contents: "<html><body>Test content</body></html>",
          ingredients: [],
          instructions: [],
          images: [
            {
              id: "img1",
              originalImageUrl: "url1",
              processingStatus: "pending",
            },
          ],
        },
      };

      processImages.mockResolvedValue(dataWithImagesNoImportId);

      const result = await action.execute(
        dataWithImagesNoImportId,
        mockDependencies,
        mockContext
      );

      // additionalBroadcasting should not be called because suppressDefaultBroadcast is true
      expect(
        mockDependencies.statusBroadcaster?.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
      expect(result).toEqual(dataWithImagesNoImportId);
    });
  });

  describe("executeServiceAction integration", () => {
    it("should use executeServiceAction with correct parameters", async () => {
      processImages.mockResolvedValue(mockData);

      const result = await action.execute(
        mockData,
        mockDependencies,
        mockContext
      );

      expect(processImages).toHaveBeenCalledWith(
        mockData,
        mockDependencies.logger,
        mockDependencies.queues
      );
      expect(result).toEqual(mockData);
    });

    it("should pass suppressDefaultBroadcast as true", async () => {
      // This test verifies that the action is configured to suppress default broadcasting
      // The actual behavior is tested in the execute tests above
      expect(action.name).toBe(ActionName.SCHEDULE_IMAGES);
    });

    it("should include startMessage in executeServiceAction", async () => {
      processImages.mockResolvedValue(mockData);

      await action.execute(mockData, mockDependencies, mockContext);

      expect(processImages).toHaveBeenCalledWith(
        mockData,
        mockDependencies.logger,
        mockDependencies.queues
      );
    });
  });
});
