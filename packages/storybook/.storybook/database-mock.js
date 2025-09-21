// Mock implementation of @peas/database for Storybook browser environment
// This prevents the actual database client from being loaded in stories

export const prisma = {
  // Mock common Prisma operations that might be used in components
  $connect: () => Promise.resolve(),
  $disconnect: () => Promise.resolve(),
  $transaction: (fn) => fn(prisma),

  // Mock model operations
  user: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },

  recipe: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },

  ingredient: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },

  note: {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
  },
};

// Mock repository functions
export async function cleanupAllData() {
  return Promise.resolve({
    deletedCounts: {
      notes: 0,
      ingredients: 0,
      parsedSegments: 0,
      uniqueLinePatterns: 0,
    },
  });
}

// Mock note repository functions
export async function getNotes() {
  return Promise.resolve([]);
}

export async function getNoteWithIngredients(noteId) {
  return Promise.resolve(null);
}

export async function markNoteAsDuplicate() {
  return Promise.resolve();
}

export async function updateNoteTitleSimHash() {
  return Promise.resolve();
}

export async function findNotesWithSimilarTitles() {
  return Promise.resolve([]);
}

export async function createNote() {
  return Promise.resolve({});
}

export async function createNoteWithEvernoteMetadata() {
  return Promise.resolve({});
}

export async function updateNote() {
  return Promise.resolve({});
}

export async function updateParsingErrorCount() {
  return Promise.resolve();
}

export async function saveCategoryToNote() {
  return Promise.resolve();
}

export async function saveTagsToNote() {
  return Promise.resolve();
}

export async function getNoteCategories() {
  return Promise.resolve([]);
}

export async function getNoteTags() {
  return Promise.resolve([]);
}

export async function getImportStats() {
  return Promise.resolve({
    totalNotes: 0,
    parsedNotes: 0,
    errorNotes: 0,
  });
}

// Mock queue job functions
export async function createQueueJob() {
  return Promise.resolve({});
}

export async function updateQueueJob() {
  return Promise.resolve({});
}

export async function getQueueJobByNoteId() {
  return Promise.resolve(null);
}

// Export everything that the real database package exports
export * from "./prisma-mock.js";
