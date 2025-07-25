import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  createMockFile,
  createMockNext,
  createMockRequest,
  createMockResponse,
  createTestEnvironment,
} from "../../test-utils/test-utils";
import { HttpStatus } from "../../types";
import {
  CommonValidations,
  ValidationSchemas,
  validateBody,
  validateEnvironment,
  validateFile,
  validateParams,
  validateQuery,
} from "../validation";

// Type for Multer file (matching the validation.ts definition)
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
};

// Helper function to safely set file on request
function setRequestFile(req: Request, file: MulterFile | null): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).file = file;
}

// ============================================================================
// VALIDATION SCHEMAS TESTS
// ============================================================================

describe("ValidationSchemas", () => {
  describe("query", () => {
    describe("page", () => {
      it("should validate valid page numbers", () => {
        expect(ValidationSchemas.query.page.parse("1")).toBe(1);
        expect(ValidationSchemas.query.page.parse("10")).toBe(10);
        expect(ValidationSchemas.query.page.parse(5)).toBe(5);
      });

      it("should use default value when page is missing", () => {
        expect(ValidationSchemas.query.page.parse(undefined)).toBe(1);
      });

      it("should reject invalid page numbers", () => {
        expect(() => ValidationSchemas.query.page.parse("0")).toThrow();
        expect(() => ValidationSchemas.query.page.parse("-1")).toThrow();
        expect(() => ValidationSchemas.query.page.parse("abc")).toThrow();
      });
    });

    describe("limit", () => {
      it("should validate valid limit numbers", () => {
        expect(ValidationSchemas.query.limit.parse("1")).toBe(1);
        expect(ValidationSchemas.query.limit.parse("50")).toBe(50);
        expect(ValidationSchemas.query.limit.parse("100")).toBe(100);
      });

      it("should use default value when limit is missing", () => {
        expect(ValidationSchemas.query.limit.parse(undefined)).toBe(20);
      });

      it("should reject invalid limit numbers", () => {
        expect(() => ValidationSchemas.query.limit.parse("0")).toThrow();
        expect(() => ValidationSchemas.query.limit.parse("101")).toThrow();
        expect(() => ValidationSchemas.query.limit.parse("abc")).toThrow();
      });
    });

    describe("status", () => {
      it("should validate valid status values", () => {
        expect(ValidationSchemas.query.status.parse("PENDING")).toBe("PENDING");
        expect(ValidationSchemas.query.status.parse("PROCESSING")).toBe(
          "PROCESSING"
        );
        expect(ValidationSchemas.query.status.parse("COMPLETED")).toBe(
          "COMPLETED"
        );
        expect(ValidationSchemas.query.status.parse("FAILED")).toBe("FAILED");
      });

      it("should allow undefined status", () => {
        expect(ValidationSchemas.query.status.parse(undefined)).toBeUndefined();
      });

      it("should reject invalid status values", () => {
        expect(() => ValidationSchemas.query.status.parse("INVALID")).toThrow();
      });
    });

    describe("search", () => {
      it("should validate valid search strings", () => {
        expect(ValidationSchemas.query.search.parse("test")).toBe("test");
        expect(ValidationSchemas.query.search.parse("a".repeat(100))).toBe(
          "a".repeat(100)
        );
      });

      it("should allow undefined search", () => {
        expect(ValidationSchemas.query.search.parse(undefined)).toBeUndefined();
      });

      it("should reject invalid search strings", () => {
        expect(() => ValidationSchemas.query.search.parse("")).toThrow();
        expect(() =>
          ValidationSchemas.query.search.parse("a".repeat(101))
        ).toThrow();
      });
    });

    describe("detailed", () => {
      it("should transform string values to boolean", () => {
        expect(ValidationSchemas.query.detailed.parse("true")).toBe(true);
        expect(ValidationSchemas.query.detailed.parse("false")).toBe(false);
      });

      it("should use default value when detailed is missing", () => {
        expect(ValidationSchemas.query.detailed.parse(undefined)).toBe(false);
      });

      it("should reject invalid detailed values", () => {
        expect(() => ValidationSchemas.query.detailed.parse("yes")).toThrow();
        expect(() => ValidationSchemas.query.detailed.parse("no")).toThrow();
      });
    });

    describe("includeMetrics", () => {
      it("should transform string values to boolean", () => {
        expect(ValidationSchemas.query.includeMetrics.parse("true")).toBe(true);
        expect(ValidationSchemas.query.includeMetrics.parse("false")).toBe(
          false
        );
      });

      it("should use default value when includeMetrics is missing", () => {
        expect(ValidationSchemas.query.includeMetrics.parse(undefined)).toBe(
          false
        );
      });

      it("should reject invalid includeMetrics values", () => {
        expect(() =>
          ValidationSchemas.query.includeMetrics.parse("yes")
        ).toThrow();
        expect(() =>
          ValidationSchemas.query.includeMetrics.parse("no")
        ).toThrow();
      });
    });

    describe("action", () => {
      it("should validate valid action values", () => {
        expect(ValidationSchemas.query.action.parse("health")).toBe("health");
        expect(ValidationSchemas.query.action.parse("queue")).toBe("queue");
        expect(ValidationSchemas.query.action.parse("database")).toBe(
          "database"
        );
        expect(ValidationSchemas.query.action.parse("redis")).toBe("redis");
      });

      it("should allow undefined action", () => {
        expect(ValidationSchemas.query.action.parse(undefined)).toBeUndefined();
      });

      it("should reject invalid action values", () => {
        expect(() => ValidationSchemas.query.action.parse("invalid")).toThrow();
      });
    });
  });

  describe("params", () => {
    describe("id", () => {
      it("should validate valid UUIDs", () => {
        const validUUID = "123e4567-e89b-12d3-a456-426614174000";
        expect(ValidationSchemas.params.id.parse(validUUID)).toBe(validUUID);
      });

      it("should reject invalid UUIDs", () => {
        expect(() =>
          ValidationSchemas.params.id.parse("invalid-uuid")
        ).toThrow();
        expect(() => ValidationSchemas.params.id.parse("123")).toThrow();
        expect(() => ValidationSchemas.params.id.parse("")).toThrow();
      });
    });
  });

  describe("body", () => {
    describe("content", () => {
      it("should validate valid content strings", () => {
        expect(ValidationSchemas.body.content.parse("valid content")).toBe(
          "valid content"
        );
        expect(
          ValidationSchemas.body.content.parse("a".repeat(10 * 1024 * 1024))
        ).toBe("a".repeat(10 * 1024 * 1024));
      });

      it("should reject invalid content", () => {
        expect(() => ValidationSchemas.body.content.parse("")).toThrow();
        expect(() =>
          ValidationSchemas.body.content.parse("a".repeat(10 * 1024 * 1024 + 1))
        ).toThrow();
      });
    });

    describe("metadata", () => {
      it("should validate valid metadata", () => {
        const validMetadata = {
          importId: "123e4567-e89b-12d3-a456-426614174000",
          filename: "test.html",
          source: "https://example.com",
        };
        expect(ValidationSchemas.body.metadata.parse(validMetadata)).toEqual(
          validMetadata
        );
      });

      it("should allow partial metadata", () => {
        expect(ValidationSchemas.body.metadata.parse({})).toEqual({});
        expect(
          ValidationSchemas.body.metadata.parse({ filename: "test.html" })
        ).toEqual({ filename: "test.html" });
      });

      it("should allow undefined metadata", () => {
        expect(
          ValidationSchemas.body.metadata.parse(undefined)
        ).toBeUndefined();
      });

      it("should reject invalid metadata", () => {
        expect(() =>
          ValidationSchemas.body.metadata.parse({ importId: "invalid-uuid" })
        ).toThrow();
        expect(() =>
          ValidationSchemas.body.metadata.parse({ source: "not-a-url" })
        ).toThrow();
        expect(() =>
          ValidationSchemas.body.metadata.parse({ filename: "" })
        ).toThrow();
        expect(() =>
          ValidationSchemas.body.metadata.parse({ filename: "a".repeat(256) })
        ).toThrow();
      });
    });
  });

  describe("file", () => {
    describe("filename", () => {
      it("should validate valid filenames", () => {
        expect(ValidationSchemas.file.filename.parse("test.html")).toBe(
          "test.html"
        );
        expect(ValidationSchemas.file.filename.parse("a".repeat(255))).toBe(
          "a".repeat(255)
        );
      });

      it("should reject invalid filenames", () => {
        expect(() => ValidationSchemas.file.filename.parse("")).toThrow();
        expect(() =>
          ValidationSchemas.file.filename.parse("a".repeat(256))
        ).toThrow();
      });
    });

    describe("size", () => {
      it("should validate valid file sizes", () => {
        expect(ValidationSchemas.file.size.parse(1024)).toBe(1024);
        expect(ValidationSchemas.file.size.parse(10 * 1024 * 1024)).toBe(
          10 * 1024 * 1024
        );
      });

      it("should reject invalid file sizes", () => {
        expect(() => ValidationSchemas.file.size.parse(0)).toThrow();
        expect(() => ValidationSchemas.file.size.parse(-1)).toThrow();
        expect(() =>
          ValidationSchemas.file.size.parse(10 * 1024 * 1024 + 1)
        ).toThrow();
      });
    });

    describe("mimetype", () => {
      it("should validate valid mimetypes", () => {
        expect(ValidationSchemas.file.mimetype.parse("text/html")).toBe(
          "text/html"
        );
        expect(ValidationSchemas.file.mimetype.parse("application/json")).toBe(
          "application/json"
        );
        expect(ValidationSchemas.file.mimetype.parse("text/plain")).toBe(
          "text/plain"
        );
      });

      it("should reject invalid mimetypes", () => {
        expect(() =>
          ValidationSchemas.file.mimetype.parse("image/jpeg")
        ).toThrow();
        expect(() =>
          ValidationSchemas.file.mimetype.parse("invalid")
        ).toThrow();
      });
    });
  });
});

// ============================================================================
// VALIDATION MIDDLEWARE TESTS
// ============================================================================

describe("validateQuery", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it("should validate valid query parameters", () => {
    const schema = z.object({
      page: z.coerce.number().min(1),
      limit: z.coerce.number().min(1).max(100),
    });

    req.query = { page: "1", limit: "20" };
    const middleware = validateQuery(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.query).toEqual({ page: 1, limit: 20 });
  });

  it("should handle validation errors", () => {
    const schema = z.object({
      page: z.coerce.number().min(1),
    });

    req.query = { page: "0" };
    const middleware = validateQuery(schema);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      error: "Query validation failed",
      details: expect.arrayContaining([
        expect.objectContaining({
          field: "page",
          message: expect.any(String),
          code: expect.any(String),
        }),
      ]),
    });
  });

  it("should pass non-ZodError to next", () => {
    const schema = z.object({
      page: z.coerce.number().min(1),
    });

    const customError = new Error("Custom error");
    vi.spyOn(schema, "parse").mockImplementation(() => {
      throw customError;
    });

    req.query = { page: "1" };
    const middleware = validateQuery(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(customError);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("validateParams", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it("should validate valid parameters", () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    req.params = { id: "123e4567-e89b-12d3-a456-426614174000" };
    const middleware = validateParams(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.params).toEqual({ id: "123e4567-e89b-12d3-a456-426614174000" });
  });

  it("should handle validation errors", () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    req.params = { id: "invalid-uuid" };
    const middleware = validateParams(schema);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      error: "Parameter validation failed",
      details: expect.arrayContaining([
        expect.objectContaining({
          field: "id",
          message: expect.any(String),
          code: expect.any(String),
        }),
      ]),
    });
  });

  it("should pass non-ZodError to next", () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    const customError = new Error("Custom error");
    vi.spyOn(schema, "parse").mockImplementation(() => {
      throw customError;
    });

    req.params = { id: "123e4567-e89b-12d3-a456-426614174000" };
    const middleware = validateParams(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(customError);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("validateBody", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it("should validate valid body", () => {
    const schema = z.object({
      content: z.string().min(1),
    });

    req.body = { content: "valid content" };
    const middleware = validateBody(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ content: "valid content" });
  });

  it("should handle validation errors", () => {
    const schema = z.object({
      content: z.string().min(1),
    });

    req.body = { content: "" };
    const middleware = validateBody(schema);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      error: "Body validation failed",
      details: expect.arrayContaining([
        expect.objectContaining({
          field: "content",
          message: expect.any(String),
          code: expect.any(String),
        }),
      ]),
    });
  });

  it("should pass non-ZodError to next", () => {
    const schema = z.object({
      content: z.string().min(1),
    });

    const customError = new Error("Custom error");
    vi.spyOn(schema, "parse").mockImplementation(() => {
      throw customError;
    });

    req.body = { content: "valid content" };
    const middleware = validateBody(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(customError);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("validateFile", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  it("should validate valid file", () => {
    const schema = z.object({
      filename: z.string().min(1),
      size: z.number().positive(),
      mimetype: z.enum(["text/html"]),
    });

    setRequestFile(req, createMockFile());
    const middleware = validateFile(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should handle missing file", () => {
    const schema = z.object({
      filename: z.string().min(1),
      size: z.number().positive(),
      mimetype: z.enum(["text/html"]),
    });

    req.file = undefined;
    const middleware = validateFile(schema);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      error: "File validation failed",
      details: [
        {
          field: "file",
          message: "No file provided",
          code: "missing_file",
        },
      ],
    });
  });

  it("should handle null file", () => {
    const schema = z.object({
      filename: z.string().min(1),
      size: z.number().positive(),
      mimetype: z.enum(["text/html"]),
    });

    setRequestFile(req, null);
    const middleware = validateFile(schema);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      error: "File validation failed",
      details: [
        {
          field: "file",
          message: "No file provided",
          code: "missing_file",
        },
      ],
    });
  });

  it("should handle file validation errors", () => {
    const schema = z.object({
      filename: z.string().min(1),
      size: z.number().positive(),
      mimetype: z.enum(["text/html"]),
    });

    setRequestFile(req, createMockFile({ size: 0 }));
    const middleware = validateFile(schema);
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      error: "File validation failed",
      details: expect.arrayContaining([
        expect.objectContaining({
          field: "size",
          message: expect.any(String),
          code: expect.any(String),
        }),
      ]),
    });
  });

  it("should pass non-ZodError to next", () => {
    const schema = z.object({
      filename: z.string().min(1),
      size: z.number().positive(),
      mimetype: z.enum(["text/html"]),
    });

    const customError = new Error("Custom error");
    vi.spyOn(schema, "parse").mockImplementation(() => {
      throw customError;
    });

    setRequestFile(req, createMockFile());
    const middleware = validateFile(schema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(customError);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ============================================================================
// COMMON VALIDATIONS TESTS
// ============================================================================

describe("CommonValidations", () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  describe("pagination", () => {
    it("should validate valid pagination parameters", () => {
      req.query = { page: "1", limit: "20" };
      CommonValidations.pagination(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.query).toEqual({ page: 1, limit: 20 });
    });

    it("should use default values when parameters are missing", () => {
      req.query = {};
      CommonValidations.pagination(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.query).toEqual({ page: 1, limit: 20 });
    });

    it("should handle validation errors", () => {
      req.query = { page: "0", limit: "101" };
      CommonValidations.pagination(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe("noteId", () => {
    it("should validate valid note ID", () => {
      req.params = { id: "123e4567-e89b-12d3-a456-426614174000" };
      CommonValidations.noteId(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should handle invalid note ID", () => {
      req.params = { id: "invalid-uuid" };
      CommonValidations.noteId(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe("healthQuery", () => {
    it("should validate valid health query parameters", () => {
      req.query = { detailed: "true", includeMetrics: "false" };
      CommonValidations.healthQuery(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.query).toEqual({ detailed: true, includeMetrics: false });
    });

    it("should use default values when parameters are missing", () => {
      req.query = {};
      CommonValidations.healthQuery(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.query).toEqual({ detailed: false, includeMetrics: false });
    });

    it("should handle validation errors", () => {
      req.query = { detailed: "invalid", includeMetrics: "invalid" };
      CommonValidations.healthQuery(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe("testQuery", () => {
    it("should validate valid test query parameters", () => {
      req.query = { action: "health" };
      CommonValidations.testQuery(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should allow missing action parameter", () => {
      req.query = {};
      CommonValidations.testQuery(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should handle invalid action", () => {
      req.query = { action: "invalid" };
      CommonValidations.testQuery(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe("htmlContent", () => {
    it("should validate valid HTML content", () => {
      req.body = {
        content: "<html><body>Test</body></html>",
        metadata: {
          importId: "123e4567-e89b-12d3-a456-426614174000",
          filename: "test.html",
          source: "https://example.com",
        },
      };
      CommonValidations.htmlContent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should allow content without metadata", () => {
      req.body = { content: "<html><body>Test</body></html>" };
      CommonValidations.htmlContent(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should handle validation errors", () => {
      req.body = { content: "" };
      CommonValidations.htmlContent(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });

  describe("fileUpload", () => {
    it("should validate valid file upload", () => {
      setRequestFile(req, createMockFile());
      CommonValidations.fileUpload(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should handle missing file", () => {
      req.file = undefined;
      CommonValidations.fileUpload(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it("should handle invalid file", () => {
      setRequestFile(req, createMockFile({ size: 0, mimetype: "image/jpeg" }));
      CommonValidations.fileUpload(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });
  });
});

// ============================================================================
// ENVIRONMENT VALIDATION TESTS
// ============================================================================

describe("validateEnvironment", () => {
  let testEnv: ReturnType<typeof createTestEnvironment>;

  beforeEach(() => {
    testEnv = createTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    testEnv.restore();
  });

  it("should validate valid environment variables", () => {
    testEnv.setEnv({
      PORT: "3000",
      WS_PORT: "8080",
      DATABASE_URL: "postgresql://localhost:5432/test",
      JWT_SECRET: "a".repeat(32),
      REDIS_HOST: "localhost",
      REDIS_PORT: "6379",
    });

    const result = validateEnvironment();
    expect(result).toEqual({
      PORT: 3000,
      WS_PORT: 8080,
      WS_HOST: undefined,
      DATABASE_URL: "postgresql://localhost:5432/test",
      REDIS_HOST: "localhost",
      REDIS_PORT: 6379,
      REDIS_PASSWORD: undefined,
      JWT_SECRET: "a".repeat(32),
      API_KEY: undefined,
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX_REQUESTS: 100,
      MAX_FILE_SIZE_BYTES: 10485760,
      MAX_REQUEST_SIZE_BYTES: 10485760,
    });
  });

  it("should use default values for missing optional variables", () => {
    testEnv.setEnv({
      PORT: undefined, // Clear PORT to test default value
      WS_PORT: undefined, // Clear WS_PORT to test default value
      DATABASE_URL: "postgresql://localhost:5432/test",
      JWT_SECRET: "a".repeat(32),
    });

    const result = validateEnvironment();
    expect(result.PORT).toBe(3000);
    expect(result.WS_PORT).toBe(8080);
    expect(result.REDIS_HOST).toBe("localhost");
    expect(result.REDIS_PORT).toBe(6379);
  });

  it("should handle custom values for optional variables", () => {
    testEnv.setEnv({
      PORT: "4000",
      WS_PORT: "9090",
      DATABASE_URL: "postgresql://localhost:5432/test",
      JWT_SECRET: "a".repeat(32),
      API_KEY: "a".repeat(16),
      RATE_LIMIT_WINDOW_MS: "600000",
      RATE_LIMIT_MAX_REQUESTS: "50",
    });

    const result = validateEnvironment();
    expect(result.PORT).toBe(4000);
    expect(result.WS_PORT).toBe(9090);
    expect(result.API_KEY).toBe("a".repeat(16));
    expect(result.RATE_LIMIT_WINDOW_MS).toBe(600000);
    expect(result.RATE_LIMIT_MAX_REQUESTS).toBe(50);
  });

  it("should throw error for invalid database URL", () => {
    testEnv.setEnv({
      DATABASE_URL: "invalid-url",
      JWT_SECRET: "a".repeat(32),
    });

    expect(() => validateEnvironment()).toThrow(
      "Environment validation failed"
    );
  });

  it("should throw error for short JWT secret", () => {
    testEnv.setEnv({
      DATABASE_URL: "postgresql://localhost:5432/test",
      JWT_SECRET: "short",
    });

    expect(() => validateEnvironment()).toThrow(
      "Environment validation failed"
    );
  });

  it("should throw error for short API key", () => {
    testEnv.setEnv({
      DATABASE_URL: "postgresql://localhost:5432/test",
      JWT_SECRET: "a".repeat(32),
      API_KEY: "short",
    });

    expect(() => validateEnvironment()).toThrow(
      "Environment validation failed"
    );
  });

  it("should throw error for invalid port numbers", () => {
    testEnv.setEnv({
      PORT: "70000", // Invalid port
      DATABASE_URL: "postgresql://localhost:5432/test",
      JWT_SECRET: "a".repeat(32),
    });

    expect(() => validateEnvironment()).toThrow(
      "Environment validation failed"
    );
  });

  it("should throw error for negative rate limit values", () => {
    testEnv.setEnv({
      DATABASE_URL: "postgresql://localhost:5432/test",
      JWT_SECRET: "a".repeat(32),
      RATE_LIMIT_WINDOW_MS: "-1000",
    });

    expect(() => validateEnvironment()).toThrow(
      "Environment validation failed"
    );
  });

  // Note: The non-ZodError exception handling is covered by the existing error handling tests
  // and the actual implementation properly handles this case in the catch block
});
