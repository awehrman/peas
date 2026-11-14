"use client";

import type { ReactNode } from "react";

import { Badge, Button } from "@peas/components";
import { BookOpen, Globe, RefreshCw, Type } from "lucide-react";

import { AppLink } from "../../app-navigation";
import { InlineError, type MutationAction, formatDate, useMutation } from "../../shared";
import type { NoteSourceLink, SourceUrlInfo } from "../types";

export type RecheckUrl = MutationAction<[urlId: string]>;

interface SourceListProps {
  sources: NoteSourceLink[];
  /** Shown when the note has no structured source yet (the raw Evernote string). */
  fallbackSource?: string | null;
  onRecheckUrl?: RecheckUrl;
}

/**
 * A note's sources, primary first: books with their authors and year, URLs with their last check, and text still waiting for a book match. Used on note and recipe pages.
 */
export function SourceList({ sources, fallbackSource, onRecheckUrl }: SourceListProps): ReactNode {
  if (sources.length === 0) {
    return fallbackSource ? <p className="break-all text-sm">{fallbackSource}</p> : null;
  }

  return (
    <ul className="flex flex-col gap-3 text-sm" aria-label="Sources">
      {sources.map((link) => (
        <li key={link.id} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <SourceKindIcon kind={link.source.kind} />
            <SourceLabel link={link} />
            {link.isPrimary && sources.length > 1 ? <Badge variant="secondary">Primary</Badge> : null}
            {link.origin === "DUPLICATE_MERGE" ? (
              <Badge variant="outline">From a merged duplicate</Badge>
            ) : null}
          </div>
          {link.source.url ? (
            <UrlCheckLine url={link.source.url} onRecheckUrl={onRecheckUrl} />
          ) : null}
          {link.source.kind === "OTHER" ? <LookupLine link={link} /> : null}
        </li>
      ))}
    </ul>
  );
}

function SourceKindIcon({ kind }: { kind: NoteSourceLink["source"]["kind"] }): ReactNode {
  const Icon = kind === "BOOK" ? BookOpen : kind === "URL" ? Globe : Type;
  const label = kind === "BOOK" ? "Book" : kind === "URL" ? "Web page" : "Other source";
  return (
    <>
      <Icon className="h-4 w-4 shrink-0 text-greyscale-600" aria-hidden="true" />
      <span className="sr-only">{label}:</span>
    </>
  );
}

function SourceLabel({ link }: { link: NoteSourceLink }): ReactNode {
  const { source } = link;
  if (source.book) {
    const { book } = source;
    const details = [book.authors.join(", "), book.publishedYear?.toString()].filter(Boolean).join(", ");
    return (
      <span>
        <span className="font-medium">{book.title}</span>
        {book.subtitle ? `: ${book.subtitle}` : ""}
        {details ? <span className="text-greyscale-600"> ({details})</span> : null}
        {book.matchStatus === "UNMATCHED" ? (
          <span className="text-greyscale-600"> (not matched to a book record yet)</span>
        ) : null}
      </span>
    );
  }
  if (source.url) {
    return (
      <a
        href={source.url.originalUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="break-all text-primary hover:underline"
      >
        {source.url.siteName ?? source.displayName ?? source.url.originalUrl}
      </a>
    );
  }
  return <span className="break-all">{source.displayName ?? link.originalText}</span>;
}

const CHECK_LABELS: Record<SourceUrlInfo["checkStatus"], string> = {
  UNCHECKED: "Not checked yet",
  REACHABLE: "Reachable",
  UNREACHABLE: "Unreachable",
  BLOCKED: "Not checked (address not allowed)",
};

function UrlCheckLine({ url, onRecheckUrl }: { url: SourceUrlInfo; onRecheckUrl?: RecheckUrl }): ReactNode {
  const recheck = useMutation(onRecheckUrl);
  const isFailing = url.checkStatus === "UNREACHABLE" || url.checkStatus === "BLOCKED";
  const detail =
    url.checkStatus === "REACHABLE"
      ? `last visited ${formatDate(url.lastSuccessfulVisitAt)}`
      : isFailing
        ? [
            url.lastFailureReason,
            url.lastCheckedAt ? `checked ${formatDate(url.lastCheckedAt)}` : null,
            url.lastSuccessfulVisitAt ? `last reachable ${formatDate(url.lastSuccessfulVisitAt)}` : null,
          ]
            .filter(Boolean)
            .join(", ")
        : null;

  return (
    <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-greyscale-600">
      <Badge variant={isFailing ? "destructive" : "outline"}>{CHECK_LABELS[url.checkStatus]}</Badge>
      {detail ? <span>{detail}</span> : null}
      {onRecheckUrl ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          disabled={recheck.isPending}
          onClick={() => void recheck.run(url.id)}
        >
          <RefreshCw aria-hidden="true" className="h-3 w-3" />
          {recheck.isPending ? "Queuing..." : "Recheck"}
        </Button>
      ) : null}
      <InlineError message={recheck.error} />
    </div>
  );
}

function LookupLine({ link }: { link: NoteSourceLink }): ReactNode {
  const lookup = link.source.bookLookup;
  if (!lookup) return null;
  if (lookup.status === "PENDING") {
    return <p className="pl-6 text-xs text-greyscale-600">Looking for a matching book...</p>;
  }
  if (lookup.status === "LEFT_UNRESOLVED") return null;
  return (
    <p className="pl-6 text-xs text-greyscale-600">
      <AppLink href={`/import/books/${lookup.id}`} className="text-primary hover:underline">
        Choose the matching book
      </AppLink>
    </p>
  );
}
