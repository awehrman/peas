import {
  getIngredientLinesByPattern,
  getPatternStatistics,
  getPatternsWithIngredientLines,
  getUnlinkedIngredientLines,
} from "@peas/database";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestApp } from "../../test-utils/helpers";
import { HttpStatus } from "../../types";
import { ErrorHandler } from "../../utils/error-handler";
// Import the router after mocking
import patternsRouter from "../patterns";

// Type definitions for mock data
type MockPattern = {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  ruleIds: string[];
  exampleLine: string | null;
  occurrenceCount: number;
  parsedIngredientLines: MockIngredientLine[];
};

type MockIngredientLine = {
  id: string;
  reference: string;
  lineIndex: number;
  noteId: string | null;
  createdAt: string | Date;
};

// Mock the database functions
vi.mock("@peas/database", () => ({
  getPatternStatistics: vi.fn(),
  getPatternsWithIngredientLines: vi.fn(),
  getIngredientLinesByPattern: vi.fn(),
  getUnlinkedIngredientLines: vi.fn(),
  prisma: {},
}));

// Mock the middleware
vi.mock("../../middleware/validation", () => ({
  validateQuery: vi.fn(() => (req: unknown, res: unknown, next: () => void) => {
    // Allow all requests to pass through validation
    next();
  }),
}));

// Mock the error handler
vi.mock("../../utils/error-handler", () => ({
  ErrorHandler: {
    handleRouteError: vi.fn((error, operation) => ({
      error: "Internal server error",
      operation,
      message: error instanceof Error ? error.message : String(error),
    })),
  },
}));

describe("Patterns Router", () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
    app.use("/patterns", patternsRouter);
  });

  describe("GET /patterns/stats", () => {
    it("should return pattern statistics successfully", async () => {
      const mockStats = {
        totalPatterns: 150,
        totalIngredientLines: 1250,
        patternsWithLines: 120,
        averageOccurrenceCount: 8.33,
        coveragePercentage: 80.0,
      };

      vi.mocked(getPatternStatistics).mockResolvedValue(mockStats);

      const response = await request(app)
        .get("/patterns/stats")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockStats);
      expect(getPatternStatistics).toHaveBeenCalledTimes(1);
    });

    it("should handle database errors", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(getPatternStatistics).mockRejectedValue(mockError);

      const response = await request(app)
        .get("/patterns/stats")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        error: "Internal server error",
        operation: "get-pattern-stats",
        message: "Database connection failed",
      });

      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        mockError,
        "get-pattern-stats"
      );
    });
  });

  describe("GET /patterns", () => {
    it("should return patterns with default parameters", async () => {
      const mockPatterns: MockPattern[] = [
        {
          id: "pattern-1",
          createdAt: "2025-08-08T15:38:21.351Z",
          updatedAt: "2025-08-08T15:38:21.351Z",
          ruleIds: ["rule-1", "rule-2"],
          exampleLine: "1 cup flour",
          occurrenceCount: 5,
          parsedIngredientLines: [],
        },
        {
          id: "pattern-2",
          createdAt: "2025-08-08T15:38:21.351Z",
          updatedAt: "2025-08-08T15:38:21.351Z",
          ruleIds: ["rule-3"],
          exampleLine: "2 eggs",
          occurrenceCount: 3,
          parsedIngredientLines: [],
        },
      ];

      vi.mocked(getPatternsWithIngredientLines).mockResolvedValue(
        mockPatterns as Awaited<
          ReturnType<typeof getPatternsWithIngredientLines>
        >
      );

      const response = await request(app)
        .get("/patterns")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockPatterns);
      expect(getPatternsWithIngredientLines).toHaveBeenCalledWith(
        expect.any(Object),
        {
          limit: undefined,
          offset: undefined,
          minOccurrenceCount: undefined,
          noteId: undefined,
        }
      );
    });

    it("should return patterns with query parameters", async () => {
      const mockPatterns: MockPattern[] = [
        {
          id: "pattern-1",
          createdAt: "2025-08-08T15:38:21.357Z",
          updatedAt: "2025-08-08T15:38:21.357Z",
          ruleIds: ["rule-1"],
          exampleLine: "1 cup flour",
          occurrenceCount: 10,
          parsedIngredientLines: [],
        },
      ];

      vi.mocked(getPatternsWithIngredientLines).mockResolvedValue(
        mockPatterns as Awaited<
          ReturnType<typeof getPatternsWithIngredientLines>
        >
      );

      const response = await request(app)
        .get("/patterns?limit=10&offset=5&minOccurrenceCount=5&noteId=note-123")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockPatterns);
      expect(getPatternsWithIngredientLines).toHaveBeenCalledWith(
        expect.any(Object),
        {
          limit: 10,
          offset: 5,
          minOccurrenceCount: 5,
          noteId: "note-123",
        }
      );
    });

    it("should handle database errors", async () => {
      const mockError = new Error("Database query failed");
      vi.mocked(getPatternsWithIngredientLines).mockRejectedValue(mockError);

      const response = await request(app)
        .get("/patterns")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        error: "Internal server error",
        operation: "get-patterns",
        message: "Database query failed",
      });

      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        mockError,
        "get-patterns"
      );
    });
  });

  describe("GET /patterns/:patternId/lines", () => {
    it("should return ingredient lines for a pattern successfully", async () => {
      const mockLines: MockIngredientLine[] = [
        {
          id: "line-1",
          reference: "1 cup flour",
          lineIndex: 1,
          noteId: "note-1",
          createdAt: "2025-08-08T15:38:21.364Z",
        },
        {
          id: "line-2",
          reference: "2 cups flour",
          lineIndex: 2,
          noteId: "note-1",
          createdAt: "2025-08-08T15:38:21.364Z",
        },
      ];

      vi.mocked(getIngredientLinesByPattern).mockResolvedValue(
        mockLines as Awaited<ReturnType<typeof getIngredientLinesByPattern>>
      );

      const response = await request(app)
        .get("/patterns/pattern-123/lines")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockLines);
      expect(getIngredientLinesByPattern).toHaveBeenCalledWith(
        expect.any(Object),
        "pattern-123",
        {
          limit: undefined,
          offset: undefined,
          noteId: undefined,
        }
      );
    });

    it("should return ingredient lines with query parameters", async () => {
      const mockLines: MockIngredientLine[] = [
        {
          id: "line-1",
          reference: "1 cup flour",
          lineIndex: 1,
          noteId: "note-1",
          createdAt: "2025-08-08T15:38:21.366Z",
        },
      ];

      vi.mocked(getIngredientLinesByPattern).mockResolvedValue(
        mockLines as Awaited<ReturnType<typeof getIngredientLinesByPattern>>
      );

      const response = await request(app)
        .get("/patterns/pattern-123/lines?limit=5&offset=2&noteId=note-456")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockLines);
      expect(getIngredientLinesByPattern).toHaveBeenCalledWith(
        expect.any(Object),
        "pattern-123",
        {
          limit: 5,
          offset: 2,
          noteId: "note-456",
        }
      );
    });

    it("should return 400 when pattern ID is missing", async () => {
      const response = await request(app)
        .get("/patterns/  /lines")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({ error: "Pattern ID is required" });
      expect(getIngredientLinesByPattern).not.toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      const mockError = new Error("Database query failed");
      vi.mocked(getIngredientLinesByPattern).mockRejectedValue(mockError);

      const response = await request(app)
        .get("/patterns/pattern-123/lines")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        error: "Internal server error",
        operation: "get-pattern-lines",
        message: "Database query failed",
      });

      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        mockError,
        "get-pattern-lines"
      );
    });
  });

  describe("GET /patterns/unlinked/lines", () => {
    it("should return unlinked ingredient lines successfully", async () => {
      const mockLines: MockIngredientLine[] = [
        {
          id: "line-1",
          reference: "1 cup flour",
          lineIndex: 1,
          noteId: "note-1",
          createdAt: "2025-08-08T15:38:21.364Z",
        },
        {
          id: "line-2",
          reference: "2 eggs",
          lineIndex: 2,
          noteId: "note-1",
          createdAt: "2025-08-08T15:38:21.364Z",
        },
      ];

      vi.mocked(getUnlinkedIngredientLines).mockResolvedValue(
        mockLines as Awaited<ReturnType<typeof getUnlinkedIngredientLines>>
      );

      const response = await request(app)
        .get("/patterns/unlinked/lines")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockLines);
      expect(getUnlinkedIngredientLines).toHaveBeenCalledWith(
        expect.any(Object),
        {
          limit: undefined,
          offset: undefined,
          noteId: undefined,
        }
      );
    });

    it("should return unlinked ingredient lines with query parameters", async () => {
      const mockLines: MockIngredientLine[] = [
        {
          id: "line-1",
          reference: "1 cup flour",
          lineIndex: 1,
          noteId: "note-1",
          createdAt: "2025-08-08T15:38:21.364Z",
        },
      ];

      vi.mocked(getUnlinkedIngredientLines).mockResolvedValue(
        mockLines as Awaited<ReturnType<typeof getUnlinkedIngredientLines>>
      );

      const response = await request(app)
        .get("/patterns/unlinked/lines?limit=10&offset=5&noteId=note-789")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockLines);
      expect(getUnlinkedIngredientLines).toHaveBeenCalledWith(
        expect.any(Object),
        {
          limit: 10,
          offset: 5,
          noteId: "note-789",
        }
      );
    });

    it("should handle database errors", async () => {
      const mockError = new Error("Database query failed");
      vi.mocked(getUnlinkedIngredientLines).mockRejectedValue(mockError);

      const response = await request(app)
        .get("/patterns/unlinked/lines")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(response.body).toEqual({
        error: "Internal server error",
        operation: "get-unlinked-lines",
        message: "Database query failed",
      });

      expect(ErrorHandler.handleRouteError).toHaveBeenCalledWith(
        mockError,
        "get-unlinked-lines"
      );
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty results from database", async () => {
      vi.mocked(getPatternsWithIngredientLines).mockResolvedValue([]);

      const response = await request(app)
        .get("/patterns")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual([]);
    });

    it("should handle null pattern ID in params", async () => {
      const response = await request(app)
        .get("/patterns/null/lines")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({ error: "Pattern ID is required" });
    });

    it("should handle undefined pattern ID in params", async () => {
      const response = await request(app)
        .get("/patterns/undefined/lines")
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toEqual({ error: "Pattern ID is required" });
    });

    it("should handle non-numeric query parameters gracefully", async () => {
      const mockPatterns: MockPattern[] = [];
      vi.mocked(getPatternsWithIngredientLines).mockResolvedValue(
        mockPatterns as Awaited<
          ReturnType<typeof getPatternsWithIngredientLines>
        >
      );

      const response = await request(app)
        .get("/patterns?limit=abc&offset=def&minOccurrenceCount=ghi")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(mockPatterns);
      expect(getPatternsWithIngredientLines).toHaveBeenCalledWith(
        expect.any(Object),
        {
          limit: undefined,
          offset: undefined,
          minOccurrenceCount: undefined,
          noteId: undefined,
        }
      );
    });

    it("should handle unknown route", async () => {
      const response = await request(app)
        .get("/patterns/unknown/route")
        .expect(HttpStatus.NOT_FOUND);

      expect(response.body).toBeDefined();
    });
  });
});
