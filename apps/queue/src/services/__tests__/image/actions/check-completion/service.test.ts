import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMockLogger,
  createMockStatusBroadcaster,
} from "../../../../../test-utils/helpers";
import type {
  ImageJobData,
  ImageWorkerDependencies,
} from "../../../../../workers/image/types";
import { checkImageCompletion } from "../../../../image/actions/check-completion/service";

// Mock dependencies
vi.mock("../../../../note/actions/track-completion/service", () => ({
  markImageJobCompleted: vi.fn(),
}));

describe("Check Image Completion Service", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockStatusBroadcaster: ReturnType<typeof createMockStatusBroadcaster>;
  let mockDependencies: ImageWorkerDependencies;
  let mockData: ImageJobData;
  let mockMarkImageJobCompleted: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked function
    const trackCompletionModule = vi.mocked(
      await import("../../../../note/actions/track-completion/service")
    );
    mockMarkImageJobCompleted = vi.mocked(
      trackCompletionModule.markImageJobCompleted
    );

    // Create mock logger
    mockLogger = createMockLogger();

    // Create mock status broadcaster
    mockStatusBroadcaster = createMockStatusBroadcaster();

    // Create mock dependencies
    mockDependencies = {
      logger: mockLogger,
      statusBroadcaster: mockStatusBroadcaster,
    } as unknown as ImageWorkerDependencies;

    // Create mock data
    mockData = {
      noteId: "test-note-123",
      importId: "test-import-456",
      imagePath: "/path/to/image.jpg",
      outputDir: "/path/to/output",
      filename: "image.jpg",
      originalPath: "/path/to/original.jpg",
      thumbnailPath: "/path/to/thumbnail.jpg",
      crop3x2Path: "/path/to/crop3x2.jpg",
      crop4x3Path: "/path/to/crop4x3.jpg",
      crop16x9Path: "/path/to/crop16x9.jpg",
      originalSize: 1024,
      thumbnailSize: 512,
      crop3x2Size: 768,
      crop4x3Size: 768,
      crop16x9Size: 768,
      metadata: {
        width: 1920,
        height: 1080,
        format: "jpeg",
      },
    };

    // Setup default mocks
    mockMarkImageJobCompleted.mockImplementation(() => {});
  });

  describe("checkImageCompletion", () => {
    describe("successful completion check", () => {
      it("should mark image job as completed successfully", async () => {
        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "test-note-123",
          mockLogger,
          mockStatusBroadcaster
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] Marked image job as completed for note test-note-123"
        );

        expect(result).toEqual(mockData);
      });

      it("should handle different note IDs", async () => {
        mockData.noteId = "different-note-789";

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "different-note-789",
          mockLogger,
          mockStatusBroadcaster
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] Marked image job as completed for note different-note-789"
        );

        expect(result).toEqual(mockData);
      });

      it("should preserve all data fields", async () => {
        const dataWithR2 = {
          ...mockData,
          r2Key: "test-key",
          r2Url: "https://r2.example.com/test.jpg",
          r2OriginalUrl: "https://r2.example.com/original.jpg",
          r2ThumbnailUrl: "https://r2.example.com/thumbnail.jpg",
          r2Crop3x2Url: "https://r2.example.com/crop3x2.jpg",
          r2Crop4x3Url: "https://r2.example.com/crop4x3.jpg",
          r2Crop16x9Url: "https://r2.example.com/crop16x9.jpg",
        };

        const result = await checkImageCompletion(dataWithR2, mockDependencies);

        expect(result).toEqual(dataWithR2);
        expect(result.r2Key).toBe("test-key");
        expect(result.r2Url).toBe("https://r2.example.com/test.jpg");
        expect(result.r2OriginalUrl).toBe(
          "https://r2.example.com/original.jpg"
        );
        expect(result.r2ThumbnailUrl).toBe(
          "https://r2.example.com/thumbnail.jpg"
        );
        expect(result.r2Crop3x2Url).toBe("https://r2.example.com/crop3x2.jpg");
        expect(result.r2Crop4x3Url).toBe("https://r2.example.com/crop4x3.jpg");
        expect(result.r2Crop16x9Url).toBe(
          "https://r2.example.com/crop16x9.jpg"
        );
      });
    });

    describe("missing note ID", () => {
      it("should skip completion check when noteId is missing", async () => {
        mockData.noteId = "";

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] No note ID available, skipping completion check"
        );
        expect(mockMarkImageJobCompleted).not.toHaveBeenCalled();

        expect(result).toEqual(mockData);
      });

      it("should skip completion check when noteId is undefined", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockData.noteId = undefined as any;

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] No note ID available, skipping completion check"
        );
        expect(mockMarkImageJobCompleted).not.toHaveBeenCalled();

        expect(result).toEqual(mockData);
      });

      it("should skip completion check when noteId is null", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockData.noteId = null as any;

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] No note ID available, skipping completion check"
        );
        expect(mockMarkImageJobCompleted).not.toHaveBeenCalled();

        expect(result).toEqual(mockData);
      });
    });

    describe("error handling", () => {
      it("should handle markImageJobCompleted throwing an error", async () => {
        mockMarkImageJobCompleted.mockImplementation(() => {
          throw new Error("Database connection failed");
        });

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] Error marking completion: Error: Database connection failed"
        );

        expect(result).toEqual(mockData);
      });

      it("should handle markImageJobCompleted throwing a string error", async () => {
        mockMarkImageJobCompleted.mockImplementation(() => {
          throw "String error";
        });

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] Error marking completion: String error"
        );

        expect(result).toEqual(mockData);
      });

      it("should handle markImageJobCompleted throwing a number error", async () => {
        mockMarkImageJobCompleted.mockImplementation(() => {
          throw 500;
        });

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] Error marking completion: 500"
        );

        expect(result).toEqual(mockData);
      });

      it("should handle markImageJobCompleted throwing an object error", async () => {
        const errorObject = { code: "DB_ERROR", message: "Database error" };
        mockMarkImageJobCompleted.mockImplementation(() => {
          throw errorObject;
        });

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] Error marking completion: [object Object]"
        );

        expect(result).toEqual(mockData);
      });
    });

    describe("edge cases", () => {
      it("should handle empty noteId string", async () => {
        mockData.noteId = "";

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] No note ID available, skipping completion check"
        );
        expect(mockMarkImageJobCompleted).not.toHaveBeenCalled();

        expect(result).toEqual(mockData);
      });

      it("should handle whitespace-only noteId", async () => {
        mockData.noteId = "   ";

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] Marked image job as completed for note    "
        );
        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "   ",
          mockLogger,
          mockStatusBroadcaster
        );

        expect(result).toEqual(mockData);
      });

      it("should handle very long noteId", async () => {
        const longNoteId = "a".repeat(1000);
        mockData.noteId = longNoteId;

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          `[CHECK_IMAGE_COMPLETION] Marked image job as completed for note ${longNoteId}`
        );
        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          longNoteId,
          mockLogger,
          mockStatusBroadcaster
        );

        expect(result).toEqual(mockData);
      });

      it("should handle special characters in noteId", async () => {
        mockData.noteId = "note-123!@#$%^&*()_+-=[]{}|;':\",./<>?";

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockLogger.log).toHaveBeenCalledWith(
          "[CHECK_IMAGE_COMPLETION] Marked image job as completed for note note-123!@#$%^&*()_+-=[]{}|;':\",./<>?"
        );
        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "note-123!@#$%^&*()_+-=[]{}|;':\",./<>?",
          mockLogger,
          mockStatusBroadcaster
        );

        expect(result).toEqual(mockData);
      });

      it("should handle missing importId", async () => {
        mockData.importId = "";

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "test-note-123",
          mockLogger,
          mockStatusBroadcaster
        );

        expect(result).toEqual(mockData);
      });

      it("should handle missing imagePath", async () => {
        mockData.imagePath = "";

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "test-note-123",
          mockLogger,
          mockStatusBroadcaster
        );

        expect(result).toEqual(mockData);
      });

      it("should handle missing filename", async () => {
        mockData.filename = "";

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "test-note-123",
          mockLogger,
          mockStatusBroadcaster
        );

        expect(result).toEqual(mockData);
      });

      it("should handle missing outputDir", async () => {
        mockData.outputDir = "";

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "test-note-123",
          mockLogger,
          mockStatusBroadcaster
        );

        expect(result).toEqual(mockData);
      });

      it("should handle zero file sizes", async () => {
        mockData.originalSize = 0;
        mockData.thumbnailSize = 0;
        mockData.crop3x2Size = 0;
        mockData.crop4x3Size = 0;
        mockData.crop16x9Size = 0;

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "test-note-123",
          mockLogger,
          mockStatusBroadcaster
        );

        expect(result).toEqual(mockData);
        expect(result.originalSize).toBe(0);
        expect(result.thumbnailSize).toBe(0);
        expect(result.crop3x2Size).toBe(0);
        expect(result.crop4x3Size).toBe(0);
        expect(result.crop16x9Size).toBe(0);
      });

      it("should handle missing metadata", async () => {
        mockData.metadata = {
          width: 0,
          height: 0,
          format: "",
        };

        const result = await checkImageCompletion(mockData, mockDependencies);

        expect(mockMarkImageJobCompleted).toHaveBeenCalledWith(
          "test-note-123",
          mockLogger,
          mockStatusBroadcaster
        );

        expect(result).toEqual(mockData);
        expect(result.metadata.width).toBe(0);
        expect(result.metadata.height).toBe(0);
        expect(result.metadata.format).toBe("");
      });
    });
  });
});
