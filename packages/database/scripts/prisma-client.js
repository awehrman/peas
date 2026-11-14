/* eslint-env node */
/* global process */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/** Prisma 7 client for standalone scripts, connected through the pg adapter. */
export function createScriptClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
}
