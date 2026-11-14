import { join } from "path";
import { config } from "dotenv";

// Load .env from the *current working directory* (repo root) only if
// DATABASE_URL isn't already set by the host.
if (!process.env.DATABASE_URL) {
  // resolve from cwd (apps/web) up to the repo root
  config({ path: join(process.cwd(), "../../.env.local"), quiet: true });
}

import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "@prisma/client";

export interface CreatePrismaClientOptions {
  connectionString?: string;
  log?: Prisma.LogLevel[];
}

/**
 * Prisma 7 connects through a driver adapter. Every client in the monorepo
 * should come from here so connection settings stay in one place.
 */
export function createPrismaClient(options: CreatePrismaClientOptions = {}): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: options.connectionString ?? process.env.DATABASE_URL,
    }),
    ...(options.log ? { log: options.log } : {}),
  });
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || createPrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export * from "@prisma/client";
