/**
 * Seeds TEST_DATABASE_URL with a known user and a small note for end-to-end tests. Refuses to run against any database whose name lacks "test". The database must already be migrated (`yarn workspace @peas/database test:int` or `prisma migrate deploy` does that).
 *
 *   TEST_DATABASE_URL=postgresql://<you>@localhost:5432/peas_test npx tsx tests/support/seed.ts
 */
export const E2E_USER = {
  username: "e2e",
  email: "e2e@peas.test",
  password: "peas-e2e-password",
} as const;

export const E2E_NOTE = {
  title: "E2E Weeknight Chili",
  lines: [
    "2 cups dried kidney beans",
    "1 tbsp olive oil",
    "Kosher salt, to taste",
  ],
} as const;

export const E2E_RECIPE = {
  title: "E2E Lemon Bars",
  lines: ["1 cup flour", "2 lemons"],
} as const;

export const E2E_INGREDIENTS = [
  { name: "garlic", isReviewed: true },
  { name: "lemon", isReviewed: false },
  { name: "shallot", isReviewed: false },
] as const;

export async function seedE2eDatabase(): Promise<{
  noteId: string;
  lineIds: string[];
}> {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL must be set");
  const databaseName = new URL(testUrl).pathname.replace(/^\//, "");
  if (!databaseName.includes("test"))
    throw new Error(
      `Refusing to seed "${databaseName}": the name must contain "test".`
    );
  process.env.DATABASE_URL = testUrl;

  const { prisma } = await import("@peas/database");
  const { hashPassword } = await import("@peas/api/auth");

  await prisma.$executeRawUnsafe(
    `TRUNCATE "Note", "Recipe", "Ingredient", "IngredientCategory", "IngredientTag", "Category", "Tag", "Session", "User" RESTART IDENTITY CASCADE`
  );

  await prisma.user.create({
    data: {
      username: E2E_USER.username,
      email: E2E_USER.email,
      passwordHash: await hashPassword(E2E_USER.password),
      userType: "ADMIN",
    },
  });

  const note = await prisma.note.create({
    data: {
      title: E2E_NOTE.title,
      html: "<p></p>",
      status: "COMPLETED",
      totalIngredientLines: E2E_NOTE.lines.length,
    },
    select: { id: true },
  });

  const lineIds: string[] = [];
  for (const [lineIndex, reference] of E2E_NOTE.lines.entries()) {
    const line = await prisma.parsedIngredientLine.create({
      data: {
        noteId: note.id,
        blockIndex: 0,
        lineIndex,
        reference,
        parseStatus: "COMPLETED_SUCCESSFULLY",
        parserVersion: "static_v1",
        parsed: {
          create: [
            { index: 0, rule: "e2e", type: "ingredient", value: reference },
          ],
        },
      },
      select: { id: true },
    });
    lineIds.push(line.id);
  }

  const recipeNote = await prisma.note.create({
    data: {
      title: E2E_RECIPE.title,
      html: "<p></p>",
      status: "COMPLETED",
      totalIngredientLines: E2E_RECIPE.lines.length,
    },
    select: { id: true },
  });
  for (const [lineIndex, reference] of E2E_RECIPE.lines.entries()) {
    await prisma.parsedIngredientLine.create({
      data: {
        noteId: recipeNote.id,
        blockIndex: 0,
        lineIndex,
        reference,
        parseStatus: "COMPLETED_SUCCESSFULLY",
        parserVersion: "static_v1",
      },
    });
  }
  await prisma.recipe.create({
    data: { title: E2E_RECIPE.title, noteId: recipeNote.id },
  });

  for (const ingredient of E2E_INGREDIENTS) {
    await prisma.ingredient.create({
      data: {
        name: ingredient.name,
        isReviewed: ingredient.isReviewed,
        reviewedAt: ingredient.isReviewed ? new Date() : null,
      },
    });
  }

  await prisma.$disconnect();
  return { noteId: note.id, lineIds };
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seedE2eDatabase()
    .then(({ noteId }) =>
      console.log(`Seeded e2e user ${E2E_USER.email} and note ${noteId}`)
    )
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
