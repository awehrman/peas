import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../types";

// Mock the queue creation
vi.mock("../../../queues/create-queue", () => ({
  createQueue: vi.fn(),
}));

// Mock the types module
vi.mock("../../categorization/types", () => ({
  createCategorizationJobData: vi.fn(),
}));

describe("Schedule Categorization Service", () => {
  let mockLogger: StructuredLogger;
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
  let mockAddStatusEventAndBroadcast: ReturnType<typeof vi.fn>;
  let mockCreateQueue: ReturnType<typeof vi.fn>;
  let mockCreateCategorizationJobData: ReturnType<typeof vi.fn>;
  let mockQueue: { add: ReturnType<typeof vi.fn> };
  let scheduleCategorizationJob: (
    noteId: string,
    importId: string,
    logger: StructuredLogger,
    statusBroadcaster?: {
      addStatusEventAndBroadcast: (
        event: Record<string, unknown>
      ) => Promise<Record<string, unknown>>;
    },
    originalJobId?: string
  ) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    } as unknown as StructuredLogger;

    mockAddStatusEventAndBroadcast = vi.fn().mockResolvedValue({});
    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
    };

    mockQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    // Import the mocked functions
    const { createQueue } = await import("../../../queues/create-queue");
    mockCreateQueue = vi.mocked(createQueue);
    mockCreateQueue.mockReturnValue(mockQueue);

    const { createCategorizationJobData } = await import(
      "../../categorization/types"
    );
    mockCreateCategorizationJobData = vi.mocked(createCategorizationJobData);

    // Import the function to test
    const { scheduleCategorizationJob: importedFunction } = await import(
      "../../categorization/schedule-categorization"
    );
    scheduleCategorizationJob = importedFunction;
  });

  describe("scheduleCategorizationJob", () => {
    it("should successfully schedule categorization job", async () => {
      // Arrange
      const noteId = "test-note-123";
      const importId = "test-import-456";
      const originalJobId = "test-original-job-789";
      const mockJobData = {
        noteId,
        importId,
        jobId: "categorization-test-note-123-1234567890",
        metadata: {
          originalJobId,
          triggeredBy: "ingredient_completion",
          scheduledAt: "2023-01-01T00:00:00.000Z",
        },
      };

      mockCreateCategorizationJobData.mockReturnValue(mockJobData);

      // Act
      await scheduleCategorizationJob(
        noteId,
        importId,
        mockLogger,
        mockStatusBroadcaster,
        originalJobId
      );

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        "determine_category",
        mockJobData,
        {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        }
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Starting categorization scheduling for note: ${noteId}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Parameters: noteId=${noteId}, importId=${importId}, originalJobId=${originalJobId}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Successfully scheduled categorization for note: ${noteId}`
      );
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId,
        status: "PROCESSING",
        message: "Scheduling categorization...",
        context: "categorization_scheduling",
        noteId,
        indentLevel: 1,
      });
    });

    it("should handle undefined originalJobId", async () => {
      // Arrange
      const noteId = "test-note-123";
      const importId = "test-import-456";
      const mockJobData = {
        noteId,
        importId,
        jobId: "categorization-test-note-123-1234567890",
        metadata: {
          originalJobId: undefined,
          triggeredBy: "ingredient_completion",
          scheduledAt: "2023-01-01T00:00:00.000Z",
        },
      };

      mockCreateCategorizationJobData.mockReturnValue(mockJobData);

      // Act
      await scheduleCategorizationJob(
        noteId,
        importId,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Parameters: noteId=${noteId}, importId=${importId}, originalJobId=${undefined}`
      );
    });

    it("should handle undefined statusBroadcaster", async () => {
      // Arrange
      const noteId = "test-note-123";
      const importId = "test-import-456";
      const mockJobData = {
        noteId,
        importId,
        jobId: "categorization-test-note-123-1234567890",
        metadata: {
          originalJobId: undefined,
          triggeredBy: "ingredient_completion",
          scheduledAt: "2023-01-01T00:00:00.000Z",
        },
      };

      mockCreateCategorizationJobData.mockReturnValue(mockJobData);

      // Act
      await scheduleCategorizationJob(noteId, importId, mockLogger, undefined);

      // Assert
      expect(mockQueue.add).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Successfully scheduled categorization for note: ${noteId}`
      );
      // Should not call statusBroadcaster when undefined
      expect(
        mockStatusBroadcaster.addStatusEventAndBroadcast
      ).not.toHaveBeenCalled();
    });

    it("should handle queue creation failure", async () => {
      // Arrange
      const noteId = "test-note-123";
      const importId = "test-import-456";
      const queueError = new Error("Failed to create queue");
      mockQueue.add.mockRejectedValue(queueError);

      // Act & Assert
      await expect(
        scheduleCategorizationJob(
          noteId,
          importId,
          mockLogger,
          mockStatusBroadcaster
        )
      ).rejects.toThrow("Failed to create queue");

      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Starting categorization scheduling for note: ${noteId}`
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${noteId}: ${queueError}`
      );
    });

    it("should handle job data creation failure", async () => {
      // Arrange
      const noteId = "test-note-123";
      const importId = "test-import-456";
      const jobDataError = new Error("Failed to create job data");
      // Mock the function that creates the job data
      mockCreateCategorizationJobData.mockImplementation(() => {
        throw jobDataError;
      });

      // Act & Assert
      await expect(
        scheduleCategorizationJob(
          noteId,
          importId,
          mockLogger,
          mockStatusBroadcaster
        )
      ).rejects.toThrow("Failed to create job data");

      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${noteId}: ${jobDataError}`
      );
    });

    it("should handle queue add failure", async () => {
      // Arrange
      const noteId = "test-note-123";
      const importId = "test-import-456";
      const mockJobData = {
        noteId,
        importId,
        jobId: "categorization-test-note-123-1234567890",
        metadata: {
          originalJobId: undefined,
          triggeredBy: "ingredient_completion",
          scheduledAt: "2023-01-01T00:00:00.000Z",
        },
      };
      const queueAddError = new Error("Failed to add job to queue");

      mockCreateCategorizationJobData.mockReturnValue(mockJobData);
      mockQueue.add.mockRejectedValue(queueAddError);

      // Act & Assert
      await expect(
        scheduleCategorizationJob(
          noteId,
          importId,
          mockLogger,
          mockStatusBroadcaster
        )
      ).rejects.toThrow("Failed to add job to queue");

      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${noteId}: ${queueAddError}`
      );
    });

    it("should handle status broadcaster failure", async () => {
      // Arrange
      const noteId = "test-note-123";
      const importId = "test-import-456";
      const mockJobData = {
        noteId,
        importId,
        jobId: "categorization-test-note-123-1234567890",
        metadata: {
          originalJobId: undefined,
          triggeredBy: "ingredient_completion",
          scheduledAt: "2023-01-01T00:00:00.000Z",
        },
      };
      const broadcasterError = new Error("Failed to broadcast status");

      mockCreateCategorizationJobData.mockReturnValue(mockJobData);
      mockStatusBroadcaster.addStatusEventAndBroadcast = vi
        .fn()
        .mockRejectedValue(broadcasterError);

      // Act & Assert
      await expect(
        scheduleCategorizationJob(
          noteId,
          importId,
          mockLogger,
          mockStatusBroadcaster
        )
      ).rejects.toThrow("Failed to broadcast status");

      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${noteId}: ${broadcasterError}`
      );
    });

    it("should handle empty strings for noteId and importId", async () => {
      // Arrange
      const noteId = "";
      const importId = "";
      const mockJobData = {
        noteId,
        importId,
        jobId: "categorization--1234567890",
        metadata: {
          originalJobId: undefined,
          triggeredBy: "ingredient_completion",
          scheduledAt: "2023-01-01T00:00:00.000Z",
        },
      };

      mockCreateCategorizationJobData.mockReturnValue(mockJobData);

      // Act
      await scheduleCategorizationJob(
        noteId,
        importId,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Starting categorization scheduling for note: ${noteId}`
      );
    });

    it("should handle special characters in noteId and importId", async () => {
      // Arrange
      const noteId = "test-note-123!@#$%^&*()";
      const importId = "test-import-456!@#$%^&*()";
      const mockJobData = {
        noteId,
        importId,
        jobId: "categorization-test-note-123!@#$%^&*()-1234567890",
        metadata: {
          originalJobId: undefined,
          triggeredBy: "ingredient_completion",
          scheduledAt: "2023-01-01T00:00:00.000Z",
        },
      };

      mockCreateCategorizationJobData.mockReturnValue(mockJobData);

      // Act
      await scheduleCategorizationJob(
        noteId,
        importId,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Starting categorization scheduling for note: ${noteId}`
      );
    });
  });
});
