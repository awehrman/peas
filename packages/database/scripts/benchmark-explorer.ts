#!/usr/bin/env tsx
/**
 * Times the Phase 8 explorer queries against a synthetic corpus the size of the full Evernote collection (by default 3,000 foods in a ten-way IS_A / PART_OF tree, 60,000 notes, 600,000 ingredient lines and mentions, 10,000 recipes, and preparations and attributes on a fifth of the mentions), and prints the median of five runs per query. Runs only against a database whose name contains "bench", which `--seed` empties and fills; migrate it first.
 *
 * Usage:
 *   createdb peas_bench
 *   DATABASE_URL=postgresql://<you>@localhost:5432/peas_bench yarn workspace @peas/database prisma migrate deploy
 *   BENCH_DATABASE_URL=postgresql://<you>@localhost:5432/peas_bench yarn workspace @peas/database db:benchmark:explorer --seed [--notes 60000] [--concepts 3000]
 */
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    seed: { type: "boolean", default: false },
    notes: { type: "string", default: "60000" },
    concepts: { type: "string", default: "3000" },
  },
});

const benchUrl = process.env.BENCH_DATABASE_URL;
if (!benchUrl || !new URL(benchUrl).pathname.includes("bench"))
  throw new Error(
    'Set BENCH_DATABASE_URL to a database whose name contains "bench"'
  );
process.env.DATABASE_URL = benchUrl;

const { prisma } = await import("../src/client.js");
const { seedOntologyVocabulary } =
  await import("../src/seed/ontology-vocabulary.js");
const explorer = await import("../src/repository/ontology/explorer.js");
const lexicon = await import("../src/repository/ontology/lexicon-explorer.js");

const noteCount = Number.parseInt(values.notes, 10);
const conceptCount = Number.parseInt(values.concepts, 10);

async function seed(): Promise<void> {
  console.log(
    `Seeding ${conceptCount} foods and ${noteCount} notes (${noteCount * 10} lines)…`
  );
  await prisma.$executeRawUnsafe(`
    TRUNCATE "LexiconRevision", "FoodConcept", "LexiconEntry", "AttributeDefinition", "PreparationOperation",
      "FoodRelationship", "IngredientMention", "ParsedIngredientLine", "Note", "Recipe", "Discovery"
    RESTART IDENTITY CASCADE
  `);
  await seedOntologyVocabulary();
  const statements = [
    `INSERT INTO "LexiconRevision" (reason) VALUES ('bench')`,
    `CREATE TEMP TABLE bench_concept AS
       SELECT g AS n, gen_random_uuid() AS id, gen_random_uuid() AS entry FROM generate_series(0, ${conceptCount - 1}) g`,
    `INSERT INTO "FoodConcept" (id, "canonicalName", slug, status, "updatedAt")
       SELECT id, 'food ' || n, 'bench-food-' || n, 'VERIFIED', now() FROM bench_concept`,
    `INSERT INTO "FoodRelationship" (id, "sourceId", "targetId", type, status)
       SELECT gen_random_uuid(), c.id, p.id, CASE WHEN c.n % 2 = 0 THEN 'IS_A' ELSE 'PART_OF' END::"FoodRelationshipType", 'ACTIVE'
       FROM bench_concept c JOIN bench_concept p ON p.n = (c.n - 1) / 10 WHERE c.n > 0`,
    `INSERT INTO "LexiconEntry" (id, text, normalized, "matchKey", "tokenCount", role, kind, status, "conceptId", "targetKey", "normalizerVersion", "revisionAdded", "updatedAt")
       SELECT entry, 'food ' || n, 'food ' || n, 'food ' || n, 2, 'FOOD', 'CANONICAL', 'ACTIVE', id, 'food:' || id, 'bench', 1, now() FROM bench_concept`,
    `INSERT INTO "Note" (id, title, html, status, "updatedAt")
       SELECT 'bench-note-' || g, 'Bench note ' || g, '', 'COMPLETED', now() FROM generate_series(1, ${noteCount}) g`,
    `INSERT INTO "Recipe" (id, title, "noteId", "updatedAt")
       SELECT 'bench-recipe-' || g, 'Bench recipe ' || g, 'bench-note-' || g, now() FROM generate_series(1, ${Math.floor(noteCount / 6)}) g`,
    `CREATE TEMP TABLE bench_line AS
       SELECT g, 'bench-line-' || g AS id, 'bench-note-' || ((g - 1) / 10 + 1) AS note, (g - 1) % 10 AS idx,
              floor(${conceptCount} * power(random(), 3))::int AS concept, random() AS roll
       FROM generate_series(1, ${noteCount * 10}) g`,
    `INSERT INTO "ParsedIngredientLine" (id, "noteId", "blockIndex", "lineIndex", reference, "parseStatus", "isActive", "updatedAt")
       SELECT l.id, l.note, 0, l.idx, '1 cup food ' || l.concept || ', chopped', 'COMPLETED_SUCCESSFULLY', true, now() FROM bench_line l`,
    `INSERT INTO "IngredientMention" (id, "parsedLineId", "segmentIndex", "rawText", "normalizedText", "spanStart", "spanEnd", syntax, resolution,
         "resolutionStatus", "conceptId", "parserVersion", "normalizerVersion", "resolverVersion", "lexiconRevision", "updatedAt")
       SELECT gen_random_uuid(), l.id, 0, '1 cup food ' || l.concept, '1 cup food ' || l.concept, 0, 12,
              jsonb_build_object('segment', jsonb_build_object('phrase', jsonb_build_array(jsonb_build_object(
                'kind', 'LEXEME', 'roles', jsonb_build_array('FOOD'), 'entryIds', jsonb_build_array(c.entry::text),
                'span', jsonb_build_object('start', 6, 'end', 11 + length(l.concept::text), 'text', 'food ' || l.concept))))),
              jsonb_build_object('resolverVersion', 'bench', 'unresolved', '[]'::jsonb, 'candidates', jsonb_build_array(
                jsonb_build_object('conceptId', c.id::text, 'entryId', c.entry::text))),
              CASE WHEN l.roll < 0.9 THEN 'AUTO_RESOLVED' WHEN l.roll < 0.95 THEN 'NEEDS_REVIEW' ELSE 'UNRESOLVED' END::"ResolutionStatus",
              CASE WHEN l.roll < 0.9 THEN c.id END, 'bench', 'bench', 'bench', 1, now()
       FROM bench_line l JOIN bench_concept c ON c.n = l.concept`,
    `INSERT INTO "MentionPreparation" ("mentionId", "order", "preparationId", position, "spanStart", "spanEnd")
       SELECT m.id, 0, (SELECT id FROM "PreparationOperation" ORDER BY key LIMIT 1 OFFSET (abs(hashtext(m.id::text)) % 5)), 'POST_HEAD', 13, 20
       FROM "IngredientMention" m WHERE m."conceptId" IS NOT NULL AND abs(hashtext(m.id::text)) % 5 = 0`,
    `INSERT INTO "MentionAttribute" ("mentionId", "attributeValueId", source)
       SELECT m.id, (SELECT id FROM "AttributeValue" ORDER BY key LIMIT 1 OFFSET (abs(hashtext(m.id::text || 'a')) % 8)), 'ASSERTED'
       FROM "IngredientMention" m WHERE m."conceptId" IS NOT NULL AND abs(hashtext(m.id::text || 'a')) % 5 = 0`,
    `ANALYZE`,
  ];
  for (const statement of statements) await prisma.$executeRawUnsafe(statement);
}

async function median(
  label: string,
  run: () => Promise<unknown>
): Promise<void> {
  await run();
  const times: number[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const start = performance.now();
    await run();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  console.log(`${label.padEnd(58)} ${times[2]?.toFixed(0).padStart(6)} ms`);
}

if (values.seed) await seed();

const root = await prisma.foodConcept.findFirstOrThrow({
  where: { slug: "bench-food-0" },
  select: { id: true },
});
const mid = await prisma.foodConcept.findFirstOrThrow({
  where: { slug: "bench-food-15" },
  select: { id: true },
});
const entry = await prisma.lexiconEntry.findFirstOrThrow({
  where: { text: "food 15" },
  select: { id: true },
});
const [mentions, lines] = await Promise.all([
  prisma.ingredientMention.count(),
  prisma.parsedIngredientLine.count(),
]);
console.log(`${lines} lines, ${mentions} mentions\n`);

await median("getCorpusAnalytics", () => explorer.getCorpusAnalytics());
await median("getConceptUsage (root, whole tree)", () =>
  explorer.getConceptUsage(root.id)
);
await median("getConceptUsage (mid-tree, with review)", () =>
  explorer.getConceptUsage(mid.id, { includeNeedsReview: true })
);
await median("getObservedForms (mid-tree)", () =>
  explorer.getObservedForms(mid.id)
);
await median("getConceptDistributions (root)", () =>
  explorer.getConceptDistributions(root.id)
);
await median("listConceptOccurrences (root, first page)", () =>
  explorer.listConceptOccurrences(root.id)
);
await median(
  "listConceptOccurrences (mid-tree, filtered by preparation)",
  async () => {
    const prep = await prisma.preparationOperation.findFirstOrThrow({
      orderBy: { key: "asc" },
      select: { key: true },
    });
    return explorer.listConceptOccurrences(mid.id, {
      preparationKey: prep.key,
    });
  }
);
await median("getConceptOccurrenceFacets (root)", () =>
  explorer.getConceptOccurrenceFacets(root.id)
);
await median("listLexiconEntryOccurrences (food 15)", () =>
  lexicon.listLexiconEntryOccurrences(entry.id)
);

await prisma.$disconnect();
