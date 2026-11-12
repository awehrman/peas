/**
 * Ontology vocabulary shared by the database, queue, and web packages. Each
 * list mirrors a Prisma enum in packages/database/prisma/schemas/ontology.prisma;
 * the database tests fail if they drift apart.
 */

/** Lifecycle of a food concept. Merged concepts become DEPRECATED. */
export const CONCEPT_STATUSES = ["PROPOSED", "VERIFIED", "DEPRECATED"] as const;
export type ConceptStatus = (typeof CONCEPT_STATUSES)[number];

/** Lifecycle of a stored lexicon entry or relationship. The parser only sees ACTIVE and PROPOSED entries. */
export const ENTRY_STATUSES = ["PROPOSED", "ACTIVE", "DEPRECATED"] as const;
export type EntryStatus = (typeof ENTRY_STATUSES)[number];

/**
 * How a FOOD entry names its concept.
 *
 * @example
 * // concept "scallion"
 * "scallion" CANONICAL, "scallions" PLURAL, "green onion" REGIONAL, "spring onion" ALIAS
 */
export const LEXICON_TERM_KINDS = [
  "CANONICAL",
  "ALIAS",
  "PLURAL",
  "REGIONAL",
  "ABBREVIATION",
  "VARIANT",
] as const;
export type LexiconTermKind = (typeof LEXICON_TERM_KINDS)[number];

/**
 * Directed relationships from the more specific concept (source) to the more general or originating one (target).
 *
 * @example
 * "granny smith apple" IS_A "apple"
 * "chicken thigh" PART_OF "chicken"
 * "buttermilk" DERIVED_FROM "milk"
 * "raisin" PROCESSED_FROM "grape"
 */
export const FOOD_RELATIONSHIP_TYPES = [
  "IS_A",
  "PART_OF",
  "DERIVED_FROM",
  "PROCESSED_FROM",
] as const;
export type FoodRelationshipType = (typeof FOOD_RELATIONSHIP_TYPES)[number];

/** Relationship types that form a hierarchy and therefore must stay acyclic. */
export const HIERARCHICAL_RELATIONSHIP_TYPES: readonly FoodRelationshipType[] =
  ["IS_A", "PART_OF"];

export const ATTRIBUTE_VALUE_TYPES = [
  "ENUM",
  "NUMBER",
  "BOOLEAN",
  "TEXT",
] as const;
export type AttributeValueType = (typeof ATTRIBUTE_VALUE_TYPES)[number];

/**
 * Families of classification keys.
 *
 * @example
 * FOOD_GROUP "DAIRY", DIETARY "VEGAN", ALLERGEN "ALLERGEN_PEANUT", CATEGORY "CATEGORY:Spices", CERTIFICATION "KOSHER"
 */
export const CLASSIFICATION_KINDS = [
  "FOOD_GROUP",
  "DIETARY",
  "ALLERGEN",
  "CATEGORY",
  "CERTIFICATION",
] as const;
export type ClassificationKind = (typeof CLASSIFICATION_KINDS)[number];

export const TRI_STATES = ["TRUE", "FALSE", "UNKNOWN"] as const;
export type TriState = (typeof TRI_STATES)[number];

/**
 * Where a stored value came from.
 *
 * - LEGACY: migrated from the old Ingredient tables
 * - MANUAL: entered by a person
 * - ASSERTED: stated in the ingredient text ("boneless")
 * - INFERRED: derived by the resolver or by inheritance
 */
export const VALUE_SOURCES = [
  "LEGACY",
  "MANUAL",
  "ASSERTED",
  "INFERRED",
] as const;
export type ValueSource = (typeof VALUE_SOURCES)[number];

export const RESOLUTION_STATUSES = [
  "UNRESOLVED",
  "AUTO_RESOLVED",
  "NEEDS_REVIEW",
  "VERIFIED",
] as const;
export type ResolutionStatus = (typeof RESOLUTION_STATUSES)[number];

/** Where a preparation sits relative to the food head: "minced garlic" (PRE_HEAD), "garlic, minced" (POST_HEAD). */
export const PREP_POSITIONS = ["PRE_HEAD", "POST_HEAD"] as const;
export type PrepPosition = (typeof PREP_POSITIONS)[number];

export const DISCOVERY_STATUSES = [
  "OPEN",
  "DEFERRED",
  "RESOLVED",
  "REJECTED",
] as const;
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];

export const LEGACY_MAPPING_STATUSES = [
  "PENDING",
  "MAPPED",
  "NEEDS_REVIEW",
  "SKIPPED",
] as const;
export type LegacyMappingStatus = (typeof LEGACY_MAPPING_STATUSES)[number];
