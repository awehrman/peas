import {
  createNote,
  createUser,
  execute,
  hasTestDatabase,
  resetDatabase,
} from "./helpers.js";

import {
  type ModifierSeedEntry,
  type StarterFoodsSeed,
  backfillMentions,
  loadResolverContext,
  prisma,
  seedLexiconModifiers,
  seedOntologyVocabulary,
  seedStarterFoods,
} from "@peas/database";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AuthUser } from "../../auth/session.js";
import { createApiServer } from "../../server.js";

const server = createApiServer({ development: false });

const USAGE = `
  query ($id: ID!, $expand: [FoodRelationshipType!]) {
    concept(id: $id) {
      canonicalName
      usage(expand: $expand) {
        expand
        includeNeedsReview
        direct { mentions lines notes recipes }
        expanded { mentions lines notes recipes }
        byStatus { autoResolved verified needsReview }
        contributors { concept { canonicalName status } path depth counts { mentions } }
      }
      observedForms { forms { text kind mentions example } otherMentions }
      distributions(expand: $expand) {
        expand
        preparations { preparationKey direct expanded }
        attributes { definitionKey valueKey direct expanded asserted }
        modifiers { role valueKey }
      }
    }
  }
`;

function lexiconFixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(`../../../../parser/fixtures/lexicon/${name}`, import.meta.url)
      ),
      "utf8"
    )
  ) as T;
}

async function resetOntology(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE "LexiconRevision", "FoodConcept", "LexiconEntry", "AttributeDefinition", "PreparationOperation",
      "Discovery", "LexiconDecision", "IngredientMention" RESTART IDENTITY CASCADE
  `);
}

describe.skipIf(!hasTestDatabase)(
  "Corpus explorer resolvers (integration)",
  () => {
    let cook: AuthUser;
    let chickenId: string;

    beforeAll(async () => {
      await resetDatabase();
      await resetOntology();
      await seedOntologyVocabulary();
      await seedLexiconModifiers(
        lexiconFixture<{ entries: ModifierSeedEntry[] }>("modifiers.seed.json")
          .entries
      );
      await seedStarterFoods(
        lexiconFixture<StarterFoodsSeed>("starter-foods.seed.json")
      );
      cook = await createUser({ username: "cook" });
      await createNote("Braised thighs", ["1 lb boneless chicken thighs"]);
      await createNote("Roast chicken", ["1 chicken"]);
      await createNote("Meatballs", ["1 lb ground chicken"]);
      await backfillMentions(await loadResolverContext());
      chickenId = (
        await prisma.foodConcept.findUniqueOrThrow({
          where: { slug: "chicken" },
          select: { id: true },
        })
      ).id;
    });

    afterAll(async () => {
      await resetOntology();
      await server.stop();
      await prisma.$disconnect();
    });

    it("reports direct and expanded usage, contributors, names, and distributions", async () => {
      const { data, errors } = await execute<{
        concept: {
          usage: Record<string, unknown>;
          observedForms: { forms: { text: string; mentions: number }[] };
          distributions: Record<string, unknown>;
        };
      }>(server, cook, USAGE, { id: chickenId });
      expect(errors).toBeUndefined();
      expect(data?.concept.usage).toEqual({
        expand: ["IS_A", "PART_OF"],
        includeNeedsReview: false,
        direct: { mentions: 1, lines: 1, notes: 1, recipes: 0 },
        expanded: { mentions: 2, lines: 2, notes: 2, recipes: 0 },
        byStatus: { autoResolved: 1, verified: 0, needsReview: 0 },
        contributors: [
          {
            concept: { canonicalName: "chicken thigh", status: "VERIFIED" },
            path: ["PART_OF"],
            depth: 1,
            counts: { mentions: 1 },
          },
        ],
      });
      expect(data?.concept.observedForms.forms[0]).toMatchObject({
        text: "chicken",
        mentions: 1,
      });
      expect(data?.concept.distributions).toMatchObject({
        expand: ["IS_A", "PART_OF"],
        attributes: [
          {
            definitionKey: "bone",
            valueKey: "boneless",
            direct: 0,
            expanded: 1,
            asserted: 1,
          },
        ],
      });
    });

    it("expands through the requested relationship types, each once", async () => {
      const { data } = await execute<{
        concept: {
          usage: { expand: string[]; expanded: { mentions: number } };
        };
      }>(server, cook, USAGE, {
        id: chickenId,
        expand: ["PROCESSED_FROM", "PART_OF", "PROCESSED_FROM"],
      });
      expect(data?.concept.usage.expand).toEqual(["PROCESSED_FROM", "PART_OF"]);
      expect(data?.concept.usage.expanded.mentions).toBe(3);
    });

    const OCCURRENCES = `
    query ($id: ID!, $filter: ConceptOccurrenceFilter, $after: String, $limit: Int) {
      conceptOccurrences(conceptId: $id, filter: $filter, after: $after, limit: $limit) {
        total
        nextCursor
        items { lineText noteTitle concept { canonicalName } path status preparations attributes span { text } }
      }
      conceptOccurrenceFacets(conceptId: $id) { sources { label } categories { name } }
    }
  `;
    type OccurrencesData = {
      conceptOccurrences: {
        total: number;
        nextCursor: string | null;
        items: {
          lineText: string;
          concept: { canonicalName: string };
          path: string[];
          attributes: string[];
        }[];
      };
      conceptOccurrenceFacets: { sources: unknown[]; categories: unknown[] };
    };

    it("lists occurrences page by page, with how each matched", async () => {
      const first = await execute<OccurrencesData>(server, cook, OCCURRENCES, {
        id: chickenId,
        limit: 1,
      });
      expect(first.errors).toBeUndefined();
      expect(first.data?.conceptOccurrences.total).toBe(2);
      expect(first.data?.conceptOccurrences.items).toHaveLength(1);
      const after = first.data?.conceptOccurrences.nextCursor;
      expect(after).toEqual(expect.any(String));
      const second = await execute<OccurrencesData>(server, cook, OCCURRENCES, {
        id: chickenId,
        limit: 1,
        after,
      });
      expect(second.data?.conceptOccurrences.nextCursor).toBeNull();
      const items = [
        ...(first.data?.conceptOccurrences.items ?? []),
        ...(second.data?.conceptOccurrences.items ?? []),
      ];
      expect(
        items
          .map((item) => [item.lineText, item.concept.canonicalName, item.path])
          .sort()
      ).toEqual([
        ["1 chicken", "chicken", []],
        ["1 lb boneless chicken thighs", "chicken thigh", ["PART_OF"]],
      ]);
      expect(first.data?.conceptOccurrenceFacets).toEqual({
        sources: [],
        categories: [],
      });
    });

    it("filters occurrences by attribute and expansion", async () => {
      const { data } = await execute<OccurrencesData>(
        server,
        cook,
        OCCURRENCES,
        {
          id: chickenId,
          filter: {
            expand: ["IS_A", "PART_OF", "PROCESSED_FROM"],
            attribute: "bone:boneless",
          },
        }
      );
      expect(
        data?.conceptOccurrences.items.map((item) => item.attributes)
      ).toEqual([["Bone: Boneless"]]);
      const all = await execute<OccurrencesData>(server, cook, OCCURRENCES, {
        id: chickenId,
        filter: { expand: ["IS_A", "PART_OF", "PROCESSED_FROM"] },
      });
      expect(all.data?.conceptOccurrences.total).toBe(3);
    });

    it("rejects bad input as user errors", async () => {
      const cases: [Record<string, unknown>, RegExp][] = [
        [{ id: "not-a-uuid" }, /conceptId must be a concept id/],
        [{ id: chickenId, filter: { status: "UNRESOLVED" } }, /status must be/],
        [
          { id: chickenId, filter: { attribute: "boneless" } },
          /attribute must look like/,
        ],
        [{ id: chickenId, after: "garbage" }, /Invalid occurrence cursor/],
      ];
      for (const [variables, message] of cases) {
        const { errors } = await execute(server, cook, OCCURRENCES, variables);
        expect(errors?.[0]?.message).toMatch(message);
        expect(errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
      }
    });

    it("shows where a lexicon entry is used, and the lexicon newest first", async () => {
      const entry = await prisma.lexiconEntry.findFirstOrThrow({
        where: { text: "chicken thighs" },
        select: { id: true },
      });
      const { data, errors } = await execute<{
        lexiconEntry: {
          text: string;
          targetLabel: string;
          revisionAdded: number;
          occurrences: {
            total: number;
            nextCursor: string | null;
            items: {
              lineText: string;
              span: { text: string } | null;
              status: string;
            }[];
          };
        } | null;
        missing: unknown;
        lexicon: { items: { text: string }[] };
        unknownExpressions: { total: number; page: number; items: unknown[] };
        unknownExpressionSources: unknown[];
      }>(
        server,
        cook,
        `query ($id: ID!) {
        lexiconEntry(id: $id) { text targetLabel revisionAdded occurrences(limit: 10) { total nextCursor items { lineText span { text } status } } }
        missing: lexiconEntry(id: "not-a-uuid") { id }
        lexicon(newestFirst: true) { items { text } }
        unknownExpressions { total page items { phrase } }
        unknownExpressionSources { id }
      }`,
        { id: entry.id }
      );
      expect(errors).toBeUndefined();
      expect(data?.lexiconEntry).toMatchObject({
        text: "chicken thighs",
        targetLabel: "chicken thigh",
        occurrences: {
          total: 1,
          nextCursor: null,
          items: [
            {
              lineText: "1 lb boneless chicken thighs",
              span: { text: "chicken thighs" },
              status: "AUTO_RESOLVED",
            },
          ],
        },
      });
      expect(data?.missing).toBeNull();
      expect(data?.lexicon.items.length).toBeGreaterThan(0);
      expect(data?.unknownExpressions.page).toBe(1);
      expect(data?.unknownExpressionSources).toEqual([]);

      const bad = await execute(
        server,
        cook,
        `query ($id: ID!) { lexiconEntry(id: $id) { occurrences(after: "nope") { total } } }`,
        { id: entry.id }
      );
      expect(bad.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
    });

    it("reports corpus analytics", async () => {
      const { data, errors } = await execute<{
        corpusAnalytics: {
          settledMentions: number;
          topExpanded: {
            concept: { canonicalName: string };
            directMentions: number;
            expandedMentions: number;
          }[];
          attributes: { label: string; asserted: number }[];
        };
      }>(
        server,
        cook,
        `{ corpusAnalytics { settledMentions conceptsWithMentions unusedVerifiedConcepts rareConceptCount
          topDirect { concept { canonicalName } directMentions }
          topExpanded { concept { canonicalName status } directMentions directNotes expandedMentions }
          rare { concept { canonicalName } directNotes }
          preparations { label mentions concepts }
          attributes { definitionName label mentions asserted } } }`
      );
      expect(errors).toBeUndefined();
      expect(data?.corpusAnalytics.settledMentions).toBe(3);
      expect(data?.corpusAnalytics.topExpanded[0]).toMatchObject({
        concept: { canonicalName: "chicken" },
        directMentions: 1,
        expandedMentions: 2,
      });
      expect(data?.corpusAnalytics.attributes).toContainEqual(
        expect.objectContaining({ label: "Boneless", asserted: 1 })
      );
      const anonymous = await execute(
        server,
        null,
        "{ corpusAnalytics { settledMentions } }"
      );
      expect(anonymous.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("returns a concept's neighborhood and validates depth", async () => {
      const GRAPH = `query ($id: ID!, $depth: Int, $direction: GraphDirection, $types: [FoodRelationshipType!]) {
      conceptGraph(conceptId: $id, depth: $depth, direction: $direction, types: $types) {
        centerId depth direction types truncated
        nodes { id canonicalName status level directMentions }
        edges { id sourceId targetId type status decision { revision username } }
      }
    }`;
      const { data, errors } = await execute<{
        conceptGraph: {
          depth: number;
          nodes: { canonicalName: string; level: number }[];
          edges: { type: string }[];
        };
      }>(server, cook, GRAPH, {
        id: chickenId,
        depth: 1,
        types: ["PART_OF", "PART_OF"],
      });
      expect(errors).toBeUndefined();
      expect(data?.conceptGraph.depth).toBe(1);
      expect(data?.conceptGraph.nodes).toContainEqual(
        expect.objectContaining({ canonicalName: "chicken thigh", level: 1 })
      );
      expect(
        data?.conceptGraph.edges.every((edge) => edge.type === "PART_OF")
      ).toBe(true);

      const bad = await execute(server, cook, GRAPH, {
        id: chickenId,
        depth: 4,
      });
      expect(bad.errors?.[0]?.extensions?.code).toBe("BAD_USER_INPUT");
      const missing = await execute<{ conceptGraph: unknown }>(
        server,
        cook,
        GRAPH,
        {
          id: "00000000-0000-4000-8000-000000000000",
        }
      );
      expect(missing.data?.conceptGraph).toBeNull();
    });

    it("requires a signed-in viewer", async () => {
      const occurrences = await execute(server, null, OCCURRENCES, {
        id: chickenId,
      });
      expect(occurrences.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
      const { data, errors } = await execute(server, null, USAGE, {
        id: chickenId,
      });
      expect(data?.concept ?? null).toBeNull();
      expect(errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });
  }
);
