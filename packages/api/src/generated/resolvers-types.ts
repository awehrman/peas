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
  /** True when more lines were affected than one request reinterprets; run reinterpretCommand. */
  needsBackgroundReinterpret: Scalars['Boolean']['output'];
  /** e.g. "yarn workspace @peas/queue reinterpret --revision 15 --decision 0193..." */
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
  key: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  /** EXPLICIT, INHERITED, or CONFLICT. */
  source: Scalars['String']['output'];
  /** TRUE, FALSE, or UNKNOWN. */
  value: Scalars['String']['output'];
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
 * Example: query { dashboardStats { noteCount recipeCount notesByStatus { completed failed } topIngredients { name lineCount } } }
 */
export type DashboardStats = {
  __typename?: 'DashboardStats';
  ingredientCount: Scalars['Int']['output'];
  ingredientLines: IngredientLineStats;
  instructionLineCount: Scalars['Int']['output'];
  noteCount: Scalars['Int']['output'];
  /** When notes were first saved in Evernote, ascending by year; empty years are omitted. */
  notesBySavedYear: Array<YearCount>;
  notesByStatus: NoteStatusCounts;
  /** Completed notes that have not been promoted to a recipe yet. */
  notesReadyToPromote: Scalars['Int']['output'];
  recipeCount: Scalars['Int']['output'];
  reviewedIngredientCount: Scalars['Int']['output'];
  /** Category names by note count. */
  topCategories: Array<LabelCount>;
  topIngredients: Array<TopIngredient>;
  /** Websites with the most saved recipe URLs. */
  topSources: Array<LabelCount>;
  /** Tag names by note count. */
  topTags: Array<LabelCount>;
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
  /** e.g. "Spices". */
  category?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** True for ingredients made of other ingredients, e.g. "garam masala". */
  isComposedIngredient: Scalars['Boolean']['output'];
  isReviewed: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  parent?: Maybe<IngredientOption>;
  plural?: Maybe<Scalars['String']['output']>;
  properties: Array<IngredientProperty>;
  referenceCount: Scalars['Int']['output'];
  /** The most recent references (capped at 50). */
  references: Array<IngredientReference>;
  reviewedAt?: Maybe<Scalars['String']['output']>;
  substitutions: Array<IngredientOption>;
  tags: Array<Scalars['String']['output']>;
  variants: Array<IngredientOption>;
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
 * Example: { "id": "cm3l...", "blockIndex": 0, "lineIndex": 2, "reference": "2 cups flour", "parseStatus": "COMPLETED_SUCCESSFULLY", "reviewStatus": "UNREVIEWED", "parserVersion": "v1" }
 */
export type IngredientLine = {
  __typename?: 'IngredientLine';
  /** Which ingredient list in the note (0 for the first, 1 for e.g. "For the sauce"). */
  blockIndex: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lineIndex: Scalars['Int']['output'];
  /** v2 mentions, one per segment, once the backfill has run. Empty before that. */
  mentions: Array<Mention>;
  parseStatus: ParseStatus;
  parserVersion?: Maybe<Scalars['String']['output']>;
  /** The line exactly as written in the note. */
  reference: Scalars['String']['output'];
  reviewStatus: LineReviewStatus;
  segments: Array<ParsedSegment>;
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

export type IngredientProperty =
  | 'ALCOHOL'
  | 'CORN'
  | 'DAIRY'
  | 'EGG'
  | 'FISH'
  | 'FRUIT'
  | 'GLUTEN_FREE'
  | 'GRAIN'
  | 'HERB'
  | 'LEGUME'
  | 'MEAT'
  | 'NUTS'
  | 'SESAME'
  | 'SHELLFISH'
  | 'SOY'
  | 'SPICE'
  | 'VEGAN'
  | 'VEGETABLE'
  | 'VEGETARIAN';

/** A line that mentions the ingredient. Example: { "id": "cm3f...", "reference": "3 garlic cloves, minced", "noteId": "cm3n...", "noteTitle": "Weeknight Chili" } */
export type IngredientReference = {
  __typename?: 'IngredientReference';
  id: Scalars['ID']['output'];
  noteId?: Maybe<Scalars['ID']['output']>;
  noteTitle?: Maybe<Scalars['String']['output']>;
  reference: Scalars['String']['output'];
};

/**
 * Saves the ingredient editor form. Set advanceToNext to get the next unreviewed ingredient's id back.
 *
 * Example: { "id": "cm3i...", "name": "smoked paprika", "plural": null, "properties": ["VEGAN", "SPICE"], "isComposedIngredient": false, "parentIngredientId": "cm3p...", "substitutionIds": [], "aliases": ["pimentón"], "category": "Spices", "tags": [], "markReviewed": true, "advanceToNext": true }
 */
export type IngredientSaveInput = {
  advanceToNext: Scalars['Boolean']['input'];
  aliases: Array<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isComposedIngredient: Scalars['Boolean']['input'];
  markReviewed: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  parentIngredientId?: InputMaybe<Scalars['ID']['input']>;
  plural?: InputMaybe<Scalars['String']['input']>;
  properties: Array<IngredientProperty>;
  substitutionIds: Array<Scalars['ID']['input']>;
  tags: Array<Scalars['String']['input']>;
};

/**
 * One row of the ingredients list.
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
  /** How many ingredient lines mention this ingredient. */
  referenceCount: Scalars['Int']['output'];
};

/** Which ingredients the ingredients page lists. Lowercase to match the page's ?view= search param. */
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
 * Example: renaming an ingredient invalidates INGREDIENTS (the list shows the name) and INGREDIENT_DETAIL (other ingredients show it as a parent or substitution).
 */
export type InvalidationDomain =
  | 'CONCEPTS'
  | 'CONCEPT_DETAIL'
  | 'DASHBOARD_STATS'
  | 'DISCOVERIES'
  | 'IMPORT_STATS'
  | 'INGREDIENTS'
  | 'INGREDIENT_DETAIL'
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
  noteId: Scalars['ID']['output'];
  retryCount: Scalars['Int']['output'];
  startedAt?: Maybe<Scalars['String']['output']>;
  status: JobStatus;
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
  | 'PROCESS_NOTE';

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

/** A person's verdict on how an ingredient line was parsed. */
export type LineReviewStatus =
  | 'CORRECT'
  | 'INCORRECT'
  | 'UNREVIEWED';

/**
 * A stored v2 mention of one ingredient-line segment (written by the backfill and by reinterpretation).
 *
 * Example: { "id": "0193...", "segmentIndex": 0, "rawText": "1 lb boneless chicken thighs", "status": "AUTO_RESOLVED", "concept": { "canonicalName": "chicken thigh" }, "quantity": "1 lb" }
 */
export type Mention = {
  __typename?: 'Mention';
  candidates: Array<ResolutionCandidateView>;
  concept?: Maybe<ConceptRef>;
  id: Scalars['ID']['output'];
  lexiconRevision: Scalars['Int']['output'];
  /** Readable quantity, e.g. "1 lb" or "2-3 cups". */
  quantity?: Maybe<Scalars['String']['output']>;
  rawText: Scalars['String']['output'];
  score?: Maybe<Scalars['Float']['output']>;
  segmentIndex: Scalars['Int']['output'];
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
  createIngredient: CreateIngredientPayload;
  /** Admin only. Sets an open discovery aside without deciding it. */
  deferDiscovery: BasicPayload;
  /** Admin only. Promotes every COMPLETED note that has no recipe yet. */
  promoteCompletedNotes: PromoteCompletedNotesPayload;
  /** Creates a recipe from a note (or returns the existing one). Example: promoteNoteToRecipe(noteId: "cm3n...") */
  promoteNoteToRecipe: PromoteNotePayload;
  /** Admin only. Mines adjacency counts into open discoveries and suggests relationships by name. */
  refreshDiscoveries: RefreshDiscoveriesPayload;
  saveIngredient: SaveIngredientPayload;
  /** Marks how well a line was parsed. Example: setLineReviewStatus(lineId: "cm3l...", status: INCORRECT) */
  setLineReviewStatus: SetLineReviewStatusPayload;
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


export type MutationPromoteNoteToRecipeArgs = {
  noteId: Scalars['ID']['input'];
};


export type MutationSaveIngredientArgs = {
  input: IngredientSaveInput;
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

/**
 * One piece of a parsed ingredient line as stored by the import pipeline (v1 parser today).
 *
 * Example for "2 cups flour": [{ "index": 0, "type": "amount", "value": "2" }, { "index": 1, "type": "unit", "value": "cups" }, { "index": 2, "type": "ingredient", "value": "flour", "ingredientId": "cm3i..." }]
 */
export type ParsedSegment = {
  __typename?: 'ParsedSegment';
  index: Scalars['Int']['output'];
  /** Linked ingredient for ingredient segments. */
  ingredientId?: Maybe<Scalars['ID']['output']>;
  /** Grammar rule that produced the segment, when recorded. */
  rule?: Maybe<Scalars['String']['output']>;
  /** Segment role from the parser, e.g. amount, unit, ingredient, description. */
  type: Scalars['String']['output'];
  value: Scalars['String']['output'];
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
  /** Admin only. */
  concept?: Maybe<Concept>;
  /** Admin only. Example: concepts(query: "sugar", page: 1) */
  concepts: ConceptsPage;
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
  ingredients: Array<IngredientSummary>;
  job?: Maybe<Job>;
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
  /** Example: recipes(query: "chili", category: "Dinner") */
  recipes: RecipesPage;
  /** Admin only. Name and entry search for concept pickers, up to 10 results. Example: searchConcepts(query: "thigh") */
  searchConcepts: Array<ConceptRef>;
  /** Name search for pickers, up to 10 results. Example: searchIngredients(query: "papr", excludeId: "cm3i...") -> [{ name: "paprika" }, { name: "smoked paprika" }] */
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


export type QueryIngredientsArgs = {
  view: IngredientView;
};


export type QueryJobArgs = {
  jobId: Scalars['ID']['input'];
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

/** Example: { "ingredientId": "cm3i...", "name": "garlic", "lineCount": 214 } */
export type TopIngredient = {
  __typename?: 'TopIngredient';
  ingredientId: Scalars['ID']['output'];
  /** How many ingredient lines mention it. */
  lineCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
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
    | ( PromoteCompletedNotesPayload )
    | ( PromoteNotePayload )
    | ( RefreshDiscoveriesPayload )
    | ( SaveIngredientPayload )
    | ( Omit<SetLineReviewStatusPayload, 'note'> & { note?: Maybe<_RefType['Note']> } )
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
  CleanupAllDataPayload: ResolverTypeWrapper<CleanupAllDataPayload>;
  Concept: ResolverTypeWrapper<Concept>;
  ConceptAttributeValue: ResolverTypeWrapper<ConceptAttributeValue>;
  ConceptClassification: ResolverTypeWrapper<ConceptClassification>;
  ConceptDecision: ResolverTypeWrapper<ConceptDecision>;
  ConceptEntry: ResolverTypeWrapper<ConceptEntry>;
  ConceptMention: ResolverTypeWrapper<ConceptMention>;
  ConceptRef: ResolverTypeWrapper<ConceptRef>;
  ConceptRelationship: ResolverTypeWrapper<ConceptRelationship>;
  ConceptStatus: ConceptStatus;
  ConceptSummary: ResolverTypeWrapper<ConceptSummary>;
  ConceptsPage: ResolverTypeWrapper<ConceptsPage>;
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
  IngredientReference: ResolverTypeWrapper<IngredientReference>;
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
  LineReviewStatus: LineReviewStatus;
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
  ParsedSegment: ResolverTypeWrapper<ParsedSegment>;
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
  ResolutionCandidateView: ResolverTypeWrapper<ResolutionCandidateView>;
  ResolutionView: ResolverTypeWrapper<ResolutionView>;
  SaveIngredientPayload: ResolverTypeWrapper<SaveIngredientPayload>;
  SetLineReviewStatusPayload: ResolverTypeWrapper<Omit<SetLineReviewStatusPayload, 'note'> & { note?: Maybe<ResolversTypes['Note']> }>;
  Source: ResolverTypeWrapper<Source>;
  SourceBook: ResolverTypeWrapper<SourceBook>;
  SourceUrl: ResolverTypeWrapper<SourceUrl>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SyntaxToken: ResolverTypeWrapper<SyntaxToken>;
  TextSpan: ResolverTypeWrapper<TextSpan>;
  TopIngredient: ResolverTypeWrapper<TopIngredient>;
  UserType: UserType;
  Viewer: ResolverTypeWrapper<Viewer>;
  Vocabulary: ResolverTypeWrapper<Vocabulary>;
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
  ConceptDecision: ConceptDecision;
  ConceptEntry: ConceptEntry;
  ConceptMention: ConceptMention;
  ConceptRef: ConceptRef;
  ConceptRelationship: ConceptRelationship;
  ConceptSummary: ConceptSummary;
  ConceptsPage: ConceptsPage;
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
  IngredientReference: IngredientReference;
  IngredientSaveInput: IngredientSaveInput;
  IngredientSummary: IngredientSummary;
  InstructionLine: InstructionLine;
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Job: Job;
  LabelCount: LabelCount;
  LexiconEntryRef: LexiconEntryRef;
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
  ParsedSegment: ParsedSegment;
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
  ResolutionCandidateView: ResolutionCandidateView;
  ResolutionView: ResolutionView;
  SaveIngredientPayload: SaveIngredientPayload;
  SetLineReviewStatusPayload: Omit<SetLineReviewStatusPayload, 'note'> & { note?: Maybe<ResolversParentTypes['Note']> };
  Source: Source;
  SourceBook: SourceBook;
  SourceUrl: SourceUrl;
  String: Scalars['String']['output'];
  SyntaxToken: SyntaxToken;
  TextSpan: TextSpan;
  TopIngredient: TopIngredient;
  Viewer: Viewer;
  Vocabulary: Vocabulary;
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
}>;

export type ConceptAttributeValueResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptAttributeValue'] = ResolversParentTypes['ConceptAttributeValue']> = ResolversObject<{
  attributeValueId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  definitionKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  valueKey?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ConceptClassificationResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ConceptClassification'] = ResolversParentTypes['ConceptClassification']> = ResolversObject<{
  inheritedFrom?: Resolver<Maybe<ResolversTypes['ConceptRef']>, ParentType, ContextType>;
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

export type CreateIngredientPayloadResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['CreateIngredientPayload'] = ResolversParentTypes['CreateIngredientPayload']> = ResolversObject<{
  effect?: Resolver<ResolversTypes['MutationEffect'], ParentType, ContextType>;
  id?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DashboardStatsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DashboardStats'] = ResolversParentTypes['DashboardStats']> = ResolversObject<{
  ingredientCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ingredientLines?: Resolver<ResolversTypes['IngredientLineStats'], ParentType, ContextType>;
  instructionLineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  noteCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  notesBySavedYear?: Resolver<Array<ResolversTypes['YearCount']>, ParentType, ContextType>;
  notesByStatus?: Resolver<ResolversTypes['NoteStatusCounts'], ParentType, ContextType>;
  notesReadyToPromote?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recipeCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  reviewedIngredientCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  topCategories?: Resolver<Array<ResolversTypes['LabelCount']>, ParentType, ContextType>;
  topIngredients?: Resolver<Array<ResolversTypes['TopIngredient']>, ParentType, ContextType>;
  topSources?: Resolver<Array<ResolversTypes['LabelCount']>, ParentType, ContextType>;
  topTags?: Resolver<Array<ResolversTypes['LabelCount']>, ParentType, ContextType>;
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

export type ImportStatsResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ImportStats'] = ResolversParentTypes['ImportStats']> = ResolversObject<{
  numberOfIngredients?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numberOfNotes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  numberOfParsingErrors?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type IngredientResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Ingredient'] = ResolversParentTypes['Ingredient']> = ResolversObject<{
  aliases?: Resolver<Array<ResolversTypes['IngredientAlias']>, ParentType, ContextType>;
  category?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isComposedIngredient?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isReviewed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parent?: Resolver<Maybe<ResolversTypes['IngredientOption']>, ParentType, ContextType>;
  plural?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  properties?: Resolver<Array<ResolversTypes['IngredientProperty']>, ParentType, ContextType>;
  referenceCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  references?: Resolver<Array<ResolversTypes['IngredientReference']>, ParentType, ContextType>;
  reviewedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  substitutions?: Resolver<Array<ResolversTypes['IngredientOption']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  variants?: Resolver<Array<ResolversTypes['IngredientOption']>, ParentType, ContextType>;
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
  segments?: Resolver<Array<ResolversTypes['ParsedSegment']>, ParentType, ContextType>;
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

export type IngredientReferenceResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['IngredientReference'] = ResolversParentTypes['IngredientReference']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  noteId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  noteTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  reference?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  noteId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  retryCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['JobStatus'], ParentType, ContextType>;
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

export type MentionResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Mention'] = ResolversParentTypes['Mention']> = ResolversObject<{
  candidates?: Resolver<Array<ResolversTypes['ResolutionCandidateView']>, ParentType, ContextType>;
  concept?: Resolver<Maybe<ResolversTypes['ConceptRef']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lexiconRevision?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  quantity?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rawText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  score?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  segmentIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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
  promoteCompletedNotes?: Resolver<ResolversTypes['PromoteCompletedNotesPayload'], ParentType, ContextType>;
  promoteNoteToRecipe?: Resolver<ResolversTypes['PromoteNotePayload'], ParentType, ContextType, RequireFields<MutationPromoteNoteToRecipeArgs, 'noteId'>>;
  refreshDiscoveries?: Resolver<ResolversTypes['RefreshDiscoveriesPayload'], ParentType, ContextType>;
  saveIngredient?: Resolver<ResolversTypes['SaveIngredientPayload'], ParentType, ContextType, RequireFields<MutationSaveIngredientArgs, 'input'>>;
  setLineReviewStatus?: Resolver<ResolversTypes['SetLineReviewStatusPayload'], ParentType, ContextType, RequireFields<MutationSetLineReviewStatusArgs, 'lineId' | 'status'>>;
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
  __resolveType: TypeResolveFn<'ApplyDecisionPayload' | 'BasicPayload' | 'CleanupAllDataPayload' | 'CreateIngredientPayload' | 'PromoteCompletedNotesPayload' | 'PromoteNotePayload' | 'RefreshDiscoveriesPayload' | 'SaveIngredientPayload' | 'SetLineReviewStatusPayload', ParentType, ContextType>;
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

export type ParsedSegmentResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['ParsedSegment'] = ResolversParentTypes['ParsedSegment']> = ResolversObject<{
  index?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ingredientId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  rule?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  dashboardStats?: Resolver<ResolversTypes['DashboardStats'], ParentType, ContextType>;
  discovery?: Resolver<Maybe<ResolversTypes['Discovery']>, ParentType, ContextType, RequireFields<QueryDiscoveryArgs, 'id'>>;
  discoveryCounts?: Resolver<Array<ResolversTypes['DiscoveryTypeCount']>, ParentType, ContextType>;
  discoveryQueue?: Resolver<ResolversTypes['DiscoveryPage'], ParentType, ContextType, Partial<QueryDiscoveryQueueArgs>>;
  importStats?: Resolver<ResolversTypes['ImportStats'], ParentType, ContextType>;
  ingredient?: Resolver<Maybe<ResolversTypes['Ingredient']>, ParentType, ContextType, RequireFields<QueryIngredientArgs, 'id'>>;
  ingredientCategoryNames?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  ingredientCounts?: Resolver<ResolversTypes['IngredientCounts'], ParentType, ContextType>;
  ingredients?: Resolver<Array<ResolversTypes['IngredientSummary']>, ParentType, ContextType, RequireFields<QueryIngredientsArgs, 'view'>>;
  job?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType, RequireFields<QueryJobArgs, 'jobId'>>;
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

export type TopIngredientResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['TopIngredient'] = ResolversParentTypes['TopIngredient']> = ResolversObject<{
  ingredientId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lineCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
  ConceptSummary?: ConceptSummaryResolvers<ContextType>;
  ConceptsPage?: ConceptsPageResolvers<ContextType>;
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
  ImportStats?: ImportStatsResolvers<ContextType>;
  Ingredient?: IngredientResolvers<ContextType>;
  IngredientAlias?: IngredientAliasResolvers<ContextType>;
  IngredientBlock?: IngredientBlockResolvers<ContextType>;
  IngredientCounts?: IngredientCountsResolvers<ContextType>;
  IngredientLine?: IngredientLineResolvers<ContextType>;
  IngredientLineStats?: IngredientLineStatsResolvers<ContextType>;
  IngredientOption?: IngredientOptionResolvers<ContextType>;
  IngredientReference?: IngredientReferenceResolvers<ContextType>;
  IngredientSummary?: IngredientSummaryResolvers<ContextType>;
  InstructionLine?: InstructionLineResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Job?: JobResolvers<ContextType>;
  LabelCount?: LabelCountResolvers<ContextType>;
  LexiconEntryRef?: LexiconEntryRefResolvers<ContextType>;
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
  ParsedSegment?: ParsedSegmentResolvers<ContextType>;
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
  ResolutionCandidateView?: ResolutionCandidateViewResolvers<ContextType>;
  ResolutionView?: ResolutionViewResolvers<ContextType>;
  SaveIngredientPayload?: SaveIngredientPayloadResolvers<ContextType>;
  SetLineReviewStatusPayload?: SetLineReviewStatusPayloadResolvers<ContextType>;
  Source?: SourceResolvers<ContextType>;
  SourceBook?: SourceBookResolvers<ContextType>;
  SourceUrl?: SourceUrlResolvers<ContextType>;
  SyntaxToken?: SyntaxTokenResolvers<ContextType>;
  TextSpan?: TextSpanResolvers<ContextType>;
  TopIngredient?: TopIngredientResolvers<ContextType>;
  Viewer?: ViewerResolvers<ContextType>;
  Vocabulary?: VocabularyResolvers<ContextType>;
  YearCount?: YearCountResolvers<ContextType>;
}>;

