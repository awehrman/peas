"use client";

import { type ReactNode, useEffect, useId, useMemo, useState } from "react";

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
  Checkbox,
  Label,
  cn,
} from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink } from "../../app-navigation";
import type { NoteDetail } from "../../notes/types";
import { ConfirmDialog, InlineError, type MutationAction, formatDate } from "../../shared";
import type {
  DuplicateCandidate,
  DuplicateKeepChoice,
  DuplicateResolution,
  DuplicateResolutionPreview,
} from "../types";

import { SourceList } from "./source-list";

export interface DuplicateReviewDetail {
  id: string;
  candidate: DuplicateCandidate;
  incomingNote: NoteDetail;
  existingNote: NoteDetail;
}

interface DuplicateReviewPageContentProps {
  detail: DuplicateReviewDetail;
  onPreview: (resolution: DuplicateResolution) => Promise<DuplicateResolutionPreview>;
  onResolve: MutationAction<[resolution: DuplicateResolution]>;
  onUndo: MutationAction<[]>;
}

const KEEP_OPTIONS: { value: DuplicateKeepChoice; label: string; description: string }[] = [
  {
    value: "EXISTING",
    label: "Keep the existing note",
    description: "The incoming copy is archived (kept, hidden, reversible).",
  },
  {
    value: "INCOMING",
    label: "Keep the incoming note",
    description:
      "The existing note is archived. Its category decisions and tags carry over, and its saved recipe moves to the incoming note.",
  },
  {
    value: "BOTH",
    label: "Keep both",
    description: "They are different recipes. This pair won't be flagged again.",
  },
];

function normalizedLines(note: NoteDetail): Set<string> {
  return new Set(
    note.ingredientBlocks
      .flatMap((block) => block.lines)
      .filter((line) => line.isActive)
      .map((line) => line.reference.trim().toLowerCase())
  );
}

/**
 * Compares a possible duplicate with the note it resembles, side by side (lines only one of them has are marked), and applies an explicit decision: which content to keep, and separately whether to merge sources. The exact effect is previewed before confirming, and a decision can be undone.
 */
export function DuplicateReviewPageContent({
  detail,
  onPreview,
  onResolve,
  onUndo,
}: DuplicateReviewPageContentProps): ReactNode {
  const { candidate, incomingNote, existingNote } = detail;
  const isPending = candidate.status === "PENDING";
  const [keep, setKeep] = useState<DuplicateKeepChoice>(candidate.resolution?.keep ?? "EXISTING");
  const [mergeSources, setMergeSources] = useState(candidate.resolution?.mergeSources ?? true);
  const [preview, setPreview] = useState<DuplicateResolutionPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const groupId = useId();
  const mergeId = useId();

  const incomingLines = useMemo(() => normalizedLines(incomingNote), [incomingNote]);
  const existingLines = useMemo(() => normalizedLines(existingNote), [existingNote]);

  // The preview is server-computed, so it is fetched again whenever the choice changes
  useEffect(() => {
    if (!isPending) return;
    let isCancelled = false;
    setPreviewError(null);
    onPreview({ keep, mergeSources: keep === "BOTH" ? false : mergeSources })
      .then((result) => {
        if (!isCancelled) setPreview(result);
      })
      .catch((error: unknown) => {
        if (!isCancelled) setPreviewError(error instanceof Error ? error.message : "Could not preview this decision");
      });
    return () => {
      isCancelled = true;
    };
  }, [isPending, keep, mergeSources, onPreview]);

  return (
    <article className="flex flex-col gap-6">
      <AppLink
        href="/import?view=review"
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Import review
      </AppLink>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-greyscale-900">Possible duplicate</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-greyscale-600">
          <Badge variant={candidate.kind === "EXACT" ? "destructive" : "secondary"}>{candidate.kind}</Badge>
          <span className="tabular-nums">{Math.round(candidate.confidence * 100)}% match</span>
          <span>{candidate.signals.reasons.join(" · ")}</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <NoteColumn heading="Incoming" note={incomingNote} otherLines={existingLines} />
        <NoteColumn heading="Existing" note={existingNote} otherLines={incomingLines} />
      </div>

      {isPending ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Decision</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2" aria-describedby={`${groupId}-hint`}>
              <legend className="text-sm font-medium">Which content stays?</legend>
              <p id={`${groupId}-hint`} className="text-xs text-greyscale-600">
                Content and sources are separate choices: keeping a note never decides which source is primary.
              </p>
              {KEEP_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name={groupId}
                    value={option.value}
                    checked={keep === option.value}
                    onChange={() => setKeep(option.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{option.label}</span>
                    <span className="block text-xs text-greyscale-600">{option.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="flex items-start gap-2">
              <Checkbox
                id={mergeId}
                checked={keep !== "BOTH" && mergeSources}
                disabled={keep === "BOTH"}
                onCheckedChange={(checked) => setMergeSources(checked === true)}
              />
              <Label htmlFor={mergeId} className="text-sm font-normal">
                Attach the archived note's sources to the kept note
                <span className="block text-xs text-greyscale-600">
                  A book stays primary over a URL; unreachable URLs are attached but marked inactive.
                </span>
              </Label>
            </div>

            <PreviewSummary preview={preview} error={previewError} />

            <ConfirmDialog
              trigger={
                <Button type="button" className="self-start" disabled={!preview}>
                  Apply decision
                </Button>
              }
              title="Apply this decision?"
              description={
                <>
                  {(preview?.summary ?? []).map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </>
              }
              confirmLabel="Apply"
              isDestructive={false}
              onConfirm={() => onResolve({ keep, mergeSources: keep === "BOTH" ? false : mergeSources })}
            />
          </CardContent>
        </Card>
      ) : (
        <ResolvedCard candidate={candidate} onUndo={onUndo} />
      )}
    </article>
  );
}

function NoteColumn({
  heading,
  note,
  otherLines,
}: {
  heading: string;
  note: NoteDetail;
  otherLines: Set<string>;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex flex-col gap-1">
            <span className="text-xs font-normal uppercase tracking-wide text-greyscale-600">{heading}</span>
            <AppLink href={`/notes/${note.id}`} className="text-primary hover:underline">
              {note.title ?? "Untitled note"}
            </AppLink>
          </h2>
        </CardTitle>
        <p className="text-xs text-greyscale-600">
          Imported {formatDate(note.createdAt)}
          {note.recipeId ? " · saved as a recipe" : ""}
          {note.archivedAt ? " · archived" : ""}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <section aria-label={`${heading} sources`}>
          <h3 className="mb-1 font-medium">Sources</h3>
          {note.sources.length ? (
            <SourceList sources={note.sources} fallbackSource={note.evernote?.source} />
          ) : (
            <p className="text-greyscale-600">{note.evernote?.source ?? "None"}</p>
          )}
        </section>
        <section aria-label={`${heading} ingredients`}>
          <h3 className="mb-1 font-medium">Ingredients</h3>
          <ul className="flex flex-col gap-0.5">
            {note.ingredientBlocks
              .flatMap((block) => block.lines)
              .filter((line) => line.isActive)
              .map((line) => {
                const isUnique = !otherLines.has(line.reference.trim().toLowerCase());
                return (
                  <li key={line.id} className={cn(isUnique && "rounded bg-warning-50 px-1")}>
                    {line.reference}
                    {isUnique ? <span className="sr-only"> (only in this note)</span> : null}
                  </li>
                );
              })}
          </ul>
        </section>
        <section aria-label={`${heading} instructions`}>
          <h3 className="mb-1 font-medium">Instructions</h3>
          <ol className="list-decimal space-y-1 pl-5">
            {note.instructions
              .filter((instruction) => instruction.isActive)
              .map((instruction) => (
                <li key={instruction.id}>{instruction.text}</li>
              ))}
          </ol>
        </section>
      </CardContent>
    </Card>
  );
}

function PreviewSummary({
  preview,
  error,
}: {
  preview: DuplicateResolutionPreview | null;
  error: string | null;
}): ReactNode {
  if (error) return <InlineError message={error} />;
  if (!preview) return <p className="text-sm text-greyscale-600">Working out what this will do...</p>;
  return (
    <div aria-live="polite" className="rounded-md border border-greyscale-200 p-3 text-sm">
      <p className="mb-1 font-medium">This will:</p>
      <ul className="list-disc space-y-1 pl-5">
        {preview.summary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function ResolvedCard({
  candidate,
  onUndo,
}: {
  candidate: DuplicateCandidate;
  onUndo: MutationAction<[]>;
}): ReactNode {
  const choice = KEEP_OPTIONS.find((option) => option.value === candidate.resolution?.keep);
  return (
    <Alert>
      <AlertTitle>Decided {formatDate(candidate.resolvedAt)}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>
          {choice ? choice.label : "Dismissed"}
          {candidate.resolution?.mergeSources ? ", sources merged" : ""}.
        </span>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="outline" size="sm" className="self-start">
              Undo decision
            </Button>
          }
          title="Undo this decision?"
          description="Archived notes come back, merged sources and carried-over categories are removed, and the pair returns to review."
          confirmLabel="Undo"
          isDestructive={false}
          onConfirm={() => onUndo()}
        />
      </AlertDescription>
    </Alert>
  );
}
