import type { ParseStatus } from "@peas/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StructuredLogger } from "../../../../../types";
import type { IngredientJobData } from "../../../../../workers/ingredient/dependencies";

// Mock the scheduleCategorizationJob function
vi.mock("../../../../categorization/schedule-categorization", () => ({
  scheduleCategorizationJob: vi.fn(),
}));

describe("Schedule Categorization Service", () => {
  let mockLogger: StructuredLogger;
  let mockStatusBroadcaster: {
    addStatusEventAndBroadcast: (
      event: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
  let mockScheduleCategorizationJob: ReturnType<typeof vi.fn>;
  let testData: IngredientJobData;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      log: vi.fn(),
    } as unknown as StructuredLogger;

    mockStatusBroadcaster = {
      addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
    };

    // Import the mocked function
    const { scheduleCategorizationJob } = await import(
      "../../../../categorization/schedule-categorization"
    );
    mockScheduleCategorizationJob = vi.mocked(scheduleCategorizationJob);

    testData = {
      noteId: "test-note-123",
      ingredientReference: "test-ingredient",
      lineIndex: 1,
      importId: "test-import-123",
      jobId: "test-job-123",
      metadata: {
        testKey: "testValue",
      },
      parseStatus: "COMPLETED_SUCCESSFULLY" as ParseStatus,
      isActive: true,
    };
  });

  describe("scheduleCategorization", () => {
    it("should successfully schedule categorization and return data", async () => {
      // Arrange
      mockScheduleCategorizationJob.mockResolvedValue(undefined);

      // Act
      const { scheduleCategorization } = await import(
        "../../../../ingredient/actions/schedule-categorization/service"
      );
      const result = await scheduleCategorization(
        testData,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(mockScheduleCategorizationJob).toHaveBeenCalledWith(
        testData.noteId,
        testData.importId,
        mockLogger,
        mockStatusBroadcaster,
        testData.jobId
      );
      expect(result).toEqual(testData);
    });

    it("should handle undefined importId by passing empty string", async () => {
      // Arrange
      const dataWithoutImportId = {
        ...testData,
        importId: undefined,
      };
      mockScheduleCategorizationJob.mockResolvedValue(undefined);

      // Act
      const { scheduleCategorization } = await import(
        "../../../../ingredient/actions/schedule-categorization/service"
      );
      const result = await scheduleCategorization(
        dataWithoutImportId,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(mockScheduleCategorizationJob).toHaveBeenCalledWith(
        testData.noteId,
        "",
        mockLogger,
        mockStatusBroadcaster,
        testData.jobId
      );
      expect(result).toEqual(dataWithoutImportId);
    });

    it("should handle undefined statusBroadcaster", async () => {
      // Arrange
      mockScheduleCategorizationJob.mockResolvedValue(undefined);

      // Act
      const { scheduleCategorization } = await import(
        "../../../../ingredient/actions/schedule-categorization/service"
      );
      const result = await scheduleCategorization(
        testData,
        mockLogger,
        undefined
      );

      // Assert
      expect(mockScheduleCategorizationJob).toHaveBeenCalledWith(
        testData.noteId,
        testData.importId,
        mockLogger,
        undefined,
        testData.jobId
      );
      expect(result).toEqual(testData);
    });

    it("should handle undefined jobId", async () => {
      // Arrange
      const dataWithoutJobId = {
        ...testData,
        jobId: undefined,
      };
      mockScheduleCategorizationJob.mockResolvedValue(undefined);

      // Act
      const { scheduleCategorization } = await import(
        "../../../../ingredient/actions/schedule-categorization/service"
      );
      const result = await scheduleCategorization(
        dataWithoutJobId,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(mockScheduleCategorizationJob).toHaveBeenCalledWith(
        testData.noteId,
        testData.importId,
        mockLogger,
        mockStatusBroadcaster,
        undefined
      );
      expect(result).toEqual(dataWithoutJobId);
    });

    it("should handle scheduling failure and return data with error metadata", async () => {
      // Arrange
      const schedulingError = new Error("Queue is full");
      mockScheduleCategorizationJob.mockRejectedValue(schedulingError);

      // Act
      const { scheduleCategorization } = await import(
        "../../../../ingredient/actions/schedule-categorization/service"
      );
      const result = await scheduleCategorization(
        testData,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(mockScheduleCategorizationJob).toHaveBeenCalledWith(
        testData.noteId,
        testData.importId,
        mockLogger,
        mockStatusBroadcaster,
        testData.jobId
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${testData.noteId}: ${schedulingError}`
      );
      expect(result).toEqual({
        ...testData,
        metadata: {
          ...testData.metadata,
          error: "Queue is full",
          errorTimestamp: expect.any(String),
        },
      });
    });

    it("should handle non-Error exceptions and convert to string", async () => {
      // Arrange
      const nonErrorException = "String error";
      mockScheduleCategorizationJob.mockRejectedValue(nonErrorException);

      // Act
      const { scheduleCategorization } = await import(
        "../../../../ingredient/actions/schedule-categorization/service"
      );
      const result = await scheduleCategorization(
        testData,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        `[SCHEDULE_CATEGORIZATION] Failed to schedule categorization for note ${testData.noteId}: ${nonErrorException}`
      );
      expect(result).toEqual({
        ...testData,
        metadata: {
          ...testData.metadata,
          error: "String error",
          errorTimestamp: expect.any(String),
        },
      });
    });

    it("should preserve existing metadata when adding error information", async () => {
      // Arrange
      const dataWithMetadata = {
        ...testData,
        metadata: {
          existingKey: "existingValue",
          anotherKey: 123,
        },
      };
      const schedulingError = new Error("Database connection failed");
      mockScheduleCategorizationJob.mockRejectedValue(schedulingError);

      // Act
      const { scheduleCategorization } = await import(
        "../../../../ingredient/actions/schedule-categorization/service"
      );
      const result = await scheduleCategorization(
        dataWithMetadata,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(result).toEqual({
        ...dataWithMetadata,
        metadata: {
          existingKey: "existingValue",
          anotherKey: 123,
          error: "Database connection failed",
          errorTimestamp: expect.any(String),
        },
      });
    });

    it("should handle data without existing metadata", async () => {
      // Arrange
      const dataWithoutMetadata = {
        ...testData,
        metadata: undefined,
      };
      const schedulingError = new Error("Network timeout");
      mockScheduleCategorizationJob.mockRejectedValue(schedulingError);

      // Act
      const { scheduleCategorization } = await import(
        "../../../../ingredient/actions/schedule-categorization/service"
      );
      const result = await scheduleCategorization(
        dataWithoutMetadata,
        mockLogger,
        mockStatusBroadcaster
      );

      // Assert
      expect(result).toEqual({
        ...dataWithoutMetadata,
        metadata: {
          error: "Network timeout",
          errorTimestamp: expect.any(String),
        },
      });
    });
  });
});
