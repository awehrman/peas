import { createPrismaClient } from "@peas/database";

// Queue-specific client: shares connection settings with @peas/database and
// adds query logging in development.
/* istanbul ignore next -- @preserve */
export const prisma = createPrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  // Don't throw errors in test environment to avoid unhandled rejections
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  }
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  // Don't throw errors in test environment to avoid unhandled rejections
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  }
});
