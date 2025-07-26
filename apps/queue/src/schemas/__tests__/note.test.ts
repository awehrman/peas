import { describe, expect, it } from "vitest";

import {
  NoteJobDataSchema,
  NoteValidation,
  ParseHtmlDataSchema,
  ParsedHtmlFileSchema,
  ParsedIngredientLineSchema,
  ParsedInstructionLineSchema,
  SaveNoteDataSchema,
  ScheduleActionDataSchema,
  ScheduleCategorizationDataSchema,
  ScheduleImagesDataSchema,
  ScheduleIngredientsDataSchema,
  ScheduleInstructionsDataSchema,
  ScheduleSourceDataSchema,
} from "../note";

describe("Note Schemas", () => {
  describe("NoteJobDataSchema", () => {
    it("should validate valid note job data", () => {
      const validData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        priority: 5,
        timeout: 30000,
      };

      const result = NoteJobDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should validate minimal note job data", () => {
      const minimalData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
      };

      const result = NoteJobDataSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(minimalData.content);
        expect(result.data.noteId).toBeUndefined();
        expect(result.data.priority).toBeUndefined();
        expect(result.data.timeout).toBeUndefined();
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

    it("should reject invalid noteId", () => {
      const invalidData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        noteId: "not-a-uuid",
      };

      const result = NoteJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });

    it("should reject priority below 1", () => {
      const invalidData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        priority: 0,
      };

      const result = NoteJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Priority must be between 1 and 10"
        );
      }
    });

    it("should reject priority above 10", () => {
      const invalidData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        priority: 11,
      };

      const result = NoteJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Priority must be between 1 and 10"
        );
      }
    });

    it("should reject negative timeout", () => {
      const invalidData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        timeout: -1000,
      };

      const result = NoteJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Timeout must be a positive integer"
        );
      }
    });

    it("should reject zero timeout", () => {
      const invalidData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        timeout: 0,
      };

      const result = NoteJobDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Timeout must be a positive integer"
        );
      }
    });
  });

  describe("ParseHtmlDataSchema", () => {
    it("should validate valid parse HTML data", () => {
      const validData = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
        importId: "import-123",
      };

      const result = ParseHtmlDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should validate data without importId", () => {
      const dataWithoutImportId = {
        content: "<html><body><h1>Test Recipe</h1></body></html>",
      };

      const result = ParseHtmlDataSchema.safeParse(dataWithoutImportId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe(dataWithoutImportId.content);
        expect(result.data.importId).toBeUndefined();
      }
    });

    it("should reject empty content", () => {
      const invalidData = {
        content: "",
      };

      const result = ParseHtmlDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Content cannot be empty");
      }
    });

    it("should reject missing content", () => {
      const invalidData = {};

      const result = ParseHtmlDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });
  });

  describe("ParsedHtmlFileSchema", () => {
    it("should validate valid parsed HTML file", () => {
      const validFile = {
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
      };

      const result = ParsedHtmlFileSchema.safeParse(validFile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validFile);
      }
    });

    it("should validate minimal parsed HTML file", () => {
      const minimalFile = {
        title: "Test Recipe",
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
      };

      const result = ParsedHtmlFileSchema.safeParse(minimalFile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Test Recipe");
        expect(result.data.contents).toBe(
          "<html><body><h1>Test Recipe</h1></body></html>"
        );
        expect(result.data.tags).toEqual([]);
        expect(result.data.ingredients).toEqual([]);
        expect(result.data.instructions).toEqual([]);
        expect(result.data.source).toBeUndefined();
        expect(result.data.sourceUrl).toBeUndefined();
        expect(result.data.sourceApplication).toBeUndefined();
        expect(result.data.created).toBeUndefined();
        expect(result.data.historicalCreatedAt).toBeUndefined();
        expect(result.data.image).toBeUndefined();
        expect(result.data.images).toBeUndefined();
        expect(result.data.metadata).toBeUndefined();
      }
    });

    it("should reject empty title", () => {
      const invalidFile = {
        title: "",
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
      };

      const result = ParsedHtmlFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Title is required");
      }
    });

    it("should reject missing title", () => {
      const invalidFile = {
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
      };

      const result = ParsedHtmlFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject empty contents", () => {
      const invalidFile = {
        title: "Test Recipe",
        contents: "",
      };

      const result = ParsedHtmlFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe("Contents are required");
      }
    });

    it("should reject missing contents", () => {
      const invalidFile = {
        title: "Test Recipe",
      };

      const result = ParsedHtmlFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject invalid sourceUrl", () => {
      const invalidFile = {
        title: "Test Recipe",
        contents: "<html><body><h1>Test Recipe</h1></body></html>",
        sourceUrl: "not-a-url",
      };

      const result = ParsedHtmlFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid source URL format"
        );
      }
    });
  });

  describe("SaveNoteDataSchema", () => {
    it("should validate valid save note data", () => {
      const validData = {
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          tags: [],
          ingredients: [],
          instructions: [],
        },
        importId: "import-123",
      };

      const result = SaveNoteDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should validate data without importId", () => {
      const dataWithoutImportId = {
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          tags: [],
          ingredients: [],
          instructions: [],
        },
      };

      const result = SaveNoteDataSchema.safeParse(dataWithoutImportId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.file).toEqual(dataWithoutImportId.file);
        expect(result.data.importId).toBeUndefined();
      }
    });

    it("should reject missing file", () => {
      const invalidData = {
        importId: "import-123",
      };

      const result = SaveNoteDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid file", () => {
      const invalidData = {
        file: {
          title: "", // Invalid: empty title
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
        },
        importId: "import-123",
      };

      const result = SaveNoteDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("ParsedIngredientLineSchema", () => {
    it("should validate valid parsed ingredient line", () => {
      const validLine = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
      };

      const result = ParsedIngredientLineSchema.safeParse(validLine);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validLine);
      }
    });

    it("should reject invalid id", () => {
      const invalidLine = {
        id: "not-a-uuid",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: 1,
      };

      const result = ParsedIngredientLineSchema.safeParse(invalidLine);
      expect(result.success).toBe(false);
    });

    it("should reject negative blockIndex", () => {
      const invalidLine = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        reference: "1 cup flour",
        blockIndex: -1,
        lineIndex: 1,
      };

      const result = ParsedIngredientLineSchema.safeParse(invalidLine);
      expect(result.success).toBe(false);
    });

    it("should reject negative lineIndex", () => {
      const invalidLine = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        reference: "1 cup flour",
        blockIndex: 0,
        lineIndex: -1,
      };

      const result = ParsedIngredientLineSchema.safeParse(invalidLine);
      expect(result.success).toBe(false);
    });
  });

  describe("ParsedInstructionLineSchema", () => {
    it("should validate valid parsed instruction line", () => {
      const validLine = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        originalText: "Mix ingredients together",
        normalizedText: "mix ingredients together",
        lineIndex: 1,
      };

      const result = ParsedInstructionLineSchema.safeParse(validLine);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validLine);
      }
    });

    it("should validate line without normalizedText", () => {
      const lineWithoutNormalized = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        originalText: "Mix ingredients together",
        lineIndex: 1,
      };

      const result = ParsedInstructionLineSchema.safeParse(
        lineWithoutNormalized
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.originalText).toBe("Mix ingredients together");
        expect(result.data.normalizedText).toBeUndefined();
        expect(result.data.lineIndex).toBe(1);
      }
    });

    it("should reject invalid id", () => {
      const invalidLine = {
        id: "not-a-uuid",
        originalText: "Mix ingredients together",
        lineIndex: 1,
      };

      const result = ParsedInstructionLineSchema.safeParse(invalidLine);
      expect(result.success).toBe(false);
    });

    it("should reject negative lineIndex", () => {
      const invalidLine = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        originalText: "Mix ingredients together",
        lineIndex: -1,
      };

      const result = ParsedInstructionLineSchema.safeParse(invalidLine);
      expect(result.success).toBe(false);
    });
  });

  describe("ScheduleActionDataSchema", () => {
    it("should validate valid schedule action data", () => {
      const validData = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          tags: [],
          ingredients: [],
          instructions: [],
        },
      };

      const result = ScheduleActionDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should reject invalid noteId", () => {
      const invalidData = {
        noteId: "not-a-uuid",
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
        },
      };

      const result = ScheduleActionDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });

    it("should reject missing noteId", () => {
      const invalidData = {
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
        },
      };

      const result = ScheduleActionDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject missing file", () => {
      const invalidData = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = ScheduleActionDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid file", () => {
      const invalidData = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        file: {
          title: "", // Invalid: empty title
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
        },
      };

      const result = ScheduleActionDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("ScheduleCategorizationDataSchema", () => {
    it("should validate valid schedule categorization data", () => {
      const validData = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          tags: [],
          ingredients: [],
          instructions: [],
        },
      };

      const result = ScheduleCategorizationDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should reject invalid noteId", () => {
      const invalidData = {
        noteId: "not-a-uuid",
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
        },
      };

      const result = ScheduleCategorizationDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });
  });

  describe("ScheduleImagesDataSchema", () => {
    it("should validate valid schedule images data", () => {
      const validData = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          tags: [],
          ingredients: [],
          instructions: [],
        },
      };

      const result = ScheduleImagesDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should reject invalid noteId", () => {
      const invalidData = {
        noteId: "not-a-uuid",
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
        },
      };

      const result = ScheduleImagesDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });
  });

  describe("ScheduleIngredientsDataSchema", () => {
    it("should validate valid schedule ingredients data", () => {
      const validData = {
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
      };

      const result = ScheduleIngredientsDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should validate data without optional fields", () => {
      const dataWithoutOptional = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result =
        ScheduleIngredientsDataSchema.safeParse(dataWithoutOptional);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.noteId).toBe("123e4567-e89b-12d3-a456-426614174000");
        expect(result.data.importId).toBeUndefined();
        expect(result.data.note).toBeUndefined();
      }
    });

    it("should reject invalid noteId", () => {
      const invalidData = {
        noteId: "not-a-uuid",
      };

      const result = ScheduleIngredientsDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });

    it("should reject missing noteId", () => {
      const invalidData = {};

      const result = ScheduleIngredientsDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject invalid note.id", () => {
      const invalidData = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        note: {
          id: "not-a-uuid",
          title: "Test Recipe",
        },
      };

      const result = ScheduleIngredientsDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("ScheduleInstructionsDataSchema", () => {
    it("should validate valid schedule instructions data", () => {
      const validData = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        importId: "import-123",
        instructionLines: [
          {
            id: "456e7890-e89b-12d3-a456-426614174000",
            originalText: "Mix ingredients together",
            lineIndex: 1,
          },
        ],
      };

      const result = ScheduleInstructionsDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should validate data without optional fields", () => {
      const dataWithoutOptional = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result =
        ScheduleInstructionsDataSchema.safeParse(dataWithoutOptional);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.noteId).toBe("123e4567-e89b-12d3-a456-426614174000");
        expect(result.data.importId).toBeUndefined();
        expect(result.data.instructionLines).toBeUndefined();
      }
    });

    it("should reject invalid noteId", () => {
      const invalidData = {
        noteId: "not-a-uuid",
      };

      const result = ScheduleInstructionsDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });

    it("should reject missing noteId", () => {
      const invalidData = {};

      const result = ScheduleInstructionsDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Invalid input: expected string, received undefined"
        );
      }
    });

    it("should reject invalid instructionLines", () => {
      const invalidData = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        instructionLines: [
          {
            id: "not-a-uuid", // Invalid UUID
            originalText: "Mix ingredients together",
            lineIndex: 1,
          },
        ],
      };

      const result = ScheduleInstructionsDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("ScheduleSourceDataSchema", () => {
    it("should validate valid schedule source data", () => {
      const validData = {
        noteId: "123e4567-e89b-12d3-a456-426614174000",
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
          tags: [],
          ingredients: [],
          instructions: [],
        },
      };

      const result = ScheduleSourceDataSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should reject invalid noteId", () => {
      const invalidData = {
        noteId: "not-a-uuid",
        file: {
          title: "Test Recipe",
          contents: "<html><body><h1>Test Recipe</h1></body></html>",
        },
      };

      const result = ScheduleSourceDataSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success && result.error.issues[0]) {
        expect(result.error.issues[0].message).toBe(
          "Note ID must be a valid UUID"
        );
      }
    });
  });

  describe("NoteValidation", () => {
    describe("validateNoteJobData", () => {
      it("should validate valid note job data", () => {
        const validData = {
          content: "<html><body><h1>Test Recipe</h1></body></html>",
          noteId: "123e4567-e89b-12d3-a456-426614174000",
        };

        const result = NoteValidation.validateNoteJobData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid note job data", () => {
        const invalidData = {
          content: "",
          noteId: "123e4567-e89b-12d3-a456-426614174000",
        };

        const result = NoteValidation.validateNoteJobData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("content: Content cannot be empty");
        }
      });
    });

    describe("validateParseHtmlData", () => {
      it("should validate valid parse HTML data", () => {
        const validData = {
          content: "<html><body><h1>Test Recipe</h1></body></html>",
          importId: "import-123",
        };

        const result = NoteValidation.validateParseHtmlData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid parse HTML data", () => {
        const invalidData = {
          content: "",
          importId: "import-123",
        };

        const result = NoteValidation.validateParseHtmlData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("content: Content cannot be empty");
        }
      });
    });

    describe("validateSaveNoteData", () => {
      it("should validate valid save note data", () => {
        const validData = {
          file: {
            title: "Test Recipe",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
            tags: [],
            ingredients: [],
            instructions: [],
          },
          importId: "import-123",
        };

        const result = NoteValidation.validateSaveNoteData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid save note data", () => {
        const invalidData = {
          file: {
            title: "",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
          },
          importId: "import-123",
        };

        const result = NoteValidation.validateSaveNoteData(invalidData);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("file.title: Title is required");
        }
      });
    });

    describe("validateScheduleActionData", () => {
      it("should validate valid schedule action data", () => {
        const validData = {
          noteId: "123e4567-e89b-12d3-a456-426614174000",
          file: {
            title: "Test Recipe",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
            tags: [],
            ingredients: [],
            instructions: [],
          },
        };

        const result = NoteValidation.validateScheduleActionData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule action data", () => {
        const invalidData = {
          noteId: "not-a-uuid",
          file: {
            title: "Test Recipe",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
          },
        };

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
        const validData = {
          noteId: "123e4567-e89b-12d3-a456-426614174000",
          file: {
            title: "Test Recipe",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
            tags: [],
            ingredients: [],
            instructions: [],
          },
        };

        const result =
          NoteValidation.validateScheduleCategorizationData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule categorization data", () => {
        const invalidData = {
          noteId: "not-a-uuid",
          file: {
            title: "Test Recipe",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
          },
        };

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
        const validData = {
          noteId: "123e4567-e89b-12d3-a456-426614174000",
          file: {
            title: "Test Recipe",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
            tags: [],
            ingredients: [],
            instructions: [],
          },
        };

        const result = NoteValidation.validateScheduleImagesData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule images data", () => {
        const invalidData = {
          noteId: "not-a-uuid",
          file: {
            title: "Test Recipe",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
          },
        };

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
        const validData = {
          noteId: "123e4567-e89b-12d3-a456-426614174000",
          importId: "import-123",
        };

        const result =
          NoteValidation.validateScheduleIngredientsData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule ingredients data", () => {
        const invalidData = {
          noteId: "not-a-uuid",
          importId: "import-123",
        };

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
        const validData = {
          noteId: "123e4567-e89b-12d3-a456-426614174000",
          importId: "import-123",
        };

        const result =
          NoteValidation.validateScheduleInstructionsData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule instructions data", () => {
        const invalidData = {
          noteId: "not-a-uuid",
          importId: "import-123",
        };

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

    describe("validateScheduleSourceData", () => {
      it("should validate valid schedule source data", () => {
        const validData = {
          noteId: "123e4567-e89b-12d3-a456-426614174000",
          file: {
            title: "Test Recipe",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
            tags: [],
            ingredients: [],
            instructions: [],
          },
        };

        const result = NoteValidation.validateScheduleSourceData(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(validData);
        }
      });

      it("should return error for invalid schedule source data", () => {
        const invalidData = {
          noteId: "not-a-uuid",
          file: {
            title: "Test Recipe",
            contents: "<html><body><h1>Test Recipe</h1></body></html>",
          },
        };

        const result = NoteValidation.validateScheduleSourceData(invalidData);
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
