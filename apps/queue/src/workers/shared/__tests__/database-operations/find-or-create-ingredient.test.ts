import { describe, it, expect, beforeEach, vi } from "vitest";
import { DatabaseOperations } from "../../database-operations";
import { PrismaClient } from "@peas/database";

// Mock Prisma client
vi.mock("@peas/database", () => ({
  PrismaClient: vi.fn(),
}));

// Mock pluralize
vi.mock("pluralize", () => ({
  default: {
    singular: vi.fn((word: string) => {
      if (word.endsWith("s")) {
        return word.slice(0, -1);
      }
      return word;
    }),
    plural: vi.fn((word: string) => {
      if (word.endsWith("s")) {
        return word;
      }
      return word + "s";
    }),
  },
}));

describe("DatabaseOperations - findOrCreateIngredient", () => {
  let dbOps: DatabaseOperations;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      parsedIngredientLine: {
        update: vi.fn(),
        create: vi.fn(),
      },
      parsedSegment: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      ingredientReference: {
        create: vi.fn(),
      },
      ingredient: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PrismaClient as any).mockImplementation(() => mockPrisma);
    dbOps = new DatabaseOperations(mockPrisma);
  });

  const ingredientName = "tomatoes";
  const reference = "2 cups tomatoes";

  it("should find existing ingredient by singular name", async () => {
    const existingIngredient = {
      id: "ingredient-123",
      name: "tomato",
      plural: "tomatoes",
    };

    mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

    const result = await dbOps.findOrCreateIngredient(
      ingredientName,
      reference
    );

    expect(result).toEqual({
      id: existingIngredient.id,
      name: existingIngredient.name,
      isNew: false,
    });

    expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: "tomatoe" }, // singular (mocked)
          { name: "tomatoes" }, // plural (mocked)
          { name: "tomatoes" }, // original
          {
            aliases: {
              some: { name: { in: ["tomatoe", "tomatoes", "tomatoes"] } },
            },
          },
        ],
      },
    });
  });

  it("should find existing ingredient by plural name", async () => {
    const existingIngredient = {
      id: "ingredient-123",
      name: "tomato",
      plural: "tomatoes",
    };

    mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

    const result = await dbOps.findOrCreateIngredient("tomato", reference);

    expect(result).toEqual({
      id: existingIngredient.id,
      name: existingIngredient.name,
      isNew: false,
    });
  });

  it("should create new ingredient when not found with plural input", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    const newIngredient = {
      id: "new-ingredient-123",
      name: "tomato",
      plural: "tomatoes",
    };

    mockPrisma.ingredient.create.mockResolvedValue(newIngredient);

    const result = await dbOps.findOrCreateIngredient(
      ingredientName, // "tomatoes" (plural)
      reference
    );

    expect(result).toEqual({
      id: newIngredient.id,
      name: newIngredient.name,
      isNew: true,
    });

    expect(mockPrisma.ingredient.create).toHaveBeenCalledWith({
      data: {
        name: "tomatoe", // singular (mocked)
        plural: "tomatoes", // original plural input
      },
    });
  });

  it("should create new ingredient when not found with singular input", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    const newIngredient = {
      id: "new-ingredient-123",
      name: "salt",
      plural: null,
    };

    mockPrisma.ingredient.create.mockResolvedValue(newIngredient);

    const result = await dbOps.findOrCreateIngredient(
      "salt", // singular input
      "1 tsp salt"
    );

    expect(result).toEqual({
      id: newIngredient.id,
      name: newIngredient.name,
      isNew: true,
    });

    expect(mockPrisma.ingredient.create).toHaveBeenCalledWith({
      data: {
        name: "salt", // original singular input
        plural: null, // null for singular inputs
      },
    });
  });

  it("should handle ingredients that are already singular", async () => {
    const existingIngredient = {
      id: "ingredient-123",
      name: "salt",
      plural: null,
    };

    mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

    const result = await dbOps.findOrCreateIngredient("salt", "1 tsp salt");

    expect(result).toEqual({
      id: existingIngredient.id,
      name: existingIngredient.name,
      isNew: false,
    });
  });

  it("should find existing ingredient with null plural when searching with plural", async () => {
    // This simulates the case where we first created "salt" with null plural
    // and now we're searching for "salts" (plural)
    const existingIngredient = {
      id: "ingredient-123",
      name: "salt",
      plural: null,
    };

    mockPrisma.ingredient.findFirst.mockResolvedValue(existingIngredient);

    const result = await dbOps.findOrCreateIngredient("salts", "2 cups salts");

    expect(result).toEqual({
      id: existingIngredient.id,
      name: existingIngredient.name,
      isNew: false,
    });

    // Verify that the search included the singular form
    expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: "salt" }, // singular (mocked)
          { name: "salts" }, // plural (mocked)
          { name: "salts" }, // original
          {
            aliases: {
              some: { name: { in: ["salt", "salts", "salts"] } },
            },
          },
        ],
      },
    });
  });
});
