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
    "1 cup milk",
  ],
} as const;

/** A recipe whose chicken thighs (PART_OF chicken) let the concept filter include more specific concepts. */
export const E2E_CONCEPT_RECIPE = {
  title: "E2E Chicken Stew",
  lines: ["1 lb chicken thighs"],
} as const;

export const E2E_RECIPE = {
  title: "E2E Lemon Bars",
  lines: ["1 cup flour", "2 lemons"],
} as const;

/**
 * Teach Peas fixtures. Decisions change global knowledge, and Chromium and WebKit share one seeded database, so every phrase a test teaches or corrects exists once per browser project.
 */
export const E2E_TEACH = {
  noteTitle: "E2E Teach Peas",
  shared: ["2 green apples", "1 lb boneless skinless chicken thighs"],
  perProject: {
    chromium: {
      alias: "confectioners sugar",
      modifier: "organic",
      correct: "raw",
    },
    webkit: { alias: "icing sugar", modifier: "grassfed", correct: "skim" },
  },
} as const;

export type E2eProject = keyof typeof E2E_TEACH.perProject;

/** One proposed food per browser project, so each project approves its own from the ingredient card. */
export const E2E_PROPOSED_FOOD: Record<E2eProject, string> = {
  chromium: "shallot",
  webkit: "leek",
};

/** One proposed food per browser project for the concept page's Approve button. */
export const E2E_PROPOSED_CONCEPT: Record<E2eProject, string> = {
  chromium: "scallion",
  webkit: "fennel",
};

/** One line per browser project whose structure the grammar doesn't cover, so each project reviews (and marks as noise) its own structural pattern. */
export const E2E_STRUCTURAL: Record<
  E2eProject,
  { line: string; signature: string }
> = {
  chromium: { line: "For the glaze:", signature: "W :" },
  webkit: { line: "thyme 4 sprigs fresh", signature: "W N U W" },
};

export const E2E_STRUCTURE_NOTE = "E2E Structure";

/** One unresolved line per browser project; the lexicon test teaches its phrase as a name for milk, then retires it, and both changes reread the line. */
export const E2E_LEXICON: Record<E2eProject, { phrase: string; line: string }> =
  {
    chromium: { phrase: "moo juice", line: "1 cup moo juice" },
    webkit: { phrase: "cow juice", line: "1 cup cow juice" },
  };

export const E2E_LEXICON_NOTE = "E2E Lexicon";

/** The teach note's lines: the shared ones plus each project's alias, modifier, and correction lines. */
export function teachLines(): string[] {
  return [
    ...E2E_TEACH.shared,
    ...Object.values(E2E_TEACH.perProject).flatMap((fixture) => [
      `2 tbsp ${fixture.alias}`,
      `2 cups ${fixture.modifier} milk`,
      `1 cup ${fixture.correct} milk`,
    ]),
  ];
}

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
    `TRUNCATE "Note", "Recipe", "IngredientTag", "Category", "Tag", "Session", "User",
      "LexiconRevision", "FoodConcept", "LexiconEntry", "AttributeDefinition", "PreparationOperation", "Discovery", "LexiconDecision",
      "ReinterpretRun"
     RESTART IDENTITY CASCADE`
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

  for (const recipe of [E2E_CONCEPT_RECIPE]) {
    const recipeNoteRow = await prisma.note.create({
      data: {
        title: recipe.title,
        html: "<p></p>",
        status: "COMPLETED",
        totalIngredientLines: recipe.lines.length,
        parsedIngredientLines: {
          create: recipe.lines.map((reference, lineIndex) => ({
            blockIndex: 0,
            lineIndex,
            reference,
            parseStatus: "COMPLETED_SUCCESSFULLY" as const,
            parserVersion: "static_v1",
          })),
        },
      },
      select: { id: true },
    });
    await prisma.recipe.create({
      data: { title: recipe.title, noteId: recipeNoteRow.id },
    });
  }

  await seedTeachData();

  await prisma.$disconnect();
  return { noteId: note.id, lineIds };
}

/**
 * A small ontology (powdered sugar, apple, milk, chicken thigh PART_OF chicken, and the attributes the scenarios need), a note with the teach lines, and a backfill so mentions and discoveries exist.
 */
async function seedTeachData(): Promise<void> {
  const {
    addRelationship,
    backfillMentions,
    bumpRevision,
    createConcept,
    createLexiconEntries,
    getAttributeVocabulary,
    loadResolverContext,
    prisma,
    seedOntologyVocabulary,
    setApplicability,
  } = await import("@peas/database");

  await seedOntologyVocabulary();
  const vocabulary = await getAttributeVocabulary();
  const definition = (key: string) => {
    const found = vocabulary.definitions.find((row) => row.key === key);
    if (!found) throw new Error(`Missing attribute dimension ${key}`);
    return found;
  };
  const value = (definitionKey: string, valueKey: string) => {
    const found = definition(definitionKey).values.find(
      (row) => row.key === valueKey
    );
    if (!found)
      throw new Error(`Missing attribute value ${definitionKey}:${valueKey}`);
    return found.id;
  };

  await prisma.$transaction(async (tx) => {
    const revision = await bumpRevision(tx, "e2e:teach");
    const concept = async (canonicalName: string, names: string[]) => {
      const { id } = await createConcept(tx, {
        canonicalName,
        status: "VERIFIED",
      });
      await createLexiconEntries(
        tx,
        names.map((text, index) => ({
          text,
          role: "FOOD" as const,
          kind: index === 0 ? ("CANONICAL" as const) : ("PLURAL" as const),
          conceptId: id,
          status: "ACTIVE" as const,
        })),
        revision
      );
      return id;
    };
    for (const name of [
      ...Object.values(E2E_PROPOSED_FOOD),
      ...Object.values(E2E_PROPOSED_CONCEPT),
    ]) {
      const { id } = await createConcept(tx, {
        canonicalName: name,
        status: "PROPOSED",
      });
      await createLexiconEntries(
        tx,
        [
          {
            text: name,
            role: "FOOD" as const,
            kind: "CANONICAL" as const,
            conceptId: id,
            status: "PROPOSED" as const,
          },
        ],
        revision
      );
    }
    await concept("powdered sugar", ["powdered sugar"]);
    const apple = await concept("apple", ["apple", "apples"]);
    await concept("milk", ["milk"]);
    const chicken = await concept("chicken", ["chicken"]);
    const thigh = await concept("chicken thigh", [
      "chicken thigh",
      "chicken thighs",
    ]);
    await addRelationship(tx, {
      sourceId: thigh,
      targetId: chicken,
      type: "PART_OF",
      status: "ACTIVE",
    });
    await createLexiconEntries(
      tx,
      [
        {
          text: "green",
          role: "ATTRIBUTE",
          attributeValueId: value("color", "green"),
          status: "ACTIVE",
        },
        {
          text: "green",
          role: "ATTRIBUTE",
          attributeValueId: value("ripeness", "unripe"),
          status: "ACTIVE",
        },
        {
          text: "boneless",
          role: "ATTRIBUTE",
          attributeValueId: value("bone", "boneless"),
          status: "ACTIVE",
        },
        {
          text: "skinless",
          role: "ATTRIBUTE",
          attributeValueId: value("skin", "skinless"),
          status: "ACTIVE",
        },
      ],
      revision
    );
    await setApplicability(tx, definition("color").id, [apple]);
    await setApplicability(tx, definition("bone").id, [chicken]);
    await setApplicability(tx, definition("skin").id, [chicken]);
  });

  const lines = teachLines();
  await prisma.note.create({
    data: {
      title: E2E_TEACH.noteTitle,
      html: "<p></p>",
      status: "COMPLETED",
      totalIngredientLines: lines.length,
      parsedIngredientLines: {
        create: lines.map((reference, lineIndex) => ({
          blockIndex: 0,
          lineIndex,
          reference,
          parseStatus: "COMPLETED_SUCCESSFULLY" as const,
          parserVersion: "static_v1",
        })),
      },
    },
  });

  const structural = Object.values(E2E_STRUCTURAL).map(
    (fixture) => fixture.line
  );
  await prisma.note.create({
    data: {
      title: E2E_STRUCTURE_NOTE,
      html: "<p></p>",
      status: "COMPLETED",
      totalIngredientLines: structural.length,
      parsedIngredientLines: {
        create: structural.map((reference, lineIndex) => ({
          blockIndex: 0,
          lineIndex,
          reference,
          parseStatus: "COMPLETED_SUCCESSFULLY" as const,
          parserVersion: "static_v1",
        })),
      },
    },
  });

  const lexiconLines = Object.values(E2E_LEXICON).map(
    (fixture) => fixture.line
  );
  await prisma.note.create({
    data: {
      title: E2E_LEXICON_NOTE,
      html: "<p></p>",
      status: "COMPLETED",
      totalIngredientLines: lexiconLines.length,
      parsedIngredientLines: {
        create: lexiconLines.map((reference, lineIndex) => ({
          blockIndex: 0,
          lineIndex,
          reference,
          parseStatus: "COMPLETED_SUCCESSFULLY" as const,
          parserVersion: "static_v1",
        })),
      },
    },
  });

  await backfillMentions(await loadResolverContext());
}

/** Re-runs the mention backfill against the test database (scenario E checks that verified mentions survive it). */
export async function rerunBackfill(): Promise<void> {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL must be set");
  process.env.DATABASE_URL = testUrl;
  const { backfillMentions, loadResolverContext, prisma } =
    await import("@peas/database");
  await backfillMentions(await loadResolverContext());
  await prisma.$disconnect();
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
