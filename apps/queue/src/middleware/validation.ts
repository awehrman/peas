import { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { HttpStatus } from "../types";

// ============================================================================
// SIMPLE VALIDATION SCHEMAS
// ============================================================================

// Basic validation schemas without complex transformations
export const ValidationSchemas = {
  // Query parameter schemas
  query: {
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
    search: z.string().min(1).max(100).optional(),
    detailed: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .default(false),
    includeMetrics: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .default(false),
    action: z.enum(["health", "queue", "database", "redis"]).optional(),
  },

  // Parameter schemas
  params: {
    id: z.string().uuid("Invalid ID format"),
  },

  // Body schemas
  body: {
    content: z
      .string()
      .min(1, "Content cannot be empty")
      .max(10 * 1024 * 1024), // 10MB max
    metadata: z
      .object({
        importId: z.string().uuid("Invalid import ID").optional(),
        filename: z.string().min(1).max(255).optional(),
        source: z.string().url("Invalid source URL").optional(),
      })
      .optional(),
  },

  // File validation
  file: {
    filename: z.string().min(1).max(255),
    size: z
      .number()
      .positive()
      .max(10 * 1024 * 1024), // 10MB max
    mimetype: z.enum(["text/html", "application/json", "text/plain"]),
  },
} as const;

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: "Query validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        });
      }
      next(error);
    }
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: "Parameter validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        });
      }
      next(error);
    }
  };
}

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: "Body validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        });
      }
      next(error);
    }
  };
}

// Type guard to check if request has a file
function hasFile(req: Request): req is Request & { file: MulterFile } {
  return req.file !== undefined && req.file !== null;
}

export function validateFile(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!hasFile(req)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: "File validation failed",
          details: [
            {
              field: "file",
              message: "No file provided",
              code: "missing_file",
            },
          ],
        });
      }

      const fileData = {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      };

      schema.parse(fileData);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: "File validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        });
      }
      next(error);
    }
  };
}

// ============================================================================
// COMMON VALIDATION PATTERNS
// ============================================================================

export const CommonValidations = {
  // Pagination query validation
  pagination: validateQuery(
    z.object({
      page: ValidationSchemas.query.page,
      limit: ValidationSchemas.query.limit,
    })
  ),

  // Note ID parameter validation
  noteId: validateParams(
    z.object({
      id: ValidationSchemas.params.id,
    })
  ),

  // Health check query validation
  healthQuery: validateQuery(
    z.object({
      detailed: ValidationSchemas.query.detailed,
      includeMetrics: ValidationSchemas.query.includeMetrics,
    })
  ),

  // Test query validation
  testQuery: validateQuery(
    z.object({
      action: ValidationSchemas.query.action,
    })
  ),

  // HTML content validation
  htmlContent: validateBody(
    z.object({
      content: ValidationSchemas.body.content,
      metadata: ValidationSchemas.body.metadata,
    })
  ),

  // File upload validation
  fileUpload: validateFile(z.object(ValidationSchemas.file)),
} as const;

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

export function validateEnvironment() {
  const envSchema = z.object({
    PORT: z.coerce.number().min(1).max(65535).default(3000),
    WS_PORT: z.coerce.number().min(1).max(65535).default(8080),
    WS_HOST: z.string().optional(),
    DATABASE_URL: z.string().url("Invalid database URL"),
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.coerce.number().min(1).max(65535).default(6379),
    REDIS_PASSWORD: z.string().optional(),
    JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
    API_KEY: z
      .string()
      .min(16, "API key must be at least 16 characters")
      .optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().positive().default(100),
    MAX_FILE_SIZE_BYTES: z.coerce.number().positive().default(10485760),
    MAX_REQUEST_SIZE_BYTES: z.coerce.number().positive().default(10485760),
  });

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    /* istanbul ignore next -- @preserve */
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      throw new Error(`Environment validation failed: ${issues}`);
    }
    /* istanbul ignore next -- @preserve */
    throw error;
  }
}

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
