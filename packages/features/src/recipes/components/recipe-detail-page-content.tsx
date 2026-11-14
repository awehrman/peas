"use client";

import { EditRecipeDialog, type UpdateRecipe } from "./edit-recipe-dialog";

import type { ReactNode } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink } from "../../app-navigation";
import {
  type CategoryActions,
  CategoryChips,
} from "../../import-integrity/components/category-chips";
import {
  type RecheckUrl,
  SourceList,
} from "../../import-integrity/components/source-list";
import { IngredientLineText } from "../../notes/components/ingredient-line-text";
import { SectionHeadingItem } from "../../notes/components/note-detail-page-content";
import type { NoteMention } from "../../teach/mention-panel";
import type { ConceptRef } from "../../teach/types";
import type { RecipeDetail } from "../types";

function conceptsOf(mentions: readonly NoteMention[]): ConceptRef[] {
  const byId = new Map<string, ConceptRef>();
  for (const mention of mentions)
    if (mention.concept) byId.set(mention.concept.id, mention.concept);
  return [...byId.values()];
}

interface RecipeDetailPageContentProps extends CategoryActions {
  recipe: RecipeDetail;
  onUpdate: UpdateRecipe;
  onRecheckUrl?: RecheckUrl;
  categoryOptions?: string[];
}

export function RecipeDetailPageContent({
  recipe,
  onUpdate,
  onRecheckUrl,
  categoryOptions,
  ...categoryActions
}: RecipeDetailPageContentProps): ReactNode {
  return (
    <article className="flex max-w-5xl flex-col gap-6">
      <AppLink
        href="/recipes"
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All recipes
      </AppLink>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-greyscale-900">
            {recipe.title}
          </h1>
          {recipe.tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1" aria-label="Tags">
              {recipe.tags.map((tag) => (
                <li key={tag.id}>
                  <AppLink
                    href={`/recipes?tag=${encodeURIComponent(tag.name)}`}
                  >
                    <Badge variant="secondary">{tag.name}</Badge>
                  </AppLink>
                </li>
              ))}
            </ul>
          ) : null}
          <AppLink
            href={`/notes/${recipe.noteId}`}
            className="text-sm text-greyscale-600 hover:underline"
          >
            View imported note
          </AppLink>
        </div>
        <EditRecipeDialog
          recipe={recipe}
          onUpdate={onUpdate}
          categoryOptions={categoryOptions}
        />
      </header>

      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={`Photo of ${recipe.title}`}
          className="max-h-[28rem] w-full rounded-lg object-cover"
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Categories</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChips
              memberships={recipe.categories}
              {...categoryActions}
            />
          </CardContent>
        </Card>
        {recipe.sources.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{recipe.sources.length > 1 ? "Sources" : "Source"}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SourceList
                sources={recipe.sources}
                onRecheckUrl={onRecheckUrl}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Ingredients</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {recipe.ingredientBlocks.length === 0 ? (
              <p className="text-sm text-greyscale-600">No ingredients.</p>
            ) : (
              recipe.ingredientBlocks.map((block) => (
                <ul
                  key={block.blockIndex}
                  aria-label={`Ingredient group ${block.blockIndex + 1}`}
                  className="flex flex-col gap-1"
                >
                  {block.lines
                    .filter(
                      (line) =>
                        line.isActive || line.lineKind === "SECTION_HEADING"
                    )
                    .map((line) =>
                      line.lineKind === "SECTION_HEADING" ? (
                        <SectionHeadingItem
                          key={line.id}
                          text={line.reference}
                        />
                      ) : (
                        <li
                          key={line.id}
                          className="flex flex-wrap items-baseline gap-x-2"
                        >
                          <IngredientLineText
                            reference={line.reference}
                            parseStatus={line.parseStatus}
                            mentions={line.mentions}
                          />
                          {conceptsOf(line.mentions).map((concept) => (
                            <AppLink
                              key={concept.id}
                              href={`/concepts/${concept.id}`}
                              className="text-xs text-primary underline underline-offset-2"
                            >
                              {concept.canonicalName}
                            </AppLink>
                          ))}
                        </li>
                      )
                    )}
                </ul>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Instructions</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.instructions.length === 0 ? (
              <p className="text-sm text-greyscale-600">No instructions.</p>
            ) : (
              <ol className="list-decimal space-y-3 pl-5">
                {recipe.instructions
                  .filter(
                    (instruction) =>
                      instruction.isActive ||
                      instruction.lineKind === "SECTION_HEADING"
                  )
                  .map((instruction) =>
                    instruction.lineKind === "SECTION_HEADING" ? (
                      <SectionHeadingItem
                        key={instruction.id}
                        text={instruction.text}
                        className="-ml-5 list-none"
                      />
                    ) : (
                      <li key={instruction.id}>{instruction.text}</li>
                    )
                  )}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </article>
  );
}
