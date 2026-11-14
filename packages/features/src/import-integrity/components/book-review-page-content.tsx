"use client";

import { type FormEvent, type ReactNode, useId, useState } from "react";

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
  Input,
  Label,
} from "@peas/components";
import { ArrowLeft } from "lucide-react";

import { AppLink } from "../../app-navigation";
import { InlineError, type MutationAction, formatDate, useMutation } from "../../shared";
import type { BookCandidate, BookLookupView, ManualBookInput } from "../types";

interface BookReviewPageContentProps {
  lookup: BookLookupView;
  onSelectCandidate: MutationAction<[workKey: string]>;
  onCreateManually: MutationAction<[input: ManualBookInput]>;
  onLeaveUnresolved: MutationAction<[]>;
  onRetry: MutationAction<[]>;
}

/**
 * Decides which book a source text names: pick one of the ranked Open Library candidates (with the evidence for each), enter the book by hand, or leave the text as it is. The choice applies to every note citing that text.
 */
export function BookReviewPageContent({
  lookup,
  onSelectCandidate,
  onCreateManually,
  onLeaveUnresolved,
  onRetry,
}: BookReviewPageContentProps): ReactNode {
  const leave = useMutation(onLeaveUnresolved);
  const retry = useMutation(onRetry);

  return (
    <article className="flex max-w-4xl flex-col gap-6">
      <AppLink
        href="/import?view=review&review=books"
        className="inline-flex items-center gap-1 text-sm text-greyscale-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Book matches
      </AppLink>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-greyscale-900">Which book is this?</h1>
        <p className="text-sm text-greyscale-600">
          Source text: <q className="font-medium text-greyscale-900">{lookup.query}</q>, cited by {lookup.noteCount}{" "}
          {lookup.noteCount === 1 ? "note" : "notes"}.
          {lookup.fetchedAt ? ` Looked up ${formatDate(lookup.fetchedAt)}.` : ""}
        </p>
      </header>

      {lookup.status === "MATCHED" && lookup.book ? (
        <Alert>
          <AlertTitle>Matched</AlertTitle>
          <AlertDescription>
            {lookup.book.title}
            {lookup.book.authors.length ? ` by ${lookup.book.authors.join(", ")}` : ""}. Choose another candidate below to change it.
          </AlertDescription>
        </Alert>
      ) : null}

      {lookup.status === "ERROR" ? (
        <Alert variant="destructive">
          <AlertTitle>The lookup failed</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{lookup.errorReason ?? "Open Library could not be reached."} Imports are unaffected.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={retry.isPending}
              onClick={() => void retry.run()}
            >
              {retry.isPending ? "Queuing..." : "Try again"}
            </Button>
            <InlineError message={retry.error} />
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="candidates-title" className="flex flex-col gap-3">
        <h2 id="candidates-title" className="text-lg font-semibold">
          Candidates
        </h2>
        {lookup.candidates.length === 0 ? (
          <p className="text-sm text-greyscale-600">Open Library had no candidates for this text.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lookup.candidates.map((candidate) => (
              <CandidateCard
                key={candidate.workKey}
                candidate={candidate}
                isChosen={lookup.book?.openLibraryWorkKey === candidate.workKey}
                onSelect={onSelectCandidate}
              />
            ))}
          </ul>
        )}
        <p className="text-xs text-greyscale-600">
          Book data from{" "}
          <a href="https://openlibrary.org" target="_blank" rel="noreferrer noopener" className="underline">
            Open Library
          </a>
          .
        </p>
      </section>

      <ManualBookForm defaultTitle={lookup.query} onCreate={onCreateManually} />

      {lookup.status !== "LEFT_UNRESOLVED" ? (
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="ghost"
            className="self-start"
            disabled={leave.isPending}
            onClick={() => void leave.run()}
          >
            Leave as text
          </Button>
          <p className="text-xs text-greyscale-600">The notes keep the source text without a book record.</p>
          <InlineError message={leave.error} />
        </div>
      ) : (
        <p className="text-sm text-greyscale-600">Left as text. Pick a candidate or enter a book to change that.</p>
      )}
    </article>
  );
}

function CandidateCard({
  candidate,
  isChosen,
  onSelect,
}: {
  candidate: BookCandidate;
  isChosen: boolean;
  onSelect: MutationAction<[workKey: string]>;
}): ReactNode {
  const select = useMutation(onSelect);
  const year = candidate.firstPublishYear ? `first published ${candidate.firstPublishYear}` : null;
  const editions = candidate.editionCount
    ? `${candidate.editionCount} ${candidate.editionCount === 1 ? "edition" : "editions"}`
    : null;

  return (
    <li>
      <Card>
        <CardContent className="flex gap-4 py-4">
          {candidate.coverId ? (
            <img
              src={`https://covers.openlibrary.org/b/id/${candidate.coverId}-S.jpg`}
              alt=""
              width={45}
              height={68}
              loading="lazy"
              className="h-[68px] w-[45px] shrink-0 rounded object-cover"
            />
          ) : null}
          <div className="flex flex-1 flex-col gap-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {candidate.title}
                {candidate.subtitle ? `: ${candidate.subtitle}` : ""}
              </span>
              <Badge variant="outline" className="tabular-nums">
                Score {Math.round(candidate.score * 100)}
              </Badge>
              {isChosen ? <Badge>Current match</Badge> : null}
            </div>
            <p className="text-greyscale-600">
              {[candidate.authors.join(", ") || "Unknown author", year, editions].filter(Boolean).join(" · ")}
            </p>
            {candidate.publishers.length ? (
              <p className="text-xs text-greyscale-600">Publishers: {candidate.publishers.join(", ")}</p>
            ) : null}
            {candidate.matchedIsbn ? (
              <p className="text-xs">ISBN {candidate.matchedIsbn} (from the source text; identifies the edition)</p>
            ) : candidate.isbns.length ? (
              <p className="text-xs text-greyscale-600">
                ISBNs listed for this work (not attached without knowing the edition): {candidate.isbns.slice(0, 4).join(", ")}
                {candidate.isbns.length > 4 ? `, and ${candidate.isbns.length - 4} more` : ""}
              </p>
            ) : null}
            {candidate.evidence.length ? (
              <ul className="list-disc pl-5 text-xs text-greyscale-600" aria-label="Why it matched">
                {candidate.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <InlineError message={select.error} />
          </div>
          {!isChosen ? (
            <Button
              type="button"
              variant="outline"
              className="self-start"
              disabled={select.isPending}
              onClick={() => void select.run(candidate.workKey)}
            >
              {select.isPending ? "Saving..." : "This one"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}

function ManualBookForm({
  defaultTitle,
  onCreate,
}: {
  defaultTitle: string;
  onCreate: MutationAction<[input: ManualBookInput]>;
}): ReactNode {
  const formId = useId();
  const create = useMutation(onCreate);
  const [title, setTitle] = useState(defaultTitle);
  const [authors, setAuthors] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState("");
  const [isbn, setIsbn] = useState("");
  const titleError = title.trim() ? null : "Title is required";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (titleError) return;
    const compactIsbn = isbn.replace(/[-\s]/g, "");
    const parsedYear = Number.parseInt(year, 10);
    await create.run({
      title: title.trim(),
      subtitle: null,
      authors: authors
        .split(",")
        .map((author) => author.trim())
        .filter(Boolean),
      publisher: publisher.trim() || null,
      publishedYear: Number.isInteger(parsedYear) ? parsedYear : null,
      isbn13: compactIsbn.length === 13 ? compactIsbn : null,
      isbn10: compactIsbn.length === 10 ? compactIsbn : null,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Enter the book by hand</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor={`${formId}-title`}>Title</Label>
            <Input
              id={`${formId}-title`}
              value={title}
              required
              aria-invalid={!!titleError}
              aria-describedby={titleError ? `${formId}-title-error` : undefined}
              onChange={(event) => setTitle(event.target.value)}
            />
            {titleError ? (
              <p id={`${formId}-title-error`} className="text-xs text-error-700">
                {titleError}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${formId}-authors`}>Authors (comma separated)</Label>
            <Input id={`${formId}-authors`} value={authors} onChange={(event) => setAuthors(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${formId}-publisher`}>Publisher</Label>
            <Input id={`${formId}-publisher`} value={publisher} onChange={(event) => setPublisher(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${formId}-year`}>Year</Label>
            <Input
              id={`${formId}-year`}
              inputMode="numeric"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${formId}-isbn`}>ISBN (only if you know the edition)</Label>
            <Input id={`${formId}-isbn`} value={isbn} onChange={(event) => setIsbn(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <InlineError message={create.error} />
            <Button type="submit" className="self-start" disabled={create.isPending || !!titleError}>
              {create.isPending ? "Saving..." : "Save book"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
