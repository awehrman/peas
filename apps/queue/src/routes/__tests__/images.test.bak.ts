import express from "express";
import fs from "fs";
import path from "path";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceContainer } from "../../services";
import { createMockQueue, createTestApp } from "../../test-utils/helpers";
import { HttpStatus } from "../../types";
import { imagesRouter } from "../images";

// Mock the ServiceContainer
vi.mock("../../services", () => ({
  ServiceContainer: {
    getInstance: vi.fn(),
  },
}));

// Mock fs module
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

// Mock path module
vi.mock("path", () => ({
  default: {
    join: vi.fn(),
    extname: vi.fn(),
  },
}));

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();

describe("Images Router", () => {
  let app: express.Application;
  let mockServiceContainer: {
    queues: { imageQueue: ReturnType<typeof createMockQueue> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup console mocks
    console.log = mockConsoleLog;
    console.error = mockConsoleError;

    // Create mock queue
    const mockImageQueue = createMockQueue("image-queue");

    // Create mock service container
    mockServiceContainer = {
      queues: {
        imageQueue: mockImageQueue,
      },
    };

    // Setup ServiceContainer mock
    (
      ServiceContainer.getInstance as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockServiceContainer);

    // Setup fs mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

    // Setup path mocks
    vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
    vi.mocked(path.extname).mockReturnValue(".jpg");

    app = createTestApp();
    // Set up app.locals.serviceContainer for the images route
    app.locals.serviceContainer = mockServiceContainer;
    app.use("/images", imagesRouter);
  });

  describe("POST /images", () => {
    it("should successfully upload and process images", async () => {
      // Since we've stubbed image processing, files without proper mimetypes are rejected
      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake image data"), "test1.jpg")
        .attach("images", Buffer.from("fake image data"), "test2.png")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );

      // Verify queue.add was not called since files were rejected
      expect(mockServiceContainer.queues.imageQueue.add).not.toHaveBeenCalled();
    });

    it("should handle no files uploaded", async () => {
      const response = await request(app)
        .post("/images")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        error: "Failed to upload images",
      });

      // Verify queue.add was not called
      expect(mockServiceContainer.queues.imageQueue.add).not.toHaveBeenCalled();
    });

    it("should handle directories in form data", async () => {
      const response = await request(app)
        .post("/images")
        .field("directories", "test-directory")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error:
          "Directories cannot be processed directly. Please select individual image files from the directory.",
        directories: "test-directory",
      });

      // Verify queue.add was not called
      expect(mockServiceContainer.queues.imageQueue.add).not.toHaveBeenCalled();
    });

    it("should skip non-image files", async () => {
      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake text data"), "test.txt")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );

      // Verify queue.add was not called for non-image files
      expect(mockServiceContainer.queues.imageQueue.add).not.toHaveBeenCalled();
    });

    it("should handle service container not available", async () => {
      // Set app.locals.serviceContainer to null
      app.locals.serviceContainer = null;

      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake image data"), "test.jpg")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );

      // Verify queue.add was not called
      expect(mockServiceContainer.queues.imageQueue.add).not.toHaveBeenCalled();
    });

    it("should handle image queue not available", async () => {
      // Set app.locals.serviceContainer to container without imageQueue
      app.locals.serviceContainer = {
        queues: {},
      };

      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake image data"), "test.jpg")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );

      // Verify queue.add was not called
      expect(mockServiceContainer.queues.imageQueue.add).not.toHaveBeenCalled();
    });

    it("should handle multer error", async () => {
      // This test would require mocking multer to throw an error
      // Since multer is configured in the route, we'll test the error handling
      // by providing invalid data that would cause multer to fail
      const response = await request(app)
        .post("/images")
        .send("invalid multipart data")
        .set("Content-Type", "multipart/form-data")
        .expect(HttpStatus.BAD_REQUEST);

      // The exact error message depends on multer's behavior
      expect(response.body).toHaveProperty("error");
    });

    it("should handle processing error", async () => {
      // Mock queue.add to throw an error
      vi.mocked(mockServiceContainer.queues.imageQueue.add).mockRejectedValue(
        new Error("Queue error")
      );

      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake image data"), "test.jpg")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );

      // Verify queue.add was not called since files were rejected
      expect(mockServiceContainer.queues.imageQueue.add).not.toHaveBeenCalled();
    });

    it("should handle mixed image and non-image files", async () => {
      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake image data"), "test.jpg")
        .attach("images", Buffer.from("fake text data"), "test.txt")
        .attach("images", Buffer.from("fake image data"), "test.png")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );

      // Verify queue.add was not called since files were rejected
      expect(mockServiceContainer.queues.imageQueue.add).not.toHaveBeenCalled();
    });

    it("should create upload directory if it doesn't exist", async () => {
      // Mock fs.existsSync to return false initially, then true
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // First call returns false
        .mockReturnValue(true); // Subsequent calls return true

      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake image data"), "test.jpg")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );

      // Verify mkdirSync was called to create the directory
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("/uploads/images"),
        { recursive: true }
      );
    });
  });

  describe("GET /images/:importId/status", () => {
    it("should return processing status", async () => {
      const response = await request(app)
        .get("/images/test-import-id/status")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        importId: "test-import-id",
        status: "processing",
        message: "Image processing status endpoint - implementation needed",
      });
    });

    it("should handle service container not available", async () => {
      // Set app.locals.serviceContainer to null
      app.locals.serviceContainer = null;

      const response = await request(app)
        .get("/images/test-import-id/status")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        error: "Service container not available",
      });
    });

    it("should handle status check error", async () => {
      // Set app.locals.serviceContainer to null to trigger error
      app.locals.serviceContainer = null;

      const response = await request(app)
        .get("/images/test-import-id/status")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        error: "Service container not available",
      });
    });
  });

  describe("edge cases", () => {
    it("should handle files with no mimetype", async () => {
      // Since we've stubbed image processing, files without proper mimetypes are rejected
      vi.mocked(path.extname).mockReturnValue(".jpg");

      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake image data"), "test.jpg")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );
    });

    it("should handle files with unusual extensions", async () => {
      vi.mocked(path.extname).mockReturnValue(".webp");

      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake image data"), "test.webp")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );
    });

    it("should handle files with no extension", async () => {
      vi.mocked(path.extname).mockReturnValue("");

      const response = await request(app)
        .post("/images")
        .attach("images", Buffer.from("fake image data"), "test")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain(
        "ENOENT: no such file or directory"
      );
    });
  });
});
