import { describe, expect, it, vi } from "vitest";

import { Schemas, Validation } from "../index";

// Mock the dynamic imports
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

describe("Schema Index", () => {
  describe("Schemas", () => {
    describe("base", () => {
      it("should export SourceSchema function", async () => {
        const sourceSchemaFn = Schemas.base.SourceSchema;
        expect(typeof sourceSchemaFn).toBe("function");

        const result = await sourceSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ProcessingOptionsSchema function", async () => {
        const processingOptionsSchemaFn = Schemas.base.ProcessingOptionsSchema;
        expect(typeof processingOptionsSchemaFn).toBe("function");

        const result = await processingOptionsSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export JobMetadataSchema function", async () => {
        const jobMetadataSchemaFn = Schemas.base.JobMetadataSchema;
        expect(typeof jobMetadataSchemaFn).toBe("function");

        const result = await jobMetadataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export BaseJobDataSchema function", async () => {
        const baseJobDataSchemaFn = Schemas.base.BaseJobDataSchema;
        expect(typeof baseJobDataSchemaFn).toBe("function");

        const result = await baseJobDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export StatusEventSchema function", async () => {
        const statusEventSchemaFn = Schemas.base.StatusEventSchema;
        expect(typeof statusEventSchemaFn).toBe("function");

        const result = await statusEventSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ErrorContextSchema function", async () => {
        const errorContextSchemaFn = Schemas.base.ErrorContextSchema;
        expect(typeof errorContextSchemaFn).toBe("function");

        const result = await errorContextSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ParsedSegmentSchema function", async () => {
        const parsedSegmentSchemaFn = Schemas.base.ParsedSegmentSchema;
        expect(typeof parsedSegmentSchemaFn).toBe("function");

        const result = await parsedSegmentSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ParseResultSchema function", async () => {
        const parseResultSchemaFn = Schemas.base.ParseResultSchema;
        expect(typeof parseResultSchemaFn).toBe("function");

        const result = await parseResultSchemaFn();
        expect(result).toBeDefined();
      });
    });

    describe("note", () => {
      it("should export NoteJobDataSchema function", async () => {
        const noteJobDataSchemaFn = Schemas.note.NoteJobDataSchema;
        expect(typeof noteJobDataSchemaFn).toBe("function");

        const result = await noteJobDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ParseHtmlDataSchema function", async () => {
        const parseHtmlDataSchemaFn = Schemas.note.ParseHtmlDataSchema;
        expect(typeof parseHtmlDataSchemaFn).toBe("function");

        const result = await parseHtmlDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ParsedHtmlFileSchema function", async () => {
        const parsedHtmlFileSchemaFn = Schemas.note.ParsedHtmlFileSchema;
        expect(typeof parsedHtmlFileSchemaFn).toBe("function");

        const result = await parsedHtmlFileSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export SaveNoteDataSchema function", async () => {
        const saveNoteDataSchemaFn = Schemas.note.SaveNoteDataSchema;
        expect(typeof saveNoteDataSchemaFn).toBe("function");

        const result = await saveNoteDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export NoteSchema function", async () => {
        const noteSchemaFn = Schemas.note.NoteSchema;
        expect(typeof noteSchemaFn).toBe("function");

        const result = await noteSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ParsedIngredientLineSchema function", async () => {
        const parsedIngredientLineSchemaFn =
          Schemas.note.ParsedIngredientLineSchema;
        expect(typeof parsedIngredientLineSchemaFn).toBe("function");

        const result = await parsedIngredientLineSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ParsedInstructionLineSchema function", async () => {
        const parsedInstructionLineSchemaFn =
          Schemas.note.ParsedInstructionLineSchema;
        expect(typeof parsedInstructionLineSchemaFn).toBe("function");

        const result = await parsedInstructionLineSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ScheduleActionDataSchema function", async () => {
        const scheduleActionDataSchemaFn =
          Schemas.note.ScheduleActionDataSchema;
        expect(typeof scheduleActionDataSchemaFn).toBe("function");

        const result = await scheduleActionDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ScheduleCategorizationDataSchema function", async () => {
        const scheduleCategorizationDataSchemaFn =
          Schemas.note.ScheduleCategorizationDataSchema;
        expect(typeof scheduleCategorizationDataSchemaFn).toBe("function");

        const result = await scheduleCategorizationDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ScheduleImagesDataSchema function", async () => {
        const scheduleImagesDataSchemaFn =
          Schemas.note.ScheduleImagesDataSchema;
        expect(typeof scheduleImagesDataSchemaFn).toBe("function");

        const result = await scheduleImagesDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ScheduleIngredientsDataSchema function", async () => {
        const scheduleIngredientsDataSchemaFn =
          Schemas.note.ScheduleIngredientsDataSchema;
        expect(typeof scheduleIngredientsDataSchemaFn).toBe("function");

        const result = await scheduleIngredientsDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ScheduleInstructionsDataSchema function", async () => {
        const scheduleInstructionsDataSchemaFn =
          Schemas.note.ScheduleInstructionsDataSchema;
        expect(typeof scheduleInstructionsDataSchemaFn).toBe("function");

        const result = await scheduleInstructionsDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ScheduleSourceDataSchema function", async () => {
        const scheduleSourceDataSchemaFn =
          Schemas.note.ScheduleSourceDataSchema;
        expect(typeof scheduleSourceDataSchemaFn).toBe("function");

        const result = await scheduleSourceDataSchemaFn();
        expect(result).toBeDefined();
      });
    });

    describe("ingredient", () => {
      it("should export IngredientJobDataSchema function", async () => {
        const ingredientJobDataSchemaFn =
          Schemas.ingredient.IngredientJobDataSchema;
        expect(typeof ingredientJobDataSchemaFn).toBe("function");

        const result = await ingredientJobDataSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ProcessIngredientLineInputSchema function", async () => {
        const processIngredientLineInputSchemaFn =
          Schemas.ingredient.ProcessIngredientLineInputSchema;
        expect(typeof processIngredientLineInputSchemaFn).toBe("function");

        const result = await processIngredientLineInputSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ProcessIngredientLineOutputSchema function", async () => {
        const processIngredientLineOutputSchemaFn =
          Schemas.ingredient.ProcessIngredientLineOutputSchema;
        expect(typeof processIngredientLineOutputSchemaFn).toBe("function");

        const result = await processIngredientLineOutputSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export SaveIngredientLineInputSchema function", async () => {
        const saveIngredientLineInputSchemaFn =
          Schemas.ingredient.SaveIngredientLineInputSchema;
        expect(typeof saveIngredientLineInputSchemaFn).toBe("function");

        const result = await saveIngredientLineInputSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export SaveIngredientLineOutputSchema function", async () => {
        const saveIngredientLineOutputSchemaFn =
          Schemas.ingredient.SaveIngredientLineOutputSchema;
        expect(typeof saveIngredientLineOutputSchemaFn).toBe("function");

        const result = await saveIngredientLineOutputSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ScheduleCategorizationInputSchema function", async () => {
        const scheduleCategorizationInputSchemaFn =
          Schemas.ingredient.ScheduleCategorizationInputSchema;
        expect(typeof scheduleCategorizationInputSchemaFn).toBe("function");

        const result = await scheduleCategorizationInputSchemaFn();
        expect(result).toBeDefined();
      });

      it("should export ScheduleCategorizationOutputSchema function", async () => {
        const scheduleCategorizationOutputSchemaFn =
          Schemas.ingredient.ScheduleCategorizationOutputSchema;
        expect(typeof scheduleCategorizationOutputSchemaFn).toBe("function");

        const result = await scheduleCategorizationOutputSchemaFn();
        expect(result).toBeDefined();
      });
    });

    it("should have all expected base schema functions", () => {
      const expectedBaseSchemas = [
        "SourceSchema",
        "ProcessingOptionsSchema",
        "JobMetadataSchema",
        "BaseJobDataSchema",
        "StatusEventSchema",
        "ErrorContextSchema",
        "ParsedSegmentSchema",
        "ParseResultSchema",
      ];

      expectedBaseSchemas.forEach((schemaName) => {
        expect(Schemas.base).toHaveProperty(schemaName);
        expect(
          typeof Schemas.base[schemaName as keyof typeof Schemas.base]
        ).toBe("function");
      });
    });

    it("should have all expected note schema functions", () => {
      const expectedNoteSchemas = [
        "NoteJobDataSchema",
        "ParseHtmlDataSchema",
        "ParsedHtmlFileSchema",
        "SaveNoteDataSchema",
        "NoteSchema",
        "ParsedIngredientLineSchema",
        "ParsedInstructionLineSchema",
        "ScheduleActionDataSchema",
        "ScheduleCategorizationDataSchema",
        "ScheduleImagesDataSchema",
        "ScheduleIngredientsDataSchema",
        "ScheduleInstructionsDataSchema",
        "ScheduleSourceDataSchema",
      ];

      expectedNoteSchemas.forEach((schemaName) => {
        expect(Schemas.note).toHaveProperty(schemaName);
        expect(
          typeof Schemas.note[schemaName as keyof typeof Schemas.note]
        ).toBe("function");
      });
    });

    it("should have all expected ingredient schema functions", () => {
      const expectedIngredientSchemas = [
        "IngredientJobDataSchema",
        "ProcessIngredientLineInputSchema",
        "ProcessIngredientLineOutputSchema",
        "SaveIngredientLineInputSchema",
        "SaveIngredientLineOutputSchema",
        "ScheduleCategorizationInputSchema",
        "ScheduleCategorizationOutputSchema",
      ];

      expectedIngredientSchemas.forEach((schemaName) => {
        expect(Schemas.ingredient).toHaveProperty(schemaName);
        expect(
          typeof Schemas.ingredient[
            schemaName as keyof typeof Schemas.ingredient
          ]
        ).toBe("function");
      });
    });
  });

  describe("Validation", () => {
    it("should export BaseValidation function", async () => {
      const baseValidationFn = Validation.BaseValidation;
      expect(typeof baseValidationFn).toBe("function");

      const result = await baseValidationFn();
      expect(result).toBeDefined();
    });

    it("should export NoteValidation function", async () => {
      const noteValidationFn = Validation.NoteValidation;
      expect(typeof noteValidationFn).toBe("function");

      const result = await noteValidationFn();
      expect(result).toBeDefined();
    });

    it("should export IngredientValidation function", async () => {
      const ingredientValidationFn = Validation.IngredientValidation;
      expect(typeof ingredientValidationFn).toBe("function");

      const result = await ingredientValidationFn();
      expect(result).toBeDefined();
    });

    it("should have all expected validation functions", () => {
      const expectedValidations = [
        "BaseValidation",
        "NoteValidation",
        "IngredientValidation",
      ];

      expectedValidations.forEach((validationName) => {
        expect(Validation).toHaveProperty(validationName);
        expect(
          typeof Validation[validationName as keyof typeof Validation]
        ).toBe("function");
      });
    });
  });

  describe("Structure", () => {
    it("should export Schemas object with correct structure", () => {
      expect(Schemas).toBeDefined();
      expect(typeof Schemas).toBe("object");
      expect(Schemas).toHaveProperty("base");
      expect(Schemas).toHaveProperty("note");
      expect(Schemas).toHaveProperty("ingredient");
    });

    it("should export Validation object with correct structure", () => {
      expect(Validation).toBeDefined();
      expect(typeof Validation).toBe("object");
      expect(Validation).toHaveProperty("BaseValidation");
      expect(Validation).toHaveProperty("NoteValidation");
      expect(Validation).toHaveProperty("IngredientValidation");
    });

    it("should have base schemas as functions that return promises", async () => {
      const baseSchemaNames = Object.keys(Schemas.base);

      for (const schemaName of baseSchemaNames) {
        const schemaFn = Schemas.base[schemaName as keyof typeof Schemas.base];
        expect(typeof schemaFn).toBe("function");

        const result = await schemaFn();
        expect(result).toBeDefined();
      }
    });

    it("should have note schemas as functions that return promises", async () => {
      const noteSchemaNames = Object.keys(Schemas.note);

      for (const schemaName of noteSchemaNames) {
        const schemaFn = Schemas.note[schemaName as keyof typeof Schemas.note];
        expect(typeof schemaFn).toBe("function");

        const result = await schemaFn();
        expect(result).toBeDefined();
      }
    });

    it("should have ingredient schemas as functions that return promises", async () => {
      const ingredientSchemaNames = Object.keys(Schemas.ingredient);

      for (const schemaName of ingredientSchemaNames) {
        const schemaFn =
          Schemas.ingredient[schemaName as keyof typeof Schemas.ingredient];
        expect(typeof schemaFn).toBe("function");

        const result = await schemaFn();
        expect(result).toBeDefined();
      }
    });

    it("should have validation functions that return promises", async () => {
      const validationNames = Object.keys(Validation);

      for (const validationName of validationNames) {
        const validationFn =
          Validation[validationName as keyof typeof Validation];
        expect(typeof validationFn).toBe("function");

        const result = await validationFn();
        expect(result).toBeDefined();
      }
    });
  });
});
