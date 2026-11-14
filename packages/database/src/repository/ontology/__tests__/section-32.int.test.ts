import {
  createLine,
  createNote,
  hasTestDatabase,
  resetDatabase,
} from "./int-helpers.js";

import {
  type FoodRelationshipType,
  type IngredientSegmentSyntax,
  type PhraseItem,
  type Resolution,
  type TextSpan,
  buildLexicon,
  parseLineBest,
} from "@peas/parser/v2";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../../client.js";
import { seedOntologyVocabulary } from "../../../seed/ontology-vocabulary.js";
import { createConcept } from "../concepts.js";
import {
  type LexiconEntryCreateInput,
  createLexiconEntries,
  getLexiconSnapshot,
} from "../lexicon.js";
import { getMentionDetail, upsertMentionsForLine } from "../mentions.js";
import { addRelationship } from "../relationships.js";
import { bumpRevision } from "../revision.js";

/**
 * Exit criterion for Phase 2: every target interpretation in section 32 of the original plan (fixtures/golden/semantic.json) can be stored with hand-inserted rows and read back unchanged. Phase 3's resolver will produce these rows automatically.
 */

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../parser/fixtures"
);

interface FixtureEntry {
  text: string;
  role: LexiconEntryCreateInput["role"];
  kind?: "CANONICAL" | "PLURAL" | "ALIAS";
  concept?: string;
  attribute?: string;
  preparation?: string;
  valueKey?: string;
}

interface SemanticCase {
  id: string;
  input: string;
  expected: {
    concept?: string | null;
    attributes?: string[];
    preparations?: {
      operation: string;
      degree?: string;
      position: "PRE_HEAD" | "POST_HEAD";
    }[];
    matchedTermKind?: string;
    status?: string;
    unresolved?: string[];
  };
}

const fixtureEntries = (
  JSON.parse(
    readFileSync(join(fixturesDir, "lexicon/semantic-cases.json"), "utf8")
  ) as { entries: FixtureEntry[] }
).entries;
const cases = (
  JSON.parse(
    readFileSync(join(fixturesDir, "golden/semantic.json"), "utf8")
  ) as { cases: SemanticCase[] }
).cases;

/** Concepts that appear only as resolver targets, plus the relationships the examples imply. */
const EXTRA_CONCEPTS = ["canned-tomatoes"];
const RELATIONSHIPS: [string, FoodRelationshipType, string][] = [
  ["whole-milk", "IS_A", "milk"],
  ["granny-smith-apple", "IS_A", "apple"],
  ["chicken-thigh", "PART_OF", "chicken"],
  ["fresh-mozzarella", "IS_A", "mozzarella"],
  ["canned-tomatoes", "PROCESSED_FROM", "tomato"],
];

const conceptIds = new Map<string, string>();
const attributeValueIds = new Map<string, string>();
const preparationIds = new Map<string, string>();
const entryIdsByText = new Map<string, string[]>();

function items(segment: IngredientSegmentSyntax): PhraseItem[] {
  return [
    ...segment.measurementModifiers,
    ...segment.phrase,
    ...(segment.trailing?.phrase ?? []),
  ];
}

function spanOf(segment: IngredientSegmentSyntax, text: string): TextSpan {
  const item = items(segment).find(
    (candidate) => candidate.span.text.toLowerCase() === text.toLowerCase()
  );
  if (!item)
    throw new Error(`"${text}" is not an item of "${segment.span.text}"`);
  return item.span;
}

function fixtureTextFor(predicate: (entry: FixtureEntry) => boolean): string {
  const entry = fixtureEntries.find(predicate);
  if (!entry) throw new Error("No fixture entry matches");
  return entry.text;
}

function resolutionFor(
  testCase: SemanticCase,
  segment: IngredientSegmentSyntax
): Resolution {
  const { expected } = testCase;
  if (!expected.concept) {
    return {
      resolverVersion: "section-32",
      candidates: [],
      unresolved: (expected.unresolved ?? []).map((text) => {
        const start = segment.span.text.indexOf(text);
        return {
          start: segment.span.start + start,
          end: segment.span.start + start + text.length,
          text,
        };
      }),
    };
  }

  const foodItem = items(segment).find(
    (item) =>
      item.kind === "LEXEME" &&
      item.roles.includes("FOOD") &&
      fixtureEntries.some(
        (entry) =>
          entry.role === "FOOD" &&
          entry.text.toLowerCase() === item.span.text.toLowerCase() &&
          entry.concept === expected.concept
      )
  );
  const entryId = foodItem
    ? (entryIdsByText.get(
        `FOOD:${foodItem.span.text.toLowerCase()}:${expected.concept}`
      )?.[0] ?? null)
    : null;

  return {
    resolverVersion: "section-32",
    candidates: [
      {
        conceptId: conceptIds.get(expected.concept)!,
        entryId,
        score: 1,
        reasons: ["SECTION_32_FIXTURE"],
        attributes: (expected.attributes ?? []).map((key) => {
          const text = fixtureTextFor((entry) => entry.attribute === key);
          return {
            attributeValueId: attributeValueIds.get(key)!,
            lexiconEntryId:
              entryIdsByText.get(`ATTRIBUTE:${text}:${key}`)?.[0] ?? null,
            source: "ASSERTED" as const,
            span: spanOf(segment, text),
          };
        }),
        preparations: (expected.preparations ?? []).map((preparation) => {
          const text = fixtureTextFor(
            (entry) => entry.preparation === preparation.operation
          );
          return {
            preparationId: preparationIds.get(preparation.operation)!,
            degreeKey: preparation.degree ?? null,
            position: preparation.position,
            span: spanOf(segment, text),
          };
        }),
        modifiers: [],
        unresolved: [],
      },
    ],
    unresolved: [],
  };
}

describe.skipIf(!hasTestDatabase)(
  "section 32 examples are representable (integration)",
  () => {
    beforeAll(async () => {
      await resetDatabase();
      await seedOntologyVocabulary();

      const vocabulary = await prisma.attributeValue.findMany({
        include: { definition: { select: { key: true } } },
      });
      for (const value of vocabulary)
        attributeValueIds.set(`${value.definition.key}:${value.key}`, value.id);
      for (const preparation of await prisma.preparationOperation.findMany())
        preparationIds.set(preparation.key, preparation.id);

      await prisma.$transaction(async (tx) => {
        const revision = await bumpRevision(tx, "seed:section-32");
        const keys = new Set([
          ...fixtureEntries.flatMap((entry) =>
            entry.concept ? [entry.concept] : []
          ),
          ...EXTRA_CONCEPTS,
        ]);
        for (const key of keys) {
          const created = await createConcept(tx, {
            canonicalName: key.replace(/-/g, " "),
            status: "VERIFIED",
          });
          conceptIds.set(key, created.id);
        }
        for (const [source, type, target] of RELATIONSHIPS) {
          await addRelationship(tx, {
            sourceId: conceptIds.get(source)!,
            targetId: conceptIds.get(target)!,
            type,
            status: "ACTIVE",
          });
        }

        for (const entry of fixtureEntries) {
          const target =
            entry.concept ??
            entry.attribute ??
            entry.preparation ??
            entry.valueKey ??
            "";
          const [created] = await createLexiconEntries(
            tx,
            [
              {
                text: entry.text,
                role: entry.role,
                kind: entry.kind ?? null,
                status: "ACTIVE",
                conceptId: entry.concept ? conceptIds.get(entry.concept) : null,
                attributeValueId: entry.attribute
                  ? attributeValueIds.get(entry.attribute)
                  : null,
                preparationId: entry.preparation
                  ? preparationIds.get(entry.preparation)
                  : null,
                valueKey: entry.valueKey ?? null,
              },
            ],
            revision
          );
          const key = `${entry.role}:${entry.text.toLowerCase()}:${target}`;
          entryIdsByText.set(key, [
            ...(entryIdsByText.get(key) ?? []),
            created!.id,
          ]);
        }
      });
    });

    afterAll(() => prisma.$disconnect());

    it("stores every fixture entry with a matching target", async () => {
      expect(await prisma.lexiconEntry.count()).toBe(fixtureEntries.length);
      expect(attributeValueIds.has("ripeness:unripe")).toBe(true);
    });

    it.each(cases.map((testCase) => [testCase.id, testCase] as const))(
      "%s",
      async (_id, testCase) => {
        const snapshot = await getLexiconSnapshot();
        const line = parseLineBest(testCase.input, {
          lexicon: buildLexicon(snapshot),
        });
        const segment = line.segments[0]!;
        const noteId = await createNote(testCase.id);
        const lineId = await createLine(testCase.input, noteId);

        const resolution = resolutionFor(testCase, segment);
        const status = testCase.expected.concept
          ? "AUTO_RESOLVED"
          : "UNRESOLVED";
        const { mentionIds } = await prisma.$transaction((tx) =>
          upsertMentionsForLine(tx, lineId, [
            { line, segmentIndex: 0, resolution, resolutionStatus: status },
          ])
        );
        const detail = await getMentionDetail(mentionIds[0]!);
        expect(detail).not.toBeNull();

        if (!testCase.expected.concept) {
          expect(detail?.conceptId).toBeNull();
          expect(detail?.resolutionStatus).toBe(testCase.expected.status);
          expect(
            detail?.resolution.unresolved.map((span) => span.text)
          ).toEqual(testCase.expected.unresolved);
          return;
        }

        const conceptRow = await prisma.foodConcept.findUnique({
          where: { id: detail!.conceptId! },
          select: { slug: true },
        });
        expect(conceptRow?.slug).toBe(testCase.expected.concept);
        expect(
          detail?.attributes
            .map(
              (attribute) => `${attribute.definitionKey}:${attribute.valueKey}`
            )
            .sort()
        ).toEqual([...(testCase.expected.attributes ?? [])].sort());
        expect(
          detail?.preparations.map((preparation) => ({
            operation: preparation.key,
            ...(preparation.degreeKey ? { degree: preparation.degreeKey } : {}),
            position: preparation.position,
          }))
        ).toEqual(testCase.expected.preparations ?? []);

        if (testCase.expected.matchedTermKind) {
          const entryId = detail?.resolution.candidates[0]?.entryId;
          expect(entryId).toBeTruthy();
          const entry = await prisma.lexiconEntry.findUnique({
            where: { id: entryId! },
            select: { kind: true },
          });
          expect(entry?.kind).toBe(testCase.expected.matchedTermKind);
        }
      }
    );
  }
);
