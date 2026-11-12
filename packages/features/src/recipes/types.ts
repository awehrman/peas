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

export interface RecipesFilters {
  query?: string;
  category?: string;
  tag?: string;
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
  categories: { id: string; name: string }[];
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
