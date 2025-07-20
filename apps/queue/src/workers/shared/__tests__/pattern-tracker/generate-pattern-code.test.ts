import { describe, it, expect, beforeEach, vi } from "vitest";
import { PatternTracker, PatternRule } from "../../pattern-tracker";
import { PrismaClient } from "@peas/database";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

describe("PatternTracker - generatePatternCode", () => {
  let patternTracker: PatternTracker;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PrismaClient as any).mockImplementation(() => mockPrisma);
    patternTracker = new PatternTracker(mockPrisma);
  });

  it("should generate correct pattern code with rule numbers", () => {
    const rules: PatternRule[] = [
      {
        rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount",
        ruleNumber: 0,
      },
      {
        rule: "#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit",
        ruleNumber: 1,
      },
      {
        rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
        ruleNumber: 2,
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (patternTracker as any).generatePatternCode(rules);
    expect(result).toBe(
      "0:#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #3_amounts >> #4_amountExpression >> #5_amount_1:#1_ingredientLine >> #2_quantities >> #1_quantityWithSpace >> #1_units >> #2_unitExpression >> #13_unit_2:#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient"
    );
  });

  it("should handle single rule", () => {
    const rules: PatternRule[] = [
      {
        rule: "#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient",
        ruleNumber: 0,
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (patternTracker as any).generatePatternCode(rules);
    expect(result).toBe(
      "0:#1_ingredientLine >> #3_ingredients >> #1_ingredientExpression >> #2_ingredient"
    );
  });
});
