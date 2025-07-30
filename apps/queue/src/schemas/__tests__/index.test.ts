import { beforeEach, describe, expect, it } from "vitest";

import { clearSchemaMocks, setupSchemaMocks } from "../../test-utils/schema";
import { Schemas, Validation } from "../index";

// Setup schema mocks using the utility
setupSchemaMocks();

describe("Schema Index", () => {
  beforeEach(() => {
    clearSchemaMocks();
  });

  describe("Schemas", () => {
    describe("base", () => {
      const baseSchemaNames = [
        "SourceSchema",
        "ProcessingOptionsSchema",
        "JobMetadataSchema",
        "BaseJobDataSchema",
        "StatusEventSchema",
        "ErrorContextSchema",
        "ParsedSegmentSchema",
        "ParseResultSchema",
      ];

      baseSchemaNames.forEach((schemaName) => {
        it(`should export ${schemaName} function`, async () => {
          const schemaFn =
            Schemas.base[schemaName as keyof typeof Schemas.base];
          expect(typeof schemaFn).toBe("function");

          const result = await schemaFn();
          expect(result).toBeDefined();
        });
      });
    });

    describe("note", () => {
      const noteSchemaNames = [
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
        "ProcessSourceDataSchema",
      ];

      noteSchemaNames.forEach((schemaName) => {
        it(`should export ${schemaName} function`, async () => {
          const schemaFn =
            Schemas.note[schemaName as keyof typeof Schemas.note];
          expect(typeof schemaFn).toBe("function");

          const result = await schemaFn();
          expect(result).toBeDefined();
        });
      });
    });

    describe("ingredient", () => {
      const ingredientSchemaNames = [
        "IngredientJobDataSchema",
        "ProcessIngredientLineInputSchema",
        "ProcessIngredientLineOutputSchema",
        "SaveIngredientLineInputSchema",
        "SaveIngredientLineOutputSchema",
        "ScheduleCategorizationInputSchema",
        "ScheduleCategorizationOutputSchema",
      ];

      ingredientSchemaNames.forEach((schemaName) => {
        it(`should export ${schemaName} function`, async () => {
          const schemaFn =
            Schemas.ingredient[schemaName as keyof typeof Schemas.ingredient];
          expect(typeof schemaFn).toBe("function");

          const result = await schemaFn();
          expect(result).toBeDefined();
        });
      });
    });

    describe("Schema Collections", () => {
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
          "ProcessSourceDataSchema",
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
  });

  describe("Validation", () => {
    const validationNames = [
      "BaseValidation",
      "NoteValidation",
      "IngredientValidation",
    ];

    validationNames.forEach((validationName) => {
      it(`should export ${validationName} function`, async () => {
        const validationFn =
          Validation[validationName as keyof typeof Validation];
        expect(typeof validationFn).toBe("function");

        const result = await validationFn();
        expect(result).toBeDefined();
      });
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
