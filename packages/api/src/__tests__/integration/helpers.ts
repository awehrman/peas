import type { ApolloServer } from "@apollo/server";
import { prisma } from "@peas/database";
import assert from "node:assert/strict";

import { hashPassword } from "../../auth/password.js";
import type { AuthUser } from "../../auth/session.js";
import type { ApiContext } from "../../context.js";

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

/** Empties the tables these suites write to. Users and sessions go too, so each suite starts clean. */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE
      "Note", "Recipe", "IngredientTag", "Category", "Tag",
      "QueueJob", "Session", "User", "FoodConcept", "ReinterpretRun", "CorpusAnalyticsSnapshot"
    RESTART IDENTITY CASCADE
  `);
}

export const PASSWORD = "integration-password";

export async function createUser(
  overrides: { username?: string; email?: string; admin?: boolean } = {}
): Promise<AuthUser> {
  const username = overrides.username ?? "cook";
  return prisma.user.create({
    data: {
      username,
      email: overrides.email ?? `${username}@peas.test`,
      passwordHash: await hashPassword(PASSWORD),
      userType: overrides.admin ? "ADMIN" : "USER",
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      avatarUrl: true,
      userType: true,
    },
  });
}

/**
 * A completed note with parsed ingredient lines, the shape the import pipeline produces.
 *
 * @example
 * const { noteId, lineIds } = await createNote("Weeknight Chili", ["2 cups beans", "1 tbsp oil"]);
 */
export async function createNote(
  title: string,
  lines: readonly string[],
  status: "COMPLETED" | "FAILED" | "PENDING" = "COMPLETED"
): Promise<{ noteId: string; lineIds: string[] }> {
  const note = await prisma.note.create({
    data: {
      title,
      html: "<p></p>",
      status,
      totalIngredientLines: lines.length,
    },
    select: { id: true },
  });
  const lineIds: string[] = [];
  for (const [lineIndex, reference] of lines.entries()) {
    const line = await prisma.parsedIngredientLine.create({
      data: {
        noteId: note.id,
        blockIndex: 0,
        lineIndex,
        reference,
        parseStatus: "COMPLETED_SUCCESSFULLY",
        parserVersion: "v2:test",
      },
      select: { id: true },
    });
    lineIds.push(line.id);
  }
  return { noteId: note.id, lineIds };
}

/** Runs one operation and returns its single result, failing on transport-level problems. */
export async function execute<TData = Record<string, unknown>>(
  server: ApolloServer<ApiContext>,
  viewer: AuthUser | null,
  query: string,
  variables?: Record<string, unknown>
): Promise<{
  data?: TData;
  errors?: readonly { message: string; extensions?: Record<string, unknown> }[];
}> {
  const response = await server.executeOperation(
    { query, variables },
    { contextValue: { viewer } }
  );
  assert(response.body.kind === "single");
  const { data, errors } = response.body.singleResult;
  return { data: (data ?? undefined) as TData | undefined, errors };
}
