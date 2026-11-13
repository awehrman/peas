import { prisma } from "../client.js";

import { bumpRevision } from "./ontology/revision.js";

export interface CleanupOptions {
  /** Also deletes food knowledge (see `OntologyCleanupCounts`), for starting over from the seeds. Off by default. */
  includeOntology?: boolean;
}

export interface ImportCleanupCounts {
  recipes: number;
  notes: number;
  ingredientLines: number;
  evernoteMetadata: number;
  sources: number;
  websites: number;
  books: number;
  queueJobs: number;
  statusEvents: number;
  urls: number;
  categories: number;
  tags: number;
  discoveries: number;
  reinterpretRuns: number;
}

export interface OntologyCleanupCounts {
  concepts: number;
  lexiconEntries: number;
  attributeDefinitions: number;
  preparations: number;
  decisions: number;
  reviewCards: number;
  products: number;
  brands: number;
  ingredientTags: number;
  legacyMappings: number;
  healthSnapshots: number;
}

export type CleanupCounts = ImportCleanupCounts &
  Partial<OntologyCleanupCounts>;

/**
 * Deletes everything an import created (DANGEROUS): notes, recipes, ingredient lines and their mentions, sources, note categories and tags, queue jobs, reinterpretation runs, and open or deferred discoveries left with no example lines. Users, food knowledge (concepts, lexicon, attributes, relationships), decisions, resolved and rejected discoveries, corpus health snapshots, and lexicon revisions are kept.
 *
 * With `includeOntology`, food knowledge goes too (see `deleteOntology`).
 *
 * @example
 * await cleanupAllData() // { deletedCounts: { notes: 12, ingredientLines: 340, ... } }
 * await cleanupAllData({ includeOntology: true }) // also { concepts: 33, lexiconEntries: 120, ... }
 */
export async function cleanupAllData(
  options: CleanupOptions = {}
): Promise<{ deletedCounts: CleanupCounts }> {
  try {
    const recipes = (await prisma.recipe.deleteMany({})).count;
    const queueJobs = (await prisma.queueJob.deleteMany({})).count;
    const statusEvents = (await prisma.noteStatusEvent.deleteMany({})).count;

    // Mentions and their discovery evidence cascade with the lines
    const ingredientLines = (await prisma.parsedIngredientLine.deleteMany({}))
      .count;

    // Open review cards with no example lines left would show stale counts; decided ones stay as history
    const discoveries = (
      await prisma.discovery.deleteMany({
        where: { status: { in: ["OPEN", "DEFERRED"] }, evidence: { none: {} } },
      })
    ).count;
    const reinterpretRuns = (await prisma.reinterpretRun.deleteMany({})).count;

    await prisma.parsedInstructionLine.deleteMany({});
    const notes = (await prisma.note.deleteMany({})).count;
    const evernoteMetadata = (await prisma.evernoteMetadata.deleteMany({}))
      .count;

    // URLs reference sources and websites
    const urls = (await prisma.uRL.deleteMany({})).count;
    const websites = (await prisma.website.deleteMany({})).count;
    const books = (await prisma.book.deleteMany({})).count;
    const sources = (await prisma.source.deleteMany({})).count;

    // Note categories and tags come from imported notebooks and Evernote tags
    const categories = (await prisma.category.deleteMany({})).count;
    const tags = (await prisma.tag.deleteMany({})).count;

    const deletedCounts: CleanupCounts = {
      recipes,
      notes,
      ingredientLines,
      evernoteMetadata,
      sources,
      websites,
      books,
      queueJobs,
      statusEvents,
      urls,
      categories,
      tags,
      discoveries,
      reinterpretRuns,
    };
    if (!options.includeOntology) return { deletedCounts };

    return { deletedCounts: { ...deletedCounts, ...(await deleteOntology()) } };
  } catch (error) {
    console.error("Failed to cleanup all data:", error);
    throw error;
  }
}

/**
 * Deletes food knowledge in one transaction: concepts (with their relationships, classifications, substitutions, attributes, and merge records), every lexicon entry, attribute definitions, preparations, decisions, every review card, products, brands, ingredient tags, legacy ingredient mappings, and corpus health snapshots. Lexicon revisions are kept so the revision number keeps rising; a new "reset:ontology" revision tells cached lexicons to reload. Users are kept.
 */
async function deleteOntology(): Promise<OntologyCleanupCounts> {
  return prisma.$transaction(async (tx) => {
    const reviewCards = (await tx.discovery.deleteMany({})).count;
    const decisions = (await tx.lexiconDecision.deleteMany({})).count;
    const lexiconEntries = (await tx.lexiconEntry.deleteMany({})).count;
    const legacyMappings = (await tx.legacyIngredientMapping.deleteMany({}))
      .count;
    const products = (await tx.foodProduct.deleteMany({})).count;
    const concepts = (await tx.foodConcept.deleteMany({})).count;
    const attributeDefinitions = (await tx.attributeDefinition.deleteMany({}))
      .count;
    const preparations = (await tx.preparationOperation.deleteMany({})).count;
    const brands = (await tx.brand.deleteMany({})).count;
    const ingredientTags = (await tx.ingredientTag.deleteMany({})).count;
    const healthSnapshots = (await tx.corpusHealthSnapshot.deleteMany({}))
      .count;
    await bumpRevision(tx, "reset:ontology");

    return {
      concepts,
      lexiconEntries,
      attributeDefinitions,
      preparations,
      decisions,
      reviewCards,
      products,
      brands,
      ingredientTags,
      legacyMappings,
      healthSnapshots,
    };
  }, ONTOLOGY_RESET_TIMEOUT);
}

/** Interactive transactions default to 5 seconds; a large lexicon takes longer to delete. */
const ONTOLOGY_RESET_TIMEOUT = { timeout: 60_000 };
