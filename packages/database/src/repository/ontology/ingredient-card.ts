import { type ApplyDecisionResult, applyDecision } from "./apply-decision.js";
import {
  type ConceptClassifications,
  getEffectiveClassificationsForMany,
  setClassification,
} from "./classifications.js";
import {
  removeClassification,
  setConceptTags,
  setSubstitution,
} from "./concept-editing.js";
import { type DbClient, OntologyError } from "./helpers.js";

import {
  type DecisionPayload,
  type FoodRelationshipType,
  entryMatchKey,
} from "@peas/parser/v2";
import type { ClassificationKind } from "@prisma/client";

import { prisma } from "../../client.js";

/**
 * The ingredient card's property checkboxes and the classification each one stores. Checked means TRUE ("contains"); an explicit "does not contain" stores FALSE, which overrides an inherited TRUE. Core types (food groups) and allergens inherit across every relationship.
 */
export const INGREDIENT_PROPERTY_CLASSIFICATIONS = {
  MEAT: { kind: "FOOD_GROUP", key: "MEAT" },
  FISH: { kind: "FOOD_GROUP", key: "FISH" },
  DAIRY: { kind: "FOOD_GROUP", key: "DAIRY" },
  EGG: { kind: "FOOD_GROUP", key: "EGG" },
  GRAIN: { kind: "FOOD_GROUP", key: "GRAIN" },
  LEGUME: { kind: "FOOD_GROUP", key: "LEGUME" },
  FRUIT: { kind: "FOOD_GROUP", key: "FRUIT" },
  VEGETABLE: { kind: "FOOD_GROUP", key: "VEGETABLE" },
  HERB: { kind: "FOOD_GROUP", key: "HERB" },
  SPICE: { kind: "FOOD_GROUP", key: "SPICE" },
  FAT: { kind: "FOOD_GROUP", key: "FAT" },
  SWEETENER: { kind: "FOOD_GROUP", key: "SWEETENER" },
  SEASONING: { kind: "FOOD_GROUP", key: "SEASONING" },
  GLUTEN: { kind: "ALLERGEN", key: "ALLERGEN_GLUTEN" },
  NUTS: { kind: "ALLERGEN", key: "ALLERGEN_TREE_NUTS" },
  SHELLFISH: { kind: "ALLERGEN", key: "ALLERGEN_SHELLFISH" },
  SOY: { kind: "ALLERGEN", key: "ALLERGEN_SOY" },
  SESAME: { kind: "ALLERGEN", key: "ALLERGEN_SESAME" },
  CORN: { kind: "ALLERGEN", key: "ALLERGEN_CORN" },
  ALCOHOL: { kind: "ALLERGEN", key: "ALLERGEN_ALCOHOL" },
} as const satisfies Record<string, { kind: ClassificationKind; key: string }>;

/** A property the card stores as a classification. */
export type IngredientStoredProperty =
  keyof typeof INGREDIENT_PROPERTY_CLASSIFICATIONS;
export const INGREDIENT_STORED_PROPERTIES = Object.keys(
  INGREDIENT_PROPERTY_CLASSIFICATIONS
) as IngredientStoredProperty[];

/** Tags computed from the food's properties rather than stored: vegetarian has no meat or fish, vegan also no dairy or egg, gluten-free no gluten. */
export const INGREDIENT_DIETARY_TAGS = [
  "VEGAN",
  "VEGETARIAN",
  "GLUTEN_FREE",
] as const;
export type IngredientDietaryTag = (typeof INGREDIENT_DIETARY_TAGS)[number];

/** Anything the ingredients list can group by: stored properties and computed dietary tags. */
export type IngredientCardProperty =
  IngredientStoredProperty | IngredientDietaryTag;

const PROPERTY_BY_KEY = new Map<string, IngredientStoredProperty>(
  INGREDIENT_STORED_PROPERTIES.map((property) => [
    INGREDIENT_PROPERTY_CLASSIFICATIONS[property].key,
    property,
  ])
);
/** Being made or processed from another food makes a food composed: it can come from a recipe. */
export const COMPOSING_RELATIONSHIP_TYPES: readonly FoodRelationshipType[] = [
  "DERIVED_FROM",
  "PROCESSED_FROM",
];

const CORE_TYPES: readonly IngredientStoredProperty[] = [
  "MEAT",
  "FISH",
  "DAIRY",
  "EGG",
  "GRAIN",
  "LEGUME",
  "FRUIT",
  "VEGETABLE",
  "HERB",
  "SPICE",
  "FAT",
  "SWEETENER",
  "SEASONING",
];
const CATEGORY_PREFIX = "CATEGORY:";
const REFERENCE_LIMIT = 50;

/** "all" lists approved foods, "unreviewed" the proposed ones waiting for a review. */
export type IngredientCardView = "all" | "unreviewed";

export interface IngredientCardSummary {
  id: string;
  name: string;
  plural: string | null;
  isReviewed: boolean;
  /** The first parent (any relationship type), for grouping by relationship. */
  parentIngredientId: string | null;
  /** Stored properties in effect (explicit or inherited) plus computed dietary tags. */
  properties: IngredientCardProperty[];
  /** Active lines that mention it. */
  referenceCount: number;
}

export interface IngredientCardOption {
  id: string;
  name: string;
}

/** One relationship as the card shows it: the other food and how they relate. */
export interface IngredientCardRelation {
  relationshipType: FoodRelationshipType;
  ingredient: IngredientCardOption;
}

/**
 * One property on the card: what this food says, what it would inherit, and from which food.
 *
 * @example
 * { property: "GLUTEN", explicit: null, inherited: "TRUE", inheritedFrom: { name: "wheat" } } // flour: checked, from wheat
 * { property: "GLUTEN", explicit: "FALSE", inherited: "TRUE", inheritedFrom: { name: "flour" } } // gluten-free flour: overrides flour
 */
export interface IngredientCardPropertyState {
  property: IngredientStoredProperty;
  explicit: "TRUE" | "FALSE" | null;
  inherited: "TRUE" | "FALSE" | null;
  inheritedFrom: IngredientCardOption | null;
}

export interface IngredientCardRecord {
  id: string;
  name: string;
  plural: string | null;
  isReviewed: boolean;
  reviewedAt: string | null;
  isComposedIngredient: boolean;
  /** Properties that are set here or inherited, in card order. */
  propertyStates: IngredientCardPropertyState[];
  /** Automatic tags (vegan, vegetarian, gluten-free) from the food's properties in effect; empty when it has no core type. */
  dietaryTags: IngredientDietaryTag[];
  aliases: { id: string; name: string }[];
  substitutions: IngredientCardOption[];
  /** Foods this one comes from or belongs to, oldest first ("canned tomatoes" is processed from "tomato"). */
  relationships: IngredientCardRelation[];
  /** Foods that relate to this one, by name ("canned tomatoes" for "tomato", with PROCESSED_FROM). */
  variants: IngredientCardRelation[];
  /** Category names (stored as `CATEGORY:<name>` classifications), alphabetical. */
  categories: string[];
  tags: string[];
  referenceCount: number;
  references: {
    id: string;
    reference: string;
    noteId: string | null;
    noteTitle: string | null;
  }[];
}

function definite(value: string | undefined): "TRUE" | "FALSE" | null {
  return value === "TRUE" || value === "FALSE" ? value : null;
}

/** Stored properties whose effective value is TRUE. */
function propertiesInEffect(
  classifications: ConceptClassifications | undefined
): Set<IngredientStoredProperty> {
  const found = new Set<IngredientStoredProperty>();
  for (const row of classifications?.effective ?? []) {
    const property = PROPERTY_BY_KEY.get(row.key);
    if (property && row.value === "TRUE") found.add(property);
  }
  return found;
}

/**
 * The automatic tags for a food's properties in effect: vegetarian with no meat or fish, vegan when also free of dairy and egg, gluten-free without gluten. Nothing for a food with no core type, so an unclassified food is never tagged.
 *
 * @example
 * dietaryTagsFor(new Set(["VEGETABLE"]))         // ["VEGAN", "VEGETARIAN", "GLUTEN_FREE"]
 * dietaryTagsFor(new Set(["DAIRY"]))             // ["VEGETARIAN", "GLUTEN_FREE"]
 * dietaryTagsFor(new Set(["GRAIN", "GLUTEN"]))   // ["VEGAN", "VEGETARIAN"]
 * dietaryTagsFor(new Set())                      // []
 */
export function dietaryTagsFor(
  inEffect: ReadonlySet<IngredientStoredProperty>
): IngredientDietaryTag[] {
  if (!CORE_TYPES.some((property) => inEffect.has(property))) return [];
  const isVegetarian = !inEffect.has("MEAT") && !inEffect.has("FISH");
  const isVegan =
    isVegetarian && !inEffect.has("DAIRY") && !inEffect.has("EGG");
  return [
    ...(isVegan ? (["VEGAN"] as const) : []),
    ...(isVegetarian ? (["VEGETARIAN"] as const) : []),
    ...(inEffect.has("GLUTEN") ? [] : (["GLUTEN_FREE"] as const)),
  ];
}

function propertyStatesFor(
  classifications: ConceptClassifications | undefined,
  names: ReadonlyMap<string, string>
): IngredientCardPropertyState[] {
  const explicit = new Map(
    (classifications?.effective ?? [])
      .filter((row) => row.source === "EXPLICIT")
      .map((row) => [row.key, row.value])
  );
  const inherited = new Map(
    (classifications?.inherited ?? []).flatMap((row) =>
      row.source === "INHERITED" ? [[row.key, row] as const] : []
    )
  );
  return INGREDIENT_STORED_PROPERTIES.flatMap((property) => {
    const { key } = INGREDIENT_PROPERTY_CLASSIFICATIONS[property];
    const own = definite(explicit.get(key));
    const parent = inherited.get(key);
    const parentValue = definite(parent?.value);
    if (!own && !parentValue) return [];
    const fromId =
      parent?.source === "INHERITED" ? parent.inheritedFromConceptId : null;
    return [
      {
        property,
        explicit: own,
        inherited: parentValue,
        inheritedFrom: fromId
          ? { id: fromId, name: names.get(fromId) ?? "another food" }
          : null,
      },
    ];
  });
}

async function referenceCounts(
  ids: readonly string[],
  db: DbClient
): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await db.ingredientMention.groupBy({
    by: ["conceptId"],
    where: { conceptId: { in: [...ids] }, parsedLine: { isActive: true } },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.conceptId ?? "", row._count._all]));
}

/**
 * Every food in one view of the ingredients page, alphabetical, with what the list groups by (properties, first base ingredient, usage). Variants are listed too; the list marks them by `parentIngredientId`.
 *
 * @example
 * await listIngredientSummaries("all") // [{ name: "chicken", isReviewed: true, referenceCount: 12, ... }, { name: "chicken thigh", parentIngredientId: <chicken>, ... }]
 */
export async function listIngredientSummaries(
  view: IngredientCardView,
  db: DbClient = prisma
): Promise<IngredientCardSummary[]> {
  const concepts = await db.foodConcept.findMany({
    where: { status: view === "all" ? "VERIFIED" : "PROPOSED" },
    orderBy: [{ canonicalName: "asc" }, { id: "asc" }],
    select: {
      id: true,
      canonicalName: true,
      status: true,
      entries: {
        where: { role: "FOOD", kind: "PLURAL", status: { not: "DEPRECATED" } },
        select: { text: true },
        take: 1,
      },
      outgoing: {
        where: { status: { not: "DEPRECATED" } },
        orderBy: { createdAt: "asc" },
        select: { targetId: true },
        take: 1,
      },
    },
  });
  const ids = concepts.map((concept) => concept.id);
  const [counts, classifications] = await Promise.all([
    referenceCounts(ids, db),
    getEffectiveClassificationsForMany(ids, db),
  ]);
  return concepts.map((concept) => ({
    id: concept.id,
    name: concept.canonicalName,
    plural: concept.entries[0]?.text ?? null,
    isReviewed: concept.status === "VERIFIED",
    parentIngredientId: concept.outgoing[0]?.targetId ?? null,
    properties: (() => {
      const inEffect = propertiesInEffect(classifications.get(concept.id));
      return [
        ...dietaryTagsFor(inEffect),
        ...INGREDIENT_STORED_PROPERTIES.filter((property) =>
          inEffect.has(property)
        ),
      ];
    })(),
    referenceCount: counts.get(concept.id) ?? 0,
  }));
}

/** @example await getIngredientCardCounts() // { all: 26, unreviewed: 2 } */
export async function getIngredientCardCounts(
  db: DbClient = prisma
): Promise<{ all: number; unreviewed: number }> {
  const [all, unreviewed] = await Promise.all([
    db.foodConcept.count({ where: { status: "VERIFIED" } }),
    db.foodConcept.count({ where: { status: "PROPOSED" } }),
  ]);
  return { all, unreviewed };
}

/** Category names in use (from `CATEGORY:<name>` classifications), for the card's category suggestions. */
export async function getIngredientCategoryOptions(
  db: DbClient = prisma
): Promise<string[]> {
  const rows = await db.foodClassification.findMany({
    where: { kind: "CATEGORY", key: { startsWith: CATEGORY_PREFIX } },
    distinct: ["key"],
    orderBy: { key: "asc" },
    select: { key: true },
  });
  return rows.map((row) => row.key.slice(CATEGORY_PREFIX.length));
}

/**
 * Name and entry search for the card's parent and substitute pickers, up to 10 foods that are not merged away.
 *
 * @example
 * await searchIngredientOptions("papr", currentId) // [{ id, name: "paprika" }, { id, name: "smoked paprika" }]
 */
export async function searchIngredientOptions(
  query: string,
  excludeId?: string,
  db: DbClient = prisma
): Promise<IngredientCardOption[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const rows = await db.foodConcept.findMany({
    where: {
      status: { not: "DEPRECATED" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { canonicalName: { contains: trimmed, mode: "insensitive" } },
        {
          entries: {
            some: {
              role: "FOOD",
              status: "ACTIVE",
              normalized: { contains: trimmed, mode: "insensitive" },
            },
          },
        },
      ],
    },
    orderBy: { canonicalName: "asc" },
    take: 10,
    select: { id: true, canonicalName: true },
  });
  return rows.map((row) => ({ id: row.id, name: row.canonicalName }));
}

/**
 * The food that already answers to a name (as its name, plural, or an alternate name), other than `excludeId`; null when the name is free. Proposed names count too, so two foods can't both claim one while awaiting review.
 *
 * @example
 * await findIngredientNameOwner("scallions", greenOnionId) // null (its own plural)
 * await findIngredientNameOwner("scallion", leekId)        // { id: <green onion>, name: "green onion" }
 */
export async function findIngredientNameOwner(
  name: string,
  excludeId?: string,
  db: DbClient = prisma
): Promise<IngredientCardOption | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const entry = await db.lexiconEntry.findFirst({
    where: {
      role: "FOOD",
      status: { not: "DEPRECATED" },
      matchKey: entryMatchKey(trimmed),
      concept: { status: { not: "DEPRECATED" } },
      ...(excludeId ? { conceptId: { not: excludeId } } : {}),
    },
    select: { concept: { select: { id: true, canonicalName: true } } },
  });
  return entry?.concept
    ? { id: entry.concept.id, name: entry.concept.canonicalName }
    : null;
}

/**
 * Everything the ingredient card shows for one food.
 *
 * @example
 * await getIngredientCard(chickenThighId) // { name: "chicken thigh", plural: "chicken thighs", relationships: [{ relationshipType: "PART_OF", ingredient: { name: "chicken" } }], ... }
 */
export async function getIngredientCard(
  id: string,
  db: DbClient = prisma
): Promise<IngredientCardRecord | null> {
  const concept = await db.foodConcept.findUnique({
    where: { id },
    select: {
      id: true,
      canonicalName: true,
      status: true,
      isComposed: true,
      entries: {
        where: { role: "FOOD", status: { not: "DEPRECATED" } },
        orderBy: { text: "asc" },
        select: { id: true, text: true, kind: true },
      },
      outgoing: {
        where: { status: { not: "DEPRECATED" } },
        orderBy: { createdAt: "asc" },
        select: {
          type: true,
          target: { select: { id: true, canonicalName: true } },
        },
      },
      incoming: {
        where: {
          status: { not: "DEPRECATED" },
          source: { status: { not: "DEPRECATED" } },
        },
        orderBy: { source: { canonicalName: "asc" } },
        select: {
          type: true,
          source: { select: { id: true, canonicalName: true } },
        },
      },
      classifications: { select: { key: true, value: true } },
      tags: { orderBy: { name: "asc" }, select: { name: true } },
      substitutionsFrom: {
        orderBy: { toConcept: { canonicalName: "asc" } },
        select: { toConcept: { select: { id: true, canonicalName: true } } },
      },
    },
  });
  if (!concept || concept.status === "DEPRECATED") return null;

  const [referenceCount, mentions, approval] = await Promise.all([
    db.ingredientMention.count({
      where: { conceptId: id, parsedLine: { isActive: true } },
    }),
    db.ingredientMention.findMany({
      where: { conceptId: id, parsedLine: { isActive: true } },
      orderBy: { createdAt: "desc" },
      take: REFERENCE_LIMIT,
      select: {
        id: true,
        parsedLine: {
          select: {
            reference: true,
            noteId: true,
            Note: { select: { title: true } },
          },
        },
      },
    }),
    db.lexiconDecision.findFirst({
      where: {
        type: { in: ["APPROVE_CONCEPT", "CREATE_CONCEPT"] },
        revertedById: null,
        OR: [
          { payload: { path: ["conceptId"], equals: id } },
          {
            effects: {
              path: ["created"],
              array_contains: [{ table: "FoodConcept", id }],
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const categories = concept.classifications
    .filter(
      (row) => row.key.startsWith(CATEGORY_PREFIX) && row.value === "TRUE"
    )
    .map((row) => row.key.slice(CATEGORY_PREFIX.length))
    .sort((a, b) => a.localeCompare(b));
  const classifications = (
    await getEffectiveClassificationsForMany([id], db)
  ).get(id);
  const sourceIds = [
    ...new Set(
      (classifications?.inherited ?? []).flatMap((row) =>
        row.source === "INHERITED" ? [row.inheritedFromConceptId] : []
      )
    ),
  ];
  const sources = await db.foodConcept.findMany({
    where: { id: { in: sourceIds } },
    select: { id: true, canonicalName: true },
  });
  const names = new Map(sources.map((row) => [row.id, row.canonicalName]));
  return {
    id: concept.id,
    name: concept.canonicalName,
    plural:
      concept.entries.find((entry) => entry.kind === "PLURAL")?.text ?? null,
    isReviewed: concept.status === "VERIFIED",
    reviewedAt:
      concept.status === "VERIFIED"
        ? (approval?.createdAt.toISOString() ?? null)
        : null,
    isComposedIngredient:
      concept.isComposed ||
      concept.outgoing.some((row) =>
        COMPOSING_RELATIONSHIP_TYPES.includes(row.type)
      ),
    propertyStates: propertyStatesFor(classifications, names),
    dietaryTags: dietaryTagsFor(propertiesInEffect(classifications)),
    aliases: concept.entries
      .filter((entry) => entry.kind !== "CANONICAL" && entry.kind !== "PLURAL")
      .filter(
        (entry) =>
          entryMatchKey(entry.text) !== entryMatchKey(concept.canonicalName)
      )
      .map((entry) => ({ id: entry.id, name: entry.text })),
    substitutions: concept.substitutionsFrom.map((row) => ({
      id: row.toConcept.id,
      name: row.toConcept.canonicalName,
    })),
    relationships: concept.outgoing.map((row) => ({
      relationshipType: row.type,
      ingredient: { id: row.target.id, name: row.target.canonicalName },
    })),
    variants: concept.incoming.map((row) => ({
      relationshipType: row.type,
      ingredient: { id: row.source.id, name: row.source.canonicalName },
    })),
    categories,
    tags: concept.tags.map((tag) => tag.name),
    referenceCount,
    references: mentions.map((mention) => ({
      id: mention.id,
      reference: mention.parsedLine.reference,
      noteId: mention.parsedLine.noteId,
      noteTitle: mention.parsedLine.Note?.title ?? null,
    })),
  };
}

/**
 * What the card's Save sends.
 *
 * @example
 * { id, name: "green onion", plural: "green onions", aliases: ["scallion"], relationships: [{ ingredientId: <onion>, relationshipType: "IS_A" }], properties: ["VEGETABLE"], excludedProperties: [], categories: ["Produce"], tags: [], substitutionIds: [], isComposedIngredient: false, markReviewed: true, advanceToNext: false }
 */
export interface IngredientCardSaveInput {
  id: string;
  name: string;
  plural: string | null;
  aliases: string[];
  /** The complete set of foods this one relates to; relationships left out are retired. */
  relationships: {
    ingredientId: string;
    relationshipType: FoodRelationshipType;
  }[];
  /** Stored properties set to "contains" on this food. */
  properties: IngredientStoredProperty[];
  /** Stored properties set to "does not contain", overriding what it would inherit. */
  excludedProperties: IngredientStoredProperty[];
  categories: string[];
  tags: string[];
  substitutionIds: string[];
  isComposedIngredient: boolean;
  markReviewed: boolean;
  advanceToNext: boolean;
}

/**
 * The lexicon side of a card save as one EDIT_CONCEPT payload: the concept's active names become exactly name (CANONICAL), plural (PLURAL), and aliases (ALIAS), and its relationships become exactly the chosen ones. Returns null when nothing in the lexicon changes.
 *
 * @example
 * await planIngredientEdit({ ...input, name: "green onion" }) // { type: "EDIT_CONCEPT", conceptId, canonicalName: "green onion", addNames: [{ text: "green onion", kind: "CANONICAL" }], setNameKinds: [{ entryId: <scallion>, kind: "ALIAS" }] }
 */
export async function planIngredientEdit(
  input: IngredientCardSaveInput,
  db: DbClient = prisma
): Promise<Extract<DecisionPayload, { type: "EDIT_CONCEPT" }> | null> {
  const concept = await db.foodConcept.findUnique({
    where: { id: input.id },
    select: {
      canonicalName: true,
      status: true,
      entries: {
        where: { role: "FOOD", status: { not: "DEPRECATED" } },
        select: { id: true, text: true, kind: true, status: true },
      },
      outgoing: {
        where: { status: { not: "DEPRECATED" } },
        orderBy: { createdAt: "asc" },
        select: { targetId: true, type: true },
      },
    },
  });
  if (!concept || concept.status === "DEPRECATED")
    throw new OntologyError("That ingredient no longer exists");

  const name = input.name.trim();
  const desired = new Map<
    string,
    { text: string; kind: "CANONICAL" | "PLURAL" | "ALIAS" }
  >();
  desired.set(entryMatchKey(name), { text: name, kind: "CANONICAL" });
  const plural = input.plural?.trim();
  if (plural && !desired.has(entryMatchKey(plural)))
    desired.set(entryMatchKey(plural), { text: plural, kind: "PLURAL" });
  for (const alias of input.aliases.map((text) => text.trim()).filter(Boolean))
    if (!desired.has(entryMatchKey(alias)))
      desired.set(entryMatchKey(alias), { text: alias, kind: "ALIAS" });

  const current = new Map(
    concept.entries.map((entry) => [entryMatchKey(entry.text), entry])
  );
  for (const alias of input.aliases) {
    if (current.has(entryMatchKey(alias))) continue;
    const owner = await findIngredientNameOwner(alias, input.id, db);
    if (owner)
      throw new OntologyError(
        `“${alias.trim()}” is already a name of ${owner.name}`
      );
  }
  const addNames: { text: string; kind: "CANONICAL" | "PLURAL" | "ALIAS" }[] =
    [];
  const setNameKinds: {
    entryId: string;
    kind: "CANONICAL" | "PLURAL" | "ALIAS";
  }[] = [];
  for (const [key, want] of desired) {
    const have = current.get(key);
    if (!have) addNames.push(want);
    else if (have.kind !== want.kind)
      setNameKinds.push({ entryId: have.id, kind: want.kind });
  }
  const retireEntryIds = concept.entries
    .filter((entry) => !desired.has(entryMatchKey(entry.text)))
    .map((entry) => entry.id);

  const relationKey = (targetId: string, type: FoodRelationshipType) =>
    `${targetId}:${type}`;
  const wantedRelations = new Map(
    input.relationships
      .filter((relation) => relation.ingredientId !== input.id)
      .map((relation) => [
        relationKey(relation.ingredientId, relation.relationshipType),
        {
          targetConceptId: relation.ingredientId,
          relationshipType: relation.relationshipType,
        },
      ])
  );
  const currentRelations = new Map(
    concept.outgoing.map((relation) => [
      relationKey(relation.targetId, relation.type),
      { targetConceptId: relation.targetId, relationshipType: relation.type },
    ])
  );
  const addRelationships = [...wantedRelations]
    .filter(([key]) => !currentRelations.has(key))
    .map(([, relation]) => relation);
  const retireRelationships = [...currentRelations]
    .filter(([key]) => !wantedRelations.has(key))
    .map(([, relation]) => relation);

  const renamed = name !== concept.canonicalName;
  if (
    !renamed &&
    addNames.length === 0 &&
    setNameKinds.length === 0 &&
    retireEntryIds.length === 0 &&
    addRelationships.length === 0 &&
    retireRelationships.length === 0
  )
    return null;
  return {
    type: "EDIT_CONCEPT",
    conceptId: input.id,
    ...(renamed ? { canonicalName: name } : {}),
    ...(addNames.length ? { addNames } : {}),
    ...(setNameKinds.length ? { setNameKinds } : {}),
    ...(retireEntryIds.length ? { retireEntryIds } : {}),
    ...(addRelationships.length ? { addRelationships } : {}),
    ...(retireRelationships.length ? { retireRelationships } : {}),
  };
}

/** The card's non-lexicon fields: properties, categories, tags, substitutes, and the composed flag. None of them changes how lines resolve. */
async function applyIngredientDetails(
  input: IngredientCardSaveInput,
  db: DbClient
): Promise<void> {
  const existing = await db.foodClassification.findMany({
    where: { conceptId: input.id },
    select: { key: true, value: true },
  });
  const contains = new Set(input.properties);
  const excluded = new Set(input.excludedProperties);
  for (const property of INGREDIENT_STORED_PROPERTIES) {
    const { kind, key } = INGREDIENT_PROPERTY_CLASSIFICATIONS[property];
    const current = existing.find(
      (classification) => classification.key === key
    )?.value;
    const wanted = contains.has(property)
      ? "TRUE"
      : excluded.has(property)
        ? "FALSE"
        : null;
    if (wanted && current !== wanted)
      await setClassification(db, {
        conceptId: input.id,
        kind,
        key,
        value: wanted,
      });
    else if (!wanted && current !== undefined)
      await removeClassification(input.id, key, db);
  }

  const categoryKeys = new Set(
    input.categories
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => `${CATEGORY_PREFIX}${name}`)
  );
  for (const row of existing)
    if (row.key.startsWith(CATEGORY_PREFIX) && !categoryKeys.has(row.key))
      await removeClassification(input.id, row.key, db);
  for (const key of categoryKeys)
    if (!existing.some((row) => row.key === key && row.value === "TRUE"))
      await setClassification(db, {
        conceptId: input.id,
        kind: "CATEGORY",
        key,
        value: "TRUE",
      });

  await setConceptTags(input.id, input.tags, db);

  const substitutes = new Set(
    input.substitutionIds.filter((id) => id !== input.id)
  );
  const currentSubstitutes = await db.foodSubstitution.findMany({
    where: { fromConceptId: input.id },
    select: { toConceptId: true },
  });
  for (const row of currentSubstitutes)
    if (!substitutes.has(row.toConceptId))
      await db.foodSubstitution.deleteMany({
        where: { fromConceptId: input.id, toConceptId: row.toConceptId },
      });
  for (const toConceptId of substitutes)
    if (!currentSubstitutes.some((row) => row.toConceptId === toConceptId))
      await setSubstitution({ fromConceptId: input.id, toConceptId }, db);

  await db.foodConcept.update({
    where: { id: input.id },
    data: {
      isComposed:
        input.isComposedIngredient ||
        input.relationships.some((relation) =>
          COMPOSING_RELATIONSHIP_TYPES.includes(relation.relationshipType)
        ),
    },
  });
}

/**
 * The next food waiting for review after `name`, alphabetically (wrapping to the first), for "Save and next".
 *
 * @example
 * await nextUnreviewedIngredientId("chicken drumstick", drumstickId) // "<lemon zest id>"
 */
export async function nextUnreviewedIngredientId(
  name: string,
  excludeId: string,
  db: DbClient = prisma
): Promise<string | null> {
  const where = { status: "PROPOSED" as const, id: { not: excludeId } };
  const after = await db.foodConcept.findFirst({
    where: { ...where, canonicalName: { gt: name } },
    orderBy: { canonicalName: "asc" },
    select: { id: true },
  });
  if (after) return after.id;
  const first = await db.foodConcept.findFirst({
    where,
    orderBy: { canonicalName: "asc" },
    select: { id: true },
  });
  return first?.id ?? null;
}

export interface IngredientCardSaveResult {
  /** Decisions the save applied (an EDIT_CONCEPT for lexicon changes, then an APPROVE_CONCEPT when it marked a proposed food reviewed), in order; the caller reinterprets their affected mentions. */
  decisions: ApplyDecisionResult[];
  nextId: string | null;
}

/**
 * Saves the ingredient card (the old ingredient editor, now backed by the ontology): lexicon changes go through one EDIT_CONCEPT decision, the other fields are written directly, and saving a proposed food approves it (an APPROVE_CONCEPT decision), as the old card marked ingredients reviewed.
 *
 * @example
 * const { decisions, nextId } = await saveIngredientCard(input, userId);
 */
export async function saveIngredientCard(
  input: IngredientCardSaveInput,
  userId: string,
  db: DbClient = prisma
): Promise<IngredientCardSaveResult> {
  const decisions: ApplyDecisionResult[] = [];
  const edit = await planIngredientEdit(input, db);
  if (edit) decisions.push(await applyDecision({ payload: edit, userId }));
  await applyIngredientDetails(input, db);

  const concept = await db.foodConcept.findUniqueOrThrow({
    where: { id: input.id },
    select: { status: true, canonicalName: true },
  });
  if (input.markReviewed && concept.status === "PROPOSED")
    decisions.push(
      await applyDecision({
        payload: { type: "APPROVE_CONCEPT", conceptId: input.id },
        userId,
      })
    );
  const nextId = input.advanceToNext
    ? await nextUnreviewedIngredientId(concept.canonicalName, input.id, db)
    : null;
  return { decisions, nextId };
}

/**
 * "Add ingredient": a new approved food with its name and plural, through a CREATE_CONCEPT decision.
 *
 * @example
 * await createIngredientConcept({ name: "shallot", plural: "shallots" }, userId) // { id: "0193...", decision: { revision: 31, ... } }
 */
export async function createIngredientConcept(
  input: { name: string; plural: string | null },
  userId: string,
  db: DbClient = prisma
): Promise<{ id: string; decision: ApplyDecisionResult }> {
  const name = input.name.trim();
  const existing = await db.foodConcept.findFirst({
    where: {
      canonicalName: { equals: name, mode: "insensitive" },
      status: { not: "DEPRECATED" },
    },
    select: { id: true },
  });
  if (existing)
    throw new OntologyError(`An ingredient named “${name}” already exists`);
  const decision = await applyDecision({
    payload: {
      type: "CREATE_CONCEPT",
      canonicalName: name,
      phrase: name,
      relationships: [],
      ...(input.plural?.trim() ? { plural: input.plural.trim() } : {}),
    },
    userId,
  });
  const created = decision.effects.created.find(
    (row) => row.table === "FoodConcept"
  );
  if (!created) throw new OntologyError("The ingredient was not created");
  return { id: created.id, decision };
}
