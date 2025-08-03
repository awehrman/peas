import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { HttpStatus } from "../types";

// ============================================================================
// ENVIRONMENT VARIABLE SCHEMAS
// ============================================================================

export const EnvironmentSchema = z.object({
  // Server configuration
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default(3000),
  WS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default(8080),
  WS_HOST: z.string().optional(),

  // Database configuration
  DATABASE_URL: z.string().url("Invalid database URL"),

  // Redis configuration
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Security configuration
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  API_KEY: z
    .string()
    .min(16, "API key must be at least 16 characters")
    .optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default(100),

  // File processing
  MAX_FILE_SIZE_BYTES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default(10485760), // 10MB
  MAX_REQUEST_SIZE_BYTES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive())
    .default(10485760), // 10MB
});

export type Environment = z.infer<typeof EnvironmentSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

// Import route schemas
export const ImportRequestSchema = z.object({
  // For future use - currently import is triggered via POST without body
});

export const ImportStatusQuerySchema = z.object({
  // For future use - currently no query parameters
});

// Notes route schemas
export const NoteQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1))
    .optional()
    .default(1),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .optional()
    .default(20),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
  search: z.string().min(1).max(100).optional(),
});

export const NoteIdParamSchema = z.object({
  id: z.string().uuid("Invalid note ID"),
});

// Health route schemas
export const HealthQuerySchema = z.object({
  detailed: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional()
    .default(false),
  includeMetrics: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional()
    .default(false),
});

// Test route schemas
export const TestQuerySchema = z.object({
  action: z.enum(["health", "queue", "database", "redis"]).optional(),
});

// ============================================================================
// FILE VALIDATION SCHEMAS
// ============================================================================

export const FileValidationSchema = z.object({
  filename: z.string().min(1).max(255),
  size: z
    .number()
    .positive()
    .max(10 * 1024 * 1024), // 10MB max
  mimetype: z.enum(["text/html", "application/json", "text/plain"]),
});

export const HTMLContentSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(10 * 1024 * 1024), // 10MB max content
  metadata: z
    .object({
      importId: z.string().uuid("Invalid import ID").optional(),
      filename: z.string().min(1).max(255).optional(),
      source: z.string().url("Invalid source URL").optional(),
    })
    .optional(),
});

// ============================================================================
// QUEUE JOB SCHEMAS
// ============================================================================

export const NoteJobDataSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  metadata: z
    .object({
      importId: z.string().uuid("Invalid import ID").optional(),
      filename: z.string().min(1).max(255).optional(),
      source: z.string().url("Invalid source URL").optional(),
    })
    .optional(),
});

export const ImageJobDataSchema = z.object({
  noteId: z.string().uuid("Invalid note ID"),
  file: z.object({
    title: z.string().min(1).max(255),
    historicalCreatedAt: z.date().optional(),
    contents: z.string().min(1),
    ingredients: z.array(z.any()).optional(),
    instructions: z.array(z.any()).optional(),
    source: z.string().url("Invalid source URL").optional(),
    image: z.string().optional(),
  }),
});

export const IngredientJobDataSchema = z.object({
  note: z.object({
    id: z.string().uuid("Invalid note ID"),
    title: z.string().optional(),
    html: z.string().min(1),
    imageUrl: z.string().url("Invalid image URL").optional(),
    status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
});

export const InstructionJobDataSchema = z.object({
  note: z.object({
    id: z.string().uuid("Invalid note ID"),
    title: z.string().optional(),
    html: z.string().min(1),
    imageUrl: z.string().url("Invalid image URL").optional(),
    status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
});

export const CategorizationJobDataSchema = z.object({
  noteId: z.string().uuid("Invalid note ID"),
  file: z.object({
    title: z.string().min(1).max(255),
    historicalCreatedAt: z.date().optional(),
    contents: z.string().min(1),
    ingredients: z.array(z.any()).optional(),
    instructions: z.array(z.any()).optional(),
    source: z.string().url("Invalid source URL").optional(),
    image: z.string().optional(),
  }),
});

// ============================================================================
// WEBHOOK AND EVENT SCHEMAS
// ============================================================================

export const StatusEventSchema = z.object({
  importId: z.string().uuid("Invalid import ID"),
  noteId: z.string().uuid("Invalid note ID").optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  message: z.string().max(1000).optional(),
  context: z.string().max(500).optional(),
  currentCount: z.number().min(0).optional(),
  totalCount: z.number().min(0).optional(),
  indentLevel: z.number().min(0).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export function validateEnvironment(): Environment {
  try {
    return EnvironmentSchema.parse(process.env);
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

export function createValidationMiddleware<T extends z.ZodSchema>(
  schema: T,
  target: "body" | "query" | "params" = "body"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validated = schema.parse(data);
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: "Validation failed",
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
// EXPORT ALL SCHEMAS
// ============================================================================

export const ValidationSchemas = {
  environment: EnvironmentSchema,
  import: {
    request: ImportRequestSchema,
    statusQuery: ImportStatusQuerySchema,
  },
  notes: {
    query: NoteQuerySchema,
    idParam: NoteIdParamSchema,
  },
  health: {
    query: HealthQuerySchema,
  },
  test: {
    query: TestQuerySchema,
  },
  files: {
    validation: FileValidationSchema,
    htmlContent: HTMLContentSchema,
  },
  jobs: {
    note: NoteJobDataSchema,
    image: ImageJobDataSchema,
    ingredient: IngredientJobDataSchema,
    instruction: InstructionJobDataSchema,
    categorization: CategorizationJobDataSchema,
  },
  events: {
    status: StatusEventSchema,
  },
} as const;
