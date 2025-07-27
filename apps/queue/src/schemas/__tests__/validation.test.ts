import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTestEnvironment,
  createTestFileValidation,
  createTestHealthQuery,
  createTestHtmlContentSchema,
  createTestNoteIdParam,
  createTestNoteJobData,
  createTestNoteQuery,
  createTestStatusEvent,
  createTestTestQuery,
  testInvalidSchema,
  testSchemaEnumValues,
  testSchemaRequiredFields,
  testValidSchema,
} from "../../test-utils/schema-test-utils";
import {
  EnvironmentSchema,
  FileValidationSchema,
  HTMLContentSchema,
  HealthQuerySchema,
  ImportRequestSchema,
  ImportStatusQuerySchema,
  NoteIdParamSchema,
  NoteJobDataSchema,
  NoteQuerySchema,
  StatusEventSchema,
  TestQuerySchema,
  ValidationSchemas,
  createValidationMiddleware,
  validateEnvironment,
} from "../validation";

describe("Validation Schemas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("EnvironmentSchema", () => {
    it("should validate valid environment variables", () => {
      const validEnv = createTestEnvironment();
      const result = EnvironmentSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(3000);
        expect(result.data.WS_PORT).toBe(8080);
        expect(result.data.WS_HOST).toBe("localhost");
        expect(result.data.DATABASE_URL).toBe(
          "postgresql://user:pass@localhost:5432/db"
        );
        expect(result.data.REDIS_HOST).toBe("localhost");
        expect(result.data.REDIS_PORT).toBe(6379);
        expect(result.data.REDIS_PASSWORD).toBe("secret");
        expect(result.data.JWT_SECRET).toBe(
          "this-is-a-very-long-jwt-secret-key-for-testing"
        );
        expect(result.data.API_KEY).toBe(
          "this-is-a-very-long-api-key-for-testing"
        );
        expect(result.data.RATE_LIMIT_WINDOW_MS).toBe(900000);
        expect(result.data.RATE_LIMIT_MAX_REQUESTS).toBe(100);
        expect(result.data.MAX_FILE_SIZE_BYTES).toBe(10485760);
        expect(result.data.MAX_REQUEST_SIZE_BYTES).toBe(10485760);
      }
    });

    it("should use default values when environment variables are not provided", () => {
      const minimalEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
      };

      const result = EnvironmentSchema.safeParse(minimalEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(3000);
        expect(result.data.WS_PORT).toBe(8080);
        expect(result.data.REDIS_HOST).toBe("localhost");
        expect(result.data.REDIS_PORT).toBe(6379);
        expect(result.data.RATE_LIMIT_WINDOW_MS).toBe(900000);
        expect(result.data.RATE_LIMIT_MAX_REQUESTS).toBe(100);
        expect(result.data.MAX_FILE_SIZE_BYTES).toBe(10485760);
        expect(result.data.MAX_REQUEST_SIZE_BYTES).toBe(10485760);
      }
    });

    testInvalidSchema(
      EnvironmentSchema,
      createTestEnvironment({ DATABASE_URL: "not-a-valid-url" }),
      "Invalid database URL",
      "invalid database URL"
    );

    testInvalidSchema(
      EnvironmentSchema,
      createTestEnvironment({ JWT_SECRET: "short" }),
      "JWT secret must be at least 32 characters",
      "JWT secret that is too short"
    );

    testInvalidSchema(
      EnvironmentSchema,
      createTestEnvironment({ API_KEY: "short" }),
      "API key must be at least 16 characters",
      "API key that is too short"
    );

    testInvalidSchema(
      EnvironmentSchema,
      createTestEnvironment({ PORT: "70000" }),
      undefined,
      "invalid port numbers"
    );

    testInvalidSchema(
      EnvironmentSchema,
      createTestEnvironment({ RATE_LIMIT_WINDOW_MS: "-1000" }),
      undefined,
      "negative rate limit values"
    );

    testInvalidSchema(
      EnvironmentSchema,
      createTestEnvironment({ RATE_LIMIT_MAX_REQUESTS: "0" }),
      undefined,
      "zero rate limit values"
    );
  });

  describe("ImportRequestSchema", () => {
    it("should validate empty object", () => {
      const result = ImportRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should validate object with additional properties", () => {
      const result = ImportRequestSchema.safeParse({ extra: "property" });
      expect(result.success).toBe(true);
    });
  });

  describe("ImportStatusQuerySchema", () => {
    it("should validate empty object", () => {
      const result = ImportStatusQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should validate object with additional properties", () => {
      const result = ImportStatusQuerySchema.safeParse({ extra: "property" });
      expect(result.success).toBe(true);
    });
  });

  describe("NoteQuerySchema", () => {
    it("should validate valid note query parameters", () => {
      const validQuery = createTestNoteQuery();
      const result = NoteQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.status).toBe("COMPLETED");
        expect(result.data.search).toBe("recipe");
      }
    });

    it("should use default values when parameters are not provided", () => {
      const emptyQuery = {};
      const result = NoteQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    testInvalidSchema(
      NoteQuerySchema,
      createTestNoteQuery({ page: "0" }),
      undefined,
      "page below 1"
    );

    testInvalidSchema(
      NoteQuerySchema,
      createTestNoteQuery({ limit: "0" }),
      undefined,
      "limit below 1"
    );

    testInvalidSchema(
      NoteQuerySchema,
      createTestNoteQuery({ limit: "101" }),
      undefined,
      "limit above 100"
    );

    testInvalidSchema(
      NoteQuerySchema,
      createTestNoteQuery({ status: "INVALID_STATUS" as never }),
      undefined,
      "invalid status"
    );

    testInvalidSchema(
      NoteQuerySchema,
      createTestNoteQuery({ search: "a".repeat(101) }),
      undefined,
      "search string that is too long"
    );

    it("should validate all status values", () => {
      const statuses = [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
      ] as const;

      statuses.forEach((status) => {
        const query = { status };
        const result = NoteQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      });
    });
  });

  describe("NoteIdParamSchema", () => {
    testValidSchema(NoteIdParamSchema, createTestNoteIdParam(), "valid UUID");

    testSchemaRequiredFields(NoteIdParamSchema, ["id"], {
      id: "123e4567-e89b-12d3-a456-426614174000",
    });

    testInvalidSchema(
      NoteIdParamSchema,
      createTestNoteIdParam({ id: "not-a-uuid" }),
      "Invalid note ID",
      "invalid UUID"
    );

    testInvalidSchema(
      NoteIdParamSchema,
      createTestNoteIdParam({ id: "" }),
      undefined,
      "empty UUID"
    );
  });

  describe("HealthQuerySchema", () => {
    it("should validate valid health query parameters", () => {
      const validQuery = createTestHealthQuery();
      const result = HealthQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.detailed).toBe(true);
        expect(result.data.includeMetrics).toBe(false);
      }
    });

    it("should use default values when parameters are not provided", () => {
      const emptyQuery = {};
      const result = HealthQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.detailed).toBe(false);
        expect(result.data.includeMetrics).toBe(false);
      }
    });

    testInvalidSchema(
      HealthQuerySchema,
      createTestHealthQuery({ detailed: "maybe" }),
      undefined,
      "invalid detailed value"
    );

    testInvalidSchema(
      HealthQuerySchema,
      createTestHealthQuery({ includeMetrics: "maybe" }),
      undefined,
      "invalid includeMetrics value"
    );

    it("should validate all boolean string values", () => {
      const booleanStrings = ["true", "false"] as const;

      booleanStrings.forEach((value) => {
        const query = { detailed: value };
        const result = HealthQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.detailed).toBe(value === "true");
        }
      });
    });
  });

  describe("TestQuerySchema", () => {
    testValidSchema(
      TestQuerySchema,
      createTestTestQuery(),
      "valid test query parameters with action"
    );

    testValidSchema(TestQuerySchema, {}, "empty query");

    testInvalidSchema(
      TestQuerySchema,
      createTestTestQuery({ action: "invalid_action" as never }),
      undefined,
      "invalid action"
    );

    testSchemaEnumValues(
      TestQuerySchema,
      ["health", "queue", "database", "redis"],
      "action",
      "all action values"
    );
  });

  describe("FileValidationSchema", () => {
    testValidSchema(
      FileValidationSchema,
      createTestFileValidation(),
      "valid file data"
    );

    testSchemaRequiredFields(
      FileValidationSchema,
      ["filename", "size", "mimetype"],
      {
        filename: "test.html",
        size: 1024,
        mimetype: "text/html" as const,
      }
    );

    testInvalidSchema(
      FileValidationSchema,
      createTestFileValidation({ filename: "a".repeat(256) }),
      undefined,
      "filename that is too long"
    );

    testInvalidSchema(
      FileValidationSchema,
      createTestFileValidation({ filename: "" }),
      undefined,
      "empty filename"
    );

    testInvalidSchema(
      FileValidationSchema,
      createTestFileValidation({ size: -100 }),
      undefined,
      "negative file size"
    );

    testInvalidSchema(
      FileValidationSchema,
      createTestFileValidation({ size: 0 }),
      undefined,
      "zero file size"
    );

    testInvalidSchema(
      FileValidationSchema,
      createTestFileValidation({ size: 11 * 1024 * 1024 }),
      undefined,
      "file size that is too large"
    );

    testInvalidSchema(
      FileValidationSchema,
      createTestFileValidation({ mimetype: "application/pdf" as never }),
      undefined,
      "invalid mimetype"
    );

    it("should validate all allowed mimetypes", () => {
      const mimetypes = [
        "text/html",
        "application/json",
        "text/plain",
      ] as const;

      mimetypes.forEach((mimetype) => {
        const file = {
          filename: "test.html",
          size: 1024,
          mimetype,
        };
        const result = FileValidationSchema.safeParse(file);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.mimetype).toBe(mimetype);
        }
      });
    });
  });

  describe("HTMLContentSchema", () => {
    testValidSchema(
      HTMLContentSchema,
      createTestHtmlContentSchema(),
      "valid HTML content with all fields"
    );

    testValidSchema(
      HTMLContentSchema,
      {
        content: "<html><body><h1>Test</h1></body></html>",
      },
      "content without metadata"
    );

    testSchemaRequiredFields(HTMLContentSchema, ["content"], {
      content: "<html><body><h1>Test</h1></body></html>",
    });

    testInvalidSchema(
      HTMLContentSchema,
      createTestHtmlContentSchema({ content: "" }),
      undefined,
      "empty content"
    );

    testInvalidSchema(
      HTMLContentSchema,
      createTestHtmlContentSchema({ content: "a".repeat(11 * 1024 * 1024) }),
      undefined,
      "content that is too large"
    );

    testInvalidSchema(
      HTMLContentSchema,
      createTestHtmlContentSchema({
        metadata: {
          importId: "not-a-uuid",
          filename: "test.html",
          source: "https://example.com/recipe",
        },
      }),
      "Invalid import ID",
      "invalid import ID"
    );

    testInvalidSchema(
      HTMLContentSchema,
      createTestHtmlContentSchema({
        metadata: {
          importId: "123e4567-e89b-12d3-a456-426614174000",
          filename: "test.html",
          source: "not-a-url",
        },
      }),
      "Invalid source URL",
      "invalid source URL"
    );

    testInvalidSchema(
      HTMLContentSchema,
      createTestHtmlContentSchema({
        metadata: {
          importId: "123e4567-e89b-12d3-a456-426614174000",
          filename: "a".repeat(256),
          source: "https://example.com/recipe",
        },
      }),
      undefined,
      "filename that is too long"
    );
  });

  describe("NoteJobDataSchema", () => {
    it("should validate valid note job data", () => {
      const validData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        metadata: {
          importId: "123e4567-e89b-12d3-a456-426614174000",
          filename: "recipe.html",
          source: "https://example.com/recipe",
        },
      };

      const result = NoteJobDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    testValidSchema(
      NoteJobDataSchema,
      {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
      },
      "data without metadata"
    );

    testSchemaRequiredFields(NoteJobDataSchema, ["content"], {
      content: "<html><body><h1>Test Recipe</h1></body></html>",
    });

    testInvalidSchema(
      NoteJobDataSchema,
      createTestNoteJobData({ content: "" }),
      "Content cannot be empty",
      "empty content"
    );
  });

  describe("StatusEventSchema", () => {
    testValidSchema(
      StatusEventSchema,
      createTestStatusEvent(),
      "valid status event with all fields"
    );

    testValidSchema(
      StatusEventSchema,
      {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        status: "COMPLETED" as const,
      },
      "minimal status event"
    );

    testSchemaRequiredFields(StatusEventSchema, ["importId", "status"], {
      importId: "123e4567-e89b-12d3-a456-426614174000",
      status: "COMPLETED" as const,
    });

    testInvalidSchema(
      StatusEventSchema,
      createTestStatusEvent({ importId: "not-a-uuid" }),
      "Invalid import ID",
      "invalid import ID"
    );

    testInvalidSchema(
      StatusEventSchema,
      createTestStatusEvent({ noteId: "not-a-uuid" }),
      "Invalid note ID",
      "invalid note ID"
    );

    testInvalidSchema(
      StatusEventSchema,
      createTestStatusEvent({ status: "INVALID_STATUS" as never }),
      undefined,
      "invalid status"
    );

    testInvalidSchema(
      StatusEventSchema,
      createTestStatusEvent({ message: "a".repeat(1001) }),
      undefined,
      "message that is too long"
    );

    testInvalidSchema(
      StatusEventSchema,
      createTestStatusEvent({ context: "a".repeat(501) }),
      undefined,
      "context that is too long"
    );

    testInvalidSchema(
      StatusEventSchema,
      createTestStatusEvent({ currentCount: -1 }),
      undefined,
      "negative currentCount"
    );

    testInvalidSchema(
      StatusEventSchema,
      createTestStatusEvent({ totalCount: -1 }),
      undefined,
      "negative totalCount"
    );

    testInvalidSchema(
      StatusEventSchema,
      createTestStatusEvent({ indentLevel: -1 }),
      undefined,
      "indentLevel below 0"
    );

    testInvalidSchema(
      StatusEventSchema,
      createTestStatusEvent({ indentLevel: 11 }),
      undefined,
      "indentLevel above 10"
    );

    it("should validate all status values", () => {
      const statuses = [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
      ] as const;

      statuses.forEach((status) => {
        const event = {
          importId: "123e4567-e89b-12d3-a456-426614174000",
          status,
        };
        const result = StatusEventSchema.safeParse(event);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      });
    });
  });

  describe("ValidationSchemas", () => {
    it("should export all expected schema groups", () => {
      expect(ValidationSchemas).toHaveProperty("environment");
      expect(ValidationSchemas).toHaveProperty("import");
      expect(ValidationSchemas).toHaveProperty("notes");
      expect(ValidationSchemas).toHaveProperty("health");
      expect(ValidationSchemas).toHaveProperty("test");
      expect(ValidationSchemas).toHaveProperty("files");
      expect(ValidationSchemas).toHaveProperty("jobs");
      expect(ValidationSchemas).toHaveProperty("events");
    });

    it("should export import schemas", () => {
      expect(ValidationSchemas.import).toHaveProperty("request");
      expect(ValidationSchemas.import).toHaveProperty("statusQuery");
    });

    it("should export notes schemas", () => {
      expect(ValidationSchemas.notes).toHaveProperty("query");
      expect(ValidationSchemas.notes).toHaveProperty("idParam");
    });

    it("should export health schemas", () => {
      expect(ValidationSchemas.health).toHaveProperty("query");
    });

    it("should export test schemas", () => {
      expect(ValidationSchemas.test).toHaveProperty("query");
    });

    it("should export files schemas", () => {
      expect(ValidationSchemas.files).toHaveProperty("validation");
      expect(ValidationSchemas.files).toHaveProperty("htmlContent");
    });

    it("should export jobs schemas", () => {
      expect(ValidationSchemas.jobs).toHaveProperty("note");
      expect(ValidationSchemas.jobs).toHaveProperty("image");
      expect(ValidationSchemas.jobs).toHaveProperty("ingredient");
      expect(ValidationSchemas.jobs).toHaveProperty("instruction");
      expect(ValidationSchemas.jobs).toHaveProperty("categorization");
    });

    it("should export events schemas", () => {
      expect(ValidationSchemas.events).toHaveProperty("status");
    });
  });

  describe("validateEnvironment", () => {
    it("should validate valid environment variables", () => {
      const originalEnv = process.env;
      process.env = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
      };

      const result = validateEnvironment();
      expect(result.PORT).toBe(3000);
      expect(result.WS_PORT).toBe(8080);
      expect(result.DATABASE_URL).toBe(
        "postgresql://user:pass@localhost:5432/db"
      );
      expect(result.JWT_SECRET).toBe(
        "this-is-a-very-long-jwt-secret-key-for-testing"
      );

      // Restore original env
      process.env = originalEnv;
    });

    it("should throw error for invalid environment variables", () => {
      const originalEnv = process.env;
      process.env = {
        DATABASE_URL: "not-a-valid-url",
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
      };

      expect(() => validateEnvironment()).toThrow(
        "Environment validation failed"
      );

      // Restore original env
      process.env = originalEnv;
    });

    it("should throw error for missing required environment variables", () => {
      const originalEnv = process.env;
      process.env = {
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
        // Missing DATABASE_URL
      };

      expect(() => validateEnvironment()).toThrow(
        "Environment validation failed"
      );

      // Restore original env
      process.env = originalEnv;
    });
  });

  describe("createValidationMiddleware", () => {
    it("should create middleware that validates request body", () => {
      const schema = NoteJobDataSchema;
      const middleware = createValidationMiddleware(schema, "body");

      const mockReq = {
        body: {
          content: "<html><body><h1>Test</h1></body></html>",
        },
      } as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({
        content: "<html><body><h1>Test</h1></body></html>",
      });
    });

    it("should create middleware that validates request query", () => {
      const schema = NoteQuerySchema;
      const middleware = createValidationMiddleware(schema, "query");

      const mockReq = {
        query: {
          page: "1",
          limit: "20",
        },
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query).toEqual({
        page: 1,
        limit: 20,
      });
    });

    it("should create middleware that validates request params", () => {
      const schema = NoteIdParamSchema;
      const middleware = createValidationMiddleware(schema, "params");

      const mockReq = {
        params: {
          id: "123e4567-e89b-12d3-a456-426614174000",
        },
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.params).toEqual({
        id: "123e4567-e89b-12d3-a456-426614174000",
      });
    });

    it("should return 400 error for invalid request body", () => {
      const schema = NoteJobDataSchema;
      const middleware = createValidationMiddleware(schema, "body");

      const mockReq = {
        body: {
          content: "", // Invalid: empty content
        },
      } as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "content",
            message: "Content cannot be empty",
            code: expect.any(String),
          }),
        ]),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 error for invalid request query", () => {
      const schema = NoteQuerySchema;
      const middleware = createValidationMiddleware(schema, "query");

      const mockReq = {
        query: {
          page: "0", // Invalid: page must be >= 1
        },
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "page",
            message: expect.any(String),
            code: expect.any(String),
          }),
        ]),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 error for invalid request params", () => {
      const schema = NoteIdParamSchema;
      const middleware = createValidationMiddleware(schema, "params");

      const mockReq = {
        params: {
          id: "not-a-uuid", // Invalid UUID
        },
      } as unknown as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Validation failed",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "id",
            message: "Invalid note ID",
            code: expect.any(String),
          }),
        ]),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next with error for non-ZodError exceptions", () => {
      const schema = NoteJobDataSchema;
      const middleware = createValidationMiddleware(schema, "body");

      const mockReq = {
        body: undefined, // This will cause a different type of error when accessing properties
      } as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;

      // Mock the schema.parse to throw a non-ZodError
      const originalParse = schema.parse;
      schema.parse = vi.fn().mockImplementation(() => {
        throw new Error("Non-ZodError exception");
      });

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();

      // Restore original parse method
      schema.parse = originalParse;
    });

    it("should default to body validation when target is not specified", () => {
      const schema = NoteJobDataSchema;
      const middleware = createValidationMiddleware(schema);

      const mockReq = {
        body: {
          content: "<html><body><h1>Test</h1></body></html>",
        },
      } as Request;

      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const mockNext = vi.fn() as NextFunction;

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({
        content: "<html><body><h1>Test</h1></body></html>",
      });
    });
  });
});
