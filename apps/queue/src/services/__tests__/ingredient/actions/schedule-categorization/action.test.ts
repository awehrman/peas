import type { ParseStatus } from "@peas/database";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type { StructuredLogger } from "../../../../../types";
import type { ActionContext } from "../../../../../workers/core/types";
import type {
  IngredientJobData,
  IngredientWorkerDependencies,
} from "../../../../../workers/ingredient/dependencies";

// Mock the service function
vi.mock(
  "../../../../ingredient/actions/schedule-categorization/service",
  () => ({
    scheduleCategorization: vi.fn(),
  })
);

describe("ScheduleCategorizationAction", () => {
  let action: import("../../../../ingredient/actions/schedule-categorization/action").ScheduleCategorizationAction;
  let mockDeps: IngredientWorkerDependencies;
  let mockContext: ActionContext;
  let testData: IngredientJobData;
  let mockScheduleCategorization: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import the action class
    const { ScheduleCategorizationAction } = await import(
      "../../../../ingredient/actions/schedule-categorization/action"
    );
    action = new ScheduleCategorizationAction();

    // Import the mocked service function
    const { scheduleCategorization } = await import(
      "../../../../ingredient/actions/schedule-categorization/service"
    );
    mockScheduleCategorization = vi.mocked(scheduleCategorization);

    mockDeps = {
      logger: {
        log: vi.fn(),
      } as unknown as StructuredLogger,
      statusBroadcaster: {
        addStatusEventAndBroadcast: vi.fn().mockResolvedValue({}),
      },
      services: {
        parseIngredient: vi.fn(),
        saveIngredient: vi.fn(),
      },
    };

    mockContext = {
      jobId: "test-job-123",
      startTime: Date.now(),
      retryCount: 0,
      queueName: "test-queue",
      operation: "test-operation",
      workerName: "test-worker",
      attemptNumber: 1,
    };

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

  describe("name", () => {
    it("should return the correct action name", () => {
      expect(action.name).toBe(
        ActionName.SCHEDULE_CATEGORIZATION_AFTER_COMPLETION
      );
    });
  });

  describe("validateInput", () => {
    it("should return null for valid data with noteId", () => {
      const result = action.validateInput(testData);
      expect(result).toBeNull();
    });

    it("should return error for data without noteId", () => {
      const invalidData = {
        ...testData,
        noteId: "",
      };
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for categorization scheduling"
      );
    });

    it("should return error for data with undefined noteId", () => {
      const invalidData = {
        ...testData,
        noteId: undefined as string | undefined,
      } as IngredientJobData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for categorization scheduling"
      );
    });

    it("should return error for data with null noteId", () => {
      const invalidData = {
        ...testData,
        noteId: null as string | null,
      } as IngredientJobData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for categorization scheduling"
      );
    });
  });

  describe("execute", () => {
    it("should successfully execute and return result from service", async () => {
      // Arrange
      const expectedResult = {
        ...testData,
        metadata: {
          ...testData.metadata,
          scheduled: true,
        },
      };
      mockScheduleCategorization.mockResolvedValue(expectedResult);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockScheduleCategorization).toHaveBeenCalledWith(
        testData,
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
      expect(result).toEqual(expectedResult);
    });

    it("should throw validation error when noteId is missing", async () => {
      // Arrange
      const invalidData = {
        ...testData,
        noteId: "",
      };

      // Act & Assert
      await expect(
        action.execute(invalidData, mockDeps, mockContext)
      ).rejects.toThrow("Note ID is required for categorization scheduling");
      expect(mockScheduleCategorization).not.toHaveBeenCalled();
    });

    it("should handle undefined statusBroadcaster", async () => {
      // Arrange
      const depsWithoutStatusBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      mockScheduleCategorization.mockResolvedValue(testData);

      // Act
      const result = await action.execute(
        testData,
        depsWithoutStatusBroadcaster,
        mockContext
      );

      // Assert
      expect(mockScheduleCategorization).toHaveBeenCalledWith(
        testData,
        mockDeps.logger,
        undefined
      );
      expect(result).toEqual(testData);
    });

    it("should handle service errors and propagate them", async () => {
      // Arrange
      const serviceError = new Error("Service failed");
      mockScheduleCategorization.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        action.execute(testData, mockDeps, mockContext)
      ).rejects.toThrow("Service failed");
      expect(mockScheduleCategorization).toHaveBeenCalledWith(
        testData,
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
    });

    it("should handle non-Error exceptions from service", async () => {
      // Arrange
      const nonErrorException = "String exception";
      mockScheduleCategorization.mockRejectedValue(nonErrorException);

      // Act & Assert
      await expect(
        action.execute(testData, mockDeps, mockContext)
      ).rejects.toBe("String exception");
    });

    it("should pass all data properties to service correctly", async () => {
      // Arrange
      const complexData = {
        noteId: "complex-note-456",
        ingredientReference: "complex-ingredient",
        lineIndex: 5,
        blockIndex: 2,
        importId: "complex-import-456",
        jobId: "complex-job-456",
        metadata: {
          complexKey: "complexValue",
          nestedKey: {
            innerKey: "innerValue",
          },
        },
        parseStatus: "COMPLETED_WITH_ERROR" as ParseStatus,
        isActive: false,
      };
      mockScheduleCategorization.mockResolvedValue(complexData);

      // Act
      const result = await action.execute(complexData, mockDeps, mockContext);

      // Assert
      expect(mockScheduleCategorization).toHaveBeenCalledWith(
        complexData,
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
      expect(result).toEqual(complexData);
    });

    it("should handle data with minimal required fields", async () => {
      // Arrange
      const minimalData = {
        noteId: "minimal-note",
        ingredientReference: "minimal-ingredient",
        lineIndex: 0,
        parseStatus: "AWAITING_PARSING" as ParseStatus,
        isActive: true,
      };
      mockScheduleCategorization.mockResolvedValue(minimalData);

      // Act
      const result = await action.execute(minimalData, mockDeps, mockContext);

      // Assert
      expect(mockScheduleCategorization).toHaveBeenCalledWith(
        minimalData,
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
      expect(result).toEqual(minimalData);
    });
  });

  describe("integration", () => {
    it("should validate input before calling service", async () => {
      // Arrange
      const invalidData = {
        ...testData,
        noteId: "",
      };
      mockScheduleCategorization.mockResolvedValue(testData);

      // Act & Assert
      await expect(
        action.execute(invalidData, mockDeps, mockContext)
      ).rejects.toThrow("Note ID is required for categorization scheduling");
      expect(mockScheduleCategorization).not.toHaveBeenCalled();
    });

    it("should call service with correct parameters when validation passes", async () => {
      // Arrange
      mockScheduleCategorization.mockResolvedValue(testData);

      // Act
      await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockScheduleCategorization).toHaveBeenCalledTimes(1);
      expect(mockScheduleCategorization).toHaveBeenCalledWith(
        testData,
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
    });
  });
});
