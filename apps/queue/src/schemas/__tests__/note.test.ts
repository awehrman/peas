import { describe, expect, it } from "vitest";

import {
  createTestNoteJobData,
  createTestParseHtmlData,
  createTestParsedHtmlFile,
  createTestParsedIngredientLine,
  createTestParsedInstructionLine,
  createTestSaveNoteData,
  createTestScheduleActionData,
  createTestScheduleIngredientsData,
  createTestScheduleInstructionsData,
  testInvalidSchema,
  testSchemaDefaults,
  testSchemaRequiredFields,
  testValidSchema,
} from "../../test-utils/schema";
import {
  NoteJobDataSchema,
  NoteValidation,
  ParseHtmlDataSchema,
  ParsedHtmlFileSchema,
  ParsedIngredientLineSchema,
  ParsedInstructionLineSchema,
  ProcessSourceDataSchema,
  SaveNoteDataSchema,
  ScheduleActionDataSchema,
  ScheduleCategorizationDataSchema,
  ScheduleImagesDataSchema,
  ScheduleIngredientsDataSchema,
  ScheduleInstructionsDataSchema,
} from "../note";

describe("Note Schemas", () => {
  describe("NoteJobDataSchema", () => {
    testValidSchema(
      NoteJobDataSchema,
      createTestNoteJobData(),
      "valid note job data with all fields"
    );

    testValidSchema(
      NoteJobDataSchema,
      {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
      },
      "minimal note job data"
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

    testInvalidSchema(
      NoteJobDataSchema,
      createTestNoteJobData({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );

    testInvalidSchema(
      NoteJobDataSchema,
      createTestNoteJobData({ priority: 0 }),
      "Priority must be between 1 and 10",
      "priority below 1"
    );

    testInvalidSchema(
      NoteJobDataSchema,
      createTestNoteJobData({ priority: 11 }),
      "Priority must be between 1 and 10",
      "priority above 10"
    );

    testInvalidSchema(
      NoteJobDataSchema,
      createTestNoteJobData({ timeout: -1000 }),
      "Timeout must be a positive integer",
      "negative timeout"
    );

    testInvalidSchema(
      NoteJobDataSchema,
      createTestNoteJobData({ timeout: 0 }),
      "Timeout must be a positive integer",
      "zero timeout"
    );
  });

  describe("ParseHtmlDataSchema", () => {
    testValidSchema(
      ParseHtmlDataSchema,
      createTestParseHtmlData(),
      "valid parse HTML data with all fields"
    );

    testValidSchema(
      ParseHtmlDataSchema,
      {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
      },
      "data without importId"
    );

    testSchemaRequiredFields(ParseHtmlDataSchema, ["content"], {
      content: "<html><body><h1>Test Recipe</h1></body></html>",
    });

    testInvalidSchema(
      ParseHtmlDataSchema,
      createTestParseHtmlData({ content: "" }),
      "Content cannot be empty",
      "empty content"
    );
  });

  describe("ParsedHtmlFileSchema", () => {
    testValidSchema(
      ParsedHtmlFileSchema,
      createTestParsedHtmlFile(),
      "valid parsed HTML file with all fields"
    );

    testValidSchema(
      ParsedHtmlFileSchema,
      {
        title: "Test Recipe",
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
        ingredients: [],
        instructions: [],
      },
      "minimal parsed HTML file"
    );

    testSchemaDefaults(
      ParsedHtmlFileSchema,
      {
        title: "Test Recipe",
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
      },
      {
        ingredients: [],
        instructions: [],
      },
      "minimal file with defaults"
    );

    testSchemaRequiredFields(ParsedHtmlFileSchema, ["title", "contents"], {
      title: "Test Recipe",
      contents: "<html><body><h1>Test Recipe</h1></body></html>",
    });

    testInvalidSchema(
      ParsedHtmlFileSchema,
      createTestParsedHtmlFile({ title: "" }),
      "Title is required",
      "empty title"
    );

    testInvalidSchema(
      ParsedHtmlFileSchema,
      createTestParsedHtmlFile({ contents: "" }),
      "Contents are required",
      "empty contents"
    );
  });

  describe("SaveNoteDataSchema", () => {
    testValidSchema(
      SaveNoteDataSchema,
      createTestSaveNoteData(),
      "valid save note data with all fields"
    );

    testValidSchema(
      SaveNoteDataSchema,
      {
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          ingredients: [],
          instructions: [],
        },
      },
      "data without importId"
    );

    testSchemaRequiredFields(SaveNoteDataSchema, ["file"], {
      file: {
        title: "Test Recipe",
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
        ingredients: [],
        instructions: [],
      },
    });

    testInvalidSchema(
      SaveNoteDataSchema,
      createTestSaveNoteData({
        file: {
          title: "",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          ingredients: [],
          instructions: [],
        },
      }),
      undefined,
      "invalid file with empty title"
    );
  });

  describe("ParsedIngredientLineSchema", () => {
    testValidSchema(
      ParsedIngredientLineSchema,
      createTestParsedIngredientLine(),
      "valid parsed ingredient line"
    );

    testSchemaRequiredFields(
      ParsedIngredientLineSchema,
      ["id", "reference", "blockIndex", "lineIndex"],
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
      }
    );

    testInvalidSchema(
      ParsedIngredientLineSchema,
      createTestParsedIngredientLine({ id: "not-a-uuid" }),
      undefined,
      "invalid id"
    );

    testInvalidSchema(
      ParsedIngredientLineSchema,
      createTestParsedIngredientLine({ blockIndex: -1 }),
      undefined,
      "negative blockIndex"
    );

    testInvalidSchema(
      ParsedIngredientLineSchema,
      createTestParsedIngredientLine({ lineIndex: -1 }),
      undefined,
      "negative lineIndex"
    );
  });

  describe("ParsedInstructionLineSchema", () => {
    testValidSchema(
      ParsedInstructionLineSchema,
      createTestParsedInstructionLine(),
      "valid parsed instruction line with all fields"
    );

    testValidSchema(
      ParsedInstructionLineSchema,
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        originalText: "Mix ingredients together",
        lineIndex: 1,
      },
      "line without normalizedText"
    );

    testSchemaRequiredFields(
      ParsedInstructionLineSchema,
      ["id", "originalText", "lineIndex"],
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        originalText: "Mix ingredients together",
        lineIndex: 1,
      }
    );

    testInvalidSchema(
      ParsedInstructionLineSchema,
      createTestParsedInstructionLine({ id: "not-a-uuid" }),
      undefined,
      "invalid id"
    );

    testInvalidSchema(
      ParsedInstructionLineSchema,
      createTestParsedInstructionLine({ lineIndex: -1 }),
      undefined,
      "negative lineIndex"
    );
  });

  describe("ScheduleActionDataSchema", () => {
    testValidSchema(
      ScheduleActionDataSchema,
      createTestScheduleActionData(),
      "valid schedule action data"
    );

    testSchemaRequiredFields(ScheduleActionDataSchema, ["noteId", "file"], {
      noteId: "123e4567-e89b-12d3-a456-426614174000",
      file: {
        title: "Test Recipe",
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
        ingredients: [],
        instructions: [],
      },
    });

    testInvalidSchema(
      ScheduleActionDataSchema,
      createTestScheduleActionData({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );

    testInvalidSchema(
      ScheduleActionDataSchema,
      createTestScheduleActionData({
        file: {
          title: "",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          ingredients: [],
          instructions: [],
        },
      }),
      undefined,
      "invalid file with empty title"
    );
  });

  describe("ScheduleCategorizationDataSchema", () => {
    testValidSchema(
      ScheduleCategorizationDataSchema,
      createTestScheduleActionData(),
      "valid schedule categorization data"
    );

    testInvalidSchema(
      ScheduleCategorizationDataSchema,
      createTestScheduleActionData({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );
  });

  describe("ScheduleImagesDataSchema", () => {
    testValidSchema(
      ScheduleImagesDataSchema,
      createTestScheduleActionData(),
      "valid schedule images data"
    );

    testInvalidSchema(
      ScheduleImagesDataSchema,
      createTestScheduleActionData({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );
  });

  describe("ScheduleIngredientsDataSchema", () => {
    testValidSchema(
      ScheduleIngredientsDataSchema,
      createTestScheduleIngredientsData(),
      "valid schedule ingredients data with all fields"
    );

    testValidSchema(
      ScheduleIngredientsDataSchema,
      {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      },
      "data without optional fields"
    );

    testSchemaRequiredFields(ScheduleIngredientsDataSchema, ["noteId"], {
      noteId: "123e4567-e89b-12d3-a456-426614174000",
    });

    testInvalidSchema(
      ScheduleIngredientsDataSchema,
      createTestScheduleIngredientsData({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );

    testInvalidSchema(
      ScheduleIngredientsDataSchema,
      createTestScheduleIngredientsData({
        note: {
          id: "not-a-uuid",
          title: "Test Recipe",
          parsedIngredientLines: [],
        },
      }),
      undefined,
      "invalid note.id"
    );
  });

  describe("ScheduleInstructionsDataSchema", () => {
    testValidSchema(
      ScheduleInstructionsDataSchema,
      createTestScheduleInstructionsData(),
      "valid schedule instructions data with all fields"
    );

    testValidSchema(
      ScheduleInstructionsDataSchema,
      {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      },
      "data without optional fields"
    );

    testSchemaRequiredFields(ScheduleInstructionsDataSchema, ["noteId"], {
      noteId: "123e4567-e89b-12d3-a456-426614174000",
    });

    testInvalidSchema(
      ScheduleInstructionsDataSchema,
      createTestScheduleInstructionsData({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );

    testInvalidSchema(
      ScheduleInstructionsDataSchema,
      createTestScheduleInstructionsData({
        instructionLines: [
          {
            id: "not-a-uuid",
            originalText: "Mix ingredients together",
            lineIndex: 1,
          },
        ],
      }),
      undefined,
      "invalid instructionLines with invalid UUID"
    );
  });

  describe("ProcessSourceDataSchema", () => {
    testValidSchema(
      ProcessSourceDataSchema,
      createTestScheduleActionData(),
      "valid process source data"
    );

    testInvalidSchema(
      ProcessSourceDataSchema,
      createTestScheduleActionData({ noteId: "not-a-uuid" }),
      "Note ID must be a valid UUID",
      "invalid noteId"
    );
  });

  describe("NoteValidation", () => {
    describe("validateNoteJobData", () => {
      it("should validate valid note job data", () => {
        const validData = createTestNoteJobData();

        const result = NoteValidation.validateNoteJobData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid note job data", () => {
        const invalidData = createTestNoteJobData({ content: "" });

        const result = NoteValidation.validateNoteJobData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("content: Content cannot be empty");
        }
      });
    });

    describe("validateParseHtmlData", () => {
      it("should validate valid parse HTML data", () => {
        const validData = createTestParseHtmlData();

        const result = NoteValidation.validateParseHtmlData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid parse HTML data", () => {
        const invalidData = createTestParseHtmlData({ content: "" });

        const result = NoteValidation.validateParseHtmlData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("content: Content cannot be empty");
        }
      });
    });

    describe("validateSaveNoteData", () => {
      it("should validate valid save note data", () => {
        const validData = createTestSaveNoteData();

        const result = NoteValidation.validateSaveNoteData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid save note data", () => {
        const invalidData = createTestSaveNoteData({
          file: {
            title: "",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
            ingredients: [],
            instructions: [],
          },
        });

        const result = NoteValidation.validateSaveNoteData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("file.title: Title is required");
        }
      });
    });

    describe("validateScheduleActionData", () => {
      it("should validate valid schedule action data", () => {
        const validData = createTestScheduleActionData();

        const result = NoteValidation.validateScheduleActionData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule action data", () => {
        const invalidData = createTestScheduleActionData({
          noteId: "not-a-uuid",
        });

        const result = NoteValidation.validateScheduleActionData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "noteId: Note ID must be a valid UUID"
          );
        }
      });
    });

    describe("validateScheduleCategorizationData", () => {
      it("should validate valid schedule categorization data", () => {
        const validData = createTestScheduleActionData();

        const result =
          NoteValidation.validateScheduleCategorizationData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule categorization data", () => {
        const invalidData = createTestScheduleActionData({
          noteId: "not-a-uuid",
        });

        const result =
          NoteValidation.validateScheduleCategorizationData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "noteId: Note ID must be a valid UUID"
          );
        }
      });
    });

    describe("validateScheduleImagesData", () => {
      it("should validate valid schedule images data", () => {
        const validData = createTestScheduleActionData();

        const result = NoteValidation.validateScheduleImagesData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule images data", () => {
        const invalidData = createTestScheduleActionData({
          noteId: "not-a-uuid",
        });

        const result = NoteValidation.validateScheduleImagesData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "noteId: Note ID must be a valid UUID"
          );
        }
      });
    });

    describe("validateScheduleIngredientsData", () => {
      it("should validate valid schedule ingredients data", () => {
        const validData = createTestScheduleIngredientsData();

        const result =
          NoteValidation.validateScheduleIngredientsData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule ingredients data", () => {
        const invalidData = createTestScheduleIngredientsData({
          noteId: "not-a-uuid",
        });

        const result =
          NoteValidation.validateScheduleIngredientsData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "noteId: Note ID must be a valid UUID"
          );
        }
      });
    });

    describe("validateScheduleInstructionsData", () => {
      it("should validate valid schedule instructions data", () => {
        const validData = createTestScheduleInstructionsData();

        const result =
          NoteValidation.validateScheduleInstructionsData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule instructions data", () => {
        const invalidData = createTestScheduleInstructionsData({
          noteId: "not-a-uuid",
        });

        const result =
          NoteValidation.validateScheduleInstructionsData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "noteId: Note ID must be a valid UUID"
          );
        }
      });
    });

    describe("validateProcessSourceData", () => {
      it("should validate valid process source data", () => {
        const validData = createTestScheduleActionData();

        const result = NoteValidation.validateProcessSourceData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid process source data", () => {
        const invalidData = createTestScheduleActionData({
          noteId: "not-a-uuid",
        });

        const result = NoteValidation.validateProcessSourceData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain(
            "noteId: Note ID must be a valid UUID"
          );
        }
      });
    });
  });
});
