import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "../../../../../workers/categorization/dependencies";
import type { ActionContext } from "../../../../../workers/core/types";

// Mock the service function
vi.mock("../../../../categorization/actions/save-category/service", () => ({
  saveCategory: vi.fn(),
}));

describe("SaveCategoryAction", () => {
  let action: InstanceType<
    typeof import("../../../../categorization/actions/save-category/action").SaveCategoryAction
  >;
  let mockDeps: CategorizationWorkerDependencies;
  let mockContext: ActionContext;
  let testData: CategorizationJobData;
  let mockSaveCategory: ReturnType<typeof vi.fn>;
  let mockAddStatusEventAndBroadcast: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import the action class
    const { SaveCategoryAction } = await import(
      "../../../../categorization/actions/save-category/action"
    );
    action = new SaveCategoryAction();

    // Import the mocked service function
    const { saveCategory } = await import(
      "../../../../categorization/actions/save-category/service"
    );
    mockSaveCategory = vi.mocked(saveCategory);

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
        determinedCategories: ["dessert", "sweet"],
        categorySource: "evernote_tags",
        categoryConfidence: 0.8,
      },
    };
  });

  describe("name", () => {
    it("should return the correct action name", () => {
      expect(action.name).toBe(ActionName.SAVE_CATEGORY);
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
      expect(result?.message).toBe("Note ID is required for category saving");
    });

    it("should return error for data with undefined noteId", () => {
      const invalidData = {
        ...testData,
        noteId: undefined as unknown as string,
      } as CategorizationJobData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for category saving");
    });
  });

  describe("execute", () => {
    it("should successfully execute and return result from service", async () => {
      // Arrange
      const expectedResult = {
        ...testData,
        metadata: {
          ...testData.metadata,
          categorySaved: true,
        },
      };
      mockSaveCategory.mockResolvedValue(expectedResult);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockSaveCategory).toHaveBeenCalledWith(
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
      ).rejects.toThrow("Note ID is required for category saving");
      expect(mockSaveCategory).not.toHaveBeenCalled();
    });

    it("should handle undefined statusBroadcaster", async () => {
      // Arrange
      const depsWithoutStatusBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      mockSaveCategory.mockResolvedValue(testData);

      // Act
      const result = await action.execute(
        testData,
        depsWithoutStatusBroadcaster,
        mockContext
      );

      // Assert
      expect(mockSaveCategory).toHaveBeenCalledWith(
        testData,
        mockDeps.logger,
        undefined
      );
      expect(result).toEqual(testData);
    });

    it("should send start and completion status messages", async () => {
      // Arrange
      const expectedResult = {
        ...testData,
        metadata: {
          ...testData.metadata,
          categorySaved: true,
        },
      };
      mockSaveCategory.mockResolvedValue(expectedResult);

      // Act
      await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      // Check start message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "PROCESSING",
        message: "Saving recipe category...",
        context: "categorization_save",
        indentLevel: 1,
      });

      // Check completion message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "Category saved: dessert",
        context: "categorization_save_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          savedCategory: "dessert",
        },
      });
    });

    it("should handle service returning null category", async () => {
      // Arrange
      const testDataWithNullCategory = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategory: null as unknown as string,
        },
      };
      const expectedResult = {
        ...testDataWithNullCategory,
        metadata: {
          ...testDataWithNullCategory.metadata,
          categorySaved: true,
        },
      };
      mockSaveCategory.mockResolvedValue(expectedResult);

      // Act
      await action.execute(testDataWithNullCategory, mockDeps, mockContext);

      // Assert
      // The action uses executeServiceAction which sends standard start and completion messages
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      // Check start message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "PROCESSING",
        message: "Saving recipe category...",
        context: "categorization_save",
        indentLevel: 1,
      });

      // Check completion message (the service determines the message)
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "Category saved: dessert",
        context: "categorization_save_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          savedCategory: "dessert",
        },
      });
    });

    it("should handle service returning no category with additionalBroadcasting", async () => {
      // Arrange
      const testDataWithNoCategory = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedCategory: undefined,
          determinedCategories: [],
        },
      };
      const expectedResult = {
        ...testDataWithNoCategory,
        metadata: {
          ...testDataWithNoCategory.metadata,
          categorySaved: false,
        },
      };
      mockSaveCategory.mockResolvedValue(expectedResult);

      // Act
      await action.execute(testDataWithNoCategory, mockDeps, mockContext);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      // Check start message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "PROCESSING",
        message: "Saving recipe category...",
        context: "categorization_save",
        indentLevel: 1,
      });

      // Check completion message for no category scenario
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "No category to save",
        context: "categorization_save_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          savedCategory: undefined,
        },
      });
    });

    it("should handle service errors and propagate them", async () => {
      // Arrange
      const serviceError = new Error("Service failed");
      mockSaveCategory.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        action.execute(testData, mockDeps, mockContext)
      ).rejects.toThrow("Service failed");
      expect(mockSaveCategory).toHaveBeenCalledWith(
        testData,
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
    });

    it("should handle status broadcaster errors", async () => {
      // Arrange
      const broadcasterError = new Error("Broadcaster failed");
      mockAddStatusEventAndBroadcast.mockRejectedValue(broadcasterError);
      mockSaveCategory.mockResolvedValue(testData);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      // The base action catches broadcaster errors and logs them, but doesn't throw
      expect(result).toEqual(testData);
    });
  });
});
