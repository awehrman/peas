import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceContainer } from "../../services";
import { createMockQueue, createTestApp } from "../../test-utils/helpers";
import { ActionName, HttpStatus } from "../../types";
// Import the router after mocking
import { notesRouter } from "../notes";

// Mock the ServiceContainer
vi.mock("../../services", () => ({
  ServiceContainer: {
    getInstance: vi.fn(),
  },
}));

// Mock crypto.randomUUID
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "test-uuid-12345"),
}));

describe("Notes Router", () => {
  let app: express.Application;
  let mockServiceContainer: {
    queues: { noteQueue: ReturnType<typeof createMockQueue> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock queue
    const mockNoteQueue = createMockQueue("note-queue");

    // Create mock service container
    mockServiceContainer = {
      queues: {
        noteQueue: mockNoteQueue,
      },
    };

    // Setup ServiceContainer mock
    (
      ServiceContainer.getInstance as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockServiceContainer);

    app = createTestApp();
    app.use("/notes", notesRouter);
  });

  describe("POST /notes", () => {
    it("should successfully queue a note for processing", async () => {
      const testContent =
        "<html><body><h1>Test Recipe</h1><p>1 cup flour</p></body></html>";

      const response = await request(app)
        .post("/notes")
        .send({ content: testContent })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        queued: true,
        importId: "test-uuid-12345",
      });

      // Verify ServiceContainer was called
      expect(ServiceContainer.getInstance).toHaveBeenCalledTimes(1);

      // Verify queue.add was called with correct parameters
      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledTimes(
        1
      );
      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        {
          content: testContent,
          imageFiles: [],
          importId: "test-uuid-12345",
        }
      );
    });

    it("should handle empty content string", async () => {
      const response = await request(app)
        .post("/notes")
        .send({ content: "" })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "'content' must be a non-empty string",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle whitespace-only content", async () => {
      const response = await request(app)
        .post("/notes")
        .send({ content: "   \n\t  " })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "'content' must be a non-empty string",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle missing content field", async () => {
      const response = await request(app)
        .post("/notes")
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "'content' must be a non-empty string",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle non-string content", async () => {
      const response = await request(app)
        .post("/notes")
        .send({ content: 123 })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "'content' must be a non-empty string",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle null content", async () => {
      const response = await request(app)
        .post("/notes")
        .send({ content: null })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "'content' must be a non-empty string",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle undefined content", async () => {
      const response = await request(app)
        .post("/notes")
        .send({ content: undefined })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "'content' must be a non-empty string",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle boolean content", async () => {
      const response = await request(app)
        .post("/notes")
        .send({ content: true })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "'content' must be a non-empty string",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle array content", async () => {
      const response = await request(app)
        .post("/notes")
        .send({ content: ["test"] })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "'content' must be a non-empty string",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle object content", async () => {
      const response = await request(app)
        .post("/notes")
        .send({ content: { test: "value" } })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({
        error: "'content' must be a non-empty string",
      });

      // Verify ServiceContainer was not called
      expect(ServiceContainer.getInstance).not.toHaveBeenCalled();
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle ServiceContainer.getInstance errors", async () => {
      const mockError = new Error("Service container error");
      (
        ServiceContainer.getInstance as ReturnType<typeof vi.fn>
      ).mockRejectedValue(mockError);

      const response = await request(app)
        .post("/notes")
        .send({ content: "valid content" })
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      // Should return 500 error when ServiceContainer fails
      // Express default error handling may return empty body or different format
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      // Verify ServiceContainer was called
      expect(ServiceContainer.getInstance).toHaveBeenCalledTimes(1);
      expect(mockServiceContainer.queues.noteQueue.add).not.toHaveBeenCalled();
    });

    it("should handle queue.add errors", async () => {
      const mockError = new Error("Queue error");
      (
        mockServiceContainer.queues.noteQueue.add as ReturnType<typeof vi.fn>
      ).mockRejectedValue(mockError);

      const response = await request(app)
        .post("/notes")
        .send({ content: "valid content" })
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      // Should return 500 error when queue.add fails
      // Express default error handling may return empty body or different format
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      // Verify ServiceContainer was called
      expect(ServiceContainer.getInstance).toHaveBeenCalledTimes(1);
      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledTimes(
        1
      );
    });

    it("should handle different content types and lengths", async () => {
      const longContent = "a".repeat(10000);

      const response = await request(app)
        .post("/notes")
        .send({ content: longContent })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        queued: true,
        importId: "test-uuid-12345",
      });

      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        {
          content: longContent,
          imageFiles: [],
          importId: "test-uuid-12345",
        }
      );
    });

    it("should handle HTML content with special characters", async () => {
      const htmlContent = `<html><body><h1>Recipe & More</h1><p>1 cup flour & sugar</p><div>Instructions: "Mix well"</div></body></html>`;

      const response = await request(app)
        .post("/notes")
        .send({ content: htmlContent })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        queued: true,
        importId: "test-uuid-12345",
      });

      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        {
          content: htmlContent,
          imageFiles: [],
          importId: "test-uuid-12345",
        }
      );
    });

    it("should handle content with unicode characters", async () => {
      const unicodeContent = "Recipe with émojis 🍰 and special chars ñáéíóú";

      const response = await request(app)
        .post("/notes")
        .send({ content: unicodeContent })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        queued: true,
        importId: "test-uuid-12345",
      });

      expect(mockServiceContainer.queues.noteQueue.add).toHaveBeenCalledWith(
        ActionName.PARSE_HTML,
        {
          content: unicodeContent,
          imageFiles: [],
          importId: "test-uuid-12345",
        }
      );
    });
  });

  describe("Router Configuration", () => {
    it("should have the expected route configured", () => {
      const routes = notesRouter.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route?.path,
          method: Object.keys(
            (layer.route as { methods?: Record<string, boolean> })?.methods ||
              {}
          ).find(
            (key) =>
              (layer.route as { methods?: Record<string, boolean> })?.methods?.[
                key
              ]
          ),
        }));

      expect(routes).toEqual([{ path: "/", method: "post" }]);
    });

    it("should handle 404 for non-existent routes", async () => {
      const response = await request(app).get("/notes/nonexistent");

      expect(response.status).toBe(404);
    });

    it("should handle GET requests to root path", async () => {
      const response = await request(app).get("/notes/");

      expect(response.status).toBe(404);
    });
  });
});
