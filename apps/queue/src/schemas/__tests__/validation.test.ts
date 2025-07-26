import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      const validEnv = {
        PORT: "3000",
        WS_PORT: "8080",
        WS_HOST: "localhost",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        REDIS_HOST: "localhost",
        REDIS_PORT: "6379",
        REDIS_PASSWORD: "secret",
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
        API_KEY: "this-is-a-very-long-api-key-for-testing",
        RATE_LIMIT_WINDOW_MS: "900000",
        RATE_LIMIT_MAX_REQUESTS: "100",
        MAX_FILE_SIZE_BYTES: "10485760",
        MAX_REQUEST_SIZE_BYTES: "10485760",
      };

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

    it("should reject invalid database URL", () => {
      const invalidEnv = {
        DATABASE_URL: "not-a-valid-url",
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
      };

      const result = EnvironmentSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Invalid database URL");
      }
    });

    it("should reject JWT secret that is too short", () => {
      const invalidEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        JWT_SECRET: "short",
      };

      const result = EnvironmentSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "JWT secret must be at least 32 characters"
        );
      }
    });

    it("should reject API key that is too short", () => {
      const invalidEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
        API_KEY: "short",
      };

      const result = EnvironmentSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "API key must be at least 16 characters"
        );
      }
    });

    it("should reject invalid port numbers", () => {
      const invalidEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
        PORT: "70000", // Invalid port
      };

      const result = EnvironmentSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it("should reject negative rate limit values", () => {
      const invalidEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
        RATE_LIMIT_WINDOW_MS: "-1000",
      };

      const result = EnvironmentSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });

    it("should reject zero rate limit values", () => {
      const invalidEnv = {
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        JWT_SECRET: "this-is-a-very-long-jwt-secret-key-for-testing",
        RATE_LIMIT_MAX_REQUESTS: "0",
      };

      const result = EnvironmentSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });
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
      const validQuery = {
        page: "1",
        limit: "20",
        status: "COMPLETED" as const,
        search: "recipe",
      };

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

    it("should reject page below 1", () => {
      const invalidQuery = {
        page: "0",
      };

      const result = NoteQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it("should reject limit below 1", () => {
      const invalidQuery = {
        limit: "0",
      };

      const result = NoteQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it("should reject limit above 100", () => {
      const invalidQuery = {
        limit: "101",
      };

      const result = NoteQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it("should reject invalid status", () => {
      const invalidQuery = {
        status: "INVALID_STATUS",
      };

      const result = NoteQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it("should reject search string that is too long", () => {
      const invalidQuery = {
        search: "a".repeat(101),
      };

      const result = NoteQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

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
    it("should validate valid UUID", () => {
      const validParam = {
        id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = NoteIdParamSchema.safeParse(validParam);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      }
    });

    it("should reject invalid UUID", () => {
      const invalidParam = {
        id: "not-a-uuid",
      };

      const result = NoteIdParamSchema.safeParse(invalidParam);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Invalid note ID");
      }
    });

    it("should reject empty UUID", () => {
      const invalidParam = {
        id: "",
      };

      const result = NoteIdParamSchema.safeParse(invalidParam);
      expect(result.success).toBe(false);
    });
  });

  describe("HealthQuerySchema", () => {
    it("should validate valid health query parameters", () => {
      const validQuery = {
        detailed: "true",
        includeMetrics: "false",
      };

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

    it("should reject invalid detailed value", () => {
      const invalidQuery = {
        detailed: "maybe",
      };

      const result = HealthQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it("should reject invalid includeMetrics value", () => {
      const invalidQuery = {
        includeMetrics: "maybe",
      };

      const result = HealthQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

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
    it("should validate valid test query parameters", () => {
      const validQuery = {
        action: "health" as const,
      };

      const result = TestQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("health");
      }
    });

    it("should validate empty object", () => {
      const emptyQuery = {};

      const result = TestQuerySchema.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBeUndefined();
      }
    });

    it("should reject invalid action", () => {
      const invalidQuery = {
        action: "invalid_action",
      };

      const result = TestQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it("should validate all action values", () => {
      const actions = ["health", "queue", "database", "redis"] as const;

      actions.forEach((action) => {
        const query = { action };
        const result = TestQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.action).toBe(action);
        }
      });
    });
  });

  describe("FileValidationSchema", () => {
    it("should validate valid file data", () => {
      const validFile = {
        filename: "test.html",
        size: 1024,
        mimetype: "text/html" as const,
      };

      const result = FileValidationSchema.safeParse(validFile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validFile);
      }
    });

    it("should reject filename that is too long", () => {
      const invalidFile = {
        filename: "a".repeat(256),
        size: 1024,
        mimetype: "text/html" as const,
      };

      const result = FileValidationSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it("should reject empty filename", () => {
      const invalidFile = {
        filename: "",
        size: 1024,
        mimetype: "text/html" as const,
      };

      const result = FileValidationSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it("should reject negative file size", () => {
      const invalidFile = {
        filename: "test.html",
        size: -100,
        mimetype: "text/html" as const,
      };

      const result = FileValidationSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it("should reject zero file size", () => {
      const invalidFile = {
        filename: "test.html",
        size: 0,
        mimetype: "text/html" as const,
      };

      const result = FileValidationSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it("should reject file size that is too large", () => {
      const invalidFile = {
        filename: "test.html",
        size: 11 * 1024 * 1024, // 11MB
        mimetype: "text/html" as const,
      };

      const result = FileValidationSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it("should reject invalid mimetype", () => {
      const invalidFile = {
        filename: "test.html",
        size: 1024,
        mimetype: "application/pdf",
      };

      const result = FileValidationSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

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
    it("should validate valid HTML content", () => {
      const validContent = {
        content: "<html><body><h1>Test</h1></body></html>",
        metadata: {
          importId: "123e4567-e89b-12d3-a456-426614174000",
          filename: "test.html",
          source: "https://example.com/recipe",
        },
      };

      const result = HTMLContentSchema.safeParse(validContent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validContent);
      }
    });

    it("should validate content without metadata", () => {
      const validContent = {
        content: "<html><body><h1>Test</h1></body></html>",
      };

      const result = HTMLContentSchema.safeParse(validContent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(validContent.content);
        expect(result.data.metadata).toBeUndefined();
      }
    });

    it("should reject empty content", () => {
      const invalidContent = {
        content: "",
      };

      const result = HTMLContentSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
    });

    it("should reject content that is too large", () => {
      const invalidContent = {
        content: "a".repeat(11 * 1024 * 1024), // 11MB
      };

      const result = HTMLContentSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
    });

    it("should reject invalid import ID", () => {
      const invalidContent = {
        content: "<html><body><h1>Test</h1></body></html>",
        metadata: {
          importId: "not-a-uuid",
          filename: "test.html",
        },
      };

      const result = HTMLContentSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Invalid import ID");
      }
    });

    it("should reject invalid source URL", () => {
      const invalidContent = {
        content: "<html><body><h1>Test</h1></body></html>",
        metadata: {
          filename: "test.html",
          source: "not-a-url",
        },
      };

      const result = HTMLContentSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Invalid source URL");
      }
    });

    it("should reject filename that is too long", () => {
      const invalidContent = {
        content: "<html><body><h1>Test</h1></body></html>",
        metadata: {
          filename: "a".repeat(256),
        },
      };

      const result = HTMLContentSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
    });
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

    it("should validate data without metadata", () => {
      const validData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
      };

      const result = NoteJobDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(validData.content);
        expect(result.data.metadata).toBeUndefined();
      }
    });

    it("should reject empty content", () => {
      const invalidData = {
        content: "",
      };

      const result = NoteJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Content cannot be empty");
      }
    });

    it("should reject missing content", () => {
      const invalidData = {};

      const result = NoteJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });
  });

  describe("StatusEventSchema", () => {
    it("should validate valid status event", () => {
      const validEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        noteId: "456e7890-e89b-12d3-a456-426614174000",
        status: "PROCESSING" as const,
        message: "Processing started",
        context: "parse_html",
        currentCount: 5,
        totalCount: 10,
        indentLevel: 2,
        metadata: { progress: 50 },
      };

      const result = StatusEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validEvent);
      }
    });

    it("should validate minimal status event", () => {
      const minimalEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        status: "COMPLETED" as const,
      };

      const result = StatusEventSchema.safeParse(minimalEvent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.importId).toBe(minimalEvent.importId);
        expect(result.data.status).toBe(minimalEvent.status);
        expect(result.data.message).toBeUndefined();
        expect(result.data.context).toBeUndefined();
        expect(result.data.currentCount).toBeUndefined();
        expect(result.data.totalCount).toBeUndefined();
        expect(result.data.indentLevel).toBeUndefined();
        expect(result.data.metadata).toBeUndefined();
      }
    });

    it("should reject invalid import ID", () => {
      const invalidEvent = {
        importId: "not-a-uuid",
        status: "PROCESSING" as const,
      };

      const result = StatusEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Invalid import ID");
      }
    });

    it("should reject invalid note ID", () => {
      const invalidEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        noteId: "not-a-uuid",
        status: "PROCESSING" as const,
      };

      const result = StatusEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Invalid note ID");
      }
    });

    it("should reject invalid status", () => {
      const invalidEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        status: "INVALID_STATUS",
      };

      const result = StatusEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject message that is too long", () => {
      const invalidEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        status: "PROCESSING" as const,
        message: "a".repeat(1001),
      };

      const result = StatusEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject context that is too long", () => {
      const invalidEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        status: "PROCESSING" as const,
        context: "a".repeat(501),
      };

      const result = StatusEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject negative currentCount", () => {
      const invalidEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        status: "PROCESSING" as const,
        currentCount: -1,
      };

      const result = StatusEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject negative totalCount", () => {
      const invalidEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        status: "PROCESSING" as const,
        totalCount: -1,
      };

      const result = StatusEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject indentLevel below 0", () => {
      const invalidEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        status: "PROCESSING" as const,
        indentLevel: -1,
      };

      const result = StatusEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject indentLevel above 10", () => {
      const invalidEvent = {
        importId: "123e4567-e89b-12d3-a456-426614174000",
        status: "PROCESSING" as const,
        indentLevel: 11,
      };

      const result = StatusEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

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
