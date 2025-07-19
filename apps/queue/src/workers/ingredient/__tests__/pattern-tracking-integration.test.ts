import { describe, it, expect, beforeEach, vi } from "vitest";
import { TrackPatternAction } from "../actions/track-pattern";
import { DatabaseOperations } from "../../shared/database-operations";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

describe("Pattern Tracking Integration", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;
  let dbOps: DatabaseOperations;
  let trackPatternAction: TrackPatternAction;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      uniqueLinePattern: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    };

    dbOps = new DatabaseOperations(mockPrisma);
    trackPatternAction = new TrackPatternAction();
  });

  describe("End-to-end pattern tracking", () => {
    it("should track a new pattern when processing ingredient line", async () => {
      const mockSegments = [
        {
          index: 0,
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
          type: "amount",
          value: "1.5",
        },
        {
          index: 1,
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #4_unit",
          type: "unit",
          value: "lbs",
        },
        {
          index: 2,
          rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
          type: "ingredient",
          value: "skirt steak",
        },
      ];

      const exampleLine = "1.5 lbs skirt steak";

      // Mock that pattern doesn't exist yet
      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
      mockPrisma.uniqueLinePattern.create.mockResolvedValue({
        id: "new-pattern-id",
      });

      // Execute the track pattern action
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-456",
        reference: exampleLine,
        segments: mockSegments,
      };

      const result = await trackPatternAction.execute(input, dbOps);

      // Verify the action returns the input unchanged
      expect(result).toEqual(input);

      // Verify the pattern was tracked
      expect(mockPrisma.uniqueLinePattern.findUnique).toHaveBeenCalledWith({
        where: { patternCode: "AMOUNT_UNIT_INGREDIENT" },
      });

      expect(mockPrisma.uniqueLinePattern.create).toHaveBeenCalledWith({
        data: {
          patternCode: "AMOUNT_UNIT_INGREDIENT",
          ruleSequence: mockSegments.map((s) => s.rule),
          description: "Standard ingredient with amount and unit",
          exampleLine: exampleLine,
          exampleValues: mockSegments.map((s) => ({
            rule: s.rule,
            type: s.type,
            value: s.value,
          })),
          occurrenceCount: 1,
        },
      });
    });

    it("should increment occurrence count for existing patterns", async () => {
      const mockSegments = [
        {
          index: 0,
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
          type: "amount",
          value: "2",
        },
        {
          index: 1,
          rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
          type: "unit",
          value: "tbsp",
        },
        {
          index: 2,
          rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
          type: "ingredient",
          value: "olive oil",
        },
      ];

      const exampleLine = "2 tbsp olive oil";

      // Mock that pattern already exists
      const existingPattern = {
        id: "existing-pattern-id",
        patternCode: "AMOUNT_UNIT_INGREDIENT",
        occurrenceCount: 5,
      };

      mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(
        existingPattern
      );
      mockPrisma.uniqueLinePattern.update.mockResolvedValue({
        ...existingPattern,
        occurrenceCount: 6,
      });

      // Execute the track pattern action
      const input = {
        noteId: "test-note-123",
        ingredientLineId: "test-line-789",
        reference: exampleLine,
        segments: mockSegments,
      };

      const result = await trackPatternAction.execute(input, dbOps);

      // Verify the action returns the input unchanged
      expect(result).toEqual(input);

      // Verify the pattern count was incremented
      expect(mockPrisma.uniqueLinePattern.update).toHaveBeenCalledWith({
        where: { patternCode: "AMOUNT_UNIT_INGREDIENT" },
        data: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: expect.any(Date),
        },
      });
    });

    it("should handle different pattern types correctly", async () => {
      const testCases = [
        {
          segments: [
            {
              index: 0,
              rule: "#1_ingredientLine >> #2_quantities >> #2_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
              type: "amount",
              value: "1",
            },
            {
              index: 1,
              rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
              type: "ingredient",
              value: "egg",
            },
          ],
          expectedPattern: "AMOUNT_INGREDIENT",
          exampleLine: "1 egg",
        },
        {
          segments: [
            {
              index: 0,
              rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
              type: "amount",
              value: "1",
            },
            {
              index: 1,
              rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
              type: "unit",
              value: "tbsp",
            },
            {
              index: 2,
              rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #1_descriptors >> #2_descriptor",
              type: "descriptor",
              value: "extra virgin",
            },
            {
              index: 3,
              rule: "#1_ingredientLine >> #3_ingredients >> #2_ingredientExpression >> #2_ingredient",
              type: "ingredient",
              value: "olive oil",
            },
          ],
          expectedPattern: "AMOUNT_UNIT_DESC_INGREDIENT",
          exampleLine: "1 tbsp extra virgin olive oil",
        },
      ];

      for (const testCase of testCases) {
        // Reset mocks for each test case
        vi.clearAllMocks();
        mockPrisma.uniqueLinePattern.findUnique.mockResolvedValue(null);
        mockPrisma.uniqueLinePattern.create.mockResolvedValue({
          id: "test-id",
        });

        const input = {
          noteId: "test-note-123",
          ingredientLineId: "test-line-456",
          reference: testCase.exampleLine,
          segments: testCase.segments,
        };

        await trackPatternAction.execute(input, dbOps);

        // Verify the correct pattern code was generated
        expect(mockPrisma.uniqueLinePattern.findUnique).toHaveBeenCalledWith({
          where: { patternCode: testCase.expectedPattern },
        });

        expect(mockPrisma.uniqueLinePattern.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            patternCode: testCase.expectedPattern,
            exampleLine: testCase.exampleLine,
          }),
        });
      }
    });
  });
});
