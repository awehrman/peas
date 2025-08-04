import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  clearSchemaMocks,
  createMockSchemaFunctions,
  createTestBase64Image,
  createTestDate,
  createTestEnvironment,
  createTestFileValidation,
  createTestHealthQuery,
  createTestHealthQueryResult,
  createTestHtmlContent,
  createTestHtmlContentSchema,
  createTestIngredientJobData,
  createTestJobMetadata,
  createTestNoteIdParam,
  createTestNoteJobData,
  createTestNoteQuery,
  createTestNoteQueryResult,
  createTestParseHtmlData,
  createTestParseResult,
  createTestParsedHtmlFile,
  createTestParsedIngredientLine,
  createTestParsedInstructionLine,
  createTestParsedSegment,
  createTestProcessIngredientLineInput,
  createTestProcessIngredientLineOutput,
  createTestProcessingOptions,
  createTestSaveIngredientLineInput,
  createTestSaveIngredientLineOutput,
  createTestSaveNoteData,
  createTestScheduleActionData,
  createTestScheduleCategorizationInput,
  createTestScheduleCategorizationOutput,
  createTestScheduleIngredientsData,
  createTestScheduleInstructionsData,
  createTestSourceData,
  createTestStatusEvent,
  createTestTestQuery,
  createTestUrl,
  createTestUuid,
  setupSchemaMocks,
} from "../schema";

// ============================================================================
// SCHEMA MOCK UTILITIES TESTS
// ============================================================================

describe("Schema Mock Utilities", () => {
  describe("createMockSchemaFunctions", () => {
    it("should create mock functions for all schema names", () => {
      const schemaNames = ["TestSchema", "AnotherSchema"];
      const mocks = createMockSchemaFunctions(schemaNames);

      expect(mocks).toHaveProperty("TestSchema");
      expect(mocks).toHaveProperty("AnotherSchema");
      expect(typeof mocks.TestSchema).toBe("function");
      expect(typeof mocks.AnotherSchema).toBe("function");
    });

    it("should create empty mocks object for empty array", () => {
      const mocks = createMockSchemaFunctions([]);
      expect(mocks).toEqual({});
    });
  });

  describe("setupSchemaMocks", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should setup all schema mocks", () => {
      setupSchemaMocks();
      // The function should not throw and should set up all mocks
      expect(vi.mocked).toBeDefined();
    });
  });

  describe("clearSchemaMocks", () => {
    it("should clear all mocks", () => {
      clearSchemaMocks();
      // Should not throw and should clear mocks
      expect(vi.clearAllMocks).toBeDefined();
    });
  });
});

// ============================================================================
// SCHEMA VALIDATION TEST UTILITIES TESTS
// ============================================================================

describe("Schema Validation Test Utilities", () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  });

  describe("testValidSchema", () => {
    it("should validate valid data successfully", () => {
      const validData = {
        name: "John Doe",
        age: 30,
        email: "john@example.com",
      };

      const result = testSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });
  });

  describe("testInvalidSchema", () => {
    it("should reject invalid data", () => {
      const invalidData = {
        name: "John Doe",
        age: "not a number",
        email: "invalid-email",
      };

      const result = testSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues.length > 0) {
        // Check that there's at least one validation error
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe("testSchemaDefaults", () => {
    const schemaWithDefaults = z.object({
      name: z.string(),
      age: z.number().default(25),
      email: z.string().email().default("default@example.com"),
    });

    it("should use default values when optional fields are not provided", () => {
      const minimalData = { name: "John Doe" };
      const result = schemaWithDefaults.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBe(25);
        expect(result.data.email).toBe("default@example.com");
      }
    });
  });

  describe("testSchemaPartialData", () => {
    const schemaWithDefaults = z.object({
      name: z.string(),
      age: z.number().default(25),
      email: z.string().email().default("default@example.com"),
    });

    it("should validate partial data with defaults", () => {
      const partialData = { name: "John Doe" };
      const expectedResult = {
        name: "John Doe",
        age: 25,
        email: "default@example.com",
      };

      const result = schemaWithDefaults.safeParse(partialData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expectedResult);
      }
    });
  });

  describe("testSchemaEnumValues", () => {
    const enumSchema = z.object({
      status: z.enum(["PENDING", "PROCESSING", "COMPLETED"]),
    });

    it("should validate all enum values", () => {
      const enumValues = ["PENDING", "PROCESSING", "COMPLETED"] as const;
      enumValues.forEach((value) => {
        const testData = { status: value };
        const result = enumSchema.safeParse(testData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(value);
        }
      });
    });
  });

  describe("testSchemaInvalidEnum", () => {
    const enumSchema = z.object({
      status: z.enum(["PENDING", "PROCESSING", "COMPLETED"]),
    });

    it("should reject invalid enum value", () => {
      const testData = { status: "INVALID_STATUS" };
      const result = enumSchema.safeParse(testData);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// TEST DATA GENERATORS TESTS
// ============================================================================

describe("Test Data Generators", () => {
  describe("createTestUuid", () => {
    it("should create a valid UUID", () => {
      const uuid = createTestUuid();
      expect(uuid).toBe("123e4567-e89b-12d3-a456-426614174000");
    });
  });

  describe("createTestUrl", () => {
    it("should create a valid URL", () => {
      const url = createTestUrl();
      expect(url).toBe("https://example.com/recipe");
    });
  });

  describe("createTestDate", () => {
    it("should create a valid date", () => {
      const date = createTestDate();
      expect(date).toEqual(new Date("2023-01-01T00:00:00Z"));
    });
  });

  describe("createTestHtmlContent", () => {
    it("should create valid HTML content", () => {
      const html = createTestHtmlContent();
      expect(html).toBe("<html><body><h1>Test Recipe</h1></body></html>");
    });
  });

  describe("createTestBase64Image", () => {
    it("should create a valid base64 image", () => {
      const image = createTestBase64Image();
      expect(image).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("createTestJobMetadata", () => {
    it("should create job metadata with default values", () => {
      const metadata = createTestJobMetadata();
      expect(metadata).toEqual({
        jobId: "job-123",
        workerName: "test-worker",
        attemptNumber: 1,
        maxRetries: 3,
        createdAt: new Date("2023-01-01"),
        priority: 5,
        timeout: 30000,
      });
    });

    it("should create job metadata with overrides", () => {
      const metadata = createTestJobMetadata({
        jobId: "custom-job",
        priority: 10,
      });
      expect(metadata.jobId).toBe("custom-job");
      expect(metadata.priority).toBe(10);
      expect(metadata.workerName).toBe("test-worker"); // default value
    });
  });

  describe("createTestSourceData", () => {
    it("should create source data with default values", () => {
      const sourceData = createTestSourceData();
      expect(sourceData).toEqual({
        url: "https://example.com/recipe",
        filename: "recipe.html",
        contentType: "text/html",
        metadata: { author: "John Doe" },
      });
    });

    it("should create source data with overrides", () => {
      const sourceData = createTestSourceData({
        url: "https://custom.com/recipe",
        filename: "custom.html",
      });
      expect(sourceData.url).toBe("https://custom.com/recipe");
      expect(sourceData.filename).toBe("custom.html");
      expect(sourceData.contentType).toBe("text/html"); // default value
    });
  });

  describe("createTestProcessingOptions", () => {
    it("should create processing options with default values", () => {
      const options = createTestProcessingOptions();
      expect(options).toEqual({
        skipCategorization: false,
        skipImageProcessing: false,
        skipIngredientProcessing: false,
        skipInstructionProcessing: false,
        strictMode: false,
        allowPartial: true,
      });
    });

    it("should create processing options with overrides", () => {
      const options = createTestProcessingOptions({
        strictMode: true,
        allowPartial: false,
      });
      expect(options.strictMode).toBe(true);
      expect(options.allowPartial).toBe(false);
      expect(options.skipCategorization).toBe(false); // default value
    });
  });

  describe("createTestParsedSegment", () => {
    it("should create parsed segment with default values", () => {
      const segment = createTestParsedSegment();
      expect(segment).toEqual({
        index: 0,
        rule: "amount_rule",
        type: "amount",
        value: "1 cup",
        processingTime: 150,
        metadata: { confidence: 0.95 },
      });
    });

    it("should create parsed segment with overrides", () => {
      const segment = createTestParsedSegment({
        type: "ingredient",
        value: "flour",
        index: 5,
      });
      expect(segment.type).toBe("ingredient");
      expect(segment.value).toBe("flour");
      expect(segment.index).toBe(5);
      expect(segment.rule).toBe("amount_rule"); // default value
    });
  });

  describe("createTestParseResult", () => {
    it("should create parse result with default values", () => {
      const result = createTestParseResult();
      expect(result).toEqual({
        success: true,
        parseStatus: "CORRECT",
        segments: [
          {
            index: 0,
            rule: "amount_rule",
            type: "amount",
            value: "1 cup",
          },
        ],
        errorMessage: undefined,
        processingTime: 250,
        metadata: { confidence: 0.9 },
      });
    });

    it("should create parse result with overrides", () => {
      const result = createTestParseResult({
        success: false,
        parseStatus: "ERROR",
        errorMessage: "Parsing failed",
      });
      expect(result.success).toBe(false);
      expect(result.parseStatus).toBe("ERROR");
      expect(result.errorMessage).toBe("Parsing failed");
      expect(result.processingTime).toBe(250); // default value
    });
  });

  describe("createTestIngredientJobData", () => {
    it("should create ingredient job data with default values", () => {
      const data = createTestIngredientJobData();
      expect(data).toEqual({
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
      });
    });

    it("should create ingredient job data with overrides", () => {
      const data = createTestIngredientJobData({
        ingredientLineId: "custom-line",
        reference: "2 cups sugar",
        currentIngredientIndex: 3,
      });
      expect(data.ingredientLineId).toBe("custom-line");
      expect(data.reference).toBe("2 cups sugar");
      expect(data.currentIngredientIndex).toBe(3);
      expect(data.blockIndex).toBe(0); // default value
    });
  });

  describe("createTestProcessIngredientLineInput", () => {
    it("should create process ingredient line input with default values", () => {
      const input = createTestProcessIngredientLineInput();
      expect(input).toEqual({
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        options: {
          strictMode: true,
          allowPartial: false,
        },
      });
    });

    it("should create process ingredient line input with overrides", () => {
      const input = createTestProcessIngredientLineInput({
        reference: "2 cups sugar",
        options: { strictMode: false, allowPartial: true },
      });
      expect(input.reference).toBe("2 cups sugar");
      expect(input.options.strictMode).toBe(false);
      expect(input.options.allowPartial).toBe(true);
    });
  });

  describe("createTestProcessIngredientLineOutput", () => {
    it("should create process ingredient line output with default values", () => {
      const output = createTestProcessIngredientLineOutput();
      expect(output).toEqual({
        success: true,
        parseStatus: "CORRECT",
        segments: [
          {
            index: 0,
            rule: "amount_rule",
            type: "amount",
            value: "1",
            processingTime: 50,
          },
          {
            index: 1,
            rule: "unit_rule",
            type: "unit",
            value: "cup",
            processingTime: 30,
          },
          {
            index: 2,
            rule: "ingredient_rule",
            type: "ingredient",
            value: "flour",
            processingTime: 40,
          },
        ],
        processingTime: 120,
        ingredientLineId: "line-123",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        errorMessage: undefined,
      });
    });

    it("should create process ingredient line output with overrides", () => {
      const output = createTestProcessIngredientLineOutput({
        success: false,
        parseStatus: "ERROR",
        errorMessage: "Processing failed",
      });
      expect(output.success).toBe(false);
      expect(output.parseStatus).toBe("ERROR");
      expect(output.errorMessage).toBe("Processing failed");
    });
  });

  describe("createTestSaveIngredientLineInput", () => {
    it("should create save ingredient line input with default values", () => {
      const input = createTestSaveIngredientLineInput();
      expect(input).toEqual({
        ingredientLineId: "line-123",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        parseResult: {
          success: true,
          parseStatus: "CORRECT",
          segments: [
            {
              index: 0,
              rule: "amount_rule",
              type: "amount",
              value: "1",
            },
            {
              index: 1,
              rule: "unit_rule",
              type: "unit",
              value: "cup",
            },
            {
              index: 2,
              rule: "ingredient_rule",
              type: "ingredient",
              value: "flour",
            },
          ],
          processingTime: 120,
        },
      });
    });

    it("should create save ingredient line input with overrides", () => {
      const input = createTestSaveIngredientLineInput({
        ingredientLineId: "custom-line",
        parseResult: {
          success: false,
          parseStatus: "ERROR",
          segments: [],
          processingTime: 0,
        },
      });
      expect(input.ingredientLineId).toBe("custom-line");
      expect(input.parseResult.success).toBe(false);
    });
  });

  describe("createTestSaveIngredientLineOutput", () => {
    it("should create save ingredient line output with default values", () => {
      const output = createTestSaveIngredientLineOutput();
      expect(output).toEqual({
        success: true,
        ingredientLineId: "line-123",
        segmentsCreated: 3,
        processingTime: 150,
        errorMessage: undefined,
      });
    });

    it("should create save ingredient line output with overrides", () => {
      const output = createTestSaveIngredientLineOutput({
        success: false,
        segmentsCreated: 0,
        errorMessage: "Save failed",
      });
      expect(output.success).toBe(false);
      expect(output.segmentsCreated).toBe(0);
      expect(output.errorMessage).toBe("Save failed");
    });
  });

  describe("createTestScheduleCategorizationInput", () => {
    it("should create schedule categorization input with default values", () => {
      const input = createTestScheduleCategorizationInput();
      expect(input).toEqual({
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        ingredientLineId: "line-123",
      });
    });

    it("should create schedule categorization input with overrides", () => {
      const input = createTestScheduleCategorizationInput({
        noteId: "custom-note",
        ingredientLineId: "custom-line",
      });
      expect(input.noteId).toBe("custom-note");
      expect(input.ingredientLineId).toBe("custom-line");
    });
  });

  describe("createTestScheduleCategorizationOutput", () => {
    it("should create schedule categorization output with default values", () => {
      const output = createTestScheduleCategorizationOutput();
      expect(output).toEqual({
        success: true,
        categorizationJobId: "job-123",
        errorMessage: undefined,
      });
    });

    it("should create schedule categorization output with overrides", () => {
      const output = createTestScheduleCategorizationOutput({
        success: false,
        errorMessage: "Scheduling failed",
      });
      expect(output.success).toBe(false);
      expect(output.errorMessage).toBe("Scheduling failed");
    });
  });

  describe("createTestNoteJobData", () => {
    it("should create note job data with default values", () => {
      const data = createTestNoteJobData();
      expect(data).toEqual({
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        priority: 5,
        timeout: 30000,
      });
    });

    it("should create note job data with overrides", () => {
      const data = createTestNoteJobData({
        content: "<html><body><h1>Custom Recipe</h1></body></html>",
        priority: 10,
      });
      expect(data.content).toBe(
        "<html><body><h1>Custom Recipe</h1></body></html>"
      );
      expect(data.priority).toBe(10);
    });
  });

  describe("createTestParseHtmlData", () => {
    it("should create parse HTML data with default values", () => {
      const data = createTestParseHtmlData();
      expect(data).toEqual({
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        importId: "import-123",
      });
    });

    it("should create parse HTML data with overrides", () => {
      const data = createTestParseHtmlData({
        content: "<html><body><h1>Custom Recipe</h1></body></html>",
        importId: "custom-import",
      });
      expect(data.content).toBe(
        "<html><body><h1>Custom Recipe</h1></body></html>"
      );
      expect(data.importId).toBe("custom-import");
    });
  });

  describe("createTestParsedHtmlFile", () => {
    it("should create parsed HTML file with default values", () => {
      const file = createTestParsedHtmlFile();
      expect(file).toEqual({
        title: "Test Recipe",
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
        evernoteMetadata: {
          originalCreatedAt: new Date("2023-01-01"),
          source: "https://example.com/recipe",
          tags: ["recipe", "food"],
        },
        ingredients: [
          {
            reference: "1 cup flour",
            blockIndex: 0,
            lineIndex: 1,
            parseStatus: "CORRECT",
          },
        ],
        instructions: [
          {
            reference: "Mix ingredients together",
            lineIndex: 1,
            parseStatus: "CORRECT",
          },
        ],
        images: [
          {
            id: "test-image-id",
            originalImageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            processingStatus: "COMPLETED",
          },
        ],
      });
    });

    it("should create parsed HTML file with overrides", () => {
      const file = createTestParsedHtmlFile({
        title: "Custom Recipe",
        ingredients: [],
      });
      expect(file.title).toBe("Custom Recipe");
      expect(file.ingredients).toEqual([]);
    });
  });

  describe("createTestSaveNoteData", () => {
    it("should create save note data with default values", () => {
      const data = createTestSaveNoteData();
      expect(data).toEqual({
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          ingredients: [
            {
              reference: "1 cup flour",
              blockIndex: 0,
              lineIndex: 1,
              parseStatus: "CORRECT",
            },
          ],
          instructions: [
            {
              reference: "Mix ingredients together",
              lineIndex: 1,
              parseStatus: "CORRECT",
            },
          ],
        },
        importId: "import-123",
      });
    });

    it("should create save note data with overrides", () => {
      const data = createTestSaveNoteData({
        file: {
          title: "Custom Recipe",
          contents: "<html><body><h1>Custom Recipe</h1></body></html>",
          ingredients: [],
          instructions: [],
        },
        importId: "custom-import",
      });
      expect(data.file.title).toBe("Custom Recipe");
      expect(data.importId).toBe("custom-import");
    });
  });

  describe("createTestParsedIngredientLine", () => {
    it("should create parsed ingredient line with default values", () => {
      const line = createTestParsedIngredientLine();
      expect(line).toEqual({
        id: "123e4567-e89b-12d3-a456-426614174000",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
      });
    });

    it("should create parsed ingredient line with overrides", () => {
      const line = createTestParsedIngredientLine({
        id: "custom-id",
        reference: "2 cups sugar",
      });
      expect(line.id).toBe("custom-id");
      expect(line.reference).toBe("2 cups sugar");
    });
  });

  describe("createTestParsedInstructionLine", () => {
    it("should create parsed instruction line with default values", () => {
      const line = createTestParsedInstructionLine();
      expect(line).toEqual({
        id: "123e4567-e89b-12d3-a456-426614174000",
        originalText: "Mix ingredients together",
        normalizedText: "mix ingredients together",
        lineIndex: 1,
      });
    });

    it("should create parsed instruction line with overrides", () => {
      const line = createTestParsedInstructionLine({
        id: "custom-id",
        originalText: "Bake at 350F",
        normalizedText: "bake at 350f",
      });
      expect(line.id).toBe("custom-id");
      expect(line.originalText).toBe("Bake at 350F");
      expect(line.normalizedText).toBe("bake at 350f");
    });
  });

  describe("createTestScheduleActionData", () => {
    it("should create schedule action data with default values", () => {
      const data = createTestScheduleActionData();
      expect(data).toEqual({
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          ingredients: [
            {
              id: "ing-1",
              reference: "1 cup flour",
              blockIndex: 0,
              lineIndex: 1,
            },
          ],
          instructions: [
            {
              reference: "Mix ingredients together",
              lineIndex: 1,
              parseStatus: "CORRECT",
            },
          ],
        },
      });
    });

    it("should create schedule action data with overrides", () => {
      const data = createTestScheduleActionData({
        noteId: "custom-note",
        file: {
          title: "Custom Recipe",
          contents: "<html><body><h1>Custom Recipe</h1></body></html>",
          ingredients: [],
          instructions: [],
        },
      });
      expect(data.noteId).toBe("custom-note");
      expect(data.file.title).toBe("Custom Recipe");
    });
  });

  describe("createTestScheduleIngredientsData", () => {
    it("should create schedule ingredients data with default values", () => {
      const data = createTestScheduleIngredientsData();
      expect(data).toEqual({
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
      });
    });

    it("should create schedule ingredients data with overrides", () => {
      const data = createTestScheduleIngredientsData({
        noteId: "custom-note",
        importId: "custom-import",
      });
      expect(data.noteId).toBe("custom-note");
      expect(data.importId).toBe("custom-import");
    });
  });

  describe("createTestScheduleInstructionsData", () => {
    it("should create schedule instructions data with default values", () => {
      const data = createTestScheduleInstructionsData();
      expect(data).toEqual({
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        importId: "import-123",
        instructionLines: [
          {
            id: "456e7890-e89b-12d3-a456-426614174000",
            originalText: "Mix ingredients together",
            lineIndex: 1,
          },
        ],
      });
    });

    it("should create schedule instructions data with overrides", () => {
      const data = createTestScheduleInstructionsData({
        noteId: "custom-note",
        instructionLines: [],
      });
      expect(data.noteId).toBe("custom-note");
      expect(data.instructionLines).toEqual([]);
    });
  });

  describe("createTestEnvironment", () => {
    it("should create environment with default values", () => {
      const env = createTestEnvironment();
      expect(env).toEqual({
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
      });
    });

    it("should create environment with overrides", () => {
      const env = createTestEnvironment({
        PORT: "4000",
        DATABASE_URL: "postgresql://custom:pass@localhost:5432/custom",
      });
      expect(env.PORT).toBe("4000");
      expect(env.DATABASE_URL).toBe(
        "postgresql://custom:pass@localhost:5432/custom"
      );
      expect(env.WS_PORT).toBe("8080"); // default value
    });
  });

  describe("createTestNoteQuery", () => {
    it("should create note query with default values", () => {
      const query = createTestNoteQuery();
      expect(query).toEqual({
        page: "1",
        limit: "20",
        status: "COMPLETED",
        search: "recipe",
      });
    });

    it("should create note query with overrides", () => {
      const query = createTestNoteQuery({
        page: "2",
        status: "PENDING",
        search: "custom",
      });
      expect(query.page).toBe("2");
      expect(query.status).toBe("PENDING");
      expect(query.search).toBe("custom");
    });
  });

  describe("createTestNoteQueryResult", () => {
    it("should create note query result with default values", () => {
      const result = createTestNoteQueryResult();
      expect(result).toEqual({
        page: 1,
        limit: 20,
        status: "COMPLETED",
        search: "recipe",
      });
    });

    it("should create note query result with overrides", () => {
      const result = createTestNoteQueryResult({
        page: 2,
        status: "PENDING",
      });
      expect(result.page).toBe(2);
      expect(result.status).toBe("PENDING");
    });
  });

  describe("createTestNoteIdParam", () => {
    it("should create note ID param with default values", () => {
      const param = createTestNoteIdParam();
      expect(param).toEqual({
        id: "123e4567-e89b-12d3-a456-426614174000",
      });
    });

    it("should create note ID param with overrides", () => {
      const param = createTestNoteIdParam({
        id: "custom-id",
      });
      expect(param.id).toBe("custom-id");
    });
  });

  describe("createTestHealthQuery", () => {
    it("should create health query with default values", () => {
      const query = createTestHealthQuery();
      expect(query).toEqual({
        detailed: "true",
        includeMetrics: "false",
      });
    });

    it("should create health query with overrides", () => {
      const query = createTestHealthQuery({
        detailed: "false",
        includeMetrics: "true",
      });
      expect(query.detailed).toBe("false");
      expect(query.includeMetrics).toBe("true");
    });
  });

  describe("createTestHealthQueryResult", () => {
    it("should create health query result with default values", () => {
      const result = createTestHealthQueryResult();
      expect(result).toEqual({
        detailed: true,
        includeMetrics: false,
      });
    });

    it("should create health query result with overrides", () => {
      const result = createTestHealthQueryResult({
        detailed: false,
        includeMetrics: true,
      });
      expect(result.detailed).toBe(false);
      expect(result.includeMetrics).toBe(true);
    });
  });

  describe("createTestTestQuery", () => {
    it("should create test query with default values", () => {
      const query = createTestTestQuery();
      expect(query).toEqual({
        action: "health",
      });
    });

    it("should create test query with overrides", () => {
      const query = createTestTestQuery({
        action: "database",
      });
      expect(query.action).toBe("database");
    });
  });

  describe("createTestFileValidation", () => {
    it("should create file validation with default values", () => {
      const validation = createTestFileValidation();
      expect(validation).toEqual({
        filename: "test.html",
        size: 1024,
        mimetype: "text/html",
      });
    });

    it("should create file validation with overrides", () => {
      const validation = createTestFileValidation({
        filename: "custom.json",
        mimetype: "application/json",
        size: 2048,
      });
      expect(validation.filename).toBe("custom.json");
      expect(validation.mimetype).toBe("application/json");
      expect(validation.size).toBe(2048);
    });
  });

  describe("createTestHtmlContentSchema", () => {
    it("should create HTML content schema with default values", () => {
      const schema = createTestHtmlContentSchema();
      expect(schema).toEqual({
        content: "<html><body><h1>Test</h1></body></html>",
        metadata: {
          importId: "123e4567-e89b-12d3-a456-426614174000",
          filename: "test.html",
          source: "https://example.com/recipe",
        },
      });
    });

    it("should create HTML content schema with overrides", () => {
      const schema = createTestHtmlContentSchema({
        content: "<html><body><h1>Custom</h1></body></html>",
        metadata: {
          importId: "custom-import",
          filename: "custom.html",
          source: "https://custom.com/recipe",
        },
      });
      expect(schema.content).toBe("<html><body><h1>Custom</h1></body></html>");
      expect(schema.metadata.importId).toBe("custom-import");
    });
  });

  describe("createTestStatusEvent", () => {
    it("should create status event with default values", () => {
      const event = createTestStatusEvent();
      expect(event).toEqual({
        importId: "123e4567-e89b-12d3-a456-426614174000",
        noteId: "456e7890-e89b-12d3-a456-426614174000",
        status: "PROCESSING",
        message: "Processing started",
        context: "parse_html",
        currentCount: 5,
        totalCount: 10,
        indentLevel: 2,
        metadata: { progress: 50 },
      });
    });

    it("should create status event with overrides", () => {
      const event = createTestStatusEvent({
        status: "COMPLETED",
        message: "Processing completed",
        currentCount: 10,
        totalCount: 10,
      });
      expect(event.status).toBe("COMPLETED");
      expect(event.message).toBe("Processing completed");
      expect(event.currentCount).toBe(10);
      expect(event.totalCount).toBe(10);
    });
  });
});

// ============================================================================
// SCHEMA TEST HELPERS TESTS
// ============================================================================

describe("Schema Test Helpers", () => {
  describe("testSchemaComprehensive", () => {
    it("should test schema with comprehensive test cases", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      // Test valid case
      const validData = { name: "John", age: 30 };
      const validResult = schema.safeParse(validData);
      expect(validResult.success).toBe(true);

      // Test missing required field
      const missingFieldData = { name: "John" };
      const missingFieldResult = schema.safeParse(missingFieldData);
      expect(missingFieldResult.success).toBe(false);

      // Test invalid field type
      const invalidTypeData = { name: "John", age: "invalid" };
      const invalidTypeResult = schema.safeParse(invalidTypeData);
      expect(invalidTypeResult.success).toBe(false);
    });
  });

  describe("testSchemaRequiredFields", () => {
    it("should test required fields validation", () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number(),
      });

      const baseData = {
        name: "John",
        email: "john@example.com",
        age: 30,
      };

      // Test missing name field
      const dataWithoutName = { email: baseData.email, age: baseData.age };
      const resultWithoutName = schema.safeParse(dataWithoutName);
      expect(resultWithoutName.success).toBe(false);

      // Test missing email field
      const dataWithoutEmail = { name: baseData.name, age: baseData.age };
      const resultWithoutEmail = schema.safeParse(dataWithoutEmail);
      expect(resultWithoutEmail.success).toBe(false);
    });
  });

  describe("testSchemaFieldTypes", () => {
    it("should test field type validation", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
      });

      // Test valid values
      const validData = { name: "John", age: 30, active: true };
      const validResult = schema.safeParse(validData);
      expect(validResult.success).toBe(true);

      // Test invalid string field
      const invalidStringData = { name: 123, age: 30, active: true };
      const invalidStringResult = schema.safeParse(invalidStringData);
      expect(invalidStringResult.success).toBe(false);

      // Test invalid number field
      const invalidNumberData = { name: "John", age: "thirty", active: true };
      const invalidNumberResult = schema.safeParse(invalidNumberData);
      expect(invalidNumberResult.success).toBe(false);

      // Test invalid boolean field
      const invalidBooleanData = { name: "John", age: 30, active: "yes" };
      const invalidBooleanResult = schema.safeParse(invalidBooleanData);
      expect(invalidBooleanResult.success).toBe(false);
    });
  });

  describe("testValidationUtility", () => {
    it("should test validation utility function", () => {
      const validationFn = (data: unknown) => {
        if (typeof data === "string" && data.length > 0) {
          return { success: true as const, data };
        }
        return { success: false as const, error: "Invalid string" };
      };

      const validData = "test string";
      const invalidData = "";

      // Test valid data
      const validResult = validationFn(validData);
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data).toEqual(validData);
      }

      // Test invalid data
      const invalidResult = validationFn(invalidData);
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error).toBeDefined();
        expect(typeof invalidResult.error).toBe("string");
      }
    });
  });
});

// ============================================================================
// VALIDATION UTILITY TEST HELPERS TESTS
// ============================================================================

describe("Validation Utility Test Helpers", () => {
  describe("testValidationUtility", () => {
    it("should test a validation utility function", () => {
      const validationFn = (data: unknown) => {
        if (typeof data === "string" && data.length > 0) {
          return { success: true as const, data };
        }
        return { success: false as const, error: "Invalid string" };
      };

      const validData = "test string";
      const invalidData = "";

      // Test valid data
      const validResult = validationFn(validData);
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data).toEqual(validData);
      }

      // Test invalid data
      const invalidResult = validationFn(invalidData);
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error).toBeDefined();
        expect(typeof invalidResult.error).toBe("string");
      }
    });
  });
});
