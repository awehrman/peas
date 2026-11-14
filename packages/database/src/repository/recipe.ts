import type { CategoryAssignmentState, Prisma } from "@prisma/client";

import { prisma } from "../client.js";

import { type NoteCategoryRecord, setNoteManualCategories } from "./categories.js";
import { type NoteDetailRecord, getNoteDetail } from "./note.js";
import { getDescendants } from "./ontology/relationships.js";

/** Which category memberships a filter counts: any visible one, only reviewer-approved, or only inferred. */
export type CategoryProvenanceFilter = "ANY" | "APPROVED" | "INFERRED";

const VISIBLE_STATES: CategoryAssignmentState[] = ["APPROVED", "INFERRED"];

function statesFor(provenance: CategoryProvenanceFilter): CategoryAssignmentState[] {
  return provenance === "ANY" ? VISIBLE_STATES : [provenance];
}

export interface RecipesPageQuery {
  query?: string;
  category?: string;
  categoryProvenance?: CategoryProvenanceFilter;
  tag?: string;
  /** Recipes with an active line that mentions this concept or, unless `exactConcept`, a more specific one (IS_A or PART_OF: "chicken" also finds "chicken thigh"). */
  conceptId?: string;
  exactConcept?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * The concept plus its IS_A and PART_OF descendants, so a search for "chicken" also finds "chicken thighs".
 *
 * @example
 * await conceptIdsForSearch(chickenId) // [chickenId, chickenThighId, chickenBreastId]
 */
export async function conceptIdsForSearch(
  conceptId: string,
  exact = false
): Promise<string[]> {
  if (exact) return [conceptId];
  const descendants = await getDescendants(conceptId, ["IS_A", "PART_OF"]);
  return [conceptId, ...descendants.map((related) => related.conceptId)];
}

export interface RecipeListItemRecord {
  id: string;
  title: string;
  imageUrl: string | null;
  categories: string[];
  tags: string[];
  ingredientLineCount: number;
  createdAt: string;
}

export interface RecipesPageResult {
  items: RecipeListItemRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RecipeDetailRecord {
  id: string;
  title: string;
  noteId: string;
  imageUrl: string | null;
  /** The note's category memberships; a recipe reads its note's categories. */
  categories: NoteCategoryRecord[];
  tags: { id: string; name: string }[];
  sources: NoteDetailRecord["sources"];
  ingredientBlocks: NoteDetailRecord["ingredientBlocks"];
  instructions: NoteDetailRecord["instructions"];
  createdAt: string;
}

export interface RecipeUpdateInput {
  id: string;
  title: string;
  categories: string[];
  tags: string[];
}

const DEFAULT_RECIPES_PAGE_SIZE = 24;

/**
 * Creates a recipe from a note, copying its title, first image and tags. Sources and categories are read through the note, so they are not copied. Returns the existing recipe if the note was already promoted.
 */
export async function promoteNoteToRecipe(noteId: string): Promise<{ id: string }> {
  const existing = await prisma.recipe.findUnique({
    where: { noteId },
    select: { id: true },
  });
  if (existing) return existing;

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: {
      title: true,
      archivedAt: true,
      images: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 },
      tags: { select: { id: true } },
    },
  });
  if (!note) throw new Error("Note not found");
  if (note.archivedAt) throw new Error("Archived notes can't become recipes");

  return prisma.recipe.create({
    data: {
      title: note.title?.trim() || "Untitled recipe",
      noteId,
      imageId: note.images[0]?.id ?? null,
      tags: { connect: note.tags },
    },
    select: { id: true },
  });
}

/**
 * Promotes every completed, non-duplicate, unarchived note that isn't a recipe yet.
 */
export async function promoteCompletedNotesToRecipes(): Promise<{ created: number }> {
  const notes = await prisma.note.findMany({
    where: { status: "COMPLETED", recipe: null, archivedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  for (const note of notes) {
    await promoteNoteToRecipe(note.id);
  }

  return { created: notes.length };
}

export async function getRecipesPage({
  query,
  category,
  categoryProvenance = "ANY",
  tag,
  conceptId,
  exactConcept = false,
  page = 1,
  pageSize = DEFAULT_RECIPES_PAGE_SIZE,
}: RecipesPageQuery = {}): Promise<RecipesPageResult> {
  const currentPage = Math.max(1, Math.floor(page));
  const trimmedQuery = query?.trim();
  const conceptIds = conceptId
    ? await conceptIdsForSearch(conceptId, exactConcept)
    : null;

  const noteWhere: Prisma.NoteWhereInput = {
    archivedAt: null,
    ...(category
      ? {
          categoryMemberships: {
            some: {
              state: { in: statesFor(categoryProvenance) },
              category: { name: { equals: category, mode: "insensitive" } },
            },
          },
        }
      : {}),
    ...(conceptIds
      ? {
          parsedIngredientLines: {
            some: {
              isActive: true,
              mentions: { some: { conceptId: { in: conceptIds } } },
            },
          },
        }
      : {}),
  };

  const where: Prisma.RecipeWhereInput = {
    ...(trimmedQuery
      ? { title: { contains: trimmedQuery, mode: "insensitive" } }
      : {}),
    ...(tag ? { tags: { some: { name: { equals: tag, mode: "insensitive" } } } } : {}),
    note: noteWhere,
  };

  const [total, recipes] = await Promise.all([
    prisma.recipe.count({ where }),
    prisma.recipe.findMany({
      where,
      orderBy: { title: "asc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        createdAt: true,
        image: {
          select: { crop4x3ImageUrl: true, thumbnailImageUrl: true, originalImageUrl: true },
        },
        tags: { select: { name: true }, orderBy: { name: "asc" } },
        note: {
          select: {
            _count: { select: { parsedIngredientLines: true } },
            categoryMemberships: {
              where: { state: { in: VISIBLE_STATES } },
              select: { category: { select: { name: true } } },
              orderBy: { category: { name: "asc" } },
            },
          },
        },
      },
    }),
  ]);

  return {
    total,
    page: currentPage,
    pageSize,
    items: recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.image
        ? (recipe.image.crop4x3ImageUrl ??
          recipe.image.thumbnailImageUrl ??
          recipe.image.originalImageUrl)
        : null,
      categories: recipe.note.categoryMemberships.map((item) => item.category.name),
      tags: recipe.tags.map((item) => item.name),
      ingredientLineCount: recipe.note._count.parsedIngredientLines,
      createdAt: recipe.createdAt.toISOString(),
    })),
  };
}

/**
 * Category and tag names currently used by recipes, for filter menus.
 */
export async function getRecipeTaxonomyOptions(): Promise<{
  categories: string[];
  tags: string[];
}> {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      where: {
        memberships: {
          some: {
            state: { in: VISIBLE_STATES },
            note: { recipe: { isNot: null }, archivedAt: null },
          },
        },
      },
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      where: { recipes: { some: {} } },
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    categories: categories.map((item) => item.name),
    tags: tags.map((item) => item.name),
  };
}

export async function getRecipeDetail(id: string): Promise<RecipeDetailRecord | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      image: { select: { crop3x2ImageUrl: true, originalImageUrl: true } },
      tags: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
  if (!recipe) return null;

  const note = await getNoteDetail(recipe.noteId);

  return {
    id: recipe.id,
    title: recipe.title,
    noteId: recipe.noteId,
    imageUrl: recipe.image
      ? (recipe.image.crop3x2ImageUrl ?? recipe.image.originalImageUrl)
      : null,
    categories: note?.categories ?? [],
    tags: recipe.tags,
    sources: note?.sources ?? [],
    ingredientBlocks: note?.ingredientBlocks ?? [],
    instructions: note?.instructions ?? [],
    createdAt: recipe.createdAt.toISOString(),
  };
}

async function findOrCreateTags(
  tx: Prisma.TransactionClient,
  names: string[]
): Promise<{ id: string }[]> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const ids: { id: string }[] = [];

  for (const name of unique) {
    const existing = await tx.tag.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    ids.push(existing ?? (await tx.tag.create({ data: { name }, select: { id: true } })));
  }

  return ids;
}

/**
 * Saves the recipe edit dialog. Categories are the note's manual choices: names not yet visible are approved, and visible categories left out are removed (or excluded when an ingredient rule would add them back).
 */
export async function updateRecipe(
  input: RecipeUpdateInput,
  userId: string | null = null
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.findUniqueOrThrow({
      where: { id: input.id },
      select: { noteId: true },
    });
    await setNoteManualCategories(tx, recipe.noteId, input.categories, userId);
    const tags = await findOrCreateTags(tx, input.tags);

    return tx.recipe.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        tags: { set: tags },
      },
      select: { id: true },
    });
  });
}
