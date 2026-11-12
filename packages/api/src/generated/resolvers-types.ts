import type { GraphQLResolveInfo } from 'graphql';
import type { ApiContext } from '../context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
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

/** Example: { "key": "notes", "count": 1 } */
export type DeletedCount = {
  __typename?: 'DeletedCount';
  count: Scalars['Int']['output'];
  key: Scalars['String']['output'];
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
  | 'DASHBOARD_STATS'
  | 'IMPORT_STATS'
  | 'INGREDIENTS'
  | 'INGREDIENT_DETAIL'
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

/** A person's verdict on how an ingredient line was parsed. */
export type LineReviewStatus =
  | 'CORRECT'
  | 'INCORRECT'
  | 'UNREVIEWED';

export type Mutation = {
  __typename?: 'Mutation';
  /** Admin only. Deletes all imported data and R2 objects; users and sessions are kept. */
  cleanupAllData: CleanupAllDataPayload;
  createIngredient: CreateIngredientPayload;
  /** Admin only. Promotes every COMPLETED note that has no recipe yet. */
  promoteCompletedNotes: PromoteCompletedNotesPayload;
  /** Creates a recipe from a note (or returns the existing one). Example: promoteNoteToRecipe(noteId: "cm3n...") */
  promoteNoteToRecipe: PromoteNotePayload;
  saveIngredient: SaveIngredientPayload;
  /** Marks how well a line was parsed. Example: setLineReviewStatus(lineId: "cm3l...", status: INCORRECT) */
  setLineReviewStatus: SetLineReviewStatusPayload;
  updateRecipe: BasicPayload;
};


export type MutationCreateIngredientArgs = {
  input: IngredientCreateInput;
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
  /** Lexicon revision after the mutation, once the ontology exists. Null until then. */
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
  dashboardStats: DashboardStats;
  importStats: ImportStats;
  ingredient?: Maybe<Ingredient>;
  ingredientCategoryNames: Array<Scalars['String']['output']>;
  ingredientCounts: IngredientCounts;
  ingredients: Array<IngredientSummary>;
  job?: Maybe<Job>;
  note?: Maybe<Note>;
  /** Filters are optional; blank strings are ignored. Example: notes(status: FAILED, page: 1) */
  notes: NotesPage;
  recipe?: Maybe<Recipe>;
  recipeTaxonomy: RecipeTaxonomy;
  /** Example: recipes(query: "chili", category: "Dinner") */
  recipes: RecipesPage;
  /** Name search for pickers, up to 10 results. Example: searchIngredients(query: "papr", excludeId: "cm3i...") -> [{ name: "paprika" }, { name: "smoked paprika" }] */
  searchIngredients: Array<IngredientOption>;
  viewer?: Maybe<Viewer>;
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


export type QueryNoteArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNotesArgs = {
  page?: InputMaybe<Scalars['Int']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<NoteStatus>;
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
    | ( BasicPayload )
    | ( CleanupAllDataPayload )
    | ( CreateIngredientPayload )
    | ( PromoteCompletedNotesPayload )
    | ( PromoteNotePayload )
    | ( SaveIngredientPayload )
    | ( SetLineReviewStatusPayload )
  ;
}>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BasicPayload: ResolverTypeWrapper<BasicPayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CleanupAllDataPayload: ResolverTypeWrapper<CleanupAllDataPayload>;
  CreateIngredientPayload: ResolverTypeWrapper<CreateIngredientPayload>;
  DashboardStats: ResolverTypeWrapper<DashboardStats>;
  DeletedCount: ResolverTypeWrapper<DeletedCount>;
  EntityRef: ResolverTypeWrapper<EntityRef>;
  EvernoteMetadata: ResolverTypeWrapper<EvernoteMetadata>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ImportStats: ResolverTypeWrapper<ImportStats>;
  Ingredient: ResolverTypeWrapper<Ingredient>;
  IngredientAlias: ResolverTypeWrapper<IngredientAlias>;
  IngredientBlock: ResolverTypeWrapper<IngredientBlock>;
  IngredientCounts: ResolverTypeWrapper<IngredientCounts>;
  IngredientCreateInput: IngredientCreateInput;
  IngredientLine: ResolverTypeWrapper<IngredientLine>;
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
  Job: ResolverTypeWrapper<Job>;
  JobStatus: JobStatus;
  JobType: JobType;
  LabelCount: ResolverTypeWrapper<LabelCount>;
  LineReviewStatus: LineReviewStatus;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  MutationEffect: ResolverTypeWrapper<MutationEffect>;
  MutationPayload: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['MutationPayload']>;
  NamedTag: ResolverTypeWrapper<NamedTag>;
  Note: ResolverTypeWrapper<Note>;
  NoteImage: ResolverTypeWrapper<NoteImage>;
  NoteStatus: NoteStatus;
  NoteStatusCounts: ResolverTypeWrapper<NoteStatusCounts>;
  NoteSummary: ResolverTypeWrapper<NoteSummary>;
  NotesPage: ResolverTypeWrapper<NotesPage>;
  ParseStatus: ParseStatus;
  ParsedSegment: ResolverTypeWrapper<ParsedSegment>;
  PromoteCompletedNotesPayload: ResolverTypeWrapper<PromoteCompletedNotesPayload>;
  PromoteNotePayload: ResolverTypeWrapper<PromoteNotePayload>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Recipe: ResolverTypeWrapper<Recipe>;
  RecipeSummary: ResolverTypeWrapper<RecipeSummary>;
  RecipeTaxonomy: ResolverTypeWrapper<RecipeTaxonomy>;
  RecipeUpdateInput: RecipeUpdateInput;
  RecipesPage: ResolverTypeWrapper<RecipesPage>;
  SaveIngredientPayload: ResolverTypeWrapper<SaveIngredientPayload>;
  SetLineReviewStatusPayload: ResolverTypeWrapper<SetLineReviewStatusPayload>;
  Source: ResolverTypeWrapper<Source>;
  SourceBook: ResolverTypeWrapper<SourceBook>;
  SourceUrl: ResolverTypeWrapper<SourceUrl>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  TopIngredient: ResolverTypeWrapper<TopIngredient>;
  UserType: UserType;
  Viewer: ResolverTypeWrapper<Viewer>;
  YearCount: ResolverTypeWrapper<YearCount>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BasicPayload: BasicPayload;
  Boolean: Scalars['Boolean']['output'];
  CleanupAllDataPayload: CleanupAllDataPayload;
  CreateIngredientPayload: CreateIngredientPayload;
  DashboardStats: DashboardStats;
  DeletedCount: DeletedCount;
  EntityRef: EntityRef;
  EvernoteMetadata: EvernoteMetadata;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  ImportStats: ImportStats;
  Ingredient: Ingredient;
  IngredientAlias: IngredientAlias;
  IngredientBlock: IngredientBlock;
  IngredientCounts: IngredientCounts;
  IngredientCreateInput: IngredientCreateInput;
  IngredientLine: IngredientLine;
  IngredientLineStats: IngredientLineStats;
  IngredientOption: IngredientOption;
  IngredientReference: IngredientReference;
  IngredientSaveInput: IngredientSaveInput;
  IngredientSummary: IngredientSummary;
  InstructionLine: InstructionLine;
  Int: Scalars['Int']['output'];
  Job: Job;
  LabelCount: LabelCount;
  Mutation: Record<PropertyKey, never>;
  MutationEffect: MutationEffect;
  MutationPayload: ResolversInterfaceTypes<ResolversParentTypes>['MutationPayload'];
  NamedTag: NamedTag;
  Note: Note;
  NoteImage: NoteImage;
  NoteStatusCounts: NoteStatusCounts;
  NoteSummary: NoteSummary;
  NotesPage: NotesPage;
  ParsedSegment: ParsedSegment;
  PromoteCompletedNotesPayload: PromoteCompletedNotesPayload;
  PromoteNotePayload: PromoteNotePayload;
  Query: Record<PropertyKey, never>;
  Recipe: Recipe;
  RecipeSummary: RecipeSummary;
  RecipeTaxonomy: RecipeTaxonomy;
  RecipeUpdateInput: RecipeUpdateInput;
  RecipesPage: RecipesPage;
  SaveIngredientPayload: SaveIngredientPayload;
  SetLineReviewStatusPayload: SetLineReviewStatusPayload;
  Source: Source;
  SourceBook: SourceBook;
  SourceUrl: SourceUrl;
  String: Scalars['String']['output'];
  TopIngredient: TopIngredient;
  Viewer: Viewer;
  YearCount: YearCount;
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

export type DeletedCountResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['DeletedCount'] = ResolversParentTypes['DeletedCount']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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

export type MutationResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  cleanupAllData?: Resolver<ResolversTypes['CleanupAllDataPayload'], ParentType, ContextType>;
  createIngredient?: Resolver<ResolversTypes['CreateIngredientPayload'], ParentType, ContextType, RequireFields<MutationCreateIngredientArgs, 'input'>>;
  promoteCompletedNotes?: Resolver<ResolversTypes['PromoteCompletedNotesPayload'], ParentType, ContextType>;
  promoteNoteToRecipe?: Resolver<ResolversTypes['PromoteNotePayload'], ParentType, ContextType, RequireFields<MutationPromoteNoteToRecipeArgs, 'noteId'>>;
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
  __resolveType: TypeResolveFn<'BasicPayload' | 'CleanupAllDataPayload' | 'CreateIngredientPayload' | 'PromoteCompletedNotesPayload' | 'PromoteNotePayload' | 'SaveIngredientPayload' | 'SetLineReviewStatusPayload', ParentType, ContextType>;
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
  dashboardStats?: Resolver<ResolversTypes['DashboardStats'], ParentType, ContextType>;
  importStats?: Resolver<ResolversTypes['ImportStats'], ParentType, ContextType>;
  ingredient?: Resolver<Maybe<ResolversTypes['Ingredient']>, ParentType, ContextType, RequireFields<QueryIngredientArgs, 'id'>>;
  ingredientCategoryNames?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  ingredientCounts?: Resolver<ResolversTypes['IngredientCounts'], ParentType, ContextType>;
  ingredients?: Resolver<Array<ResolversTypes['IngredientSummary']>, ParentType, ContextType, RequireFields<QueryIngredientsArgs, 'view'>>;
  job?: Resolver<Maybe<ResolversTypes['Job']>, ParentType, ContextType, RequireFields<QueryJobArgs, 'jobId'>>;
  note?: Resolver<Maybe<ResolversTypes['Note']>, ParentType, ContextType, RequireFields<QueryNoteArgs, 'id'>>;
  notes?: Resolver<ResolversTypes['NotesPage'], ParentType, ContextType, Partial<QueryNotesArgs>>;
  recipe?: Resolver<Maybe<ResolversTypes['Recipe']>, ParentType, ContextType, RequireFields<QueryRecipeArgs, 'id'>>;
  recipeTaxonomy?: Resolver<ResolversTypes['RecipeTaxonomy'], ParentType, ContextType>;
  recipes?: Resolver<ResolversTypes['RecipesPage'], ParentType, ContextType, Partial<QueryRecipesArgs>>;
  searchIngredients?: Resolver<Array<ResolversTypes['IngredientOption']>, ParentType, ContextType, RequireFields<QuerySearchIngredientsArgs, 'query'>>;
  viewer?: Resolver<Maybe<ResolversTypes['Viewer']>, ParentType, ContextType>;
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

export type YearCountResolvers<ContextType = ApiContext, ParentType extends ResolversParentTypes['YearCount'] = ResolversParentTypes['YearCount']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  year?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = ApiContext> = ResolversObject<{
  BasicPayload?: BasicPayloadResolvers<ContextType>;
  CleanupAllDataPayload?: CleanupAllDataPayloadResolvers<ContextType>;
  CreateIngredientPayload?: CreateIngredientPayloadResolvers<ContextType>;
  DashboardStats?: DashboardStatsResolvers<ContextType>;
  DeletedCount?: DeletedCountResolvers<ContextType>;
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
  Job?: JobResolvers<ContextType>;
  LabelCount?: LabelCountResolvers<ContextType>;
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
  PromoteCompletedNotesPayload?: PromoteCompletedNotesPayloadResolvers<ContextType>;
  PromoteNotePayload?: PromoteNotePayloadResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Recipe?: RecipeResolvers<ContextType>;
  RecipeSummary?: RecipeSummaryResolvers<ContextType>;
  RecipeTaxonomy?: RecipeTaxonomyResolvers<ContextType>;
  RecipesPage?: RecipesPageResolvers<ContextType>;
  SaveIngredientPayload?: SaveIngredientPayloadResolvers<ContextType>;
  SetLineReviewStatusPayload?: SetLineReviewStatusPayloadResolvers<ContextType>;
  Source?: SourceResolvers<ContextType>;
  SourceBook?: SourceBookResolvers<ContextType>;
  SourceUrl?: SourceUrlResolvers<ContextType>;
  TopIngredient?: TopIngredientResolvers<ContextType>;
  Viewer?: ViewerResolvers<ContextType>;
  YearCount?: YearCountResolvers<ContextType>;
}>;

