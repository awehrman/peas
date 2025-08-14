import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "../../../../../workers/categorization/dependencies";
import type { ActionContext } from "../../../../../workers/core/types";

// Mock the service function
vi.mock(
  "../../../../categorization/actions/determine-category/service",
  () => ({
    determineCategory: vi.fn(),
  })
);

describe("DetermineCategoryAction", () => {
  let action: InstanceType<
    typeof import("../../../../categorization/actions/determine-category/action").DetermineCategoryAction
  >;
  let mockDeps: CategorizationWorkerDependencies;
  let mockContext: ActionContext;
  let testData: CategorizationJobData;
  let mockDetermineCategory: ReturnType<typeof vi.fn>;
  let mockAddStatusEventAndBroadcast: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import the action class
    const { DetermineCategoryAction } = await import(
      "../../../../categorization/actions/determine-category/action"
    );
    action = new DetermineCategoryAction();

    // Import the mocked service function
    const { determineCategory } = await import(
      "../../../../categorization/actions/determine-category/service"
    );
    mockDetermineCategory = vi.mocked(determineCategory);

    mockAddStatusEventAndBroadcast = vi.fn().mockResolvedValue({});
    mockDeps = {
      logger: {
        log: vi.fn(),
      } as unknown as CategorizationWorkerDependencies["logger"],
      statusBroadcaster: {
        addStatusEventAndBroadcast: mockAddStatusEventAndBroadcast,
      },
      services: {
        determineCategory: vi.fn(),
        saveCategory: vi.fn(),
        determineTags: vi.fn(),
        saveTags: vi.fn(),
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
      importId: "test-import-456",
      jobId: "test-job-789",
      metadata: {
        determinedCategory: "dessert",
        categorySource: "evernote_tags",
        categoryConfidence: 0.8,
      },
    };
  });

  describe("name", () => {
    it("should return the correct action name", () => {
      expect(action.name).toBe(ActionName.DETERMINE_CATEGORY);
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
        "Note ID is required for category determination"
      );
    });

    it("should return error for data with undefined noteId", () => {
      const invalidData = {
        ...testData,
        noteId: undefined as unknown as string,
      } as CategorizationJobData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for category determination"
      );
    });

    it("should return error for data with null noteId", () => {
      const invalidData = {
        ...testData,
        noteId: null as unknown as string,
      } as CategorizationJobData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe(
        "Note ID is required for category determination"
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
          determinedCategory: "dessert",
        },
      };
      mockDetermineCategory.mockResolvedValue(expectedResult);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockDetermineCategory).toHaveBeenCalledWith(
        testData,
        mockDeps.logger
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
      ).rejects.toThrow("Note ID is required for category determination");
      expect(mockDetermineCategory).not.toHaveBeenCalled();
    });

    it("should handle undefined statusBroadcaster", async () => {
      // Arrange
      const depsWithoutStatusBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      mockDetermineCategory.mockResolvedValue(testData);

      // Act
      const result = await action.execute(
        testData,
        depsWithoutStatusBroadcaster,
        mockContext
      );

      // Assert
      expect(mockDetermineCategory).toHaveBeenCalledWith(
        testData,
        mockDeps.logger
      );
      expect(result).toEqual(testData);
    });

    it("should send start and completion status messages", async () => {
      // Arrange
      const expectedResult = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategory: "main-course",
        },
      };
      mockDetermineCategory.mockResolvedValue(expectedResult);

      // Act
      await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledTimes(2);

      // Check start message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "PROCESSING",
        message: "Determining recipe category...",
        context: "categorization_start",
        noteId: testData.noteId,
        indentLevel: 1,
      });

      // Check completion message
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "Category determined: main-course",
        context: "categorization_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          determinedCategory: "main-course",
        },
      });
    });

    it("should handle service returning null category", async () => {
      // Arrange
      const resultWithNullCategory = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategory: null,
        },
      };
      mockDetermineCategory.mockResolvedValue(resultWithNullCategory);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "Category determination completed",
        context: "categorization_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          determinedCategory: null,
        },
      });
      expect(result).toEqual(resultWithNullCategory);
    });

    it("should handle service returning undefined category", async () => {
      // Arrange
      const resultWithUndefinedCategory = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategory: undefined,
        },
      };
      mockDetermineCategory.mockResolvedValue(resultWithUndefinedCategory);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(
        mockDeps.statusBroadcaster?.addStatusEventAndBroadcast
      ).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "Category determination completed",
        context: "categorization_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          determinedCategory: undefined,
        },
      });
      expect(result).toEqual(resultWithUndefinedCategory);
    });

    it("should handle service errors and propagate them", async () => {
      // Arrange
      const serviceError = new Error("Service failed");
      mockDetermineCategory.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        action.execute(testData, mockDeps, mockContext)
      ).rejects.toThrow("Service failed");
      expect(mockDetermineCategory).toHaveBeenCalledWith(
        testData,
        mockDeps.logger
      );
    });

    it("should handle non-Error exceptions from service", async () => {
      // Arrange
      const nonErrorException = "String exception";
      mockDetermineCategory.mockRejectedValue(nonErrorException);

      // Act & Assert
      await expect(
        action.execute(testData, mockDeps, mockContext)
      ).rejects.toBe("String exception");
    });

    it("should handle status broadcaster errors", async () => {
      // Arrange
      const broadcasterError = new Error("Broadcaster failed");
      mockDetermineCategory.mockResolvedValue(testData);
      mockAddStatusEventAndBroadcast.mockRejectedValue(broadcasterError);

      // Act & Assert
      await expect(
        action.execute(testData, mockDeps, mockContext)
      ).rejects.toThrow("Broadcaster failed");
    });

    it("should pass all data properties to service correctly", async () => {
      // Arrange
      const complexData = {
        noteId: "complex-note-456",
        importId: "complex-import-789",
        jobId: "complex-job-012",
        metadata: {
          complexKey: "complexValue",
          nestedKey: {
            innerKey: "innerValue",
          },
        },
      };
      mockDetermineCategory.mockResolvedValue(complexData);

      // Act
      const result = await action.execute(complexData, mockDeps, mockContext);

      // Assert
      expect(mockDetermineCategory).toHaveBeenCalledWith(
        complexData,
        mockDeps.logger
      );
      expect(result).toEqual(complexData);
    });
  });

  describe("integration", () => {
    it("should validate input before calling service", async () => {
      // Arrange
      const invalidData = {
        ...testData,
        noteId: "",
      };
      mockDetermineCategory.mockResolvedValue(testData);

      // Act & Assert
      await expect(
        action.execute(invalidData, mockDeps, mockContext)
      ).rejects.toThrow("Note ID is required for category determination");
      expect(mockDetermineCategory).not.toHaveBeenCalled();
    });

    it("should call service with correct parameters when validation passes", async () => {
      // Arrange
      mockDetermineCategory.mockResolvedValue(testData);

      // Act
      await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockDetermineCategory).toHaveBeenCalledTimes(1);
      expect(mockDetermineCategory).toHaveBeenCalledWith(
        testData,
        mockDeps.logger
      );
    });
  });
});
