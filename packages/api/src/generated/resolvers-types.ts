import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { DiscoveryParent, IngredientLineParent } from './teach-views-types.js';
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
  entries: Array<ConceptEntry>;
  id: Scalars['ID']['output'];
  isComposed: Scalars['Boolean']['output'];
  mentions: Array<ConceptMention>;
  mergedInto?: Maybe<ConceptRef>;
  /** Edges where this concept is the more specific side, e.g. chicken thigh PART_OF chicken. */
  parents: Array<ConceptRelationship>;
  slug: Scalars['String']['output'];
  status: ConceptStatus;
  /** Concepts that can stand in for this one. */
  substitutions: Array<ConceptSubstitution>;
  tags: Array<Scalars['String']['output']>;
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

/** Example: query { concepts(query: "sugar", page: 1) { total items { canonicalName } } } */
export type ConceptsPage = {
  __typename?: 'ConceptsPage';
  items: Array<ConceptSummary>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
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

/** How a food relates to its parent: chicken thigh PART_OF chicken, kosher salt IS_A salt. */
export type FoodRelationshipType =
  | 'DERIVED_FROM'
  | 'IS_A'
  | 'PART_OF'
  | 'PROCESSED_FROM';

/** An open discovery's phrase, for the health page's top lists. Example: { "discoveryId": "0193...", "type": "UNKNOWN_FOOD_PHRASE", "phrase": "gochugaru", "mentionCount": 14 } */
export type HealthPhrase = {
  __typename?: 'HealthPhrase';
  discoveryId: Scalars['ID']['output'];
  mentionCount: Scalars['Int']['output'];
  phrase: Scalars['String']['output'];
  type: DiscoveryType;
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
  text: Scalars['String']['output'];
};

/**
 * Query areas whose cached results a mutation may have made stale. The client's cache coordinator refetches active queries registered for each domain.
 *
 * Example: merging two concepts invalidates CONCEPTS (the list shows both) and CONCEPT_DETAIL (other concepts show them as parents or substitutions).
 */
export type InvalidationDomain =
  | 'CONCEPTS'
  | 'CONCEPT_DETAIL'
  | 'CORPUS_HEALTH'
  | 'DASHBOARD_STATS'
  | 'DISCOVERIES'
  | 'IMPORT_STATS'
  | 'MENTIONS'
  | 'NOTES'
  | 'NOTE_DETAIL'
  | 'RECIPES'
  | 'RECIPE_DETAIL'
  | 'RECIPE_TAXONOMY';

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
  conceptId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  /** CANONICAL, PLURAL, ALIAS, ... for FOOD entries. */
  kind?: Maybe<Scalars['String']['output']>;
  /** FOOD, ATTRIBUTE, PREPARATION, DEGREE, MEASUREMENT_MODIFIER, or INSTRUCTION. */
  role: Scalars['String']['output'];
  /** ACTIVE or PROPOSED (proposed entries are only used when curating). */
  status: Scalars['String']['output'];
  targetLabel: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type LexiconPage = {
  __typename?: 'LexiconPage';
  items: Array<LexiconEntryRow>;
  page: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

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

export type Mutation = {
  __typename?: 'Mutation';
  /** Admin only. Applies a reviewed decision, bumps the lexicon revision, and reinterprets affected mentions (up to 1,000 lines in this request). */
  applyDecision: ApplyDecisionPayload;
  /** Admin only. Deletes all imported data and R2 objects; users and sessions are kept. */
  cleanupAllData: CleanupAllDataPayload;
  /** Adds an approved food through a CREATE_CONCEPT decision. */
  createIngredient: CreateIngredientPayload;
  /** Admin only. Sets an open discovery aside without deciding it. */
  deferDiscovery: BasicPayload;
  /** Admin only. A structural pattern's lines are not ingredient lines (headers, OCR artifacts): deactivates them, drops their mentions from every count, and resolves the discovery. */
  markDiscoveryAsNoise: MarkNoisePayload;
  /** Admin only. Promotes every COMPLETED note that has no recipe yet. */
  promoteCompletedNotes: PromoteCompletedNotesPayload;
  /** Creates a recipe from a note (or returns the existing one). Example: promoteNoteToRecipe(noteId: "cm3n...") */
  promoteNoteToRecipe: PromoteNotePayload;
  /** Admin only. Mines adjacency counts into open discoveries and suggests relationships by name. */
  refreshDiscoveries: RefreshDiscoveriesPayload;
  /** Admin only. Removes an explicit classification; inherited values still apply. */
  removeConceptClassification: BasicPayload;
  /** Admin only. */
  removeConceptSubstitution: BasicPayload;
  /** Admin only. Re-reads unresolved and needs-review mentions in exploratory mode now, instead of waiting for the weekly sweep; only discoveries are written. */
  runExploratorySweep: StartJobPayload;
  /** Saves the ingredient card. Name, plural, alternate names, and parent go through one EDIT_CONCEPT decision (revertible; affected lines are reinterpreted); the other fields are written directly; saving a proposed food approves it. */
  saveIngredient: SaveIngredientPayload;
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
  updateRecipe: BasicPayload;
};


export type MutationApplyDecisionArgs = {
  input: ApplyDecisionInput;
};


export type MutationCreateIngredientArgs = {
  input: IngredientCreateInput;
};


export type MutationDeferDiscoveryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationMarkDiscoveryAsNoiseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPromoteNoteToRecipeArgs = {
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


export type MutationSaveIngredientArgs = {
  input: IngredientSaveInput;
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

/** A category or tag. Example: { "id": "cm3c...", "name": "Dinner" } */
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
  categories: Array<NamedTag>;
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
  recipeId?: Maybe<Scalars['ID']['output']>;
  sources: Array<Source>;
  status: NoteStatus;
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
  /** Concept.decisions is empty for non-admins. */
  concept?: Maybe<Concept>;
  /** Admin only. Every concept that has not been merged away, approved or not. Example: concepts(query: "sugar", page: 1) */
  concepts: ConceptsPage;
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
  importStats: ImportStats;
  ingredient?: Maybe<Ingredient>;
  ingredientCategoryNames: Array<Scalars['String']['output']>;
  ingredientCounts: IngredientCounts;
  /** The food that already answers to a name (its name, plural, or an alternate name), other than excludeId; null when the name is free. Example: ingredientNameOwner(name: "scallion", excludeId: "0193...") -> { name: "green onion" } */
  ingredientNameOwner?: Maybe<IngredientOption>;
  /** The ingredients page: approved foods (view: all) or proposed ones (view: unreviewed), alphabetical. */
  ingredients: Array<IngredientSummary>;
  job?: Maybe<Job>;
  /** Admin only. Every name and modifier Peas knows, alphabetical. Example: lexicon(query: "chick", role: "FOOD", page: 1) */
  lexicon: LexiconPage;
  mention?: Maybe<Mention>;
  note?: Maybe<Note>;
  /** Filters are optional; blank strings are ignored. Example: notes(status: FAILED, page: 1) */
  notes: NotesPage;
  /** Admin only. Example: playground(line: "2 green apples", mode: EXPLORATORY) */
  playground: PlaygroundResult;
  /** Admin only. Impact of a decision without applying it. */
  previewDecision: DecisionPreview;
  recipe?: Maybe<Recipe>;
  recipeTaxonomy: RecipeTaxonomy;
  /** Example: recipes(query: "chili", category: "Dinner"). conceptId finds recipes that mention the concept or a more specific one (IS_A, PART_OF) unless exactConcept is true. */
  recipes: RecipesPage;
  /** Name and entry search for concept pickers, up to 10 results. Example: searchConcepts(query: "thigh") */
  searchConcepts: Array<ConceptRef>;
  /** Name search for the card's pickers, up to 10 results. Example: searchIngredients(query: "papr", excludeId: "0193...") -> [{ name: "paprika" }, { name: "smoked paprika" }] */
  searchIngredients: Array<IngredientOption>;
  viewer?: Maybe<Viewer>;
  /** Admin only. */
  vocabulary: Vocabulary;
};


export type QueryConceptArgs = {
  id: Scalars['ID']['input'];
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
  page?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
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


export type QueryPreviewDecisionArgs = {
  payload: Scalars['JSON']['input'];
};


export type QueryRecipeArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRecipesArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
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

/** A recipe promoted from a note. It shares the note's sources, ingredient blocks, and instructions. */
export type Recipe = {
  __typename?: 'Recipe';
  categories: Array<NamedTag>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  ingredientBlocks: Array<IngredientBlock>;
  instructions: Array<InstructionLine>;
  noteId: Scalars['ID']['output'];
  sources: Array<Source>;
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
 * Replaces a recipe's title, categories, and tags. Unknown category and tag names are created.
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

/** Where a recipe came from: one or more URLs and/or a book. */
export type Source = {
  __typename?: 'Source';
  book?: Maybe<SourceBook>;
  id: Scalars['ID']['output'];
  urls: Array<SourceUrl>;
};

/** Example: { "title": "Salt, Fat, Acid, Heat", "author": "Samin Nosrat" } */
export type SourceBook = {
  __typename?: 'SourceBook';
  author?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

/** Example: { "id": "cm3u...", "url": "https://cooking.example.com/chili", "isBrokenLink": false, "siteName": "Example Cooking" } */
export type SourceUrl = {
  __typename?: 'SourceUrl';
  id: Scalars['ID']['output'];
  isBrokenLink: Scalars['Boolean']['output'];
  siteName?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

/** A background job the queue accepted. Example: { "success": true, "jobId": "reparse-2.1.0" } */
export type StartJobPayload = MutationPayload & {
  __typename?: 'StartJobPayload';
  effect: MutationEffect;
  jobId?: Maybe<Scalars['ID']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
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

/** An open unknown-food discovery. Example: { "discoveryId": "0193...", "phrase": "gochugaru", "mentionCount": 14 } */
export type UnknownPhrase = {
  __typename?: 'UnknownPhrase';
  discoveryId: Scalars['ID']['output'];
  mentionCount: Scalars['Int']['output'];
  phrase: Scalars['String']['output'];
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
    | ( CreateIngredientPayload )
    | ( MarkNoisePayload )
    | ( PromoteCompletedNotesPayload )
    | ( PromoteNotePayload )
    | ( RefreshDiscoveriesPayload )
    | ( SaveIngredientPayload )
    | ( Omit<SetLineReviewStatusPayload, 'note'> & { note?: Maybe<_RefType['Note']> } )
    | ( StartJobPayload )
  ;
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  ApplyDecisionInput: ApplyDecisionInput;
  ApplyDecisionPayload: ResolverTypeWrapper<ApplyDecisionPayload>;
  AttributeDefinitionOption: ResolverTypeWrapper<AttributeDefinitionOption>;
  AttributeValueOption: ResolverTypeWrapper<AttributeValueOption>;
  BasicPayload: ResolverTypeWrapper<BasicPayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ClassificationKind: ClassificationKind;
  ClassificationValue: ClassificationValue;
  CleanupAllDataPayload: ResolverTypeWrapper<CleanupAllDataPayload>;
  Concept: ResolverTypeWrapper<Concept>;
  ConceptAttributeValue: ResolverTypeWrapper<ConceptAttributeValue>;
  ConceptClassification: ResolverTypeWrapper<ConceptClassification>;
  ConceptClassificationInput: ConceptClassificationInput;
  ConceptDecision: ResolverTypeWrapper<ConceptDecision>;
  ConceptEntry: ResolverTypeWrapper<ConceptEntry>;
  ConceptMention: ResolverTypeWrapper<ConceptMention>;
  ConceptRef: ResolverTypeWrapper<ConceptRef>;
  ConceptRelationship: ResolverTypeWrapper<ConceptRelationship>;
  ConceptStatus: ConceptStatus;
  ConceptSubstitution: ResolverTypeWrapper<ConceptSubstitution>;
  ConceptSubstitutionInput: ConceptSubstitutionInput;
  ConceptSummary: ResolverTypeWrapper<ConceptSummary>;
  ConceptsPage: ResolverTypeWrapper<ConceptsPage>;
  CorpusHealth: ResolverTypeWrapper<CorpusHealth>;
  CorpusHealthSnapshot: ResolverTypeWrapper<CorpusHealthSnapshot>;
  CorpusHealthTrends: ResolverTypeWrapper<CorpusHealthTrends>;
  CorpusMentionCounts: ResolverTypeWrapper<CorpusMentionCounts>;
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
  EntityRef: ResolverTypeWrapper<EntityRef>;
  EvernoteMetadata: ResolverTypeWrapper<EvernoteMetadata>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  FoodRelationshipType: FoodRelationshipType;
  HealthPhrase: ResolverTypeWrapper<HealthPhrase>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
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
  LexiconEntryRef: ResolverTypeWrapper<LexiconEntryRef>;
  LexiconEntryRow: ResolverTypeWrapper<LexiconEntryRow>;
  LexiconPage: ResolverTypeWrapper<LexiconPage>;
  LineReviewStatus: LineReviewStatus;
  LiveParseMetrics: ResolverTypeWrapper<LiveParseMetrics>;
  MarkNoisePayload: ResolverTypeWrapper<MarkNoisePayload>;
  Mention: ResolverTypeWrapper<Mention>;
  MentionStatus: MentionStatus;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  MutationEffect: ResolverTypeWrapper<MutationEffect>;
  MutationPayload: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['MutationPayload']>;
  NamedTag: ResolverTypeWrapper<NamedTag>;
  Note: ResolverTypeWrapper<Omit<Note, 'ingredientBlocks'> & { ingredientBlocks: Array<ResolversTypes['IngredientBlock']> }>;
  NoteImage: ResolverTypeWrapper<NoteImage>;
  NoteStatus: NoteStatus;
  NoteStatusCounts: ResolverTypeWrapper<NoteStatusCounts>;
  NoteSummary: ResolverTypeWrapper<NoteSummary>;
  NotesPage: ResolverTypeWrapper<NotesPage>;
  ParseMode: ParseMode;
  ParseStatus: ParseStatus;
  ParserVersionHealth: ResolverTypeWrapper<ParserVersionHealth>;
  PlaygroundMention: ResolverTypeWrapper<PlaygroundMention>;
  PlaygroundResult: ResolverTypeWrapper<PlaygroundResult>;
  PreparationOption: ResolverTypeWrapper<PreparationOption>;
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
  SaveIngredientPayload: ResolverTypeWrapper<SaveIngredientPayload>;
  SetLineReviewStatusPayload: ResolverTypeWrapper<Omit<SetLineReviewStatusPayload, 'note'> & { note?: Maybe<ResolversTypes['Note']> }>;
  Source: ResolverTypeWrapper<Source>;
  SourceBook: ResolverTypeWrapper<SourceBook>;
  SourceUrl: ResolverTypeWrapper<SourceUrl>;
  StartJobPayload: ResolverTypeWrapper<StartJobPayload>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SyntaxToken: ResolverTypeWrapper<SyntaxToken>;
  TextSpan: ResolverTypeWrapper<TextSpan>;
  TopConcept: ResolverTypeWrapper<TopConcept>;
  UnknownPhrase: ResolverTypeWrapper<UnknownPhrase>;
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
  AttributeValueOption: AttributeValueOption;
  BasicPayload: BasicPayload;
  Boolean: Scalars['Boolean']['output'];
  CleanupAllDataPayload: CleanupAllDataPayload;
  Concept: Concept;
  ConceptAttributeValue: ConceptAttributeValue;
  ConceptClassification: ConceptClassification;
  ConceptClassificationInput: ConceptClassificationInput;
  ConceptDecision: ConceptDecision;
  ConceptEntry: ConceptEntry;
  ConceptMention: ConceptMention;
  ConceptRef: ConceptRef;
  ConceptRelationship: ConceptRelationship;
  ConceptSubstitution: ConceptSubstitution;
  ConceptSubstitutionInput: ConceptSubstitutionInput;
  ConceptSummary: ConceptSummary;
  ConceptsPage: ConceptsPage;
  CorpusHealth: CorpusHealth;
  CorpusHealthSnapshot: CorpusHealthSnapshot;
  CorpusHealthTrends: CorpusHealthTrends;
  CorpusMentionCounts: CorpusMentionCounts;
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
  EntityRef: EntityRef;
  EvernoteMetadata: EvernoteMetadata;
  Float: Scalars['Float']['output'];
  HealthPhrase: HealthPhrase;
  ID: Scalars['ID']['output'];
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
  LexiconEntryRef: LexiconEntryRef;
  LexiconEntryRow: LexiconEntryRow;
  LexiconPage: LexiconPage;
  LiveParseMetrics: LiveParseMetrics;
  MarkNoisePayload: MarkNoisePayload;
  Mention: Mention;
  Mutation: Record<PropertyKey, never>;
  MutationEffect: MutationEffect;
  MutationPayload: ResolversInterfaceTypes<ResolversParentTypes>['MutationPayload'];
  NamedTag: NamedTag;
  Note: Omit<Note, 'ingredientBlocks'> & { ingredientBlocks: Array<ResolversParentTypes['IngredientBlock']> };
  NoteImage: NoteImage;
  NoteStatusCounts: NoteStatusCounts;
  NoteSummary: NoteSummary;
  NotesPage: NotesPage;
  ParserVersionHealth: ParserVersionHealth;
  PlaygroundMention: PlaygroundMention;
  PlaygroundResult: PlaygroundResult;
  PreparationOption: PreparationOption;
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
  SaveIngredientPayload: SaveIngredientPayload;
  SetLineReviewStatusPayload: Omit<SetLineReviewStatusPayload, 'note'> & { note?: Maybe<ResolversParentTypes['Note']> };
  Source: Source;
  SourceBook: SourceBook;
  SourceUrl: SourceUrl;
  StartJobPayload: StartJobPayload;
  String: Scalars['String']['output'];
  SyntaxToken: SyntaxToken;
  TextSpan: TextSpan;
  TopConcept: TopConcept;
  UnknownPhrase: UnknownPhrase;
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
  entries?: Resolver<Array<ResolversTypes['ConceptEntry']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isComposed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  mentions?: Resolver<Array<ResolversTypes['ConceptMention']>, ParentType, ContextType>;
  mergedInto?: Resolver<Maybe<ResolversTypes['ConceptRef']>, ParentType, ContextType>;
  parents?: Resolver<Array<ResolversTypes['ConceptRelationship']>, ParentType, ContextType>;
  slug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ConceptStatus'], ParentType, ContextType>;
  substitutions?: Resolver<Array<ResolversTypes['ConceptSubstitution']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
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

export type ConceptEntryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptEntry'] = ResolversParentTypes['ConceptEntry']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ConceptMentionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptMention'] = ResolversParentTypes['ConceptMention']> = ResolversObject<{
  lineText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  mentionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  noteTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rawText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  verified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
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

export type ConceptsPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptsPage'] = ResolversParentTypes['ConceptsPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['ConceptSummary']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type HealthPhraseResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['HealthPhrase'] = ResolversParentTypes['HealthPhrase']> = ResolversObject<{
  discoveryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mentionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  phrase?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['DiscoveryType'], ParentType, ContextType>;
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

export type LexiconEntryRefResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LexiconEntryRef'] = ResolversParentTypes['LexiconEntryRef']> = ResolversObject<{
  attributeValueId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  conceptId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targetLabel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type LexiconEntryRowResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['LexiconEntryRow'] = ResolversParentTypes['LexiconEntryRow']> = ResolversObject<{
  conceptId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  targetLabel?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type MutationResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  applyDecision?: Resolver<ResolversTypes['ApplyDecisionPayload'], ParentType, ContextType, RequireFields<MutationApplyDecisionArgs, 'input'>>;
  cleanupAllData?: Resolver<ResolversTypes['CleanupAllDataPayload'], ParentType, ContextType>;
  createIngredient?: Resolver<ResolversTypes['CreateIngredientPayload'], ParentType, ContextType, RequireFields<MutationCreateIngredientArgs, 'input'>>;
  deferDiscovery?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationDeferDiscoveryArgs, 'id'>>;
  markDiscoveryAsNoise?: Resolver<ResolversTypes['MarkNoisePayload'], ParentType, ContextType, RequireFields<MutationMarkDiscoveryAsNoiseArgs, 'id'>>;
  promoteCompletedNotes?: Resolver<ResolversTypes['PromoteCompletedNotesPayload'], ParentType, ContextType>;
  promoteNoteToRecipe?: Resolver<ResolversTypes['PromoteNotePayload'], ParentType, ContextType, RequireFields<MutationPromoteNoteToRecipeArgs, 'noteId'>>;
  refreshDiscoveries?: Resolver<ResolversTypes['RefreshDiscoveriesPayload'], ParentType, ContextType>;
  removeConceptClassification?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationRemoveConceptClassificationArgs, 'conceptId' | 'key'>>;
  removeConceptSubstitution?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationRemoveConceptSubstitutionArgs, 'conceptId' | 'substituteId'>>;
  runExploratorySweep?: Resolver<ResolversTypes['StartJobPayload'], ParentType, ContextType>;
  saveIngredient?: Resolver<ResolversTypes['SaveIngredientPayload'], ParentType, ContextType, RequireFields<MutationSaveIngredientArgs, 'input'>>;
  setConceptClassification?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationSetConceptClassificationArgs, 'input'>>;
  setConceptSubstitution?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationSetConceptSubstitutionArgs, 'input'>>;
  setConceptTags?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType, RequireFields<MutationSetConceptTagsArgs, 'conceptId' | 'tags'>>;
  setLineReviewStatus?: Resolver<ResolversTypes['SetLineReviewStatusPayload'], ParentType, ContextType, RequireFields<MutationSetLineReviewStatusArgs, 'lineId' | 'status'>>;
  startReparse?: Resolver<ResolversTypes['StartJobPayload'], ParentType, ContextType>;
  takeHealthSnapshot?: Resolver<ResolversTypes['BasicPayload'], ParentType, ContextType>;
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
  __resolveType: TypeResolveFn<'ApplyDecisionPayload' | 'BasicPayload' | 'CleanupAllDataPayload' | 'CreateIngredientPayload' | 'MarkNoisePayload' | 'PromoteCompletedNotesPayload' | 'PromoteNotePayload' | 'RefreshDiscoveriesPayload' | 'SaveIngredientPayload' | 'SetLineReviewStatusPayload' | 'StartJobPayload', ParentType, ContextType>;
}>;

export type NamedTagResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NamedTag'] = ResolversParentTypes['NamedTag']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type NoteResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Note'] = ResolversParentTypes['Note']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['NamedTag']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  duplicateConfidence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  errorMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  evernote?: Resolver<Maybe<ResolversTypes['EvernoteMetadata']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  images?: Resolver<Array<ResolversTypes['NoteImage']>, ParentType, ContextType>;
  ingredientBlocks?: Resolver<Array<ResolversTypes['IngredientBlock']>, ParentType, ContextType>;
  instructions?: Resolver<Array<ResolversTypes['InstructionLine']>, ParentType, ContextType>;
  parsingErrorCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recipeId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  sources?: Resolver<Array<ResolversTypes['Source']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['NoteStatus'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['NamedTag']>, ParentType, ContextType>;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type NoteImageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NoteImage'] = ResolversParentTypes['NoteImage']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  processingStatus?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  thumbnailUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type NoteStatusCountsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NoteStatusCounts'] = ResolversParentTypes['NoteStatusCounts']> = ResolversObject<{
  completed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  duplicate?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pending?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  processing?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type NoteSummaryResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NoteSummary'] = ResolversParentTypes['NoteSummary']> = ResolversObject<{
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

export type NotesPageResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['NotesPage'] = ResolversParentTypes['NotesPage']> = ResolversObject<{
  items?: Resolver<Array<ResolversTypes['NoteSummary']>, ParentType, ContextType>;
  page?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  pageSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  concept?: Resolver<Maybe<ResolversTypes['Concept']>, ParentType, ContextType, RequireFields<QueryConceptArgs, 'id'>>;
  concepts?: Resolver<ResolversTypes['ConceptsPage'], ParentType, ContextType, Partial<QueryConceptsArgs>>;
  corpusHealth?: Resolver<ResolversTypes['CorpusHealth'], ParentType, ContextType>;
  corpusHealthTrends?: Resolver<ResolversTypes['CorpusHealthTrends'], ParentType, ContextType, Partial<QueryCorpusHealthTrendsArgs>>;
  dashboardStats?: Resolver<ResolversTypes['DashboardStats'], ParentType, ContextType>;
  discovery?: Resolver<Maybe<ResolversTypes['Discovery']>, ParentType, ContextType, RequireFields<QueryDiscoveryArgs, 'id'>>;
  discoveryCounts?: Resolver<Array<ResolversTypes['DiscoveryTypeCount']>, ParentType, ContextType>;
  discoveryQueue?: Resolver<ResolversTypes['DiscoveryPage'], ParentType, ContextType, Partial<QueryDiscoveryQueueArgs>>;
  importStats?: Resolver<ResolversTypes['ImportStats'], ParentType, ContextType>;
  ingredient?: Resolver<Maybe<ResolversTypes['Ingredient']>, ParentType, ContextType, RequireFields<QueryIngredientArgs, 'id'>>;
  ingredientCategoryNames?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  ingredientCounts?: Resolver<ResolversTypes['IngredientCounts'], ParentType, ContextType>;
  ingredientNameOwner?: Resolver<Maybe<ResolversTypes['IngredientOption']>, ParentType, ContextType, RequireFields<QueryIngredientNameOwnerArgs, 'name'>>;
  ingredients?: Resolver<Array<ResolversTypes['IngredientSummary']>, ParentType, ContextType, RequireFields<QueryIngredientsArgs, 'view'>>;
  job?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType, RequireFields<QueryJobArgs, 'jobId'>>;
  lexicon?: Resolver<ResolversTypes['LexiconPage'], ParentType, ContextType, Partial<QueryLexiconArgs>>;
  mention?: Resolver<Maybe<ResolversTypes['Mention']>, ParentType, ContextType, RequireFields<QueryMentionArgs, 'id'>>;
  note?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<QueryNoteArgs, 'id'>>;
  notes?: Resolver<ResolversTypes['NotesPage'], ParentType, ContextType, Partial<QueryNotesArgs>>;
  playground?: Resolver<ResolversTypes['PlaygroundResult'], ParentType, ContextType, RequireFields<QueryPlaygroundArgs, 'line'>>;
  previewDecision?: Resolver<ResolversTypes['DecisionPreview'], ParentType, ContextType, RequireFields<QueryPreviewDecisionArgs, 'payload'>>;
  recipe?: Resolver<Maybe<ResolversTypes['Recipe']>, ParentType, ContextType, RequireFields<QueryRecipeArgs, 'id'>>;
  recipeTaxonomy?: Resolver<ResolversTypes['RecipeTaxonomy'], ParentType, ContextType>;
  recipes?: Resolver<ResolversTypes['RecipesPage'], ParentType, ContextType, Partial<QueryRecipesArgs>>;
  searchConcepts?: Resolver<Array<ResolversTypes['ConceptRef']>, ParentType, ContextType, RequireFields<QuerySearchConceptsArgs, 'query'>>;
  searchIngredients?: Resolver<Array<ResolversTypes['IngredientOption']>, ParentType, ContextType, RequireFields<QuerySearchIngredientsArgs, 'query'>>;
  viewer?: Resolver<Maybe<ResolversTypes['Viewer']>, ParentType, ContextType>;
  vocabulary?: Resolver<ResolversTypes['Vocabulary'], ParentType, ContextType>;
}>;

export type RecipeResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Recipe'] = ResolversParentTypes['Recipe']> = ResolversObject<{
  categories?: Resolver<Array<ResolversTypes['NamedTag']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ingredientBlocks?: Resolver<Array<ResolversTypes['IngredientBlock']>, ParentType, ContextType>;
  instructions?: Resolver<Array<ResolversTypes['InstructionLine']>, ParentType, ContextType>;
  noteId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sources?: Resolver<Array<ResolversTypes['Source']>, ParentType, ContextType>;
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
  book?: Resolver<Maybe<ResolversTypes['SourceBook']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  urls?: Resolver<Array<ResolversTypes['SourceUrl']>, ParentType, ContextType>;
}>;

export type SourceBookResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['SourceBook'] = ResolversParentTypes['SourceBook']> = ResolversObject<{
  author?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type SourceUrlResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['SourceUrl'] = ResolversParentTypes['SourceUrl']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isBrokenLink?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  siteName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type StartJobPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['StartJobPayload'] = ResolversParentTypes['StartJobPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  jobId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
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

export type UnknownPhraseResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['UnknownPhrase'] = ResolversParentTypes['UnknownPhrase']> = ResolversObject<{
  discoveryId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mentionCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  phrase?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  AttributeValueOption?: AttributeValueOptionResolvers<ContextType>;
  BasicPayload?: BasicPayloadResolvers<ContextType>;
  CleanupAllDataPayload?: CleanupAllDataPayloadResolvers<ContextType>;
  Concept?: ConceptResolvers<ContextType>;
  ConceptAttributeValue?: ConceptAttributeValueResolvers<ContextType>;
  ConceptClassification?: ConceptClassificationResolvers<ContextType>;
  ConceptDecision?: ConceptDecisionResolvers<ContextType>;
  ConceptEntry?: ConceptEntryResolvers<ContextType>;
  ConceptMention?: ConceptMentionResolvers<ContextType>;
  ConceptRef?: ConceptRefResolvers<ContextType>;
  ConceptRelationship?: ConceptRelationshipResolvers<ContextType>;
  ConceptSubstitution?: ConceptSubstitutionResolvers<ContextType>;
  ConceptSummary?: ConceptSummaryResolvers<ContextType>;
  ConceptsPage?: ConceptsPageResolvers<ContextType>;
  CorpusHealth?: CorpusHealthResolvers<ContextType>;
  CorpusHealthSnapshot?: CorpusHealthSnapshotResolvers<ContextType>;
  CorpusHealthTrends?: CorpusHealthTrendsResolvers<ContextType>;
  CorpusMentionCounts?: CorpusMentionCountsResolvers<ContextType>;
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
  EntityRef?: EntityRefResolvers<ContextType>;
  EvernoteMetadata?: EvernoteMetadataResolvers<ContextType>;
  HealthPhrase?: HealthPhraseResolvers<ContextType>;
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
  LexiconEntryRef?: LexiconEntryRefResolvers<ContextType>;
  LexiconEntryRow?: LexiconEntryRowResolvers<ContextType>;
  LexiconPage?: LexiconPageResolvers<ContextType>;
  LiveParseMetrics?: LiveParseMetricsResolvers<ContextType>;
  MarkNoisePayload?: MarkNoisePayloadResolvers<ContextType>;
  Mention?: MentionResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  MutationEffect?: MutationEffectResolvers<ContextType>;
  MutationPayload?: MutationPayloadResolvers<ContextType>;
  NamedTag?: NamedTagResolvers<ContextType>;
  Note?: NoteResolvers<ContextType>;
  NoteImage?: NoteImageResolvers<ContextType>;
  NoteStatusCounts?: NoteStatusCountsResolvers<ContextType>;
  NoteSummary?: NoteSummaryResolvers<ContextType>;
  NotesPage?: NotesPageResolvers<ContextType>;
  ParserVersionHealth?: ParserVersionHealthResolvers<ContextType>;
  PlaygroundMention?: PlaygroundMentionResolvers<ContextType>;
  PlaygroundResult?: PlaygroundResultResolvers<ContextType>;
  PreparationOption?: PreparationOptionResolvers<ContextType>;
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
  SaveIngredientPayload?: SaveIngredientPayloadResolvers<ContextType>;
  SetLineReviewStatusPayload?: SetLineReviewStatusPayloadResolvers<ContextType>;
  Source?: SourceResolvers<ContextType>;
  SourceBook?: SourceBookResolvers<ContextType>;
  SourceUrl?: SourceUrlResolvers<ContextType>;
  StartJobPayload?: StartJobPayloadResolvers<ContextType>;
  SyntaxToken?: SyntaxTokenResolvers<ContextType>;
  TextSpan?: TextSpanResolvers<ContextType>;
  TopConcept?: TopConceptResolvers<ContextType>;
  UnknownPhrase?: UnknownPhraseResolvers<ContextType>;
  Viewer?: ViewerResolvers<ContextType>;
  Vocabulary?: VocabularyResolvers<ContextType>;
  WeeklyReview?: WeeklyReviewResolvers<ContextType>;
  YearCount?: YearCountResolvers<ContextType>;
}>;

