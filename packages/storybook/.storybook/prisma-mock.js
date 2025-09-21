// Mock implementation of @prisma/client for Storybook browser environment
// This prevents the actual Prisma client from being loaded in stories

export class PrismaClient {
  constructor() {
    // Mock constructor
  }

  async $connect() {
    return Promise.resolve();
  }

  async $disconnect() {
    return Promise.resolve();
  }

  async $transaction(fn) {
    return fn(this);
  }

  // Mock model properties
  user = {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  };

  recipe = {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  };

  ingredient = {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  };

  note = {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  };
}

// Export common Prisma types and enums (mock versions)
export const Prisma = {
  UserScalarFieldEnum: {},
  RecipeScalarFieldEnum: {},
  IngredientScalarFieldEnum: {},
  NoteScalarFieldEnum: {},
  SortOrder: {
    asc: "asc",
    desc: "desc",
  },
};
