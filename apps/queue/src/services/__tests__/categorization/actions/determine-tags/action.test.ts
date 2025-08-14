import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionName } from "../../../../../types";
import type {
  CategorizationJobData,
  CategorizationWorkerDependencies,
} from "../../../../../workers/categorization/dependencies";
import type { ActionContext } from "../../../../../workers/core/types";

// Mock the service function
vi.mock("../../../../categorization/actions/determine-tags/service", () => ({
  determineTags: vi.fn(),
}));

describe("DetermineTagsAction", () => {
  let action: InstanceType<
    typeof import("../../../../categorization/actions/determine-tags/action").DetermineTagsAction
  >;
  let mockDeps: CategorizationWorkerDependencies;
  let mockContext: ActionContext;
  let testData: CategorizationJobData;
  let mockDetermineTags: ReturnType<typeof vi.fn>;
  let mockAddStatusEventAndBroadcast: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import the action class
    const { DetermineTagsAction } = await import(
      "../../../../categorization/actions/determine-tags/action"
    );
    action = new DetermineTagsAction();

    // Import the mocked service function
    const { determineTags } = await import(
      "../../../../categorization/actions/determine-tags/service"
    );
    mockDetermineTags = vi.mocked(determineTags);

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
      expect(action.name).toBe(ActionName.DETERMINE_TAGS);
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
      expect(result?.message).toBe("Note ID is required for tag determination");
    });

    it("should return error for data with undefined noteId", () => {
      const invalidData = {
        ...testData,
        noteId: undefined as unknown as string,
      } as CategorizationJobData;
      const result = action.validateInput(invalidData);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe("Note ID is required for tag determination");
    });
  });

  describe("execute", () => {
    it("should successfully execute and return result from service", async () => {
      // Arrange
      const expectedResult = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: ["chocolate", "dessert", "sweet"],
        },
      };
      mockDetermineTags.mockResolvedValue(expectedResult);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockDetermineTags).toHaveBeenCalledWith(testData, mockDeps.logger);
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
      ).rejects.toThrow("Note ID is required for tag determination");
      expect(mockDetermineTags).not.toHaveBeenCalled();
    });

    it("should handle undefined statusBroadcaster", async () => {
      // Arrange
      const depsWithoutStatusBroadcaster = {
        ...mockDeps,
        statusBroadcaster: undefined,
      };
      mockDetermineTags.mockResolvedValue(testData);

      // Act
      const result = await action.execute(
        testData,
        depsWithoutStatusBroadcaster,
        mockContext
      );

      // Assert
      expect(mockDetermineTags).toHaveBeenCalledWith(testData, mockDeps.logger);
      expect(result).toEqual(testData);
    });

    it("should send start and completion status messages", async () => {
      // Arrange
      const expectedResult = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: ["healthy", "protein", "grilled"],
        },
      };
      mockDetermineTags.mockResolvedValue(expectedResult);

      // Act
      await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledTimes(2);

      // Check start message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "PROCESSING",
        message: "Determining recipe tags...",
        context: "tag_determination_start",
        noteId: testData.noteId,
        indentLevel: 1,
      });

      // Check completion message
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "Tags determined: healthy, protein, grilled",
        context: "tag_determination_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          determinedTags: ["healthy", "protein", "grilled"],
        },
      });
    });

    it("should handle service returning empty tags array", async () => {
      // Arrange
      const resultWithEmptyTags = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: [],
        },
      };
      mockDetermineTags.mockResolvedValue(resultWithEmptyTags);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "Tag determination completed",
        context: "tag_determination_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          determinedTags: [],
        },
      });
      expect(result).toEqual(resultWithEmptyTags);
    });

    it("should handle service returning null tags", async () => {
      // Arrange
      const resultWithNullTags = {
        ...testData,
        metadata: {
          ...testData.metadata,
          determinedTags: null,
        },
      };
      mockDetermineTags.mockResolvedValue(resultWithNullTags);

      // Act
      const result = await action.execute(testData, mockDeps, mockContext);

      // Assert
      expect(mockAddStatusEventAndBroadcast).toHaveBeenCalledWith({
        importId: testData.importId,
        status: "COMPLETED",
        message: "Tag determination completed",
        context: "tag_determination_complete",
        noteId: testData.noteId,
        indentLevel: 1,
        metadata: {
          determinedTags: null,
        },
      });
      expect(result).toEqual(resultWithNullTags);
    });

    it("should handle service errors and propagate them", async () => {
      // Arrange
      const serviceError = new Error("Service failed");
      mockDetermineTags.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        action.execute(testData, mockDeps, mockContext)
      ).rejects.toThrow("Service failed");
      expect(mockDetermineTags).toHaveBeenCalledWith(testData, mockDeps.logger);
    });

    it("should handle status broadcaster errors", async () => {
      // Arrange
      const broadcasterError = new Error("Broadcaster failed");
      mockDetermineTags.mockResolvedValue(testData);
      mockAddStatusEventAndBroadcast.mockRejectedValue(broadcasterError);

      // Act & Assert
      await expect(
        action.execute(testData, mockDeps, mockContext)
      ).rejects.toThrow("Broadcaster failed");
    });
  });
});
