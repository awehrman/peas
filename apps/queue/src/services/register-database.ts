import { prisma } from "../config/database";

export interface IDatabaseService {
  prisma: typeof prisma;
  createNote?: (file: any) => Promise<any>;
}

// Default database service implementation
export class DatabaseService implements IDatabaseService {
  get prisma() {
    return prisma;
  }

  get createNote() {
    // Import the createNote function from the database package
    return async (file: any) => {
      const { createNote } = await import("@peas/database");
      return createNote(file);
    };
  }
}

export function registerDatabase(): IDatabaseService {
  return new DatabaseService();
}
