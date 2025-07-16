import { prisma } from "../config/database";
import type { ParsedHTMLFile } from "@peas/database";

export interface IDatabaseService {
  prisma: typeof prisma;
  createNote?: (file: ParsedHTMLFile) => Promise<unknown>;
}

// Default database service implementation
export class DatabaseService implements IDatabaseService {
  get prisma() {
    return prisma;
  }

  get createNote() {
    // Import the createNote function from the database package
    return async (file: ParsedHTMLFile) => {
      const { createNote } = await import("@peas/database");
      return createNote(file);
    };
  }
}

export function registerDatabase(): IDatabaseService {
  return new DatabaseService();
}
