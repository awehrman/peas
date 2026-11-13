import type { Prisma } from "@prisma/client";

import { prisma } from "../client.js";

import { type NoteDetailRecord, getNoteDetail } from "./note.js";
import { getDescendants } from "./ontology/relationships.js";

export interface RecipesPageQuery {
  query?: string;
  category?: string;
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
  categories: { id: string; name: string }[];
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
 * Creates a recipe from a note, copying its title, first image and
 * taxonomy. Returns the existing recipe if the note was already promoted.
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
      images: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 },
      categories: { select: { id: true } },
      tags: { select: { id: true } },
      sources: { select: { id: true } },
    },
  });
  if (!note) throw new Error("Note not found");

  return prisma.recipe.create({
    data: {
      title: note.title?.trim() || "Untitled recipe",
      noteId,
      imageId: note.images[0]?.id ?? null,
      categories: { connect: note.categories },
      tags: { connect: note.tags },
      sources: { connect: note.sources },
    },
    select: { id: true },
  });
}

/**
 * Promotes every completed, non-duplicate note that isn't a recipe yet.
 */
export async function promoteCompletedNotesToRecipes(): Promise<{ created: number }> {
  const notes = await prisma.note.findMany({
    where: { status: "COMPLETED", recipe: null },
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

  const where: Prisma.RecipeWhereInput = {
    ...(trimmedQuery
      ? { title: { contains: trimmedQuery, mode: "insensitive" } }
      : {}),
    ...(category
      ? { categories: { some: { name: { equals: category, mode: "insensitive" } } } }
      : {}),
    ...(tag ? { tags: { some: { name: { equals: tag, mode: "insensitive" } } } } : {}),
    ...(conceptIds
      ? {
          note: {
            parsedIngredientLines: {
              some: {
                isActive: true,
                mentions: { some: { conceptId: { in: conceptIds } } },
              },
            },
          },
        }
      : {}),
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
        categories: { select: { name: true }, orderBy: { name: "asc" } },
        tags: { select: { name: true }, orderBy: { name: "asc" } },
        note: { select: { _count: { select: { parsedIngredientLines: true } } } },
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
      categories: recipe.categories.map((item) => item.name),
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
      where: { recipes: { some: {} } },
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
      categories: { select: { id: true, name: true }, orderBy: { name: "asc" } },
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
    categories: recipe.categories,
    tags: recipe.tags,
    sources: note?.sources ?? [],
    ingredientBlocks: note?.ingredientBlocks ?? [],
    instructions: note?.instructions ?? [],
    createdAt: recipe.createdAt.toISOString(),
  };
}

async function findOrCreateByName(
  tx: Prisma.TransactionClient,
  model: "category" | "tag",
  names: string[]
): Promise<{ id: string }[]> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const ids: { id: string }[] = [];

  for (const name of unique) {
    const where = { name: { equals: name, mode: "insensitive" as const } };
    const existing =
      model === "category"
        ? await tx.category.findFirst({ where, select: { id: true } })
        : await tx.tag.findFirst({ where, select: { id: true } });

    if (existing) {
      ids.push(existing);
      continue;
    }

    const created =
      model === "category"
        ? await tx.category.create({ data: { name }, select: { id: true } })
        : await tx.tag.create({ data: { name }, select: { id: true } });
    ids.push(created);
  }

  return ids;
}

export async function updateRecipe(input: RecipeUpdateInput): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const categories = await findOrCreateByName(tx, "category", input.categories);
    const tags = await findOrCreateByName(tx, "tag", input.tags);

    return tx.recipe.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        categories: { set: categories },
        tags: { set: tags },
      },
      select: { id: true },
    });
  });
}
