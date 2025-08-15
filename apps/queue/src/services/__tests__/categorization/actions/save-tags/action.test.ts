import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "../../../../../workers/categorization/dependencies";
import type { ActionContext } from "../../../../../workers/core/types";

// Mock the service function
vi.mock("../../../../categorization/actions/save-tags/service", () => ({
  saveTags: vi.fn(),
}));

describe("SaveTagsAction", () => {
  let action: InstanceType<
    typeof import("../../../../categorization/actions/save-tags/action").SaveTagsAction
  >;
  let mockDeps: CategorizationWorkerDependencies;
  let mockContext: ActionContext;
  let testData: CategorizationJobData;
  let mockSaveTags: ReturnType<typeof vi.fn>;
  let mockAddStatusEventAndBroadcast: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import the action class
    const { SaveTagsAction } = await import(
      "../../../../categorization/actions/save-tags/action"
    );
    action = new SaveTagsAction();

    // Import the mocked service function
    const { saveTags } = await import(
      "../../../../categorization/actions/save-tags/service"
    );
    mockSaveTags = vi.mocked(saveTags);

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
        determinedTags: ["chocolate", "dessert", "sweet"],
        tagsSource: "evernote_tags",
        tagsConfidence: 0.8,
      },
    };
  });

  describe("name", () => {
    it("should return the correct action name", () => {
      expect(action.name).toBe(ActionName.SAVE_TAGS);
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
      expect(result?.message).toBe("Note ID is required for tag saving");
    });

    it("should return error for data with undefined noteId", () => {
      const invalidData = {
        ...testData,
        noteId: undefined as unknown as string,
      } as CategorizationJobData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for tag saving");
    });
  });

  describe("execute", () => {
    it("should successfully execute and return result from service", async () => {
      // Arrange
      const expectedResult = {
        ...testData,
        metadata: {
          ...testData.metadata,
          tagsSaved: true,
        },
      };
      mockSaveTags.mockResolvedValue(expectedResult);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockSaveTags).toHaveBeenCalledWith(
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
      ).rejects.toThrow("Note ID is required for tag saving");
      expect(mockSaveTags).not.toHaveBeenCalled();
    });

    it("should handle undefined statusBroadcaster", async () => {
      // Arrange
      const depsWithoutStatusBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      mockSaveTags.mockResolvedValue(testData);

      // Act
      const result = await action.execute(
        testData,
        depsWithoutStatusBroadcaster,
        mockContext
      );

      // Assert
      expect(mockSaveTags).toHaveBeenCalledWith(
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
          tagsSaved: true,
        },
      };
      mockSaveTags.mockResolvedValue(expectedResult);

      // Act
      await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      // Check start message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "PROCESSING",
        message: "Saving recipe tags...",
        context: "tag_save",
        indentLevel: 1,
      });

      // Check completion message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "Tags saved: chocolate, dessert, sweet",
        context: "tag_save_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          savedTags: ["chocolate", "dessert", "sweet"],
        },
      });
    });

    it("should handle service returning empty tags array", async () => {
      // Arrange
      const testDataWithEmptyTags = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: [],
        },
      };
      const expectedResult = {
        ...testDataWithEmptyTags,
        metadata: {
          ...testDataWithEmptyTags.metadata,
          tagsSaved: true,
        },
      };
      mockSaveTags.mockResolvedValue(expectedResult);

      // Act
      await action.execute(testDataWithEmptyTags, mockDeps, mockContext);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "No tags to save",
        context: "tag_save_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          savedTags: [],
        },
      });
    });

    it("should handle service returning null tags", async () => {
      // Arrange
      const testDataWithNullTags = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: null as unknown as string[],
        },
      };
      const expectedResult = {
        ...testDataWithNullTags,
        metadata: {
          ...testDataWithNullTags.metadata,
          tagsSaved: true,
        },
      };
      mockSaveTags.mockResolvedValue(expectedResult);

      // Act
      await action.execute(testDataWithNullTags, mockDeps, mockContext);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      // Check start message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "PROCESSING",
        message: "Saving recipe tags...",
        context: "tag_save",
        indentLevel: 1,
      });

      // Check completion message for null tags scenario
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "No tags to save",
        context: "tag_save_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          savedTags: null,
        },
      });
    });

    it("should handle service returning empty tags array with additionalBroadcasting", async () => {
      // Arrange
      const testDataWithEmptyTags = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: [],
        },
      };
      const expectedResult = {
        ...testDataWithEmptyTags,
        metadata: {
          ...testDataWithEmptyTags.metadata,
          tagsSaved: false,
        },
      };
      mockSaveTags.mockResolvedValue(expectedResult);

      // Act
      await action.execute(testDataWithEmptyTags, mockDeps, mockContext);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      // Check start message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "PROCESSING",
        message: "Saving recipe tags...",
        context: "tag_save",
        indentLevel: 1,
      });

      // Check completion message for empty tags scenario
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "No tags to save",
        context: "tag_save_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          savedTags: [],
        },
      });
    });

    it("should handle service errors and propagate them", async () => {
      // Arrange
      const serviceError = new Error("Service failed");
      mockSaveTags.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        action.execute(testData, mockDeps, mockContext)
      ).rejects.toThrow("Service failed");
      expect(mockSaveTags).toHaveBeenCalledWith(
        testData,
        mockDeps.logger,
        mockDeps.statusBroadcaster
      );
    });

    it("should handle status broadcaster errors", async () => {
      // Arrange
      const broadcasterError = new Error("Broadcaster failed");
      mockAddStatusEventAndBroadcast.mockRejectedValue(broadcasterError);
      mockSaveTags.mockResolvedValue(testData);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      // The base action catches broadcaster errors and logs them, but doesn't throw
      expect(result).toEqual(testData);
    });
  });
});
