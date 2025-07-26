import { describe, expect, it } from "vitest";

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
    it("should validate valid ingredient job data", () => {
      const validData = {
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
      };

      const result = IngredientJobDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should validate minimal ingredient job data", () => {
      const minimalData = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = IngredientJobDataSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ingredientLineId).toBe("line-123");
        expect(result.data.reference).toBe("1 cup flour");
        expect(result.data.blockIndex).toBe(0);
        expect(result.data.lineIndex).toBe(1);
        expect(result.data.noteId).toBe("123e4567-e89b-12d3-a456-426614174000");
        expect(result.data.importId).toBeUndefined();
        expect(result.data.currentIngredientIndex).toBeUndefined();
        expect(result.data.totalIngredients).toBeUndefined();
        expect(result.data.options).toBeUndefined();
      }
    });

    it("should reject missing ingredientLineId", () => {
      const invalidData = {
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 0,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        currentIngredientIndex: 1,
        totalIngredients: 5,
      };

      const result = IngredientJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject empty ingredientLineId", () => {
      const invalidData = {
        ingredientLineId: "",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 0,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        currentIngredientIndex: 1,
        totalIngredients: 5,
      };

      const result = IngredientJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Ingredient line ID is required"
        );
      }
    });

    it("should reject missing reference", () => {
      const invalidData = {
        ingredientLineId: "line-123",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = IngredientJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject empty reference", () => {
      const invalidData = {
        ingredientLineId: "line-123",
        reference: "",
        blockIndex: 0,
        lineIndex: 0,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        currentIngredientIndex: 1,
        totalIngredients: 5,
      };

      const result = IngredientJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Reference text is required"
        );
      }
    });

    it("should reject negative blockIndex", () => {
      const invalidData = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: -1,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = IngredientJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Block index must be non-negative"
        );
      }
    });

    it("should reject negative lineIndex", () => {
      const invalidData = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: -1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = IngredientJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Line index must be non-negative"
        );
      }
    });

    it("should reject invalid noteId", () => {
      const invalidData = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 0,
        noteId: "invalid-uuid",
        currentIngredientIndex: 1,
        totalIngredients: 5,
      };

      const result = IngredientJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });

    it("should reject currentIngredientIndex below 1", () => {
      const invalidData = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        currentIngredientIndex: 0,
      };

      const result = IngredientJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject totalIngredients below 1", () => {
      const invalidData = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        totalIngredients: 0,
      };

      const result = IngredientJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("ProcessIngredientLineInputSchema", () => {
    it("should validate valid process ingredient line input", () => {
      const validInput = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        options: {
          strictMode: true,
          allowPartial: false,
        },
      };

      const result = ProcessIngredientLineInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it("should validate input without options", () => {
      const inputWithoutOptions = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result =
        ProcessIngredientLineInputSchema.safeParse(inputWithoutOptions);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ingredientLineId).toBe("line-123");
        expect(result.data.reference).toBe("1 cup flour");
        expect(result.data.blockIndex).toBe(0);
        expect(result.data.lineIndex).toBe(1);
        expect(result.data.noteId).toBe("123e4567-e89b-12d3-a456-426614174000");
        expect(result.data.options).toBeUndefined();
      }
    });

    it("should reject missing ingredientLineId", () => {
      const invalidInput = {
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = ProcessIngredientLineInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject missing reference", () => {
      const invalidInput = {
        ingredientLineId: "line-123",
        blockIndex: 0,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = ProcessIngredientLineInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject negative blockIndex", () => {
      const invalidInput = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: -1,
        lineIndex: 1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = ProcessIngredientLineInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Block index must be non-negative"
        );
      }
    });

    it("should reject negative lineIndex", () => {
      const invalidInput = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: -1,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = ProcessIngredientLineInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Line index must be non-negative"
        );
      }
    });

    it("should reject invalid noteId", () => {
      const invalidData = {
        ingredientLineId: "line-123",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 0,
        noteId: "invalid-uuid",
      };

      const result = ProcessIngredientLineInputSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });
  });

  describe("ProcessIngredientLineOutputSchema", () => {
    it("should validate valid process ingredient line output", () => {
      const validOutput = {
        success: true,
        parseStatus: "CORRECT" as const,
        segments: [
          {
            index: 0,
            rule: "amount_rule",
            type: "amount" as const,
            value: "1",
            processingTime: 50,
          },
          {
            index: 1,
            rule: "unit_rule",
            type: "unit" as const,
            value: "cup",
            processingTime: 30,
          },
          {
            index: 2,
            rule: "ingredient_rule",
            type: "ingredient" as const,
            value: "flour",
            processingTime: 40,
          },
        ],
        processingTime: 120,
        ingredientLineId: "line-123",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = ProcessIngredientLineOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOutput);
      }
    });

    it("should validate failed output", () => {
      const failedOutput = {
        success: false,
        parseStatus: "ERROR" as const,
        segments: [],
        errorMessage: "Failed to parse ingredient",
        processingTime: 100,
        ingredientLineId: "line-123",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = ProcessIngredientLineOutputSchema.safeParse(failedOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(failedOutput);
      }
    });

    it("should reject missing ingredientLineId", () => {
      const invalidOutput = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 100,
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = ProcessIngredientLineOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject missing noteId", () => {
      const invalidOutput = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 100,
        ingredientLineId: "line-123",
      };

      const result = ProcessIngredientLineOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject invalid noteId", () => {
      const invalidOutput = {
        success: true,
        parseStatus: "CORRECT" as const,
        processingTime: 100,
        ingredientLineId: "line-123",
        noteId: "not-a-uuid",
      };

      const result = ProcessIngredientLineOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });
  });

  describe("SaveIngredientLineInputSchema", () => {
    it("should validate valid save ingredient line input", () => {
      const validInput = {
        ingredientLineId: "line-123",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        parseResult: {
          success: true,
          parseStatus: "CORRECT" as const,
          segments: [
            {
              index: 0,
              rule: "amount_rule",
              type: "amount" as const,
              value: "1",
            },
            {
              index: 1,
              rule: "unit_rule",
              type: "unit" as const,
              value: "cup",
            },
            {
              index: 2,
              rule: "ingredient_rule",
              type: "ingredient" as const,
              value: "flour",
            },
          ],
          processingTime: 120,
        },
      };

      const result = SaveIngredientLineInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it("should reject missing ingredientLineId", () => {
      const invalidInput = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        parseResult: {
          success: true,
          parseStatus: "CORRECT" as const,
          processingTime: 100,
        },
      };

      const result = SaveIngredientLineInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject missing noteId", () => {
      const invalidInput = {
        ingredientLineId: "line-123",
        parseResult: {
          success: true,
          parseStatus: "CORRECT" as const,
          processingTime: 100,
        },
      };

      const result = SaveIngredientLineInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject invalid noteId", () => {
      const invalidInput = {
        ingredientLineId: "line-123",
        noteId: "not-a-uuid",
        parseResult: {
          success: true,
          parseStatus: "CORRECT" as const,
          processingTime: 100,
        },
      };

      const result = SaveIngredientLineInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });

    it("should reject invalid parseResult", () => {
      const invalidInput = {
        ingredientLineId: "line-123",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        parseResult: {
          success: true,
          parseStatus: "CORRECT" as const,
          processingTime: -100, // Invalid: negative processing time
        },
      };

      const result = SaveIngredientLineInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe("SaveIngredientLineOutputSchema", () => {
    it("should validate successful save ingredient line output", () => {
      const validOutput = {
        success: true,
        ingredientLineId: "line-123",
        segmentsCreated: 3,
        processingTime: 150,
      };

      const result = SaveIngredientLineOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOutput);
      }
    });

    it("should validate failed save ingredient line output", () => {
      const failedOutput = {
        success: false,
        ingredientLineId: "line-123",
        segmentsCreated: 0,
        processingTime: 50,
        errorMessage: "Database connection failed",
      };

      const result = SaveIngredientLineOutputSchema.safeParse(failedOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(failedOutput);
      }
    });

    it("should reject missing ingredientLineId", () => {
      const invalidOutput = {
        success: true,
        segmentsCreated: 3,
        processingTime: 150,
      };

      const result = SaveIngredientLineOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject empty ingredientLineId", () => {
      const invalidOutput = {
        success: true,
        ingredientLineId: "",
        segmentsCreated: 3,
        processingTime: 150,
      };

      const result = SaveIngredientLineOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Ingredient line ID is required"
        );
      }
    });

    it("should reject negative segmentsCreated", () => {
      const invalidOutput = {
        success: true,
        ingredientLineId: "line-123",
        segmentsCreated: -1,
        processingTime: 150,
      };

      const result = SaveIngredientLineOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it("should reject negative processingTime", () => {
      const invalidOutput = {
        success: true,
        ingredientLineId: "line-123",
        segmentsCreated: 3,
        processingTime: -100,
      };

      const result = SaveIngredientLineOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe("ScheduleCategorizationInputSchema", () => {
    it("should validate valid schedule categorization input", () => {
      const validInput = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        ingredientLineId: "line-123",
      };

      const result = ScheduleCategorizationInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it("should reject missing noteId", () => {
      const invalidInput = {
        ingredientLineId: "line-123",
      };

      const result = ScheduleCategorizationInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject invalid noteId", () => {
      const invalidInput = {
        noteId: "not-a-uuid",
        ingredientLineId: "line-123",
      };

      const result = ScheduleCategorizationInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });

    it("should reject missing ingredientLineId", () => {
      const invalidInput = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = ScheduleCategorizationInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject empty ingredientLineId", () => {
      const invalidInput = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        ingredientLineId: "",
      };

      const result = ScheduleCategorizationInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Ingredient line ID is required"
        );
      }
    });
  });

  describe("ScheduleCategorizationOutputSchema", () => {
    it("should validate successful schedule categorization output", () => {
      const validOutput = {
        success: true,
        categorizationJobId: "job-123",
      };

      const result = ScheduleCategorizationOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validOutput);
      }
    });

    it("should validate failed schedule categorization output", () => {
      const failedOutput = {
        success: false,
        errorMessage: "Failed to schedule categorization",
      };

      const result = ScheduleCategorizationOutputSchema.safeParse(failedOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(failedOutput);
      }
    });

    it("should validate output without optional fields", () => {
      const minimalOutput = {
        success: true,
      };

      const result =
        ScheduleCategorizationOutputSchema.safeParse(minimalOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.categorizationJobId).toBeUndefined();
        expect(result.data.errorMessage).toBeUndefined();
      }
    });
  });

  describe("IngredientValidation", () => {
    describe("validateIngredientJobData", () => {
      it("should validate valid ingredient job data", () => {
        const validData = {
          ingredientLineId: "line-123",
          reference: "1 cup flour",
          blockIndex: 0,
          lineIndex: 1,
          noteId: "123e4567-e89b-12d3-a456-426614174000",
        };

        const result =
          IngredientValidation.validateIngredientJobData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid ingredient job data", () => {
        const invalidData = {
          ingredientLineId: "",
          reference: "1 cup flour",
          blockIndex: 0,
          lineIndex: 1,
          noteId: "123e4567-e89b-12d3-a456-426614174000",
        };

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
        const validInput = {
          ingredientLineId: "line-123",
          reference: "1 cup flour",
          blockIndex: 0,
          lineIndex: 1,
          noteId: "123e4567-e89b-12d3-a456-426614174000",
        };

        const result =
          IngredientValidation.validateProcessIngredientLineInput(validInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validInput);
        }
      });

      it("should return error for invalid process ingredient line input", () => {
        const invalidInput = {
          ingredientLineId: "line-123",
          reference: "",
          blockIndex: 0,
          lineIndex: 1,
          noteId: "123e4567-e89b-12d3-a456-426614174000",
        };

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
        const validOutput = {
          success: true,
          parseStatus: "CORRECT" as const,
          processingTime: 100,
          ingredientLineId: "line-123",
          noteId: "123e4567-e89b-12d3-a456-426614174000",
        };

        const result =
          IngredientValidation.validateProcessIngredientLineOutput(validOutput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validOutput);
        }
      });

      it("should return error for invalid process ingredient line output", () => {
        const invalidOutput = {
          success: true,
          parseStatus: "CORRECT" as const,
          processingTime: -100,
          ingredientLineId: "line-123",
          noteId: "123e4567-e89b-12d3-a456-426614174000",
        };

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
        const validInput = {
          ingredientLineId: "line-123",
          noteId: "123e4567-e89b-12d3-a456-426614174000",
          parseResult: {
            success: true,
            parseStatus: "CORRECT" as const,
            processingTime: 100,
          },
        };

        const result =
          IngredientValidation.validateSaveIngredientLineInput(validInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validInput);
        }
      });

      it("should return error for invalid save ingredient line input", () => {
        const invalidInput = {
          ingredientLineId: "",
          noteId: "123e4567-e89b-12d3-a456-426614174000",
          parseResult: {
            success: true,
            parseStatus: "CORRECT" as const,
            processingTime: 100,
          },
        };

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
        const validOutput = {
          success: true,
          ingredientLineId: "line-123",
          segmentsCreated: 3,
          processingTime: 150,
        };

        const result =
          IngredientValidation.validateSaveIngredientLineOutput(validOutput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validOutput);
        }
      });

      it("should return error for invalid save ingredient line output", () => {
        const invalidOutput = {
          success: true,
          ingredientLineId: "line-123",
          segmentsCreated: -1,
          processingTime: 150,
        };

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
        const validInput = {
          noteId: "123e4567-e89b-12d3-a456-426614174000",
          ingredientLineId: "line-123",
        };

        const result =
          IngredientValidation.validateScheduleCategorizationInput(validInput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validInput);
        }
      });

      it("should return error for invalid schedule categorization input", () => {
        const invalidInput = {
          noteId: "not-a-uuid",
          ingredientLineId: "line-123",
        };

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
        const validOutput = {
          success: true,
          categorizationJobId: "job-123",
        };

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
        const invalidOutput = {
          success: "maybe", // Invalid: should be boolean
          categorizationJobId: "job-123",
        };

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
