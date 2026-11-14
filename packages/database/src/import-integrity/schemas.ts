import { FOOD_RELATIONSHIP_TYPES } from "@peas/parser/v2";
import { z } from "zod";

/** One ranked bibliographic candidate, stored in BookLookup.candidates. */
export const BookCandidateSchema = z.object({
  workKey: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  authors: z.array(z.string()),
  firstPublishYear: z.number().int().nullable(),
  publishers: z.array(z.string()),
  editionCount: z.number().int().nullable(),
  coverId: z.number().int().nullable(),
  /** ISBNs the provider lists for the work; never copied onto a Book without edition evidence. */
  isbns: z.array(z.string()),
  /** Set when an ISBN in the source text identified this edition. */
  matchedIsbn: z.string().nullable(),
  editionKey: z.string().nullable(),
  score: z.number(),
  signals: z.object({
    titleExact: z.boolean(),
    authorMatch: z.boolean(),
    /** The citation names an author and this work lists others. */
    authorConflict: z.boolean().default(false),
    isbnMatch: z.boolean(),
  }),
  evidence: z.array(z.string()),
});
export type BookCandidate = z.infer<typeof BookCandidateSchema>;

export const BookCandidatesSchema = z.array(BookCandidateSchema);

const RelationshipTypeSchema = z.enum(FOOD_RELATIONSHIP_TYPES);

/** Why a CONCEPT category matched a note: each qualifying mention with the path from its food up to the category's food. */
export const CategoryEvidenceSchema = z.array(
  z.object({
    lineId: z.string(),
    mentionId: z.string(),
    conceptId: z.string(),
    conceptName: z.string(),
    /** Edges from the mentioned food to the target, nearest first; empty when the mention is the target itself. */
    path: z.array(
      z.object({
        type: RelationshipTypeSchema,
        conceptId: z.string(),
        conceptName: z.string(),
      })
    ),
  })
);
export type CategoryEvidence = z.infer<typeof CategoryEvidenceSchema>;

/** What made two notes look like duplicates, stored in DuplicateCandidate.signals. */
export const DuplicateSignalsSchema = z.object({
  rawHtmlHash: z.boolean(),
  contentHash: z.boolean(),
  sharedSourceIds: z.array(z.string()),
  titleSimilarity: z.number().nullable(),
  ingredientSimilarity: z.number().nullable(),
  reasons: z.array(z.string()),
});
export type DuplicateSignals = z.infer<typeof DuplicateSignalsSchema>;

export const DUPLICATE_KEEP_CHOICES = ["EXISTING", "INCOMING", "BOTH"] as const;
export type DuplicateKeepChoice = (typeof DUPLICATE_KEEP_CHOICES)[number];

/** A reviewer's duplicate decision. Which content is kept and whether sources merge are separate choices. */
export const DuplicateResolutionSchema = z.object({
  keep: z.enum(DUPLICATE_KEEP_CHOICES),
  mergeSources: z.boolean(),
});
export type DuplicateResolution = z.infer<typeof DuplicateResolutionSchema>;

const NoteStatusSchema = z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "DUPLICATE"]);
const CategoryStateSchema = z.enum(["INFERRED", "APPROVED", "EXCLUDED"]);

/** Every row a resolution wrote, so undo reverses exactly that. */
export const ResolutionEffectsSchema = z.object({
  archivedNoteIds: z.array(z.string()),
  statusChanges: z.array(
    z.object({ noteId: z.string(), from: NoteStatusSchema, to: NoteStatusSchema })
  ),
  dismissedCandidateIds: z.array(z.string()),
  createdNoteSourceIds: z.array(z.string()),
  primaryChanges: z.array(
    z.object({
      noteId: z.string(),
      from: z.string().nullable(),
      to: z.string().nullable(),
    })
  ),
  createdNoteCategoryIds: z.array(z.string()),
  categoryStateChanges: z.array(
    z.object({ id: z.string(), from: CategoryStateSchema, to: CategoryStateSchema })
  ),
  connectedTags: z.array(z.object({ noteId: z.string(), tagId: z.string() })),
  movedRecipe: z
    .object({ recipeId: z.string(), fromNoteId: z.string(), toNoteId: z.string() })
    .nullable(),
});
export type ResolutionEffects = z.infer<typeof ResolutionEffectsSchema>;
