import { join } from "path";
import { config } from "dotenv";

// Load .env from the *current working directory* (repo root) only if
// DATABASE_URL isn’t already set by the host.
if (!process.env.DATABASE_URL) {
  // resolve from cwd (apps/web) up to the repo root
  config({ path: join(process.cwd(), "../../.env.local") });
}

import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export * from "@prisma/client";

console.log("[database] DATABASE_URL at runtime ->", process.env.DATABASE_URL);
