import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";

// ============================================================================
// TEST DATA TYPES
// ============================================================================

/**
 * Type for parsed segment types
 */
export type ParsedSegmentType =
  | "amount"
  | "unit"
  | "ingredient"
  | "modifier"
  | "instruction"
  | "note";

/**
 * Type for parse result status
 */
export type ParseResultStatus = "PENDING" | "CORRECT" | "INCORRECT" | "ERROR";

/**
 * Type for status event status
 */
export type StatusEventStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

// ============================================================================
// SCHEMA MOCK UTILITIES
// ============================================================================

/**
 * Create mock schema functions for testing
 */
export function createMockSchemaFunctions(schemaNames: string[]) {
  const mocks: Record<string, ReturnType<typeof vi.fn>> = {};

  schemaNames.forEach((name) => {
    mocks[name] = vi.fn();
  });

  return mocks;
}

/**
 * Setup common schema mocks for testing
 */
export function setupSchemaMocks() {
  // Mock base schemas
  vi.mock("../base", () => ({
    SourceSchema: vi.fn(),
    ProcessingOptionsSchema: vi.fn(),
    JobMetadataSchema: vi.fn(),
    BaseJobDataSchema: vi.fn(),
    StatusEventSchema: vi.fn(),
    ErrorContextSchema: vi.fn(),
    ParsedSegmentSchema: vi.fn(),
    ParseResultSchema: vi.fn(),
    BaseValidation: vi.fn(),
  }));

  // Mock note schemas
  vi.mock("../note", () => ({
    NoteJobDataSchema: vi.fn(),
    ParseHtmlDataSchema: vi.fn(),
    ParsedHtmlFileSchema: vi.fn(),
    SaveNoteDataSchema: vi.fn(),
    NoteSchema: vi.fn(),
    ParsedIngredientLineSchema: vi.fn(),
    ParsedInstructionLineSchema: vi.fn(),
    ScheduleActionDataSchema: vi.fn(),
    ScheduleCategorizationDataSchema: vi.fn(),
    ScheduleImagesDataSchema: vi.fn(),
    ScheduleIngredientsDataSchema: vi.fn(),
    ScheduleInstructionsDataSchema: vi.fn(),
    ScheduleSourceDataSchema: vi.fn(),
    NoteValidation: vi.fn(),
  }));

  // Mock ingredient schemas
  vi.mock("../ingredient", () => ({
    IngredientJobDataSchema: vi.fn(),
    ProcessIngredientLineInputSchema: vi.fn(),
    ProcessIngredientLineOutputSchema: vi.fn(),
    SaveIngredientLineInputSchema: vi.fn(),
    SaveIngredientLineOutputSchema: vi.fn(),
    ScheduleCategorizationInputSchema: vi.fn(),
    ScheduleCategorizationOutputSchema: vi.fn(),
    IngredientValidation: vi.fn(),
  }));
}

/**
 * Clear all schema mocks
 */
export function clearSchemaMocks() {
  vi.clearAllMocks();
}

// ============================================================================
// SCHEMA VALIDATION TEST UTILITIES
// ============================================================================

/**
 * Test that a schema validates valid data successfully
 */
export function testValidSchema<T extends z.ZodType>(
  schema: T,
  validData: z.infer<T>,
  description?: string
) {
  it(`should validate ${description || "valid data"}`, () => {
    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });
}

/**
 * Test that a schema rejects invalid data
 */
export function testInvalidSchema<T extends z.ZodType>(
  schema: T,
  invalidData: unknown,
  expectedErrorMessage?: string,
  description?: string
) {
  it(`should reject ${description || "invalid data"}`, () => {
    const result = schema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success && result.error.issues[0] && expectedErrorMessage) {
      expect(result.error.issues[0].message).toBe(expectedErrorMessage);
    }
  });
}

/**
 * Test that a schema uses default values when optional fields are not provided
 */
export function testSchemaDefaults<T extends z.ZodType>(
  schema: T,
  minimalData: unknown,
  expectedDefaults: Partial<z.infer<T>>,
  description?: string
) {
  it(`should use default values when ${description || "optional fields are not provided"}`, () => {
    const result = schema.safeParse(minimalData);
    expect(result.success).toBe(true);
    if (result.success) {
      Object.entries(expectedDefaults).forEach(([key, value]) => {
        const actualValue = result.data[key as keyof z.infer<T>];
        if (Array.isArray(value)) {
          expect(actualValue).toEqual(value);
        } else {
          expect(actualValue).toBe(value);
        }
      });
    }
  });
}

/**
 * Test that a schema validates partial data with defaults
 */
export function testSchemaPartialData<T extends z.ZodType>(
  schema: T,
  partialData: unknown,
  expectedResult: z.infer<T>,
  description?: string
) {
  it(`should validate ${description || "partial data with defaults"}`, () => {
    const result = schema.safeParse(partialData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expectedResult);
    }
  });
}

/**
 * Test that a schema validates all enum values
 */
export function testSchemaEnumValues<T extends z.ZodType>(
  schema: T,
  enumValues: readonly unknown[],
  fieldName: string,
  description?: string
) {
  it(`should validate all ${description || "enum values"}`, () => {
    enumValues.forEach((value) => {
      const testData = { [fieldName]: value };
      const result = schema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[fieldName as keyof z.infer<T>]).toBe(value);
      }
    });
  });
}

/**
 * Test that a schema rejects invalid enum values
 */
export function testSchemaInvalidEnum<T extends z.ZodType>(
  schema: T,
  invalidValue: unknown,
  fieldName: string,
  description?: string
) {
  it(`should reject ${description || "invalid enum value"}`, () => {
    const testData = { [fieldName]: invalidValue };
    const result = schema.safeParse(testData);
    expect(result.success).toBe(false);
  });
}

// ============================================================================
// COMMON TEST DATA GENERATORS
// ============================================================================

/**
 * Create a valid UUID for testing
 */
export function createTestUuid(): string {
  return "123e4567-e89b-12d3-a456-426614174000";
}

/**
 * Create a valid URL for testing
 */
export function createTestUrl(): string {
  return "https://example.com/recipe";
}

/**
 * Create a valid date for testing
 */
export function createTestDate(): Date {
  return new Date("2023-01-01T00:00:00Z");
}

/**
 * Create a valid HTML content for testing
 */
export function createTestHtmlContent(): string {
  return "<html><body><h1>Test Recipe</h1></body></html>";
}

/**
 * Create a valid base64 image for testing
 */
export function createTestBase64Image(): string {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
}

/**
 * Create a valid job metadata for testing
 */
export function createTestJobMetadata(
  overrides: Partial<{
    jobId: string;
    workerName: string;
    attemptNumber: number;
    maxRetries: number;
    createdAt: Date;
    priority: number;
    timeout: number;
  }> = {}
) {
  return {
    jobId: "job-123",
    workerName: "test-worker",
    attemptNumber: 1,
    maxRetries: 3,
    createdAt: new Date("2023-01-01"),
    priority: 5,
    timeout: 30000,
    ...overrides,
  };
}

/**
 * Create a valid source data for testing
 */
export function createTestSourceData(
  overrides: Partial<{
    url: string;
    filename: string;
    contentType: string;
    metadata: Record<string, unknown>;
  }> = {}
) {
  return {
    url: "https://example.com/recipe",
    filename: "recipe.html",
    contentType: "text/html",
    metadata: { author: "John Doe" },
    ...overrides,
  };
}

/**
 * Create a valid processing options for testing
 */
export function createTestProcessingOptions(
  overrides: Partial<{
    skipCategorization: boolean;
    skipImageProcessing: boolean;
    skipIngredientProcessing: boolean;
    skipInstructionProcessing: boolean;
    strictMode: boolean;
    allowPartial: boolean;
  }> = {}
) {
  return {
    skipCategorization: false,
    skipImageProcessing: false,
    skipIngredientProcessing: false,
    skipInstructionProcessing: false,
    strictMode: false,
    allowPartial: true,
    ...overrides,
  };
}

/**
 * Create a valid parsed segment for testing
 */
export function createTestParsedSegment(
  overrides: Partial<{
    index: number;
    rule: string;
    type: ParsedSegmentType;
    value: string;
    processingTime: number;
    metadata: Record<string, unknown>;
  }> = {}
) {
  return {
    index: 0,
    rule: "amount_rule",
    type: "amount" as ParsedSegmentType,
    value: "1 cup",
    processingTime: 150,
    metadata: { confidence: 0.95 },
    ...overrides,
  };
}

/**
 * Create a valid parse result for testing
 */
export function createTestParseResult(
  overrides: Partial<{
    success: boolean;
    parseStatus: ParseResultStatus;
    segments: Array<{
      index: number;
      rule: string;
      type: ParsedSegmentType;
      value: string;
    }>;
    errorMessage: string | undefined;
    processingTime: number;
    metadata: Record<string, unknown>;
  }> = {}
) {
  return {
    success: true,
    parseStatus: "CORRECT" as ParseResultStatus,
    segments: [
      {
        index: 0,
        rule: "amount_rule",
        type: "amount" as ParsedSegmentType,
        value: "1 cup",
      },
    ],
    errorMessage: undefined,
    processingTime: 250,
    metadata: { confidence: 0.9 },
    ...overrides,
  };
}

/**
 * Create a valid ingredient job data for testing
 */
export function createTestIngredientJobData(
  overrides: Partial<{
    ingredientLineId: string;
    reference: string;
    blockIndex: number;
    lineIndex: number;
    noteId: string;
    importId: string;
    currentIngredientIndex: number;
    totalIngredients: number;
    options: {
      strictMode: boolean;
      allowPartial: boolean;
    };
  }> = {}
) {
  return {
    ingredientLineId: "line-123",
    reference: "1 cup flour",
    blockIndex: 0,
    lineIndex: 1,
    noteId: "123e4567-e89b-12d3-a456-426614174000",
    importId: "import-123",
    currentIngredientIndex: 1,
    totalIngredients: 5,
    options: {
      strictMode: true,
      allowPartial: false,
    },
    ...overrides,
  };
}

/**
 * Create a valid process ingredient line input for testing
 */
export function createTestProcessIngredientLineInput(
  overrides: Partial<{
    ingredientLineId: string;
    reference: string;
    blockIndex: number;
    lineIndex: number;
    noteId: string;
    options: {
      strictMode: boolean;
      allowPartial: boolean;
    };
  }> = {}
) {
  return {
    ingredientLineId: "line-123",
    reference: "1 cup flour",
    blockIndex: 0,
    lineIndex: 1,
    noteId: "123e4567-e89b-12d3-a456-426614174000",
    options: {
      strictMode: true,
      allowPartial: false,
    },
    ...overrides,
  };
}

/**
 * Create a valid process ingredient line output for testing
 */
export function createTestProcessIngredientLineOutput(
  overrides: Partial<{
    success: boolean;
    parseStatus: ParseResultStatus;
    segments: Array<{
      index: number;
      rule: string;
      type: ParsedSegmentType;
      value: string;
      processingTime: number;
    }>;
    processingTime: number;
    ingredientLineId: string;
    noteId: string;
    errorMessage: string | undefined;
  }> = {}
) {
  return {
    success: true,
    parseStatus: "CORRECT" as ParseResultStatus,
    segments: [
      {
        index: 0,
        rule: "amount_rule",
        type: "amount" as ParsedSegmentType,
        value: "1",
        processingTime: 50,
      },
      {
        index: 1,
        rule: "unit_rule",
        type: "unit" as ParsedSegmentType,
        value: "cup",
        processingTime: 30,
      },
      {
        index: 2,
        rule: "ingredient_rule",
        type: "ingredient" as ParsedSegmentType,
        value: "flour",
        processingTime: 40,
      },
    ],
    processingTime: 120,
    ingredientLineId: "line-123",
    noteId: "123e4567-e89b-12d3-a456-426614174000",
    errorMessage: undefined,
    ...overrides,
  };
}

/**
 * Create a valid save ingredient line input for testing
 */
export function createTestSaveIngredientLineInput(
  overrides: Partial<{
    ingredientLineId: string;
    noteId: string;
    parseResult: {
      success: boolean;
      parseStatus: ParseResultStatus;
      segments: Array<{
        index: number;
        rule: string;
        type: ParsedSegmentType;
        value: string;
      }>;
      processingTime: number;
    };
  }> = {}
) {
  return {
    ingredientLineId: "line-123",
    noteId: "123e4567-e89b-12d3-a456-426614174000",
    parseResult: {
      success: true,
      parseStatus: "CORRECT" as ParseResultStatus,
      segments: [
        {
          index: 0,
          rule: "amount_rule",
          type: "amount" as ParsedSegmentType,
          value: "1",
        },
        {
          index: 1,
          rule: "unit_rule",
          type: "unit" as ParsedSegmentType,
          value: "cup",
        },
        {
          index: 2,
          rule: "ingredient_rule",
          type: "ingredient" as ParsedSegmentType,
          value: "flour",
        },
      ],
      processingTime: 120,
    },
    ...overrides,
  };
}

/**
 * Create a valid save ingredient line output for testing
 */
export function createTestSaveIngredientLineOutput(
  overrides: Partial<{
    success: boolean;
    ingredientLineId: string;
    segmentsCreated: number;
    processingTime: number;
    errorMessage: string | undefined;
  }> = {}
) {
  return {
    success: true,
    ingredientLineId: "line-123",
    segmentsCreated: 3,
    processingTime: 150,
    errorMessage: undefined,
    ...overrides,
  };
}

/**
 * Create a valid schedule categorization input for testing
 */
export function createTestScheduleCategorizationInput(
  overrides: Partial<{
    noteId: string;
    ingredientLineId: string;
  }> = {}
) {
  return {
    noteId: "123e4567-e89b-12d3-a456-426614174000",
    ingredientLineId: "line-123",
    ...overrides,
  };
}

/**
 * Create a valid schedule categorization output for testing
 */
export function createTestScheduleCategorizationOutput(
  overrides: Partial<{
    success: boolean;
    categorizationJobId: string | undefined;
    errorMessage: string | undefined;
  }> = {}
) {
  return {
    success: true,
    categorizationJobId: "job-123",
    errorMessage: undefined,
    ...overrides,
  };
}

/**
 * Create a valid note job data for testing
 */
export function createTestNoteJobData(
  overrides: Partial<{
    content: string;
    noteId: string;
    priority: number;
    timeout: number;
  }> = {}
) {
  return {
    content: "<html><body><h1>Test Recipe</h1></body></html>",
    noteId: "123e4567-e89b-12d3-a456-426614174000",
    priority: 5,
    timeout: 30000,
    ...overrides,
  };
}

/**
 * Create a valid parse HTML data for testing
 */
export function createTestParseHtmlData(
  overrides: Partial<{
    content: string;
    importId: string;
  }> = {}
) {
  return {
    content: "<html><body><h1>Test Recipe</h1></body></html>",
    importId: "import-123",
    ...overrides,
  };
}

/**
 * Create a valid parsed HTML file for testing
 */
export function createTestParsedHtmlFile(
  overrides: Partial<{
    title: string;
    contents: string;
    tags: string[];
    source: string;
    sourceUrl: string;
    sourceApplication: string;
    created: string;
    historicalCreatedAt: Date;
    ingredients: unknown[];
    instructions: unknown[];
    image: string;
    images: Array<{
      src: string;
      width: string;
      dataResourceHash: string;
    }>;
    metadata: Record<string, unknown>;
  }> = {}
) {
  return {
    title: "Test Recipe",
    contents: "<html><body><h1>Test Recipe</h1></body></html>",
    tags: ["recipe", "food"],
    source: "Evernote",
    sourceUrl: "https://example.com/recipe",
    sourceApplication: "Evernote",
    created: "2023-01-01T00:00:00Z",
    historicalCreatedAt: new Date("2023-01-01"),
    ingredients: [],
    instructions: [],
    image:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    images: [
      {
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        width: "100",
        dataResourceHash: "hash123",
      },
    ],
    metadata: { author: "John Doe" },
    ...overrides,
  };
}

/**
 * Create a valid save note data for testing
 */
export function createTestSaveNoteData(
  overrides: Partial<{
    file: {
      title: string;
      contents: string;
      tags: string[];
      ingredients: unknown[];
      instructions: unknown[];
    };
    importId: string;
  }> = {}
) {
  return {
    file: {
      title: "Test Recipe",
      contents: "<html><body><h1>Test Recipe</h1></body></html>",
      tags: [],
      ingredients: [],
      instructions: [],
    },
    importId: "import-123",
    ...overrides,
  };
}

/**
 * Create a valid parsed ingredient line for testing
 */
export function createTestParsedIngredientLine(
  overrides: Partial<{
    id: string;
    reference: string;
    blockIndex: number;
    lineIndex: number;
  }> = {}
) {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    reference: "1 cup flour",
    blockIndex: 0,
    lineIndex: 1,
    ...overrides,
  };
}

/**
 * Create a valid parsed instruction line for testing
 */
export function createTestParsedInstructionLine(
  overrides: Partial<{
    id: string;
    originalText: string;
    normalizedText: string;
    lineIndex: number;
  }> = {}
) {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    originalText: "Mix ingredients together",
    normalizedText: "mix ingredients together",
    lineIndex: 1,
    ...overrides,
  };
}

/**
 * Create a valid schedule action data for testing
 */
export function createTestScheduleActionData(
  overrides: Partial<{
    noteId: string;
    file: {
      title: string;
      contents: string;
      tags: string[];
      ingredients: unknown[];
      instructions: unknown[];
    };
  }> = {}
) {
  return {
    noteId: "123e4567-e89b-12d3-a456-426614174000",
    file: {
      title: "Test Recipe",
      contents: "<html><body><h1>Test Recipe</h1></body></html>",
      tags: [],
      ingredients: [],
      instructions: [],
    },
    ...overrides,
  };
}

/**
 * Create a valid schedule ingredients data for testing
 */
export function createTestScheduleIngredientsData(
  overrides: Partial<{
    noteId: string;
    importId: string;
    note: {
      id: string;
      title: string;
      parsedIngredientLines: Array<{
        id: string;
        reference: string;
        blockIndex: number;
        lineIndex: number;
      }>;
    };
  }> = {}
) {
  return {
    noteId: "123e4567-e89b-12d3-a456-426614174000",
    importId: "import-123",
    note: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Test Recipe",
      parsedIngredientLines: [
        {
          id: "456e7890-e89b-12d3-a456-426614174000",
          reference: "1 cup flour",
          blockIndex: 0,
          lineIndex: 1,
        },
      ],
    },
    ...overrides,
  };
}

/**
 * Create a valid schedule instructions data for testing
 */
export function createTestScheduleInstructionsData(
  overrides: Partial<{
    noteId: string;
    importId: string;
    instructionLines: Array<{
      id: string;
      originalText: string;
      lineIndex: number;
    }>;
  }> = {}
) {
  return {
    noteId: "123e4567-e89b-12d3-a456-426614174000",
    importId: "import-123",
    instructionLines: [
      {
        id: "456e7890-e89b-12d3-a456-426614174000",
        originalText: "Mix ingredients together",
        lineIndex: 1,
      },
    ],
    ...overrides,
  };
}

/**
 * Create a valid environment for testing
 */
export function createTestEnvironment(
  overrides: Partial<{
    PORT: string;
    WS_PORT: string;
    WS_HOST: string;
    DATABASE_URL: string;
    REDIS_HOST: string;
    REDIS_PORT: string;
    REDIS_PASSWORD: string;
    JWT_SECRET: string;
    API_KEY: string;
    RATE_LIMIT_WINDOW_MS: string;
    RATE_LIMIT_MAX_REQUESTS: string;
    MAX_FILE_SIZE_BYTES: string;
    MAX_REQUEST_SIZE_BYTES: string;
  }> = {}
) {
  return {
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
    ...overrides,
  };
}

/**
 * Create a valid note query for testing
 */
export function createTestNoteQuery(
  overrides: Partial<{
    page: string;
    limit: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    search: string;
  }> = {}
) {
  return {
    page: "1",
    limit: "20",
    status: "COMPLETED" as const,
    search: "recipe",
    ...overrides,
  };
}

/**
 * Create a valid note query result for testing (after schema transformation)
 */
export function createTestNoteQueryResult(
  overrides: Partial<{
    page: number;
    limit: number;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    search: string;
  }> = {}
) {
  return {
    page: 1,
    limit: 20,
    status: "COMPLETED" as const,
    search: "recipe",
    ...overrides,
  };
}

/**
 * Create a valid note ID param for testing
 */
export function createTestNoteIdParam(
  overrides: Partial<{
    id: string;
  }> = {}
) {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    ...overrides,
  };
}

/**
 * Create a valid health query for testing
 */
export function createTestHealthQuery(
  overrides: Partial<{
    detailed: string;
    includeMetrics: string;
  }> = {}
) {
  return {
    detailed: "true",
    includeMetrics: "false",
    ...overrides,
  };
}

/**
 * Create a valid health query result for testing (after schema transformation)
 */
export function createTestHealthQueryResult(
  overrides: Partial<{
    detailed: boolean;
    includeMetrics: boolean;
  }> = {}
) {
  return {
    detailed: true,
    includeMetrics: false,
    ...overrides,
  };
}

/**
 * Create a valid test query for testing
 */
export function createTestTestQuery(
  overrides: Partial<{
    action: "health" | "queue" | "database" | "redis";
  }> = {}
) {
  return {
    action: "health" as const,
    ...overrides,
  };
}

/**
 * Create a valid file validation data for testing
 */
export function createTestFileValidation(
  overrides: Partial<{
    filename: string;
    size: number;
    mimetype: "text/html" | "application/json" | "text/plain";
  }> = {}
) {
  return {
    filename: "test.html",
    size: 1024,
    mimetype: "text/html" as const,
    ...overrides,
  };
}

/**
 * Create a valid HTML content schema data for testing
 */
export function createTestHtmlContentSchema(
  overrides: Partial<{
    content: string;
    metadata: {
      importId: string;
      filename: string;
      source: string;
    };
  }> = {}
) {
  return {
    content: "<html><body><h1>Test</h1></body></html>",
    metadata: {
      importId: "123e4567-e89b-12d3-a456-426614174000",
      filename: "test.html",
      source: "https://example.com/recipe",
    },
    ...overrides,
  };
}

/**
 * Create a valid status event for testing
 */
export function createTestStatusEvent(
  overrides: Partial<{
    importId: string;
    noteId: string;
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
    message: string;
    context: string;
    currentCount: number;
    totalCount: number;
    indentLevel: number;
    metadata: Record<string, unknown>;
  }> = {}
) {
  return {
    importId: "123e4567-e89b-12d3-a456-426614174000",
    noteId: "456e7890-e89b-12d3-a456-426614174000",
    status: "PROCESSING" as const,
    message: "Processing started",
    context: "parse_html",
    currentCount: 5,
    totalCount: 10,
    indentLevel: 2,
    metadata: { progress: 50 },
    ...overrides,
  };
}

// ============================================================================
// SCHEMA TEST HELPERS
// ============================================================================

/**
 * Test a schema with multiple valid and invalid cases
 */
export function testSchemaComprehensive<T extends z.ZodType>(
  schema: T,
  testCases: Array<{
    data: unknown;
    shouldPass: boolean;
    expectedErrorMessage?: string;
    description: string;
  }>
) {
  testCases.forEach(
    ({ data, shouldPass, expectedErrorMessage, description }) => {
      if (shouldPass) {
        testValidSchema(schema, data as z.infer<T>, description);
      } else {
        testInvalidSchema(schema, data, expectedErrorMessage, description);
      }
    }
  );
}

/**
 * Test that a schema validates required fields
 */
export function testSchemaRequiredFields<T extends z.ZodType>(
  schema: T,
  requiredFields: string[],
  baseData: Record<string, unknown>
) {
  requiredFields.forEach((field) => {
    it(`should reject missing required field: ${field}`, () => {
      const dataWithoutField = { ...baseData };
      delete dataWithoutField[field];

      const result = schema.safeParse(dataWithoutField);
      expect(result.success).toBe(false);
    });
  });
}

/**
 * Test that a schema validates field types
 */
export function testSchemaFieldTypes<T extends z.ZodType>(
  schema: T,
  fieldTests: Array<{
    field: string;
    validValue: unknown;
    invalidValue: unknown;
    description: string;
  }>
) {
  fieldTests.forEach(({ field, validValue, invalidValue, description }) => {
    it(`should validate ${description}`, () => {
      // Test valid value
      const validData = { [field]: validValue };
      const validResult = schema.safeParse(validData);
      expect(validResult.success).toBe(true);

      // Test invalid value
      const invalidData = { [field]: invalidValue };
      const invalidResult = schema.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);
    });
  });
}

// ============================================================================
// VALIDATION UTILITY TEST HELPERS
// ============================================================================

/**
 * Test a validation utility function
 */
export function testValidationUtility<T>(
  validationFn: (
    data: unknown
  ) => { success: true; data: T } | { success: false; error: string },
  validData: T,
  invalidData: unknown,
  description: string
) {
  describe(description, () => {
    it("should validate valid data", () => {
      const result = validationFn(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should return error for invalid data", () => {
      const result = validationFn(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe("string");
      }
    });
  });
}
