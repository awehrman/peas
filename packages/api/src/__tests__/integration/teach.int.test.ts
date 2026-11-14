import {
  createNote,
  createUser,
  execute,
  hasTestDatabase,
  resetDatabase,
} from "./helpers.js";

import {
  backfillMentions,
  loadResolverContext,
  prisma,
  seedOntologyVocabulary,
} from "@peas/database";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "../../auth/session.js";
import { createApiServer } from "../../server.js";

const curation = vi.hoisted(() => ({ isOpen: true }));
vi.mock("../../context.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../context.js")>();
  return {
    ...actual,
    canCurateKnowledge: (
      viewer: Parameters<typeof actual.canCurateKnowledge>[0]
    ) => curation.isOpen || actual.isAdmin(viewer),
  };
});

const server = createApiServer({ development: false });

const APPLY = `
  mutation ($input: ApplyDecisionInput!) {
    applyDecision(input: $input) {
      success message decisionId revision summary mentionsUpdated needsBackgroundReinterpret
      effect { changed { typename id } invalidatedDomains lexiconRevision }
    }
  }
`;

async function resetOntology(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE "LexiconRevision", "FoodConcept", "LexiconEntry", "AttributeDefinition", "PreparationOperation",
      "Discovery", "LexiconDecision", "IngredientMention" RESTART IDENTITY CASCADE
  `);
}

async function backfill(): Promise<void> {
  await backfillMentions(await loadResolverContext());
}

describe.skipIf(!hasTestDatabase)("Teach Peas resolvers (integration)", () => {
  let user: AuthUser;
  let admin: AuthUser;

  beforeEach(async () => {
    await resetDatabase();
    await resetOntology();
    await seedOntologyVocabulary();
    curation.isOpen = true;
    user = await createUser({ username: "cook" });
    admin = await createUser({ username: "boss", admin: true });
  });

  afterAll(async () => {
    await resetOntology();
    await server.stop();
    await prisma.$disconnect();
  });

  it("keeps the review tools to admins when curation is restricted", async () => {
    curation.isOpen = false;
    const queue = await execute(
      server,
      user,
      `{ discoveryQueue { items { id } } }`
    );
    expect(queue.errors?.[0]?.extensions?.code).toBe("FORBIDDEN");

    const applied = await execute<{
      applyDecision: { success: boolean; message: string };
    }>(server, user, APPLY, {
      input: { payload: { type: "IGNORE_TOKEN", token: "good-quality" } },
    });
    expect(applied.data?.applyDecision).toMatchObject({
      success: false,
      message: "You can't teach Peas yet",
    });

    const anonymous = await execute(
      server,
      null,
      `{ playground(line: "1 cup milk") { syntax } }`
    );
    expect(anonymous.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });

  it("teaches an alias from the queue and the note shows the new reading (scenario A)", async () => {
    const { noteId } = await createNote("Lemon Bars", ["2 tbsp icing sugar"]);
    const created = await execute<{
      applyDecision: {
        success: boolean;
        revision: number;
        summary: string;
        effect: { invalidatedDomains: string[]; lexiconRevision: number };
      };
    }>(server, admin, APPLY, {
      input: {
        payload: {
          type: "CREATE_CONCEPT",
          canonicalName: "powdered sugar",
          phrase: "powdered sugar",
          relationships: [],
        },
      },
    });
    expect(created.data?.applyDecision).toMatchObject({
      success: true,
      summary: "Taught: new concept powdered sugar",
    });
    expect(created.data?.applyDecision.effect.invalidatedDomains).toEqual([
      "NOTE_DETAIL",
      "RECIPES",
      "RECIPE_DETAIL",
      "DASHBOARD_STATS",
      "DISCOVERIES",
      "CONCEPTS",
      "CONCEPT_DETAIL",
      "MENTIONS",
      "CORPUS_HEALTH",
      "CATEGORIES",
    ]);
    expect(created.data?.applyDecision.effect.lexiconRevision).toBe(
      created.data?.applyDecision.revision
    );
    await backfill();

    const queue = await execute<{
      discoveryQueue: {
        items: {
          id: string;
          type: string;
          title: string;
          examples: { noteTitle: string; span: { text: string } }[];
        }[];
      };
    }>(
      server,
      admin,
      `{ discoveryQueue { items { id type title examples(limit: 5) { noteTitle span { text } } } } discoveryCounts { type count } }`
    );
    const discovery = queue.data?.discoveryQueue.items[0];
    expect(discovery).toMatchObject({
      type: "UNKNOWN_FOOD_PHRASE",
      title: "icing sugar",
      examples: [{ noteTitle: "Lemon Bars", span: { text: "icing sugar" } }],
    });

    const search = await execute<{
      searchConcepts: { id: string; canonicalName: string }[];
    }>(
      server,
      admin,
      `{ searchConcepts(query: "powdered") { id canonicalName } }`
    );
    const conceptId = search.data?.searchConcepts[0]?.id ?? "";
    const payload = {
      type: "MAP_TO_CONCEPT",
      phrase: "icing sugar",
      conceptId,
      kind: "ALIAS",
    };

    const preview = await execute<{
      previewDecision: {
        counts: { affected: number; newlyResolved: number };
        examples: {
          lineText: string;
          before: { text: string };
          after: { text: string; status: string };
        }[];
      };
    }>(
      server,
      admin,
      `query ($payload: JSON!) { previewDecision(payload: $payload) { counts { affected newlyResolved } examples { lineText before { text } after { text status } } } }`,
      { payload }
    );
    expect(preview.data?.previewDecision).toEqual({
      counts: { affected: 1, newlyResolved: 1 },
      examples: [
        {
          lineText: "2 tbsp icing sugar",
          before: { text: "unresolved: icing sugar" },
          after: { text: "powdered sugar", status: "AUTO_RESOLVED" },
        },
      ],
    });

    const applied = await execute<{
      applyDecision: {
        success: boolean;
        summary: string;
        mentionsUpdated: number;
        effect: { changed: { typename: string; id: string }[] };
      };
    }>(server, admin, APPLY, {
      input: { payload, discoveryId: discovery?.id },
    });
    expect(applied.data?.applyDecision).toMatchObject({
      success: true,
      summary: "Taught: icing sugar is powdered sugar",
      mentionsUpdated: preview.data?.previewDecision.counts.affected,
      effect: { changed: [{ typename: "Discovery", id: discovery?.id }] },
    });

    const note = await execute<{
      note: {
        ingredientBlocks: {
          lines: {
            mentions: {
              status: string;
              concept: { canonicalName: string };
              summary: { text: string };
              tokens: { kind: string; roles: string[] }[];
            }[];
          }[];
        }[];
      };
    }>(
      server,
      user,
      `query ($id: ID!) { note(id: $id) { ingredientBlocks { lines { mentions { status concept { canonicalName } summary { text } tokens { kind roles } } } } } }`,
      { id: noteId }
    );
    expect(note.data?.note.ingredientBlocks[0]?.lines[0]?.mentions).toEqual([
      {
        status: "AUTO_RESOLVED",
        concept: { canonicalName: "powdered sugar" },
        summary: { text: "powdered sugar" },
        tokens: [{ kind: "LEXEME", roles: ["FOOD"] }],
      },
    ]);

    const concept = await execute<{
      concept: {
        entries: { text: string; kind: string }[];
        mentions: { lineText: string }[];
        decisions: { type: string; canRevert: boolean }[];
      };
    }>(
      server,
      admin,
      `query ($id: ID!) { concept(id: $id) { entries { text kind } mentions { lineText } decisions { type canRevert } } }`,
      { id: conceptId }
    );
    expect(
      concept.data?.concept.entries.map((entry) => entry.text).sort()
    ).toEqual(["icing sugar", "powdered sugar"]);
    expect(concept.data?.concept.mentions).toEqual([
      { lineText: "2 tbsp icing sugar" },
    ]);
    expect(
      concept.data?.concept.decisions.map((decision) => decision.type)
    ).toEqual(["MAP_TO_CONCEPT", "CREATE_CONCEPT"]);

    const remaining = await execute<{ discoveryQueue: { items: unknown[] } }>(
      server,
      admin,
      `{ discoveryQueue { items { id } } }`
    );
    expect(remaining.data?.discoveryQueue.items).toEqual([]);
  });

  it("explains a line in the playground, lists concepts and vocabulary, and defers discoveries", async () => {
    await execute(server, admin, APPLY, {
      input: {
        payload: {
          type: "CREATE_CONCEPT",
          canonicalName: "milk",
          phrase: "milk",
          relationships: [],
        },
      },
    });

    const playground = await execute<{
      playground: {
        syntax: string;
        revision: number;
        mentions: {
          status: string;
          quantity: string;
          summary: { text: string };
          candidates: { reasons: string[] }[];
          unresolved: { text: string }[];
        }[];
      };
    }>(
      server,
      admin,
      `{ playground(line: "2 cups organic milk", mode: CONSERVATIVE) { syntax revision mentions { status quantity summary { text } candidates { reasons } unresolved { text } } } }`
    );
    expect(playground.data?.playground).toMatchObject({
      syntax: "[2 cup] organic {milk:FOOD}",
      mentions: [
        {
          status: "NEEDS_REVIEW",
          quantity: "2 cup",
          summary: { text: "milk" },
          candidates: [
            { reasons: ["head:milk(1 token)", 'unknown:"organic"'] },
          ],
        },
      ],
    });

    const concepts = await execute<{
      concepts: {
        total: number;
        items: { canonicalName: string; entryCount: number }[];
      };
    }>(
      server,
      admin,
      `{ concepts(query: "mil") { total items { canonicalName entryCount } } }`
    );
    expect(concepts.data?.concepts).toEqual({
      total: 1,
      items: [{ canonicalName: "milk", entryCount: 1 }],
    });

    const vocabulary = await execute<{
      vocabulary: {
        attributeValues: { definitionKey: string }[];
        degreeKeys: string[];
      };
    }>(
      server,
      admin,
      `{ vocabulary { attributeValues { definitionKey } degreeKeys } }`
    );
    expect(vocabulary.data?.vocabulary.degreeKeys).toContain("fine");
    expect(vocabulary.data?.vocabulary.attributeValues.length).toBeGreaterThan(
      10
    );

    await createNote("Pancakes", ["2 cups organic milk"]);
    await backfill();
    const queue = await execute<{
      discoveryQueue: { items: { id: string; title: string }[] };
    }>(
      server,
      admin,
      `{ discoveryQueue(type: UNKNOWN_MODIFIER) { items { id title } } }`
    );
    expect(queue.data?.discoveryQueue.items.map((item) => item.title)).toEqual([
      "organic",
    ]);

    const deferred = await execute<{
      deferDiscovery: {
        success: boolean;
        effect: { invalidatedDomains: string[] };
      };
    }>(
      server,
      admin,
      `mutation ($id: ID!) { deferDiscovery(id: $id) { success effect { invalidatedDomains } } }`,
      { id: queue.data?.discoveryQueue.items[0]?.id }
    );
    expect(deferred.data?.deferDiscovery).toEqual({
      success: true,
      effect: { invalidatedDomains: ["DISCOVERIES"] },
    });

    const refreshed = await execute<{
      refreshDiscoveries: { success: boolean };
    }>(server, admin, `mutation { refreshDiscoveries { success } }`);
    expect(refreshed.data?.refreshDiscoveries.success).toBe(true);
  });

  it("serves single discoveries and mentions, merged and inherited concept details, and guards every mutation", async () => {
    const { noteId } = await createNote("Pancakes", ["2 cups organic milk"]);
    const empty = await execute<{
      note: { ingredientBlocks: { lines: { mentions: unknown[] }[] }[] };
    }>(
      server,
      user,
      `query ($id: ID!) { note(id: $id) { ingredientBlocks { lines { mentions { id } } } } }`,
      { id: noteId }
    );
    expect(empty.data?.note.ingredientBlocks[0]?.lines[0]?.mentions).toEqual(
      []
    );

    for (const name of ["milk", "dairy", "milk 2"]) {
      await execute(server, admin, APPLY, {
        input: {
          payload: {
            type: "CREATE_CONCEPT",
            canonicalName: name,
            phrase: name,
            relationships: [],
          },
        },
      });
    }
    const ids = Object.fromEntries(
      (
        await prisma.foodConcept.findMany({
          select: { id: true, canonicalName: true },
        })
      ).map((row) => [row.canonicalName, row.id])
    );
    await prisma.foodClassification.create({
      data: {
        conceptId: ids.dairy ?? "",
        kind: "FOOD_GROUP",
        key: "DAIRY",
        value: "TRUE",
      },
    });
    await execute(server, admin, APPLY, {
      input: {
        payload: {
          type: "ADD_RELATIONSHIP",
          sourceConceptId: ids.milk,
          targetConceptId: ids.dairy,
          relationshipType: "IS_A",
        },
      },
    });
    const merged = await execute<{
      applyDecision: { effect: { evicted?: unknown } };
    }>(
      server,
      admin,
      `mutation ($input: ApplyDecisionInput!) { applyDecision(input: $input) { success effect { evicted { typename id } } } }`,
      {
        input: {
          payload: {
            type: "MERGE_CONCEPTS",
            survivorId: ids.milk,
            mergedId: ids["milk 2"],
          },
        },
      }
    );
    expect(merged.data?.applyDecision.effect.evicted).toEqual([
      { typename: "Concept", id: ids["milk 2"] },
      { typename: "ConceptSummary", id: ids["milk 2"] },
    ]);

    const concept = await execute<{
      milk: {
        classifications: unknown[];
        parents: { type: string; concept: { canonicalName: string } }[];
      };
      gone: { status: string; mergedInto: { canonicalName: string } };
    }>(
      server,
      admin,
      `query ($milk: ID!, $gone: ID!) {
        milk: concept(id: $milk) { classifications { key value source inheritedFrom { canonicalName } } parents { type concept { canonicalName } } }
        gone: concept(id: $gone) { status mergedInto { canonicalName } }
      }`,
      { milk: ids.milk, gone: ids["milk 2"] }
    );
    expect(concept.data?.milk.classifications).toEqual([
      {
        key: "DAIRY",
        value: "TRUE",
        source: "INHERITED",
        inheritedFrom: { canonicalName: "dairy" },
      },
    ]);
    expect(concept.data?.milk.parents).toEqual([
      { type: "IS_A", concept: { canonicalName: "dairy" } },
    ]);
    expect(concept.data?.gone).toEqual({
      status: "DEPRECATED",
      mergedInto: { canonicalName: "milk" },
    });

    await backfill();
    const queue = await execute<{
      discoveryQueue: {
        items: { id: string; payload: { type: string; token: string } }[];
      };
    }>(server, admin, `{ discoveryQueue(limit: 1) { items { id payload } } }`);
    const discoveryId = queue.data?.discoveryQueue.items[0]?.id;
    expect(queue.data?.discoveryQueue.items[0]?.payload).toMatchObject({
      type: "UNKNOWN_MODIFIER",
      token: "organic",
    });

    const single = await execute<{
      found: { title: string; examples: unknown[] };
      missing: null;
    }>(
      server,
      admin,
      `query ($id: ID!, $missing: ID!) { found: discovery(id: $id) { title examples(limit: 1, offset: 1) { lineText } } missing: discovery(id: $missing) { id } }`,
      { id: discoveryId, missing: "01936b2e-0000-7000-8000-000000000000" }
    );
    expect(single.data).toEqual({
      found: { title: "organic", examples: [] },
      missing: null,
    });

    const mentionId = (await prisma.ingredientMention.findFirstOrThrow()).id;
    const mention = await execute<{
      found: { rawText: string; status: string };
      missing: null;
    }>(
      server,
      user,
      `query ($id: ID!, $missing: ID!) { found: mention(id: $id) { rawText status } missing: mention(id: $missing) { id } }`,
      { id: mentionId, missing: "01936b2e-0000-7000-8000-000000000000" }
    );
    expect(mention.data).toEqual({
      found: { rawText: "2 cups organic milk", status: "NEEDS_REVIEW" },
      missing: null,
    });

    const literal = await execute<{
      previewDecision: { counts: { affected: number } };
    }>(
      server,
      admin,
      `{ previewDecision(payload: { type: "IGNORE_TOKEN", token: "organic" }) { counts { affected } } }`
    );
    expect(literal.data?.previewDecision.counts.affected).toBe(1);

    const missingRevert = await execute(
      server,
      admin,
      `query ($payload: JSON!) { previewDecision(payload: $payload) { revision } }`,
      {
        payload: {
          type: "REVERT",
          decisionId: "01936b2e-0000-7000-8000-000000000000",
        },
      }
    );
    expect(missingRevert.errors?.[0]).toMatchObject({
      message: "That decision does not exist",
      extensions: { code: "BAD_USER_INPUT" },
    });

    const playground = await execute<{
      playground: { syntax: string; mode: string; mentions: unknown[] };
    }>(
      server,
      admin,
      `{ playground(line: "   ") { syntax mode mentions { status } } }`
    );
    expect(playground.data?.playground).toMatchObject({
      syntax: "",
      mode: "CONSERVATIVE",
    });
    const longSearch = await execute<{ searchConcepts: unknown[] }>(
      server,
      admin,
      `query ($q: String!) { searchConcepts(query: $q) { id } }`,
      { q: "x".repeat(500) }
    );
    expect(longSearch.data?.searchConcepts).toEqual([]);

    curation.isOpen = false;
    for (const mutation of [
      `mutation { refreshDiscoveries { success message } }`,
      `mutation ($id: ID!) { deferDiscovery(id: $id) { success message } }`,
    ]) {
      const result = await execute<
        Record<string, { success: boolean; message: string }>
      >(server, user, mutation, { id: discoveryId });
      expect(Object.values(result.data ?? {})[0]).toEqual({
        success: false,
        message: "You can't teach Peas yet",
      });
    }
    curation.isOpen = true;
    const missingDefer = await execute<{
      deferDiscovery: { success: boolean; message: string };
    }>(
      server,
      admin,
      `mutation ($id: ID!) { deferDiscovery(id: $id) { success message } }`,
      {
        id: "01936b2e-0000-7000-8000-000000000000",
      }
    );
    expect(missingDefer.data?.deferDiscovery).toEqual({
      success: false,
      message: "That discovery no longer exists",
    });
  });

  it("reports invalid decisions as readable messages", async () => {
    const preview = await execute(
      server,
      admin,
      `query ($payload: JSON!) { previewDecision(payload: $payload) { revision } }`,
      {
        payload: {
          type: "MAP_TO_CONCEPT",
          phrase: "",
          conceptId: "nope",
          kind: "ALIAS",
        },
      }
    );
    expect(preview.errors?.[0]).toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });

    const applied = await execute<{
      applyDecision: { success: boolean; message: string };
    }>(server, admin, APPLY, {
      input: {
        payload: {
          type: "ADD_RELATIONSHIP",
          sourceConceptId: admin.id,
          targetConceptId: admin.id,
          relationshipType: "IS_A",
        },
      },
    });
    expect(applied.data?.applyDecision.success).toBe(false);
    expect(applied.data?.applyDecision.message).toMatch(
      /sourceConceptId|itself/
    );
  });
});
