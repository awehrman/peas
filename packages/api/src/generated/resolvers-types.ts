import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { ConceptParent, DiscoveryParent, IngredientLineParent, LexiconEntryDetailParent } from './teach-views-types.js';
import type { ApiContext } from '../context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Any JSON value. Used for typed payloads validated on the server, e.g. a DecisionPayload from @peas/parser/v2: { "type": "MAP_TO_CONCEPT", "phrase": "icing sugar", "conceptId": "0193...", "kind": "ALIAS" }. */
  JSON: { input: unknown; output: unknown; }
};

/**
 * A reviewer's decision. `payload` must match DecisionPayloadSchema in @peas/parser/v2; set discoveryId when the decision answers a discovery.
 *
 * Example: { "payload": { "type": "MAP_TO_CONCEPT", "phrase": "icing sugar", "conceptId": "0193...", "kind": "ALIAS" }, "discoveryId": "0193..." }
 */
export type ApplyDecisionInput = {
  discoveryId?: InputMaybe<Scalars['ID']['input']>;
  payload: Scalars['JSON']['input'];
};

/** Example: { "success": true, "summary": "Taught: icing sugar is powdered sugar", "revision": 15, "mentionsUpdated": 12, "needsBackgroundReinterpret": false, "reinterpretCommand": null } */
export type ApplyDecisionPayload = MutationPayload & {
  __typename?: 'ApplyDecisionPayload';
  decisionId?: Maybe<Scalars['ID']['output']>;
  effect: MutationEffect;
  /** Mentions whose reading changed in this request. */
  mentionsUpdated?: Maybe<Scalars['Int']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  /** True when more lines were affected than one request reinterprets; the queue picks them up and effect.reprocessingJobId tracks the run. */
  needsBackgroundReinterpret: Scalars['Boolean']['output'];
  /** Fallback when the queue could not be reached, e.g. "yarn workspace @peas/queue reinterpret --revision 15 --decision 0193..." */
  reinterpretCommand?: Maybe<Scalars['String']['output']>;
  revision?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
  /** What was taught, for the confirmation toast. */
  summary?: Maybe<Scalars['String']['output']>;
};

/** Example: { "id": "0193...", "key": "bone", "name": "Bone" } */
export type AttributeDefinitionOption = {
  __typename?: 'AttributeDefinitionOption';
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

/** asserted counts values written in the text rather than inferred from the concept. Example: { "definitionName": "Bone", "label": "boneless", "direct": 0, "expanded": 8, "asserted": 8 } */
export type AttributeUsage = {
  __typename?: 'AttributeUsage';
  asserted: Scalars['Int']['output'];
  definitionKey: Scalars['String']['output'];
  definitionName: Scalars['String']['output'];
  direct: Scalars['Int']['output'];
  expanded: Scalars['Int']['output'];
  label: Scalars['String']['output'];
  valueKey: Scalars['String']['output'];
};

/** Example: { "id": "0193...", "key": "boneless", "label": "Boneless", "definitionId": "0193...", "definitionKey": "bone", "definitionName": "Bone" } */
export type AttributeValueOption = {
  __typename?: 'AttributeValueOption';
  definitionId: Scalars['ID']['output'];
  definitionKey: Scalars['String']['output'];
  definitionName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
};

export type BasicPayload = MutationPayload & {
  __typename?: 'BasicPayload';
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** A cookbook (a work). ISBNs are set only when the edition is known. Example: { "title": "Salt, Fat, Acid, Heat", "authors": ["Samin Nosrat"], "publishedYear": 2017, "matchStatus": "AUTO_MATCHED" } */
export type Book = {
  __typename?: 'Book';
  authors: Array<Scalars['String']['output']>;
  /** Open Library cover id; the image is https://covers.openlibrary.org/b/id/<coverId>-M.jpg. */
  coverId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isbn10?: Maybe<Scalars['String']['output']>;
  isbn13?: Maybe<Scalars['String']['output']>;
  matchStatus: BookMatchStatus;
  /** Example: "/works/OL17801197W". */
  openLibraryWorkKey?: Maybe<Scalars['String']['output']>;
  publishedYear?: Maybe<Scalars['Int']['output']>;
  publisher?: Maybe<Scalars['String']['output']>;
  subtitle?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

/** One Open Library candidate with why it ranked where it did. */
export type BookCandidate = {
  __typename?: 'BookCandidate';
  authors: Array<Scalars['String']['output']>;
  coverId?: Maybe<Scalars['Int']['output']>;
  editionCount?: Maybe<Scalars['Int']['output']>;
  evidence: Array<Scalars['String']['output']>;
  firstPublishYear?: Maybe<Scalars['Int']['output']>;
  /** ISBNs the provider lists for the work; not attached to the book without edition evidence. */
  isbns: Array<Scalars['String']['output']>;
  matchedIsbn?: Maybe<Scalars['String']['output']>;
  publishers: Array<Scalars['String']['output']>;
  score: Scalars['Float']['output'];
  subtitle?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  workKey: Scalars['ID']['output'];
};

/** One lookup per distinct source text, shared by every note citing it. */
export type BookLookup = {
  __typename?: 'BookLookup';
  attempts: Scalars['Int']['output'];
  book?: Maybe<Book>;
  candidates: Array<BookCandidate>;
  errorReason?: Maybe<Scalars['String']['output']>;
  fetchedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  noteCount: Scalars['Int']['output'];
  query: Scalars['String']['output'];
  status: BookLookupStatus;
};

/** The shared bibliographic lookup for a source text. */
export type BookLookupRef = {
  __typename?: 'BookLookupRef';
  id: Scalars['ID']['output'];
  status: BookLookupStatus;
};

export type BookLookupStatus =
  | 'AMBIGUOUS'
  | 'ERROR'
  | 'LEFT_UNRESOLVED'
  | 'MATCHED'
  | 'NO_MATCH'
  | 'PENDING';

export type BookLookupsPage = {
  __typename?: 'BookLookupsPage';
  items: Array<BookLookup>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** How a book was identified: not yet, automatically from Open Library, confirmed by a reviewer, or entered by hand. */
export type BookMatchStatus =
  | 'AUTO_MATCHED'
  | 'CONFIRMED'
  | 'MANUAL'
  | 'UNMATCHED';

/** A recipe category. CONCEPT categories match recipes that mention the food or one reached through `traversal` (IS_A and PART_OF by default; DERIVED_FROM and PROCESSED_FROM only when added). */
export type Category = {
  __typename?: 'Category';
  approvedCount: Scalars['Int']['output'];
  concept?: Maybe<ConceptRef>;
  description?: Maybe<Scalars['String']['output']>;
  excludedCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  inferredCount: Scalars['Int']['output'];
  kind: CategoryKind;
  name: Scalars['String']['output'];
  ruleVersion: Scalars['Int']['output'];
  slug: Scalars['String']['output'];
  traversal: Array<FoodRelationshipType>;
};

export type CategoryAssignmentOrigin =
  | 'CONCEPT_RULE'
  | 'DUPLICATE_MERGE'
  | 'IMPORT'
  | 'MANUAL';

/** INFERRED from ingredients, APPROVED by a reviewer (or added by hand), or EXCLUDED by a reviewer. Recomputation only changes INFERRED memberships. */
export type CategoryAssignmentState =
  | 'APPROVED'
  | 'EXCLUDED'
  | 'INFERRED';

/** Why a category was inferred: chicken thigh -> PART_OF -> chicken. */
export type CategoryEvidence = {
  __typename?: 'CategoryEvidence';
  conceptId: Scalars['ID']['output'];
  conceptName: Scalars['String']['output'];
  lineId: Scalars['ID']['output'];
  mentionId: Scalars['ID']['output'];
  /** Empty when the mention names the category's food itself. */
  path: Array<CategoryEvidenceStep>;
};

/** One edge on the way from a mentioned food to the category's food. Example: { "type": "PART_OF", "conceptName": "chicken" } */
export type CategoryEvidenceStep = {
  __typename?: 'CategoryEvidenceStep';
  conceptId: Scalars['ID']['output'];
  conceptName: Scalars['String']['output'];
  type: FoodRelationshipType;
};

/** Example: { "name": "Chicken", "conceptId": "0193...", "traversal": ["IS_A", "PART_OF"] }. Without conceptId the category is MANUAL. */
export type CategoryInput = {
  conceptId?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  traversal?: InputMaybe<Array<FoodRelationshipType>>;
};

/** MANUAL categories hold what reviewers put in them; CONCEPT categories also infer members from ingredients. */
export type CategoryKind =
  | 'CONCEPT'
  | 'MANUAL';

/** A note's membership in a category, with how it got there. */
export type CategoryMembership = {
  __typename?: 'CategoryMembership';
  category: CategoryRef;
  decidedAt?: Maybe<Scalars['String']['output']>;
  evidence: Array<CategoryEvidence>;
  id: Scalars['ID']['output'];
  origin: CategoryAssignmentOrigin;
  state: CategoryAssignmentState;
};

/** Which memberships a category filter counts. */
export type CategoryProvenance =
  | 'ANY'
  | 'APPROVED'
  | 'INFERRED';

/** Example: { "id": "cm3c...", "name": "Chicken", "slug": "chicken", "kind": "CONCEPT" } */
export type CategoryRef = {
  __typename?: 'CategoryRef';
  id: Scalars['ID']['output'];
  kind: CategoryKind;
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type CategoryRuleExample = {
  __typename?: 'CategoryRuleExample';
  evidence: Array<CategoryEvidence>;
  noteId: Scalars['ID']['output'];
  title?: Maybe<Scalars['String']['output']>;
};

/** How many notes a rule would include, before it is saved. */
export type CategoryRulePreview = {
  __typename?: 'CategoryRulePreview';
  examples: Array<CategoryRuleExample>;
  noteCount: Scalars['Int']['output'];
};

export type ClassificationKind =
  | 'ALLERGEN'
  | 'CATEGORY'
  | 'CERTIFICATION'
  | 'DIETARY'
  | 'FOOD_GROUP';

export type ClassificationValue =
  | 'FALSE'
  | 'TRUE'
  | 'UNKNOWN';

export type CleanupAllDataPayload = MutationPayload & {
  __typename?: 'CleanupAllDataPayload';
  deletedCounts?: Maybe<Array<DeletedCount>>;
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/**
 * Everything shown on the concept page.
 *
 * Example: query { concept(id: "0193...") { canonicalName entries { text kind } parents { type concept { canonicalName } } classifications { key value source } } }
 */
export type Concept = {
  __typename?: 'Concept';
  attributes: Array<ConceptAttributeValue>;
  canonicalName: Scalars['String']['output'];
  /** Edges where this concept is the more general side. */
  children: Array<ConceptRelationship>;
  classifications: Array<ConceptClassification>;
  decisions: Array<ConceptDecision>;
  description?: Maybe<Scalars['String']['output']>;
  /** How the concept is prepared and described across its mentions, direct and expanded. */
  distributions: ConceptDistributions;
  entries: Array<ConceptEntry>;
  id: Scalars['ID']['output'];
  isComposed: Scalars['Boolean']['output'];
  mentions: Array<ConceptMention>;
  mergedInto?: Maybe<ConceptRef>;
  /** The concept's names with how many direct mentions were written each way, most used first. */
  observedForms: ConceptObservedForms;
  /** Edges where this concept is the more specific side, e.g. chicken thigh PART_OF chicken. */
  parents: Array<ConceptRelationship>;
  slug: Scalars['String']['output'];
  status: ConceptStatus;
  /** Concepts that can stand in for this one. */
  substitutions: Array<ConceptSubstitution>;
  tags: Array<Scalars['String']['output']>;
  /** How often the concept appears in active lines of unarchived notes, directly and through more specific concepts. expand defaults to [IS_A, PART_OF] (kinds and parts); only settled mentions (AUTO_RESOLVED, VERIFIED) count unless includeNeedsReview. Example: usage(expand: [IS_A, PART_OF, PROCESSED_FROM]) */
  usage: ConceptUsage;
};


/**
 * Everything shown on the concept page.
 *
 * Example: query { concept(id: "0193...") { canonicalName entries { text kind } parents { type concept { canonicalName } } classifications { key value source } } }
 */
export type ConceptDistributionsArgs = {
  expand?: InputMaybe<Array<FoodRelationshipType>>;
  includeNeedsReview?: InputMaybe<Scalars['Boolean']['input']>;
};


/**
 * Everything shown on the concept page.
 *
 * Example: query { concept(id: "0193...") { canonicalName entries { text kind } parents { type concept { canonicalName } } classifications { key value source } } }
 */
export type ConceptObservedFormsArgs = {
  includeNeedsReview?: InputMaybe<Scalars['Boolean']['input']>;
};


/**
 * Everything shown on the concept page.
 *
 * Example: query { concept(id: "0193...") { canonicalName entries { text kind } parents { type concept { canonicalName } } classifications { key value source } } }
 */
export type ConceptUsageArgs = {
  expand?: InputMaybe<Array<FoodRelationshipType>>;
  includeNeedsReview?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Example: { "attributeValueId": "0193...", "definitionKey": "preservation", "valueKey": "canned", "label": "Canned" } */
export type ConceptAttributeValue = {
  __typename?: 'ConceptAttributeValue';
  attributeValueId: Scalars['ID']['output'];
  definitionKey: Scalars['String']['output'];
  label: Scalars['String']['output'];
  valueKey: Scalars['String']['output'];
};

/** An effective classification. Example: { "key": "ALLERGEN_MILK", "kind": "ALLERGEN", "value": "TRUE", "source": "INHERITED", "inheritedFrom": { "canonicalName": "milk" } } */
export type ConceptClassification = {
  __typename?: 'ConceptClassification';
  inheritedFrom?: Maybe<ConceptRef>;
  /** True when this concept stores the value itself, so it can be removed here. */
  isExplicit: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  /** EXPLICIT, INHERITED, or CONFLICT. */
  source: Scalars['String']['output'];
  /** TRUE, FALSE, or UNKNOWN. */
  value: Scalars['String']['output'];
};

/** Example: { "conceptId": "0193...", "kind": "CATEGORY", "key": "CATEGORY:Spices", "value": "TRUE", "note": null } */
export type ConceptClassificationInput = {
  conceptId: Scalars['ID']['input'];
  /** e.g. VEGAN, DAIRY, ALLERGEN_PEANUT, CATEGORY:Spices */
  key: Scalars['String']['input'];
  kind: ClassificationKind;
  note?: InputMaybe<Scalars['String']['input']>;
  value: ClassificationValue;
};

/** Example: { "id": "0193...", "type": "MAP_TO_CONCEPT", "revision": 14, "username": "allie", "canRevert": true } */
export type ConceptDecision = {
  __typename?: 'ConceptDecision';
  canRevert: Scalars['Boolean']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  reverted: Scalars['Boolean']['output'];
  revision: Scalars['Int']['output'];
  type: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

/** Most common first, at most 25 rows per list. */
export type ConceptDistributions = {
  __typename?: 'ConceptDistributions';
  attributes: Array<AttributeUsage>;
  expand: Array<FoodRelationshipType>;
  includeNeedsReview: Scalars['Boolean']['output'];
  modifiers: Array<ModifierUsage>;
  preparations: Array<PreparationUsage>;
};

/** A way of writing a concept. Example: { "id": "0193...", "text": "confectioners sugar", "kind": "ALIAS", "status": "ACTIVE" } */
export type ConceptEntry = {
  __typename?: 'ConceptEntry';
  id: Scalars['ID']['output'];
  /** CANONICAL, ALIAS, PLURAL, REGIONAL, ABBREVIATION, or VARIANT. */
  kind?: Maybe<Scalars['String']['output']>;
  /** PROPOSED, ACTIVE, or DEPRECATED. */
  status: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type ConceptGraph = {
  __typename?: 'ConceptGraph';
  centerId: Scalars['ID']['output'];
  depth: Scalars['Int']['output'];
  direction: GraphDirection;
  edges: Array<ConceptGraphEdge>;
  nodes: Array<ConceptGraphNode>;
  /** True when the 150-food limit stopped the walk. */
  truncated: Scalars['Boolean']['output'];
  types: Array<FoodRelationshipType>;
};

/** The decision that created a relationship. */
export type ConceptGraphDecision = {
  __typename?: 'ConceptGraphDecision';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  revision: Scalars['Int']['output'];
  type: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

/** From the more specific food (sourceId) to the more general or originating one (targetId). decision is null for seeded relationships. */
export type ConceptGraphEdge = {
  __typename?: 'ConceptGraphEdge';
  decision?: Maybe<ConceptGraphDecision>;
  id: Scalars['ID']['output'];
  sourceId: Scalars['ID']['output'];
  /** PROPOSED or ACTIVE. */
  status: Scalars['String']['output'];
  targetId: Scalars['ID']['output'];
  type: FoodRelationshipType;
};

/** A food in a neighborhood. level is its signed distance from the center: negative for more general foods, positive for more specific ones. Example: { "id": "0193...", "canonicalName": "chicken", "level": -1, "directMentions": 3 } */
export type ConceptGraphNode = {
  __typename?: 'ConceptGraphNode';
  canonicalName: Scalars['String']['output'];
  directMentions: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  level: Scalars['Int']['output'];
  status: ConceptStatus;
};

/** Example: { "mentionId": "0193...", "lineText": "2 tbsp powdered sugar", "noteTitle": "Lemon Bars", "verified": false } */
export type ConceptMention = {
  __typename?: 'ConceptMention';
  lineText: Scalars['String']['output'];
  mentionId: Scalars['ID']['output'];
  noteId?: Maybe<Scalars['ID']['output']>;
  noteTitle?: Maybe<Scalars['String']['output']>;
  rawText: Scalars['String']['output'];
  verified: Scalars['Boolean']['output'];
};

export type ConceptObservedForms = {
  __typename?: 'ConceptObservedForms';
  forms: Array<ObservedForm>;
  /** Direct mentions that reached the concept without one of its names, for example verified by hand. */
  otherMentions: Scalars['Int']['output'];
};

/** One mention behind a concept's usage. path is empty for a direct mention. Example: { "lineText": "4 chicken thighs, diced", "noteTitle": "Braised thighs", "concept": { "canonicalName": "chicken thigh" }, "path": ["PART_OF"], "preparations": ["Dice"] } */
export type ConceptOccurrence = {
  __typename?: 'ConceptOccurrence';
  /** "Dimension: value", e.g. "Bone: Boneless". */
  attributes: Array<Scalars['String']['output']>;
  concept: ConceptRef;
  lineId: Scalars['ID']['output'];
  lineText: Scalars['String']['output'];
  mentionId: Scalars['ID']['output'];
  noteId: Scalars['ID']['output'];
  noteTitle?: Maybe<Scalars['String']['output']>;
  path: Array<FoodRelationshipType>;
  /** Labels with degree, e.g. "Chop (fine)". */
  preparations: Array<Scalars['String']['output']>;
  recipeId?: Maybe<Scalars['ID']['output']>;
  recipeTitle?: Maybe<Scalars['String']['output']>;
  span: TextSpan;
  status: MentionStatus;
};

/** The sources and categories of the notes behind a concept's counted mentions, most notes first. */
export type ConceptOccurrenceFacets = {
  __typename?: 'ConceptOccurrenceFacets';
  categories: Array<OccurrenceCategoryFacet>;
  sources: Array<OccurrenceSourceFacet>;
};

/** Narrows conceptOccurrences. attribute is "definition:value". Example: { "expand": ["IS_A", "PART_OF"], "preparationKey": "dice", "attribute": "bone:boneless", "status": "AUTO_RESOLVED" } */
export type ConceptOccurrenceFilter = {
  attribute?: InputMaybe<Scalars['String']['input']>;
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  expand?: InputMaybe<Array<FoodRelationshipType>>;
  includeNeedsReview?: InputMaybe<Scalars['Boolean']['input']>;
  preparationKey?: InputMaybe<Scalars['String']['input']>;
  sourceId?: InputMaybe<Scalars['ID']['input']>;
  /** AUTO_RESOLVED, VERIFIED, or NEEDS_REVIEW (with includeNeedsReview). */
  status?: InputMaybe<MentionStatus>;
};

/** nextCursor is null on the last page. */
export type ConceptOccurrencePage = {
  __typename?: 'ConceptOccurrencePage';
  items: Array<ConceptOccurrence>;
  nextCursor?: Maybe<Scalars['String']['output']>;
  total: Scalars['Int']['output'];
};

/** A food concept reference. Example: { "id": "0193...", "canonicalName": "powdered sugar", "status": "VERIFIED" } */
export type ConceptRef = {
  __typename?: 'ConceptRef';
  canonicalName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: ConceptStatus;
};

/** A typed edge. Example on "chicken thigh": { "type": "PART_OF", "status": "ACTIVE", "concept": { "canonicalName": "chicken" } } */
export type ConceptRelationship = {
  __typename?: 'ConceptRelationship';
  concept: ConceptRef;
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  /** IS_A, PART_OF, DERIVED_FROM, or PROCESSED_FROM. */
  type: Scalars['String']['output'];
};

export type ConceptStatus =
  | 'DEPRECATED'
  | 'PROPOSED'
  | 'VERIFIED';

/** Example: { "concept": { "canonicalName": "plain yogurt" }, "ratio": "3/4 cup per cup", "note": "thin with milk" } */
export type ConceptSubstitution = {
  __typename?: 'ConceptSubstitution';
  concept: ConceptRef;
  note?: Maybe<Scalars['String']['output']>;
  ratio?: Maybe<Scalars['String']['output']>;
};

/** Example: { "conceptId": "<buttermilk>", "substituteId": "<plain yogurt>", "ratio": "3/4 cup per cup", "note": null } */
export type ConceptSubstitutionInput = {
  conceptId: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  ratio?: InputMaybe<Scalars['String']['input']>;
  substituteId: Scalars['ID']['input'];
};

/** Example: { "id": "0193...", "slug": "powdered-sugar", "canonicalName": "powdered sugar", "status": "VERIFIED", "entryCount": 3, "mentionCount": 12 } */
export type ConceptSummary = {
  __typename?: 'ConceptSummary';
  canonicalName: Scalars['String']['output'];
  entryCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  mentionCount: Scalars['Int']['output'];
  slug: Scalars['String']['output'];
  status: ConceptStatus;
};

/** Example: { "expand": ["IS_A", "PART_OF"], "direct": { "mentions": 3, ... }, "expanded": { "mentions": 15, ... }, "contributors": [...] } */
export type ConceptUsage = {
  __typename?: 'ConceptUsage';
  byStatus: UsageStatusCounts;
  /** Most mentioned first, at most 25. */
  contributors: Array<UsageContributor>;
  direct: UsageCounts;
  expand: Array<FoodRelationshipType>;
  expanded: UsageCounts;
  includeNeedsReview: Scalars['Boolean']['output'];
};

/** A food's direct settled mentions (and the notes they are in) and its mentions including kinds and parts. Example: { "concept": { "canonicalName": "chicken" }, "directMentions": 3, "directNotes": 3, "expandedMentions": 15 } */
export type ConceptUsageRank = {
  __typename?: 'ConceptUsageRank';
  concept: ConceptRef;
  directMentions: Scalars['Int']['output'];
  directNotes: Scalars['Int']['output'];
  expandedMentions: Scalars['Int']['output'];
};

/** Example: query { concepts(query: "sugar", page: 1) { total items { canonicalName } } } */
export type ConceptsPage = {
  __typename?: 'ConceptsPage';
  items: Array<ConceptSummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type ContextLine = {
  __typename?: 'ContextLine';
  contentIndex: Scalars['Int']['output'];
  text: Scalars['String']['output'];
};

/** Corpus-wide usage over settled mentions in active lines of unarchived notes, from the newest background snapshot. rare lists foods mentioned in at most two notes. */
export type CorpusAnalytics = {
  __typename?: 'CorpusAnalytics';
  attributes: Array<CorpusAttributeCount>;
  /** When these numbers were computed. */
  computedAt: Scalars['String']['output'];
  conceptsWithMentions: Scalars['Int']['output'];
  /** True while a newer computation runs because these numbers are over 15 minutes old or predate the current lexicon revision. */
  isStale: Scalars['Boolean']['output'];
  preparations: Array<CorpusPreparationCount>;
  rare: Array<ConceptUsageRank>;
  rareConceptCount: Scalars['Int']['output'];
  settledMentions: Scalars['Int']['output'];
  topDirect: Array<ConceptUsageRank>;
  topExpanded: Array<ConceptUsageRank>;
  /** Approved foods that no settled mention names, directly or through kinds and parts. */
  unusedVerifiedConcepts: Scalars['Int']['output'];
};

export type CorpusAttributeCount = {
  __typename?: 'CorpusAttributeCount';
  /** Written in the text rather than inferred from the food. */
  asserted: Scalars['Int']['output'];
  definitionKey: Scalars['String']['output'];
  definitionName: Scalars['String']['output'];
  label: Scalars['String']['output'];
  mentions: Scalars['Int']['output'];
  valueKey: Scalars['String']['output'];
};

/**
 * How well the corpus is understood, for the Corpus health card on /teach.
 *
 * Example: query { corpusHealth { lineCount mentions { total unresolved } openDiscoveryCount topUnknownPhrases { phrase mentionCount } live { linesPerSecond } } }
 */
export type CorpusHealth = {
  __typename?: 'CorpusHealth';
  awaitingParsing: Scalars['Int']['output'];
  lexiconRevision: Scalars['Int']['output'];
  /** Active ingredient lines. */
  lineCount: Scalars['Int']['output'];
  linesWithMentions: Scalars['Int']['output'];
  /** Null when the queue cannot be reached. */
  live?: Maybe<LiveParseMetrics>;
  mentions: CorpusMentionCounts;
  openDiscoveryCount: Scalars['Int']['output'];
  parsedSuccessfully: Scalars['Int']['output'];
  parsedWithErrors: Scalars['Int']['output'];
  reinterpretBacklog: ReinterpretBacklog;
  topUnknownPhrases: Array<UnknownPhrase>;
};

/** One stored corpus health snapshot. Example: { "takenAt": "2026-11-13T03:00:00.000Z", "trigger": "SCHEDULED", "parserVersion": "2.1.0", "totalMentions": 5402, "unresolvedMentions": 540 } */
export type CorpusHealthSnapshot = {
  __typename?: 'CorpusHealthSnapshot';
  autoResolvedMentions: Scalars['Int']['output'];
  /** Average resolution candidates per mention. */
  avgCandidates: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  lexiconRevision: Scalars['Int']['output'];
  needsReviewMentions: Scalars['Int']['output'];
  openDiscoveries: Scalars['Int']['output'];
  parserVersion: Scalars['String']['output'];
  takenAt: Scalars['String']['output'];
  totalLines: Scalars['Int']['output'];
  totalMentions: Scalars['Int']['output'];
  /** SCHEDULED, REINTERPRET, REPARSE, or MANUAL. */
  trigger: Scalars['String']['output'];
  unresolvedMentions: Scalars['Int']['output'];
  verifiedMentions: Scalars['Int']['output'];
};

/**
 * Everything /teach/health charts.
 *
 * Example: query { corpusHealthTrends(weeks: 12) { parserVersion snapshots { takenAt totalMentions unresolvedMentions } byParserVersion { parserVersion unresolved } reviewByWeek { weekStart decisions } } }
 */
export type CorpusHealthTrends = {
  __typename?: 'CorpusHealthTrends';
  byParserVersion: Array<ParserVersionHealth>;
  mostAmbiguousPhrases: Array<HealthPhrase>;
  /** The running parser's version; lines written by another version are reparsed by startReparse. */
  parserVersion: Scalars['String']['output'];
  /** Oldest first; weeks without decisions are omitted. */
  reviewByWeek: Array<WeeklyReview>;
  /** Oldest first. */
  snapshots: Array<CorpusHealthSnapshot>;
  topUnknownPhrases: Array<HealthPhrase>;
};

/** Example: { "total": 5402, "autoResolved": 4100, "needsReview": 610, "unresolved": 540, "verified": 152 } */
export type CorpusMentionCounts = {
  __typename?: 'CorpusMentionCounts';
  autoResolved: Scalars['Int']['output'];
  needsReview: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  unresolved: Scalars['Int']['output'];
  verified: Scalars['Int']['output'];
};

export type CorpusPreparationCount = {
  __typename?: 'CorpusPreparationCount';
  /** Distinct foods prepared this way. */
  concepts: Scalars['Int']['output'];
  label: Scalars['String']['output'];
  mentions: Scalars['Int']['output'];
  preparationKey: Scalars['String']['output'];
};

export type CreateCategoryPayload = MutationPayload & {
  __typename?: 'CreateCategoryPayload';
  effect: MutationEffect;
  id?: Maybe<Scalars['ID']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Example: { "success": true, "id": "cm3k..." } */
export type CreateIngredientPayload = MutationPayload & {
  __typename?: 'CreateIngredientPayload';
  effect: MutationEffect;
  id?: Maybe<Scalars['ID']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/**
 * Corpus-wide numbers for the dashboard. Top lists hold up to 8 entries.
 *
 * Example: query { dashboardStats { noteCount recipeCount notesByStatus { completed failed } topConcepts { name lineCount } } }
 */
export type DashboardStats = {
  __typename?: 'DashboardStats';
  /** Concepts that have not been merged away. */
  conceptCount: Scalars['Int']['output'];
  ingredientLines: IngredientLineStats;
  instructionLineCount: Scalars['Int']['output'];
  noteCount: Scalars['Int']['output'];
  /** When notes were first saved in Evernote, ascending by year; empty years are omitted. */
  notesBySavedYear: Array<YearCount>;
  notesByStatus: NoteStatusCounts;
  /** Completed notes that have not been promoted to a recipe yet. */
  notesReadyToPromote: Scalars['Int']['output'];
  recipeCount: Scalars['Int']['output'];
  /** Category names by note count. */
  topCategories: Array<LabelCount>;
  /** Concepts mentioned by the most active ingredient lines. */
  topConcepts: Array<TopConcept>;
  /** Websites with the most saved recipe URLs. */
  topSources: Array<LabelCount>;
  /** Tag names by note count. */
  topTags: Array<LabelCount>;
  verifiedConceptCount: Scalars['Int']['output'];
};

/**
 * Before/after impact of a decision, computed without changing anything.
 *
 * Example: query { previewDecision(payload: { type: "MAP_TO_CONCEPT", phrase: "icing sugar", conceptId: "0193...", kind: "ALIAS" }) { counts { affected newlyResolved } examples { lineText after { text } } } }
 */
export type DecisionPreview = {
  __typename?: 'DecisionPreview';
  counts: DecisionPreviewCounts;
  examples: Array<DecisionPreviewExample>;
  revision: Scalars['Int']['output'];
  /** More mentions matched than were scanned. */
  truncated: Scalars['Boolean']['output'];
};

/** Example: { "scanned": 14, "affected": 12, "newlyResolved": 12, "conceptChanged": 12, "attributesChanged": 0, "becameAmbiguous": 0, "becameUnresolved": 0, "verifiedConflicts": 0 } */
export type DecisionPreviewCounts = {
  __typename?: 'DecisionPreviewCounts';
  affected: Scalars['Int']['output'];
  attributesChanged: Scalars['Int']['output'];
  becameAmbiguous: Scalars['Int']['output'];
  becameUnresolved: Scalars['Int']['output'];
  conceptChanged: Scalars['Int']['output'];
  newlyResolved: Scalars['Int']['output'];
  scanned: Scalars['Int']['output'];
  /** Verified mentions the decision would read differently. They are never changed automatically. */
  verifiedConflicts: Scalars['Int']['output'];
};

/** Example: { "lineText": "2 tbsp icing sugar", "noteTitle": "Lemon Bars", "before": { "text": "unresolved: icing sugar" }, "after": { "text": "powdered sugar" }, "verifiedConflict": false } */
export type DecisionPreviewExample = {
  __typename?: 'DecisionPreviewExample';
  after: ResolutionView;
  before: ResolutionView;
  lineText: Scalars['String']['output'];
  mentionId: Scalars['ID']['output'];
  noteId?: Maybe<Scalars['ID']['output']>;
  noteTitle?: Maybe<Scalars['String']['output']>;
  verifiedConflict: Scalars['Boolean']['output'];
};

/** Example: { "key": "notes", "count": 1 } */
export type DeletedCount = {
  __typename?: 'DeletedCount';
  count: Scalars['Int']['output'];
  key: Scalars['String']['output'];
};

/**
 * Something the review queue found. `payload` is the typed DiscoveryPayload from @peas/parser/v2; `concepts` and `entries` resolve the ids it names.
 *
 * Example: { "id": "0193...", "type": "UNKNOWN_FOOD_PHRASE", "key": "calamansi juice", "title": "calamansi juice", "priority": 11.32, "mentionCount": 9, "distinctNoteCount": 7, "payload": { "type": "UNKNOWN_FOOD_PHRASE", "phrase": "calamansi juice", "headToken": "juice" } }
 */
export type Discovery = {
  __typename?: 'Discovery';
  concepts: Array<ConceptRef>;
  distinctNoteCount: Scalars['Int']['output'];
  entries: Array<LexiconEntryRef>;
  /** Example mentions, paged. Example: examples(limit: 20, offset: 20) */
  examples: Array<DiscoveryExample>;
  /** STRUCTURAL_PATTERN only (null otherwise): up to 10 example lines as pending golden cases (JSON) for packages/parser/fixtures/golden/structural.dev.json, each with v2's current reading and an empty expected value to fill in. */
  fixtureBlock?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  mentionCount: Scalars['Int']['output'];
  payload: Scalars['JSON']['output'];
  priority: Scalars['Float']['output'];
  status: DiscoveryStatus;
  /** Short label for lists, e.g. "calamansi juice" or "green with tomato". */
  title: Scalars['String']['output'];
  type: DiscoveryType;
};


/**
 * Something the review queue found. `payload` is the typed DiscoveryPayload from @peas/parser/v2; `concepts` and `entries` resolve the ids it names.
 *
 * Example: { "id": "0193...", "type": "UNKNOWN_FOOD_PHRASE", "key": "calamansi juice", "title": "calamansi juice", "priority": 11.32, "mentionCount": 9, "distinctNoteCount": 7, "payload": { "type": "UNKNOWN_FOOD_PHRASE", "phrase": "calamansi juice", "headToken": "juice" } }
 */
export type DiscoveryExamplesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

/** A mention that shows a discovery. Example: { "mentionId": "0193...", "noteTitle": "Lemon Bars", "lineText": "2 tbsp icing sugar", "span": { "start": 7, "end": 18, "text": "icing sugar" } } */
export type DiscoveryExample = {
  __typename?: 'DiscoveryExample';
  lineText: Scalars['String']['output'];
  mentionId: Scalars['ID']['output'];
  noteId?: Maybe<Scalars['ID']['output']>;
  noteTitle?: Maybe<Scalars['String']['output']>;
  span: TextSpan;
};

/** Example: query { discoveryQueue(type: UNKNOWN_FOOD_PHRASE, limit: 25) { items { id title priority } nextCursor } } */
export type DiscoveryPage = {
  __typename?: 'DiscoveryPage';
  items: Array<Discovery>;
  nextCursor?: Maybe<Scalars['ID']['output']>;
};

export type DiscoveryStatus =
  | 'DEFERRED'
  | 'OPEN'
  | 'REJECTED'
  | 'RESOLVED';

export type DiscoveryType =
  | 'AMBIGUOUS_MATCH'
  | 'ATTRIBUTE_INTERPRETATION'
  | 'IDENTITY_DECISION'
  | 'RELATIONSHIP_SUGGESTION'
  | 'STRUCTURAL_PATTERN'
  | 'UNKNOWN_FOOD_PHRASE'
  | 'UNKNOWN_MODIFIER'
  | 'VERIFIED_DRIFT';

/** Example: { "type": "UNKNOWN_MODIFIER", "count": 12 } */
export type DiscoveryTypeCount = {
  __typename?: 'DiscoveryTypeCount';
  count: Scalars['Int']['output'];
  type: DiscoveryType;
};

/** A possible duplicate pair: the incoming note against an existing one. */
export type DuplicateCandidate = {
  __typename?: 'DuplicateCandidate';
  confidence: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  existing: DuplicateNoteSummary;
  id: Scalars['ID']['output'];
  incoming: DuplicateNoteSummary;
  kind: DuplicateKind;
  resolution?: Maybe<DuplicateResolution>;
  resolvedAt?: Maybe<Scalars['String']['output']>;
  signals: DuplicateSignals;
  status: DuplicateCandidateStatus;
};

/** Both notes in full, for the side-by-side review. */
export type DuplicateCandidateDetail = {
  __typename?: 'DuplicateCandidateDetail';
  candidate: DuplicateCandidate;
  existingNote: Note;
  id: Scalars['ID']['output'];
  incomingNote: Note;
};

export type DuplicateCandidateStatus =
  | 'DISMISSED'
  | 'PENDING'
  | 'RESOLVED';

export type DuplicateCandidatesPage = {
  __typename?: 'DuplicateCandidatesPage';
  items: Array<DuplicateCandidate>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** Which copy's content stays. BOTH keeps both notes and stops flagging the pair. */
export type DuplicateKeepChoice =
  | 'BOTH'
  | 'EXISTING'
  | 'INCOMING';

export type DuplicateKind =
  /** The same uploaded file, or identical title, ingredients, and instructions. */
  | 'EXACT'
  /** A shared source with a near-identical title, or a strong title and ingredient match. Holds the import for a decision. */
  | 'LIKELY'
  /** Listed for review without holding the import. */
  | 'POSSIBLE';

export type DuplicateNoteSummary = {
  __typename?: 'DuplicateNoteSummary';
  archivedAt?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  ingredientLineCount: Scalars['Int']['output'];
  recipeId?: Maybe<Scalars['ID']['output']>;
  status: NoteStatus;
  title?: Maybe<Scalars['String']['output']>;
};

export type DuplicateResolution = {
  __typename?: 'DuplicateResolution';
  keep: DuplicateKeepChoice;
  mergeSources: Scalars['Boolean']['output'];
};

/** A content decision and a separate source decision. Example: { "keep": "EXISTING", "mergeSources": true } */
export type DuplicateResolutionInput = {
  keep: DuplicateKeepChoice;
  mergeSources: Scalars['Boolean']['input'];
};

/** Exactly what a duplicate decision will do, computed without writing. */
export type DuplicateResolutionPreview = {
  __typename?: 'DuplicateResolutionPreview';
  archivedNote?: Maybe<NoteTitleRef>;
  attachedSources: Array<PreviewSource>;
  carriedCategories: Array<PreviewCategory>;
  carriedTags: Array<Scalars['String']['output']>;
  keptNote?: Maybe<NoteTitleRef>;
  movedRecipeId?: Maybe<Scalars['ID']['output']>;
  primarySourceChange?: Maybe<PrimarySourceChange>;
  /** One line per effect. */
  summary: Array<Scalars['String']['output']>;
};

/** What made two notes look alike. */
export type DuplicateSignals = {
  __typename?: 'DuplicateSignals';
  contentHash: Scalars['Boolean']['output'];
  ingredientSimilarity?: Maybe<Scalars['Float']['output']>;
  rawHtmlHash: Scalars['Boolean']['output'];
  /** Human-readable, e.g. ["Same source", "Title similarity 97%"]. */
  reasons: Array<Scalars['String']['output']>;
  sharedSourceIds: Array<Scalars['ID']['output']>;
  titleSimilarity?: Maybe<Scalars['Float']['output']>;
};

/** A cache identity: GraphQL type name plus immutable id. Example: { "typename": "Recipe", "id": "cm3r..." } */
export type EntityRef = {
  __typename?: 'EntityRef';
  id: Scalars['ID']['output'];
  typename: Scalars['String']['output'];
};

/** Example: { "source": "https://cooking.example.com/chili", "notebook": "Soups", "tags": ["weeknight"], "originalCreatedAt": "2019-03-02T00:00:00.000Z" } */
export type EvernoteMetadata = {
  __typename?: 'EvernoteMetadata';
  notebook?: Maybe<Scalars['String']['output']>;
  originalCreatedAt?: Maybe<Scalars['String']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
};

export type FailedUrlCheck = {
  __typename?: 'FailedUrlCheck';
  checkStatus: UrlCheckStatus;
  consecutiveFailures: Scalars['Int']['output'];
  lastCheckedAt?: Maybe<Scalars['String']['output']>;
  lastFailureReason?: Maybe<Scalars['String']['output']>;
  lastHttpStatus?: Maybe<Scalars['Int']['output']>;
  lastSuccessfulVisitAt?: Maybe<Scalars['String']['output']>;
  notes: Array<NoteTitleRef>;
  originalUrl: Scalars['String']['output'];
  sourceId: Scalars['ID']['output'];
  urlId: Scalars['ID']['output'];
};

export type FailedUrlChecksPage = {
  __typename?: 'FailedUrlChecksPage';
  items: Array<FailedUrlCheck>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** How a food relates to its parent: chicken thigh PART_OF chicken, kosher salt IS_A salt. */
export type FoodRelationshipType =
  | 'DERIVED_FROM'
  | 'IS_A'
  | 'PART_OF'
  | 'PROCESSED_FROM';

export type GraphDirection =
  | 'BOTH'
  | 'DOWN'
  | 'UP';

/** An open discovery's phrase, for the health page's top lists. Example: { "discoveryId": "0193...", "type": "UNKNOWN_FOOD_PHRASE", "phrase": "gochugaru", "mentionCount": 14 } */
export type HealthPhrase = {
  __typename?: 'HealthPhrase';
  discoveryId: Scalars['ID']['output'];
  mentionCount: Scalars['Int']['output'];
  phrase: Scalars['String']['output'];
  type: DiscoveryType;
};

/** Counts for the import page's review tab. */
export type ImportReviewCounts = {
  __typename?: 'ImportReviewCounts';
  bookMatchesToReview: Scalars['Int']['output'];
  exactDuplicates: Scalars['Int']['output'];
  failedSourceChecks: Scalars['Int']['output'];
  importedNotes: Scalars['Int']['output'];
  likelyDuplicates: Scalars['Int']['output'];
  pendingImports: Scalars['Int']['output'];
  possibleDuplicates: Scalars['Int']['output'];
  resolved: Scalars['Int']['output'];
  sourceConflicts: Scalars['Int']['output'];
};

/** Counts for the import page. Example: { "numberOfNotes": 1, "numberOfIngredients": 10, "numberOfParsingErrors": 0 } */
export type ImportStats = {
  __typename?: 'ImportStats';
  numberOfIngredients: Scalars['Int']['output'];
  numberOfNotes: Scalars['Int']['output'];
  numberOfParsingErrors: Scalars['Int']['output'];
};

/**
 * Everything shown in the ingredient editor.
 *
 * Example: query { ingredient(id: "cm3i...") { name plural aliases { name } parent { name } variants { name } references { reference noteTitle } } }
 */
export type Ingredient = {
  __typename?: 'Ingredient';
  aliases: Array<IngredientAlias>;
  /** Category names, alphabetical, e.g. ["Produce", "Spices"]. */
  categories: Array<Scalars['String']['output']>;
  /** Automatic tags (VEGAN, VEGETARIAN, GLUTEN_FREE) computed from the food's properties, explicit or inherited; empty when the food has no core type. */
  dietaryTags: Array<IngredientProperty>;
  id: Scalars['ID']['output'];
  /** True for ingredients made of other ingredients, e.g. "garam masala". */
  isComposedIngredient: Scalars['Boolean']['output'];
  isReviewed: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  plural?: Maybe<Scalars['String']['output']>;
  /** Properties set here or inherited, in card order. */
  propertyStates: Array<IngredientPropertyState>;
  referenceCount: Scalars['Int']['output'];
  /** The most recent references (capped at 50). */
  references: Array<IngredientReference>;
  /** Foods this one comes from or belongs to, oldest first. Example: canned tomatoes -> [{ relationshipType: PROCESSED_FROM, ingredient: { name: "tomato" } }] */
  relationships: Array<IngredientRelation>;
  reviewedAt?: Maybe<Scalars['String']['output']>;
  substitutions: Array<IngredientOption>;
  tags: Array<Scalars['String']['output']>;
  /** Foods that relate to this one. Example: tomato -> [{ relationshipType: PROCESSED_FROM, ingredient: { name: "canned tomatoes" } }] */
  variants: Array<IngredientRelation>;
};

/** Another name for an ingredient. Example: { "id": "cm3a...", "name": "scallion" } on "green onion". */
export type IngredientAlias = {
  __typename?: 'IngredientAlias';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** An ingredient list within a note, e.g. the main list (blockIndex 0) and a "For the glaze" list (blockIndex 1). */
export type IngredientBlock = {
  __typename?: 'IngredientBlock';
  blockIndex: Scalars['Int']['output'];
  lines: Array<IngredientLine>;
};

/** Example: { "all": 10, "unreviewed": 7 } */
export type IngredientCounts = {
  __typename?: 'IngredientCounts';
  all: Scalars['Int']['output'];
  unreviewed: Scalars['Int']['output'];
};

/** Example: { "name": "shallot", "plural": "shallots" } */
export type IngredientCreateInput = {
  name: Scalars['String']['input'];
  plural?: InputMaybe<Scalars['String']['input']>;
};

/**
 * One raw ingredient line from a note, with its parse and review state.
 *
 * Example: { "id": "cm3l...", "blockIndex": 0, "lineIndex": 2, "reference": "2 cups flour", "parseStatus": "COMPLETED_SUCCESSFULLY", "reviewStatus": "UNREVIEWED", "parserVersion": "v2:2.0.0" }
 */
export type IngredientLine = {
  __typename?: 'IngredientLine';
  /** Which ingredient list in the note (0 for the first, 1 for e.g. "For the sauce"). */
  blockIndex: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lineIndex: Scalars['Int']['output'];
  /** INGREDIENT unless structure review filed it as a heading, note, or other text, or moved it to the instructions (the row stays, inactive). */
  lineKind: LineKind;
  /** v2 mentions, one per segment part ("salt and pepper" gives two). Empty until the line is parsed. */
  mentions: Array<Mention>;
  parseStatus: ParseStatus;
  parserVersion?: Maybe<Scalars['String']['output']>;
  /** The line exactly as written in the note. */
  reference: Scalars['String']['output'];
  reviewStatus: LineReviewStatus;
};

/**
 * Active ingredient lines by parse outcome and by review verdict. Lines not marked correct or incorrect are unreviewed.
 *
 * Example: { "total": 5120, "parsedSuccessfully": 4980, "parsedWithErrors": 120, "awaitingParsing": 20, "markedCorrect": 310, "markedIncorrect": 12 }
 */
export type IngredientLineStats = {
  __typename?: 'IngredientLineStats';
  awaitingParsing: Scalars['Int']['output'];
  markedCorrect: Scalars['Int']['output'];
  markedIncorrect: Scalars['Int']['output'];
  parsedSuccessfully: Scalars['Int']['output'];
  parsedWithErrors: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** A lightweight ingredient reference for pickers. Example: { "id": "cm3i...", "name": "paprika" } */
export type IngredientOption = {
  __typename?: 'IngredientOption';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/** Ingredient card properties. VEGAN, VEGETARIAN, and GLUTEN_FREE are automatic tags computed from the food's properties (vegetarian: no meat or fish; vegan: also no dairy or egg; gluten-free: no gluten; none without a core type) and are ignored on save; the rest are stored as classifications, core types and allergens inheriting across every relationship. */
export type IngredientProperty =
  | 'ALCOHOL'
  | 'CORN'
  | 'DAIRY'
  | 'EGG'
  | 'FAT'
  | 'FISH'
  | 'FRUIT'
  | 'GLUTEN'
  | 'GLUTEN_FREE'
  | 'GRAIN'
  | 'HERB'
  | 'LEGUME'
  | 'MEAT'
  | 'NUTS'
  | 'SEASONING'
  | 'SESAME'
  | 'SHELLFISH'
  | 'SOY'
  | 'SPICE'
  | 'SWEETENER'
  | 'VEGAN'
  | 'VEGETABLE'
  | 'VEGETARIAN';

/**
 * One property on the ingredient card: what this food says, what it would inherit, and from which food. A FALSE `explicit` is a "does not contain" that overrides an inherited TRUE.
 *
 * Example: { "property": "GLUTEN", "explicit": null, "inherited": "TRUE", "inheritedFrom": { "name": "wheat" } }
 */
export type IngredientPropertyState = {
  __typename?: 'IngredientPropertyState';
  explicit?: Maybe<ClassificationValue>;
  inherited?: Maybe<ClassificationValue>;
  inheritedFrom?: Maybe<IngredientOption>;
  property: IngredientProperty;
};

/** A line that mentions the ingredient. Example: { "id": "cm3f...", "reference": "3 garlic cloves, minced", "noteId": "cm3n...", "noteTitle": "Weeknight Chili" } */
export type IngredientReference = {
  __typename?: 'IngredientReference';
  id: Scalars['ID']['output'];
  noteId?: Maybe<Scalars['ID']['output']>;
  noteTitle?: Maybe<Scalars['String']['output']>;
  reference: Scalars['String']['output'];
};

/** One relationship between two foods, seen from the card's food. Example: { "relationshipType": "PART_OF", "ingredient": { "name": "chicken" } } */
export type IngredientRelation = {
  __typename?: 'IngredientRelation';
  ingredient: IngredientOption;
  relationshipType: FoodRelationshipType;
};

/** Example: { "ingredientId": "0193...", "relationshipType": "PROCESSED_FROM" } */
export type IngredientRelationInput = {
  ingredientId: Scalars['ID']['input'];
  relationshipType: FoodRelationshipType;
};

/**
 * Saves the ingredient editor form. Set advanceToNext to get the next unreviewed ingredient's id back.
 *
 * Example: { "id": "cm3i...", "name": "smoked paprika", "plural": null, "properties": ["SPICE"], "excludedProperties": [], "isComposedIngredient": false, "relationships": [{ "ingredientId": "cm3p...", "relationshipType": "IS_A" }], "substitutionIds": [], "aliases": ["pimentón"], "categories": ["Spices"], "tags": [], "markReviewed": true, "advanceToNext": true }
 */
export type IngredientSaveInput = {
  advanceToNext: Scalars['Boolean']['input'];
  aliases: Array<Scalars['String']['input']>;
  /** The complete set of category names; ones left out are removed. */
  categories: Array<Scalars['String']['input']>;
  /** Properties set to "does not contain", overriding what the food would inherit. */
  excludedProperties?: InputMaybe<Array<IngredientProperty>>;
  id: Scalars['ID']['input'];
  isComposedIngredient: Scalars['Boolean']['input'];
  markReviewed: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  plural?: InputMaybe<Scalars['String']['input']>;
  /** Properties set to "contains" on this food (VEGAN and VEGETARIAN are ignored). */
  properties: Array<IngredientProperty>;
  /** The complete set of foods this one relates to; relationships left out are removed. */
  relationships: Array<IngredientRelationInput>;
  substitutionIds: Array<Scalars['ID']['input']>;
  tags: Array<Scalars['String']['input']>;
};

/**
 * One food on the ingredients list (an approved or proposed food concept). `isReviewed` means approved; `properties` are the ones in effect (set here or inherited) plus the automatic VEGAN, VEGETARIAN, and GLUTEN_FREE tags.
 *
 * Example: { "id": "cm3i...", "name": "garlic", "plural": null, "isReviewed": true, "parentIngredientId": null, "properties": ["VEGAN", "VEGETARIAN", "VEGETABLE"], "referenceCount": 42 }
 */
export type IngredientSummary = {
  __typename?: 'IngredientSummary';
  id: Scalars['ID']['output'];
  isReviewed: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** Set for variants, e.g. "smoked paprika" points at "paprika". */
  parentIngredientId?: Maybe<Scalars['ID']['output']>;
  plural?: Maybe<Scalars['String']['output']>;
  properties: Array<IngredientProperty>;
  /** How many active ingredient lines mention this food. */
  referenceCount: Scalars['Int']['output'];
};

/** Which foods the ingredients page lists: all approved foods, or the proposed ones waiting for review. Lowercase to match the page's ?view= search param. */
export type IngredientView =
  | 'all'
  | 'unreviewed';

/** Example: { "id": "cm3s...", "lineIndex": 0, "text": "Preheat the oven to 350°F.", "isActive": true } */
export type InstructionLine = {
  __typename?: 'InstructionLine';
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lineIndex: Scalars['Int']['output'];
  /** INSTRUCTION unless structure review filed it as a heading, note, or other text, or moved it to the ingredients. */
  lineKind: LineKind;
  text: Scalars['String']['output'];
};

/**
 * Query areas whose cached results a mutation may have made stale. The client's cache coordinator refetches active queries registered for each domain.
 *
 * Example: merging two concepts invalidates CONCEPTS (the list shows both) and CONCEPT_DETAIL (other concepts show them as parents or substitutions).
 */
export type InvalidationDomain =
  | 'CATEGORIES'
  | 'CONCEPTS'
  | 'CONCEPT_DETAIL'
  | 'CORPUS_HEALTH'
  | 'DASHBOARD_STATS'
  | 'DISCOVERIES'
  | 'IMPORT_REVIEW'
  | 'IMPORT_STATS'
  | 'MENTIONS'
  | 'NOTES'
  | 'NOTE_DETAIL'
  | 'RECIPES'
  | 'RECIPE_DETAIL'
  | 'RECIPE_TAXONOMY'
  | 'STRUCTURE_REVIEW';

/**
 * Background queue job state, polled by the client while active.
 *
 * Example: query { job(jobId: "cm3n...-ingredient-0-2") { status errorMessage completedAt } } -> { "job": { "status": "COMPLETED", "errorMessage": null, "completedAt": "2026-11-12T15:23:04.010Z" } }
 */
export type Job = {
  __typename?: 'Job';
  completedAt?: Maybe<Scalars['String']['output']>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** BullMQ job id, e.g. "cm3n...-ingredient-0-2" (note, block 0, line 2). */
  jobId: Scalars['ID']['output'];
  /** Set for import jobs; null for reinterpretation runs. */
  noteId?: Maybe<Scalars['ID']['output']>;
  /** Lines done so far, for reinterpretation runs. */
  processedCount?: Maybe<Scalars['Int']['output']>;
  retryCount: Scalars['Int']['output'];
  startedAt?: Maybe<Scalars['String']['output']>;
  status: JobStatus;
  /** Lines in the run, for reinterpretation runs. */
  totalCount?: Maybe<Scalars['Int']['output']>;
  type: JobType;
};

/** Background queue job status, mirroring BullMQ through the QueueJob table. */
export type JobStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED'
  | 'PENDING'
  | 'PROCESSING';

export type JobType =
  | 'PROCESS_CATEGORIZATION'
  | 'PROCESS_INGREDIENT_LINE'
  | 'PROCESS_INSTRUCTION_LINE'
  | 'PROCESS_NOTE'
  /** Background reinterpretation of mentions after a Teach Peas decision (Phase 5). */
  | 'REINTERPRET';

/** A ranked name with a count. Example: { "label": "Serious Eats", "count": 57 } */
export type LabelCount = {
  __typename?: 'LabelCount';
  count: Scalars['Int']['output'];
  label: Scalars['String']['output'];
};

/** A lexicon entry with when it was added and where it is used. Example: { "text": "chicken thighs", "role": "FOOD", "targetLabel": "chicken thigh", "revisionAdded": 3 } */
export type LexiconEntryDetail = {
  __typename?: 'LexiconEntryDetail';
  conceptId?: Maybe<Scalars['ID']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind?: Maybe<Scalars['String']['output']>;
  /** Lines in active notes whose stored syntax used this entry, oldest first, 50 per page by default (at most 100). */
  occurrences: LexiconOccurrencePage;
  revisionAdded: Scalars['Int']['output'];
  revisionRetired?: Maybe<Scalars['Int']['output']>;
  role: Scalars['String']['output'];
  status: Scalars['String']['output'];
  targetLabel: Scalars['String']['output'];
  text: Scalars['String']['output'];
};


/** A lexicon entry with when it was added and where it is used. Example: { "text": "chicken thighs", "role": "FOOD", "targetLabel": "chicken thigh", "revisionAdded": 3 } */
export type LexiconEntryDetailOccurrencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};

/** A lexicon entry named by a discovery, with its target spelled out. Example: { "id": "0193...", "text": "green", "role": "ATTRIBUTE", "targetLabel": "color: green" } */
export type LexiconEntryRef = {
  __typename?: 'LexiconEntryRef';
  attributeValueId?: Maybe<Scalars['ID']['output']>;
  conceptId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  /** FOOD, ATTRIBUTE, PREPARATION, DEGREE, MEASUREMENT_MODIFIER, or INSTRUCTION. */
  role: Scalars['String']['output'];
  /** Readable target: a concept name, "definition: value", a preparation key, or a value key. */
  targetLabel: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

/** A name or modifier in the lexicon. Example: { "text": "chicken thighs", "role": "FOOD", "kind": "PLURAL", "status": "ACTIVE", "targetLabel": "chicken thigh" } */
export type LexiconEntryRow = {
  __typename?: 'LexiconEntryRow';
  /** ATTRIBUTE entries' value. */
  attributeValueId?: Maybe<Scalars['ID']['output']>;
  /** FOOD entries' concept. */
  conceptId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  /** CANONICAL, PLURAL, ALIAS, ... for FOOD entries. */
  kind?: Maybe<Scalars['String']['output']>;
  /** PREPARATION entries' operation. */
  preparationId?: Maybe<Scalars['ID']['output']>;
  /** FOOD, ATTRIBUTE, PREPARATION, DEGREE, MEASUREMENT_MODIFIER, or INSTRUCTION. */
  role: Scalars['String']['output'];
  /** ACTIVE, PROPOSED (only used when curating), or DEPRECATED (retired; listed only with includeRetired). */
  status: Scalars['String']['output'];
  targetLabel: Scalars['String']['output'];
  text: Scalars['String']['output'];
  /** DEGREE, MEASUREMENT_MODIFIER, and INSTRUCTION entries' value key, e.g. "fine". */
  valueKey?: Maybe<Scalars['String']['output']>;
};

/** Example: { "lineText": "1 lb boneless chicken thighs", "span": { "text": "chicken thighs" }, "noteTitle": "Braised thighs", "conceptName": "chicken thigh" } */
export type LexiconOccurrence = {
  __typename?: 'LexiconOccurrence';
  conceptName?: Maybe<Scalars['String']['output']>;
  lineText: Scalars['String']['output'];
  mentionId: Scalars['ID']['output'];
  noteId: Scalars['ID']['output'];
  noteTitle?: Maybe<Scalars['String']['output']>;
  recipeId?: Maybe<Scalars['ID']['output']>;
  recipeTitle?: Maybe<Scalars['String']['output']>;
  /** The matched words in lineText. */
  span?: Maybe<TextSpan>;
  status: MentionStatus;
};

/** nextCursor is null on the last page. */
export type LexiconOccurrencePage = {
  __typename?: 'LexiconOccurrencePage';
  items: Array<LexiconOccurrence>;
  nextCursor?: Maybe<Scalars['String']['output']>;
  total: Scalars['Int']['output'];
};

export type LexiconPage = {
  __typename?: 'LexiconPage';
  items: Array<LexiconEntryRow>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type LineKind =
  | 'INGREDIENT'
  | 'INSTRUCTION'
  | 'NOTE'
  | 'OTHER'
  | 'SECTION_HEADING';

/** A person's verdict on how an ingredient line was parsed. */
export type LineReviewStatus =
  | 'CORRECT'
  | 'INCORRECT'
  | 'UNREVIEWED';

/**
 * The queue's last hour of parses (in memory per queue process).
 *
 * Example: { "windowSeconds": 3600, "lineCount": 1200, "linesPerSecond": 0.33, "structuralSuccessShare": 0.97, "averageCandidatesPerSegment": 1.4, "unknownTokens": 85, "lexiconRevision": 15 }
 */
export type LiveParseMetrics = {
  __typename?: 'LiveParseMetrics';
  averageCandidatesPerSegment?: Maybe<Scalars['Float']['output']>;
  lexiconRevision?: Maybe<Scalars['Int']['output']>;
  lineCount: Scalars['Int']['output'];
  linesPerSecond: Scalars['Float']['output'];
  /** 0..1; null before any line. */
  structuralSuccessShare?: Maybe<Scalars['Float']['output']>;
  unknownTokens: Scalars['Int']['output'];
  windowSeconds: Scalars['Int']['output'];
};

export type ManualBookInput = {
  authors: Array<Scalars['String']['input']>;
  isbn10?: InputMaybe<Scalars['String']['input']>;
  isbn13?: InputMaybe<Scalars['String']['input']>;
  publishedYear?: InputMaybe<Scalars['Int']['input']>;
  publisher?: InputMaybe<Scalars['String']['input']>;
  subtitle?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

/** Example: { "success": true, "linesDeactivated": 3 } */
export type MarkNoisePayload = MutationPayload & {
  __typename?: 'MarkNoisePayload';
  effect: MutationEffect;
  linesDeactivated?: Maybe<Scalars['Int']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/**
 * A stored v2 mention of one part of an ingredient-line segment (written on import, by the backfill, and by reinterpretation). "salt and pepper" is one segment with two parts.
 *
 * Example: { "id": "0193...", "segmentIndex": 0, "partIndex": 0, "span": { "start": 0, "end": 28, "text": "1 lb boneless chicken thighs" }, "rawText": "1 lb boneless chicken thighs", "status": "AUTO_RESOLVED", "concept": { "canonicalName": "chicken thigh" }, "quantity": "1 lb" }
 */
export type Mention = {
  __typename?: 'Mention';
  candidates: Array<ResolutionCandidateView>;
  concept?: Maybe<ConceptRef>;
  id: Scalars['ID']['output'];
  lexiconRevision: Scalars['Int']['output'];
  partIndex: Scalars['Int']['output'];
  /** Readable quantity, e.g. "1 lb" or "2-3 cups". */
  quantity?: Maybe<Scalars['String']['output']>;
  rawText: Scalars['String']['output'];
  score?: Maybe<Scalars['Float']['output']>;
  segmentIndex: Scalars['Int']['output'];
  /** Where this part sits in the line. */
  span: TextSpan;
  status: MentionStatus;
  summary: ResolutionView;
  tokens: Array<SyntaxToken>;
  /** Words the resolver could not explain. */
  unresolved: Array<TextSpan>;
  verified: Scalars['Boolean']['output'];
};

/** How a mention was resolved. VERIFIED means a person checked it; automatic rewrites never touch it. */
export type MentionStatus =
  | 'AUTO_RESOLVED'
  | 'NEEDS_REVIEW'
  | 'UNRESOLVED'
  | 'VERIFIED';

/** Example: { "role": "INSTRUCTION", "valueKey": "divided", "direct": 1, "expanded": 3 } */
export type ModifierUsage = {
  __typename?: 'ModifierUsage';
  direct: Scalars['Int']['output'];
  expanded: Scalars['Int']['output'];
  /** MEASUREMENT_MODIFIER or INSTRUCTION. */
  role: Scalars['String']['output'];
  valueKey: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Adds a note to a category by id, or by name (creating a manual category). */
  addCategoryToNote: BasicPayload;
  /** Admin only. Applies a reviewed decision, bumps the lexicon revision, and reinterprets affected mentions (up to 1,000 lines in this request). */
  applyDecision: ApplyDecisionPayload;
  approveCategory: BasicPayload;
  /** Admin only. Deletes all imported data and R2 objects; users and sessions are kept. */
  cleanupAllData: CleanupAllDataPayload;
  createBookManually: BasicPayload;
  /** Admin only. */
  createCategory: CreateCategoryPayload;
  /** Adds an approved food through a CREATE_CONCEPT decision. */
  createIngredient: CreateIngredientPayload;
  /** Admin only. Applies one decision to every open proposal of a pattern. */
  decideStructurePattern: StructurePatternPayload;
  /** Admin only. Approve, reject, or change a structure proposal; undoable. Example: decideStructureProposal(id: "0193...", input: { action: CHANGE, label: NOTE }) */
  decideStructureProposal: StructureDecisionPayload;
  /** Admin only. Sets an open discovery aside without deciding it. */
  deferDiscovery: BasicPayload;
  excludeCategory: BasicPayload;
  leaveBookUnresolved: BasicPayload;
  /** Admin only. A structural pattern's lines are not ingredient lines (headers, OCR artifacts): deactivates them, drops their mentions from every count, and resolves the discovery. */
  markDiscoveryAsNoise: MarkNoisePayload;
  /** Admin only. Promotes every COMPLETED note that has no recipe yet. */
  promoteCompletedNotes: PromoteCompletedNotesPayload;
  /** Creates a recipe from a note (or returns the existing one). Example: promoteNoteToRecipe(noteId: "cm3n...") */
  promoteNoteToRecipe: PromoteNotePayload;
  /** Queues a reachability check now. */
  recheckUrl: BasicPayload;
  /** Admin only. Mines adjacency counts into open discoveries and suggests relationships by name. */
  refreshDiscoveries: RefreshDiscoveriesPayload;
  /** Removes a category; recorded as an exclusion when an ingredient rule would add it back. */
  removeCategory: BasicPayload;
  /** Admin only. Removes an explicit classification; inherited values still apply. */
  removeConceptClassification: BasicPayload;
  /** Admin only. */
  removeConceptSubstitution: BasicPayload;
  /** Applies a duplicate decision (reversible). Repeating the same decision does nothing; a different one needs undoDuplicateResolution first. */
  resolveDuplicate: ResolveDuplicatePayload;
  /** Keeps the existing note (merging sources) for every pending EXACT pair. */
  resolveExactDuplicates: ResolveExactDuplicatesPayload;
  /** Undoes an exclusion: inferred again if the rule still matches, otherwise removed. */
  restoreCategory: BasicPayload;
  retryBookLookup: BasicPayload;
  /** Admin only. Re-reads unresolved and needs-review mentions in exploratory mode now, instead of waiting for the weekly sweep; only discoveries are written. */
  runExploratorySweep: StartJobPayload;
  /** Saves the ingredient card. Name, plural, alternate names, and parent go through one EDIT_CONCEPT decision (revertible; affected lines are reinterpreted); the other fields are written directly; saving a proposed food approves it. */
  saveIngredient: SaveIngredientPayload;
  /** Links every note citing the lookup's text to the chosen Open Library work. */
  selectBookCandidate: BasicPayload;
  /** Admin only. Sets an explicit classification (a dietary property, food group, allergen, or CATEGORY:<name>). Example: setConceptClassification(input: { conceptId: "0193...", kind: DIETARY, key: "VEGAN", value: TRUE }) */
  setConceptClassification: BasicPayload;
  /** Admin only. Records that substituteId can stand in for conceptId. */
  setConceptSubstitution: BasicPayload;
  /** Admin only. Replaces the concept's tags. Example: setConceptTags(conceptId: "0193...", tags: ["pantry", "baking"]) */
  setConceptTags: BasicPayload;
  /** Marks how well a line was parsed. Example: setLineReviewStatus(lineId: "cm3l...", status: INCORRECT) */
  setLineReviewStatus: SetLineReviewStatusPayload;
  /** Admin only. Reparses every line written by another parser version, after a grammar change ships. The run's id ("reparse-<version>") comes back as effect.reprocessingJobId and reports progress through Query.job. */
  startReparse: StartJobPayload;
  /** Admin only. Stores a corpus health snapshot now. */
  takeHealthSnapshot: BasicPayload;
  undoDuplicateResolution: BasicPayload;
  /** Admin only. Reverses a structure decision exactly and reopens the proposal. */
  undoStructureDecision: StructureDecisionPayload;
  /** Admin only. Changing the food or traversal recomputes the category in the background. */
  updateCategoryRule: BasicPayload;
  updateRecipe: BasicPayload;
};


export type MutationAddCategoryToNoteArgs = {
  categoryId?: InputMaybe<Scalars['ID']['input']>;
  categoryName?: InputMaybe<Scalars['String']['input']>;
  noteId: Scalars['ID']['input'];
};


export type MutationApplyDecisionArgs = {
  input: ApplyDecisionInput;
};


export type MutationApproveCategoryArgs = {
  categoryId: Scalars['ID']['input'];
  noteId: Scalars['ID']['input'];
};


export type MutationCreateBookManuallyArgs = {
  input: ManualBookInput;
  lookupId: Scalars['ID']['input'];
};


export type MutationCreateCategoryArgs = {
  input: CategoryInput;
};


export type MutationCreateIngredientArgs = {
  input: IngredientCreateInput;
};


export type MutationDecideStructurePatternArgs = {
  input: StructureDecisionInput;
  patternKey: Scalars['String']['input'];
};


export type MutationDecideStructureProposalArgs = {
  id: Scalars['ID']['input'];
  input: StructureDecisionInput;
};


export type MutationDeferDiscoveryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationExcludeCategoryArgs = {
  categoryId: Scalars['ID']['input'];
  noteId: Scalars['ID']['input'];
};


export type MutationLeaveBookUnresolvedArgs = {
  lookupId: Scalars['ID']['input'];
};


export type MutationMarkDiscoveryAsNoiseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPromoteNoteToRecipeArgs = {
  noteId: Scalars['ID']['input'];
};


export type MutationRecheckUrlArgs = {
  urlId: Scalars['ID']['input'];
};


export type MutationRemoveCategoryArgs = {
  categoryId: Scalars['ID']['input'];
  noteId: Scalars['ID']['input'];
};


export type MutationRemoveConceptClassificationArgs = {
  conceptId: Scalars['ID']['input'];
  key: Scalars['String']['input'];
};


export type MutationRemoveConceptSubstitutionArgs = {
  conceptId: Scalars['ID']['input'];
  substituteId: Scalars['ID']['input'];
};


export type MutationResolveDuplicateArgs = {
  id: Scalars['ID']['input'];
  input: DuplicateResolutionInput;
};


export type MutationRestoreCategoryArgs = {
  categoryId: Scalars['ID']['input'];
  noteId: Scalars['ID']['input'];
};


export type MutationRetryBookLookupArgs = {
  lookupId: Scalars['ID']['input'];
};


export type MutationSaveIngredientArgs = {
  input: IngredientSaveInput;
};


export type MutationSelectBookCandidateArgs = {
  lookupId: Scalars['ID']['input'];
  workKey: Scalars['ID']['input'];
};


export type MutationSetConceptClassificationArgs = {
  input: ConceptClassificationInput;
};


export type MutationSetConceptSubstitutionArgs = {
  input: ConceptSubstitutionInput;
};


export type MutationSetConceptTagsArgs = {
  conceptId: Scalars['ID']['input'];
  tags: Array<Scalars['String']['input']>;
};


export type MutationSetLineReviewStatusArgs = {
  lineId: Scalars['ID']['input'];
  status: LineReviewStatus;
};


export type MutationUndoDuplicateResolutionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUndoStructureDecisionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateCategoryRuleArgs = {
  id: Scalars['ID']['input'];
  input: CategoryInput;
};


export type MutationUpdateRecipeArgs = {
  input: RecipeUpdateInput;
};

/**
 * What a mutation changed beyond the entities returned in its payload (Apollo merges those automatically).
 *
 * - changed: entities whose cached fields are stale; the client evicts them so mounted views refetch.
 * - evicted: identities that no longer exist (deleted or merged away).
 * - invalidatedDomains: query areas to refetch.
 *
 * Id lists are capped at 100; larger changes rely on invalidatedDomains, lexiconRevision, and reprocessingJobId.
 *
 * Example (updateRecipe): { "changed": [{ "typename": "Recipe", "id": "cm3r..." }], "evicted": [], "invalidatedDomains": ["RECIPES", "RECIPE_TAXONOMY"], "lexiconRevision": null, "reprocessingJobId": null }
 */
export type MutationEffect = {
  __typename?: 'MutationEffect';
  changed: Array<EntityRef>;
  evicted: Array<EntityRef>;
  invalidatedDomains: Array<InvalidationDomain>;
  /** Lexicon revision after the mutation, set by Teach Peas decisions. Null for mutations that do not change knowledge. */
  lexiconRevision?: Maybe<Scalars['Int']['output']>;
  /** Queue job reinterpreting affected lines, polled with Query.job. */
  reprocessingJobId?: Maybe<Scalars['ID']['output']>;
};

/**
 * Shared shape of every mutation result. Expected failures (validation, permissions) come back as success: false with a message rather than as GraphQL errors.
 *
 * Example failure: { "success": false, "message": "title: Title is required", "effect": { "changed": [], "evicted": [], "invalidatedDomains": [], "lexiconRevision": null, "reprocessingJobId": null } }
 */
export type MutationPayload = {
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** A tag. Example: { "id": "cm3c...", "name": "spicy" } */
export type NamedTag = {
  __typename?: 'NamedTag';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

/**
 * Everything shown on the note detail page.
 *
 * Example: query { note(id: "cm3n...") { title status ingredientBlocks { blockIndex lines { reference reviewStatus } } } }
 */
export type Note = {
  __typename?: 'Note';
  /** Set when the note was archived (a superseded duplicate). Archived notes keep all their data. */
  archivedAt?: Maybe<Scalars['String']['output']>;
  archivedReason?: Maybe<Scalars['String']['output']>;
  /** Every membership, excluded ones included so they can be restored. */
  categories: Array<CategoryMembership>;
  createdAt: Scalars['String']['output'];
  duplicateConfidence?: Maybe<Scalars['Float']['output']>;
  /** Why the import failed, when status is FAILED. */
  errorMessage?: Maybe<Scalars['String']['output']>;
  evernote?: Maybe<EvernoteMetadata>;
  id: Scalars['ID']['output'];
  images: Array<NoteImage>;
  ingredientBlocks: Array<IngredientBlock>;
  instructions: Array<InstructionLine>;
  parsingErrorCount: Scalars['Int']['output'];
  /** Open duplicate candidates for this note, reviewed on /import/duplicates/<id>. */
  pendingDuplicateIds: Array<Scalars['ID']['output']>;
  recipeId?: Maybe<Scalars['ID']['output']>;
  /** Primary source first. */
  sources: Array<NoteSource>;
  status: NoteStatus;
  supersededById?: Maybe<Scalars['ID']['output']>;
  tags: Array<NamedTag>;
  title?: Maybe<Scalars['String']['output']>;
};

/** Example: { "id": "cm3g...", "url": "https://r2.example.com/processed/chili.jpg", "thumbnailUrl": "https://r2.example.com/processed/chili-thumb.jpg", "processingStatus": "COMPLETED" } */
export type NoteImage = {
  __typename?: 'NoteImage';
  id: Scalars['ID']['output'];
  processingStatus: Scalars['String']['output'];
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

/** One note's link to a source: whether it is the note's primary source, and the source string as it appeared on that note. */
export type NoteSource = {
  __typename?: 'NoteSource';
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  origin: NoteSourceOrigin;
  originalText?: Maybe<Scalars['String']['output']>;
  source: Source;
};

/** How a note got a source: from the Evernote import, merged from a duplicate, or added by hand. */
export type NoteSourceOrigin =
  | 'DUPLICATE_MERGE'
  | 'EVERNOTE_IMPORT'
  | 'MANUAL';

/** Import lifecycle of an Evernote note: PENDING -> PROCESSING -> COMPLETED, or FAILED / DUPLICATE. */
export type NoteStatus =
  | 'COMPLETED'
  | 'DUPLICATE'
  | 'FAILED'
  | 'PENDING'
  | 'PROCESSING';

/** Example: { "pending": 0, "processing": 1, "completed": 412, "failed": 3, "duplicate": 9 } */
export type NoteStatusCounts = {
  __typename?: 'NoteStatusCounts';
  completed: Scalars['Int']['output'];
  duplicate: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
  processing: Scalars['Int']['output'];
};

/**
 * One row of the notes list.
 *
 * Example: { "id": "cm3n...", "title": "Weeknight Chili", "status": "COMPLETED", "parsingErrorCount": 0, "ingredientLineCount": 14, "instructionLineCount": 6, "recipeId": null, "createdAt": "2026-11-12T15:23:02.335Z" }
 */
export type NoteSummary = {
  __typename?: 'NoteSummary';
  archivedAt?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  /** 0-1 similarity to an existing note when status is DUPLICATE, e.g. 0.93. */
  duplicateConfidence?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  ingredientLineCount: Scalars['Int']['output'];
  instructionLineCount: Scalars['Int']['output'];
  /** Evernote notebook name, e.g. "Soups". */
  notebook?: Maybe<Scalars['String']['output']>;
  parsingErrorCount: Scalars['Int']['output'];
  /** Set once the note has been promoted to a recipe. */
  recipeId?: Maybe<Scalars['ID']['output']>;
  status: NoteStatus;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};

export type NoteTitleRef = {
  __typename?: 'NoteTitleRef';
  id: Scalars['ID']['output'];
  title?: Maybe<Scalars['String']['output']>;
};

/**
 * A page of notes. Pages are 1-based.
 *
 * Example: query { notes(status: COMPLETED, query: "chili", page: 2) { total page pageSize items { id title } } }
 */
export type NotesPage = {
  __typename?: 'NotesPage';
  items: Array<NoteSummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** One of the concept's names and how often a direct mention was written that way. Example: { "text": "chicken thighs", "kind": "PLURAL", "mentions": 9, "notes": 7, "example": "1 lb boneless chicken thighs" } */
export type ObservedForm = {
  __typename?: 'ObservedForm';
  entryId: Scalars['ID']['output'];
  /** One line written this way; null when the name is never used. */
  example?: Maybe<Scalars['String']['output']>;
  /** CANONICAL, ALIAS, PLURAL, REGIONAL, ABBREVIATION, or VARIANT. */
  kind?: Maybe<Scalars['String']['output']>;
  mentions: Scalars['Int']['output'];
  notes: Scalars['Int']['output'];
  /** PROPOSED or ACTIVE. */
  status: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type OccurrenceCategoryFacet = {
  __typename?: 'OccurrenceCategoryFacet';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes: Scalars['Int']['output'];
};

export type OccurrenceSourceFacet = {
  __typename?: 'OccurrenceSourceFacet';
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  notes: Scalars['Int']['output'];
};

/** CONSERVATIVE uses only active lexicon entries (imports); EXPLORATORY also tries proposed ones and alternative segmentations. */
export type ParseMode =
  | 'CONSERVATIVE'
  | 'EXPLORATORY';

export type ParseStatus =
  | 'AWAITING_PARSING'
  | 'COMPLETED_SUCCESSFULLY'
  | 'COMPLETED_WITH_ERROR';

/** Mentions on active lines written by one parser version. Example: { "parserVersion": "2.0.0", "total": 1200, "unresolved": 310 } */
export type ParserVersionHealth = {
  __typename?: 'ParserVersionHealth';
  parserVersion: Scalars['String']['output'];
  total: Scalars['Int']['output'];
  unresolved: Scalars['Int']['output'];
};

/** One segment as the playground resolves it. */
export type PlaygroundMention = {
  __typename?: 'PlaygroundMention';
  candidates: Array<ResolutionCandidateView>;
  /** 0 unless "and" split the segment into several foods. */
  partIndex: Scalars['Int']['output'];
  quantity?: Maybe<Scalars['String']['output']>;
  segmentIndex: Scalars['Int']['output'];
  span: TextSpan;
  status: MentionStatus;
  summary: ResolutionView;
  tokens: Array<SyntaxToken>;
  unresolved: Array<TextSpan>;
};

/**
 * How v2 reads a typed line against the current lexicon revision.
 *
 * Example: query { playground(line: "1 lb boneless chicken thighs", mode: CONSERVATIVE) { syntax mentions { status summary { text } } } }
 */
export type PlaygroundResult = {
  __typename?: 'PlaygroundResult';
  /** Other segmentations considered (EXPLORATORY). */
  alternativeCount: Scalars['Int']['output'];
  line: Scalars['String']['output'];
  mentions: Array<PlaygroundMention>;
  mode: ParseMode;
  revision: Scalars['Int']['output'];
  /** Compact notation, e.g. "[1 lb] {boneless:ATTRIBUTE} {chicken thighs:FOOD}". */
  syntax: Scalars['String']['output'];
};

/** Example: { "id": "0193...", "key": "chop", "label": "Chop" } */
export type PreparationOption = {
  __typename?: 'PreparationOption';
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
};

/** Example: { "preparationKey": "dice", "label": "dice", "degreeKey": null, "direct": 2, "expanded": 5 } */
export type PreparationUsage = {
  __typename?: 'PreparationUsage';
  degreeKey?: Maybe<Scalars['String']['output']>;
  direct: Scalars['Int']['output'];
  expanded: Scalars['Int']['output'];
  label: Scalars['String']['output'];
  preparationKey: Scalars['String']['output'];
};

export type PreviewCategory = {
  __typename?: 'PreviewCategory';
  name: Scalars['String']['output'];
  state: CategoryAssignmentState;
};

export type PreviewSource = {
  __typename?: 'PreviewSource';
  /** Its last URL check failed; it is attached but never made primary. */
  inactive: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  sourceId: Scalars['ID']['output'];
};

export type PrimarySourceChange = {
  __typename?: 'PrimarySourceChange';
  from?: Maybe<Scalars['ID']['output']>;
  to?: Maybe<Scalars['ID']['output']>;
};

/** Example: { "success": true, "created": 12 } */
export type PromoteCompletedNotesPayload = MutationPayload & {
  __typename?: 'PromoteCompletedNotesPayload';
  created?: Maybe<Scalars['Int']['output']>;
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Example: { "success": true, "recipeId": "cm3r...", "effect": { "changed": [Note, NoteSummary], "invalidatedDomains": ["RECIPES", "RECIPE_TAXONOMY"] } } */
export type PromoteNotePayload = MutationPayload & {
  __typename?: 'PromoteNotePayload';
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  recipeId?: Maybe<Scalars['ID']['output']>;
  success: Scalars['Boolean']['output'];
};

export type Query = {
  __typename?: 'Query';
  bookLookup?: Maybe<BookLookup>;
  /** Lookups waiting for review (AMBIGUOUS, NO_MATCH, ERROR) unless statuses are given. */
  bookLookups: BookLookupsPage;
  categories: Array<Category>;
  category?: Maybe<Category>;
  /** Concept.decisions is empty for non-admins. */
  concept?: Maybe<Concept>;
  /** The foods within depth (1 to 3, default 2) relationship steps of a concept, through the chosen types (all by default), up, down, or both; at most 150 foods. Example: conceptGraph(conceptId: "0193...", depth: 2, types: [IS_A, PART_OF], direction: BOTH) */
  conceptGraph?: Maybe<ConceptGraph>;
  /** Filter options for conceptOccurrences. */
  conceptOccurrenceFacets: ConceptOccurrenceFacets;
  /** Every counted mention of a concept (and, with the expansion, of more specific concepts) in reading order, 50 per page by default (at most 100). Example: conceptOccurrences(conceptId: "0193...", filter: { preparationKey: "dice" }, after: "WyJjbTNu...") */
  conceptOccurrences: ConceptOccurrencePage;
  /** Admin only. Every concept that has not been merged away, approved or not. Example: concepts(query: "sugar", page: 1) */
  concepts: ConceptsPage;
  /** Corpus-wide usage: settled mentions only; expanded counts add kinds and parts (IS_A, PART_OF). */
  corpusAnalytics: CorpusAnalytics;
  /** Admin only. */
  corpusHealth: CorpusHealth;
  /** Admin only. Snapshots (newest 90), unresolved share by parser version, weekly review throughput, and the top open phrases. Example: corpusHealthTrends(weeks: 12) */
  corpusHealthTrends: CorpusHealthTrends;
  dashboardStats: DashboardStats;
  /** Admin only. */
  discovery?: Maybe<Discovery>;
  /** Admin only. Open discoveries per type, for the queue filters. */
  discoveryCounts: Array<DiscoveryTypeCount>;
  /** Admin only. The review queue, highest priority first. Example: discoveryQueue(type: AMBIGUOUS_MATCH, cursor: "0193...") */
  discoveryQueue: DiscoveryPage;
  duplicateCandidate?: Maybe<DuplicateCandidateDetail>;
  /** Pending pairs by default. sourceConflicts lists pairs that share a source without being exact copies. */
  duplicateCandidates: DuplicateCandidatesPage;
  failedUrlChecks: FailedUrlChecksPage;
  importReviewCounts: ImportReviewCounts;
  importStats: ImportStats;
  ingredient?: Maybe<Ingredient>;
  ingredientCategoryNames: Array<Scalars['String']['output']>;
  ingredientCounts: IngredientCounts;
  /** The food that already answers to a name (its name, plural, or an alternate name), other than excludeId; null when the name is free. Example: ingredientNameOwner(name: "scallion", excludeId: "0193...") -> { name: "green onion" } */
  ingredientNameOwner?: Maybe<IngredientOption>;
  /** The ingredients page: approved foods (view: all) or proposed ones (view: unreviewed), alphabetical. */
  ingredients: Array<IngredientSummary>;
  job?: Maybe<Job>;
  /** Admin only. Every name and modifier Peas knows, alphabetical; retired entries only with includeRetired. Example: lexicon(query: "chick", role: "FOOD", page: 1) */
  lexicon: LexiconPage;
  /** Admin only. One lexicon entry with where it is used. Example: lexiconEntry(id: "0193...") { text occurrences { total } } */
  lexiconEntry?: Maybe<LexiconEntryDetail>;
  mention?: Maybe<Mention>;
  note?: Maybe<Note>;
  /** Filters are optional; blank strings are ignored. Example: notes(status: FAILED, page: 1) */
  notes: NotesPage;
  /** Admin only. Example: playground(line: "2 green apples", mode: EXPLORATORY) */
  playground: PlaygroundResult;
  /** Example: previewCategoryRule(conceptId: "0193...", traversal: [IS_A, PART_OF]) -> { noteCount: 41 } */
  previewCategoryRule: CategoryRulePreview;
  /** Admin only. Impact of a decision without applying it. */
  previewDecision: DecisionPreview;
  /** What a decision would do, computed without writing. Example: previewDuplicateResolution(id: "0193...", input: { keep: EXISTING, mergeSources: true }) */
  previewDuplicateResolution: DuplicateResolutionPreview;
  recipe?: Maybe<Recipe>;
  recipeTaxonomy: RecipeTaxonomy;
  /** Example: recipes(query: "chili", category: "Dinner"). conceptId finds recipes that mention the concept or a more specific one (IS_A, PART_OF) unless exactConcept is true. */
  recipes: RecipesPage;
  /** Name and entry search for concept pickers, up to 10 results. Example: searchConcepts(query: "thigh") */
  searchConcepts: Array<ConceptRef>;
  /** Name search for the card's pickers, up to 10 results. Example: searchIngredients(query: "papr", excludeId: "0193...") -> [{ name: "paprika" }, { name: "smoked paprika" }] */
  searchIngredients: Array<IngredientOption>;
  /** Admin only. Open and decided proposals, and open ones per pattern. */
  structureCounts: StructureCounts;
  /** Admin only. Review outcomes per pattern and whether each may be applied automatically (98% precision over at least 50 decisions). */
  structurePatterns: Array<StructurePattern>;
  /** Admin only. */
  structureProposal?: Maybe<StructureProposal>;
  /** Admin only. Structure proposals: open ones strongest first, or decided ones newest first. Example: structureProposals(status: OPEN, patternKey: "SECTION_HEADING:COLON_HEADING") */
  structureProposals: StructureProposalsPage;
  /** Admin only. Sources whose notes carry open unknown or ambiguous expressions. */
  unknownExpressionSources: Array<OccurrenceSourceFacet>;
  /** Admin only. Open unknown and ambiguous expressions, most notes first; with sourceId only evidence from that source's notes counts. Example: unknownExpressions(type: UNKNOWN_FOOD_PHRASE, sourceId: "cm3s...") */
  unknownExpressions: UnknownExpressionsPage;
  viewer?: Maybe<Viewer>;
  /** Admin only. */
  vocabulary: Vocabulary;
};


export type QueryBookLookupArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBookLookupsArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  statuses?: InputMaybe<Array<BookLookupStatus>>;
};


export type QueryCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryConceptArgs = {
  id: Scalars['ID']['input'];
};


export type QueryConceptGraphArgs = {
  conceptId: Scalars['ID']['input'];
  depth?: InputMaybe<Scalars['Int']['input']>;
  direction?: InputMaybe<GraphDirection>;
  types?: InputMaybe<Array<FoodRelationshipType>>;
};


export type QueryConceptOccurrenceFacetsArgs = {
  conceptId: Scalars['ID']['input'];
  expand?: InputMaybe<Array<FoodRelationshipType>>;
  includeNeedsReview?: InputMaybe<Scalars['Boolean']['input']>;
};


export type QueryConceptOccurrencesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  conceptId: Scalars['ID']['input'];
  filter?: InputMaybe<ConceptOccurrenceFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryConceptsArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCorpusHealthTrendsArgs = {
  weeks?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDiscoveryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDiscoveryQueueArgs = {
  cursor?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  type?: InputMaybe<DiscoveryType>;
};


export type QueryDuplicateCandidateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDuplicateCandidatesArgs = {
  kind?: InputMaybe<DuplicateKind>;
  page?: InputMaybe<Scalars['Int']['input']>;
  sourceConflicts?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<DuplicateCandidateStatus>;
};


export type QueryFailedUrlChecksArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryIngredientArgs = {
  id: Scalars['ID']['input'];
};


export type QueryIngredientNameOwnerArgs = {
  excludeId?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
};


export type QueryIngredientsArgs = {
  view: IngredientView;
};


export type QueryJobArgs = {
  jobId: Scalars['ID']['input'];
};


export type QueryLexiconArgs = {
  includeRetired?: InputMaybe<Scalars['Boolean']['input']>;
  newestFirst?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLexiconEntryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMentionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNoteArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNotesArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<NoteStatus>;
};


export type QueryPlaygroundArgs = {
  line: Scalars['String']['input'];
  mode?: InputMaybe<ParseMode>;
};


export type QueryPreviewCategoryRuleArgs = {
  conceptId: Scalars['ID']['input'];
  traversal: Array<FoodRelationshipType>;
};


export type QueryPreviewDecisionArgs = {
  payload: Scalars['JSON']['input'];
};


export type QueryPreviewDuplicateResolutionArgs = {
  id: Scalars['ID']['input'];
  input: DuplicateResolutionInput;
};


export type QueryRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRecipesArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  categoryProvenance?: InputMaybe<CategoryProvenance>;
  conceptId?: InputMaybe<Scalars['ID']['input']>;
  exactConcept?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  tag?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySearchConceptsArgs = {
  query: Scalars['String']['input'];
};


export type QuerySearchIngredientsArgs = {
  excludeId?: InputMaybe<Scalars['ID']['input']>;
  query: Scalars['String']['input'];
};


export type QueryStructureProposalArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStructureProposalsArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  patternKey?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<StructureListStatus>;
};


export type QueryUnknownExpressionsArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  sourceId?: InputMaybe<Scalars['ID']['input']>;
  type?: InputMaybe<UnknownExpressionType>;
};

/** A recipe promoted from a note. It shares the note's sources, ingredient blocks, and instructions. */
export type Recipe = {
  __typename?: 'Recipe';
  /** The note's category memberships. */
  categories: Array<CategoryMembership>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  ingredientBlocks: Array<IngredientBlock>;
  instructions: Array<InstructionLine>;
  noteId: Scalars['ID']['output'];
  /** The note's sources, primary first. */
  sources: Array<NoteSource>;
  tags: Array<NamedTag>;
  title: Scalars['String']['output'];
};

/**
 * One card on the recipes list.
 *
 * Example: { "id": "cm3r...", "title": "Weeknight Chili", "imageUrl": null, "categories": ["Dinner"], "tags": ["spicy"], "ingredientLineCount": 14, "createdAt": "2026-11-12T16:00:00.000Z" }
 */
export type RecipeSummary = {
  __typename?: 'RecipeSummary';
  categories: Array<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  ingredientLineCount: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

/** Every category and tag name in use, for filter menus. Example: { "categories": ["Dessert", "Dinner"], "tags": ["spicy", "weeknight"] } */
export type RecipeTaxonomy = {
  __typename?: 'RecipeTaxonomy';
  categories: Array<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
};

/**
 * Replaces a recipe's title, categories, and tags. Unknown category and tag names are created. Categories left out are removed, or excluded when an ingredient rule would add them back.
 *
 * Example: { "id": "cm3r...", "title": "Weeknight Chili", "categories": ["Dinner"], "tags": ["spicy", "freezer"] }
 */
export type RecipeUpdateInput = {
  categories: Array<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  tags: Array<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

/** Example: query { recipes(category: "Dinner", tag: "spicy", page: 1) { total items { id title } } } */
export type RecipesPage = {
  __typename?: 'RecipesPage';
  /** The concept filter, when recipes(conceptId:) was given and the concept exists. */
  concept?: Maybe<ConceptRef>;
  items: Array<RecipeSummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** Example: { "success": true, "identityUpdated": 3, "modifiersUpdated": 5, "relationshipSuggestions": 2 } */
export type RefreshDiscoveriesPayload = MutationPayload & {
  __typename?: 'RefreshDiscoveriesPayload';
  effect: MutationEffect;
  identityUpdated?: Maybe<Scalars['Int']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  modifiersUpdated?: Maybe<Scalars['Int']['output']>;
  relationshipSuggestions?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Background reinterpretation runs by state. */
export type ReinterpretBacklog = {
  __typename?: 'ReinterpretBacklog';
  failed: Scalars['Int']['output'];
  /** Batches that failed after every retry, across all runs. */
  failedBatches: Scalars['Int']['output'];
  pending: Scalars['Int']['output'];
  processing: Scalars['Int']['output'];
};

/** A ranked reading of a segment. Example: { "conceptName": "chicken thigh", "score": 0.833, "reasons": ["head:chicken thigh(2 tokens)", "entry:PLURAL"], "attributes": ["bone:boneless"] } */
export type ResolutionCandidateView = {
  __typename?: 'ResolutionCandidateView';
  attributes: Array<Scalars['String']['output']>;
  conceptId: Scalars['ID']['output'];
  conceptName: Scalars['String']['output'];
  /** "ROLE:valueKey", e.g. "INSTRUCTION:divided". */
  modifiers: Array<Scalars['String']['output']>;
  preparations: Array<Scalars['String']['output']>;
  reasons: Array<Scalars['String']['output']>;
  score: Scalars['Float']['output'];
};

/**
 * A readable resolution: the concept, attributes, preparations, and the spans that explain them.
 *
 * Example ("1 lb boneless chicken thighs"): { "status": "AUTO_RESOLVED", "conceptName": "chicken thigh", "attributes": ["bone:boneless"], "preparations": [], "text": "chicken thigh (bone: boneless)", "score": 0.833 }
 */
export type ResolutionView = {
  __typename?: 'ResolutionView';
  /** "definition:value" keys, e.g. "bone:boneless". */
  attributes: Array<Scalars['String']['output']>;
  candidateCount: Scalars['Int']['output'];
  conceptId?: Maybe<Scalars['ID']['output']>;
  conceptName?: Maybe<Scalars['String']['output']>;
  highlights: Array<TextSpan>;
  /** Preparation keys with degree, e.g. "chop (fine)". */
  preparations: Array<Scalars['String']['output']>;
  score?: Maybe<Scalars['Float']['output']>;
  status: MentionStatus;
  text: Scalars['String']['output'];
};

export type ResolveDuplicatePayload = MutationPayload & {
  __typename?: 'ResolveDuplicatePayload';
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  /** What the decision did. */
  preview?: Maybe<DuplicateResolutionPreview>;
  success: Scalars['Boolean']['output'];
};

export type ResolveExactDuplicatesPayload = MutationPayload & {
  __typename?: 'ResolveExactDuplicatesPayload';
  effect: MutationEffect;
  failed?: Maybe<Scalars['Int']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  resolved?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Example: { "success": true, "nextId": "cm3j..." } (nextId is null when advanceToNext was false or nothing is left to review) */
export type SaveIngredientPayload = MutationPayload & {
  __typename?: 'SaveIngredientPayload';
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  nextId?: Maybe<Scalars['ID']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Example: mutation { setLineReviewStatus(lineId: "cm3l...", status: CORRECT) { success note { id ingredientBlocks { lines { id reviewStatus } } } } } */
export type SetLineReviewStatusPayload = MutationPayload & {
  __typename?: 'SetLineReviewStatusPayload';
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  /** The refreshed note, so every mounted view of it updates from the payload. */
  note?: Maybe<Note>;
  success: Scalars['Boolean']['output'];
};

/** Where recipes came from: a URL, a book, or other text. Shared by every note that cites it. */
export type Source = {
  __typename?: 'Source';
  book?: Maybe<Book>;
  /** For text sources still waiting to be matched to a book. */
  bookLookup?: Maybe<BookLookupRef>;
  displayName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: SourceKind;
  url?: Maybe<SourceUrl>;
};

/** What a source is: a web page, a book, or text that is neither (yet). */
export type SourceKind =
  | 'BOOK'
  | 'OTHER'
  | 'URL';

/** Example: { "id": "cm3u...", "originalUrl": "https://cooking.example.com/chili?utm_source=rss", "normalizedUrl": "https://cooking.example.com/chili", "checkStatus": "REACHABLE", "lastSuccessfulVisitAt": "2026-11-13T15:00:00.000Z" } */
export type SourceUrl = {
  __typename?: 'SourceUrl';
  checkStatus: UrlCheckStatus;
  id: Scalars['ID']['output'];
  lastCheckedAt?: Maybe<Scalars['String']['output']>;
  lastFailureReason?: Maybe<Scalars['String']['output']>;
  /** Where the last check ended after redirects. */
  lastFinalUrl?: Maybe<Scalars['String']['output']>;
  lastHttpStatus?: Maybe<Scalars['Int']['output']>;
  /** Last 2xx response after permitted redirects. */
  lastSuccessfulVisitAt?: Maybe<Scalars['String']['output']>;
  normalizedUrl?: Maybe<Scalars['String']['output']>;
  /** The URL exactly as imported. */
  originalUrl: Scalars['String']['output'];
  siteName?: Maybe<Scalars['String']['output']>;
};

/** A background job the queue accepted. Example: { "success": true, "jobId": "reparse-2.1.0" } */
export type StartJobPayload = MutationPayload & {
  __typename?: 'StartJobPayload';
  effect: MutationEffect;
  jobId?: Maybe<Scalars['ID']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type StructureCounts = {
  __typename?: 'StructureCounts';
  byPattern: Array<StructurePatternCount>;
  decided: Scalars['Int']['output'];
  open: Scalars['Int']['output'];
};

export type StructureDecisionAction =
  | 'APPROVE'
  | 'CHANGE'
  | 'REJECT';

/** label is required with CHANGE. Example: { "action": "CHANGE", "label": "NOTE" } */
export type StructureDecisionInput = {
  action: StructureDecisionAction;
  label?: InputMaybe<LineKind>;
};

export type StructureDecisionPayload = MutationPayload & {
  __typename?: 'StructureDecisionPayload';
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  proposal?: Maybe<StructureProposal>;
  success: Scalars['Boolean']['output'];
};

export type StructureListStatus =
  | 'DECIDED'
  | 'OPEN';

/** scope: GENERAL, SOURCE_SPECIFIC, ONE_OFF, or UNDECIDED (fewer than three decisions). */
export type StructurePattern = {
  __typename?: 'StructurePattern';
  approved: Scalars['Int']['output'];
  canAutoApply: Scalars['Boolean']['output'];
  changed: Scalars['Int']['output'];
  notes: Scalars['Int']['output'];
  open: Scalars['Int']['output'];
  patternKey: Scalars['String']['output'];
  precision?: Maybe<Scalars['Float']['output']>;
  proposedLabel: Scalars['String']['output'];
  rejected: Scalars['Int']['output'];
  scope: Scalars['String']['output'];
  topSourceLabel?: Maybe<Scalars['String']['output']>;
  topSourceShare?: Maybe<Scalars['Float']['output']>;
};

export type StructurePatternCount = {
  __typename?: 'StructurePatternCount';
  open: Scalars['Int']['output'];
  patternKey: Scalars['String']['output'];
};

export type StructurePatternPayload = MutationPayload & {
  __typename?: 'StructurePatternPayload';
  applied?: Maybe<Scalars['Int']['output']>;
  effect: MutationEffect;
  message?: Maybe<Scalars['String']['output']>;
  skipped?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

/** A line the structure validator thinks the importer misfiled. parts is empty unless proposalType is SPLIT. Example: { "text": "For the sauce:", "assignedKind": "INGREDIENT", "proposedLabel": "SECTION_HEADING", "status": "OPEN" } */
export type StructureProposal = {
  __typename?: 'StructureProposal';
  after: Array<ContextLine>;
  /** INGREDIENT or INSTRUCTION. */
  assignedKind: Scalars['String']['output'];
  /** Up to two non-empty lines before and after, from the note content. */
  before: Array<ContextLine>;
  classifierVersion: Scalars['String']['output'];
  contentIndex: Scalars['Int']['output'];
  decidedAt?: Maybe<Scalars['String']['output']>;
  decidedBy?: Maybe<Scalars['String']['output']>;
  decidedLabel?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  margin: Scalars['Float']['output'];
  noteId: Scalars['ID']['output'];
  noteTitle?: Maybe<Scalars['String']['output']>;
  parts: Array<StructureSplitPart>;
  patternKey: Scalars['String']['output'];
  /** RECLASSIFY or SPLIT. */
  proposalType: Scalars['String']['output'];
  proposedLabel: Scalars['String']['output'];
  signals: Array<StructureSignal>;
  status: StructureProposalStatus;
  text: Scalars['String']['output'];
};

export type StructureProposalStatus =
  | 'APPROVED'
  | 'CHANGED'
  | 'OPEN'
  | 'REJECTED'
  | 'SUPERSEDED';

export type StructureProposalsPage = {
  __typename?: 'StructureProposalsPage';
  items: Array<StructureProposal>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** Example: { "id": "COLON_HEADING", "kind": "SECTION_HEADING", "weight": 4, "text": "For the sauce:" } */
export type StructureSignal = {
  __typename?: 'StructureSignal';
  id: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  text?: Maybe<Scalars['String']['output']>;
  weight: Scalars['Float']['output'];
};

export type StructureSplitPart = {
  __typename?: 'StructureSplitPart';
  end: Scalars['Int']['output'];
  kind: Scalars['String']['output'];
  start: Scalars['Int']['output'];
  text: Scalars['String']['output'];
};

/**
 * One word or punctuation mark of a parsed segment, for highlighting by role.
 *
 * Example: { "span": { "start": 5, "end": 13, "text": "boneless" }, "kind": "LEXEME", "roles": ["ATTRIBUTE"], "zone": "MAIN" }
 */
export type SyntaxToken = {
  __typename?: 'SyntaxToken';
  /** LEXEME (known), UNKNOWN, or PUNCT. */
  kind: Scalars['String']['output'];
  roles: Array<Scalars['String']['output']>;
  span: TextSpan;
  /** MEASUREMENT, MAIN, TRAILING, or PAREN. */
  zone: Scalars['String']['output'];
};

/** Half-open UTF-16 offsets into the raw line. Example: { "start": 14, "end": 29, "text": "calamansi juice" } */
export type TextSpan = {
  __typename?: 'TextSpan';
  end: Scalars['Int']['output'];
  start: Scalars['Int']['output'];
  text: Scalars['String']['output'];
};

/** Example: { "conceptId": "0193...", "name": "garlic", "lineCount": 214 } */
export type TopConcept = {
  __typename?: 'TopConcept';
  conceptId: Scalars['ID']['output'];
  /** How many active ingredient lines mention it. */
  lineCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
};

/** An open review card for an expression Peas doesn't understand yet. Example: { "phrase": "calamansi juice", "type": "UNKNOWN_FOOD_PHRASE", "mentions": 4, "notes": 3 } */
export type UnknownExpression = {
  __typename?: 'UnknownExpression';
  discoveryId: Scalars['ID']['output'];
  mentions: Scalars['Int']['output'];
  notes: Scalars['Int']['output'];
  phrase: Scalars['String']['output'];
  type: UnknownExpressionType;
};

export type UnknownExpressionType =
  | 'AMBIGUOUS_MATCH'
  | 'UNKNOWN_FOOD_PHRASE'
  | 'UNKNOWN_MODIFIER';

export type UnknownExpressionsPage = {
  __typename?: 'UnknownExpressionsPage';
  items: Array<UnknownExpression>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

/** An open unknown-food discovery. Example: { "discoveryId": "0193...", "phrase": "gochugaru", "mentionCount": 14 } */
export type UnknownPhrase = {
  __typename?: 'UnknownPhrase';
  discoveryId: Scalars['ID']['output'];
  mentionCount: Scalars['Int']['output'];
  phrase: Scalars['String']['output'];
};

/** The last reachability check. REACHABLE means a 2xx after permitted redirects; it does not prove the page still holds the recipe. BLOCKED means the checker refused the target (private network, unsupported port). */
export type UrlCheckStatus =
  | 'BLOCKED'
  | 'REACHABLE'
  | 'UNCHECKED'
  | 'UNREACHABLE';

/** A more specific concept counted in the expanded total and the path that reached it. Example on chicken: { "concept": { "canonicalName": "chicken thigh" }, "path": ["PART_OF"], "depth": 1, "counts": { "mentions": 12, ... } } */
export type UsageContributor = {
  __typename?: 'UsageContributor';
  concept: ConceptRef;
  counts: UsageCounts;
  depth: Scalars['Int']['output'];
  path: Array<FoodRelationshipType>;
};

/** Mentions, and the distinct lines, notes, and recipes they appear in. Example: { "mentions": 15, "lines": 15, "notes": 11, "recipes": 5 } */
export type UsageCounts = {
  __typename?: 'UsageCounts';
  lines: Scalars['Int']['output'];
  mentions: Scalars['Int']['output'];
  notes: Scalars['Int']['output'];
  recipes: Scalars['Int']['output'];
};

/** Direct mentions by status. needsReview counts mentions waiting for review whose best candidate is the concept. Example: { "autoResolved": 3, "verified": 0, "needsReview": 1 } */
export type UsageStatusCounts = {
  __typename?: 'UsageStatusCounts';
  autoResolved: Scalars['Int']['output'];
  needsReview: Scalars['Int']['output'];
  verified: Scalars['Int']['output'];
};

export type UserType =
  | 'ADMIN'
  | 'USER';

/**
 * The signed-in user, resolved from the session cookie. Null when signed out.
 *
 * Example: query { viewer { id username userType } } -> { "viewer": { "id": "cm3x...", "username": "allie", "userType": "ADMIN" } }
 */
export type Viewer = {
  __typename?: 'Viewer';
  /** A data: URL for the user's generated pea avatar, e.g. "data:image/svg+xml;base64,...". */
  avatarUrl?: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  userType: UserType;
  username: Scalars['String']['output'];
};

/** Everything decision forms offer as targets. */
export type Vocabulary = {
  __typename?: 'Vocabulary';
  attributeValues: Array<AttributeValueOption>;
  definitions: Array<AttributeDefinitionOption>;
  /** e.g. ["fine", "coarse", ...] */
  degreeKeys: Array<Scalars['String']['output']>;
  /** e.g. ["divided", "optional", ...] */
  instructionKeys: Array<Scalars['String']['output']>;
  /** e.g. ["heaping", "packed", ...] */
  measurementModifierKeys: Array<Scalars['String']['output']>;
  preparations: Array<PreparationOption>;
};

/** Review throughput for one week (reverts excluded). Example: { "weekStart": "2026-11-09", "decisions": 14, "mentionsChanged": 212 } */
export type WeeklyReview = {
  __typename?: 'WeeklyReview';
  decisions: Scalars['Int']['output'];
  /** Mentions the week's decisions changed, including background reinterpretation. */
  mentionsChanged: Scalars['Int']['output'];
  /** Monday of the week, as an ISO date. */
  weekStart: Scalars['String']['output'];
};

/** Example: { "year": 2019, "count": 48 } */
export type YearCount = {
  __typename?: 'YearCount';
  count: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;




/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  MutationPayload:
    | ( ApplyDecisionPayload )
    | ( BasicPayload )
    | ( CleanupAllDataPayload )
    | ( CreateCategoryPayload )
    | ( CreateIngredientPayload )
    | ( MarkNoisePayload )
    | ( PromoteCompletedNotesPayload )
    | ( PromoteNotePayload )
    | ( RefreshDiscoveriesPayload )
    | ( ResolveDuplicatePayload )
    | ( ResolveExactDuplicatesPayload )
    | ( SaveIngredientPayload )
    | ( Omit<SetLineReviewStatusPayload, 'note'> & { note?: Maybe<_RefType['Note']> } )
    | ( StartJobPayload )
    | ( StructureDecisionPayload )
    | ( StructurePatternPayload )
  ;
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  ApplyDecisionInput: ApplyDecisionInput;
  ApplyDecisionPayload: ResolverTypeWrapper<ApplyDecisionPayload>;
  AttributeDefinitionOption: ResolverTypeWrapper<AttributeDefinitionOption>;
  AttributeUsage: ResolverTypeWrapper<AttributeUsage>;
  AttributeValueOption: ResolverTypeWrapper<AttributeValueOption>;
  BasicPayload: ResolverTypeWrapper<BasicPayload>;
  Book: ResolverTypeWrapper<Book>;
  BookCandidate: ResolverTypeWrapper<BookCandidate>;
  BookLookup: ResolverTypeWrapper<BookLookup>;
  BookLookupRef: ResolverTypeWrapper<BookLookupRef>;
  BookLookupStatus: BookLookupStatus;
  BookLookupsPage: ResolverTypeWrapper<BookLookupsPage>;
  BookMatchStatus: BookMatchStatus;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Category: ResolverTypeWrapper<Category>;
  CategoryAssignmentOrigin: CategoryAssignmentOrigin;
  CategoryAssignmentState: CategoryAssignmentState;
  CategoryEvidence: ResolverTypeWrapper<CategoryEvidence>;
  CategoryEvidenceStep: ResolverTypeWrapper<CategoryEvidenceStep>;
  CategoryInput: CategoryInput;
  CategoryKind: CategoryKind;
  CategoryMembership: ResolverTypeWrapper<CategoryMembership>;
  CategoryProvenance: CategoryProvenance;
  CategoryRef: ResolverTypeWrapper<CategoryRef>;
  CategoryRuleExample: ResolverTypeWrapper<CategoryRuleExample>;
  CategoryRulePreview: ResolverTypeWrapper<CategoryRulePreview>;
  ClassificationKind: ClassificationKind;
  ClassificationValue: ClassificationValue;
  CleanupAllDataPayload: ResolverTypeWrapper<CleanupAllDataPayload>;
  Concept: ResolverTypeWrapper<ConceptParent>;
  ConceptAttributeValue: ResolverTypeWrapper<ConceptAttributeValue>;
  ConceptClassification: ResolverTypeWrapper<ConceptClassification>;
  ConceptClassificationInput: ConceptClassificationInput;
  ConceptDecision: ResolverTypeWrapper<ConceptDecision>;
  ConceptDistributions: ResolverTypeWrapper<ConceptDistributions>;
  ConceptEntry: ResolverTypeWrapper<ConceptEntry>;
  ConceptGraph: ResolverTypeWrapper<ConceptGraph>;
  ConceptGraphDecision: ResolverTypeWrapper<ConceptGraphDecision>;
  ConceptGraphEdge: ResolverTypeWrapper<ConceptGraphEdge>;
  ConceptGraphNode: ResolverTypeWrapper<ConceptGraphNode>;
  ConceptMention: ResolverTypeWrapper<ConceptMention>;
  ConceptObservedForms: ResolverTypeWrapper<ConceptObservedForms>;
  ConceptOccurrence: ResolverTypeWrapper<ConceptOccurrence>;
  ConceptOccurrenceFacets: ResolverTypeWrapper<ConceptOccurrenceFacets>;
  ConceptOccurrenceFilter: ConceptOccurrenceFilter;
  ConceptOccurrencePage: ResolverTypeWrapper<ConceptOccurrencePage>;
  ConceptRef: ResolverTypeWrapper<ConceptRef>;
  ConceptRelationship: ResolverTypeWrapper<ConceptRelationship>;
  ConceptStatus: ConceptStatus;
  ConceptSubstitution: ResolverTypeWrapper<ConceptSubstitution>;
  ConceptSubstitutionInput: ConceptSubstitutionInput;
  ConceptSummary: ResolverTypeWrapper<ConceptSummary>;
  ConceptUsage: ResolverTypeWrapper<ConceptUsage>;
  ConceptUsageRank: ResolverTypeWrapper<ConceptUsageRank>;
  ConceptsPage: ResolverTypeWrapper<ConceptsPage>;
  ContextLine: ResolverTypeWrapper<ContextLine>;
  CorpusAnalytics: ResolverTypeWrapper<CorpusAnalytics>;
  CorpusAttributeCount: ResolverTypeWrapper<CorpusAttributeCount>;
  CorpusHealth: ResolverTypeWrapper<CorpusHealth>;
  CorpusHealthSnapshot: ResolverTypeWrapper<CorpusHealthSnapshot>;
  CorpusHealthTrends: ResolverTypeWrapper<CorpusHealthTrends>;
  CorpusMentionCounts: ResolverTypeWrapper<CorpusMentionCounts>;
  CorpusPreparationCount: ResolverTypeWrapper<CorpusPreparationCount>;
  CreateCategoryPayload: ResolverTypeWrapper<CreateCategoryPayload>;
  CreateIngredientPayload: ResolverTypeWrapper<CreateIngredientPayload>;
  DashboardStats: ResolverTypeWrapper<DashboardStats>;
  DecisionPreview: ResolverTypeWrapper<DecisionPreview>;
  DecisionPreviewCounts: ResolverTypeWrapper<DecisionPreviewCounts>;
  DecisionPreviewExample: ResolverTypeWrapper<DecisionPreviewExample>;
  DeletedCount: ResolverTypeWrapper<DeletedCount>;
  Discovery: ResolverTypeWrapper<DiscoveryParent>;
  DiscoveryExample: ResolverTypeWrapper<DiscoveryExample>;
  DiscoveryPage: ResolverTypeWrapper<Omit<DiscoveryPage, 'items'> & { items: Array<ResolversTypes['Discovery']> }>;
  DiscoveryStatus: DiscoveryStatus;
  DiscoveryType: DiscoveryType;
  DiscoveryTypeCount: ResolverTypeWrapper<DiscoveryTypeCount>;
  DuplicateCandidate: ResolverTypeWrapper<DuplicateCandidate>;
  DuplicateCandidateDetail: ResolverTypeWrapper<Omit<DuplicateCandidateDetail, 'existingNote' | 'incomingNote'> & { existingNote: ResolversTypes['Note'], incomingNote: ResolversTypes['Note'] }>;
  DuplicateCandidateStatus: DuplicateCandidateStatus;
  DuplicateCandidatesPage: ResolverTypeWrapper<DuplicateCandidatesPage>;
  DuplicateKeepChoice: DuplicateKeepChoice;
  DuplicateKind: DuplicateKind;
  DuplicateNoteSummary: ResolverTypeWrapper<DuplicateNoteSummary>;
  DuplicateResolution: ResolverTypeWrapper<DuplicateResolution>;
  DuplicateResolutionInput: DuplicateResolutionInput;
  DuplicateResolutionPreview: ResolverTypeWrapper<DuplicateResolutionPreview>;
  DuplicateSignals: ResolverTypeWrapper<DuplicateSignals>;
  EntityRef: ResolverTypeWrapper<EntityRef>;
  EvernoteMetadata: ResolverTypeWrapper<EvernoteMetadata>;
  FailedUrlCheck: ResolverTypeWrapper<FailedUrlCheck>;
  FailedUrlChecksPage: ResolverTypeWrapper<FailedUrlChecksPage>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  FoodRelationshipType: FoodRelationshipType;
  GraphDirection: GraphDirection;
  HealthPhrase: ResolverTypeWrapper<HealthPhrase>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ImportReviewCounts: ResolverTypeWrapper<ImportReviewCounts>;
  ImportStats: ResolverTypeWrapper<ImportStats>;
  Ingredient: ResolverTypeWrapper<Ingredient>;
  IngredientAlias: ResolverTypeWrapper<IngredientAlias>;
  IngredientBlock: ResolverTypeWrapper<Omit<IngredientBlock, 'lines'> & { lines: Array<ResolversTypes['IngredientLine']> }>;
  IngredientCounts: ResolverTypeWrapper<IngredientCounts>;
  IngredientCreateInput: IngredientCreateInput;
  IngredientLine: ResolverTypeWrapper<IngredientLineParent>;
  IngredientLineStats: ResolverTypeWrapper<IngredientLineStats>;
  IngredientOption: ResolverTypeWrapper<IngredientOption>;
  IngredientProperty: IngredientProperty;
  IngredientPropertyState: ResolverTypeWrapper<IngredientPropertyState>;
  IngredientReference: ResolverTypeWrapper<IngredientReference>;
  IngredientRelation: ResolverTypeWrapper<IngredientRelation>;
  IngredientRelationInput: IngredientRelationInput;
  IngredientSaveInput: IngredientSaveInput;
  IngredientSummary: ResolverTypeWrapper<IngredientSummary>;
  IngredientView: IngredientView;
  InstructionLine: ResolverTypeWrapper<InstructionLine>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InvalidationDomain: InvalidationDomain;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Job: ResolverTypeWrapper<Job>;
  JobStatus: JobStatus;
  JobType: JobType;
  LabelCount: ResolverTypeWrapper<LabelCount>;
  LexiconEntryDetail: ResolverTypeWrapper<LexiconEntryDetailParent>;
  LexiconEntryRef: ResolverTypeWrapper<LexiconEntryRef>;
  LexiconEntryRow: ResolverTypeWrapper<LexiconEntryRow>;
  LexiconOccurrence: ResolverTypeWrapper<LexiconOccurrence>;
  LexiconOccurrencePage: ResolverTypeWrapper<LexiconOccurrencePage>;
  LexiconPage: ResolverTypeWrapper<LexiconPage>;
  LineKind: LineKind;
  LineReviewStatus: LineReviewStatus;
  LiveParseMetrics: ResolverTypeWrapper<LiveParseMetrics>;
  ManualBookInput: ManualBookInput;
  MarkNoisePayload: ResolverTypeWrapper<MarkNoisePayload>;
  Mention: ResolverTypeWrapper<Mention>;
  MentionStatus: MentionStatus;
  ModifierUsage: ResolverTypeWrapper<ModifierUsage>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  MutationEffect: ResolverTypeWrapper<MutationEffect>;
  MutationPayload: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['MutationPayload']>;
  NamedTag: ResolverTypeWrapper<NamedTag>;
  Note: ResolverTypeWrapper<Omit<Note, 'ingredientBlocks'> & { ingredientBlocks: Array<ResolversTypes['IngredientBlock']> }>;
  NoteImage: ResolverTypeWrapper<NoteImage>;
  NoteSource: ResolverTypeWrapper<NoteSource>;
  NoteSourceOrigin: NoteSourceOrigin;
  NoteStatus: NoteStatus;
  NoteStatusCounts: ResolverTypeWrapper<NoteStatusCounts>;
  NoteSummary: ResolverTypeWrapper<NoteSummary>;
  NoteTitleRef: ResolverTypeWrapper<NoteTitleRef>;
  NotesPage: ResolverTypeWrapper<NotesPage>;
  ObservedForm: ResolverTypeWrapper<ObservedForm>;
  OccurrenceCategoryFacet: ResolverTypeWrapper<OccurrenceCategoryFacet>;
  OccurrenceSourceFacet: ResolverTypeWrapper<OccurrenceSourceFacet>;
  ParseMode: ParseMode;
  ParseStatus: ParseStatus;
  ParserVersionHealth: ResolverTypeWrapper<ParserVersionHealth>;
  PlaygroundMention: ResolverTypeWrapper<PlaygroundMention>;
  PlaygroundResult: ResolverTypeWrapper<PlaygroundResult>;
  PreparationOption: ResolverTypeWrapper<PreparationOption>;
  PreparationUsage: ResolverTypeWrapper<PreparationUsage>;
  PreviewCategory: ResolverTypeWrapper<PreviewCategory>;
  PreviewSource: ResolverTypeWrapper<PreviewSource>;
  PrimarySourceChange: ResolverTypeWrapper<PrimarySourceChange>;
  PromoteCompletedNotesPayload: ResolverTypeWrapper<PromoteCompletedNotesPayload>;
  PromoteNotePayload: ResolverTypeWrapper<PromoteNotePayload>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Recipe: ResolverTypeWrapper<Omit<Recipe, 'ingredientBlocks'> & { ingredientBlocks: Array<ResolversTypes['IngredientBlock']> }>;
  RecipeSummary: ResolverTypeWrapper<RecipeSummary>;
  RecipeTaxonomy: ResolverTypeWrapper<RecipeTaxonomy>;
  RecipeUpdateInput: RecipeUpdateInput;
  RecipesPage: ResolverTypeWrapper<RecipesPage>;
  RefreshDiscoveriesPayload: ResolverTypeWrapper<RefreshDiscoveriesPayload>;
  ReinterpretBacklog: ResolverTypeWrapper<ReinterpretBacklog>;
  ResolutionCandidateView: ResolverTypeWrapper<ResolutionCandidateView>;
  ResolutionView: ResolverTypeWrapper<ResolutionView>;
  ResolveDuplicatePayload: ResolverTypeWrapper<ResolveDuplicatePayload>;
  ResolveExactDuplicatesPayload: ResolverTypeWrapper<ResolveExactDuplicatesPayload>;
  SaveIngredientPayload: ResolverTypeWrapper<SaveIngredientPayload>;
  SetLineReviewStatusPayload: ResolverTypeWrapper<Omit<SetLineReviewStatusPayload, 'note'> & { note?: Maybe<ResolversTypes['Note']> }>;
  Source: ResolverTypeWrapper<Source>;
  SourceKind: SourceKind;
  SourceUrl: ResolverTypeWrapper<SourceUrl>;
  StartJobPayload: ResolverTypeWrapper<StartJobPayload>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  StructureCounts: ResolverTypeWrapper<StructureCounts>;
  StructureDecisionAction: StructureDecisionAction;
  StructureDecisionInput: StructureDecisionInput;
  StructureDecisionPayload: ResolverTypeWrapper<StructureDecisionPayload>;
  StructureListStatus: StructureListStatus;
  StructurePattern: ResolverTypeWrapper<StructurePattern>;
  StructurePatternCount: ResolverTypeWrapper<StructurePatternCount>;
  StructurePatternPayload: ResolverTypeWrapper<StructurePatternPayload>;
  StructureProposal: ResolverTypeWrapper<StructureProposal>;
  StructureProposalStatus: StructureProposalStatus;
  StructureProposalsPage: ResolverTypeWrapper<StructureProposalsPage>;
  StructureSignal: ResolverTypeWrapper<StructureSignal>;
  StructureSplitPart: ResolverTypeWrapper<StructureSplitPart>;
  SyntaxToken: ResolverTypeWrapper<SyntaxToken>;
  TextSpan: ResolverTypeWrapper<TextSpan>;
  TopConcept: ResolverTypeWrapper<TopConcept>;
  UnknownExpression: ResolverTypeWrapper<UnknownExpression>;
  UnknownExpressionType: UnknownExpressionType;
  UnknownExpressionsPage: ResolverTypeWrapper<UnknownExpressionsPage>;
  UnknownPhrase: ResolverTypeWrapper<UnknownPhrase>;
  UrlCheckStatus: UrlCheckStatus;
  UsageContributor: ResolverTypeWrapper<UsageContributor>;
  UsageCounts: ResolverTypeWrapper<UsageCounts>;
  UsageStatusCounts: ResolverTypeWrapper<UsageStatusCounts>;
  UserType: UserType;
  Viewer: ResolverTypeWrapper<Viewer>;
  Vocabulary: ResolverTypeWrapper<Vocabulary>;
  WeeklyReview: ResolverTypeWrapper<WeeklyReview>;
  YearCount: ResolverTypeWrapper<YearCount>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  ApplyDecisionInput: ApplyDecisionInput;
  ApplyDecisionPayload: ApplyDecisionPayload;
  AttributeDefinitionOption: AttributeDefinitionOption;
  AttributeUsage: AttributeUsage;
  AttributeValueOption: AttributeValueOption;
  BasicPayload: BasicPayload;
  Book: Book;
  BookCandidate: BookCandidate;
  BookLookup: BookLookup;
  BookLookupRef: BookLookupRef;
  BookLookupsPage: BookLookupsPage;
  Boolean: Scalars['Boolean']['output'];
  Category: Category;
  CategoryEvidence: CategoryEvidence;
  CategoryEvidenceStep: CategoryEvidenceStep;
  CategoryInput: CategoryInput;
  CategoryMembership: CategoryMembership;
  CategoryRef: CategoryRef;
  CategoryRuleExample: CategoryRuleExample;
  CategoryRulePreview: CategoryRulePreview;
  CleanupAllDataPayload: CleanupAllDataPayload;
  Concept: ConceptParent;
  ConceptAttributeValue: ConceptAttributeValue;
  ConceptClassification: ConceptClassification;
  ConceptClassificationInput: ConceptClassificationInput;
  ConceptDecision: ConceptDecision;
  ConceptDistributions: ConceptDistributions;
  ConceptEntry: ConceptEntry;
  ConceptGraph: ConceptGraph;
  ConceptGraphDecision: ConceptGraphDecision;
  ConceptGraphEdge: ConceptGraphEdge;
  ConceptGraphNode: ConceptGraphNode;
  ConceptMention: ConceptMention;
  ConceptObservedForms: ConceptObservedForms;
  ConceptOccurrence: ConceptOccurrence;
  ConceptOccurrenceFacets: ConceptOccurrenceFacets;
  ConceptOccurrenceFilter: ConceptOccurrenceFilter;
  ConceptOccurrencePage: ConceptOccurrencePage;
  ConceptRef: ConceptRef;
  ConceptRelationship: ConceptRelationship;
  ConceptSubstitution: ConceptSubstitution;
  ConceptSubstitutionInput: ConceptSubstitutionInput;
  ConceptSummary: ConceptSummary;
  ConceptUsage: ConceptUsage;
  ConceptUsageRank: ConceptUsageRank;
  ConceptsPage: ConceptsPage;
  ContextLine: ContextLine;
  CorpusAnalytics: CorpusAnalytics;
  CorpusAttributeCount: CorpusAttributeCount;
  CorpusHealth: CorpusHealth;
  CorpusHealthSnapshot: CorpusHealthSnapshot;
  CorpusHealthTrends: CorpusHealthTrends;
  CorpusMentionCounts: CorpusMentionCounts;
  CorpusPreparationCount: CorpusPreparationCount;
  CreateCategoryPayload: CreateCategoryPayload;
  CreateIngredientPayload: CreateIngredientPayload;
  DashboardStats: DashboardStats;
  DecisionPreview: DecisionPreview;
  DecisionPreviewCounts: DecisionPreviewCounts;
  DecisionPreviewExample: DecisionPreviewExample;
  DeletedCount: DeletedCount;
  Discovery: DiscoveryParent;
  DiscoveryExample: DiscoveryExample;
  DiscoveryPage: Omit<DiscoveryPage, 'items'> & { items: Array<ResolversParentTypes['Discovery']> };
  DiscoveryTypeCount: DiscoveryTypeCount;
  DuplicateCandidate: DuplicateCandidate;
  DuplicateCandidateDetail: Omit<DuplicateCandidateDetail, 'existingNote' | 'incomingNote'> & { existingNote: ResolversParentTypes['Note'], incomingNote: ResolversParentTypes['Note'] };
  DuplicateCandidatesPage: DuplicateCandidatesPage;
  DuplicateNoteSummary: DuplicateNoteSummary;
  DuplicateResolution: DuplicateResolution;
  DuplicateResolutionInput: DuplicateResolutionInput;
  DuplicateResolutionPreview: DuplicateResolutionPreview;
  DuplicateSignals: DuplicateSignals;
  EntityRef: EntityRef;
  EvernoteMetadata: EvernoteMetadata;
  FailedUrlCheck: FailedUrlCheck;
  FailedUrlChecksPage: FailedUrlChecksPage;
  Float: Scalars['Float']['output'];
  HealthPhrase: HealthPhrase;
  ID: Scalars['ID']['output'];
  ImportReviewCounts: ImportReviewCounts;
  ImportStats: ImportStats;
  Ingredient: Ingredient;
  IngredientAlias: IngredientAlias;
  IngredientBlock: Omit<IngredientBlock, 'lines'> & { lines: Array<ResolversParentTypes['IngredientLine']> };
  IngredientCounts: IngredientCounts;
  IngredientCreateInput: IngredientCreateInput;
  IngredientLine: IngredientLineParent;
  IngredientLineStats: IngredientLineStats;
  IngredientOption: IngredientOption;
  IngredientPropertyState: IngredientPropertyState;
  IngredientReference: IngredientReference;
  IngredientRelation: IngredientRelation;
  IngredientRelationInput: IngredientRelationInput;
  IngredientSaveInput: IngredientSaveInput;
  IngredientSummary: IngredientSummary;
  InstructionLine: InstructionLine;
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Job: Job;
  LabelCount: LabelCount;
  LexiconEntryDetail: LexiconEntryDetailParent;
  LexiconEntryRef: LexiconEntryRef;
  LexiconEntryRow: LexiconEntryRow;
  LexiconOccurrence: LexiconOccurrence;
  LexiconOccurrencePage: LexiconOccurrencePage;
  LexiconPage: LexiconPage;
  LiveParseMetrics: LiveParseMetrics;
  ManualBookInput: ManualBookInput;
  MarkNoisePayload: MarkNoisePayload;
  Mention: Mention;
  ModifierUsage: ModifierUsage;
  Mutation: Record<PropertyKey, never>;
  MutationEffect: MutationEffect;
  MutationPayload: ResolversInterfaceTypes<ResolversParentTypes>['MutationPayload'];
  NamedTag: NamedTag;
  Note: Omit<Note, 'ingredientBlocks'> & { ingredientBlocks: Array<ResolversParentTypes['IngredientBlock']> };
  NoteImage: NoteImage;
  NoteSource: NoteSource;
  NoteStatusCounts: NoteStatusCounts;
  NoteSummary: NoteSummary;
  NoteTitleRef: NoteTitleRef;
  NotesPage: NotesPage;
  ObservedForm: ObservedForm;
  OccurrenceCategoryFacet: OccurrenceCategoryFacet;
  OccurrenceSourceFacet: OccurrenceSourceFacet;
  ParserVersionHealth: ParserVersionHealth;
  PlaygroundMention: PlaygroundMention;
  PlaygroundResult: PlaygroundResult;
  PreparationOption: PreparationOption;
  PreparationUsage: PreparationUsage;
  PreviewCategory: PreviewCategory;
  PreviewSource: PreviewSource;
  PrimarySourceChange: PrimarySourceChange;
  PromoteCompletedNotesPayload: PromoteCompletedNotesPayload;
  PromoteNotePayload: PromoteNotePayload;
  Query: Record<PropertyKey, never>;
  Recipe: Omit<Recipe, 'ingredientBlocks'> & { ingredientBlocks: Array<ResolversParentTypes['IngredientBlock']> };
  RecipeSummary: RecipeSummary;
  RecipeTaxonomy: RecipeTaxonomy;
  RecipeUpdateInput: RecipeUpdateInput;
  RecipesPage: RecipesPage;
  RefreshDiscoveriesPayload: RefreshDiscoveriesPayload;
  ReinterpretBacklog: ReinterpretBacklog;
  ResolutionCandidateView: ResolutionCandidateView;
  ResolutionView: ResolutionView;
  ResolveDuplicatePayload: ResolveDuplicatePayload;
  ResolveExactDuplicatesPayload: ResolveExactDuplicatesPayload;
  SaveIngredientPayload: SaveIngredientPayload;
  SetLineReviewStatusPayload: Omit<SetLineReviewStatusPayload, 'note'> & { note?: Maybe<ResolversParentTypes['Note']> };
  Source: Source;
  SourceUrl: SourceUrl;
  StartJobPayload: StartJobPayload;
  String: Scalars['String']['output'];
  StructureCounts: StructureCounts;
  StructureDecisionInput: StructureDecisionInput;
  StructureDecisionPayload: StructureDecisionPayload;
  StructurePattern: StructurePattern;
  StructurePatternCount: StructurePatternCount;
  StructurePatternPayload: StructurePatternPayload;
  StructureProposal: StructureProposal;
  StructureProposalsPage: StructureProposalsPage;
  StructureSignal: StructureSignal;
  StructureSplitPart: StructureSplitPart;
  SyntaxToken: SyntaxToken;
  TextSpan: TextSpan;
  TopConcept: TopConcept;
  UnknownExpression: UnknownExpression;
  UnknownExpressionsPage: UnknownExpressionsPage;
  UnknownPhrase: UnknownPhrase;
  UsageContributor: UsageContributor;
  UsageCounts: UsageCounts;
  UsageStatusCounts: UsageStatusCounts;
  Viewer: Viewer;
  Vocabulary: Vocabulary;
  WeeklyReview: WeeklyReview;
  YearCount: YearCount;
}>;

export type ApplyDecisionPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ApplyDecisionPayload'] = ResolversParentTypes['ApplyDecisionPayload']> = ResolversObject<{
  decisionId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  mentionsUpdated?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  needsBackgroundReinterpret?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  reinterpretCommand?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  revision?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  summary?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AttributeDefinitionOptionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['AttributeDefinitionOption'] = ResolversParentTypes['AttributeDefinitionOption']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type AttributeUsageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['AttributeUsage'] = ResolversParentTypes['AttributeUsage']> = ResolversObject<{
  asserted?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  definitionKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  definitionName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  direct?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expanded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  valueKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type AttributeValueOptionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['AttributeValueOption'] = ResolversParentTypes['AttributeValueOption']> = ResolversObject<{
  definitionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  definitionKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  definitionName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type BasicPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['BasicPayload'] = ResolversParentTypes['BasicPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type BookResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Book'] = ResolversParentTypes['Book']> = ResolversObject<{
  authors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  coverId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isbn10?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isbn13?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  matchStatus?: Resolver<ResolversTypes['BookMatchStatus'], ParentType, ContextType>;
  openLibraryWorkKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  publishedYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  publisher?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  subtitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type BookCandidateResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['BookCandidate'] = ResolversParentTypes['BookCandidate']> = ResolversObject<{
  authors?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  coverId?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  editionCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  evidence?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  firstPublishYear?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  isbns?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  matchedIsbn?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  publishers?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  subtitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  workKey?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type BookLookupResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['BookLookup'] = ResolversParentTypes['BookLookup']> = ResolversObject<{
  attempts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  book?: Resolver<Maybe<ResolversTypes['Book']>, ParentType, ContextType>;
  candidates?: Resolver<Array<ResolversTypes['BookCandidate']>, ParentType, ContextType>;
  errorReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  fetchedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  query?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BookLookupStatus'], ParentType, ContextType>;
}>;

export type BookLookupRefResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['BookLookupRef'] = ResolversParentTypes['BookLookupRef']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['BookLookupStatus'], ParentType, ContextType>;
}>;

export type BookLookupsPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['BookLookupsPage'] = ResolversParentTypes['BookLookupsPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['BookLookup']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type CategoryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Category'] = ResolversParentTypes['Category']> = ResolversObject<{
  approvedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  concept?: Resolver<Maybe<ResolversTypes['ConceptRef']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  excludedCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inferredCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['CategoryKind'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  ruleVersion?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  traversal?: Resolver<Array<ResolversTypes['FoodRelationshipType']>, ParentType, ContextType>;
}>;

export type CategoryEvidenceResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CategoryEvidence'] = ResolversParentTypes['CategoryEvidence']> = ResolversObject<{
  conceptId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  conceptName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lineId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mentionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  path?: Resolver<Array<ResolversTypes['CategoryEvidenceStep']>, ParentType, ContextType>;
}>;

export type CategoryEvidenceStepResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CategoryEvidenceStep'] = ResolversParentTypes['CategoryEvidenceStep']> = ResolversObject<{
  conceptId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  conceptName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['FoodRelationshipType'], ParentType, ContextType>;
}>;

export type CategoryMembershipResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CategoryMembership'] = ResolversParentTypes['CategoryMembership']> = ResolversObject<{
  category?: Resolver<ResolversTypes['CategoryRef'], ParentType, ContextType>;
  decidedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  evidence?: Resolver<Array<ResolversTypes['CategoryEvidence']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  origin?: Resolver<ResolversTypes['CategoryAssignmentOrigin'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['CategoryAssignmentState'], ParentType, ContextType>;
}>;

export type CategoryRefResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CategoryRef'] = ResolversParentTypes['CategoryRef']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['CategoryKind'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type CategoryRuleExampleResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CategoryRuleExample'] = ResolversParentTypes['CategoryRuleExample']> = ResolversObject<{
  evidence?: Resolver<Array<ResolversTypes['CategoryEvidence']>, ParentType, ContextType>;
  noteId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type CategoryRulePreviewResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CategoryRulePreview'] = ResolversParentTypes['CategoryRulePreview']> = ResolversObject<{
  examples?: Resolver<Array<ResolversTypes['CategoryRuleExample']>, ParentType, ContextType>;
  noteCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type CleanupAllDataPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CleanupAllDataPayload'] = ResolversParentTypes['CleanupAllDataPayload']> = ResolversObject<{
  deletedCounts?: Resolver<Maybe<Array<ResolversTypes['DeletedCount']>>, ParentType, ContextType>;
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ConceptResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Concept'] = ResolversParentTypes['Concept']> = ResolversObject<{
  attributes?: Resolver<Array<ResolversTypes['ConceptAttributeValue']>, ParentType, ContextType>;
  canonicalName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  children?: Resolver<Array<ResolversTypes['ConceptRelationship']>, ParentType, ContextType>;
  classifications?: Resolver<Array<ResolversTypes['ConceptClassification']>, ParentType, ContextType>;
  decisions?: Resolver<Array<ResolversTypes['ConceptDecision']>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  distributions?: Resolver<ResolversTypes['ConceptDistributions'], ParentType, ContextType, Partial<ConceptDistributionsArgs>>;
  entries?: Resolver<Array<ResolversTypes['ConceptEntry']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isComposed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  mentions?: Resolver<Array<ResolversTypes['ConceptMention']>, ParentType, ContextType>;
  mergedInto?: Resolver<Maybe<ResolversTypes['ConceptRef']>, ParentType, ContextType>;
  observedForms?: Resolver<ResolversTypes['ConceptObservedForms'], ParentType, ContextType, Partial<ConceptObservedFormsArgs>>;
  parents?: Resolver<Array<ResolversTypes['ConceptRelationship']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ConceptStatus'], ParentType, ContextType>;
  substitutions?: Resolver<Array<ResolversTypes['ConceptSubstitution']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  usage?: Resolver<ResolversTypes['ConceptUsage'], ParentType, ContextType, Partial<ConceptUsageArgs>>;
}>;

export type ConceptAttributeValueResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptAttributeValue'] = ResolversParentTypes['ConceptAttributeValue']> = ResolversObject<{
  attributeValueId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  definitionKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  valueKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ConceptClassificationResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptClassification'] = ResolversParentTypes['ConceptClassification']> = ResolversObject<{
  inheritedFrom?: Resolver<Maybe<ResolversTypes['ConceptRef']>, ParentType, ContextType>;
  isExplicit?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  source?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ConceptDecisionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptDecision'] = ResolversParentTypes['ConceptDecision']> = ResolversObject<{
  canRevert?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  reverted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ConceptDistributionsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptDistributions'] = ResolversParentTypes['ConceptDistributions']> = ResolversObject<{
  attributes?: Resolver<Array<ResolversTypes['AttributeUsage']>, ParentType, ContextType>;
  expand?: Resolver<Array<ResolversTypes['FoodRelationshipType']>, ParentType, ContextType>;
  includeNeedsReview?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  modifiers?: Resolver<Array<ResolversTypes['ModifierUsage']>, ParentType, ContextType>;
  preparations?: Resolver<Array<ResolversTypes['PreparationUsage']>, ParentType, ContextType>;
}>;

export type ConceptEntryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptEntry'] = ResolversParentTypes['ConceptEntry']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ConceptGraphResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptGraph'] = ResolversParentTypes['ConceptGraph']> = ResolversObject<{
  centerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  depth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  direction?: Resolver<ResolversTypes['GraphDirection'], ParentType, ContextType>;
  edges?: Resolver<Array<ResolversTypes['ConceptGraphEdge']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['ConceptGraphNode']>, ParentType, ContextType>;
  truncated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  types?: Resolver<Array<ResolversTypes['FoodRelationshipType']>, ParentType, ContextType>;
}>;

export type ConceptGraphDecisionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptGraphDecision'] = ResolversParentTypes['ConceptGraphDecision']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ConceptGraphEdgeResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptGraphEdge'] = ResolversParentTypes['ConceptGraphEdge']> = ResolversObject<{
  decision?: Resolver<Maybe<ResolversTypes['ConceptGraphDecision']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sourceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targetId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['FoodRelationshipType'], ParentType, ContextType>;
}>;

export type ConceptGraphNodeResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptGraphNode'] = ResolversParentTypes['ConceptGraphNode']> = ResolversObject<{
  canonicalName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  directMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  level?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ConceptStatus'], ParentType, ContextType>;
}>;

export type ConceptMentionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptMention'] = ResolversParentTypes['ConceptMention']> = ResolversObject<{
  lineText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  noteTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rawText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ConceptObservedFormsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptObservedForms'] = ResolversParentTypes['ConceptObservedForms']> = ResolversObject<{
  forms?: Resolver<Array<ResolversTypes['ObservedForm']>, ParentType, ContextType>;
  otherMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ConceptOccurrenceResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptOccurrence'] = ResolversParentTypes['ConceptOccurrence']> = ResolversObject<{
  attributes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  concept?: Resolver<ResolversTypes['ConceptRef'], ParentType, ContextType>;
  lineId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lineText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  path?: Resolver<Array<ResolversTypes['FoodRelationshipType']>, ParentType, ContextType>;
  preparations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  recipeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  recipeTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  span?: Resolver<ResolversTypes['TextSpan'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['MentionStatus'], ParentType, ContextType>;
}>;

export type ConceptOccurrenceFacetsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptOccurrenceFacets'] = ResolversParentTypes['ConceptOccurrenceFacets']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['OccurrenceCategoryFacet']>, ParentType, ContextType>;
  sources?: Resolver<Array<ResolversTypes['OccurrenceSourceFacet']>, ParentType, ContextType>;
}>;

export type ConceptOccurrencePageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptOccurrencePage'] = ResolversParentTypes['ConceptOccurrencePage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['ConceptOccurrence']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ConceptRefResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptRef'] = ResolversParentTypes['ConceptRef']> = ResolversObject<{
  canonicalName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ConceptStatus'], ParentType, ContextType>;
}>;

export type ConceptRelationshipResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptRelationship'] = ResolversParentTypes['ConceptRelationship']> = ResolversObject<{
  concept?: Resolver<ResolversTypes['ConceptRef'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ConceptSubstitutionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptSubstitution'] = ResolversParentTypes['ConceptSubstitution']> = ResolversObject<{
  concept?: Resolver<ResolversTypes['ConceptRef'], ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ratio?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type ConceptSummaryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptSummary'] = ResolversParentTypes['ConceptSummary']> = ResolversObject<{
  canonicalName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  entryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mentionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ConceptStatus'], ParentType, ContextType>;
}>;

export type ConceptUsageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptUsage'] = ResolversParentTypes['ConceptUsage']> = ResolversObject<{
  byStatus?: Resolver<ResolversTypes['UsageStatusCounts'], ParentType, ContextType>;
  contributors?: Resolver<Array<ResolversTypes['UsageContributor']>, ParentType, ContextType>;
  direct?: Resolver<ResolversTypes['UsageCounts'], ParentType, ContextType>;
  expand?: Resolver<Array<ResolversTypes['FoodRelationshipType']>, ParentType, ContextType>;
  expanded?: Resolver<ResolversTypes['UsageCounts'], ParentType, ContextType>;
  includeNeedsReview?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ConceptUsageRankResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptUsageRank'] = ResolversParentTypes['ConceptUsageRank']> = ResolversObject<{
  concept?: Resolver<ResolversTypes['ConceptRef'], ParentType, ContextType>;
  directMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  directNotes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expandedMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ConceptsPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptsPage'] = ResolversParentTypes['ConceptsPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['ConceptSummary']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ContextLineResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ContextLine'] = ResolversParentTypes['ContextLine']> = ResolversObject<{
  contentIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type CorpusAnalyticsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CorpusAnalytics'] = ResolversParentTypes['CorpusAnalytics']> = ResolversObject<{
  attributes?: Resolver<Array<ResolversTypes['CorpusAttributeCount']>, ParentType, ContextType>;
  computedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  conceptsWithMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  isStale?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  preparations?: Resolver<Array<ResolversTypes['CorpusPreparationCount']>, ParentType, ContextType>;
  rare?: Resolver<Array<ResolversTypes['ConceptUsageRank']>, ParentType, ContextType>;
  rareConceptCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  settledMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  topDirect?: Resolver<Array<ResolversTypes['ConceptUsageRank']>, ParentType, ContextType>;
  topExpanded?: Resolver<Array<ResolversTypes['ConceptUsageRank']>, ParentType, ContextType>;
  unusedVerifiedConcepts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type CorpusAttributeCountResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CorpusAttributeCount'] = ResolversParentTypes['CorpusAttributeCount']> = ResolversObject<{
  asserted?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  definitionKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  definitionName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  valueKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type CorpusHealthResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CorpusHealth'] = ResolversParentTypes['CorpusHealth']> = ResolversObject<{
  awaitingParsing?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lexiconRevision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  linesWithMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  live?: Resolver<Maybe<ResolversTypes['LiveParseMetrics']>, ParentType, ContextType>;
  mentions?: Resolver<ResolversTypes['CorpusMentionCounts'], ParentType, ContextType>;
  openDiscoveryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  parsedSuccessfully?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  parsedWithErrors?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reinterpretBacklog?: Resolver<ResolversTypes['ReinterpretBacklog'], ParentType, ContextType>;
  topUnknownPhrases?: Resolver<Array<ResolversTypes['UnknownPhrase']>, ParentType, ContextType>;
}>;

export type CorpusHealthSnapshotResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CorpusHealthSnapshot'] = ResolversParentTypes['CorpusHealthSnapshot']> = ResolversObject<{
  autoResolvedMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  avgCandidates?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lexiconRevision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  needsReviewMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  openDiscoveries?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  parserVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  takenAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalLines?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  trigger?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  unresolvedMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  verifiedMentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type CorpusHealthTrendsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CorpusHealthTrends'] = ResolversParentTypes['CorpusHealthTrends']> = ResolversObject<{
  byParserVersion?: Resolver<Array<ResolversTypes['ParserVersionHealth']>, ParentType, ContextType>;
  mostAmbiguousPhrases?: Resolver<Array<ResolversTypes['HealthPhrase']>, ParentType, ContextType>;
  parserVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reviewByWeek?: Resolver<Array<ResolversTypes['WeeklyReview']>, ParentType, ContextType>;
  snapshots?: Resolver<Array<ResolversTypes['CorpusHealthSnapshot']>, ParentType, ContextType>;
  topUnknownPhrases?: Resolver<Array<ResolversTypes['HealthPhrase']>, ParentType, ContextType>;
}>;

export type CorpusMentionCountsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CorpusMentionCounts'] = ResolversParentTypes['CorpusMentionCounts']> = ResolversObject<{
  autoResolved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  needsReview?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unresolved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type CorpusPreparationCountResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CorpusPreparationCount'] = ResolversParentTypes['CorpusPreparationCount']> = ResolversObject<{
  concepts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  preparationKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type CreateCategoryPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CreateCategoryPayload'] = ResolversParentTypes['CreateCategoryPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CreateIngredientPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CreateIngredientPayload'] = ResolversParentTypes['CreateIngredientPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DashboardStatsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DashboardStats'] = ResolversParentTypes['DashboardStats']> = ResolversObject<{
  conceptCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ingredientLines?: Resolver<ResolversTypes['IngredientLineStats'], ParentType, ContextType>;
  instructionLineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  noteCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  notesBySavedYear?: Resolver<Array<ResolversTypes['YearCount']>, ParentType, ContextType>;
  notesByStatus?: Resolver<ResolversTypes['NoteStatusCounts'], ParentType, ContextType>;
  notesReadyToPromote?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recipeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  topCategories?: Resolver<Array<ResolversTypes['LabelCount']>, ParentType, ContextType>;
  topConcepts?: Resolver<Array<ResolversTypes['TopConcept']>, ParentType, ContextType>;
  topSources?: Resolver<Array<ResolversTypes['LabelCount']>, ParentType, ContextType>;
  topTags?: Resolver<Array<ResolversTypes['LabelCount']>, ParentType, ContextType>;
  verifiedConceptCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type DecisionPreviewResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DecisionPreview'] = ResolversParentTypes['DecisionPreview']> = ResolversObject<{
  counts?: Resolver<ResolversTypes['DecisionPreviewCounts'], ParentType, ContextType>;
  examples?: Resolver<Array<ResolversTypes['DecisionPreviewExample']>, ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  truncated?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DecisionPreviewCountsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DecisionPreviewCounts'] = ResolversParentTypes['DecisionPreviewCounts']> = ResolversObject<{
  affected?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  attributesChanged?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  becameAmbiguous?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  becameUnresolved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  conceptChanged?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  newlyResolved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  scanned?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  verifiedConflicts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type DecisionPreviewExampleResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DecisionPreviewExample'] = ResolversParentTypes['DecisionPreviewExample']> = ResolversObject<{
  after?: Resolver<ResolversTypes['ResolutionView'], ParentType, ContextType>;
  before?: Resolver<ResolversTypes['ResolutionView'], ParentType, ContextType>;
  lineText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  noteTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  verifiedConflict?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DeletedCountResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DeletedCount'] = ResolversParentTypes['DeletedCount']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type DiscoveryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Discovery'] = ResolversParentTypes['Discovery']> = ResolversObject<{
  concepts?: Resolver<Array<ResolversTypes['ConceptRef']>, ParentType, ContextType>;
  distinctNoteCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  entries?: Resolver<Array<ResolversTypes['LexiconEntryRef']>, ParentType, ContextType>;
  examples?: Resolver<Array<ResolversTypes['DiscoveryExample']>, ParentType, ContextType, Partial<DiscoveryExamplesArgs>>;
  fixtureBlock?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  payload?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['DiscoveryStatus'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['DiscoveryType'], ParentType, ContextType>;
}>;

export type DiscoveryExampleResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DiscoveryExample'] = ResolversParentTypes['DiscoveryExample']> = ResolversObject<{
  lineText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  noteTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  span?: Resolver<ResolversTypes['TextSpan'], ParentType, ContextType>;
}>;

export type DiscoveryPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DiscoveryPage'] = ResolversParentTypes['DiscoveryPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['Discovery']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type DiscoveryTypeCountResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DiscoveryTypeCount'] = ResolversParentTypes['DiscoveryTypeCount']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['DiscoveryType'], ParentType, ContextType>;
}>;

export type DuplicateCandidateResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DuplicateCandidate'] = ResolversParentTypes['DuplicateCandidate']> = ResolversObject<{
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  existing?: Resolver<ResolversTypes['DuplicateNoteSummary'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  incoming?: Resolver<ResolversTypes['DuplicateNoteSummary'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['DuplicateKind'], ParentType, ContextType>;
  resolution?: Resolver<Maybe<ResolversTypes['DuplicateResolution']>, ParentType, ContextType>;
  resolvedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  signals?: Resolver<ResolversTypes['DuplicateSignals'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['DuplicateCandidateStatus'], ParentType, ContextType>;
}>;

export type DuplicateCandidateDetailResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DuplicateCandidateDetail'] = ResolversParentTypes['DuplicateCandidateDetail']> = ResolversObject<{
  candidate?: Resolver<ResolversTypes['DuplicateCandidate'], ParentType, ContextType>;
  existingNote?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  incomingNote?: Resolver<ResolversTypes['Note'], ParentType, ContextType>;
}>;

export type DuplicateCandidatesPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DuplicateCandidatesPage'] = ResolversParentTypes['DuplicateCandidatesPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['DuplicateCandidate']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type DuplicateNoteSummaryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DuplicateNoteSummary'] = ResolversParentTypes['DuplicateNoteSummary']> = ResolversObject<{
  archivedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  ingredientLineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recipeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['NoteStatus'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type DuplicateResolutionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DuplicateResolution'] = ResolversParentTypes['DuplicateResolution']> = ResolversObject<{
  keep?: Resolver<ResolversTypes['DuplicateKeepChoice'], ParentType, ContextType>;
  mergeSources?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type DuplicateResolutionPreviewResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DuplicateResolutionPreview'] = ResolversParentTypes['DuplicateResolutionPreview']> = ResolversObject<{
  archivedNote?: Resolver<Maybe<ResolversTypes['NoteTitleRef']>, ParentType, ContextType>;
  attachedSources?: Resolver<Array<ResolversTypes['PreviewSource']>, ParentType, ContextType>;
  carriedCategories?: Resolver<Array<ResolversTypes['PreviewCategory']>, ParentType, ContextType>;
  carriedTags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  keptNote?: Resolver<Maybe<ResolversTypes['NoteTitleRef']>, ParentType, ContextType>;
  movedRecipeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  primarySourceChange?: Resolver<Maybe<ResolversTypes['PrimarySourceChange']>, ParentType, ContextType>;
  summary?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type DuplicateSignalsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DuplicateSignals'] = ResolversParentTypes['DuplicateSignals']> = ResolversObject<{
  contentHash?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  ingredientSimilarity?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  rawHtmlHash?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  reasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  sharedSourceIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  titleSimilarity?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
}>;

export type EntityRefResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['EntityRef'] = ResolversParentTypes['EntityRef']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  typename?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type EvernoteMetadataResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['EvernoteMetadata'] = ResolversParentTypes['EvernoteMetadata']> = ResolversObject<{
  notebook?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  originalCreatedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type FailedUrlCheckResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['FailedUrlCheck'] = ResolversParentTypes['FailedUrlCheck']> = ResolversObject<{
  checkStatus?: Resolver<ResolversTypes['UrlCheckStatus'], ParentType, ContextType>;
  consecutiveFailures?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lastCheckedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastFailureReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastHttpStatus?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  lastSuccessfulVisitAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  notes?: Resolver<Array<ResolversTypes['NoteTitleRef']>, ParentType, ContextType>;
  originalUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  urlId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type FailedUrlChecksPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['FailedUrlChecksPage'] = ResolversParentTypes['FailedUrlChecksPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['FailedUrlCheck']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type HealthPhraseResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['HealthPhrase'] = ResolversParentTypes['HealthPhrase']> = ResolversObject<{
  discoveryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mentionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  phrase?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['DiscoveryType'], ParentType, ContextType>;
}>;

export type ImportReviewCountsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ImportReviewCounts'] = ResolversParentTypes['ImportReviewCounts']> = ResolversObject<{
  bookMatchesToReview?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  exactDuplicates?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  failedSourceChecks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  importedNotes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  likelyDuplicates?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pendingImports?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  possibleDuplicates?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  resolved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sourceConflicts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ImportStatsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ImportStats'] = ResolversParentTypes['ImportStats']> = ResolversObject<{
  numberOfIngredients?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numberOfNotes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numberOfParsingErrors?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type IngredientResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Ingredient'] = ResolversParentTypes['Ingredient']> = ResolversObject<{
  aliases?: Resolver<Array<ResolversTypes['IngredientAlias']>, ParentType, ContextType>;
  categories?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  dietaryTags?: Resolver<Array<ResolversTypes['IngredientProperty']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isComposedIngredient?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isReviewed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  plural?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  propertyStates?: Resolver<Array<ResolversTypes['IngredientPropertyState']>, ParentType, ContextType>;
  referenceCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  references?: Resolver<Array<ResolversTypes['IngredientReference']>, ParentType, ContextType>;
  relationships?: Resolver<Array<ResolversTypes['IngredientRelation']>, ParentType, ContextType>;
  reviewedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  substitutions?: Resolver<Array<ResolversTypes['IngredientOption']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  variants?: Resolver<Array<ResolversTypes['IngredientRelation']>, ParentType, ContextType>;
}>;

export type IngredientAliasResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientAlias'] = ResolversParentTypes['IngredientAlias']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type IngredientBlockResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientBlock'] = ResolversParentTypes['IngredientBlock']> = ResolversObject<{
  blockIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lines?: Resolver<Array<ResolversTypes['IngredientLine']>, ParentType, ContextType>;
}>;

export type IngredientCountsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientCounts'] = ResolversParentTypes['IngredientCounts']> = ResolversObject<{
  all?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unreviewed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type IngredientLineResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientLine'] = ResolversParentTypes['IngredientLine']> = ResolversObject<{
  blockIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lineIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lineKind?: Resolver<ResolversTypes['LineKind'], ParentType, ContextType>;
  mentions?: Resolver<Array<ResolversTypes['Mention']>, ParentType, ContextType>;
  parseStatus?: Resolver<ResolversTypes['ParseStatus'], ParentType, ContextType>;
  parserVersion?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reference?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  reviewStatus?: Resolver<ResolversTypes['LineReviewStatus'], ParentType, ContextType>;
}>;

export type IngredientLineStatsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientLineStats'] = ResolversParentTypes['IngredientLineStats']> = ResolversObject<{
  awaitingParsing?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  markedCorrect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  markedIncorrect?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  parsedSuccessfully?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  parsedWithErrors?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type IngredientOptionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientOption'] = ResolversParentTypes['IngredientOption']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type IngredientPropertyStateResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientPropertyState'] = ResolversParentTypes['IngredientPropertyState']> = ResolversObject<{
  explicit?: Resolver<Maybe<ResolversTypes['ClassificationValue']>, ParentType, ContextType>;
  inherited?: Resolver<Maybe<ResolversTypes['ClassificationValue']>, ParentType, ContextType>;
  inheritedFrom?: Resolver<Maybe<ResolversTypes['IngredientOption']>, ParentType, ContextType>;
  property?: Resolver<ResolversTypes['IngredientProperty'], ParentType, ContextType>;
}>;

export type IngredientReferenceResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientReference'] = ResolversParentTypes['IngredientReference']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  noteTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reference?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type IngredientRelationResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientRelation'] = ResolversParentTypes['IngredientRelation']> = ResolversObject<{
  ingredient?: Resolver<ResolversTypes['IngredientOption'], ParentType, ContextType>;
  relationshipType?: Resolver<ResolversTypes['FoodRelationshipType'], ParentType, ContextType>;
}>;

export type IngredientSummaryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientSummary'] = ResolversParentTypes['IngredientSummary']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isReviewed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentIngredientId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  plural?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  properties?: Resolver<Array<ResolversTypes['IngredientProperty']>, ParentType, ContextType>;
  referenceCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type InstructionLineResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['InstructionLine'] = ResolversParentTypes['InstructionLine']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lineIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  lineKind?: Resolver<ResolversTypes['LineKind'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type JobResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Job'] = ResolversParentTypes['Job']> = ResolversObject<{
  completedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  processedCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  retryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['JobStatus'], ParentType, ContextType>;
  totalCount?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['JobType'], ParentType, ContextType>;
}>;

export type LabelCountResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LabelCount'] = ResolversParentTypes['LabelCount']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type LexiconEntryDetailResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LexiconEntryDetail'] = ResolversParentTypes['LexiconEntryDetail']> = ResolversObject<{
  conceptId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  occurrences?: Resolver<ResolversTypes['LexiconOccurrencePage'], ParentType, ContextType, Partial<LexiconEntryDetailOccurrencesArgs>>;
  revisionAdded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  revisionRetired?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targetLabel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type LexiconEntryRefResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LexiconEntryRef'] = ResolversParentTypes['LexiconEntryRef']> = ResolversObject<{
  attributeValueId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  conceptId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targetLabel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type LexiconEntryRowResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LexiconEntryRow'] = ResolversParentTypes['LexiconEntryRow']> = ResolversObject<{
  attributeValueId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  conceptId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  preparationId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targetLabel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  valueKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type LexiconOccurrenceResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LexiconOccurrence'] = ResolversParentTypes['LexiconOccurrence']> = ResolversObject<{
  conceptName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lineText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  recipeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  recipeTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  span?: Resolver<Maybe<ResolversTypes['TextSpan']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['MentionStatus'], ParentType, ContextType>;
}>;

export type LexiconOccurrencePageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LexiconOccurrencePage'] = ResolversParentTypes['LexiconOccurrencePage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['LexiconOccurrence']>, ParentType, ContextType>;
  nextCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type LexiconPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LexiconPage'] = ResolversParentTypes['LexiconPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['LexiconEntryRow']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type LiveParseMetricsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LiveParseMetrics'] = ResolversParentTypes['LiveParseMetrics']> = ResolversObject<{
  averageCandidatesPerSegment?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  lexiconRevision?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  lineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  linesPerSecond?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  structuralSuccessShare?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  unknownTokens?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  windowSeconds?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type MarkNoisePayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['MarkNoisePayload'] = ResolversParentTypes['MarkNoisePayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  linesDeactivated?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MentionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Mention'] = ResolversParentTypes['Mention']> = ResolversObject<{
  candidates?: Resolver<Array<ResolversTypes['ResolutionCandidateView']>, ParentType, ContextType>;
  concept?: Resolver<Maybe<ResolversTypes['ConceptRef']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lexiconRevision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  partIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  quantity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rawText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  segmentIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  span?: Resolver<ResolversTypes['TextSpan'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['MentionStatus'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['ResolutionView'], ParentType, ContextType>;
  tokens?: Resolver<Array<ResolversTypes['SyntaxToken']>, ParentType, ContextType>;
  unresolved?: Resolver<Array<ResolversTypes['TextSpan']>, ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ModifierUsageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ModifierUsage'] = ResolversParentTypes['ModifierUsage']> = ResolversObject<{
  direct?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expanded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  valueKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  addCategoryToNote?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationAddCategoryToNoteArgs, 'noteId'>>;
  applyDecision?: Resolver<ResolversTypes['ApplyDecisionPayload'], ParentType, ContextType, RequireFields<MutationApplyDecisionArgs, 'input'>>;
  approveCategory?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationApproveCategoryArgs, 'categoryId' | 'noteId'>>;
  cleanupAllData?: Resolver<ResolversTypes['CleanupAllDataPayload'], ParentType, ContextType>;
  createBookManually?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationCreateBookManuallyArgs, 'input' | 'lookupId'>>;
  createCategory?: Resolver<ResolversTypes['CreateCategoryPayload'], ParentType, ContextType, RequireFields<MutationCreateCategoryArgs, 'input'>>;
  createIngredient?: Resolver<ResolversTypes['CreateIngredientPayload'], ParentType, ContextType, RequireFields<MutationCreateIngredientArgs, 'input'>>;
  decideStructurePattern?: Resolver<ResolversTypes['StructurePatternPayload'], ParentType, ContextType, RequireFields<MutationDecideStructurePatternArgs, 'input' | 'patternKey'>>;
  decideStructureProposal?: Resolver<ResolversTypes['StructureDecisionPayload'], ParentType, ContextType, RequireFields<MutationDecideStructureProposalArgs, 'id' | 'input'>>;
  deferDiscovery?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationDeferDiscoveryArgs, 'id'>>;
  excludeCategory?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationExcludeCategoryArgs, 'categoryId' | 'noteId'>>;
  leaveBookUnresolved?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationLeaveBookUnresolvedArgs, 'lookupId'>>;
  markDiscoveryAsNoise?: Resolver<ResolversTypes['MarkNoisePayload'], ParentType, ContextType, RequireFields<MutationMarkDiscoveryAsNoiseArgs, 'id'>>;
  promoteCompletedNotes?: Resolver<ResolversTypes['PromoteCompletedNotesPayload'], ParentType, ContextType>;
  promoteNoteToRecipe?: Resolver<ResolversTypes['PromoteNotePayload'], ParentType, ContextType, RequireFields<MutationPromoteNoteToRecipeArgs, 'noteId'>>;
  recheckUrl?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationRecheckUrlArgs, 'urlId'>>;
  refreshDiscoveries?: Resolver<ResolversTypes['RefreshDiscoveriesPayload'], ParentType, ContextType>;
  removeCategory?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationRemoveCategoryArgs, 'categoryId' | 'noteId'>>;
  removeConceptClassification?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationRemoveConceptClassificationArgs, 'conceptId' | 'key'>>;
  removeConceptSubstitution?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationRemoveConceptSubstitutionArgs, 'conceptId' | 'substituteId'>>;
  resolveDuplicate?: Resolver<ResolversTypes['ResolveDuplicatePayload'], ParentType, ContextType, RequireFields<MutationResolveDuplicateArgs, 'id' | 'input'>>;
  resolveExactDuplicates?: Resolver<ResolversTypes['ResolveExactDuplicatesPayload'], ParentType, ContextType>;
  restoreCategory?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationRestoreCategoryArgs, 'categoryId' | 'noteId'>>;
  retryBookLookup?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationRetryBookLookupArgs, 'lookupId'>>;
  runExploratorySweep?: Resolver<ResolversTypes['StartJobPayload'], ParentType, ContextType>;
  saveIngredient?: Resolver<ResolversTypes['SaveIngredientPayload'], ParentType, ContextType, RequireFields<MutationSaveIngredientArgs, 'input'>>;
  selectBookCandidate?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationSelectBookCandidateArgs, 'lookupId' | 'workKey'>>;
  setConceptClassification?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationSetConceptClassificationArgs, 'input'>>;
  setConceptSubstitution?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationSetConceptSubstitutionArgs, 'input'>>;
  setConceptTags?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationSetConceptTagsArgs, 'conceptId' | 'tags'>>;
  setLineReviewStatus?: Resolver<ResolversTypes['SetLineReviewStatusPayload'], ParentType, ContextType, RequireFields<MutationSetLineReviewStatusArgs, 'lineId' | 'status'>>;
  startReparse?: Resolver<ResolversTypes['StartJobPayload'], ParentType, ContextType>;
  takeHealthSnapshot?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType>;
  undoDuplicateResolution?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationUndoDuplicateResolutionArgs, 'id'>>;
  undoStructureDecision?: Resolver<ResolversTypes['StructureDecisionPayload'], ParentType, ContextType, RequireFields<MutationUndoStructureDecisionArgs, 'id'>>;
  updateCategoryRule?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationUpdateCategoryRuleArgs, 'id' | 'input'>>;
  updateRecipe?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationUpdateRecipeArgs, 'input'>>;
}>;

export type MutationEffectResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['MutationEffect'] = ResolversParentTypes['MutationEffect']> = ResolversObject<{
  changed?: Resolver<Array<ResolversTypes['EntityRef']>, ParentType, ContextType>;
  evicted?: Resolver<Array<ResolversTypes['EntityRef']>, ParentType, ContextType>;
  invalidatedDomains?: Resolver<Array<ResolversTypes['InvalidationDomain']>, ParentType, ContextType>;
  lexiconRevision?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  reprocessingJobId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type MutationPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['MutationPayload'] = ResolversParentTypes['MutationPayload']> = ResolversObject<{
  __resolveType: TypeResolveFn<'ApplyDecisionPayload' | 'BasicPayload' | 'CleanupAllDataPayload' | 'CreateCategoryPayload' | 'CreateIngredientPayload' | 'MarkNoisePayload' | 'PromoteCompletedNotesPayload' | 'PromoteNotePayload' | 'RefreshDiscoveriesPayload' | 'ResolveDuplicatePayload' | 'ResolveExactDuplicatesPayload' | 'SaveIngredientPayload' | 'SetLineReviewStatusPayload' | 'StartJobPayload' | 'StructureDecisionPayload' | 'StructurePatternPayload', ParentType, ContextType>;
}>;

export type NamedTagResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NamedTag'] = ResolversParentTypes['NamedTag']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type NoteResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Note'] = ResolversParentTypes['Note']> = ResolversObject<{
  archivedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  archivedReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  categories?: Resolver<Array<ResolversTypes['CategoryMembership']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  duplicateConfidence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  evernote?: Resolver<Maybe<ResolversTypes['EvernoteMetadata']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  images?: Resolver<Array<ResolversTypes['NoteImage']>, ParentType, ContextType>;
  ingredientBlocks?: Resolver<Array<ResolversTypes['IngredientBlock']>, ParentType, ContextType>;
  instructions?: Resolver<Array<ResolversTypes['InstructionLine']>, ParentType, ContextType>;
  parsingErrorCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pendingDuplicateIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  recipeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  sources?: Resolver<Array<ResolversTypes['NoteSource']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['NoteStatus'], ParentType, ContextType>;
  supersededById?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['NamedTag']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type NoteImageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NoteImage'] = ResolversParentTypes['NoteImage']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  processingStatus?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  thumbnailUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type NoteSourceResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NoteSource'] = ResolversParentTypes['NoteSource']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isPrimary?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  origin?: Resolver<ResolversTypes['NoteSourceOrigin'], ParentType, ContextType>;
  originalText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  source?: Resolver<ResolversTypes['Source'], ParentType, ContextType>;
}>;

export type NoteStatusCountsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NoteStatusCounts'] = ResolversParentTypes['NoteStatusCounts']> = ResolversObject<{
  completed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  duplicate?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pending?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  processing?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type NoteSummaryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NoteSummary'] = ResolversParentTypes['NoteSummary']> = ResolversObject<{
  archivedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  duplicateConfidence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  ingredientLineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  instructionLineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  notebook?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parsingErrorCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recipeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['NoteStatus'], ParentType, ContextType>;
  thumbnailUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type NoteTitleRefResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NoteTitleRef'] = ResolversParentTypes['NoteTitleRef']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type NotesPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NotesPage'] = ResolversParentTypes['NotesPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['NoteSummary']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ObservedFormResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ObservedForm'] = ResolversParentTypes['ObservedForm']> = ResolversObject<{
  entryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  example?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  kind?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  mentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  notes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type OccurrenceCategoryFacetResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['OccurrenceCategoryFacet'] = ResolversParentTypes['OccurrenceCategoryFacet']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type OccurrenceSourceFacetResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['OccurrenceSourceFacet'] = ResolversParentTypes['OccurrenceSourceFacet']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ParserVersionHealthResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ParserVersionHealth'] = ResolversParentTypes['ParserVersionHealth']> = ResolversObject<{
  parserVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  unresolved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type PlaygroundMentionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['PlaygroundMention'] = ResolversParentTypes['PlaygroundMention']> = ResolversObject<{
  candidates?: Resolver<Array<ResolversTypes['ResolutionCandidateView']>, ParentType, ContextType>;
  partIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  quantity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  segmentIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  span?: Resolver<ResolversTypes['TextSpan'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['MentionStatus'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['ResolutionView'], ParentType, ContextType>;
  tokens?: Resolver<Array<ResolversTypes['SyntaxToken']>, ParentType, ContextType>;
  unresolved?: Resolver<Array<ResolversTypes['TextSpan']>, ParentType, ContextType>;
}>;

export type PlaygroundResultResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['PlaygroundResult'] = ResolversParentTypes['PlaygroundResult']> = ResolversObject<{
  alternativeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  line?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentions?: Resolver<Array<ResolversTypes['PlaygroundMention']>, ParentType, ContextType>;
  mode?: Resolver<ResolversTypes['ParseMode'], ParentType, ContextType>;
  revision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  syntax?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type PreparationOptionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['PreparationOption'] = ResolversParentTypes['PreparationOption']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type PreparationUsageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['PreparationUsage'] = ResolversParentTypes['PreparationUsage']> = ResolversObject<{
  degreeKey?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  direct?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expanded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  preparationKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type PreviewCategoryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['PreviewCategory'] = ResolversParentTypes['PreviewCategory']> = ResolversObject<{
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['CategoryAssignmentState'], ParentType, ContextType>;
}>;

export type PreviewSourceResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['PreviewSource'] = ResolversParentTypes['PreviewSource']> = ResolversObject<{
  inactive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sourceId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type PrimarySourceChangeResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['PrimarySourceChange'] = ResolversParentTypes['PrimarySourceChange']> = ResolversObject<{
  from?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  to?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
}>;

export type PromoteCompletedNotesPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['PromoteCompletedNotesPayload'] = ResolversParentTypes['PromoteCompletedNotesPayload']> = ResolversObject<{
  created?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PromoteNotePayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['PromoteNotePayload'] = ResolversParentTypes['PromoteNotePayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  recipeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  bookLookup?: Resolver<Maybe<ResolversTypes['BookLookup']>, ParentType, ContextType, RequireFields<QueryBookLookupArgs, 'id'>>;
  bookLookups?: Resolver<ResolversTypes['BookLookupsPage'], ParentType, ContextType, Partial<QueryBookLookupsArgs>>;
  categories?: Resolver<Array<ResolversTypes['Category']>, ParentType, ContextType>;
  category?: Resolver<Maybe<ResolversTypes['Category']>, ParentType, ContextType, RequireFields<QueryCategoryArgs, 'id'>>;
  concept?: Resolver<Maybe<ResolversTypes['Concept']>, ParentType, ContextType, RequireFields<QueryConceptArgs, 'id'>>;
  conceptGraph?: Resolver<Maybe<ResolversTypes['ConceptGraph']>, ParentType, ContextType, RequireFields<QueryConceptGraphArgs, 'conceptId'>>;
  conceptOccurrenceFacets?: Resolver<ResolversTypes['ConceptOccurrenceFacets'], ParentType, ContextType, RequireFields<QueryConceptOccurrenceFacetsArgs, 'conceptId'>>;
  conceptOccurrences?: Resolver<ResolversTypes['ConceptOccurrencePage'], ParentType, ContextType, RequireFields<QueryConceptOccurrencesArgs, 'conceptId'>>;
  concepts?: Resolver<ResolversTypes['ConceptsPage'], ParentType, ContextType, Partial<QueryConceptsArgs>>;
  corpusAnalytics?: Resolver<ResolversTypes['CorpusAnalytics'], ParentType, ContextType>;
  corpusHealth?: Resolver<ResolversTypes['CorpusHealth'], ParentType, ContextType>;
  corpusHealthTrends?: Resolver<ResolversTypes['CorpusHealthTrends'], ParentType, ContextType, Partial<QueryCorpusHealthTrendsArgs>>;
  dashboardStats?: Resolver<ResolversTypes['DashboardStats'], ParentType, ContextType>;
  discovery?: Resolver<Maybe<ResolversTypes['Discovery']>, ParentType, ContextType, RequireFields<QueryDiscoveryArgs, 'id'>>;
  discoveryCounts?: Resolver<Array<ResolversTypes['DiscoveryTypeCount']>, ParentType, ContextType>;
  discoveryQueue?: Resolver<ResolversTypes['DiscoveryPage'], ParentType, ContextType, Partial<QueryDiscoveryQueueArgs>>;
  duplicateCandidate?: Resolver<Maybe<ResolversTypes['DuplicateCandidateDetail']>, ParentType, ContextType, RequireFields<QueryDuplicateCandidateArgs, 'id'>>;
  duplicateCandidates?: Resolver<ResolversTypes['DuplicateCandidatesPage'], ParentType, ContextType, Partial<QueryDuplicateCandidatesArgs>>;
  failedUrlChecks?: Resolver<ResolversTypes['FailedUrlChecksPage'], ParentType, ContextType, Partial<QueryFailedUrlChecksArgs>>;
  importReviewCounts?: Resolver<ResolversTypes['ImportReviewCounts'], ParentType, ContextType>;
  importStats?: Resolver<ResolversTypes['ImportStats'], ParentType, ContextType>;
  ingredient?: Resolver<Maybe<ResolversTypes['Ingredient']>, ParentType, ContextType, RequireFields<QueryIngredientArgs, 'id'>>;
  ingredientCategoryNames?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  ingredientCounts?: Resolver<ResolversTypes['IngredientCounts'], ParentType, ContextType>;
  ingredientNameOwner?: Resolver<Maybe<ResolversTypes['IngredientOption']>, ParentType, ContextType, RequireFields<QueryIngredientNameOwnerArgs, 'name'>>;
  ingredients?: Resolver<Array<ResolversTypes['IngredientSummary']>, ParentType, ContextType, RequireFields<QueryIngredientsArgs, 'view'>>;
  job?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType, RequireFields<QueryJobArgs, 'jobId'>>;
  lexicon?: Resolver<ResolversTypes['LexiconPage'], ParentType, ContextType, Partial<QueryLexiconArgs>>;
  lexiconEntry?: Resolver<Maybe<ResolversTypes['LexiconEntryDetail']>, ParentType, ContextType, RequireFields<QueryLexiconEntryArgs, 'id'>>;
  mention?: Resolver<Maybe<ResolversTypes['Mention']>, ParentType, ContextType, RequireFields<QueryMentionArgs, 'id'>>;
  note?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<QueryNoteArgs, 'id'>>;
  notes?: Resolver<ResolversTypes['NotesPage'], ParentType, ContextType, Partial<QueryNotesArgs>>;
  playground?: Resolver<ResolversTypes['PlaygroundResult'], ParentType, ContextType, RequireFields<QueryPlaygroundArgs, 'line'>>;
  previewCategoryRule?: Resolver<ResolversTypes['CategoryRulePreview'], ParentType, ContextType, RequireFields<QueryPreviewCategoryRuleArgs, 'conceptId' | 'traversal'>>;
  previewDecision?: Resolver<ResolversTypes['DecisionPreview'], ParentType, ContextType, RequireFields<QueryPreviewDecisionArgs, 'payload'>>;
  previewDuplicateResolution?: Resolver<ResolversTypes['DuplicateResolutionPreview'], ParentType, ContextType, RequireFields<QueryPreviewDuplicateResolutionArgs, 'id' | 'input'>>;
  recipe?: Resolver<Maybe<ResolversTypes['Recipe']>, ParentType, ContextType, RequireFields<QueryRecipeArgs, 'id'>>;
  recipeTaxonomy?: Resolver<ResolversTypes['RecipeTaxonomy'], ParentType, ContextType>;
  recipes?: Resolver<ResolversTypes['RecipesPage'], ParentType, ContextType, Partial<QueryRecipesArgs>>;
  searchConcepts?: Resolver<Array<ResolversTypes['ConceptRef']>, ParentType, ContextType, RequireFields<QuerySearchConceptsArgs, 'query'>>;
  searchIngredients?: Resolver<Array<ResolversTypes['IngredientOption']>, ParentType, ContextType, RequireFields<QuerySearchIngredientsArgs, 'query'>>;
  structureCounts?: Resolver<ResolversTypes['StructureCounts'], ParentType, ContextType>;
  structurePatterns?: Resolver<Array<ResolversTypes['StructurePattern']>, ParentType, ContextType>;
  structureProposal?: Resolver<Maybe<ResolversTypes['StructureProposal']>, ParentType, ContextType, RequireFields<QueryStructureProposalArgs, 'id'>>;
  structureProposals?: Resolver<ResolversTypes['StructureProposalsPage'], ParentType, ContextType, Partial<QueryStructureProposalsArgs>>;
  unknownExpressionSources?: Resolver<Array<ResolversTypes['OccurrenceSourceFacet']>, ParentType, ContextType>;
  unknownExpressions?: Resolver<ResolversTypes['UnknownExpressionsPage'], ParentType, ContextType, Partial<QueryUnknownExpressionsArgs>>;
  viewer?: Resolver<Maybe<ResolversTypes['Viewer']>, ParentType, ContextType>;
  vocabulary?: Resolver<ResolversTypes['Vocabulary'], ParentType, ContextType>;
}>;

export type RecipeResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Recipe'] = ResolversParentTypes['Recipe']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['CategoryMembership']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ingredientBlocks?: Resolver<Array<ResolversTypes['IngredientBlock']>, ParentType, ContextType>;
  instructions?: Resolver<Array<ResolversTypes['InstructionLine']>, ParentType, ContextType>;
  noteId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sources?: Resolver<Array<ResolversTypes['NoteSource']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['NamedTag']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type RecipeSummaryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['RecipeSummary'] = ResolversParentTypes['RecipeSummary']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ingredientLineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type RecipeTaxonomyResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['RecipeTaxonomy'] = ResolversParentTypes['RecipeTaxonomy']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type RecipesPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['RecipesPage'] = ResolversParentTypes['RecipesPage']> = ResolversObject<{
  concept?: Resolver<Maybe<ResolversTypes['ConceptRef']>, ParentType, ContextType>;
  items?: Resolver<Array<ResolversTypes['RecipeSummary']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type RefreshDiscoveriesPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['RefreshDiscoveriesPayload'] = ResolversParentTypes['RefreshDiscoveriesPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  identityUpdated?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  modifiersUpdated?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  relationshipSuggestions?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ReinterpretBacklogResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ReinterpretBacklog'] = ResolversParentTypes['ReinterpretBacklog']> = ResolversObject<{
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  failedBatches?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pending?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  processing?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ResolutionCandidateViewResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ResolutionCandidateView'] = ResolversParentTypes['ResolutionCandidateView']> = ResolversObject<{
  attributes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  conceptId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  conceptName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  modifiers?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  preparations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  reasons?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  score?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type ResolutionViewResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ResolutionView'] = ResolversParentTypes['ResolutionView']> = ResolversObject<{
  attributes?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  candidateCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  conceptId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  conceptName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  highlights?: Resolver<Array<ResolversTypes['TextSpan']>, ParentType, ContextType>;
  preparations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['MentionStatus'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ResolveDuplicatePayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ResolveDuplicatePayload'] = ResolversParentTypes['ResolveDuplicatePayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  preview?: Resolver<Maybe<ResolversTypes['DuplicateResolutionPreview']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ResolveExactDuplicatesPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ResolveExactDuplicatesPayload'] = ResolversParentTypes['ResolveExactDuplicatesPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  failed?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  resolved?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SaveIngredientPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['SaveIngredientPayload'] = ResolversParentTypes['SaveIngredientPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nextId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SetLineReviewStatusPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['SetLineReviewStatusPayload'] = ResolversParentTypes['SetLineReviewStatusPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SourceResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Source'] = ResolversParentTypes['Source']> = ResolversObject<{
  book?: Resolver<Maybe<ResolversTypes['Book']>, ParentType, ContextType>;
  bookLookup?: Resolver<Maybe<ResolversTypes['BookLookupRef']>, ParentType, ContextType>;
  displayName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['SourceKind'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['SourceUrl']>, ParentType, ContextType>;
}>;

export type SourceUrlResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['SourceUrl'] = ResolversParentTypes['SourceUrl']> = ResolversObject<{
  checkStatus?: Resolver<ResolversTypes['UrlCheckStatus'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastCheckedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastFailureReason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastFinalUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastHttpStatus?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  lastSuccessfulVisitAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  normalizedUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  originalUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  siteName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type StartJobPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StartJobPayload'] = ResolversParentTypes['StartJobPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StructureCountsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StructureCounts'] = ResolversParentTypes['StructureCounts']> = ResolversObject<{
  byPattern?: Resolver<Array<ResolversTypes['StructurePatternCount']>, ParentType, ContextType>;
  decided?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  open?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type StructureDecisionPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StructureDecisionPayload'] = ResolversParentTypes['StructureDecisionPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  proposal?: Resolver<Maybe<ResolversTypes['StructureProposal']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StructurePatternResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StructurePattern'] = ResolversParentTypes['StructurePattern']> = ResolversObject<{
  approved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  canAutoApply?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  changed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  notes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  open?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  patternKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  precision?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  proposedLabel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  rejected?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  scope?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  topSourceLabel?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  topSourceShare?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
}>;

export type StructurePatternCountResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StructurePatternCount'] = ResolversParentTypes['StructurePatternCount']> = ResolversObject<{
  open?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  patternKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type StructurePatternPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StructurePatternPayload'] = ResolversParentTypes['StructurePatternPayload']> = ResolversObject<{
  applied?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  skipped?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type StructureProposalResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StructureProposal'] = ResolversParentTypes['StructureProposal']> = ResolversObject<{
  after?: Resolver<Array<ResolversTypes['ContextLine']>, ParentType, ContextType>;
  assignedKind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  before?: Resolver<Array<ResolversTypes['ContextLine']>, ParentType, ContextType>;
  classifierVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  contentIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  decidedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  decidedBy?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  decidedLabel?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  margin?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  noteId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parts?: Resolver<Array<ResolversTypes['StructureSplitPart']>, ParentType, ContextType>;
  patternKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  proposalType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  proposedLabel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  signals?: Resolver<Array<ResolversTypes['StructureSignal']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['StructureProposalStatus'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type StructureProposalsPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StructureProposalsPage'] = ResolversParentTypes['StructureProposalsPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['StructureProposal']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type StructureSignalResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StructureSignal'] = ResolversParentTypes['StructureSignal']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  weight?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type StructureSplitPartResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StructureSplitPart'] = ResolversParentTypes['StructureSplitPart']> = ResolversObject<{
  end?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  start?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type SyntaxTokenResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['SyntaxToken'] = ResolversParentTypes['SyntaxToken']> = ResolversObject<{
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  span?: Resolver<ResolversTypes['TextSpan'], ParentType, ContextType>;
  zone?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type TextSpanResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['TextSpan'] = ResolversParentTypes['TextSpan']> = ResolversObject<{
  end?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  start?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type TopConceptResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['TopConcept'] = ResolversParentTypes['TopConcept']> = ResolversObject<{
  conceptId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UnknownExpressionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['UnknownExpression'] = ResolversParentTypes['UnknownExpression']> = ResolversObject<{
  discoveryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  notes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  phrase?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['UnknownExpressionType'], ParentType, ContextType>;
}>;

export type UnknownExpressionsPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['UnknownExpressionsPage'] = ResolversParentTypes['UnknownExpressionsPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['UnknownExpression']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type UnknownPhraseResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['UnknownPhrase'] = ResolversParentTypes['UnknownPhrase']> = ResolversObject<{
  discoveryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mentionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  phrase?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type UsageContributorResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['UsageContributor'] = ResolversParentTypes['UsageContributor']> = ResolversObject<{
  concept?: Resolver<ResolversTypes['ConceptRef'], ParentType, ContextType>;
  counts?: Resolver<ResolversTypes['UsageCounts'], ParentType, ContextType>;
  depth?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  path?: Resolver<Array<ResolversTypes['FoodRelationshipType']>, ParentType, ContextType>;
}>;

export type UsageCountsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['UsageCounts'] = ResolversParentTypes['UsageCounts']> = ResolversObject<{
  lines?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  mentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  notes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recipes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type UsageStatusCountsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['UsageStatusCounts'] = ResolversParentTypes['UsageStatusCounts']> = ResolversObject<{
  autoResolved?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  needsReview?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type ViewerResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Viewer'] = ResolversParentTypes['Viewer']> = ResolversObject<{
  avatarUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  userType?: Resolver<ResolversTypes['UserType'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type VocabularyResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Vocabulary'] = ResolversParentTypes['Vocabulary']> = ResolversObject<{
  attributeValues?: Resolver<Array<ResolversTypes['AttributeValueOption']>, ParentType, ContextType>;
  definitions?: Resolver<Array<ResolversTypes['AttributeDefinitionOption']>, ParentType, ContextType>;
  degreeKeys?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  instructionKeys?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  measurementModifierKeys?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  preparations?: Resolver<Array<ResolversTypes['PreparationOption']>, ParentType, ContextType>;
}>;

export type WeeklyReviewResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['WeeklyReview'] = ResolversParentTypes['WeeklyReview']> = ResolversObject<{
  decisions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  mentionsChanged?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  weekStart?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type YearCountResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['YearCount'] = ResolversParentTypes['YearCount']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  year?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ApiContext> = ResolversObject<{
  ApplyDecisionPayload?: ApplyDecisionPayloadResolvers<ContextType>;
  AttributeDefinitionOption?: AttributeDefinitionOptionResolvers<ContextType>;
  AttributeUsage?: AttributeUsageResolvers<ContextType>;
  AttributeValueOption?: AttributeValueOptionResolvers<ContextType>;
  BasicPayload?: BasicPayloadResolvers<ContextType>;
  Book?: BookResolvers<ContextType>;
  BookCandidate?: BookCandidateResolvers<ContextType>;
  BookLookup?: BookLookupResolvers<ContextType>;
  BookLookupRef?: BookLookupRefResolvers<ContextType>;
  BookLookupsPage?: BookLookupsPageResolvers<ContextType>;
  Category?: CategoryResolvers<ContextType>;
  CategoryEvidence?: CategoryEvidenceResolvers<ContextType>;
  CategoryEvidenceStep?: CategoryEvidenceStepResolvers<ContextType>;
  CategoryMembership?: CategoryMembershipResolvers<ContextType>;
  CategoryRef?: CategoryRefResolvers<ContextType>;
  CategoryRuleExample?: CategoryRuleExampleResolvers<ContextType>;
  CategoryRulePreview?: CategoryRulePreviewResolvers<ContextType>;
  CleanupAllDataPayload?: CleanupAllDataPayloadResolvers<ContextType>;
  Concept?: ConceptResolvers<ContextType>;
  ConceptAttributeValue?: ConceptAttributeValueResolvers<ContextType>;
  ConceptClassification?: ConceptClassificationResolvers<ContextType>;
  ConceptDecision?: ConceptDecisionResolvers<ContextType>;
  ConceptDistributions?: ConceptDistributionsResolvers<ContextType>;
  ConceptEntry?: ConceptEntryResolvers<ContextType>;
  ConceptGraph?: ConceptGraphResolvers<ContextType>;
  ConceptGraphDecision?: ConceptGraphDecisionResolvers<ContextType>;
  ConceptGraphEdge?: ConceptGraphEdgeResolvers<ContextType>;
  ConceptGraphNode?: ConceptGraphNodeResolvers<ContextType>;
  ConceptMention?: ConceptMentionResolvers<ContextType>;
  ConceptObservedForms?: ConceptObservedFormsResolvers<ContextType>;
  ConceptOccurrence?: ConceptOccurrenceResolvers<ContextType>;
  ConceptOccurrenceFacets?: ConceptOccurrenceFacetsResolvers<ContextType>;
  ConceptOccurrencePage?: ConceptOccurrencePageResolvers<ContextType>;
  ConceptRef?: ConceptRefResolvers<ContextType>;
  ConceptRelationship?: ConceptRelationshipResolvers<ContextType>;
  ConceptSubstitution?: ConceptSubstitutionResolvers<ContextType>;
  ConceptSummary?: ConceptSummaryResolvers<ContextType>;
  ConceptUsage?: ConceptUsageResolvers<ContextType>;
  ConceptUsageRank?: ConceptUsageRankResolvers<ContextType>;
  ConceptsPage?: ConceptsPageResolvers<ContextType>;
  ContextLine?: ContextLineResolvers<ContextType>;
  CorpusAnalytics?: CorpusAnalyticsResolvers<ContextType>;
  CorpusAttributeCount?: CorpusAttributeCountResolvers<ContextType>;
  CorpusHealth?: CorpusHealthResolvers<ContextType>;
  CorpusHealthSnapshot?: CorpusHealthSnapshotResolvers<ContextType>;
  CorpusHealthTrends?: CorpusHealthTrendsResolvers<ContextType>;
  CorpusMentionCounts?: CorpusMentionCountsResolvers<ContextType>;
  CorpusPreparationCount?: CorpusPreparationCountResolvers<ContextType>;
  CreateCategoryPayload?: CreateCategoryPayloadResolvers<ContextType>;
  CreateIngredientPayload?: CreateIngredientPayloadResolvers<ContextType>;
  DashboardStats?: DashboardStatsResolvers<ContextType>;
  DecisionPreview?: DecisionPreviewResolvers<ContextType>;
  DecisionPreviewCounts?: DecisionPreviewCountsResolvers<ContextType>;
  DecisionPreviewExample?: DecisionPreviewExampleResolvers<ContextType>;
  DeletedCount?: DeletedCountResolvers<ContextType>;
  Discovery?: DiscoveryResolvers<ContextType>;
  DiscoveryExample?: DiscoveryExampleResolvers<ContextType>;
  DiscoveryPage?: DiscoveryPageResolvers<ContextType>;
  DiscoveryTypeCount?: DiscoveryTypeCountResolvers<ContextType>;
  DuplicateCandidate?: DuplicateCandidateResolvers<ContextType>;
  DuplicateCandidateDetail?: DuplicateCandidateDetailResolvers<ContextType>;
  DuplicateCandidatesPage?: DuplicateCandidatesPageResolvers<ContextType>;
  DuplicateNoteSummary?: DuplicateNoteSummaryResolvers<ContextType>;
  DuplicateResolution?: DuplicateResolutionResolvers<ContextType>;
  DuplicateResolutionPreview?: DuplicateResolutionPreviewResolvers<ContextType>;
  DuplicateSignals?: DuplicateSignalsResolvers<ContextType>;
  EntityRef?: EntityRefResolvers<ContextType>;
  EvernoteMetadata?: EvernoteMetadataResolvers<ContextType>;
  FailedUrlCheck?: FailedUrlCheckResolvers<ContextType>;
  FailedUrlChecksPage?: FailedUrlChecksPageResolvers<ContextType>;
  HealthPhrase?: HealthPhraseResolvers<ContextType>;
  ImportReviewCounts?: ImportReviewCountsResolvers<ContextType>;
  ImportStats?: ImportStatsResolvers<ContextType>;
  Ingredient?: IngredientResolvers<ContextType>;
  IngredientAlias?: IngredientAliasResolvers<ContextType>;
  IngredientBlock?: IngredientBlockResolvers<ContextType>;
  IngredientCounts?: IngredientCountsResolvers<ContextType>;
  IngredientLine?: IngredientLineResolvers<ContextType>;
  IngredientLineStats?: IngredientLineStatsResolvers<ContextType>;
  IngredientOption?: IngredientOptionResolvers<ContextType>;
  IngredientPropertyState?: IngredientPropertyStateResolvers<ContextType>;
  IngredientReference?: IngredientReferenceResolvers<ContextType>;
  IngredientRelation?: IngredientRelationResolvers<ContextType>;
  IngredientSummary?: IngredientSummaryResolvers<ContextType>;
  InstructionLine?: InstructionLineResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Job?: JobResolvers<ContextType>;
  LabelCount?: LabelCountResolvers<ContextType>;
  LexiconEntryDetail?: LexiconEntryDetailResolvers<ContextType>;
  LexiconEntryRef?: LexiconEntryRefResolvers<ContextType>;
  LexiconEntryRow?: LexiconEntryRowResolvers<ContextType>;
  LexiconOccurrence?: LexiconOccurrenceResolvers<ContextType>;
  LexiconOccurrencePage?: LexiconOccurrencePageResolvers<ContextType>;
  LexiconPage?: LexiconPageResolvers<ContextType>;
  LiveParseMetrics?: LiveParseMetricsResolvers<ContextType>;
  MarkNoisePayload?: MarkNoisePayloadResolvers<ContextType>;
  Mention?: MentionResolvers<ContextType>;
  ModifierUsage?: ModifierUsageResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  MutationEffect?: MutationEffectResolvers<ContextType>;
  MutationPayload?: MutationPayloadResolvers<ContextType>;
  NamedTag?: NamedTagResolvers<ContextType>;
  Note?: NoteResolvers<ContextType>;
  NoteImage?: NoteImageResolvers<ContextType>;
  NoteSource?: NoteSourceResolvers<ContextType>;
  NoteStatusCounts?: NoteStatusCountsResolvers<ContextType>;
  NoteSummary?: NoteSummaryResolvers<ContextType>;
  NoteTitleRef?: NoteTitleRefResolvers<ContextType>;
  NotesPage?: NotesPageResolvers<ContextType>;
  ObservedForm?: ObservedFormResolvers<ContextType>;
  OccurrenceCategoryFacet?: OccurrenceCategoryFacetResolvers<ContextType>;
  OccurrenceSourceFacet?: OccurrenceSourceFacetResolvers<ContextType>;
  ParserVersionHealth?: ParserVersionHealthResolvers<ContextType>;
  PlaygroundMention?: PlaygroundMentionResolvers<ContextType>;
  PlaygroundResult?: PlaygroundResultResolvers<ContextType>;
  PreparationOption?: PreparationOptionResolvers<ContextType>;
  PreparationUsage?: PreparationUsageResolvers<ContextType>;
  PreviewCategory?: PreviewCategoryResolvers<ContextType>;
  PreviewSource?: PreviewSourceResolvers<ContextType>;
  PrimarySourceChange?: PrimarySourceChangeResolvers<ContextType>;
  PromoteCompletedNotesPayload?: PromoteCompletedNotesPayloadResolvers<ContextType>;
  PromoteNotePayload?: PromoteNotePayloadResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Recipe?: RecipeResolvers<ContextType>;
  RecipeSummary?: RecipeSummaryResolvers<ContextType>;
  RecipeTaxonomy?: RecipeTaxonomyResolvers<ContextType>;
  RecipesPage?: RecipesPageResolvers<ContextType>;
  RefreshDiscoveriesPayload?: RefreshDiscoveriesPayloadResolvers<ContextType>;
  ReinterpretBacklog?: ReinterpretBacklogResolvers<ContextType>;
  ResolutionCandidateView?: ResolutionCandidateViewResolvers<ContextType>;
  ResolutionView?: ResolutionViewResolvers<ContextType>;
  ResolveDuplicatePayload?: ResolveDuplicatePayloadResolvers<ContextType>;
  ResolveExactDuplicatesPayload?: ResolveExactDuplicatesPayloadResolvers<ContextType>;
  SaveIngredientPayload?: SaveIngredientPayloadResolvers<ContextType>;
  SetLineReviewStatusPayload?: SetLineReviewStatusPayloadResolvers<ContextType>;
  Source?: SourceResolvers<ContextType>;
  SourceUrl?: SourceUrlResolvers<ContextType>;
  StartJobPayload?: StartJobPayloadResolvers<ContextType>;
  StructureCounts?: StructureCountsResolvers<ContextType>;
  StructureDecisionPayload?: StructureDecisionPayloadResolvers<ContextType>;
  StructurePattern?: StructurePatternResolvers<ContextType>;
  StructurePatternCount?: StructurePatternCountResolvers<ContextType>;
  StructurePatternPayload?: StructurePatternPayloadResolvers<ContextType>;
  StructureProposal?: StructureProposalResolvers<ContextType>;
  StructureProposalsPage?: StructureProposalsPageResolvers<ContextType>;
  StructureSignal?: StructureSignalResolvers<ContextType>;
  StructureSplitPart?: StructureSplitPartResolvers<ContextType>;
  SyntaxToken?: SyntaxTokenResolvers<ContextType>;
  TextSpan?: TextSpanResolvers<ContextType>;
  TopConcept?: TopConceptResolvers<ContextType>;
  UnknownExpression?: UnknownExpressionResolvers<ContextType>;
  UnknownExpressionsPage?: UnknownExpressionsPageResolvers<ContextType>;
  UnknownPhrase?: UnknownPhraseResolvers<ContextType>;
  UsageContributor?: UsageContributorResolvers<ContextType>;
  UsageCounts?: UsageCountsResolvers<ContextType>;
  UsageStatusCounts?: UsageStatusCountsResolvers<ContextType>;
  Viewer?: ViewerResolvers<ContextType>;
  Vocabulary?: VocabularyResolvers<ContextType>;
  WeeklyReview?: WeeklyReviewResolvers<ContextType>;
  YearCount?: YearCountResolvers<ContextType>;
}>;

