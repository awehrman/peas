import type { FoodRelationshipType } from "@peas/parser/v2";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { prisma } from "../../../client.js";
import { getAttributeVocabulary, setApplicability } from "../attributes.js";
import { createConcept } from "../concepts.js";
import {
  type LexiconEntryCreateInput,
  createLexiconEntries,
} from "../lexicon.js";
import { addRelationship } from "../relationships.js";
import { bumpRevision } from "../revision.js";

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);

/** Empties every ontology table plus the notes, lines, and users the tests create. Revision ids restart at 1. */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE
      "LexiconRevision", "FoodConcept", "LexiconEntry", "AttributeDefinition", "PreparationOperation",
      "FoodRelationship", "FoodClassification", "Discovery", "LexiconDecision", "LegacyIngredientMapping",
      "IngredientMention", "ParsedIngredientLine", "Note", "User", "ConceptMergeRecord", "FoodSubstitution", "FoodProduct",
      "Ingredient", "Alias", "IngredientProperty", "IngredientCategory", "IngredientTag", "Brand"
    RESTART IDENTITY CASCADE
  `);
}

export async function createNote(title = "Test note"): Promise<string> {
  const note = await prisma.note.create({
    data: { title, html: "<p></p>" },
    select: { id: true },
  });
  return note.id;
}

export async function createLine(
  reference: string,
  noteId: string | null = null,
  lineIndex = 0
): Promise<string> {
  const line = await prisma.parsedIngredientLine.create({
    data: { reference, blockIndex: 0, lineIndex, noteId },
    select: { id: true },
  });
  return line.id;
}

export async function createUser(username = "reviewer"): Promise<string> {
  const user = await prisma.user.create({
    data: {
      username,
      email: `${username}@example.com`,
      passwordHash: "not-a-real-hash",
    },
    select: { id: true },
  });
  return user.id;
}

interface SemanticFixture {
  entries: {
    text: string;
    role: LexiconEntryCreateInput["role"];
    kind?: "CANONICAL" | "PLURAL" | "ALIAS";
    concept?: string;
    attribute?: string;
    preparation?: string;
    valueKey?: string;
    status?: "ACTIVE" | "PROPOSED";
  }[];
  ontology: {
    concepts: string[];
    relationships: [string, FoodRelationshipType, string][];
    applicability: [string, string][];
    conceptAttributes: [string, string][];
  };
}

export interface SemanticOntology {
  /** Fixture concept key ("chicken-thigh") -> concept id. */
  concepts: Record<string, string>;
  /** "bone:boneless" -> attribute value id. */
  attributes: Record<string, string>;
  /** Attribute definition key -> id. */
  definitions: Record<string, string>;
  /** Preparation key -> id. */
  preparations: Record<string, string>;
}

/**
 * Loads packages/parser/fixtures/lexicon/semantic-cases.json (entries plus its ontology block) as ACTIVE rows, so database tests resolve lines the way the parser's semantic tests do. Run `seedOntologyVocabulary()` first. Pass `extend` to add entries or concepts.
 *
 * @example
 * const { concepts } = await seedSemanticOntology();
 * concepts["powdered-sugar"] // "0193..."
 */
export async function seedSemanticOntology(
  extend: (fixture: SemanticFixture) => SemanticFixture = (fixture) => fixture
): Promise<SemanticOntology> {
  const raw = JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(
          "../../../../../parser/fixtures/lexicon/semantic-cases.json",
          import.meta.url
        )
      ),
      "utf8"
    )
  ) as SemanticFixture;
  const fixture = extend(raw);
  const vocabulary = await getAttributeVocabulary();
  const result: SemanticOntology = {
    concepts: {},
    attributes: {},
    definitions: {},
    preparations: {},
  };
  for (const definition of vocabulary.definitions) {
    result.definitions[definition.key] = definition.id;
    for (const value of definition.values)
      result.attributes[`${definition.key}:${value.key}`] = value.id;
  }
  for (const preparation of vocabulary.preparations)
    result.preparations[preparation.key] = preparation.id;

  await prisma.$transaction(async (tx) => {
    const revision = await bumpRevision(tx, "test:semantic-ontology");
    for (const key of fixture.ontology.concepts) {
      const { id } = await createConcept(tx, {
        canonicalName: key.replace(/-/g, " "),
        status: "VERIFIED",
      });
      result.concepts[key] = id;
    }
    await createLexiconEntries(
      tx,
      fixture.entries.map((entry) => ({
        text: entry.text,
        role: entry.role,
        kind: entry.kind ?? null,
        conceptId: entry.concept ? result.concepts[entry.concept] : null,
        attributeValueId: entry.attribute
          ? result.attributes[entry.attribute]
          : null,
        preparationId: entry.preparation
          ? result.preparations[entry.preparation]
          : null,
        valueKey: entry.valueKey ?? null,
        status: entry.status ?? "ACTIVE",
      })),
      revision
    );
    for (const [source, type, target] of fixture.ontology.relationships) {
      await addRelationship(tx, {
        sourceId: result.concepts[source] ?? "",
        targetId: result.concepts[target] ?? "",
        type,
        status: "ACTIVE",
      });
    }
    for (const [definition, concept] of fixture.ontology.applicability) {
      await setApplicability(tx, result.definitions[definition] ?? "", [
        result.concepts[concept] ?? "",
      ]);
    }
    for (const [concept, attribute] of fixture.ontology.conceptAttributes) {
      await tx.conceptAttribute.create({
        data: {
          conceptId: result.concepts[concept] ?? "",
          attributeValueId: result.attributes[attribute] ?? "",
        },
      });
    }
  });
  return result;
}
