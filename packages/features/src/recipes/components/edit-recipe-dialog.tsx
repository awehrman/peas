"use client";

import { type FormEvent, type ReactNode, useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@peas/components";
import { Pencil } from "lucide-react";

import { ChipInput, InlineError, type MutationAction, useMutation } from "../../shared";
import type { RecipeDetail, RecipeUpdateInput } from "../types";

export type UpdateRecipe = MutationAction<[input: RecipeUpdateInput]>;

/** Approved and suggested categories; leaving a suggested one out of the save excludes it. */
function visibleCategoryNames(recipe: RecipeDetail): string[] {
  return recipe.categories
    .filter((membership) => membership.state !== "EXCLUDED")
    .map((membership) => membership.category.name);
}

interface EditRecipeDialogProps {
  recipe: RecipeDetail;
  onUpdate: UpdateRecipe;
  /** Existing category names offered while typing. */
  categoryOptions?: string[];
}

export function EditRecipeDialog({ recipe, onUpdate, categoryOptions }: EditRecipeDialogProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(recipe.title);
  const [categories, setCategories] = useState(visibleCategoryNames(recipe));
  const [tags, setTags] = useState(recipe.tags.map((item) => item.name));
  const update = useMutation(onUpdate);
  const titleError = title.trim() ? null : "Title is required";

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      setTitle(recipe.title);
      setCategories(visibleCategoryNames(recipe));
      setTags(recipe.tags.map((item) => item.name));
      update.clearError();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (titleError) return;

    const result = await update.run({ id: recipe.id, title: title.trim(), categories, tags });
    if (result.success) setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Pencil aria-hidden="true" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Edit recipe</DialogTitle>
            <DialogDescription>
              Ingredients and instructions come from the imported note.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="recipe-title">Title</Label>
            <Input
              id="recipe-title"
              value={title}
              required
              aria-invalid={!!titleError}
              aria-describedby={titleError ? "recipe-title-error" : undefined}
              onChange={(event) => setTitle(event.target.value)}
            />
            {titleError ? (
              <p id="recipe-title-error" className="text-xs text-error-700">
                {titleError}
              </p>
            ) : null}
          </div>
          <ChipInput
            id="recipe-categories"
            label="Categories"
            values={categories}
            onChange={setCategories}
            suggestions={categoryOptions}
            description="Press Enter or comma to add a category. Removing a suggested category excludes it, so reprocessing won't add it back."
          />
          <ChipInput
            id="recipe-tags"
            label="Tags"
            values={tags}
            onChange={setTags}
            description="Press Enter or comma to add a tag."
          />
          <InlineError message={update.error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending || !!titleError}>
              {update.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
