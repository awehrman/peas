import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockFetchResponse } from "../../../test-utils/factories";
import type { FileGroup } from "../../validation/file-validation";
import { UploadService } from "../upload-service";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock console for environment variable warnings
const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

describe("UploadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT;
  });

  describe("getUploadEndpoint", () => {
    it("should use environment variable when available", () => {
      process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT =
        "https://api.example.com/upload";

      // Access the private method through any
      const endpoint = (UploadService as any).getUploadEndpoint();

      expect(endpoint).toBe("https://api.example.com/upload");
    });

    it("should use window.location.origin when in browser and no env var", () => {
      // Mock window.location
      Object.defineProperty(global, "window", {
        value: {
          location: {
            origin: "http://localhost:3000",
          },
        },
        writable: true,
      });

      const endpoint = (UploadService as any).getUploadEndpoint();

      expect(endpoint).toBe("http://localhost:3000/api/upload");
    });

    it("should use fallback when no window and no env var", () => {
      // Remove window
      delete (global as any).window;

      const endpoint = (UploadService as any).getUploadEndpoint();

      expect(endpoint).toBe("http://localhost:4200/upload");
    });
  });

  describe("uploadFileGroup", () => {
    const mockFileGroup: FileGroup = {
      importId: "test-import-1",
      htmlFile: {
        name: "recipe.html",
        file: new File(["<html>content</html>"], "recipe.html", {
          type: "text/html",
        }),
      },
      imageFiles: [
        {
          name: "image1.jpg",
          file: new File(["image data"], "image1.jpg", {
            type: "image/jpeg",
          }),
        },
        {
          name: "image2.png",
          file: new File(["image data"], "image2.png", {
            type: "image/png",
          }),
        },
      ],
    };

    it("should upload file group successfully", async () => {
      const mockResponse = createMockFetchResponse({
        totalFiles: 3,
        htmlFiles: 1,
        imageFiles: 2,
        errors: [],
        importId: "test-import-1",
      });

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();
      const result = await UploadService.uploadFileGroup(
        mockFileGroup,
        progressCallback
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        })
      );

      expect(result).toEqual({
        totalFiles: 3,
        htmlFiles: 1,
        imageFiles: 2,
        errors: [],
        importId: "test-import-1",
      });

      expect(progressCallback).toHaveBeenCalledWith({
        importId: "test-import-1",
        status: "uploading",
        progress: 0,
        message: "Starting upload...",
      });

      expect(progressCallback).toHaveBeenCalledWith({
        importId: "test-import-1",
        status: "completed",
        progress: 100,
        message: "Upload completed successfully",
      });
    });

    it("should handle server errors", async () => {
      const mockResponse = createMockFetchResponse(
        { error: "Internal server error" },
        500,
        false
      );

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();

      await expect(
        UploadService.uploadFileGroup(mockFileGroup, progressCallback)
      ).rejects.toThrow("Internal server error");

      expect(progressCallback).toHaveBeenLastCalledWith({
        importId: "test-import-1",
        status: "failed",
        progress: 0,
        error: "Server error occurred. Please try again later.",
      });
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const progressCallback = vi.fn();

      await expect(
        UploadService.uploadFileGroup(mockFileGroup, progressCallback)
      ).rejects.toThrow("Network error");

      expect(progressCallback).toHaveBeenLastCalledWith({
        importId: "test-import-1",
        status: "failed",
        progress: 0,
        error: "An unexpected error occurred. Please try again.",
      });
    });

    it("should handle invalid JSON response", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();

      await expect(
        UploadService.uploadFileGroup(mockFileGroup, progressCallback)
      ).rejects.toThrow("Invalid JSON");

      expect(progressCallback).toHaveBeenLastCalledWith({
        importId: "test-import-1",
        status: "failed",
        progress: 0,
        error: "An unexpected error occurred. Please try again.",
      });
    });

    it("should construct FormData correctly", async () => {
      const mockResponse = createMockFetchResponse({
        totalFiles: 3,
        htmlFiles: 1,
        imageFiles: 2,
        errors: [],
        importId: "test-import-1",
      });

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();
      await UploadService.uploadFileGroup(mockFileGroup, progressCallback);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
        })
      );

      // Verify FormData construction by checking the call
      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData).toBeInstanceOf(FormData);
    });

    it("should handle progress updates correctly", async () => {
      const mockResponse = createMockFetchResponse({
        totalFiles: 3,
        htmlFiles: 1,
        imageFiles: 2,
        errors: [],
        importId: "test-import-1",
      });

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();
      await UploadService.uploadFileGroup(mockFileGroup, progressCallback);

      // Should call progress callback at least twice (start and complete)
      expect(progressCallback).toHaveBeenCalledTimes(2);

      // First call should be start
      expect(progressCallback).toHaveBeenNthCalledWith(1, {
        importId: "test-import-1",
        status: "uploading",
        progress: 0,
        message: "Starting upload...",
      });

      // Last call should be completion
      expect(progressCallback).toHaveBeenLastCalledWith({
        importId: "test-import-1",
        status: "completed",
        progress: 100,
        message: "Upload completed successfully",
      });
    });

    it("should handle empty image files", async () => {
      const fileGroupWithoutImages: FileGroup = {
        importId: "test-import-2",
        htmlFile: {
          name: "recipe.html",
          file: new File(["<html>content</html>"], "recipe.html", {
            type: "text/html",
          }),
        },
        imageFiles: [],
      };

      const mockResponse = createMockFetchResponse({
        totalFiles: 1,
        htmlFiles: 1,
        imageFiles: 0,
        errors: [],
        importId: "test-import-2",
      });

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();
      const result = await UploadService.uploadFileGroup(
        fileGroupWithoutImages,
        progressCallback
      );

      expect(result.totalFiles).toBe(1);
      expect(result.htmlFiles).toBe(1);
      expect(result.imageFiles).toBe(0);
    });

    it("should handle server validation errors", async () => {
      const mockResponse = createMockFetchResponse({
        totalFiles: 0,
        htmlFiles: 0,
        imageFiles: 0,
        errors: ["File too large", "Invalid file format"],
        importId: "",
      });

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();

      // Server validation errors don't throw, they return the result with errors
      const result = await UploadService.uploadFileGroup(
        mockFileGroup,
        progressCallback
      );

      expect(result).toEqual({
        totalFiles: 0,
        htmlFiles: 0,
        imageFiles: 0,
        errors: ["File too large", "Invalid file format"],
        importId: "",
      });

      expect(progressCallback).toHaveBeenLastCalledWith({
        importId: "test-import-1",
        status: "completed",
        progress: 100,
        message: "Upload completed successfully",
      });
    });

    it("should handle timeout scenarios", async () => {
      // Mock a timeout by rejecting with a timeout error
      mockFetch.mockRejectedValue(new Error("Request timeout"));

      const progressCallback = vi.fn();

      await expect(
        UploadService.uploadFileGroup(mockFileGroup, progressCallback)
      ).rejects.toThrow("Upload timed out");

      expect(progressCallback).toHaveBeenLastCalledWith({
        importId: "test-import-1",
        status: "failed",
        progress: 0,
        error:
          "Upload timed out. Please try again with smaller files or better connection.",
      });
    });

    it("should handle missing progress callback gracefully", async () => {
      const mockResponse = createMockFetchResponse({
        totalFiles: 3,
        htmlFiles: 1,
        imageFiles: 2,
        errors: [],
        importId: "test-import-1",
      });

      mockFetch.mockResolvedValue(mockResponse);

      // Should not throw when progress callback is not provided
      await expect(
        UploadService.uploadFileGroup(mockFileGroup, undefined as any)
      ).resolves.toBeDefined();
    });
  });

  describe("error handling edge cases", () => {
    const edgeCaseMockFileGroup: FileGroup = {
      importId: "test-import-edge",
      htmlFile: {
        name: "edge.html",
        file: new File(["<html>edge case</html>"], "edge.html", {
          type: "text/html",
        }),
      },
      imageFiles: [],
    };

    it("should handle malformed error responses", async () => {
      const mockResponse = createMockFetchResponse(null, 500, false);

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();

      await expect(
        UploadService.uploadFileGroup(edgeCaseMockFileGroup, progressCallback)
      ).rejects.toThrow("Cannot read properties of null");

      expect(progressCallback).toHaveBeenLastCalledWith({
        importId: "test-import-edge",
        status: "failed",
        progress: 0,
        error: "An unexpected error occurred. Please try again.",
      });
    });

    it("should handle response without error field", async () => {
      const mockResponse = createMockFetchResponse({}, 400, false);

      mockFetch.mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();

      await expect(
        UploadService.uploadFileGroup(edgeCaseMockFileGroup, progressCallback)
      ).rejects.toThrow("Upload failed with status 400");
    });
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });
});
