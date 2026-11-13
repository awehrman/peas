"use client";

import {
  type IngredientLineActions,
  IngredientLineRow,
} from "./ingredient-line-row";
import { NoteStatusBadge } from "./note-status-badge";

import type { ReactNode } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  buttonVariants,
} from "@peas/components";
import { ArrowLeft, CookingPot } from "lucide-react";

import { AppLink, useAppNavigation } from "../../app-navigation";
import {
  InlineError,
  type MutationAction,
  formatDate,
  useMutation,
} from "../../shared";
import { RoleLegend } from "../../teach/highlighted-line";
import type { NoteDetail } from "../types";

interface NoteDetailPageContentProps extends IngredientLineActions {
  note: NoteDetail;
  onPromoteToRecipe?: MutationAction<[noteId: string], { recipeId: string }>;
}

export function NoteDetailPageContent({
  note,
  onSetReviewStatus,
  onPromoteToRecipe,
  onCorrectMention,
  onSearchConcepts,
}: NoteDetailPageContentProps): ReactNode {
  const heroImage = note.images[0];
  const hasIngredients = note.ingredientBlocks.length > 0;

  return (
    <article className="flex max-w-5xl flex-col gap-6">
      <AppLink
        href="/notes"
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All notes
      </AppLink>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-greyscale-900">
            {note.title || "Untitled note"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-greyscale-600">
            <NoteStatusBadge
              status={note.status}
              duplicateConfidence={note.duplicateConfidence}
            />
            <span>Imported {formatDate(note.createdAt)}</span>
            {note.evernote?.notebook ? (
              <span>Notebook: {note.evernote.notebook}</span>
            ) : null}
          </div>
        </div>
        <RecipeAction note={note} onPromoteToRecipe={onPromoteToRecipe} />
      </header>

      {note.errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Import error</AlertTitle>
          <AlertDescription>{note.errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {note.parsingErrorCount > 0 ? (
        <Alert>
          <AlertTitle>Parsing errors</AlertTitle>
          <AlertDescription>
            {note.parsingErrorCount} ingredient{" "}
            {note.parsingErrorCount === 1 ? "line" : "lines"} could not be
            parsed.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Ingredients</h2>
              </CardTitle>
              <RoleLegend />
            </CardHeader>
            <CardContent>
              {hasIngredients ? (
                <div className="flex flex-col gap-4">
                  {note.ingredientBlocks.map((block) => (
                    <ul
                      key={block.blockIndex}
                      aria-label={`Ingredient group ${block.blockIndex + 1}`}
                      className="flex flex-col gap-1"
                    >
                      {block.lines.map((line) => (
                        <IngredientLineRow
                          key={line.id}
                          line={line}
                          onSetReviewStatus={onSetReviewStatus}
                          onCorrectMention={onCorrectMention}
                          onSearchConcepts={onSearchConcepts}
                        />
                      ))}
                    </ul>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-greyscale-600">
                  No ingredient lines were found.
                </p>
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
              {note.instructions.length > 0 ? (
                <ol className="list-decimal space-y-2 pl-5">
                  {note.instructions
                    .filter((instruction) => instruction.isActive)
                    .map((instruction) => (
                      <li key={instruction.id}>{instruction.text}</li>
                    ))}
                </ol>
              ) : (
                <p className="text-sm text-greyscale-600">
                  No instructions were found.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-6" aria-label="Note details">
          {heroImage ? (
            <img
              src={heroImage.url}
              alt={note.title ? `Photo of ${note.title}` : "Recipe photo"}
              className="w-full rounded-lg object-cover"
              loading="lazy"
            />
          ) : null}
          <SourcesCard note={note} />
          <TaxonomyCard title="Categories" items={note.categories} />
          <TaxonomyCard title="Tags" items={note.tags} />
        </aside>
      </div>
    </article>
  );
}

function RecipeAction({
  note,
  onPromoteToRecipe,
}: Pick<NoteDetailPageContentProps, "note" | "onPromoteToRecipe">): ReactNode {
  const { push } = useAppNavigation();
  const promote = useMutation(onPromoteToRecipe);

  if (note.recipeId) {
    return (
      <AppLink
        href={`/recipes/${note.recipeId}`}
        className={buttonVariants({ variant: "outline" })}
      >
        <CookingPot aria-hidden="true" />
        View recipe
      </AppLink>
    );
  }

  if (!onPromoteToRecipe) return null;

  async function handlePromote() {
    const result = await promote.run(note.id);
    if (result.success && result.data) push(`/recipes/${result.data.recipeId}`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={handlePromote}
        disabled={promote.isPending}
      >
        <CookingPot aria-hidden="true" />
        {promote.isPending ? "Saving..." : "Save as recipe"}
      </Button>
      <InlineError message={promote.error} />
    </div>
  );
}

function SourcesCard({ note }: { note: NoteDetail }): ReactNode {
  const urls = note.sources.flatMap((source) => source.urls);
  const books = note.sources
    .map((source) => source.book)
    .filter((book): book is NonNullable<typeof book> => book !== null);
  const fallbackSource = note.evernote?.source;

  if (urls.length === 0 && books.length === 0 && !fallbackSource) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Source</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm">
          {urls.map((url) => (
            <li key={url.id}>
              <a
                href={url.url}
                target="_blank"
                rel="noreferrer noopener"
                className="break-all text-primary hover:underline"
              >
                {url.siteName ?? url.url}
              </a>
              {url.isBrokenLink ? (
                <Badge variant="destructive" className="ml-2">
                  Broken link
                </Badge>
              ) : null}
            </li>
          ))}
          {books.map((book) => (
            <li key={book.title}>
              <span className="font-medium">{book.title}</span>
              {book.author ? ` by ${book.author}` : ""}
            </li>
          ))}
          {urls.length === 0 && books.length === 0 && fallbackSource ? (
            <li className="break-all">{fallbackSource}</li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}

function TaxonomyCard({
  title,
  items,
}: {
  title: string;
  items: { id: string; name: string }[];
}): ReactNode {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Badge variant="secondary">{item.name}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
