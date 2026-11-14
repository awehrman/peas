import type { NoteDetail } from "../notes/types";

export interface RecipeListItem {
  id: string;
  title: string;
  imageUrl: string | null;
  categories: string[];
  tags: string[];
  ingredientLineCount: number;
  createdAt: string;
}

export interface RecipesPageData {
  items: RecipeListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type CategoryProvenance = "ANY" | "APPROVED" | "INFERRED";

export interface RecipesFilters {
  query?: string;
  category?: string;
  /** Which category memberships the category filter counts. */
  categoryProvenance?: CategoryProvenance;
  tag?: string;
  /** Recipes that mention this concept or a more specific one. */
  conceptId?: string;
}

export interface RecipeTaxonomyOptions {
  categories: string[];
  tags: string[];
}

export interface RecipeDetail {
  id: string;
  title: string;
  noteId: string;
  imageUrl: string | null;
  categories: NoteDetail["categories"];
  tags: { id: string; name: string }[];
  sources: NoteDetail["sources"];
  ingredientBlocks: NoteDetail["ingredientBlocks"];
  instructions: NoteDetail["instructions"];
  createdAt: string;
}

export interface RecipeUpdateInput {
  id: string;
  title: string;
  categories: string[];
  tags: string[];
}
