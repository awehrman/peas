import { describe, expect, it } from "vitest";

import {
  createTestIngredientJobData,
  createTestParseResult,
  createTestProcessIngredientLineInput,
  createTestProcessIngredientLineOutput,
  createTestSaveIngredientLineInput,
  createTestSaveIngredientLineOutput,
  createTestScheduleCategorizationInput,
  createTestScheduleCategorizationOutput,
  testInvalidSchema,
  testSchemaDefaults,
  testSchemaRequiredFields,
  testValidSchema,
} from "../../test-utils/schema-test-utils";
import {
  IngredientJobDataSchema,
  IngredientValidation,
  ProcessIngredientLineInputSchema,
  ProcessIngredientLineOutputSchema,
  SaveIngredientLineInputSchema,
  SaveIngredientLineOutputSchema,
  ScheduleCategorizationInputSchema,
  ScheduleCategorizationOutputSchema,
} from "../ingredient";

describe("Ingredient Schemas", () => {
  describe("IngredientJobDataSchema", () => {
    testValidSchema(
      IngredientJobDataSchema,
      createTestIngredientJobData(),
      "valid ingredient job data with all fields"
    );

    testValidSchema(
      IngredientJobDataSchema,
      {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      },
      "minimal ingredient job data"
    );

    testSchemaRequiredFields(
      IngredientJobDataSchema,
      ["ingredientLineId", "reference", "blockIndex", "lineIndex", "noteId"],
      {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      }
    );

    testInvalidSchema(
      IngredientJobDataSchema,
      createTestIngredientJobData({ ingredientLineId: "" }),
      "Ingredient line ID is required",
      "empty ingredientLineId"
    );

    testInvalidSchema(
      IngredientJobDataSchema,
      createTestIngredientJobData({ reference: "" }),
      "Reference text is required",
      "empty reference"
    );

    testInvalidSchema(
      IngredientJobDataSchema,
      createTestIngredientJobData({ blockIndex: -1 }),
      "Block index must be non-negative",
      "negative blockIndex"
    );

    testInvalidSchema(
      IngredientJobDataSchema,
      createTestIngredientJobData({ lineIndex: -1 }),
      "Line index must be non-negative",
      "negative lineIndex"
    );

    testInvalidSchema(
      IngredientJobDataSchema,
      createTestIngredientJobData({ noteId: "invalid-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );

    testInvalidSchema(
      IngredientJobDataSchema,
      createTestIngredientJobData({ currentIngredientIndex: 0 }),
      undefined,
      "currentIngredientIndex below 1"
    );

    testInvalidSchema(
      IngredientJobDataSchema,
      createTestIngredientJobData({ totalIngredients: 0 }),
      undefined,
      "totalIngredients below 1"
    );
  });

  describe("ProcessIngredientLineInputSchema", () => {
    testValidSchema(
      ProcessIngredientLineInputSchema,
      createTestProcessIngredientLineInput(),
      "valid process ingredient line input with all fields"
    );

    testValidSchema(
      ProcessIngredientLineInputSchema,
      {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      },
      "input without options"
    );

    testSchemaRequiredFields(
      ProcessIngredientLineInputSchema,
      ["ingredientLineId", "reference", "blockIndex", "lineIndex", "noteId"],
      {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      }
    );

    testInvalidSchema(
      ProcessIngredientLineInputSchema,
      createTestProcessIngredientLineInput({ ingredientLineId: "" }),
      "Ingredient line ID is required",
      "empty ingredientLineId"
    );

    testInvalidSchema(
      ProcessIngredientLineInputSchema,
      createTestProcessIngredientLineInput({ reference: "" }),
      "Reference text is required",
      "empty reference"
    );

    testInvalidSchema(
      ProcessIngredientLineInputSchema,
      createTestProcessIngredientLineInput({ blockIndex: -1 }),
      "Block index must be non-negative",
      "negative blockIndex"
    );

    testInvalidSchema(
      ProcessIngredientLineInputSchema,
      createTestProcessIngredientLineInput({ lineIndex: -1 }),
      "Line index must be non-negative",
      "negative lineIndex"
    );

    testInvalidSchema(
      ProcessIngredientLineInputSchema,
      createTestProcessIngredientLineInput({ noteId: "invalid-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );
  });

  describe("ProcessIngredientLineOutputSchema", () => {
    testValidSchema(
      ProcessIngredientLineOutputSchema,
      createTestProcessIngredientLineOutput(),
      "valid process ingredient line output with all fields"
    );

    testValidSchema(
      ProcessIngredientLineOutputSchema,
      createTestProcessIngredientLineOutput({
        success: false,
        parseStatus: "ERROR" as const,
        segments: [],
        errorMessage: "Failed to parse ingredient",
      }),
      "failed output"
    );

    testSchemaRequiredFields(
      ProcessIngredientLineOutputSchema,
      ["ingredientLineId", "noteId"],
      {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 100,
        ingredientLineId: "line-123",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      }
    );

    testInvalidSchema(
      ProcessIngredientLineOutputSchema,
      createTestProcessIngredientLineOutput({ ingredientLineId: "" }),
      "Ingredient line ID is required",
      "empty ingredientLineId"
    );

    testInvalidSchema(
      ProcessIngredientLineOutputSchema,
      createTestProcessIngredientLineOutput({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );
  });

  describe("SaveIngredientLineInputSchema", () => {
    testValidSchema(
      SaveIngredientLineInputSchema,
      createTestSaveIngredientLineInput(),
      "valid save ingredient line input with all fields"
    );

    testSchemaRequiredFields(
      SaveIngredientLineInputSchema,
      ["ingredientLineId", "noteId", "parseResult"],
      {
        ingredientLineId: "line-123",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        parseResult: createTestParseResult(),
      }
    );

    testInvalidSchema(
      SaveIngredientLineInputSchema,
      createTestSaveIngredientLineInput({ ingredientLineId: "" }),
      "Ingredient line ID is required",
      "empty ingredientLineId"
    );

    testInvalidSchema(
      SaveIngredientLineInputSchema,
      createTestSaveIngredientLineInput({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );

    testInvalidSchema(
      SaveIngredientLineInputSchema,
      createTestSaveIngredientLineInput({
        parseResult: createTestParseResult({ processingTime: -100 }),
      }),
      undefined,
      "invalid parseResult with negative processing time"
    );
  });

  describe("SaveIngredientLineOutputSchema", () => {
    testValidSchema(
      SaveIngredientLineOutputSchema,
      createTestSaveIngredientLineOutput(),
      "successful save ingredient line output"
    );

    testValidSchema(
      SaveIngredientLineOutputSchema,
      createTestSaveIngredientLineOutput({
        success: false,
        segmentsCreated: 0,
        errorMessage: "Database connection failed",
      }),
      "failed save ingredient line output"
    );

    testSchemaRequiredFields(
      SaveIngredientLineOutputSchema,
      ["success", "ingredientLineId", "segmentsCreated", "processingTime"],
      {
        success: true,
        ingredientLineId: "line-123",
        segmentsCreated: 3,
        processingTime: 150,
      }
    );

    testInvalidSchema(
      SaveIngredientLineOutputSchema,
      createTestSaveIngredientLineOutput({ ingredientLineId: "" }),
      "Ingredient line ID is required",
      "empty ingredientLineId"
    );

    testInvalidSchema(
      SaveIngredientLineOutputSchema,
      createTestSaveIngredientLineOutput({ segmentsCreated: -1 }),
      undefined,
      "negative segmentsCreated"
    );

    testInvalidSchema(
      SaveIngredientLineOutputSchema,
      createTestSaveIngredientLineOutput({ processingTime: -100 }),
      undefined,
      "negative processingTime"
    );
  });

  describe("ScheduleCategorizationInputSchema", () => {
    testValidSchema(
      ScheduleCategorizationInputSchema,
      createTestScheduleCategorizationInput(),
      "valid schedule categorization input"
    );

    testSchemaRequiredFields(
      ScheduleCategorizationInputSchema,
      ["noteId", "ingredientLineId"],
      {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        ingredientLineId: "line-123",
      }
    );

    testInvalidSchema(
      ScheduleCategorizationInputSchema,
      createTestScheduleCategorizationInput({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );

    testInvalidSchema(
      ScheduleCategorizationInputSchema,
      createTestScheduleCategorizationInput({ ingredientLineId: "" }),
      "Ingredient line ID is required",
      "empty ingredientLineId"
    );
  });

  describe("ScheduleCategorizationOutputSchema", () => {
    testValidSchema(
      ScheduleCategorizationOutputSchema,
      createTestScheduleCategorizationOutput(),
      "successful schedule categorization output"
    );

    testValidSchema(
      ScheduleCategorizationOutputSchema,
      createTestScheduleCategorizationOutput({
        success: false,
        categorizationJobId: undefined,
        errorMessage: "Failed to schedule categorization",
      }),
      "failed schedule categorization output"
    );

    testSchemaDefaults(
      ScheduleCategorizationOutputSchema,
      { success: true },
      {},
      "output without optional fields"
    );
  });

  describe("IngredientValidation", () => {
    describe("validateIngredientJobData", () => {
      it("should validate valid ingredient job data", () => {
        const validData = createTestIngredientJobData();

        const result =
          IngredientValidation.validateIngredientJobData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid ingredient job data", () => {
        const invalidData = createTestIngredientJobData({
          ingredientLineId: "",
        });

        const result =
          IngredientValidation.validateIngredientJobData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "ingredientLineId: Ingredient line ID is required"
          );
        }
      });
    });

    describe("validateProcessIngredientLineInput", () => {
      it("should validate valid process ingredient line input", () => {
        const validInput = createTestProcessIngredientLineInput();

        const result =
          IngredientValidation.validateProcessIngredientLineInput(validInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validInput);
        }
      });

      it("should return error for invalid process ingredient line input", () => {
        const invalidInput = createTestProcessIngredientLineInput({
          reference: "",
        });

        const result =
          IngredientValidation.validateProcessIngredientLineInput(invalidInput);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "reference: Reference text is required"
          );
        }
      });
    });

    describe("validateProcessIngredientLineOutput", () => {
      it("should validate valid process ingredient line output", () => {
        const validOutput = createTestProcessIngredientLineOutput();

        const result =
          IngredientValidation.validateProcessIngredientLineOutput(validOutput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validOutput);
        }
      });

      it("should return error for invalid process ingredient line output", () => {
        const invalidOutput = createTestProcessIngredientLineOutput({
          processingTime: -100,
        });

        const result =
          IngredientValidation.validateProcessIngredientLineOutput(
            invalidOutput
          );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "processingTime: Too small: expected number to be >=0"
          );
        }
      });
    });

    describe("validateSaveIngredientLineInput", () => {
      it("should validate valid save ingredient line input", () => {
        const validInput = createTestSaveIngredientLineInput();

        const result =
          IngredientValidation.validateSaveIngredientLineInput(validInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validInput);
        }
      });

      it("should return error for invalid save ingredient line input", () => {
        const invalidInput = createTestSaveIngredientLineInput({
          ingredientLineId: "",
        });

        const result =
          IngredientValidation.validateSaveIngredientLineInput(invalidInput);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "ingredientLineId: Ingredient line ID is required"
          );
        }
      });
    });

    describe("validateSaveIngredientLineOutput", () => {
      it("should validate valid save ingredient line output", () => {
        const validOutput = createTestSaveIngredientLineOutput();

        const result =
          IngredientValidation.validateSaveIngredientLineOutput(validOutput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validOutput);
        }
      });

      it("should return error for invalid save ingredient line output", () => {
        const invalidOutput = createTestSaveIngredientLineOutput({
          segmentsCreated: -1,
        });

        const result =
          IngredientValidation.validateSaveIngredientLineOutput(invalidOutput);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "segmentsCreated: Too small: expected number to be >=0"
          );
        }
      });
    });

    describe("validateScheduleCategorizationInput", () => {
      it("should validate valid schedule categorization input", () => {
        const validInput = createTestScheduleCategorizationInput();

        const result =
          IngredientValidation.validateScheduleCategorizationInput(validInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validInput);
        }
      });

      it("should return error for invalid schedule categorization input", () => {
        const invalidInput = createTestScheduleCategorizationInput({
          noteId: "not-a-uuid",
        });

        const result =
          IngredientValidation.validateScheduleCategorizationInput(
            invalidInput
          );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "noteId: Note ID must be a valid UUID"
          );
        }
      });
    });

    describe("validateScheduleCategorizationOutput", () => {
      it("should validate valid schedule categorization output", () => {
        const validOutput = createTestScheduleCategorizationOutput();

        const result =
          IngredientValidation.validateScheduleCategorizationOutput(
            validOutput
          );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validOutput);
        }
      });

      it("should return error for invalid schedule categorization output", () => {
        const invalidOutput = createTestScheduleCategorizationOutput({
          success: "maybe" as never, // Invalid: should be boolean
        });

        const result =
          IngredientValidation.validateScheduleCategorizationOutput(
            invalidOutput
          );
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "success: Invalid input: expected boolean, received string"
          );
        }
      });
    });
  });
});
