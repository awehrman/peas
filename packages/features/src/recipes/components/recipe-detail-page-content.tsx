"use client";

import type { ReactNode } from "react";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink } from "../../app-navigation";
import { IngredientLineText } from "../../notes/components/ingredient-line-text";
import type { NoteMention } from "../../teach/mention-panel";
import type { ConceptRef } from "../../teach/types";
import type { RecipeDetail } from "../types";

import { EditRecipeDialog, type UpdateRecipe } from "./edit-recipe-dialog";

function conceptsOf(mentions: readonly NoteMention[]): ConceptRef[] {
  const byId = new Map<string, ConceptRef>();
  for (const mention of mentions)
    if (mention.concept) byId.set(mention.concept.id, mention.concept);
  return [...byId.values()];
}

interface RecipeDetailPageContentProps {
  recipe: RecipeDetail;
  onUpdate: UpdateRecipe;
}

export function RecipeDetailPageContent({
  recipe,
  onUpdate,
}: RecipeDetailPageContentProps): ReactNode {
  const urls = recipe.sources.flatMap((source) => source.urls);
  const books = recipe.sources
    .map((source) => source.book)
    .filter((book): book is NonNullable<typeof book> => book !== null);

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
          <h1 className="text-3xl font-semibold text-greyscale-900">{recipe.title}</h1>
          {recipe.categories.length > 0 || recipe.tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1" aria-label="Categories and tags">
              {recipe.categories.map((category) => (
                <li key={category.id}>
                  <AppLink href={`/recipes?category=${encodeURIComponent(category.name)}`}>
                    <Badge>{category.name}</Badge>
                  </AppLink>
                </li>
              ))}
              {recipe.tags.map((tag) => (
                <li key={tag.id}>
                  <AppLink href={`/recipes?tag=${encodeURIComponent(tag.name)}`}>
                    <Badge variant="secondary">{tag.name}</Badge>
                  </AppLink>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-3 text-sm text-greyscale-600">
            {urls.map((url) => (
              <a
                key={url.id}
                href={url.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:underline"
              >
                {url.siteName ?? url.url}
              </a>
            ))}
            {books.map((book) => (
              <span key={book.title}>
                From <span className="font-medium">{book.title}</span>
                {book.author ? ` by ${book.author}` : ""}
              </span>
            ))}
            <AppLink href={`/notes/${recipe.noteId}`} className="hover:underline">
              View imported note
            </AppLink>
          </div>
        </div>
        <EditRecipeDialog recipe={recipe} onUpdate={onUpdate} />
      </header>

      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={`Photo of ${recipe.title}`}
          className="max-h-[28rem] w-full rounded-lg object-cover"
        />
      ) : null}

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
                    .filter((line) => line.isActive)
                    .map((line) => (
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
                    ))}
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
                  .filter((instruction) => instruction.isActive)
                  .map((instruction) => (
                    <li key={instruction.id}>{instruction.text}</li>
                  ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </article>
  );
}
